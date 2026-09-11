-- Migration: 0005_marketplace.sql
-- Schema V2 (HANDBOOK_BACKEND.md §3.2): katalog showcase SaaS, tanpa transaksi.

CREATE TABLE IF NOT EXISTS marketplace_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  capabilities TEXT,
  external_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS marketplace_media (
  id TEXT PRIMARY KEY,
  marketplace_id TEXT NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  object_key TEXT,
  media_type TEXT,
  sort_order INTEGER DEFAULT 0
);
