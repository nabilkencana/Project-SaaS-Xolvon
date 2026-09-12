import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import type { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ProgressService {
  constructor(
    private readonly db: DatabaseService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  async update(userId: string, dto: UpdateProgressDto) {
    const lesson = await this.db.queryOne<{ id: string; course_id: string }>(
      'SELECT id, course_id FROM lessons WHERE id = ? LIMIT 1;', [dto.lessonId],
    );
    if (!lesson || !(await this.enrollments.isUserEntitled(userId, lesson.course_id))) {
      throw new ForbiddenException('Enrollment aktif diperlukan.');
    }
    const now = new Date().toISOString();
    const current = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM progress WHERE user_id = ? AND lesson_id = ? LIMIT 1;', [userId, dto.lessonId],
    );
    if (current) {
      await this.db.execute(
        'UPDATE progress SET course_id = ?, completed = ?, completed_at = ?, updated_at = ? WHERE id = ?;',
        [lesson.course_id, dto.completed ? 1 : 0, dto.completed ? now : null, now, current.id],
      );
      return this.readOne(userId, dto.lessonId);
    }
    await this.db.execute(
      'INSERT INTO progress (id, user_id, course_id, lesson_id, completed, completed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [randomUUID(), userId, lesson.course_id, dto.lessonId, dto.completed ? 1 : 0, dto.completed ? now : null, now],
    );
    return this.readOne(userId, dto.lessonId);
  }

  async list(userId: string) {
    const rows = await this.db.queryAll<{ lesson_id: string; completed: number; completed_at: string | null; updated_at: string }>(
      'SELECT lesson_id, completed, completed_at, updated_at FROM progress WHERE user_id = ? ORDER BY updated_at DESC;', [userId],
    );
    return rows.map((row) => ({ lessonId: row.lesson_id, completed: Boolean(row.completed), completedAt: row.completed_at, updatedAt: row.updated_at }));
  }

  private async readOne(userId: string, lessonId: string) {
    const row = await this.db.queryOne<{ lesson_id: string; completed: number; completed_at: string | null; updated_at: string }>(
      'SELECT lesson_id, completed, completed_at, updated_at FROM progress WHERE user_id = ? AND lesson_id = ? LIMIT 1;', [userId, lessonId],
    );
    return { lessonId: row!.lesson_id, completed: Boolean(row!.completed), completedAt: row!.completed_at, updatedAt: row!.updated_at };
  }
}
