-- Migration: 0007_fts.sql
-- Schema V2 (HANDBOOK_BACKEND.md §4.2): index pencarian FTS5 dengan
-- external content table + trigger sinkronisasi INSERT/UPDATE/DELETE
-- sesuai pola resmi SQLite FTS5 (content-sync triggers).

CREATE VIRTUAL TABLE IF NOT EXISTS course_fts USING fts5(
  title,
  description,
  content='courses',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS courses_fts_insert AFTER INSERT ON courses BEGIN
  INSERT INTO course_fts (rowid, title, description)
  VALUES (new.rowid, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS courses_fts_delete AFTER DELETE ON courses BEGIN
  INSERT INTO course_fts (course_fts, rowid, title, description)
  VALUES ('delete', old.rowid, old.title, old.description);
END;

CREATE TRIGGER IF NOT EXISTS courses_fts_update AFTER UPDATE ON courses BEGIN
  INSERT INTO course_fts (course_fts, rowid, title, description)
  VALUES ('delete', old.rowid, old.title, old.description);
  INSERT INTO course_fts (rowid, title, description)
  VALUES (new.rowid, new.title, new.description);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS project_fts USING fts5(
  title,
  summary,
  content='projects',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS projects_fts_insert AFTER INSERT ON projects BEGIN
  INSERT INTO project_fts (rowid, title, summary)
  VALUES (new.rowid, new.title, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS projects_fts_delete AFTER DELETE ON projects BEGIN
  INSERT INTO project_fts (project_fts, rowid, title, summary)
  VALUES ('delete', old.rowid, old.title, old.summary);
END;

CREATE TRIGGER IF NOT EXISTS projects_fts_update AFTER UPDATE ON projects BEGIN
  INSERT INTO project_fts (project_fts, rowid, title, summary)
  VALUES ('delete', old.rowid, old.title, old.summary);
  INSERT INTO project_fts (rowid, title, summary)
  VALUES (new.rowid, new.title, new.summary);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS marketplace_fts USING fts5(
  title,
  description,
  content='marketplace_items',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS marketplace_items_fts_insert AFTER INSERT ON marketplace_items BEGIN
  INSERT INTO marketplace_fts (rowid, title, description)
  VALUES (new.rowid, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS marketplace_items_fts_delete AFTER DELETE ON marketplace_items BEGIN
  INSERT INTO marketplace_fts (marketplace_fts, rowid, title, description)
  VALUES ('delete', old.rowid, old.title, old.description);
END;

CREATE TRIGGER IF NOT EXISTS marketplace_items_fts_update AFTER UPDATE ON marketplace_items BEGIN
  INSERT INTO marketplace_fts (marketplace_fts, rowid, title, description)
  VALUES ('delete', old.rowid, old.title, old.description);
  INSERT INTO marketplace_fts (rowid, title, description)
  VALUES (new.rowid, new.title, new.description);
END;
