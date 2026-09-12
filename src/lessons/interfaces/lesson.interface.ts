/** Lifecycle status constrained by migration 0001 (SCHEMA.md §20). */
export type LessonStatus = 'draft' | 'published';

/**
 * DB row shape for `lessons` (migration 0001_courses_lessons_tags.sql). The
 * public surface never maps `content` or `video_object_key` — those stay
 * server-only until the signed URL flow (plan T14) explicitly grants
 * entitlement (SCHEMA.md §21).
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

/** Course row projection needed to gate public lesson listings (SCHEMA.md §14). */
export interface CourseExistsRow {
  id: string;
  status: string;
}
