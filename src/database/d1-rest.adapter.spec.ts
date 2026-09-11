import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { D1RestAdapter } from './d1-rest.adapter';
import { D1Service } from './d1.service';
import { DatabaseModule } from './database.module';
import { DatabaseService } from './database.service';
import type { D1QueryResult } from './d1.types';

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

/** Default valid Cloudflare env vars so the d1 path can fail fast positively. */
const VALID_D1_ENV = {
  DB_DRIVER: 'd1',
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  CLOUDFLARE_D1_DATABASE_ID: 'test-database-id',
  CLOUDFLARE_API_TOKEN: 'test-api-token',
};

/** Wraps rows in the Cloudflare D1 REST API response envelope. */
function cloudflareOkResponse<T>(results: T[]) {
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
        },
      },
    ],
    errors: [],
    messages: [],
  };
}

/** Builds a D1Service double whose `query` resolves with the given result. */
function mockD1Service(result: D1QueryResult<unknown>): D1Service {
  return {
    query: jest.fn().mockResolvedValue(result),
  } as unknown as D1Service;
}

// ---------------------------------------------------------------------------
// Delegation tests
// ---------------------------------------------------------------------------

describe('D1RestAdapter', () => {
  it('queryAll maps D1QueryResult.results to the row array', async () => {
    const rows = [{ id: 'u-1' }, { id: 'u-2' }];
    const d1 = mockD1Service({ results: rows, meta: {} as never });
    const adapter = new D1RestAdapter(d1);

    await expect(adapter.queryAll('SELECT * FROM users;')).resolves.toEqual(
      rows,
    );
    expect(d1.query).toHaveBeenCalledWith('SELECT * FROM users;', []);
  });

  it('queryOne returns the first row, or undefined when empty', async () => {
    const d1 = mockD1Service({ results: [{ id: 'u-1' }], meta: {} as never });
    const adapter = new D1RestAdapter(d1);

    await expect(
      adapter.queryOne('SELECT * FROM users WHERE id = ?;', ['u-1']),
    ).resolves.toEqual({ id: 'u-1' });
    expect(d1.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = ?;',
      ['u-1'],
    );

    const emptyD1 = mockD1Service({ results: [], meta: {} as never });
    const emptyAdapter = new D1RestAdapter(emptyD1);
    await expect(emptyAdapter.queryOne('SELECT 1;')).resolves.toBeUndefined();
  });

  it('execute delegates to D1Service.query and resolves without exposing results', async () => {
    const d1 = mockD1Service({ results: [], meta: {} as never });
    const adapter = new D1RestAdapter(d1);

    await expect(
      adapter.execute('INSERT INTO users (id) VALUES (?);', ['u-1']),
    ).resolves.toBeUndefined();
    expect(d1.query).toHaveBeenCalledWith(
      'INSERT INTO users (id) VALUES (?);',
      ['u-1'],
    );
  });
});

// ---------------------------------------------------------------------------
// DatabaseModule wiring tests (DB_DRIVER switch behind the DatabaseService token)
// ---------------------------------------------------------------------------

describe('DatabaseModule driver wiring', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function compileWithEnv(env: Record<string, string>) {
    const moduleRef = await Test.createTestingModule({
      // ConfigService is global only inside AppModule; forRoot registers it
      // here so the override below can replace it for this standalone module.
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
        DatabaseModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService(env))
      .compile();
    return moduleRef;
  }

  it('resolves the DatabaseService token to the D1 REST adapter when DB_DRIVER=d1, with queryAll mapping the REST envelope', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(cloudflareOkResponse([{ id: 'u-1' }])), {
          status: 200,
        }),
      );

    const moduleRef = await compileWithEnv(VALID_D1_ENV);
    try {
      const db = moduleRef.get(DatabaseService);
      expect(db).toBeInstanceOf(D1RestAdapter);

      const rows = await db.queryAll('SELECT * FROM users;');
      expect(rows).toEqual([{ id: 'u-1' }]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      await moduleRef.close();
    }
  });

  it('resolves the DatabaseService token to the sqlite DatabaseService when DB_DRIVER=sqlite', async () => {
    const moduleRef = await compileWithEnv({ DB_DRIVER: 'sqlite' });
    try {
      const db = moduleRef.get(DatabaseService);
      expect(db).toBeInstanceOf(DatabaseService);
      (db as DatabaseService).close();
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects an unknown DB_DRIVER with a clear error', async () => {
    await expect(compileWithEnv({ DB_DRIVER: 'mongo' })).rejects.toThrow(
      'DB_DRIVER tidak dikenal',
    );
  });

  it('fails fast when DB_DRIVER=d1 but Cloudflare credentials are missing', async () => {
    await expect(
      compileWithEnv({
        DB_DRIVER: 'd1',
        CLOUDFLARE_ACCOUNT_ID: '',
        CLOUDFLARE_D1_DATABASE_ID: '',
        CLOUDFLARE_API_TOKEN: '',
      }),
    ).rejects.toThrow('missing required environment variable');
  });
});
