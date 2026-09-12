/**
 * Unit coverage for TRUST_PROXY_HOPS resolution (addendum plan T6).
 *
 * The deployment (D1/staging/production) sits behind exactly one trusted
 * reverse proxy, but the throttler must never trust spoofable headers when
 * no proxy is configured. Resolution therefore fails CLOSED: unset/blank
 * means "no proxy" (Express `trust proxy = false`), an explicit value must
 * be a non-negative integer, anything else throws at bootstrap.
 */
import { resolveTrustProxyHops } from './trust-proxy';

describe('resolveTrustProxyHops (T6 client-IP assumption)', () => {
  it('returns false when TRUST_PROXY_HOPS is unset or blank (fail closed, no proxy trusted)', () => {
    expect(resolveTrustProxyHops(undefined)).toBe(false);
    expect(resolveTrustProxyHops('')).toBe(false);
    expect(resolveTrustProxyHops('   ')).toBe(false);
  });

  it('accepts 0 as an explicit "not behind a proxy" setting', () => {
    expect(resolveTrustProxyHops('0')).toBe(0);
  });

  it('parses positive hop counts for proxied deployments (D1/staging/production)', () => {
    expect(resolveTrustProxyHops('1')).toBe(1);
    expect(resolveTrustProxyHops(' 2')).toBe(2);
    expect(resolveTrustProxyHops('3')).toBe(3);
  });

  it.each(['true', 'abc', '-1', '1.5', '1,2'])(
    'rejects malformed value "%s" at bootstrap with a fail-fast error that names only the variable',
    (raw) => {
      expect(() => resolveTrustProxyHops(raw)).toThrow(/TRUST_PROXY_HOPS/);
    },
  );
});
