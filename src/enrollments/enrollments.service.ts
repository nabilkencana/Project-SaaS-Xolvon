import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import type { EnrollmentRow } from './interfaces/enrollment.interface';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { toEnrollmentResponse } from './mappers/enrollment.mapper';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Reusable entitlement check to verify if a user has an active, unexpired enrollment for a course.
   * Designed to be called across modules (e.g. MediaModule in the next phase before generating signed URLs).
   *
   * @param userId   - UUID of the user
   * @param courseId - UUID of the course
   * @returns true if an active, unexpired enrollment row exists; false otherwise
   */
  async isUserEntitled(userId: string, courseId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const query = `
      SELECT id FROM enrollments
      WHERE user_id = ?
        AND course_id = ?
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > ?)
      LIMIT 1;
    `;

    const row = await this.db.queryOne<{ id: string }>(query, [
      userId,
      courseId,
      now,
    ]);

    return row !== undefined;
  }

  /**
   * Retrieves all enrollments belonging to the authenticated user.
   * Prevents IDOR by strictly binding the query to the authenticated userId.
   * Never exposes internal administrative metadata or other users' data.
   */
  async getUserEnrollments(userId: string): Promise<EnrollmentResponseDto[]> {
    const query = `
      SELECT 
        e.id,
        e.user_id,
        e.course_id,
        e.order_id,
        e.status,
        e.granted_at,
        e.granted_by,
        e.revoked_at,
        e.expires_at,
        e.created_at,
        c.title AS course_title,
        c.slug AS course_slug
      FROM enrollments e
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.created_at DESC;
    `;

    const rows = await this.db.queryAll<EnrollmentRow>(query, [userId]);
    return rows.map(toEnrollmentResponse);
  }

  /**
   * Admin-only: Revokes an active enrollment by ID and records the revocation timestamp.
   * Preserves operational history without deleting rows (audit trail).
   */
  async revokeEnrollment(
    _adminId: string,
    enrollmentId: string,
  ): Promise<EnrollmentResponseDto> {
    const current = await this.db.queryOne<EnrollmentRow>(
      'SELECT * FROM enrollments WHERE id = ? LIMIT 1;',
      [enrollmentId],
    );

    if (!current) {
      throw new NotFoundException('Enrollment not found.');
    }

    const now = new Date().toISOString();

    await this.db.execute(
      `UPDATE enrollments SET status = 'revoked', revoked_at = ? WHERE id = ?;`,
      [now, enrollmentId],
    );

    return toEnrollmentResponse({
      ...current,
      status: 'revoked',
      revoked_at: now,
    });
  }

  /**
   * Activates enrollments for all courses in an order.
   * Enforces UNIQUE(user_id, course_id) via SQLite UPSERT:
   * INSERT ... ON CONFLICT(user_id, course_id) DO UPDATE ... WHERE enrollments.status != 'active'
   *
   * Idempotent: Calling activate multiple times does not produce duplicates or errors,
   * performing a no-op if the enrollment is already active.
   */
  async activateOrderEnrollments(
    orderId: string,
    userId: string,
    courseIds: string[],
    adminId: string,
  ): Promise<number> {
    const now = new Date().toISOString();
    let activatedCount = 0;

    for (const courseId of courseIds) {
      const enrollmentId = crypto.randomUUID();

      const upsertSql = `
        INSERT INTO enrollments (
          id, user_id, course_id, order_id, status, granted_at, granted_by, created_at
        ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
        ON CONFLICT(user_id, course_id) DO UPDATE SET
          status = 'active',
          order_id = excluded.order_id,
          granted_at = excluded.granted_at,
          granted_by = excluded.granted_by,
          revoked_at = NULL
        WHERE enrollments.status != 'active';
      `;

      await this.db.execute(upsertSql, [
        enrollmentId,
        userId,
        courseId,
        orderId,
        now,
        adminId,
        now,
      ]);

      activatedCount++;
    }

    return activatedCount;
  }
}
