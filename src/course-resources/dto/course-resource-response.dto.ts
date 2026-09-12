import type { CourseResourceRow, CourseResourceType } from '../interfaces/course-resource.interface';

/** Admin resource response (SCHEMA.md §24 fields baseline). */
export class CourseResourceDto {
  readonly id: string;
  readonly lessonId: string | null;
  readonly courseId: string | null;
  readonly type: CourseResourceType;
  readonly objectKey: string | null;
  readonly title: string | null;
  readonly createdAt: string | null;

  constructor(partial: Partial<CourseResourceDto>) {
    Object.assign(this, partial);
  }
}

export function toCourseResourceDto(row: CourseResourceRow): CourseResourceDto {
  return new CourseResourceDto({
    id: row.id,
    lessonId: row.lesson_id,
    courseId: row.course_id,
    type: row.type as CourseResourceType,
    objectKey: row.object_key,
    title: row.title,
    createdAt: row.created_at,
  });
}
