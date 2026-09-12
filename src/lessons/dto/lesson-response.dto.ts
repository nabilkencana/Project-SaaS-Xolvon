import type { LessonStatus } from '../interfaces/lesson.interface';

/**
 * Public lesson summary (SCHEMA.md §21): safe discovery fields only — no
 * `content`, no `video_object_key`, no signed URL.
 */
export class LessonSummaryDto {
  readonly id: string;
  readonly title: string;
  readonly orderIndex: number;
  readonly status: LessonStatus;

  constructor(partial: Partial<LessonSummaryDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Admin lesson response. `content` and `videoObjectKey` are admin-surface
 * fields (SCHEMA.md §19 visibility) and never appear on a public endpoint.
 */
export class LessonAdminDto {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly content: string | null;
  readonly videoObjectKey: string | null;
  readonly orderIndex: number;
  readonly status: LessonStatus;
  readonly createdAt: string | null;

  constructor(partial: Partial<LessonAdminDto>) {
    Object.assign(this, partial);
  }
}
