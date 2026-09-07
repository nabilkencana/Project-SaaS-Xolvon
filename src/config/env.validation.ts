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

/** Variables that must be present and non-blank. */
const REQUIRED_KEYS = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_D1_DATABASE_ID',
  'CLOUDFLARE_API_TOKEN',
  'JWT_SECRET',
  'FRONTEND_URL',
] as const;

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

  for (const key of REQUIRED_KEYS) {
    if (!isNonBlankString(config[key])) {
      problems.push(`${key} is required and must be a non-empty string`);
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
  // consistently returns a number across the application.
  return {
    ...config,
    PORT: coercedPort,
  };
}
