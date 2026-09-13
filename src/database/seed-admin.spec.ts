import { execFile } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Reproduction for BUG-seed-driver (High, task-1-preflight.txt ROOT-CAUSE):
 * with this machine's .env DB_DRIVER=d1, `npm run seed:admin` ran
 * runMigrations against the REMOTE Cloudflare D1 (8 migrations applied
 * remotely) before the admin INSERT failed. seed:admin is a local bootstrap
 * command and must refuse any non-sqlite driver unless the operator opts in
 * explicitly via ADMIN_BOOTSTRAP_ALLOW_REMOTE=1.
 *
 * The child runs with cwd = empty temp dir so the repo's real .env (and any
 * Cloudflare credentials) is never loaded: pre-fix the bootstrap dies early
 * on environment validation with a swallowed/opaque error, post-fix the
 * driver guard must refuse BEFORE anything can touch a remote database.
 */
const REPO_ROOT = resolve(process.cwd());
const TS_NODE = join(REPO_ROOT, 'node_modules', '.bin', 'ts-node');
const SEED_SCRIPT = join(REPO_ROOT, 'src', 'database', 'seed-admin.ts');

interface SeedRun {
  code: number | null;
  output: string;
}

async function runSeed(overrides: NodeJS.ProcessEnv): Promise<SeedRun> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of [
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_D1_DATABASE_ID',
    'ADMIN_BOOTSTRAP_ALLOW_REMOTE',
  ]) {
    delete env[key];
  }
  Object.assign(env, overrides);

  const cwd = mkdtempSync(join(tmpdir(), 'qa-t16-seed-'));
  return new Promise((done) => {
    execFile(
      TS_NODE,
      [SEED_SCRIPT],
      {
        cwd,
        env: { ...env, TS_NODE_PROJECT: join(REPO_ROOT, 'tsconfig.json') },
        timeout: 150_000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const code =
          error && typeof (error as NodeJS.ErrnoException).code === 'number'
            ? ((error as unknown as { code: number }).code)
            : error
              ? 1
              : 0;
        done({ code, output: `${stdout}${stderr}` });
      },
    );
  });
}

describe('seed:admin driver guard (BUG-seed-driver)', () => {
  it(
    'refuses DB_DRIVER=d1 before bootstrapping anything, naming sqlite and ADMIN_BOOTSTRAP_ALLOW_REMOTE',
    async () => {
      const run = await runSeed({
        DB_DRIVER: 'd1',
        ADMIN_BOOTSTRAP_EMAIL: 'qa-t16@example.test',
        ADMIN_BOOTSTRAP_PASSWORD: 'irrelevant-unused',
      });

      expect(run.code).toBe(1);
      // The refusal must be explicit and actionable (not the opaque
      // "Check controlled command configuration." of the incident run).
      expect(run.output).toContain('sqlite');
      expect(run.output).toContain('ADMIN_BOOTSTRAP_ALLOW_REMOTE');
      // Nothing may have reached migration or remote bookkeeping.
      expect(run.output).not.toMatch(/applied/i);
      expect(run.output).not.toContain('Environment validation failed');
    },
    180_000,
  );
});
