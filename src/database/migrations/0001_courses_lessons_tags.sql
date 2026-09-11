-- Migration: 0001_courses_lessons_tags.sql
-- Schema V2 (HANDBOOK_BACKEND.md §3.2): master course, materi, tag, resource.

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  video_object_key TEXT,
  order_index INTEGER,
  status TEXT DEFAULT 'draft',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS course_tags (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  tag TEXT
);

CREATE TABLE IF NOT EXISTS course_resources (
  id TEXT PRIMARY KEY,
  lesson_id TEXT REFERENCES lessons(id),
  course_id TEXT REFERENCES courses(id),
  type TEXT NOT NULL CHECK (type IN ('pdf', 'resource', 'assignment')),
  object_key TEXT,
  title TEXT,
  metadata TEXT,
  created_at TEXT
);
