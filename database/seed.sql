DELETE FROM users WHERE username = 'SUPERADMIN';

INSERT OR IGNORE INTO users (username, password, nama, role, active, created_at, masa_aktif_hari)
VALUES ('ELDHI', 'MjcwOTAw', 'Muhammad Eldhi', 'superadmin', 1, datetime('now'), 9999);
