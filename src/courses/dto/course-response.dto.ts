import { ApiProperty } from '@nestjs/swagger';
import type { CourseStatus } from '../interfaces/course.interface';

/**
 * Public card contract (SCHEMA.md §16). The mapper is the only writer —
 * internal columns (created_at/updated_at) never reach this DTO.
 */
export class CourseCardDto {
  @ApiProperty({ description: 'Course id (UUID v4).' })
  readonly id: string;

  @ApiProperty()
  readonly title: string;

  @ApiProperty()
  readonly slug: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ description: 'Price in IDR.' })
  readonly price: number;

  @ApiProperty({ type: String, nullable: true })
  readonly thumbnailUrl: string | null;

  @ApiProperty({ enum: ['draft', 'published'] satisfies [CourseStatus, ...CourseStatus[]] })
  readonly status: CourseStatus;

  constructor(partial: Partial<CourseCardDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Public lesson summary (SCHEMA.md §17): safe discovery fields only —
 * no `content`, no `video_object_key`, no signed URL.
 */
export class LessonSummaryDto {
  @ApiProperty({ description: 'Lesson id (UUID v4).' })
  readonly id: string;

  @ApiProperty()
  readonly title: string;

  @ApiProperty({ description: 'Sequence position (order_index).' })
  readonly orderIndex: number;

  @ApiProperty({ enum: ['draft', 'published'] satisfies [CourseStatus, ...CourseStatus[]] })
  readonly status: CourseStatus;

  constructor(partial: Partial<LessonSummaryDto>) {
    Object.assign(this, partial);
  }
}

export class CourseDetailDto extends CourseCardDto {
  @ApiProperty({ type: () => [LessonSummaryDto] })
  readonly lessons: LessonSummaryDto[];

  constructor(partial: Partial<CourseDetailDto>) {
    super(partial);
    // Assigned here, not via Object.assign in super(): the `lessons` field
    // declaration re-initializes after super() and would wipe the value.
    this.lessons = partial.lessons ?? [];
  }
}
