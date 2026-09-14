#!/usr/bin/env node
/**
 * d1-write.mjs — SAFE wrapper for manual WRITE operations against Cloudflare D1.
 *
 * WHY: a `wrangler d1 execute --command "UPDATE ..."` that matches 0 rows still
 * exits 0 (success), and its `meta.changes` reports 1 even for a 0-row UPDATE,
 * so an operator can believe a credential/schema write took effect when it did
 * not (see decision-log DL-041). This wrapper FORCES every write command to
 * verify `meta.rows_written` / per-statement "Rows written" > 0 and to take its
 * SQL from a FILE (never an inline `--command`, so hashes/secrets never appear
 * in argv/logs).
 *
 * Usage:
 *   node scripts/qa/d1-write.mjs --db xolvon-staging [--env production] --file <sql.sql> [--label "..."]
 *
 * Reads CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID from .env or env vars.
 * Exits nonzero (5) when the D1 response reports 0 rows changed.
 * Requires wrangler on the PATH (add it: npm i -D wrangler).
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const db = flag('--db');
const envName = flag('--env');
const file = flag('--file');
const label = flag('--label') || db;

if (!db || !file) {
  console.error('Usage: node scripts/qa/d1-write.mjs --db <db> [--env <env>] --file <sql.sql> [--label "..."]');
  process.exit(2);
}
if (!existsSync(file)) { console.error('SQL file not found:', file); process.exit(2); }

function loadDotEnv(p) {
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !m[2].startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = loadDotEnv(path.join(process.cwd(), '.env'));
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;
if (!CF_TOKEN || !CF_ACCOUNT) { console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID required.'); process.exit(2); }

// Prefer the locally installed wrangler binary; fall back to npx.
const localBin = ['./node_modules/.bin/wrangler', 'node_modules/.bin/wrangler']
  .find((p) => existsSync(path.join(process.cwd(), p)));
let bin, preArgs;
if (localBin) { bin = path.join(process.cwd(), localBin); preArgs = []; }
else { bin = 'npx'; preArgs = ['--yes', 'wrangler']; }
const wranglerArgs = [...preArgs, 'd1', 'execute', db, ...(envName ? ['--env', envName] : []), '--remote', '--json', '--file', file];

const r = spawnSync(bin, wranglerArgs, {
  encoding: 'utf8',
  env: { ...process.env, CLOUDFLARE_API_TOKEN: CF_TOKEN, CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT },
});
if (r.status !== 0) {
  console.error(`wrangler failed (exit ${r.status}):`, (r.stderr || '').slice(0, 1000));
  process.exit(3);
}
let payload;
try {
  const start = r.stdout.indexOf('[');
  const end = r.stdout.lastIndexOf(']');
  if (start < 0 || end < 0) throw new Error('no JSON array in output');
  payload = JSON.parse(r.stdout.slice(start, end + 1));
} catch (e) { console.error('Could not parse wrangler JSON output.', e.message); process.exit(4); }

const block = (Array.isArray(payload) ? payload : [payload])[0];
const meta = block?.meta || {};
const perStmtResults = Array.isArray(block?.results) ? block.results : [];
// NOTE: D1's meta.changes is additive and is 1 even when an UPDATE matches 0
// rows (see decision-log DL-041). The RELIABLE counter of actual rows modified
// is meta.rows_written, echoed per statement in results[i]["Rows written"].
const rowsWritten = Number(meta.rows_written ?? -1);
const perStmt = perStmtResults.reduce((n, r) => n + Number(r?.['Rows written'] ?? 0), 0);
const effective = rowsWritten > 0 ? rowsWritten : perStmt;
console.log(`[d1-write] ${label}: success=${block?.success} meta.rows_written=${meta.rows_written ?? '?'} perStatement=${perStmt}`);
if (!(effective > 0)) {
  console.error(`[d1-write] GUARD: 0 rows actually modified for '${label}' — write did NOT take effect. Refuse to treat as success.`);
  process.exit(5);
}
console.log(`[d1-write] OK: '${label}' applied (${effective} rows modified).`);
