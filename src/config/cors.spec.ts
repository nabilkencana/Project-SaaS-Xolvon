import { resolveCorsOrigins } from './cors';

describe('resolveCorsOrigins', () => {
  describe('explicit CORS_ALLOWED_ORIGINS whitelist', () => {
    it('parses a comma-separated list into trimmed origins', () => {
      expect(
        resolveCorsOrigins('https://app.xolvon.com,https://admin.xolvon.com'),
      ).toEqual(['https://app.xolvon.com', 'https://admin.xolvon.com']);
    });

    it('trims surrounding whitespace and drops empty entries', () => {
      expect(
        resolveCorsOrigins('  https://a.xolvon.com , ,https://b.xolvon.com  '),
      ).toEqual(['https://a.xolvon.com', 'https://b.xolvon.com']);
    });

    it('normalizes a trailing slash so entries match browser Origin headers', () => {
      expect(resolveCorsOrigins('https://a.xolvon.com/')).toEqual([
        'https://a.xolvon.com',
      ]);
    });

    it('de-duplicates repeated origins', () => {
      expect(
        resolveCorsOrigins('https://a.xolvon.com,https://a.xolvon.com'),
      ).toEqual(['https://a.xolvon.com']);
    });
  });

  describe('fallback chain', () => {
    it('falls back to FRONTEND_URL when CORS_ALLOWED_ORIGINS is unset', () => {
      expect(resolveCorsOrigins(undefined, 'https://fe.example.com')).toEqual([
        'https://fe.example.com',
      ]);
    });

    it('falls back to FRONTEND_URL when CORS_ALLOWED_ORIGINS is blank', () => {
      expect(resolveCorsOrigins('   ', 'https://fe.example.com')).toEqual([
        'https://fe.example.com',
      ]);
    });

    it('falls back to the local dev origin when neither is configured', () => {
      expect(resolveCorsOrigins(undefined, undefined)).toEqual([
        'http://localhost:3001',
      ]);
    });

    it('falls back to the local dev origin when both are blank', () => {
      expect(resolveCorsOrigins('', '')).toEqual(['http://localhost:3001']);
    });
  });

  describe('wildcard rejection (credentials=true)', () => {
    it('rejects a bare wildcard origin', () => {
      expect(() => resolveCorsOrigins('*')).toThrow(/wildcard/i);
    });

    it('rejects a wildcard mixed into an otherwise valid list', () => {
      expect(() =>
        resolveCorsOrigins('https://a.xolvon.com,*'),
      ).toThrow(/wildcard/i);
    });

    it('rejects a wildcard FRONTEND_URL fallback too', () => {
      expect(() => resolveCorsOrigins(undefined, '*')).toThrow(/wildcard/i);
    });
  });

  describe('malformed configuration fails safely', () => {
    it('rejects an origin that is not an absolute http(s) URL', () => {
      expect(() => resolveCorsOrigins('not-a-url')).toThrow(/CORS/i);
    });

    it('rejects a non-http scheme', () => {
      expect(() => resolveCorsOrigins('ftp://files.example.com')).toThrow(
        /CORS/i,
      );
    });

    it('rejects a protocol-relative entry', () => {
      expect(() => resolveCorsOrigins('//cdn.example.com')).toThrow(/CORS/i);
    });

    it('rejects an entry missing its hostname', () => {
      expect(() => resolveCorsOrigins('https://')).toThrow(/CORS/i);
    });
  });
});
