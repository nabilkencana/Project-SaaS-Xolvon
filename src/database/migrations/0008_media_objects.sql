-- Migration: 0008_media_objects.sql
-- Schema V2 addendum (P3 B.3/0008): server-minted object keys get a durable
-- metadata row (issued at mint, confirmed on upload). Closes the F-T8-02
-- doc-drift half ("register object metadata" promise in README endpoint
-- matrix). HEAD-object existence validation (BUG-T8-01) remains OPEN-PARKED.

CREATE TABLE IF NOT EXISTS media_objects (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  uploaded_by TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'confirmed')),
  created_at TEXT,
  confirmed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_objects_key ON media_objects(key);
