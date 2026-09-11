import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';

/**
 * Controlled set of audit actions (SCHEMA.md §65) kept as a plain string
 * constant — not a TS enum — so the list stays open for future operational
 * actions without breaking call sites.
 */
export const AUDIT_ACTIONS = [
  'verify',
  'activate',
  'revoke',
  'publish',
  'unpublish',
  'cancel',
  'create',
  'update',
  'delete',
  'role_change',
] as const;

/** The `action` parameter is a controlled string: callers must use AUDIT_ACTIONS values. */
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Immutable audit trail on `admin_audit_logs` (SCHEMA.md §64-66, HANDBOOK_BACKEND.md §7).
 *
 * Write-only by design: there is no read, update, or delete method and the
 * module registers no controller, so audit rows can never reach a public,
 * user, or admin HTTP response (SCHEMA.md §66, §116). The table is created
 * by migration 0006_audit.sql.
 */
@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Append one immutable audit row. Fire-and-forget for consumers: resolves
   * to void once the row is durably written.
   *
   * @param actorUserId - UUID of the acting user, or empty/omitted for
   *   system actions (stored as NULL so the FK to users stays valid).
   * @param action      - Controlled action string from AUDIT_ACTIONS.
   * @param entityType  - Logical entity kind (e.g. 'order', 'course').
   * @param entityId    - UUID of the affected entity.
   * @param metadata    - Internal operational context (SCHEMA.md §116);
   *   serialized to JSON and never returned by any API.
   */
  async record(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.execute(
      'INSERT INTO admin_audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata, created_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        randomUUID(),
        actorUserId ? actorUserId : null,
        action,
        entityType,
        entityId,
        metadata ? JSON.stringify(metadata) : null,
        new Date().toISOString(),
      ],
    );
  }
}
