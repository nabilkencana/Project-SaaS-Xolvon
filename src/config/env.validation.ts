/**
 * Central runtime environment validation for ConfigModule.
 *
 * Runs once during application bootstrap. If it throws, the application
 * fails to start — surfacing misconfiguration immediately instead of at
 * request time.
 *
 * Security rule: error messages may reference variable NAMES and the rule
 * that failed, but must NEVER include variable VALUES (secrets such as
 * CLOUDFLARE_API_TOKEN and JWT_SECRET must not leak into logs or errors).
 */

/** Variables that must be present and non-blank regardless of DB_DRIVER. */
const ALWAYS_REQUIRED_KEYS = ['JWT_SECRET', 'FRONTEND_URL'] as const;

/** Cloudflare variables — required only when DB_DRIVER=d1. */
const CLOUDFLARE_KEYS = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_D1_DATABASE_ID',
  'CLOUDFLARE_API_TOKEN',
] as const;

/** Supported database drivers (HANDBOOK_BACKEND.md §2 local mode, §8 D1). */
const VALID_DB_DRIVERS = ['sqlite', 'd1'] as const;
const DEFAULT_DB_DRIVER = 'sqlite';

/** Minimum accepted length for the JWT signing secret. */
export const JWT_SECRET_MIN_LENGTH = 32;

/** Valid TCP port range. */
const PORT_MIN = 1;
const PORT_MAX = 65535;

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Validates (and coerces) the active environment contract.
 * Called by `ConfigModule.forRoot({ validate })` during bootstrap.
 */
export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const problems: string[] = [];

  // DB_DRIVER is optional and defaults to sqlite for local development.
  const rawDriver = config['DB_DRIVER'];
  let dbDriver: string = DEFAULT_DB_DRIVER;
  if (rawDriver !== undefined && rawDriver !== null && rawDriver !== '') {
    const candidate = String(rawDriver).trim();
    if (!(VALID_DB_DRIVERS as readonly string[]).includes(candidate)) {
      problems.push(
        `DB_DRIVER must be one of: ${VALID_DB_DRIVERS.join(', ')} (default: ${DEFAULT_DB_DRIVER})`,
      );
    } else {
      dbDriver = candidate;
    }
  }

  for (const key of ALWAYS_REQUIRED_KEYS) {
    if (!isNonBlankString(config[key])) {
      problems.push(`${key} is required and must be a non-empty string`);
    }
  }

  // Cloudflare credentials are mandatory only when the D1 driver is active —
  // local sqlite development must bootstrap without any Cloudflare account.
  if (dbDriver === 'd1') {
    for (const key of CLOUDFLARE_KEYS) {
      if (!isNonBlankString(config[key])) {
        problems.push(
          `${key} is required when DB_DRIVER=d1 and must be a non-empty string`,
        );
      }
    }
  }

  // JWT secret strength — value is never echoed back into the message.
  const jwtSecret = config['JWT_SECRET'];
  if (
    isNonBlankString(jwtSecret) &&
    jwtSecret.trim().length < JWT_SECRET_MIN_LENGTH
  ) {
    problems.push(
      `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters long`,
    );
  }

  // FRONTEND_URL must be a valid absolute http(s) URL — value never echoed.
  const frontendUrl = config['FRONTEND_URL'];
  if (isNonBlankString(frontendUrl)) {
    let parsed: URL | undefined;
    try {
      parsed = new URL(frontendUrl.trim());
    } catch {
      parsed = undefined;
    }
    if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) {
      problems.push('FRONTEND_URL must be a valid absolute http(s) URL');
    }
  }

  // PORT is optional but must be a valid TCP port when provided.
  const rawPort = config['PORT'];
  let coercedPort = 3000;
  if (rawPort !== undefined && rawPort !== null && rawPort !== '') {
    const parsed =
      typeof rawPort === 'number' ? rawPort : Number(String(rawPort).trim());
    if (!Number.isInteger(parsed) || parsed < PORT_MIN || parsed > PORT_MAX) {
      problems.push(
        `PORT must be an integer between ${PORT_MIN} and ${PORT_MAX}`,
      );
    } else {
      coercedPort = parsed;
    }
  }

  if (problems.length > 0) {
    throw new Error(
      'Environment validation failed:\n  - ' +
        problems.join('\n  - ') +
        '\nSet the required variables in your .env file or deployment environment.',
    );
  }

  // Return a validated copy with coerced values so ConfigService.get<number>('PORT')
  // consistently returns a number and the resolved DB_DRIVER is explicit.
  return {
    ...config,
    PORT: coercedPort,
    DB_DRIVER: dbDriver,
  };
}
