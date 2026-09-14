#!/usr/bin/env node
/**
 * verify-rotation.mjs — Independent verification tool for the 2026-09-14
 * admin credential rotation. Run by the PROJECT OWNER, from outside the
 * fix session, to confirm the rotation actually took effect on both D1
 * environments. It prints booleans and row metadata ONLY — never a hash
 * or password.
 *
 * Usage:
 *   npm i -D wrangler            # once (binary required by the script)
 *   node scripts/qa/verify-rotation.mjs
 *
 * Reads:
 *   - CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID from .env
 *   - STAGING_ADMIN_PASSWORD  / PROD_ADMIN_PASSWORD  from .env.rotation
 *     (created by the fix session; gitignored — do not commit)
 *   - The pre-rotation (old/leaked) value automatically from git history
 *     (commit before the redaction commit 0dc0bacc), or via env var
 *     OLD_ADMIN_PASSWORD to override.
 *
 * Expects (after a successful rotation):
 *   - old_verifies = false on BOTH environments
 *   - new_verifies = true  on BOTH environments (each its own value)
 * If either is wrong, the rotation did NOT fully apply — investigate, do
 * not declare success.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import argon2 from 'argon2';

const root = process.cwd();
const envFile = path.join(root, '.env');
const rotationFile = path.join(root, '.env.rotation');
const adminEmail = process.env.ADMIN_EMAIL || 'admin@xolvon.com';

function loadDotEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !m[2].startsWith('#')) { out[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
  }
  return out;
}

const env = loadDotEnv(envFile);
const rotation = loadDotEnv(rotationFile);

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;
if (!CF_TOKEN || !CF_ACCOUNT) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID required (from .env or env vars).');
  process.exit(2);
}

// Old leaked value: env override wins, else auto-extract from git history.
let oldValue = process.env.OLD_ADMIN_PASSWORD || null;
if (!oldValue) {
  try {
    const blob = spawnSync('git', ['show', '0dc0bacc^:docs/qa-results.md'], { encoding: 'utf8' }).stdout;
    const m = blob.match(/`(SuperSecret[^`]*)`/);
    if (m) oldValue = m[1];
  } catch { /* ignore */ }
}

const newValues = { staging: rotation.STAGING_ADMIN_PASSWORD, production: rotation.PROD_ADMIN_PASSWORD };

function fetchHash(dbName, prod) {
  const args = ['d1', 'execute', dbName, '--remote', '--json', '--command',
    `SELECT password_hash AS h FROM users WHERE email = '${adminEmail}'`];
  if (prod) args.splice(2, 0, '--env', 'production');
  const r = spawnSync('npx', ['--yes', 'wrangler', ...args], {
    encoding: 'utf8', env: { ...process.env, CLOUDFLARE_API_TOKEN: CF_TOKEN, CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT },
  });
  if (r.status !== 0) throw new Error(`wrangler failed for ${dbName}: ${r.stderr}`);
  const arr = JSON.parse(r.stdout);
  return arr[0]?.results?.[0]?.h ?? null;
}

function assertSecret(tag, val) {
  if (!val) { console.error(`MISSING: ${tag} — cannot proceed (no value printed).`); return false; }
  return true;
}

const oldOk = assertSecret('old leaked value (history or OLD_ADMIN_PASSWORD)', oldValue);
const stgOk = assertSecret('STAGING_ADMIN_PASSWORD in .env.rotation', newValues.staging);
const prdOk = assertSecret('PROD_ADMIN_PASSWORD in .env.rotation', newValues.production);
if (!oldOk || !stgOk || !prdOk) process.exit(2);

for (const [label, dbName, prod] of [['staging', 'xolvon-staging', false], ['production', 'xolvon-production', true]]) {
  const hash = fetchHash(dbName, prod);
  if (!hash) { console.log(`${label}: NO ADMIN ROW for email ${adminEmail} — check environment.`); continue; }
  let oldV = null, newV = null;
  try { oldV = await argon2.verify(hash, oldValue); } catch (e) { oldV = e.message; }
  try { newV = await argon2.verify(hash, newValues[label]); } catch (e) { newV = e.message; }
  console.log(`${label}:`);
  console.log(`  admin_exists  = true`);
  console.log(`  hash_type     = ${hash.slice(0, 10)}`);
  console.log(`  old_verifies  = ${oldV}`);
  console.log(`  new_verifies  = ${newV}`);
  const pass = oldV === false && newV === true;
  console.log(`  VERDICT       = ${pass ? 'PASS (rotation effective)' : 'FAIL (rotation did NOT take full effect)'}`);
}
