import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  /**
   * SQLite mode (the default) — Cloudflare credentials are optional so the
   * app bootstraps locally without any Cloudflare account.
   */
  const sqliteBase: Record<string, string> = {
    APP_ENV: 'local',
    JWT_SECRET: 'a-sufficiently-long-jwt-secret-32ch',
    FRONTEND_URL: 'https://app.example.com',
    PORT: '3000',
  };

  /** D1 mode — every Cloudflare credential becomes mandatory. */
  const d1Base: Record<string, string> = {
    ...sqliteBase,
    DB_DRIVER: 'd1',
    CLOUDFLARE_ACCOUNT_ID: 'acct_1234567890',
    CLOUDFLARE_D1_DATABASE_ID: 'db_1234567890',
    CLOUDFLARE_API_TOKEN: 'cf-token-secret-value',
  };

  describe('DB_DRIVER contract', () => {
    it('defaults DB_DRIVER to sqlite when unset', () => {
      const result = validateEnvironment({ ...sqliteBase });

      expect(result.DB_DRIVER).toBe('sqlite');
      expect(result.PORT).toBe(3000);
      expect(typeof result.PORT).toBe('number');
    });

    it('accepts an explicit DB_DRIVER=sqlite', () => {
      expect(() =>
        validateEnvironment({ ...sqliteBase, DB_DRIVER: 'sqlite' }),
      ).not.toThrow();
    });

    it('accepts a complete DB_DRIVER=d1 configuration with Cloudflare credentials', () => {
      const result = validateEnvironment({ ...d1Base });

      expect(result.DB_DRIVER).toBe('d1');
    });

    it('accepts a sqlite configuration that still carries optional Cloudflare credentials', () => {
      const result = validateEnvironment({ ...d1Base, DB_DRIVER: 'sqlite' });

      expect(result.CLOUDFLARE_ACCOUNT_ID).toBe(d1Base.CLOUDFLARE_ACCOUNT_ID);
    });

    it('rejects an unknown DB_DRIVER', () => {
      expect(() =>
        validateEnvironment({ ...sqliteBase, DB_DRIVER: 'bogus' }),
      ).toThrow('DB_DRIVER');
    });
  });

  describe('environment separation', () => {
    it.each(['local', 'staging', 'production'])('accepts APP_ENV=%s', (APP_ENV) => {
      expect(() => validateEnvironment({ ...sqliteBase, APP_ENV })).not.toThrow();
    });

    it('rejects an unknown APP_ENV without exposing values', () => {
      expect(() => validateEnvironment({ ...sqliteBase, APP_ENV: 'production-secret' })).toThrow(
        'APP_ENV',
      );
      try {
        validateEnvironment({ ...sqliteBase, APP_ENV: 'production-secret' });
      } catch (error) {
        expect((error as Error).message).not.toContain('production-secret');
      }
    });
  });

  describe('Cloudflare credentials are required only when DB_DRIVER=d1', () => {
    it.each([
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_D1_DATABASE_ID',
      'CLOUDFLARE_API_TOKEN',
    ])('accepts a sqlite configuration missing %s', (key) => {
      const config: Record<string, string> = { ...d1Base, DB_DRIVER: 'sqlite' };
      delete config[key];

      expect(() => validateEnvironment(config)).not.toThrow();
    });

    it.each([
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_D1_DATABASE_ID',
      'CLOUDFLARE_API_TOKEN',
    ])('rejects a d1 configuration missing %s', (key) => {
      const config = { ...d1Base };
      delete config[key];

      expect(() => validateEnvironment(config)).toThrow(key);
    });

    it.each([
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_D1_DATABASE_ID',
      'CLOUDFLARE_API_TOKEN',
    ])('rejects a d1 configuration with a blank %s', (key) => {
      const config = { ...d1Base, [key]: '   ' };

      expect(() => validateEnvironment(config)).toThrow(key);
    });
  });

  describe('always-required keys', () => {
    it.each(['JWT_SECRET', 'FRONTEND_URL'])(
      'rejects configuration missing %s',
      (key) => {
        const config = { ...sqliteBase };
        delete config[key];

        expect(() => validateEnvironment(config)).toThrow(key);
      },
    );

    it.each(['JWT_SECRET', 'FRONTEND_URL'])('rejects a blank %s', (key) => {
      const config = { ...sqliteBase, [key]: '   ' };

      expect(() => validateEnvironment(config)).toThrow(key);
    });

    it('rejects a JWT secret shorter than 32 characters without exposing its value', () => {
      const config = { ...sqliteBase, JWT_SECRET: 'short-secret' };

      let thrown: unknown;
      try {
        validateEnvironment(config);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      const message = (thrown as Error).message;
      expect(message).toContain('JWT_SECRET');
      expect(message).not.toContain('short-secret');
    });

    it('rejects an invalid FRONTEND_URL without exposing its value', () => {
      const config = { ...sqliteBase, FRONTEND_URL: 'not-a-url' };

      let thrown: unknown;
      try {
        validateEnvironment(config);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      const message = (thrown as Error).message;
      expect(message).toContain('FRONTEND_URL');
      expect(message).not.toContain('not-a-url');
    });

    it('rejects a non-numeric PORT', () => {
      const config = { ...sqliteBase, PORT: 'not-a-port' };

      expect(() => validateEnvironment(config)).toThrow('PORT');
    });

    it('rejects a PORT outside the valid range', () => {
      const config = { ...sqliteBase, PORT: '99999' };

      expect(() => validateEnvironment(config)).toThrow('PORT');
    });

    it('never includes any secret values in the thrown error message', () => {
      const config = { ...d1Base };
      delete config.CLOUDFLARE_API_TOKEN;

      let thrown: unknown;
      try {
        validateEnvironment(config);
      } catch (error) {
        thrown = error;
      }

      const message = (thrown as Error).message;
      expect(message).toContain('CLOUDFLARE_API_TOKEN');
      expect(message).not.toContain('cf-token-secret-value');
      expect(message).not.toContain('a-sufficiently-long-jwt-secret-32ch');
    });

    it('rejects an invalid R2 endpoint without exposing its value', () => {
      const endpoint = 'http://secret-r2-endpoint.example';
      expect(() =>
        validateEnvironment({
          ...sqliteBase,
          STORAGE_DRIVER: 'r2',
          R2_ENDPOINT: endpoint,
          R2_BUCKET: 'bucket',
          R2_ACCESS_KEY_ID: 'access',
          R2_SECRET_ACCESS_KEY: 'secret',
        }),
      ).toThrow('R2_ENDPOINT');
      try {
        validateEnvironment({
          ...sqliteBase,
          STORAGE_DRIVER: 'r2',
          R2_ENDPOINT: endpoint,
          R2_BUCKET: 'bucket',
          R2_ACCESS_KEY_ID: 'access',
          R2_SECRET_ACCESS_KEY: 'secret',
        });
      } catch (error) {
        expect((error as Error).message).not.toContain(endpoint);
      }
    });
  });
});
