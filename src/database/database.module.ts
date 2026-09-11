import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { D1Service } from './d1.service';
import type { D1QueryResult } from './d1.types';

/** Shown when DB_DRIVER=d1 until the D1 REST adapter is wired behind this module (todo T3). */
const D1_NOT_WIRED_ERROR =
  'DatabaseModule: adapter D1 REST belum di-wire (todo T3). ' +
  'Gunakan DB_DRIVER=sqlite (default) untuk development lokal.';

/**
 * Wires the active database driver behind the DatabaseService DI token.
 *
 * - DB_DRIVER=sqlite (default) → better-sqlite3 at local.db (HANDBOOK_BACKEND.md §2).
 * - DB_DRIVER=d1 → fails fast at bootstrap until the D1 REST adapter lands (todo T3).
 *
 * Temporary compat bridge: auth/orders/enrollments still inject D1Service
 * directly until the data-layer unification in T3. Until then D1Service is
 * provided here as a thin adapter over the same DatabaseService instance so
 * the app runs on sqlite without Cloudflare credentials. This provider is
 * removed when T3 rewires those modules to the DatabaseService token.
 */
@Module({
  providers: [
    {
      provide: DatabaseService,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DatabaseService => {
        const driver = (config.get<string>('DB_DRIVER') ?? 'sqlite').trim();

        if (driver === 'd1') {
          throw new Error(D1_NOT_WIRED_ERROR);
        }

        if (driver !== 'sqlite') {
          throw new Error(
            `DatabaseModule: DB_DRIVER tidak dikenal "${driver}". Gunakan "sqlite" atau "d1".`,
          );
        }

        return new DatabaseService();
      },
    },
    {
      provide: D1Service,
      inject: [DatabaseService],
      useFactory: (db: DatabaseService): D1Service => {
        const adapter = {
          query: async <T = Record<string, unknown>>(
            sql: string,
            params: unknown[] = [],
          ): Promise<D1QueryResult<T>> => {
            const results = await db.queryAll<T>(sql, params);

            return {
              results,
              meta: {
                changes: 0,
                duration: 0,
                last_row_id: null,
                changed_db: false,
                size_after: 0,
                rows_read: results.length,
                rows_written: 0,
              },
            };
          },
        };

        return adapter as unknown as D1Service;
      },
    },
  ],
  exports: [DatabaseService, D1Service],
})
export class DatabaseModule {}
