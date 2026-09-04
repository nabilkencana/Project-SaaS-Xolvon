-- =============================================================================
-- Migration: 0001_orders_enrollments.sql
-- Description: Schema DDL for Orders, Order Items, Payment Proofs, and Enrollments
-- Target: Cloudflare D1 (SQLite)
--
-- NOTE:
-- Dokumen ini adalah REFERENSI / DOKUMENTASI SCHEMA saja.
-- JANGAN dijalankan langsung ke instance D1 aktif tanpa koordinasi
-- dengan Database Engineer (Schema V2 dipegang oleh tim Database).
-- =============================================================================

-- 1. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'awaiting_verification', 'paid', 'cancelled')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  notes TEXT NOT NULL DEFAULT '',
  verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id),
  price INTEGER NOT NULL CHECK (price >= 0),
  created_at TEXT NOT NULL
);

-- 3. Payment proofs table (R2 private object key references)
CREATE TABLE IF NOT EXISTS payment_proofs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  uploaded_at TEXT NOT NULL
);

-- 4. Enrollments table with UNIQUE(user_id, course_id)
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  granted_at TEXT NOT NULL,
  granted_by TEXT REFERENCES users(id),
  revoked_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, course_id)
);

-- Indices for query performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order_id ON payment_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);
