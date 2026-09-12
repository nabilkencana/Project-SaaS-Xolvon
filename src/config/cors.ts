/**
 * CORS origin whitelist resolution (addendum plan T5 / DL-020).
 *
 * The app always enables `credentials: true`, so the Fetch spec's wildcard
 * origin is never acceptable here — an explicit, environment-specific
 * whitelist is required. Resolution order:
 *
 *   CORS_ALLOWED_ORIGINS (comma-separated) → FRONTEND_URL → local dev origin
 *
 * Throwing surfaces a misconfiguration at bootstrap (fail-fast) instead of
 * silently weakening CORS at request time. Error messages name the offending
 * entry only; origins are not secrets, but no other env values are echoed.
 */

/** Fallback used for local development when nothing is configured. */
export const LOCAL_DEV_ORIGIN = 'http://localhost:3001';

/**
 * Parses one comma-separated origin list into normalized origins.
 * Rejects wildcards (incompatible with credentialed CORS) and any entry that
 * is not an absolute http(s) URL with a hostname.
 */
function parseOriginList(raw: string, variableName: string): string[] {
  const origins: string[] = [];
  for (const entry of raw.split(',')) {
    const candidate = entry.trim();
    if (candidate === '') continue;

    if (candidate.includes('*')) {
      throw new Error(
        `${variableName}: wildcard origin "${candidate}" is not allowed ` +
          'because CORS credentials are enabled. List explicit origins instead.',
      );
    }

    let url: URL;
    try {
      url = new URL(candidate);
    } catch {
      throw new Error(
        `${variableName}: "${candidate}" is not a valid absolute http(s) URL.`,
      );
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(
        `${variableName}: "${candidate}" must use the http or https scheme.`,
      );
    }
    // URL.origin normalizes away trailing slashes and paths, so entries match
    // browser Origin headers exactly.
    origins.push(url.origin);
  }
  return [...new Set(origins)];
}

/**
 * Resolves the effective CORS whitelist.
 * Blank/absent CORS_ALLOWED_ORIGINS falls back to FRONTEND_URL; if that is
 * also blank/absent, the local dev origin is used so `npm run start` keeps
 * working without a final deployment domain (DL-020).
 */
export function resolveCorsOrigins(
  corsAllowedOrigins?: string,
  frontendUrl?: string,
): string[] {
  for (const [raw, variableName] of [
    [corsAllowedOrigins, 'CORS_ALLOWED_ORIGINS'],
    [frontendUrl, 'FRONTEND_URL'],
  ] as const) {
    if (raw === undefined || raw.trim() === '') continue;
    const parsed = parseOriginList(raw, variableName);
    if (parsed.length > 0) return parsed;
  }
  return [LOCAL_DEV_ORIGIN];
}
