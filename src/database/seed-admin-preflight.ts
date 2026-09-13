import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isSeedDriverAllowed,
  resolveSeedDbDriver,
  seedDriverRefusalMessage,
} from './seed-guard';

/**
 * Side-effect guard imported BEFORE `../app.module` in seed-admin.ts so the
 * driver refusal happens before any module evaluation, context creation,
 * migration run, or admin write can target a remote database (BUG-seed-driver:
 * the incident applied 8 migrations to remote D1 from this local command).
 */
const envPath = join(process.cwd(), '.env');
const driver = resolveSeedDbDriver(
  process.env,
  existsSync(envPath) ? readFileSync(envPath, 'utf8') : undefined,
);

if (!isSeedDriverAllowed(driver, process.env.ADMIN_BOOTSTRAP_ALLOW_REMOTE === '1')) {
  process.stderr.write(`${seedDriverRefusalMessage(driver)}\n`);
  process.exit(1);
}
