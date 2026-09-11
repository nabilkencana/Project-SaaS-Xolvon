import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { CourseRow, LessonRow } from './interfaces/course.interface';
import type { CreateCourseDto } from './dto/create-course.dto';
import type { UpdateCourseDto } from './dto/update-course.dto';
import type { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { CourseCardDto, CourseDetailDto } from './dto/course-response.dto';
import { toCourseCardDto, toLessonSummaryDto } from './mappers/course.mapper';

/** DL-011 pagination contract: ?limit= defaults to 20, maximum 100. */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Courses service (SCHEMA.md §14-17, PRD §31-33).
 *
 * Public reads are strictly published-only: a draft slug 404s exactly like a
 * missing one, so draft content is never distinguishable from nonexistent
 * content to a visitor. Lesson summaries expose safe discovery fields only —
 * content and video object keys stay server-only until the signed URL flow
 * (plan T14) grants entitlement.
 */
@Injectable()
export class CoursesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Public list: published courses only, optional `?q=` contains-search over
   * the title, `?sort=` latest (default) | oldest, DL-011 pagination.
   */
  async listPublished(query: ListCoursesQueryDto): Promise<{
    items: CourseCardDto[];
    page: number;
    limit: number;
    total: number;
    query: string | null;
  }> {
    // Service-level clamp so non-HTTP callers cannot bypass the DL-011 maximum.
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;
    const direction = query.sort === 'oldest' ? 'ASC' : 'DESC';

    const params: unknown[] = [];
    let where = "status = 'published'";
    if (query.q) {
      // Escape LIKE wildcards so the visitor query matches literally, then
      // wrap with % for contains semantics (the escaped term must never be
      // treated as a wildcard itself).
      const pattern = query.q
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      where += ` AND (title LIKE ? ESCAPE '\\')`;
      params.push(`%${pattern}%`);
    }

    const rows = await this.db.queryAll<CourseRow>(
      `SELECT * FROM courses WHERE ${where} ` +
        `ORDER BY created_at ${direction}, id ${direction} LIMIT ? OFFSET ?;`,
      [...params, limit, offset],
    );
    const countRow = await this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM courses WHERE ${where};`,
      params,
    );

    return {
      items: rows.map(toCourseCardDto),
      page,
      limit,
      total: countRow?.total ?? 0,
      query: query.q ?? null,
    };
  }

  /**
   * Public detail by slug: published-only lookup (draft → 404, same as
   * missing), with lesson summaries ordered by `order_index`. Two queries
   * total — no N+1. The lesson query selects safe columns explicitly so
   * content/video_object_key cannot leak even by accident (SCHEMA.md §17).
   */
  async getPublishedBySlug(slug: string): Promise<CourseDetailDto> {
    const row = await this.db.queryOne<CourseRow>(
      `SELECT * FROM courses WHERE slug = ? LIMIT 1;`,
      [slug],
    );

    // Published-only guard in code: draft rows 404 exactly like missing ones.
    if (!row || row.status !== 'published') {
      throw new NotFoundException('Course tidak ditemukan.');
    }

    const lessons = await this.db.queryAll<LessonRow>(
      `SELECT id, course_id, title, order_index, status FROM lessons ` +
        `WHERE course_id = ? ORDER BY order_index ASC, id ASC;`,
      [row.id],
    );

    return new CourseDetailDto({
      ...toCourseCardDto(row),
      lessons: lessons.map(toLessonSummaryDto),
    });
  }

  /**
   * Admin: create a course in `draft` status with a server-generated UUID.
   * Enforces slug uniqueness. Audits action `create` on entity `course`.
   */
  async create(adminId: string, dto: CreateCourseDto): Promise<CourseCardDto> {
    const slug = await this.assertSlugAvailable(dto.slug);

    const id = randomUUID();
    const now = new Date().toISOString();
    const description = dto.description ?? null;
    const thumbnailUrl = dto.thumbnailUrl ?? null;

    await this.db.execute(
      `INSERT INTO courses ` +
        `(id, title, slug, description, price, thumbnail_url, status, created_at, updated_at) ` +
        `VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?);`,
      [id, dto.title, slug, description, dto.price, thumbnailUrl, now, now],
    );

    await this.audit.record(adminId, 'create', 'course', id, { slug });

    return toCourseCardDto({
      id,
      title: dto.title,
      slug,
      description,
      price: dto.price,
      thumbnail_url: thumbnailUrl,
      status: 'draft',
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * Admin: partial update. Only provided fields are written; a changed slug
   * is re-checked for uniqueness. Audits action `update` only when something
   * actually changed.
   */
  async update(adminId: string, id: string, dto: UpdateCourseDto): Promise<CourseCardDto> {
    const row = await this.getCourseOrThrow(id);

    const changed: Partial<CourseRow> = {};
    if (dto.title !== undefined) changed.title = dto.title;
    if (dto.description !== undefined) changed.description = dto.description;
    if (dto.price !== undefined) changed.price = dto.price;
    if (dto.thumbnailUrl !== undefined) changed.thumbnail_url = dto.thumbnailUrl;
    // Re-sending the current slug is a no-op; a new slug must be free.
    if (dto.slug !== undefined && dto.slug !== row.slug) {
      await this.assertSlugAvailable(dto.slug);
      changed.slug = dto.slug;
    }

    const changedKeys = Object.keys(changed) as (keyof CourseRow)[];
    if (changedKeys.length === 0) {
      return toCourseCardDto(row);
    }

    const now = new Date().toISOString();
    const sets = changedKeys.map((key) => `${key} = ?`);
    const params: unknown[] = changedKeys.map((key) => changed[key]);
    sets.push('updated_at = ?');
    params.push(now, id);

    await this.db.execute(
      `UPDATE courses SET ${sets.join(', ')} WHERE id = ?;`,
      params,
    );

    await this.audit.record(adminId, 'update', 'course', id, {
      fields: changedKeys,
    });

    return toCourseCardDto({ ...row, ...changed, updated_at: now });
  }

  /**
   * Admin: strict transition draft → published, gated on required public
   * fields being present (description non-empty, price set). Audits action
   * `publish`; every publish audit therefore corresponds to a real transition.
   */
  async publish(adminId: string, id: string): Promise<CourseCardDto> {
    const row = await this.getCourseOrThrow(id);

    if (row.status === 'published') {
      throw new BadRequestException('Course sudah berstatus published.');
    }
    this.assertPublishable(row);

    const now = new Date().toISOString();
    await this.db.execute(
      `UPDATE courses SET status = 'published', updated_at = ? WHERE id = ?;`,
      [now, id],
    );

    await this.audit.record(adminId, 'publish', 'course', id, {
      slug: row.slug,
    });

    return toCourseCardDto({ ...row, status: 'published', updated_at: now });
  }

  /**
   * Admin: strict transition published → draft. Audits action `unpublish`.
   */
  async unpublish(adminId: string, id: string): Promise<CourseCardDto> {
    const row = await this.getCourseOrThrow(id);

    if (row.status === 'draft') {
      throw new BadRequestException('Course sudah berstatus draft.');
    }

    const now = new Date().toISOString();
    await this.db.execute(
      `UPDATE courses SET status = 'draft', updated_at = ? WHERE id = ?;`,
      [now, id],
    );

    await this.audit.record(adminId, 'unpublish', 'course', id, {
      slug: row.slug,
    });

    return toCourseCardDto({ ...row, status: 'draft', updated_at: now });
  }

  private async getCourseOrThrow(id: string): Promise<CourseRow> {
    const row = await this.db.queryOne<CourseRow>(
      `SELECT * FROM courses WHERE id = ? LIMIT 1;`,
      [id],
    );
    if (!row) {
      throw new NotFoundException('Course tidak ditemukan.');
    }
    return row;
  }

  private async assertSlugAvailable(slug: string): Promise<string> {
    const existing = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM courses WHERE slug = ? LIMIT 1;`,
      [slug],
    );
    if (existing) {
      throw new ConflictException('Slug sudah digunakan.');
    }
    return slug;
  }

  /**
   * Publish gate: required public fields must be present before a course can
   * go live (SCHEMA.md §14 — title/description/price are required; thumbnail
   * stays nullable per contract). The create/update DTOs already enforce
   * well-formed input, but this re-checks the stored row so a course that
   * reached the DB incomplete can never be published.
   */
  private assertPublishable(row: CourseRow): void {
    const missing: string[] = [];
    if (row.description === null || row.description.trim().length === 0) {
      missing.push('description');
    }
    if (row.price === null || row.price === undefined) {
      missing.push('price');
    }
    if (missing.length > 0) {
      throw new BadRequestException(
        `Course belum lengkap untuk dipublish. Field wajib belum ada: ${missing.join(', ')}.`,
      );
    }
  }
}
