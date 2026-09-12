/**
 * Trusted-proxy / client-IP resolution for rate limiting (addendum plan T6).
 *
 * The ThrottlerGuard keys every counter on `req.ip`. The staging/production
 * deployment sits behind exactly ONE trusted reverse proxy (Cloudflare
 * edge → app), so without Express' `trust proxy` setting every real user
 * would share the proxy's IP bucket — global 429s — while enabling it
 * blindly locally would make the auth limits spoofable via X-Forwarded-For.
 *
 * Resolution therefore fails CLOSED from an explicit env value:
 *
 *   TRUST_PROXY_HOPS unset/blank → false (Express default: trust no proxy,
 *                                  correct for local development)
 *   TRUST_PROXY_HOPS="1"         → 1 (staging/production behind one edge hop)
 *   anything else                → throw (fail-fast at bootstrap, DL-020 style)
 *
 * Error messages name the variable only — never echo deployment values.
 */
export function resolveTrustProxyHops(raw?: string): number | false {
  if (raw === undefined || raw.trim() === '') {
    return false;
  }
  const candidate = raw.trim();
  if (!/^\d+$/.test(candidate)) {
    throw new Error(
      'TRUST_PROXY_HOPS must be a non-negative integer ' +
        '(blank/unset = do not trust any proxy; 1 = one trusted edge hop).',
    );
  }
  return Number(candidate);
}
