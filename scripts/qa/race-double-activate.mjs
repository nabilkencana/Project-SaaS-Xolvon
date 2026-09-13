#!/usr/bin/env node
/**
 * race-double-activate.mjs — QA §4 concurrency probe B (T14).
 *
 * Self-contained over the PUBLIC API ONLY (no DB access). Builds a fresh
 * qa-* scenario, then races the entitlement path:
 *
 *   1. ensure student account  POST /auth/register (409 tolerated) + /auth/login
 *   2. login admin             POST /auth/login                 (XOLVON admin creds)
 *   3. create + publish course POST /courses, POST /courses/:id/publish
 *   4. create + publish lesson POST /courses/:courseId/lessons, POST /lessons/:id/publish
 *      (video_object_key stays null — the ORDER→VERIFY→ACTIVATE path never
 *      touches GET /lessons/:id/video-url, so no media upload is needed)
 *   5. student checkout        POST /orders { courseIds: [courseId] }
 *      (payment-proof deliberately skipped: PATCH /orders/:id/verify only
 *      requires status 'pending' — proof is not a gate in orders.service)
 *   6. admin verify            PATCH /orders/:id/verify        (pending → paid)
 *   7. THE RACE: exactly 2 concurrent POST /orders/:id/activate (admin Bearer)
 *      via Promise.allSettled — enrollments.service upserts on
 *      UNIQUE(user_id, course_id), so a healthy target yields 1 enrollment
 *      regardless of interleaving.
 *   8. count                   GET /enrollments/me (student Bearer), filter
 *      courseId === ours && status === 'active' (the endpoint returns ALL
 *      statuses; filtering is client-side by design).
 *   9. quarantine exit         best-effort POST /courses/:id/unpublish, the
 *      attempt result is logged to stderr.
 *
 * Node >= 22, native fetch, ZERO dependencies. Wave 4 execution only — auth
 * routes are 5 req/min per IP, so run in a quiet window.
 *
 * Usage:
 *   node scripts/qa/race-double-activate.mjs --base-url <url>
 *
 * Env (never argv, never files):
 *   QA_RACE_EMAIL, QA_RACE_PASSWORD           student QA account (created if absent)
 *   QA_RACE_ADMIN_EMAIL, QA_RACE_ADMIN_PASSWORD  admin account (must pre-exist)
 *   QA_RACE_PHONE  optional; derived from QA_RACE_EMAIL local-part if absent
 *                  (RegisterDto requires phone — see derivePhone()).
 *
 * Output: one JSON document on stdout —
 *   { scenario, email, activateStatuses, enrollmentCount, verdict, failureReason }
 * verdict = PASS iff enrollmentCount === 1. Every output line is token-free:
 * only statuses, qa-entity UUIDs and fixed server messages are printed.
 * Exit code: 0 iff PASS, non-zero otherwise.
 */

const SCENARIO = 'race-double-activate';

/** Non-zero course price: orders.checkout rejects total <= 0 (amount CHECK). */
const COURSE_PRICE_IDR = 250000;

const USAGE = `Usage: node scripts/qa/race-double-activate.mjs --base-url <url>

Builds a qa-* course + lesson + paid order through the API, fires 2
concurrent POST /orders/:id/activate as admin, then counts active
enrollments for the course via GET /enrollments/me as the student.
PASS iff exactly 1 enrollment. Best-effort unpublish of the qa course on
the way out (quarantine exit).

Required env:
  QA_RACE_EMAIL            student QA email (convention: qa-race-activate-<unixts>@example.test)
  QA_RACE_PASSWORD         student password (>= 8 characters)
  QA_RACE_ADMIN_EMAIL      admin email
  QA_RACE_ADMIN_PASSWORD   admin password
Optional env:
  QA_RACE_PHONE            phone; derived from the email local-part if absent.

<url> must be the API root INCLUDING the /api prefix, e.g.
  http://localhost:3005/api   (local, PORT=3005 deviation)
  https://xolvon.canadev.my.id/api   (deployed)

Exit codes: 0 = PASS, 1 = FAIL verdict, 2 = usage/env/config error.
`;

/* ------------------------------------------------------------------ CLI/env */

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  const idx = argv.indexOf('--base-url');
  if (idx === -1) failConfig('missing --base-url. Run with --help for usage.');
  const baseUrl = argv[idx + 1];
  if (!baseUrl || baseUrl.startsWith('--')) {
    failConfig('--base-url requires a value. Run with --help for usage.');
  }
  const rest = argv.filter((_, i) => i !== idx && i !== idx + 1);
  if (rest.length > 0) {
    failConfig(`unexpected argument(s): ${rest.join(' ')}. Only --base-url is allowed.`);
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    failConfig(`--base-url is not a valid URL: ${baseUrl}`);
  }
  if (!url.pathname.endsWith('/api')) {
    process.stderr.write(
      `warn: base URL pathname "${url.pathname}" does not end with /api — the API is served under the /api prefix.\n`,
    );
  }
  return baseUrl.replace(/\/+$/, '');
}

function failConfig(message) {
  process.stderr.write(`${SCENARIO}: config error: ${message}\n`);
  process.exit(2);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) failConfig(`environment variable ${name} is not set.`);
  return value;
}

/**
 * Deterministic E.164-ish placeholder phone from the FULL email local-part
 * (RegisterDto.phone is REQUIRED: /^[+]?[0-9\s\-()]{8,20}$/, and
 * AuthService.register pre-checks `WHERE email = ? OR phone = ?` — any
 * derivation ignoring part of the local-part collides between scenario
 * emails sharing a unixts, poisoning the second race with a phone-path 409).
 * Hashes the ENTIRE local-part (32-bit djb2 variant) → 10 decimal digits
 * under '+62'. Same email ⇒ same phone, every time; distinct local-parts
 * practically never collide.
 */
function derivePhone(email) {
  const local = email.split('@')[0] ?? '';
  let h = 5381;
  for (let i = 0; i < local.length; i++) h = ((h * 33) ^ local.charCodeAt(i)) >>> 0;
  return `+62${String(h % 1e10).padStart(10, '0')}`;
}

/* ------------------------------------------------------------------- HTTP */

/**
 * Single JSON HTTP helper. Returns { status, json } (json null when the body
 * is not JSON). Throws only on transport failure. Never logs tokens; callers
 * print statuses and selected non-secret fields only.
 */
async function api(method, path, { baseUrl, token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/**
 * Extract a fixed server message from an error body for ACTIONABLE failure
 * reporting (DTO validator messages are static strings; the whitelist pipe
 * never echoes input values). Never returns tokens/objects.
 */
function serverMessage(json) {
  if (!json) return null;
  if (typeof json.message === 'string') return json.message;
  if (Array.isArray(json.message)) {
    return json.message.filter((m) => typeof m === 'string').join('; ') || null;
  }
  return null;
}

function is2xx(status) {
  return status >= 200 && status < 300;
}

function log(step, detail) {
  process.stderr.write(`${SCENARIO}: ${step}: ${detail}\n`);
}

/* ------------------------------------------------------------------- flow */

async function login(baseUrl, email, password, who) {
  const res = await api('POST', '/auth/login', { baseUrl, body: { email, password } });
  const token = res.json?.accessToken;
  if (!is2xx(res.status) || typeof token !== 'string') {
    throw new RaceAbort(
      `login ${who} failed`,
      `status=${res.status}${serverMessage(res.json) ? ` message="${serverMessage(res.json)}"` : ''}`,
    );
  }
  log(`login:${who}`, 'ok (token kept in memory only, never printed)');
  return token;
}

async function ensureStudent(baseUrl, email, password, phone) {
  const reg = await api('POST', '/auth/register', {
    baseUrl,
    body: { name: email.split('@')[0] ?? 'qa-race', email, phone, password },
  });
  if (is2xx(reg.status)) {
    log('register:student', `ok status=${reg.status}`);
  } else if (reg.status === 409) {
    log('register:student', 'already registered (409) — continuing to login');
  } else {
    throw new RaceAbort(
      'register student failed',
      `status=${reg.status}${serverMessage(reg.json) ? ` message="${serverMessage(reg.json)}"` : ''} (check QA_RACE_* env and throttle window)`,
    );
  }
  return login(baseUrl, email, password, 'student');
}

/** Thrown by setup steps; main() converts it into the FAIL report. */
class RaceAbort extends Error {
  constructor(step, detail) {
    super(detail);
    this.step = step;
  }
}

async function requireOk(promise, step) {
  const res = await promise;
  const msg = serverMessage(res.json);
  if (!is2xx(res.status)) {
    throw new RaceAbort(step, `status=${res.status}${msg ? ` message="${msg}"` : ''}`);
  }
  return res;
}

async function main() {
  const baseUrl = parseArgs(process.argv.slice(2));
  const email = requireEnv('QA_RACE_EMAIL');
  const password = requireEnv('QA_RACE_PASSWORD');
  const adminEmail = requireEnv('QA_RACE_ADMIN_EMAIL');
  const adminPassword = requireEnv('QA_RACE_ADMIN_PASSWORD');
  const phone = process.env.QA_RACE_PHONE || derivePhone(email);

  if (password.length < 8 || adminPassword.length < 8) {
    failConfig('passwords shorter than 8 characters (RegisterDto minimum) — the race would be invalid.');
  }

  const unixts = Math.floor(Date.now() / 1000);
  let courseId = null;
  let adminToken = null;
  const report = {
    scenario: SCENARIO,
    email,
    activateStatuses: [],
    enrollmentCount: -1,
    verdict: 'FAIL',
    failureReason: null,
  };

  try {
    // 1-2. Identities (student is created on the fly when absent).
    const studentToken = await ensureStudent(baseUrl, email, password, phone);
    adminToken = await login(baseUrl, adminEmail, adminPassword, 'admin');

    // 3. Course: CreateCourseDto = title/slug/description/price (thumbnailUrl
    // optional). Publish gate (courses.service.assertPublishable) needs
    // description non-empty + price present — both satisfied below; if the
    // gate still refuses, the server message is reported, not hacked around.
    const course = await requireOk(
      api('POST', '/courses', {
        baseUrl,
        token: adminToken,
        body: {
          title: `QA race activate ${unixts}`,
          slug: `qa-race-b-${unixts}`,
          description: 'Quarantined QA fixture for the T14 double-activate concurrency race. Safe to unpublish.',
          price: COURSE_PRICE_IDR,
        },
      }),
      'create course',
    );
    courseId = course.json?.id;
    if (typeof courseId !== 'string' || courseId.length === 0) {
      throw new RaceAbort('create course', `no id in 2xx response (status=${course.status})`);
    }
    log('create course', `ok id=${courseId}`);

    await requireOk(api('POST', `/courses/${courseId}/publish`, { baseUrl, token: adminToken }), 'publish course');
    log('publish course', 'ok');

    // 4. Lesson (video not required for this path — see header comment).
    const lesson = await requireOk(
      api('POST', `/courses/${courseId}/lessons`, {
        baseUrl,
        token: adminToken,
        body: { title: 'QA race lesson 0', orderIndex: 0 },
      }),
      'create lesson',
    );
    const lessonId = lesson.json?.id;
    if (typeof lessonId === 'string' && lessonId.length > 0) {
      await requireOk(api('POST', `/lessons/${lessonId}/publish`, { baseUrl, token: adminToken }), 'publish lesson');
      log('lesson', `created+published id=${lessonId} (video_object_key null — not needed for activation)`);
    } else {
      log('lesson', `create returned no id (status=${lesson.status}) — continuing; activation does not require lessons`);
    }

    // 5-6. Order + verify (pending → paid; no proof gate in orders.service).
    const order = await requireOk(
      api('POST', '/orders', { baseUrl, token: studentToken, body: { courseIds: [courseId] } }),
      'create order',
    );
    const orderId = order.json?.id;
    if (typeof orderId !== 'string' || orderId.length === 0) {
      throw new RaceAbort('create order', `no id in 2xx response (status=${order.status})`);
    }
    log('create order', `ok id=${orderId}`);

    await requireOk(api('PATCH', `/orders/${orderId}/verify`, { baseUrl, token: adminToken }), 'verify order');
    log('verify order', 'ok (pending → paid)');

    // 7. THE RACE: exactly 2 concurrent activations, admin Bearer.
    const fired = await Promise.allSettled([
      api('POST', `/orders/${orderId}/activate`, { baseUrl, token: adminToken }),
      api('POST', `/orders/${orderId}/activate`, { baseUrl, token: adminToken }),
    ]);
    report.activateStatuses = fired.map((r) => (r.status === 'fulfilled' ? r.value.status : 0));
    log('race activate x2', `statuses=[${report.activateStatuses.join(',')}]`);

    // 8. Count active enrollments for THIS course only (endpoint lists all
    // statuses and all courses; filter client-side).
    const me = await requireOk(api('GET', '/enrollments/me', { baseUrl, token: studentToken }), 'list enrollments');
    const rows = Array.isArray(me.json) ? me.json : [];
    report.enrollmentCount = rows.filter(
      (e) => e && e.courseId === courseId && e.status === 'active',
    ).length;
    report.verdict = report.enrollmentCount === 1 ? 'PASS' : 'FAIL';
    if (report.verdict === 'FAIL') {
      report.failureReason = `expected exactly 1 active enrollment for course ${courseId}, got ${report.enrollmentCount} (activate statuses=[${report.activateStatuses.join(',')}])`;
    }
  } catch (err) {
    if (err instanceof RaceAbort) {
      report.failureReason = `${err.step} failed: ${err.message}`;
    } else {
      report.failureReason = `unexpected transport/runtime error: ${err?.message ?? err}`;
    }
  } finally {
    // 9. Quarantine exit: best-effort unpublish of the created qa course.
    if (courseId && adminToken) {
      try {
        const un = await api('POST', `/courses/${courseId}/unpublish`, { baseUrl, token: adminToken });
        log('cleanup unpublish', `courseId=${courseId} status=${un.status}${serverMessage(un.json) ? ` message="${serverMessage(un.json)}"` : ''}`);
      } catch (cleanupErr) {
        log('cleanup unpublish', `courseId=${courseId} attempt failed: ${cleanupErr?.message ?? cleanupErr}`);
      }
    } else {
      log('cleanup unpublish', 'skipped (no course created or no admin token)');
    }
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

await main();
