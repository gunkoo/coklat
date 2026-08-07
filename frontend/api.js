// ============================================================
// API LAYER — Single Source of Truth untuk data User
// localStorage hanya untuk cache/offline, BUKAN sumber utama
// ============================================================

const API_BASE = 'https://api-user-system.sayapekerjaan72-df5.workers.dev/api';

// Shared secret — HARUS sama dengan DEFAULT_API_KEY / secret di backend worker.
// Jika backend menggunakan `wrangler secret put API_KEY`, sesuaikan nilai ini.
const API_KEY = 'masuser-2026-secret-key';

function isApiOnline() {
  return !!API_BASE;
}

// ── CACHE HELPERS ──────────────────────────────────────────
function cacheUsers(users) {
  try {
    // Normalisasi: created_at → createdAt, masa_aktif_hari → masaAktifHari
    const normalized = users.map(u => ({
      ...u,
      createdAt: u.created_at || u.createdAt || new Date().toISOString(),
      masaAktifHari: u.masa_aktif_hari || u.masaAktifHari || 30,
    }));
    localStorage.setItem('userDatabase_cache', JSON.stringify(normalized));
  } catch(e) { console.warn('cacheUsers gagal:', e); }
}
function getCachedUsers() {
  try {
    const c = localStorage.getItem('userDatabase_cache');
    return c ? JSON.parse(c) : null;
  } catch(e) { return null; }
}

// ── GENERIC FETCH ──────────────────────────────────────────
async function apiFetch(path, options = {}) {
  if (!isApiOnline()) throw new Error('API_BASE tidak tersedia');
  const url = API_BASE + path;
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(options.timeout || 8000),
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY, ...options.headers },
  });
  const data = await resp.json();
  return { ok: resp.ok, data, status: resp.status };
}

// ============================================================
// 1. AUTH
// ============================================================

// Login — WAJIB melalui API. Tidak boleh fallback ke localStorage.
async function apiLogin(username, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    timeout: 6000,
  });
}

// Cek session — apakah user masih valid di database pusat
async function apiCheckSession(username) {
  try {
    const r = await apiFetch('/auth/check/' + encodeURIComponent(username), { timeout: 5000 });
    return r.ok ? r.data : { valid: false, reason: 'API_ERROR' };
  } catch (e) {
    return { valid: false, reason: 'API_OFFLINE' };
  }
}

// ============================================================
// 2. USER CRUD
// ============================================================

// Ambil semua user → simpan cache lokal
async function apiGetUsers() {
  const r = await apiFetch('/users', { timeout: 5000 });
  if (r.ok && Array.isArray(r.data)) {
    cacheUsers(r.data);
    return r.data;
  }
  // Fallback: coba cache
  const cached = getCachedUsers();
  if (cached) return cached;
  throw new Error(r.data?.error || 'Gagal mengambil data user');
}

// Buat user baru
async function apiCreateUser(data) {
  const r = await apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(data),
    timeout: 5000,
  });
  return r;
}

// Update user
async function apiUpdateUser(username, updates) {
  const r = await apiFetch('/users/' + encodeURIComponent(username), {
    method: 'PUT',
    body: JSON.stringify(updates),
    timeout: 5000,
  });
  return r;
}

// Hapus user
async function apiDeleteUser(username) {
  const r = await apiFetch('/users/' + encodeURIComponent(username), {
    method: 'DELETE',
    timeout: 5000,
  });
  return r;
}

// ============================================================
// 3. USER FIELD UPDATES (Active, Masa Aktif, Garansi, Role)
// ============================================================

// Aktifkan / Nonaktifkan user
async function apiToggleActive(username, active) {
  return apiUpdateUser(username, { active });
}

// Perpanjang masa aktif (reset created_at)
async function apiExtendMasaAktif(username) {
  return apiUpdateUser(username, { created_at: new Date().toISOString(), active: true });
}

// Update garansi
async function apiUpdateGaransi(username, garansi) {
  return apiUpdateUser(username, { garansi });
}

// Update role
async function apiUpdateRole(username, role) {
  return apiUpdateUser(username, { role });
}

// ============================================================
// 4. SYNC — Sinkronisasi cache lokal dari server
// ============================================================

// Panggil setelah setiap operasi CRUD
async function syncUsersFromServer() {
  try {
    const users = await apiGetUsers();
    return users;
  } catch (e) {
    console.warn('syncUsersFromServer:', e.message);
    return getCachedUsers();
  }
}
