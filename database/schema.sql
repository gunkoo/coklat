-- ============================================================
-- DATABASE: Cloudflare D1 (SQLite)
-- TABEL: users
-- Sistem User Terpusat Antarperangkat
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    UNIQUE NOT NULL,
  password      TEXT    NOT NULL,
  nama          TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('superadmin', 'user')),
  active        INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  masa_aktif_hari INTEGER NOT NULL DEFAULT 30,
  garansi       TEXT    DEFAULT NULL,
  updated_at    TEXT    DEFAULT NULL
);

-- Index for fast username lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
