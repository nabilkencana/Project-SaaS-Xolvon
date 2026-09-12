import { ApiProperty } from '@nestjs/swagger';
import type { LessonStatus } from '../interfaces/lesson.interface';

/**
 * Public lesson summary (SCHEMA.md §21): safe discovery fields only — no
 * `content`, no `video_object_key`, no signed URL.
 */
export class LessonSummaryDto {
  @ApiProperty({ description: 'Lesson id (UUID v4).' })
  readonly id: string;

  @ApiProperty()
  readonly title: string;

  @ApiProperty({ description: 'Sequence position (order_index).' })
  readonly orderIndex: number;

  @ApiProperty({ enum: ['draft', 'published'] satisfies [LessonStatus, ...LessonStatus[]] })
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
  @ApiProperty({ description: 'Lesson id (UUID v4).' })
  readonly id: string;

  @ApiProperty({ description: 'Owning course id (UUID v4).' })
  readonly courseId: string;

  @ApiProperty()
  readonly title: string;

  @ApiProperty({ type: String, nullable: true })
  readonly content: string | null;

  @ApiProperty({ type: String, nullable: true })
  readonly videoObjectKey: string | null;

  @ApiProperty()
  readonly orderIndex: number;

  @ApiProperty({ enum: ['draft', 'published'] satisfies [LessonStatus, ...LessonStatus[]] })
  readonly status: LessonStatus;

  @ApiProperty({ type: String, nullable: true, description: 'ISO 8601 timestamp.' })
  readonly createdAt: string | null;

  constructor(partial: Partial<LessonAdminDto>) {
    Object.assign(this, partial);
  }
}
