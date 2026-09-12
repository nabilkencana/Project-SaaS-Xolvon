import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { CourseExistsRow, LessonRow } from './interfaces/lesson.interface';
import type { CreateLessonDto } from './dto/create-lesson.dto';
import type { UpdateLessonDto } from './dto/update-lesson.dto';
import type { ReorderLessonDto } from './dto/reorder-lesson.dto';
import { LessonAdminDto, LessonSummaryDto } from './dto/lesson-response.dto';
import {
  toLessonAdminDto,
  toLessonSummaryDto,
  type LessonPublicRow,
} from './mappers/lesson.mapper';

/**
 * Lessons service (SCHEMA.md §18-23, plan T6). Admin CRUD lives here; the
 * public surface is strictly published-only and exposes LessonSummary fields
 * (id/title/orderIndex/status) — content and video_object_key stay
 * server-only until the signed URL flow (plan T14).
 */
@Injectable()
export class LessonsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Public: published lessons of a published course, ordered by
   * `order_index ASC` (SCHEMA.md §167 — never by title). The lesson query
   * selects safe columns explicitly so content/video_object_key cannot leak
   * even by accident (SCHEMA.md §21).
   */
  async listPublishedByCourseSlug(slug: string): Promise<LessonSummaryDto[]> {
    const course = await this.db.queryOne<CourseExistsRow>(
      `SELECT id, status FROM courses WHERE slug = ? LIMIT 1;`,
      [slug],
    );

    // Published-only guard in code: a draft course 404s exactly like a
    // missing one, so draft content is indistinguishable from nonexistent.
    if (!course || course.status !== 'published') {
      throw new NotFoundException('Course tidak ditemukan.');
    }

    const rows = await this.db.queryAll<LessonPublicRow>(
      `SELECT id, title, order_index, status FROM lessons ` +
        `WHERE course_id = ? AND status = 'published' ` +
        `ORDER BY order_index ASC, id ASC;`,
      [course.id],
    );

    return rows.map(toLessonSummaryDto);
  }

  /**
   * Admin: create a lesson in `draft` status under an existing course
   * (404 when the course is missing — lesson is always bound to a valid
   * course_id). Audits action `create`.
   */
  async create(
    adminId: string,
    courseId: string,
    dto: CreateLessonDto,
  ): Promise<LessonAdminDto> {
    const course = await this.db.queryOne<CourseExistsRow>(
      `SELECT id, status FROM courses WHERE id = ? LIMIT 1;`,
      [courseId],
    );
    if (!course) {
      throw new NotFoundException('Course tidak ditemukan.');
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const content = dto.content ?? null;

    await this.db.execute(
      `INSERT INTO lessons ` +
        `(id, course_id, title, content, video_object_key, order_index, status, created_at) ` +
        `VALUES (?, ?, ?, ?, ?, ?, 'draft', ?);`,
      [id, courseId, dto.title, content, null, dto.orderIndex, now],
    );

    await this.audit.record(adminId, 'create', 'lesson', id, { courseId });

    return toLessonAdminDto({
      id,
      course_id: courseId,
      title: dto.title,
      content,
      video_object_key: null,
      order_index: dto.orderIndex,
      status: 'draft',
      created_at: now,
    });
  }

  /**
   * Admin: partial update of title/content/order_index. Status transitions
   * go through publish/unpublish only. Audits action `update` only when
   * something actually changed.
   */
  async update(
    adminId: string,
    id: string,
    dto: UpdateLessonDto,
  ): Promise<LessonAdminDto> {
    const row = await this.getLessonOrThrow(id);

    const changed: Partial<LessonRow> = {};
    if (dto.title !== undefined) changed.title = dto.title;
    if (dto.content !== undefined) changed.content = dto.content;
    if (dto.orderIndex !== undefined) changed.order_index = dto.orderIndex;

    const changedKeys = Object.keys(changed) as (keyof LessonRow)[];
    if (changedKeys.length === 0) {
      return toLessonAdminDto(row);
    }

    const sets = changedKeys.map((key) => `${key} = ?`);
    const params: unknown[] = changedKeys.map((key) => changed[key]);
    params.push(id);

    await this.db.execute(
      `UPDATE lessons SET ${sets.join(', ')} WHERE id = ?;`,
      params,
    );

    await this.audit.record(adminId, 'update', 'lesson', id, {
      fields: changedKeys,
    });

    return toLessonAdminDto({ ...row, ...changed });
  }

  /** Admin: write a new order_index (SCHEMA.md §167). Audits action `update`. */
  async reorder(
    adminId: string,
    id: string,
    dto: ReorderLessonDto,
  ): Promise<LessonAdminDto> {
    const row = await this.getLessonOrThrow(id);

    await this.db.execute(
      `UPDATE lessons SET order_index = ? WHERE id = ?;`,
      [dto.orderIndex, id],
    );

    await this.audit.record(adminId, 'update', 'lesson', id, {
      from: row.order_index,
      to: dto.orderIndex,
    });

    return toLessonAdminDto({ ...row, order_index: dto.orderIndex });
  }

  /** Admin: strict transition draft → published. Audits action `publish`. */
  async publish(adminId: string, id: string): Promise<LessonAdminDto> {
    const row = await this.getLessonOrThrow(id);

    if (row.status === 'published') {
      throw new BadRequestException('Lesson sudah berstatus published.');
    }

    await this.db.execute(
      `UPDATE lessons SET status = 'published' WHERE id = ?;`,
      [id],
    );

    await this.audit.record(adminId, 'publish', 'lesson', id, {
      courseId: row.course_id,
    });

    return toLessonAdminDto({ ...row, status: 'published' });
  }

  /** Admin: strict transition published → draft. Audits action `unpublish`. */
  async unpublish(adminId: string, id: string): Promise<LessonAdminDto> {
    const row = await this.getLessonOrThrow(id);

    if (row.status === 'draft') {
      throw new BadRequestException('Lesson sudah berstatus draft.');
    }

    await this.db.execute(
      `UPDATE lessons SET status = 'draft' WHERE id = ?;`,
      [id],
    );

    await this.audit.record(adminId, 'unpublish', 'lesson', id, {
      courseId: row.course_id,
    });

    return toLessonAdminDto({ ...row, status: 'draft' });
  }

  /**
   * Admin: hard delete (SCHEMA.md has no universal soft delete). Migration
   * 0001 does not cascade course_resources.lesson_id, so the resources are
   * removed explicitly first — the observable behavior matches an FK
   * cascade. Audits action `delete`.
   */
  async remove(adminId: string, id: string): Promise<LessonAdminDto> {
    const row = await this.getLessonOrThrow(id);

    await this.db.execute(
      `DELETE FROM course_resources WHERE lesson_id = ?;`,
      [id],
    );
    await this.db.execute(`DELETE FROM lessons WHERE id = ?;`, [id]);

    await this.audit.record(adminId, 'delete', 'lesson', id, {
      courseId: row.course_id,
    });

    return toLessonAdminDto(row);
  }

  private async getLessonOrThrow(id: string): Promise<LessonRow> {
    const row = await this.db.queryOne<LessonRow>(
      `SELECT * FROM lessons WHERE id = ? LIMIT 1;`,
      [id],
    );
    if (!row) {
      throw new NotFoundException('Lesson tidak ditemukan.');
    }
    return row;
  }
}
