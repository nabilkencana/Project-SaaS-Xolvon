/** DB row shape for `courses` (migration 0001_courses_lessons_tags.sql). */
export interface CourseRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * DB row shape for `lessons` (migration 0001). The public surface never maps
 * `content` or `video_object_key` — those stay server-only until the signed
 * URL flow (plan T14) explicitly grants entitlement (SCHEMA.md §17).
 */
export interface LessonRow {
  id: string;
  course_id: string;
  title: string | null;
  content: string | null;
  video_object_key: string | null;
  order_index: number | null;
  status: string;
  created_at: string | null;
}

/** Lifecycle status constrained by the migration CHECK (SCHEMA.md §15). */
export type CourseStatus = 'draft' | 'published';
