import { ApiProperty } from '@nestjs/swagger';
import type { CourseResourceRow, CourseResourceType } from '../interfaces/course-resource.interface';

/** Admin resource response (SCHEMA.md §24 fields baseline). */
export class CourseResourceDto {
  @ApiProperty({ description: 'Resource id (UUID v4).' })
  readonly id: string;

  @ApiProperty({ type: String, nullable: true })
  readonly lessonId: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly courseId: string | null;

  @ApiProperty({ enum: ['pdf', 'resource', 'assignment'] satisfies [CourseResourceType, ...CourseResourceType[]] })
  readonly type: CourseResourceType;

  @ApiProperty({ type: String, nullable: true, description: 'Private storage object key — admin surface only.' })
  readonly objectKey: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly title: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'ISO 8601 timestamp.' })
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
