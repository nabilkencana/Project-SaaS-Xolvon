/**
 * T4 — Global security headers (Helmet).
 *
 * Configures Helmet once during bootstrap so EVERY response — including
 * errors and CORS-preflight replies — carries a strict, explicit policy.
 * Decision DL-021 (docs/decision-log.md): CSP uses explicit origin lists,
 * never unsafe-inline/unsafe-eval; deployment-specific origins are supplied
 * via environment variables, never embedded here.
 */
import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/** One year in seconds — the required HSTS max-age for production. */
export const HSTS_MAX_AGE_ONE_YEAR_SECONDS = 31_536_000;

const PRODUCTION_APP_ENV = 'production';

/**
 * Environment inputs for header configuration. Values are read from
 * ConfigService in main.ts so this module stays unit-testable without the
 * whole AppModule.
 */
export interface SecurityHeadersEnv {
  /** APP_ENV — HSTS is enabled ONLY for 'production'. */
  appEnv?: string;
  /** CSP_CONNECT_SRC — comma/space separated origin URLs allowed as fetch targets. */
  cspConnectSrc?: string;
  /** R2_ENDPOINT — its origin is appended to the fetch/media source lists. */
  r2Endpoint?: string;
}

export type SecurityHelmetOptions = NonNullable<Parameters<typeof helmet>[0]>;

/** Normalizes an absolute http(s) URL to its origin, or null if not usable. */
function toHttpOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.origin;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parses a comma/whitespace separated list of URLs into normalized,
 * de-duplicated http(s) origins. Malformed or non-http(s) entries are
 * dropped silently — an unparseable value must never be echoed into a
 * live CSP header or crash bootstrap.
 */
export function parseCspOrigins(raw: string | undefined): string[] {
  const entries = (raw ?? '')
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const origins = entries
    .map(toHttpOrigin)
    .filter((origin): origin is string => origin !== null);
  return [...new Set(origins)];
}

/**
 * Source expressions shared by connect/style/img/font-src: always 'self'
 * (safe default) plus the configured origins and the R2 endpoint origin.
 */
function buildCspSources(env: SecurityHeadersEnv): string[] {
  const origins = parseCspOrigins(env.cspConnectSrc);
  for (const origin of parseCspOrigins(env.r2Endpoint)) {
    if (!origins.includes(origin)) origins.push(origin);
  }
  return ["'self'", ...origins];
}

/** Builds the exact helmet option set — exported for config-level tests. */
export function buildSecurityHeadersOptions(
  env: SecurityHeadersEnv,
): SecurityHelmetOptions {
  const isProduction =
    (env.appEnv ?? 'local').trim().toLowerCase() === PRODUCTION_APP_ENV;
  const cspSources = buildCspSources(env);

  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'none'"],
        'script-src': ["'self'"],
        'connect-src': cspSources,
        'style-src': cspSources,
        'img-src': cspSources,
        'font-src': cspSources,
        'frame-ancestors': ["'none'"],
      },
    },
    // HSTS only in production (staging/local run over http:// on purpose).
    strictTransportSecurity: isProduction
      ? {
          maxAge: HSTS_MAX_AGE_ONE_YEAR_SECONDS,
          includeSubDomains: true,
        }
      : false,
    xFrameOptions: { action: 'deny' },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Helmet removes the X-Powered-By fingerprint.
    xPoweredBy: true,
  };
}

/**
 * Applies Helmet globally and strips Express' default X-Powered-By setting.
 * Must be called in main.ts BEFORE routes/validation/exception wiring so
 * every response — including preflight and error bodies — gets the headers.
 */
export function enableSecurityHeaders(
  app: INestApplication,
  env: SecurityHeadersEnv,
): void {
  const expressApp = app.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
  };
  expressApp.disable?.('x-powered-by');
  app.use(helmet(buildSecurityHeadersOptions(env)));
}
