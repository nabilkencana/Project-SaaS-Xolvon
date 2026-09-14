import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseService } from './database.service';

const DEFAULT_MIGRATIONS_DIR = join(process.cwd(), 'src', 'database', 'migrations');

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Split a multi-statement SQL script into single statements that
 * `DatabaseService.execute()` (better-sqlite3 `prepare`) can run one by one.
 *
 * Handles `'...'` string literals, `--` line comments, and trigger bodies
 * (`BEGIN ... END;`), whose inner `;` must not terminate the CREATE TRIGGER
 * statement.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let inTrigger = false;
  let beginDepth = 0;
  let prevKeyword = '';
  let i = 0;

  const isWordChar = (char: string): boolean => /[A-Za-z_]/.test(char);

  while (i < sql.length) {
    const char = sql[i];

    if (inString) {
      current += char;
      if (char === "'") inString = false;
      i += 1;
      continue;
    }

    if (char === "'") {
      inString = true;
      current += char;
      i += 1;
      continue;
    }

    if (char === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }

    if (char === ';') {
      if (inTrigger && beginDepth > 0) {
        current += char;
      } else {
        const statement = current.trim();
        if (statement.length > 0) statements.push(statement);
        current = '';
        inTrigger = false;
        beginDepth = 0;
        prevKeyword = '';
      }
      i += 1;
      continue;
    }

    if (isWordChar(char)) {
      let word = '';
      while (i < sql.length && isWordChar(sql[i])) {
        word += sql[i];
        i += 1;
      }
      const upper = word.toUpperCase();
      if (upper === 'TRIGGER' && prevKeyword === 'CREATE') {
        inTrigger = true;
      } else if (inTrigger && upper === 'BEGIN') {
        beginDepth += 1;
      } else if (inTrigger && upper === 'END') {
        beginDepth -= 1;
      }
      prevKeyword = upper;
      current += word;
      continue;
    }

    current += char;
    i += 1;
  }

  const remainder = current.trim();
  if (remainder.length > 0) statements.push(remainder);

  return statements;
}

/**
 * Apply pending `*.sql` migrations (filename order) to the database behind
 * `DatabaseService`, tracking them in a `_migrations` table:
 * `(id INTEGER PK, filename TEXT UNIQUE, hash TEXT, applied_at TEXT)`.
 *
 * Idempotent: migrations already recorded with a matching SHA-256 hash are
 * skipped (safe to re-run; SQLite file locking serializes concurrent runs).
 * A recorded filename whose hash no longer matches the file is treated as
 * drift and throws — edits belong in a new migration file, never in an
 * applied one.
 */
export async function runMigrations(
  db: DatabaseService,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<MigrationResult> {
  const files = readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  await db.execute(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    filename TEXT UNIQUE,
    hash TEXT,
    applied_at TEXT
  )`);

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const filename of files) {
    const content = readFileSync(join(migrationsDir, filename), 'utf8');
    const hash = createHash('sha256').update(content).digest('hex');

    const existing = await db.queryOne<{ hash: string }>(
      'SELECT hash FROM _migrations WHERE filename = ?',
      [filename],
    );

    if (existing) {
      if (existing.hash !== hash) {
        throw new Error(
          `Migration ${filename} changed after it was applied (hash mismatch). ` +
            'Create a new migration file instead of editing an applied one.',
        );
      }
      console.log(`${filename}: already applied, skipped`);
      skipped.push(filename);
      continue;
    }

    for (const statement of splitSqlStatements(content)) {
      try {
        await db.execute(statement);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('duplicate column name')) {
          console.log(`[migrate] Column already exists, skipping: ${statement.slice(0, 60)}...`);
          continue;
        }
        throw err;
      }
    }

    await db.execute(
      'INSERT INTO _migrations (filename, hash, applied_at) VALUES (?, ?, ?)',
      [filename, hash, new Date().toISOString()],
    );
    console.log(`${filename}: applied`);
    applied.push(filename);
  }

  return { applied, skipped };
}

const invokedAsScript = (): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  return /migrate\.(cjs|js|ts)$/.test(entry.replace(/\\/g, '/'));
};

if (invokedAsScript()) {
  const db = new DatabaseService();
  void runMigrations(db)
    .then((result) => {
      console.log(
        `Migrations done — applied: ${result.applied.length}, skipped: ${result.skipped.length}`,
      );
    })
    .catch((error: unknown) => {
      console.error('Migration failed:', error);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}
