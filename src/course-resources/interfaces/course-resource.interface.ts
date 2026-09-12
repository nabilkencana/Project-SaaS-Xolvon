/** Resource type baseline (SCHEMA.md §25) — no other type is official. */
export type CourseResourceType = 'pdf' | 'resource' | 'assignment';

/**
 * DB row shape for `course_resources` (migration 0001_courses_lessons_tags.sql).
 */
export interface CourseResourceRow {
  id: string;
  lesson_id: string | null;
  course_id: string | null;
  type: string;
  object_key: string | null;
  title: string | null;
  metadata: string | null;
  created_at: string | null;
}

/** Lesson row projection needed to bind a resource to its course. */
export interface LessonOwnerRow {
  id: string;
  course_id: string;
}
