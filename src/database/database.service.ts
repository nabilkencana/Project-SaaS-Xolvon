import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { join } from 'node:path';

/**
 * SQLite-backed database layer (HANDBOOK_BACKEND.md §2).
 *
 * Runs on better-sqlite3 against `local.db` for local development and is
 * swappable with the D1 adapter behind the same DI token (DatabaseModule).
 * All statements use bind parameters (`?` placeholders) — never concatenate
 * user input into SQL strings.
 */
@Injectable()
export class DatabaseService {
  private readonly db: Database.Database;

  constructor(dbPath: string = join(process.cwd(), 'local.db')) {
    // better-sqlite3 creates the database file when it does not exist yet.
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
  }

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
    return this.db.prepare(sql).all(...params) as T[];
  }

  /**
   * Run a SELECT-style statement and return the first matching row,
   * or `undefined` when nothing matches.
   */
  async queryOne<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  /**
   * Run a mutation or DDL statement (INSERT/UPDATE/DELETE/CREATE, ...).
   */
  async execute(sql: string, params: unknown[] = []): Promise<void> {
    this.db.prepare(sql).run(...params);
  }

  /**
   * Close the underlying connection. Used by tests to release temp databases.
   */
  close(): void {
    this.db.close();
  }
}
