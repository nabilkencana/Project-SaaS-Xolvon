-- Migration: 0003_enrollments_progress.sql
-- Schema V2 (HANDBOOK_BACKEND.md §3.3): entitlement paling kritis.
-- Status enrollment FINAL: hanya 'active' | 'revoked' (tanpa 'expired').
-- 'expires_at' tetap disimpan dan ditegakkan di level query.

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_at TEXT,
  granted_by TEXT REFERENCES users(id),
  revoked_at TEXT,
  expires_at TEXT,
  created_at TEXT,
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  course_id TEXT REFERENCES courses(id),
  lesson_id TEXT REFERENCES lessons(id),
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_course_id ON progress(course_id);
