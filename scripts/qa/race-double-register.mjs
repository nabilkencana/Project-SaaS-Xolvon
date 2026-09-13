#!/usr/bin/env node
/**
 * race-double-register.mjs — QA §4 concurrency probe A (T14).
 *
 * Fires EXACTLY 2 concurrent `POST {base}/auth/register` for the same email
 * via Promise.allSettled and reports whether the backend produced exactly one
 * 2xx and one non-2xx (target healthy: 409 from the email pre-check / UNIQUE
 * constraint; a sanitised 500 from an SQLite constraint race is reported as
 * the non-2xx leg and adjudicated separately in the QA run — the DB
 * invariant, not the HTTP code, is the race gate there).
 *
 * Node >= 22, native fetch, ZERO dependencies. This script is written for
 * Wave 4 execution ONLY — do not run it until a target is reachable and the
 * register throttle window is quiet (auth routes are 5 req/min per IP).
 *
 * Usage:
 *   node scripts/qa/race-double-register.mjs --base-url <url>
 *
 * Env (never passed via argv, never written to disk):
 *   QA_RACE_EMAIL     required  QA account email (e.g. qa-race-register-<unixts>@example.test)
 *   QA_RACE_PASSWORD  required  password, >= 8 chars (RegisterDto MinLength(8))
 *   QA_RACE_PHONE     optional  phone; see derivePhone() for the fallback
 *
 * Output: one JSON document on stdout —
 *   { scenario, email, statusCodes, successCount, nonSuccessCount, verdict }
 * verdict = PASS iff exactly 1x 2xx AND 1x non-2xx. No token/credential
 * values ever appear in any output line (the email is QA-scoped data and is
 * allowed). Exit code: 0 iff PASS, non-zero otherwise.
 */

const SCENARIO = 'race-double-register';

const USAGE = `Usage: node scripts/qa/race-double-register.mjs --base-url <url>

Fires 2 concurrent POST {base}/auth/register for one QA email and prints a
JSON verdict to stdout. PASS iff exactly one request is 2xx and one is
non-2xx (single user row per email).

Required env:
  QA_RACE_EMAIL     QA account email (convention: qa-race-register-<unixts>@example.test)
  QA_RACE_PASSWORD  account password (>= 8 characters)
Optional env:
  QA_RACE_PHONE     phone number; if absent it is derived from the email
                    local-part (see header comment of the script).

<url> must be the API root INCLUDING the /api prefix, e.g.
  http://localhost:3005/api   (local, PORT=3005 deviator)
  https://xolvon.canadev.my.id/api   (deployed)

Exit codes: 0 = PASS, 1 = FAIL verdict, 2 = usage/env/config error.
`;

/** Parse argv: ONLY --base-url is accepted; --help prints usage and exits 0. */
function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  const idx = argv.indexOf('--base-url');
  if (idx === -1) {
    failConfig('missing --base-url. Run with --help for usage.');
  }
  const baseUrl = argv[idx + 1];
  if (!baseUrl || baseUrl.startsWith('--')) {
    failConfig('--base-url requires a value. Run with --help for usage.');
  }
  const rest = argv.filter((_, i) => i !== idx && i !== idx + 1);
  if (rest.length > 0) {
    failConfig(`unexpected argument(s): ${rest.join(' ')}. Only --base-url is allowed.`);
  }
  return normalizeBaseUrl(baseUrl);
}

/** Trim trailing slash; warn (stderr only) if the /api prefix looks absent. */
function normalizeBaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    failConfig(`--base-url is not a valid URL: ${raw}`);
  }
  const base = raw.replace(/\/+$/, '');
  if (!url.pathname.endsWith('/api')) {
    process.stderr.write(
      `warn: base URL pathname "${url.pathname}" does not end with /api — the API is served under the /api prefix.\n`,
    );
  }
  return base;
}

function failConfig(message) {
  process.stderr.write(`${SCENARIO}: config error: ${message}\n`);
  process.exit(2);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    failConfig(`environment variable ${name} is not set.`);
  }
  return value;
}

/**
 * Deterministic E.164-ish placeholder phone derived from the FULL email
 * local-part, used only when QA_RACE_PHONE is unset. RegisterDto marks
 * `phone` REQUIRED with @Matches(/^[+]?[0-9\s\-()]{8,20}$/), so the register
 * body cannot omit it, and AuthService.register pre-checks
 * `WHERE email = ? OR phone = ?` — so any derivation that ignores part of
 * the local-part COLLIDES between scenario emails sharing a unixts (the
 * original digits-only version made qa-race-reg-l-<ts> and qa-race-act-l-<ts>
 * derive the same phone, poisoning the second race with a phone-path 409).
 * Derivation therefore hashes the ENTIRE local-part (32-bit djb2 variant)
 * and renders the hash as 10 decimal digits under '+62'. Both concurrent
 * requests use the SAME derived phone (same email ⇒ same hash), so the race
 * target — one user row per email — is unaffected. Fully deterministic: same
 * email always yields the same phone; distinct local-parts practically never
 * collide (birthday bound over 10^10 for a handful of QA emails is ~0).
 */
function derivePhone(email) {
  const local = email.split('@')[0] ?? '';
  let h = 5381;
  for (let i = 0; i < local.length; i++) h = ((h * 33) ^ local.charCodeAt(i)) >>> 0;
  return `+62${String(h % 1e10).padStart(10, '0')}`;
}

/**
 * POST JSON and return { status } only — response bodies are deliberately
 * DISCARDED (register's 201 body is a user object; nothing sensitive is
 * printed regardless, and no token exists on this route). status 0 means a
 * transport-level failure (counted as non-2xx).
 */
async function postRegister(baseUrl, body) {
  try {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    await res.arrayBuffer(); // drain without echoing the body
    return { status: res.status };
  } catch (err) {
    process.stderr.write(`${SCENARIO}: request transport error: ${err?.message ?? err}\n`);
    return { status: 0 };
  }
}

async function main() {
  const baseUrl = parseArgs(process.argv.slice(2));
  const email = requireEnv('QA_RACE_EMAIL');
  const password = requireEnv('QA_RACE_PASSWORD');
  const phone = process.env.QA_RACE_PHONE || derivePhone(email);

  if (password.length < 8) {
    failConfig('QA_RACE_PASSWORD is shorter than 8 characters (RegisterDto minimum) — the race would be invalid.');
  }

  // RegisterDto required fields only: name/email/phone/password. `name` is
  // derived from the email local-part (QA data, no secret). Role injection is
  // deliberately absent — the route forces role 'user' anyway.
  const body = {
    name: email.split('@')[0] ?? 'qa-race',
    email,
    phone,
    password,
  };

  // THE RACE: exactly 2 concurrent POSTs, kicked off together.
  const results = await Promise.allSettled([postRegister(baseUrl, body), postRegister(baseUrl, body)]);
  const statusCodes = results.map((r) =>
    r.status === 'fulfilled' ? r.value.status : 0,
  );

  const successCount = statusCodes.filter((s) => s >= 200 && s < 300).length;
  const nonSuccessCount = statusCodes.length - successCount;
  const verdict = successCount === 1 && nonSuccessCount === 1 ? 'PASS' : 'FAIL';

  const report = { scenario: SCENARIO, email, statusCodes, successCount, nonSuccessCount, verdict };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(verdict === 'PASS' ? 0 : 1);
}

await main();
