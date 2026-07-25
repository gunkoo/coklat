-- ============================================================
-- SEED DATA: Initial Superadmin account
-- Password default: 270900 (dalam Base64: MjcwOTAw)
-- Ganti password setelah deploy pertama!
-- ============================================================

INSERT OR IGNORE INTO users (username, password, nama, role, active, created_at, masa_aktif_hari)
VALUES ('SUPERADMIN', 'MjcwOTAw', 'Muhammad Eldhi', 'superadmin', 1, datetime('now'), 9999);
