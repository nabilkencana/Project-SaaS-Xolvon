/**
 * Pure helpers for the seed:admin driver guard (BUG-seed-driver).
 *
 * The incident (task-1-preflight.txt ROOT-CAUSE): a machine whose .env sets
 * DB_DRIVER=d1 ran `npm run seed:admin` against the REMOTE Cloudflare D1 —
 * runMigrations applied 8 migration files remotely before the admin INSERT
 * failed invisibly. The effective driver must be resolved the same way the
 * app resolves it (DatabaseModule factory + @nestjs/config): dotenv does NOT
 * override an already-set process.env value, and DB_DRIVER defaults to
 * 'sqlite' when neither source defines it.
 */

/** Extract one KEY=value entry from dotenv file content (last assignment wins, like dotenv). */
export function parseEnvFileValue(content: string, key: string): string | undefined {
  let value: string | undefined;
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (match?.[1] !== key) continue;
    let raw = (match[2] ?? '').trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"') && raw.length > 1) ||
      (raw.startsWith("'") && raw.endsWith("'") && raw.length > 1)
    ) {
      raw = raw.slice(1, -1);
    }
    value = raw;
  }
  return value;
}

/** Resolve the effective DB_DRIVER exactly like ConfigModule + DatabaseModule do. */
export function resolveSeedDbDriver(
  env: NodeJS.ProcessEnv,
  dotenvContent: string | undefined,
): string {
  const fromEnv = env['DB_DRIVER'];
  const effective =
    fromEnv !== undefined && fromEnv !== ''
      ? fromEnv
      : (dotenvContent === undefined ? undefined : parseEnvFileValue(dotenvContent, 'DB_DRIVER'));
  return (effective ?? 'sqlite').trim();
}

/** Human-readable refusal for a non-local driver (names and driver value only — never secrets). */
export function seedDriverRefusalMessage(driver: string): string {
  return (
    `seed:admin refuses DB_DRIVER="${driver}": this command only bootstraps the ` +
    'local sqlite database. Run with DB_DRIVER=sqlite, or set ' +
    'ADMIN_BOOTSTRAP_ALLOW_REMOTE=1 to target a remote database deliberately.'
  );
}

/** True when the seed may proceed: local sqlite, or an explicit operator opt-in. */
export function isSeedDriverAllowed(
  driver: string,
  allowRemote: boolean,
): boolean {
  return driver === 'sqlite' || allowRemote;
}
