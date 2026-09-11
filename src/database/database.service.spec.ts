import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseService } from './database.service';
import { runMigrations } from './migrate';

const MIGRATIONS_DIR = join(process.cwd(), 'src', 'database', 'migrations');

const EXPECTED_SCHEMA_V2_TABLES = [
  'users',
  'sessions',
  'courses',
  'lessons',
  'course_tags',
  'course_resources',
  'orders',
  'order_items',
  'payment_proofs',
  'enrollments',
  'progress',
  'projects',
  'project_tags',
  'project_media',
  'project_members',
  'collective_members',
  'marketplace_items',
  'marketplace_media',
  'admin_audit_logs',
];

describe('DatabaseService (better-sqlite3)', () => {
  let tempDir: string;
  let dbPath: string;
  let service: DatabaseService;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'xolvon-database-service-'));
    dbPath = join(tempDir, 'local.db');
    service = new DatabaseService(dbPath);
  });

  afterEach(() => {
    service.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates the database file at the requested path when it does not exist', () => {
    expect(existsSync(dbPath)).toBe(true);
  });

  it('execute creates a table and inserts a row', async () => {
    await service.execute(
      'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
    );
    await service.execute('INSERT INTO users (name) VALUES (?)', ['farsya']);

    const rows = await service.queryAll<{ id: number; name: string }>(
      'SELECT id, name FROM users ORDER BY id',
    );

    expect(rows).toEqual([{ id: 1, name: 'farsya' }]);
  });

  it('queryOne returns the first row matching the query', async () => {
    await service.execute(
      'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
    );
    await service.execute('INSERT INTO users (name) VALUES (?)', ['farsya']);
    await service.execute('INSERT INTO users (name) VALUES (?)', ['nabil']);

    const row = await service.queryOne<{ id: number; name: string }>(
      'SELECT id, name FROM users WHERE name = ?',
      ['nabil'],
    );

    expect(row).toEqual({ id: 2, name: 'nabil' });
  });

  it('queryOne returns undefined when no row matches', async () => {
    await service.execute(
      'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
    );

    const row = await service.queryOne(
      'SELECT id FROM users WHERE name = ?',
      ['missing'],
    );

    expect(row).toBeUndefined();
  });

  it('queryAll returns an empty array when no rows match', async () => {
    await service.execute(
      'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
    );

    const rows = await service.queryAll(
      'SELECT id FROM users WHERE name = ?',
      ['missing'],
    );

    expect(rows).toEqual([]);
  });

  it('rejects when execute violates a foreign key constraint instead of succeeding silently', async () => {
    await service.execute('CREATE TABLE courses (id INTEGER PRIMARY KEY)');
    await service.execute(
      'CREATE TABLE enrollments (id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id))',
    );

    await expect(
      service.execute('INSERT INTO enrollments (course_id) VALUES (?)', [999]),
    ).rejects.toThrow(/FOREIGN KEY constraint failed/i);
  });
});

describe('migration runner', () => {
  let tempDir: string;
  let dbPath: string;
  let service: DatabaseService;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'xolvon-migration-runner-'));
    dbPath = join(tempDir, 'local.db');
    service = new DatabaseService(dbPath);
  });

  afterEach(() => {
    service.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  const countTables = async (): Promise<number> => {
    const row = await service.queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' " +
        "AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%' " +
        "AND name != '_migrations'",
    );
    return row?.n ?? 0;
  };

  it('creates the full schema v2 on a fresh database: 19 tables + 3 FTS5 virtual tables', async () => {
    const result = await runMigrations(service, MIGRATIONS_DIR);
    expect(result.applied).toHaveLength(8);

    const tables = await service.queryAll<{ name: string; sql: string | null }>(
      "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    const names = tables.map((table) => table.name);

    const virtualTables = tables
      .filter((table) => table.sql?.startsWith('CREATE VIRTUAL TABLE'))
      .map((table) => table.name)
      .sort();
    expect(virtualTables).toEqual([
      'course_fts',
      'marketplace_fts',
      'project_fts',
    ]);

    const userTables = names
      .filter((name) => name !== '_migrations' && !name.includes('_fts'))
      .sort();
    expect(userTables).toEqual([...EXPECTED_SCHEMA_V2_TABLES].sort());
    expect(await countTables()).toBe(19);
  });

  it('is idempotent: running the same migrations again is a no-op without duplicate-table errors', async () => {
    await runMigrations(service, MIGRATIONS_DIR);

    const second = await runMigrations(service, MIGRATIONS_DIR);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toHaveLength(8);

    expect(await countTables()).toBe(19);
  });

  it('keeps migrated data queryable through DatabaseService', async () => {
    await runMigrations(service, MIGRATIONS_DIR);

    const now = new Date().toISOString();
    await service.execute(
      'INSERT INTO users (id, name, email, password_hash, role, status, ' +
        'email_verified, phone_verified, created_at, updated_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['u-1', 'Nabil', 'nabil@example.com', 'hash', 'user', 'active', 0, 0, now, now],
    );

    const row = await service.queryOne<{ id: string; email: string; role: string }>(
      'SELECT id, email, role FROM users WHERE id = ?',
      ['u-1'],
    );
    expect(row).toEqual({ id: 'u-1', email: 'nabil@example.com', role: 'user' });
  });

  it('keeps course_fts in sync with courses via triggers on insert, update, and delete', async () => {
    await runMigrations(service, MIGRATIONS_DIR);

    const now = new Date().toISOString();
    await service.execute(
      'INSERT INTO courses (id, title, slug, price, status, created_at, updated_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['c-1', 'Kelas Next.js', 'kelas-nextjs', 150000, 'published', now, now],
    );

    const matches = async (term: string): Promise<number> => {
      const rows = await service.queryAll<{ rowid: number }>(
        'SELECT rowid FROM course_fts WHERE course_fts MATCH ?',
        [term],
      );
      return rows.length;
    };

    expect(await matches('next')).toBe(1);

    await service.execute('UPDATE courses SET title = ? WHERE id = ?', [
      'Kelas Nuxt.js',
      'c-1',
    ]);
    expect(await matches('next')).toBe(0);
    expect(await matches('nuxt')).toBe(1);

    await service.execute('DELETE FROM courses WHERE id = ?', ['c-1']);
    expect(await matches('nuxt')).toBe(0);
  });
});
