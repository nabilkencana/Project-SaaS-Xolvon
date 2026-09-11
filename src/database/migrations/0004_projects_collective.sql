-- Migration: 0004_projects_collective.sql
-- Schema V2 (HANDBOOK_BACKEND.md §3.2): portfolio dan collective.

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT,
  summary TEXT,
  problem TEXT,
  solution TEXT,
  tech_stack TEXT,
  result TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS project_tags (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  tag TEXT
);

CREATE TABLE IF NOT EXISTS project_media (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  object_key TEXT,
  media_type TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  role TEXT,
  PRIMARY KEY (project_id, member_id)
);

CREATE TABLE IF NOT EXISTS collective_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  photo TEXT,
  role TEXT,
  skills TEXT,
  bio TEXT,
  social_links TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  display_order INTEGER DEFAULT 0,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_media_project_id ON project_media(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_collective_members_slug ON collective_members(slug);
