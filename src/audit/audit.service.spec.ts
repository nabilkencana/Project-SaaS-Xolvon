import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { DatabaseService } from '../database/database.service';
import { runMigrations } from '../database/migrate';
import { AuditService } from './audit.service';
import { AuditModule } from './audit.module';

const MIGRATIONS_DIR = join(process.cwd(), 'src', 'database', 'migrations');

const insertUser = async (db: DatabaseService, id: string): Promise<void> => {
  const now = new Date().toISOString();
  await db.execute(
    'INSERT INTO users (id, name, email, password_hash, role, status, ' +
      'email_verified, phone_verified, created_at, updated_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, 'Admin', 'admin@example.com', 'hash', 'admin', 'active', 1, 0, now, now],
  );
};

describe('AuditService', () => {
  let tempDir: string;
  let db: DatabaseService;
  let service: AuditService;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'xolvon-audit-'));
    db = new DatabaseService(join(tempDir, 'local.db'));
    await runMigrations(db, MIGRATIONS_DIR);
    service = new AuditService(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('record writes exactly one admin_audit_logs row and resolves to void', async () => {
    await insertUser(db, 'u-admin');

    await expect(
      service.record('u-admin', 'verify', 'order', 'o-1', { proofId: 'p-1' }),
    ).resolves.toBeUndefined();

    const rows = await db.queryAll<Record<string, unknown>>(
      'SELECT * FROM admin_audit_logs',
    );
    expect(rows).toHaveLength(1);

    const row = rows[0] as Record<string, string>;
    expect(typeof row.id).toBe('string');
    expect(row.id.length).toBeGreaterThan(0);
    expect(row.actor_user_id).toBe('u-admin');
    expect(row.action).toBe('verify');
    expect(row.entity_type).toBe('order');
    expect(row.entity_id).toBe('o-1');
    // HANDBOOK_BACKEND.md §7: timestamps use ISO 8601.
    expect(row.created_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('serializes metadata to JSON inside the TEXT column', async () => {
    await insertUser(db, 'u-admin');

    await service.record('u-admin', 'activate', 'enrollment', 'e-1', {
      orderId: 'o-1',
      previousStatus: 'pending',
      nextStatus: 'active',
    });

    const row = await db.queryOne<{ metadata: string }>(
      'SELECT metadata FROM admin_audit_logs WHERE entity_id = ?',
      ['e-1'],
    );
    expect(row?.metadata).toBe(
      JSON.stringify({
        orderId: 'o-1',
        previousStatus: 'pending',
        nextStatus: 'active',
      }),
    );
  });

  it('stores metadata as NULL when omitted', async () => {
    await insertUser(db, 'u-admin');

    await service.record('u-admin', 'publish', 'course', 'c-1');

    const row = await db.queryOne<{ metadata: string | null }>(
      'SELECT metadata FROM admin_audit_logs WHERE entity_id = ?',
      ['c-1'],
    );
    expect(row?.metadata).toBeNull();
  });

  it('has no public endpoint: the module registers no controllers and the service exposes no read or mutation methods', () => {
    const controllers =
      (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AuditModule) as
        | unknown[]
        | undefined) ?? [];
    expect(controllers).toEqual([]);

    const methodNames = Object.getOwnPropertyNames(AuditService.prototype);
    expect(methodNames).toContain('record');
    for (const forbidden of [
      'list',
      'find',
      'read',
      'update',
      'edit',
      'delete',
      'remove',
    ]) {
      expect(methodNames).not.toContain(forbidden);
    }
  });

  it('allows a system action with an empty actor and stores NULL actor_user_id', async () => {
    await expect(
      service.record('', 'unpublish', 'course', 'c-1'),
    ).resolves.toBeUndefined();

    const row = await db.queryOne<{ actor_user_id: string | null }>(
      'SELECT actor_user_id FROM admin_audit_logs',
    );
    expect(row?.actor_user_id).toBeNull();
  });

  it('allows a system action with a missing actor argument and stores NULL actor_user_id', async () => {
    // System callers (cron/seed/bootstrap) may omit the actor entirely.
    await expect(
      service.record(
        undefined as unknown as string,
        'role_change',
        'user',
        'u-1',
      ),
    ).resolves.toBeUndefined();

    const row = await db.queryOne<{ actor_user_id: string | null }>(
      'SELECT actor_user_id FROM admin_audit_logs',
    );
    expect(row?.actor_user_id).toBeNull();
  });
});
