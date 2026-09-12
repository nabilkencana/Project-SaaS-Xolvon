import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type {
  CourseResourceRow,
  LessonOwnerRow,
} from './interfaces/course-resource.interface';
import type { CreateCourseResourceDto } from './dto/create-course-resource.dto';
import { CourseResourceDto, toCourseResourceDto } from './dto/course-resource-response.dto';

/**
 * Course resources service (SCHEMA.md §24-26, plan T6). Resources are bound
 * to an existing lesson (which carries the course_id). The type allowlist is
 * enforced by the DTO; this service persists and audits.
 */
@Injectable()
export class CourseResourcesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Admin: create a resource under an existing lesson + audit `create`. */
  async create(
    adminId: string,
    lessonId: string,
    dto: CreateCourseResourceDto,
  ): Promise<CourseResourceDto> {
    const lesson = await this.db.queryOne<LessonOwnerRow>(
      `SELECT id, course_id FROM lessons WHERE id = ? LIMIT 1;`,
      [lessonId],
    );
    if (!lesson) {
      throw new NotFoundException('Lesson tidak ditemukan.');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db.execute(
      `INSERT INTO course_resources ` +
        `(id, lesson_id, course_id, type, object_key, title, metadata, created_at) ` +
        `VALUES (?, ?, ?, ?, ?, ?, NULL, ?);`,
      [id, lessonId, lesson.course_id, dto.type, dto.objectKey, dto.title, now],
    );

    await this.audit.record(adminId, 'create', 'course_resource', id, {
      lessonId,
      type: dto.type,
    });

    return toCourseResourceDto({
      id,
      lesson_id: lessonId,
      course_id: lesson.course_id,
      type: dto.type,
      object_key: dto.objectKey,
      title: dto.title,
      metadata: null,
      created_at: now,
    });
  }

  /** Admin: hard delete + audit `delete`. */
  async remove(adminId: string, id: string): Promise<CourseResourceDto> {
    const row = await this.db.queryOne<CourseResourceRow>(
      `SELECT * FROM course_resources WHERE id = ? LIMIT 1;`,
      [id],
    );
    if (!row) {
      throw new NotFoundException('Resource tidak ditemukan.');
    }

    await this.db.execute(`DELETE FROM course_resources WHERE id = ?;`, [id]);

    await this.audit.record(adminId, 'delete', 'course_resource', id, {
      lessonId: row.lesson_id,
      type: row.type,
    });

    return toCourseResourceDto(row);
  }
}
