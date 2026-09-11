import type { CourseRow, LessonRow } from '../interfaces/course.interface';
import { CourseCardDto, LessonSummaryDto } from '../dto/course-response.dto';

/**
 * Row → public DTO mappers. These are the only writers of the public
 * contracts (SCHEMA.md §16-17): internal columns (created_at/updated_at,
 * lesson content/video_object_key) never reach a public DTO.
 */
export function toCourseCardDto(row: CourseRow): CourseCardDto {
  return new CourseCardDto({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    price: row.price,
    thumbnailUrl: row.thumbnail_url ?? null,
    status: row.status as CourseCardDto['status'],
  });
}

export function toLessonSummaryDto(row: LessonRow): LessonSummaryDto {
  return new LessonSummaryDto({
    id: row.id,
    title: row.title ?? '',
    orderIndex: row.order_index ?? 0,
    status: row.status as LessonSummaryDto['status'],
  });
}
