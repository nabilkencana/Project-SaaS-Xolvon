import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  buildSecurityHeadersOptions,
  enableSecurityHeaders,
  parseCspOrigins,
  type SecurityHeadersEnv,
  type SecurityHelmetOptions,
} from './security-headers';

/** Parsed "directive -> token list" view of a Content-Security-Policy header. */
function parseCspHeader(header: string | undefined): Map<string, string[]> {
  expect(typeof header).toBe('string');
  const directives = new Map<string, string[]>();
  for (const part of (header ?? '').split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    const name = tokens.shift();
    if (name) directives.set(name, tokens);
  }
  return directives;
}

/** Reads the CSP directives out of built helmet options without deep casts. */
function cspDirectivesOf(options: SecurityHelmetOptions): Map<string, string[]> {
  const csp = options.contentSecurityPolicy as {
    directives: Record<string, string[]>;
  };
  const directives = new Map<string, string[]>();
  for (const [name, tokens] of Object.entries(csp.directives)) {
    directives.set(name, [...tokens]);
  }
  return directives;
}

@Controller('probe')
class ProbeController {
  @Get()
  ping(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('parseCspOrigins', () => {
  it('returns an empty list when the env value is unset or blank', () => {
    expect(parseCspOrigins(undefined)).toEqual([]);
    expect(parseCspOrigins('')).toEqual([]);
    expect(parseCspOrigins('   ')).toEqual([]);
  });

  it('parses comma- and whitespace-separated origins', () => {
    expect(
      parseCspOrigins('https://a.example.com,https://b.example.com'),
    ).toEqual(['https://a.example.com', 'https://b.example.com']);
    expect(parseCspOrigins('https://a.example.com  https://b.example.com')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
  });

  it('normalizes entries to scheme://host origins, dropping paths', () => {
    expect(parseCspOrigins('https://a.example.com/some/path?q=1')).toEqual([
      'https://a.example.com',
    ]);
  });

  it('drops malformed entries and non-http(s) schemes without echoing them', () => {
    expect(
      parseCspOrigins('not-a-url, javascript:alert(1), data:text/plain,, https://ok.example.com'),
    ).toEqual(['https://ok.example.com']);
  });

  it('de-duplicates repeated origins', () => {
    expect(
      parseCspOrigins('https://a.example.com,https://a.example.com'),
    ).toEqual(['https://a.example.com']);
  });
});

describe('buildSecurityHeadersOptions', () => {
  const envWithOrigins: SecurityHeadersEnv = {
    appEnv: 'production',
    cspConnectSrc: 'https://app.xolvon.com,https://admin.xolvon.com',
    r2Endpoint: 'https://test-bucket.example.r2.cloudflarestorage.com',
  };

  it('sets the locked baseline directives (default-src none, script-src self, frame-ancestors none)', () => {
    const directives = cspDirectivesOf(buildSecurityHeadersOptions(envWithOrigins));
    expect(directives.get('default-src')).toEqual(["'none'"]);
    expect(directives.get('script-src')).toEqual(["'self'"]);
    expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it("builds connect/style/img/font-src from 'self' plus CSP_CONNECT_SRC and the R2_ENDPOINT origin", () => {
    const directives = cspDirectivesOf(buildSecurityHeadersOptions(envWithOrigins));
    const expected = [
      "'self'",
      'https://app.xolvon.com',
      'https://admin.xolvon.com',
      'https://test-bucket.example.r2.cloudflarestorage.com',
    ];
    for (const name of ['connect-src', 'style-src', 'img-src', 'font-src']) {
      expect(directives.get(name)).toEqual(expected);
    }
  });

  it("falls back to 'self' only when CSP_CONNECT_SRC and R2_ENDPOINT are unset", () => {
    const directives = cspDirectivesOf(buildSecurityHeadersOptions({ appEnv: 'local' }));
    for (const name of ['connect-src', 'style-src', 'img-src', 'font-src']) {
      expect(directives.get(name)).toEqual(["'self'"]);
    }
  });

  it("contains no 'unsafe-inline' or 'unsafe-eval' anywhere in the policy", () => {
    const serialized = JSON.stringify(buildSecurityHeadersOptions(envWithOrigins));
    expect(serialized).not.toMatch(/unsafe-inline|unsafe-eval/);
  });

  it('enables HSTS for one year with includeSubDomains only when APP_ENV=production', () => {
    expect(
      (buildSecurityHeadersOptions({ ...envWithOrigins, appEnv: 'production' }) as Record<string, unknown>)
        .strictTransportSecurity,
    ).toEqual({ maxAge: 31_536_000, includeSubDomains: true });

    for (const appEnv of ['local', 'staging', undefined]) {
      expect(
        (buildSecurityHeadersOptions({ ...envWithOrigins, appEnv }) as Record<string, unknown>)
          .strictTransportSecurity,
      ).toBe(false);
    }
  });

  it('configures frameguard DENY, nosniff, and strict referrer policy', () => {
    const options = buildSecurityHeadersOptions(envWithOrigins) as Record<string, unknown>;
    expect(options.xFrameOptions).toEqual({ action: 'deny' });
    expect(options.xContentTypeOptions).toBe(true);
    expect(options.referrerPolicy).toEqual({
      policy: 'strict-origin-when-cross-origin',
    });
    expect(options.xPoweredBy).not.toBe(false);
  });
});

describe('security headers over HTTP (Nest testing app)', () => {
  const prodEnv: SecurityHeadersEnv = {
    appEnv: 'production',
    cspConnectSrc: 'https://app.xolvon.com',
    r2Endpoint: 'https://bucket.example.r2.cloudflarestorage.com',
  };
  const stagingEnv: SecurityHeadersEnv = { appEnv: 'staging' };

  async function createSecuredApp(env: SecurityHeadersEnv): Promise<INestApplication<App>> {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    const app = moduleRef.createNestApplication();
    enableSecurityHeaders(app, env);
    await app.init();
    return app;
  }

  describe('production (APP_ENV=production)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createSecuredApp(prodEnv);
    });
    afterAll(async () => {
      await app.close();
    });

    it('sends the full expected header set on a successful response', async () => {
      const res = await request(app.getHttpServer()).get('/probe').expect(200);

      const directives = parseCspHeader(res.headers['content-security-policy']);
      expect(directives.get('default-src')).toEqual(["'none'"]);
      expect(directives.get('script-src')).toEqual(["'self'"]);
      expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
      expect(directives.get('connect-src')).toEqual([
        "'self'",
        'https://app.xolvon.com',
        'https://bucket.example.r2.cloudflarestorage.com',
      ]);
      expect(directives.get('style-src')).toEqual(directives.get('connect-src'));
      expect(directives.get('img-src')).toEqual(directives.get('connect-src'));
      expect(directives.get('font-src')).toEqual(directives.get('connect-src'));
      expect(res.headers['content-security-policy']).not.toMatch(
        /unsafe-inline|unsafe-eval/,
      );

      expect(res.headers['strict-transport-security']).toMatch(/max-age=31536000/);
      expect(res.headers['strict-transport-security']).toMatch(/includeSubDomains/);
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('non-production (APP_ENV=staging)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createSecuredApp(stagingEnv);
    });
    afterAll(async () => {
      await app.close();
    });

    it('sends the CSP/frameguard/nosniff/referrer headers without HSTS', async () => {
      const res = await request(app.getHttpServer()).get('/probe').expect(200);

      const directives = parseCspHeader(res.headers['content-security-policy']);
      expect(directives.get('default-src')).toEqual(["'none'"]);
      expect(directives.get('script-src')).toEqual(["'self'"]);
      expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
      expect(directives.get('connect-src')).toEqual(["'self'"]);
      expect(res.headers['content-security-policy']).not.toMatch(
        /unsafe-inline|unsafe-eval/,
      );

      expect(res.headers['strict-transport-security']).toBeUndefined();
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });
});
