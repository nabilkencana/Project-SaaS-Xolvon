import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseService } from './database.service';

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
