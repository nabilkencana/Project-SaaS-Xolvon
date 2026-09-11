import { Injectable } from '@nestjs/common';
import { D1Service } from './d1.service';

/**
 * D1 REST adapter behind the DatabaseService contract (queryAll/queryOne/execute).
 *
 * Active only when DB_DRIVER=d1 (wired in DatabaseModule). It delegates every
 * statement to D1Service.query() and maps the D1QueryResult envelope onto the
 * same shapes DatabaseService (better-sqlite3) returns, so consumers stay
 * driver-agnostic.
 *
 * Hardening invariant preserved by delegation: the Cloudflare API token is
 * resolved on demand inside D1Service.query() and is never held in
 * serializable service state (commit 0c83956).
 */
@Injectable()
export class D1RestAdapter {
  constructor(private readonly d1: D1Service) {}

  /**
   * Run a SELECT-style statement and return every matching row.
   *
   * @param sql    - SQL string with `?` placeholders for bind parameters.
   * @param params - Values bound to the `?` placeholders (prevents SQL injection).
   */
  async queryAll<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.d1.query<T>(sql, params);
    return result.results;
  }

  /**
   * Run a SELECT-style statement and return the first matching row,
   * or `undefined` when nothing matches.
   */
  async queryOne<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | undefined> {
    const result = await this.d1.query<T>(sql, params);
    return result.results[0];
  }

  /**
   * Run a mutation or DDL statement (INSERT/UPDATE/DELETE/CREATE, ...).
   */
  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.d1.query(sql, params);
  }
}
