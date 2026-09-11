import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { D1Service } from './d1.service';
import { D1RestAdapter } from './d1-rest.adapter';

/**
 * Wires the active database driver behind the DatabaseService DI token.
 *
 * - DB_DRIVER=sqlite (default) → better-sqlite3 at local.db (HANDBOOK_BACKEND.md §2).
 * - DB_DRIVER=d1 → D1RestAdapter delegating to D1Service (Cloudflare D1 REST API),
 *   so the D1 hardening invariants (token resolved on demand, never stored as a
 *   service field — commit 0c83956) stay in d1.service.ts untouched.
 *
 * The DatabaseService class is used as the DI token/interface: domain modules
 * inject the token and never know which driver is active. The cast below is
 * the single sanctioned boundary where a non-DatabaseService implementation is
 * placed under the token (same pattern as the removed T1 compat bridge).
 */
@Module({
  providers: [
    {
      provide: DatabaseService,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DatabaseService => {
        const driver = (config.get<string>('DB_DRIVER') ?? 'sqlite').trim();

        if (driver === 'd1') {
          const d1 = new D1Service(config);
          // Lifecycle hooks do not run for instances constructed inside a
          // factory; invoke the credential fail-fast explicitly so a
          // misconfigured d1 bootstrap still dies here, not on first request.
          d1.onModuleInit();
          return new D1RestAdapter(d1) as unknown as DatabaseService;
        }

        if (driver !== 'sqlite') {
          throw new Error(
            `DatabaseModule: DB_DRIVER tidak dikenal "${driver}". Gunakan "sqlite" atau "d1".`,
          );
        }

        return new DatabaseService();
      },
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
