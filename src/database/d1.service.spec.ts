import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { D1Service } from './d1.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a mock ConfigService that returns the given env map. */
function mockConfigService(
  env: Record<string, string> = {},
): Partial<ConfigService> {
  return {
    get: jest.fn((key: string) => env[key]),
  };
}

/** Default valid env vars so the service can construct without errors. */
const VALID_ENV = {
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  CLOUDFLARE_D1_DATABASE_ID: 'test-database-id',
  CLOUDFLARE_API_TOKEN: 'test-api-token',
};

/** Convenience: build a D1Service with optional env overrides. */
function createService(envOverrides: Record<string, string> = {}): D1Service {
  const env = { ...VALID_ENV, ...envOverrides };
  return new D1Service(mockConfigService(env) as unknown as ConfigService);
}

/** Wraps a value in the Cloudflare D1 API response envelope. */
function cloudflareOkResponse<T>(results: T[], meta?: Record<string, unknown>) {
  return {
    success: true,
    result: [
      {
        results,
        success: true,
        meta: {
          changes: 0,
          duration: 0.123,
          last_row_id: null,
          changed_db: false,
          size_after: 8192,
          rows_read: results.length,
          rows_written: 0,
          ...meta,
        },
      },
    ],
    errors: [],
    messages: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('D1Service', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    // Restore real fetch after each test
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Test 1: Successful query
  // -----------------------------------------------------------------------
  it('should return parsed results on a successful query', async () => {
    interface User {
      id: string;
      name: string;
    }

    const mockRows: User[] = [{ id: 'u1', name: 'Farsya' }];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => cloudflareOkResponse(mockRows),
    } as unknown as Response);

    const service = createService();
    service.onModuleInit();

    const result = await service.query<User>(
      'SELECT * FROM users WHERE id = ?',
      ['u1'],
    );

    expect(result.results).toEqual(mockRows);
    expect(result.meta.duration).toBe(0.123);
    expect(result.meta.rows_read).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Test 2: Cloudflare API error (success: false)
  // -----------------------------------------------------------------------
  it('should throw a generic HttpException on Cloudflare API error', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        result: [],
        errors: [{ code: 7500, message: 'some internal D1 error' }],
        messages: [],
      }),
    } as unknown as Response);

    const service = createService();
    service.onModuleInit();

    await expect(
      service.query('SELECT * FROM nonexistent'),
    ).rejects.toThrow(HttpException);

    await expect(
      service.query('SELECT * FROM nonexistent'),
    ).rejects.toMatchObject({
      response: 'A database error occurred. Please try again later.',
      status: HttpStatus.BAD_GATEWAY,
    });
  });

  // -----------------------------------------------------------------------
  // Test 3: Network / fetch error
  // -----------------------------------------------------------------------
  it('should throw a generic HttpException on network error', async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('fetch failed'));

    const service = createService();
    service.onModuleInit();

    await expect(
      service.query('SELECT 1'),
    ).rejects.toThrow(HttpException);

    await expect(
      service.query('SELECT 1'),
    ).rejects.toMatchObject({
      response: 'Unable to reach the database. Please try again later.',
      status: HttpStatus.BAD_GATEWAY,
    });
  });

  // -----------------------------------------------------------------------
  // Test 4: Params are sent as bind parameters, not interpolated into SQL
  // -----------------------------------------------------------------------
  it('should send params as bind parameters in the request body', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => cloudflareOkResponse([]),
    } as unknown as Response);

    const service = createService();
    service.onModuleInit();

    await service.query('SELECT * FROM users WHERE email = ? AND role = ?', [
      'farsya@xolvon.com',
      'admin',
    ]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];

    // Verify the URL targets the correct endpoint
    expect(url).toContain('/d1/database/test-database-id/query');

    // Verify the body contains sql + params separately (not interpolated)
    const body = JSON.parse(init.body as string) as {
      sql: string;
      params: unknown[];
    };
    expect(body.sql).toBe(
      'SELECT * FROM users WHERE email = ? AND role = ?',
    );
    expect(body.params).toEqual(['farsya@xolvon.com', 'admin']);

    // The SQL string must NOT contain the actual parameter values
    expect(body.sql).not.toContain('farsya@xolvon.com');
    expect(body.sql).not.toContain('admin');
  });

  // -----------------------------------------------------------------------
  // Test 5: Timeout — fetch throws TimeoutError
  // -----------------------------------------------------------------------
  it('should throw a timeout HttpException when fetch exceeds the timeout', async () => {
    let capturedSignal: AbortSignal | undefined;

    globalThis.fetch = jest.fn().mockImplementation(
      (_url: string, init?: RequestInit) => {
        capturedSignal = init?.signal as AbortSignal | undefined;
        return Promise.reject(
          new DOMException('The operation was aborted', 'TimeoutError'),
        );
      },
    );

    const service = createService();
    service.onModuleInit();

    await expect(
      service.query('SELECT * FROM slow_table'),
    ).rejects.toThrow(HttpException);

    await expect(
      service.query('SELECT * FROM slow_table'),
    ).rejects.toMatchObject({
      response: 'Database request timed out. Please try again later.',
      status: HttpStatus.GATEWAY_TIMEOUT,
    });

    // Verify an AbortSignal was passed to fetch
    expect(capturedSignal).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Test 6: Startup validation — missing env vars
  // -----------------------------------------------------------------------
  describe('onModuleInit validation', () => {
    it('should throw if CLOUDFLARE_ACCOUNT_ID is missing', () => {
      const service = createService({ CLOUDFLARE_ACCOUNT_ID: '' });

      expect(() => service.onModuleInit()).toThrow(
        /CLOUDFLARE_ACCOUNT_ID/,
      );
    });    it('should throw if CLOUDFLARE_D1_DATABASE_ID is missing', () => {
      const service = createService({ CLOUDFLARE_D1_DATABASE_ID: '' });

      expect(() => service.onModuleInit()).toThrow(
        /CLOUDFLARE_D1_DATABASE_ID/,
      );
    });

    it('should throw if CLOUDFLARE_API_TOKEN is missing', () => {
      const service = createService({ CLOUDFLARE_API_TOKEN: '' });

      expect(() => service.onModuleInit()).toThrow(
        /CLOUDFLARE_API_TOKEN/,
      );
    });

    it('should throw listing all missing vars when multiple are empty', () => {
      const service = createService({
        CLOUDFLARE_ACCOUNT_ID: '',
        CLOUDFLARE_API_TOKEN: '',
      });

      expect(() => service.onModuleInit()).toThrow(
        /CLOUDFLARE_ACCOUNT_ID.*CLOUDFLARE_API_TOKEN/,
      );
    });

    it('should not throw when all env vars are present', () => {
      const service = createService();

      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Secret-handling boundary: token must not be retained as service state
  // -----------------------------------------------------------------------
  describe('secret handling boundary', () => {
    it('sends the configured bearer token in the Authorization header', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => cloudflareOkResponse([]),
      } as unknown as Response);

      const service = createService();
      service.onModuleInit();

      await service.query('SELECT 1');

      const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
        string,
        RequestInit,
      ];
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-api-token');
    });

    it('does not retain the raw token in own enumerable service state', () => {
      const service = createService();
      const serialized = JSON.stringify(service);
      expect(serialized).not.toContain('test-api-token');
    });

    it('does not expose the token through logger arguments or error paths', async () => {
      const service = createService();
      const logSpy = jest.spyOn((service as any).logger, 'error');

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          result: [],
          errors: [{ code: 7500, message: 'boom' }],
          messages: [],
        }),
      } as unknown as Response);

      await service.query('SELECT 1').catch(() => undefined);

      for (const call of logSpy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('test-api-token');
      }
    });
  });
});
