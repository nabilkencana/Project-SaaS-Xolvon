-- Migration: 0006_audit.sql
-- Schema V2 (HANDBOOK_BACKEND.md §3.2): jejak aktivitas admin, immutable.

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_user_id ON admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_type ON admin_audit_logs(entity_type);
