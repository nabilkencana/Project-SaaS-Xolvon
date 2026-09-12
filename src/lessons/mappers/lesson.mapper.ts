import type { LessonRow } from '../interfaces/lesson.interface';
import { LessonAdminDto, LessonSummaryDto } from '../dto/lesson-response.dto';

/** Public list row projection — only columns safe for the public surface. */
export type LessonPublicRow = Pick<
  LessonRow,
  'id' | 'title' | 'order_index' | 'status'
>;

/**
 * Row → DTO mappers. These are the only writers of the public contracts
 * (SCHEMA.md §21): internal columns (content, video_object_key, created_at)
 * never reach the public summary DTO.
 */
export function toLessonSummaryDto(row: LessonPublicRow): LessonSummaryDto {
  return new LessonSummaryDto({
    id: row.id,
    title: row.title ?? '',
    orderIndex: row.order_index ?? 0,
    status: row.status as LessonSummaryDto['status'],
  });
}

export function toLessonAdminDto(row: LessonRow): LessonAdminDto {
  return new LessonAdminDto({
    id: row.id,
    courseId: row.course_id,
    title: row.title ?? '',
    content: row.content,
    videoObjectKey: row.video_object_key,
    orderIndex: row.order_index ?? 0,
    status: row.status as LessonAdminDto['status'],
    createdAt: row.created_at,
  });
}
