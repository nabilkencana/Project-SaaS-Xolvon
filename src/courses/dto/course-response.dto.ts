import type { CourseStatus } from '../interfaces/course.interface';

/**
 * Public card contract (SCHEMA.md §16). The mapper is the only writer —
 * internal columns (created_at/updated_at) never reach this DTO.
 */
export class CourseCardDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly price: number;
  readonly thumbnailUrl: string | null;
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
  readonly id: string;
  readonly title: string;
  readonly orderIndex: number;
  readonly status: CourseStatus;

  constructor(partial: Partial<LessonSummaryDto>) {
    Object.assign(this, partial);
  }
}

export class CourseDetailDto extends CourseCardDto {
  readonly lessons: LessonSummaryDto[];

  constructor(partial: Partial<CourseDetailDto>) {
    super(partial);
    // Assigned here, not via Object.assign in super(): the `lessons` field
    // declaration re-initializes after super() and would wipe the value.
    this.lessons = partial.lessons ?? [];
  }
}
