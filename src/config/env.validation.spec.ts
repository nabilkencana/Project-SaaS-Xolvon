import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  const validBase: Record<string, string> = {
    CLOUDFLARE_ACCOUNT_ID: 'acct_1234567890',
    CLOUDFLARE_D1_DATABASE_ID: 'db_1234567890',
    CLOUDFLARE_API_TOKEN: 'cf-token-secret-value',
    JWT_SECRET: 'a-sufficiently-long-jwt-secret-32ch',
    FRONTEND_URL: 'https://app.example.com',
    PORT: '3000',
  };

  it('accepts a complete valid configuration and coerces PORT to a number', () => {
    const result = validateEnvironment({ ...validBase });

    expect(result.PORT).toBe(3000);
    expect(typeof result.PORT).toBe('number');
    expect(result.CLOUDFLARE_API_TOKEN).toBe(validBase.CLOUDFLARE_API_TOKEN);
    expect(result.JWT_SECRET).toBe(validBase.JWT_SECRET);
    expect(result.FRONTEND_URL).toBe(validBase.FRONTEND_URL);
  });

  it.each([
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_D1_DATABASE_ID',
    'CLOUDFLARE_API_TOKEN',
    'JWT_SECRET',
    'FRONTEND_URL',
  ])('rejects configuration missing %s', (key) => {
    const config = { ...validBase };
    delete config[key];

    expect(() => validateEnvironment(config)).toThrow(key);
  });

  it.each([
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_D1_DATABASE_ID',
    'CLOUDFLARE_API_TOKEN',
    'JWT_SECRET',
    'FRONTEND_URL',
  ])('rejects a blank %s', (key) => {
    const config = { ...validBase, [key]: '   ' };

    expect(() => validateEnvironment(config)).toThrow(key);
  });

  it('rejects a JWT secret shorter than 32 characters without exposing its value', () => {
    const config = { ...validBase, JWT_SECRET: 'short-secret' };

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
    const config = { ...validBase, FRONTEND_URL: 'not-a-url' };

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
    const config = { ...validBase, PORT: 'not-a-port' };

    expect(() => validateEnvironment(config)).toThrow('PORT');
  });

  it('rejects a PORT outside the valid range', () => {
    const config = { ...validBase, PORT: '99999' };

    expect(() => validateEnvironment(config)).toThrow('PORT');
  });

  it('never includes any secret values in the thrown error message', () => {
    const config = { ...validBase };
    delete config.CLOUDFLARE_API_TOKEN;

    let thrown: unknown;
    try {
      validateEnvironment(config);
    } catch (error) {
      thrown = error;
    }

    const message = (thrown as Error).message;
    expect(message).not.toContain('cf-token-secret-value');
    expect(message).not.toContain('a-sufficiently-long-jwt-secret-32ch');
  });
});
