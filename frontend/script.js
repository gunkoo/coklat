function generateKodeVerifikasi() {
        return Math.floor(10000 + Math.random() * 90000).toString();
    }
    let kodeVerifikasiGlobal = generateKodeVerifikasi();

    // Tampilkan kode aktivasi seketika (elemen #kodeDisplay sudah ada karena script di akhir body)
    function renderKodeVerifikasi() {
        const el = document.getElementById('kodeDisplay');
        if (el) el.textContent = kodeVerifikasiGlobal;
    }
    renderKodeVerifikasi();
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('appContainer');
    const loginTransition = document.getElementById('loginTransition');
    const logoutTransition = document.getElementById('logoutTransition');
    const loginTransitionUser = document.getElementById('loginTransitionUser');
    const loginTransitionText = document.getElementById('loginTransitionText');
    const logoutTransitionUser = document.getElementById('logoutTransitionUser');
    const logoutTransitionText = document.getElementById('logoutTransitionText');
    const headerLogo = document.querySelector('.header-logo');
    const logoDropdown = document.getElementById('logoDropdown');
    const dropdownExport = document.getElementById('dropdownExport');
    const dropdownImport = document.getElementById('dropdownImport');
    const dropdownPDF = document.getElementById('dropdownPDF');
    const dropdownResetPassword = document.getElementById('dropdownResetPassword');
    const dropdownNotifikasi = document.getElementById('dropdownNotifikasi');
    const dropdownLogout = document.getElementById('dropdownLogout');
    const importFileInput = document.getElementById('importFile');
    const MOBILE_BREAKPOINT = 768;
    let dateTimeIntervalId = null;
    let weatherIntervalId = null;
    let weatherLoaded = false;
    let weatherLoading = false;
    let sessionIntervalId = null;
    let appDataSaveIntervalId = null;
    let countdownIntervalId = null;
    let dropdownRafId = 0;
    let searchIndexCache = new WeakMap();
    let totalsCache = null;
function clearIntervalSafe(intervalId) {
  if (intervalId) clearInterval(intervalId);
  return null;
}
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function isMobileViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px), (hover: none) and (pointer: coarse)`).matches;
}
function resetDerivedCaches() {
  searchIndexCache = new WeakMap();
  totalsCache = null;
}
function getSearchIndex(item) {
  if (!item || typeof item !== 'object') return '';
  if (searchIndexCache.has(item)) return searchIndexCache.get(item);

  const value = [
    item.name || '',
    item.passport || '',
    item.tujuan || ''
  ].join(' ').toLowerCase();

  searchIndexCache.set(item, value);
  return value;
}
function sortMasterData() {
  allDataTable.sort((a, b) => new Date(b.tanggalMasuk) - new Date(a.tanggalMasuk));
}
function requestDropdownPosition() {
  const menu = document.getElementById('logoDropdown');
  if (!menu || !menu.classList.contains('show') || isMobileViewport()) return;
  if (dropdownRafId) return;

  dropdownRafId = requestAnimationFrame(() => {
    dropdownRafId = 0;
    positionDropdown();
  });
}
function stopCountdownTimers() {
  countdownIntervalId = clearIntervalSafe(countdownIntervalId);
}
function stopAppIntervals() {
  dateTimeIntervalId = clearIntervalSafe(dateTimeIntervalId);
  weatherIntervalId = clearIntervalSafe(weatherIntervalId);
  sessionIntervalId = clearIntervalSafe(sessionIntervalId);
  appDataSaveIntervalId = clearIntervalSafe(appDataSaveIntervalId);
}
function startAppIntervals() {
  stopAppIntervals();
  updateDateTime();
  updateCuaca();          // update cuaca sekali saat dashboard dibuka
  checkUserSession();
  dateTimeIntervalId = setInterval(updateDateTime, 1000);
  weatherIntervalId = setInterval(updateCuaca, 60000);
  sessionIntervalId = setInterval(checkUserSessionOnline, 60000);
  appDataSaveIntervalId = setInterval(saveAppData, 120000);
}
const externalScriptCache = new Map();
function loadScriptOnce(src) {
  if (externalScriptCache.has(src)) {
    return externalScriptCache.get(src);
  }

  const existingScript = Array.from(document.scripts).find(script => script.src === src);
  const promise = new Promise((resolve, reject) => {
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => {
        existingScript.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      existingScript.addEventListener('error', () => reject(new Error(`Gagal memuat ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Gagal memuat ${src}`));
    document.head.appendChild(script);
  });

  externalScriptCache.set(src, promise);
  return promise;
}
async function ensurePdfDownloadLibs() {
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js');

  if (!window.jspdf?.jsPDF) {
    throw new Error('Library PDF belum siap dimuat.');
  }
}
async function ensureManifestProcessingLibs() {
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js');
  await loadScriptOnce('https://unpkg.com/tesseract.js@v4.1.1/dist/tesseract.min.js');

  if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
  }

  if (!window.pdfjsLib || !window.Tesseract) {
    throw new Error('Library proses manifest belum siap dimuat.');
  }
}
function escapeHtml(text) {
      if (!text) return '';
      return text.replace(/[&<>"']/g, function(m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
      });
    }
function formatDate(dateString) {
  if (!dateString) return '';
  
  // Coba parce tanggal
  let date;
  
  // Format sudah YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    date = new Date(dateString);
  } 
  // Format DD-MM-YYYY
  else if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    const parts = dateString.split('-');
    date = new Date(parts[2], parts[1] - 1, parts[0]);
  }
  // Format DD/MM/YYYY
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const parts = dateString.split('/');
    date = new Date(parts[2], parts[1] - 1, parts[0]);
  }
  else {
    // Coba langsung parc
    date = new Date(dateString);
  }
  
  if (isNaN(date)) return dateString; // Kembalikan apa adanya kalo gagal
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
}
function getPaginatedData() {
  const start = (currentPage - 1) * rowsPerPage;
  return dataTable.slice(start, start + rowsPerPage);
}
function highlightMatch(text, search) {
      if (!search) return escapeHtml(text);
      const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return escapeHtml(text).replace(regex, '<span class="highlight-red">$1</span>');
    }
function getUser(username) {
  try {
    // 🔒 Akun SUPERADMIN legacy tidak boleh dikenali sama sekali
    if (String(username || '').toUpperCase() === 'SUPERADMIN') return null;

    const cacheRaw = localStorage.getItem('userDatabase_cache');
    const oldRaw = localStorage.getItem('userDatabase');
    let user = null;
    if (cacheRaw) {
      const users = JSON.parse(cacheRaw);
      user = users.find(u => u.username.toUpperCase() === username.toUpperCase());
    }
    if (user && !user.password && oldRaw) {
      const oldUsers = JSON.parse(oldRaw);
      const oldUser = oldUsers.find(u => u.username.toUpperCase() === username.toUpperCase());
      if (oldUser && oldUser.password) {
        user = { ...user, password: oldUser.password };
      }
    }
    if (user) return user;
    if (oldRaw) {
      const oldUsers = JSON.parse(oldRaw);
      return oldUsers.find(u => u.username.toUpperCase() === username.toUpperCase()) || null;
    }
    return null;
  } catch (e) {
    return null;
  }
}
function saveUserPasswordLocally(username, encodedPassword) {
  try {
    const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
    const idx = users.findIndex(u => u.username.toUpperCase() === username.toUpperCase());
    if (idx >= 0) {
      users[idx].password = encodedPassword;
    } else {
      users.push({ username: username.toUpperCase(), password: encodedPassword });
    }
    localStorage.setItem('userDatabase', JSON.stringify(users));
  } catch (e) {
    console.warn('saveUserPasswordLocally gagal:', e);
  }
}
function getAllUsers() {
  try {
    return JSON.parse(localStorage.getItem('userDatabase_cache') || localStorage.getItem('userDatabase') || '[]').filter(u => String(u.username || '').toUpperCase() !== 'SUPERADMIN');
  } catch (e) {
    return [];
  }
}
function purgeSuperadminFromLocal() {
  try {
    ['userDatabase', 'userDatabase_cache'].forEach(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const users = JSON.parse(raw);
      if (!Array.isArray(users)) return;
      const filtered = users.filter(u => String(u.username || '').toUpperCase() !== 'SUPERADMIN');
      if (filtered.length !== users.length) {
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    });
    const curRaw = localStorage.getItem('currentUser');
    if (curRaw) {
      try {
        const cur = JSON.parse(curRaw);
        if (cur && String(cur.username || '').toUpperCase() === 'SUPERADMIN') {
          localStorage.removeItem('currentUser');
        }
      } catch (e) {}
    }
  } catch (e) {
    console.warn('purgeSuperadminFromLocal:', e.message);
  }
}
async function initUserDatabaseFIX() {
  // 1️⃣ Coba sync dari API (single source of truth)
  try {
    const serverUsers = await syncUsersFromServer();
    if (serverUsers && serverUsers.length > 0) {
      // Cache sudah terisi dari API — biarkan userDatabase sebagai backup password
      // Superadmin (ELDHI) tidak wajib ada di list karena tersembunyi di server.
      return;
    }
  } catch (e) {
    console.warn('initUserDatabaseFIX — API offline:', e.message);
  }

  // 2️⃣ Fallback: API tidak tersedia → gunakan localStorage lama
  let users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
  localStorage.setItem('userDatabase', JSON.stringify(users));
}
function showLoginNotification(title, text) {
  const combined = (title + ' ' + text).toUpperCase();
  const type = /KODE|AKUN|MASA/.test(combined) ? 'warning' : 'error';
  const message = text || title || 'Periksa kembali input Anda.';
  showNotification({ type: type, message: message, duration: 5000 });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showNotification({ type, message, html, duration }) {
  if (!type) type = 'info';
  if (!duration && duration !== 0) duration = 4000;
  let container = document.querySelector('.notifikasi-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notifikasi-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const notif = document.createElement('div');
  notif.className = 'notifikasi notifikasi--' + type;
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle',
    delete: 'fa-trash-alt',
    loading: 'fa-spinner fa-spin'
  };
  let content = '';
  if (html) {
    content = html;
  } else if (message) {
    content = '<div class="notifikasi-message">' + message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>') + '</div>';
  }
  notif.innerHTML = '<div class="notifikasi-icon"><i class="fas ' + (icons[type] || 'fa-bell') + '"></i></div><div class="notifikasi-content">' + content + '</div><button class="notifikasi-close">&times;</button><div class="notifikasi-progress" style="animation-duration:' + Math.max(duration / 1000, 0.1) + 's"></div>';
  container.prepend(notif);
  requestAnimationFrame(function () { notif.classList.add('show'); });
  notif.querySelector('.notifikasi-close').addEventListener('click', function (e) { e.stopPropagation(); notif.classList.add('hiding'); setTimeout(function () { notif.remove(); }, 250); });
  if (duration > 0) {
    setTimeout(function () { if (notif.parentNode) { notif.classList.add('hiding'); setTimeout(function () { notif.remove(); }, 250); } }, duration);
  }
}

// ── Notifikasi Tunggal untuk Masa Aktif Habis (CENTER) ──
// Hanya muncul ketika masa aktif benar-benar habis dan akun dinonaktifkan
// Bentuk/ukuran/posisi/desain/animasi Notification Center tidak diubah, hanya isi teks dan text-align:center
const EXPIRED_SINGLE_MSG = 'MASA AKTIF AKUN TELAH HABIS. LAKUKAN PEMBAYARAN UNTUK MEMPERPANJANG MASA AKTIF ATAU AKUN AKAN DINONAKTIFKAN OTOMATIS. HUBUNGI ADMINISTRATOR.';
function showExpiredNotification() {
  const esc = EXPIRED_SINGLE_MSG.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const centeredHtml = '<div class="notifikasi-message" style="text-align:center">' + esc + '</div>';
  showNotification({ type: 'warning', html: centeredHtml, duration: 5000 });
}

function showLoginTransition(user) {
  if (!loginTransition) return;

  const userLabel = user?.nama
    ? user.nama.toUpperCase()
    : user?.username
      ? user.username.toUpperCase()
      : 'PENGGUNA';

  if (loginTransitionUser) {
    loginTransitionUser.textContent = userLabel;
  }

  if (loginTransitionText) {
    loginTransitionText.textContent =
      user?.role === 'superadmin'
        ? 'Menyiapkan Dashboard Admin...'
        : 'Memuat Dashboard...';
  }

  loginTransition.classList.add('is-active');
  loginTransition.setAttribute('aria-hidden', 'false');
  document.body.classList.add('transition-lock');
}

function hideLoginTransition() {
  if (!loginTransition) return;

  loginTransition.classList.remove('is-active');
  loginTransition.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('transition-lock');
}

function showLogoutTransition(user) {
  if (!logoutTransition) return;

  const userLabel = user?.nama
    ? user.nama.toUpperCase()
    : user?.username
      ? user.username.toUpperCase()
      : 'PENGGUNA';

  if (logoutTransitionUser) {
    logoutTransitionUser.textContent = userLabel;
  }

  if (logoutTransitionText) {
    logoutTransitionText.textContent =
      user?.role === 'superadmin'
        ? 'Menutup Sesi Admin...'
        : 'Mengakhiri Sesi...';
  }

  logoutTransition.classList.add('is-active');
  logoutTransition.setAttribute('aria-hidden', 'false');
  document.body.classList.add('transition-lock');
}

function hideLogoutTransition() {
  if (!logoutTransition) return;

  logoutTransition.classList.remove('is-active');
  logoutTransition.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('transition-lock');
}

async function openDashboardWithTransition(user) {
  showLoginTransition(user);

  try {
    await wait(700);

    document.body.classList.remove('login-bg');
    document.body.classList.add('app-bg');

    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';

    setHeaderIdentity(user);
    startAppIntervals();
    loadAppData();
    setDashboardView(currentDashboardView || 'overview');
    renderOverviewStats();

    await wait(350);
  } catch (err) {
    // Jangan biarkan overlay menutupi layar kalau terjadi error
    console.error('❌ Gagal membuka dashboard:', err);
    showNotification({ type: 'error', message: 'Terjadi kesalahan saat memuat dashboard.' });
  } finally {
    hideLoginTransition();
  }
}
async function login() {
  const idInput = document.getElementById('loginId').value.trim();
  const passwordInput = document.getElementById('loginPassword').value.trim();
  const kodeVerif = document.getElementById('kodeVerif').value.trim();

  if (!idInput || !passwordInput || !kodeVerif) {
    showNotification({ type: 'warning', message: 'Lengkapi username, password, dan kode verifikasi.' });
    return;
  }

  // 0️⃣ Validasi Kode Verifikasi (UI only)
  if (kodeVerif.toUpperCase() !== kodeVerifikasiGlobal.toUpperCase()) {
    showNotification({ type: 'warning', message: 'Kode verifikasi salah. Coba lagi.' });
    kodeVerifikasiGlobal = generateKodeVerifikasi();
    document.getElementById('kodeVerif').value = '';
    renderKodeVerifikasi();
    return;
  }

  // 🔒 Akun SUPERADMIN legacy dinonaktifkan. Hanya ELDHI yang valid sebagai Superadmin.
  if (idInput.toUpperCase() === 'SUPERADMIN') {
    showNotification({ type: 'error', message: 'Username atau password salah.' });
    return;
  }

  // ── PRIORITAS 1: Login via API ──────────────────────────
  let apiSuccess = false;
  let apiUser = null;
  let apiErrorCode = null;

  try {
    const r = await apiLogin(idInput, btoa(passwordInput));
    console.log('🔍 LOGIN: API responded, ok=' + r.ok + ', status=' + r.status + ', code=' + (r.data?.code || 'none'));
    if (r.ok && r.data?.success && r.data?.user) {
      apiSuccess = true;
      apiUser = r.data.user;
      apiUser.createdAt = apiUser.created_at || apiUser.createdAt;
      apiUser.masaAktifHari = apiUser.masa_aktif_hari || apiUser.masaAktifHari;

      saveUserPasswordLocally(idInput, btoa(passwordInput));

      const users = await syncUsersFromServer();
      if (users) {
        localStorage.setItem('userDatabase_cache', JSON.stringify(users));
      }

      console.log('✅ Login via API: ' + apiUser.username + ' (' + apiUser.role + ')');
    } else if (r.data?.code === 'USERNAME_NOT_FOUND') {
      showNotification({ type: 'error', message: 'Username salah. Coba lagi.' });
      return;
    } else if (r.data?.code === 'WRONG_PASSWORD') {
      apiErrorCode = 'WRONG_PASSWORD';
      console.log('🔍 LOGIN: API said WRONG_PASSWORD, akan fallback ke lokal');
    } else if (r.data?.code === 'ACCOUNT_DISABLED') {
      // Akun nonaktif (manual) — satu notifikasi saja (center)
      showExpiredNotification();
      return;
    } else if (r.data?.code === 'EXPIRED') {
      // Masa aktif habis — satu notifikasi saja (center)
      showExpiredNotification();
      return;
    } else {
      console.warn('API login error:', r.data);
    }
  } catch (e) {
    console.warn('🔍 LOGIN: API call threw:', e.message);
  }

  // ── PRIORITAS 2: Fallback ke localStorage ──
  if (!apiSuccess) {
    let user = null;
    try {
      user = getUser(idInput);
    } catch (e) {
      console.warn('🔍 LOGIN: getUser threw:', e.message);
    }
    if (!user) {
      if (apiErrorCode === 'WRONG_PASSWORD') {
        showNotification({ type: 'error', message: 'Password salah. Coba lagi.' });
      } else {
        showNotification({ type: 'error', message: 'Username salah. Coba lagi.' });
      }
      return;
    }
    if (!user.active) {
      // Bedakan: nonaktif karena masa aktif habis vs nonaktif manual (admin)
      const cAt = user.createdAt || user.created_at;
      const mHari = user.masaAktifHari || user.masa_aktif_hari || 30;
      let isExpired = false;
      if (cAt) {
        const cDate = new Date(cAt);
        const eDate = new Date(cDate.getTime() + (mHari * 24 * 60 * 60 * 1000));
        isExpired = new Date() >= eDate;
      }
      if (isExpired) {
        // Masa aktif habis — satu notifikasi saja (center)
        showExpiredNotification();
      } else {
        // Dinonaktifkan manual — satu notifikasi saja (center) — sama
        showExpiredNotification();
      }
      return;
    }
    const encodedInput = btoa(passwordInput);
    if (user.password !== encodedInput) {
      showNotification({ type: 'error', message: 'Password salah. Coba lagi.' });
      return;
    }
    // Fallback offline: cek masa aktif juga untuk akun yang masih aktif
    const cAt2 = user.createdAt || user.created_at;
    const mHari2 = user.masaAktifHari || user.masa_aktif_hari || 30;
    if (cAt2) {
      const cDate2 = new Date(cAt2);
      const eDate2 = new Date(cDate2.getTime() + (mHari2 * 24 * 60 * 60 * 1000));
      if (new Date() >= eDate2) {
        try {
          const usersRaw = localStorage.getItem('userDatabase');
          if (usersRaw) {
            const usersArr = JSON.parse(usersRaw);
            const idx = usersArr.findIndex(u => String(u.username).toUpperCase() === String(user.username).toUpperCase());
            if (idx >= 0) { usersArr[idx].active = false; localStorage.setItem('userDatabase', JSON.stringify(usersArr)); }
          }
          const cacheRaw = localStorage.getItem('userDatabase_cache');
          if (cacheRaw) {
            const cacheArr = JSON.parse(cacheRaw);
            const cIdx = cacheArr.findIndex(u => String(u.username).toUpperCase() === String(user.username).toUpperCase());
            if (cIdx >= 0) { cacheArr[cIdx].active = false; localStorage.setItem('userDatabase_cache', JSON.stringify(cacheArr)); }
          }
        } catch (e) {}
        showExpiredNotification();
        return;
      }
    }
    apiUser = user;
    console.log('⚠️ Login via localStorage (fallback)');
  }

  // ── Login berhasil ──
  localStorage.setItem('currentUser', JSON.stringify(apiUser));
  await openDashboardWithTransition(apiUser);
  kodeVerifikasiGlobal = generateKodeVerifikasi();
}
function setHeaderIdentity(user) {
  if (!user) return;

  const nameEl = document.getElementById('headerUserName');
  const roleEl = document.getElementById('headerUserRole');

  const namaUser = user.nama ? user.nama.toUpperCase() : user.username.toUpperCase();
  const roleRaw = String(user.role || 'user').toLowerCase();
  const roleLabel = roleRaw === 'superadmin' ? 'SUPERADMIN' : (roleRaw === 'admin' ? 'ADMIN' : 'USER');
  const roleClass = (roleRaw === 'superadmin' || roleRaw === 'admin') ? 'is-superadmin' : 'is-user';

  if (nameEl) {
    nameEl.textContent = namaUser;
  }

  if (roleEl) {
    roleEl.textContent = roleLabel;
    roleEl.classList.remove('is-superadmin', 'is-user');
    roleEl.classList.add(roleClass);
  }

  const resetBtn = document.getElementById('dropdownResetPassword');
  if (resetBtn) {
    resetBtn.style.display = (roleRaw === 'superadmin') ? '' : 'none';
  }
  const notifBtn = document.getElementById('dropdownNotifikasi');
  if (notifBtn) {
    notifBtn.style.display = (roleRaw === 'superadmin') ? '' : 'none';
    if (roleRaw === 'superadmin') {
      setTimeout(function() { if (typeof updateNotifBadge === 'function') updateNotifBadge(); }, 100);
    }
  }
}
function logout() {
  showConfirmModal({
    title: 'Konfirmasi Logout',
    message: 'Yakin ingin logout dari sistem?',
    confirmText: 'LOGOUT',
    cancelText: 'BATAL',
    confirmClass: 'confirm-modal-btn--primary',
    iconClass: 'fa-sign-out-alt',
    onConfirm: function () {
      const currentUser = getCurrentUser() || { username: 'PENGGUNA', role: 'user' };

      showLogoutTransition(currentUser);
      stopAppIntervals();
      stopCountdownTimers();

      setTimeout(function () {
        // ========== HAPUS SEMUA DATA SAAT LOGOUT ==========
        if (currentUser.username !== 'PENGGUNA') {
          localStorage.removeItem('appData_' + currentUser.username);
        }
        localStorage.removeItem('appDataTable');  // ← Hapus juga backup lama
        // ================================================

        dataTable = [];
        allDataTable = [];
        // ==============================================

        localStorage.removeItem('currentUser');

        // Update kode verifikasi
        kodeVerifikasiGlobal = generateKodeVerifikasi();
        renderKodeVerifikasi();
        document.getElementById('kodeVerif').value = '';

        // Reset UI
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('loginForm').reset();
        hideLoginTransition();
        document.getElementById('userManagementBtn')?.remove();
        document.getElementById('userManagementModal')?.remove();

        renderTable();
        document.body.classList.add('login-bg');
        document.body.classList.remove('app-bg');

        hideLogoutTransition();
      }, 1050);
    }
  });
}
function loadAppData() {
  const currentUser = getCurrentUser();
  
  if (!currentUser) return;
  
  // SuperAdmin tidak punya data aplikasi sendiri
  if (currentUser.username === 'ELDHI') {
    console.log('📊 SuperAdmin - Tidak memuat data');
    return;
  }
  
  // 🔄 PERBAIKAN: Muat data dari localStorage (dengan penjagaan parse)
  const savedData = localStorage.getItem('appData_' + currentUser.username);
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      allDataTable = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('⚠️ Data localStorage rusak, reset:', err);
      allDataTable = [];
    }
    console.log('📊 Data dimuat:', allDataTable.length, 'record');
  } else {
    allDataTable = [];
    console.log('📊 Tabel kosong - siap untuk import JSON');
  }
  
  applySearchAndSort();
}
function updateDateTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (3600000 * 7));

  const hariArray = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanArray = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const bulanArrayID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const hari = hariArray[wibTime.getDay()];
  const tanggalAngka = wibTime.getDate();
  const namaBulan = bulanArray[wibTime.getMonth()];
  const thn = wibTime.getFullYear();

  const tgl = String(wibTime.getDate()).padStart(2, '0');
  const bln = String(wibTime.getMonth() + 1).padStart(2, '0');

  const jam = String(wibTime.getHours()).padStart(2, '0');
  const menit = String(wibTime.getMinutes()).padStart(2, '0');
  const detik = String(wibTime.getSeconds()).padStart(2, '0');

  const fullDate = `${tanggalAngka} ${namaBulan} ${thn}`;
  const fullTime = `${jam}:${menit}:${detik}`;

  const headerDay = document.getElementById('headerDay');
  if (headerDay) headerDay.textContent = hari.toUpperCase();
  document.getElementById('headerDate').textContent = `${tgl} ${bulanArrayID[wibTime.getMonth()].toUpperCase()} ${thn}`;
  document.getElementById('headerTime').textContent = `${jam}:${menit} WIB`;

  const summaryDay = document.getElementById('summaryDay');
  const summaryDate = document.getElementById('summaryDate');
  const summaryTime = document.getElementById('summaryTime');

  if (summaryDay) summaryDay.textContent = hari;
  if (summaryDate) summaryDate.textContent = fullDate;
  if (summaryTime) summaryTime.textContent = fullTime;
}
    let dataTable = [];
    let allDataTable = [];
    let currentSearch = '';
    let currentPage = 1;
    const rowsPerPage = 50;
    let currentDashboardView = 'overview';
    let editingIndex = -1;

function setDashboardView(view) {
  currentDashboardView = view || 'overview';

  document.querySelectorAll('[data-view-group]').forEach(section => {
    const groups = (section.dataset.viewGroup || '')
      .split(' ')
      .map(item => item.trim())
      .filter(Boolean);

    const shouldShow = groups.includes(currentDashboardView);
    section.classList.toggle('view-hidden', !shouldShow);
  });

  document.querySelectorAll('[data-view]').forEach(link => {
    const linkView = link.dataset.view === 'user' ? 'kelola-user' : link.dataset.view;
    link.classList.toggle('active', linkView === currentDashboardView);
  });

  const dashboardStage = document.querySelector('.dashboard-stage');
  if (dashboardStage) {
    dashboardStage.classList.remove('stage-overview', 'stage-input', 'stage-data', 'stage-manifest', 'stage-kelola-user');
    dashboardStage.classList.add(`stage-${currentDashboardView}`);
  }

  // Penanda view pada shell (dipakai CSS mobile utk sembunyikan header identitas di tab non-overview)
  const dashboardShell = document.querySelector('.dashboard-shell');
  if (dashboardShell) {
    dashboardShell.classList.remove('shell-view-overview', 'shell-view-input', 'shell-view-data', 'shell-view-manifest', 'shell-view-kelola-user');
    dashboardShell.classList.add(`shell-view-${currentDashboardView}`);
  }

  const mobileToggle = document.getElementById('mobileNavToggle');
  if (mobileToggle) mobileToggle.checked = false;

  // Handle Kelola User tab visibility and content
  const currentUser = getCurrentUser();
  const sidebarKelolaUser = document.getElementById('sidebarKelolaUser');
  const mobileKelolaUser = document.getElementById('mobileKelolaUser');
  const kelolaUserPanel = document.getElementById('kelolaUserPanel');
  const kelolaUserContent = document.getElementById('kelolaUserContent');

  if (currentUser && currentUser.role === 'superadmin') {
    if (sidebarKelolaUser) sidebarKelolaUser.style.display = 'flex';
    if (mobileKelolaUser) mobileKelolaUser.style.display = 'flex';
    if (kelolaUserPanel) kelolaUserPanel.style.display = 'block';
    
    // Populate user management content when tab is selected
    if (currentDashboardView === 'kelola-user' && kelolaUserContent) {
      syncUsersFromServer().then(() => {
        renderUserManagementContent(kelolaUserContent);
      }).catch(() => {
        renderUserManagementContent(kelolaUserContent);
      });
    }
  } else {
    if (sidebarKelolaUser) sidebarKelolaUser.style.display = 'none';
    if (mobileKelolaUser) mobileKelolaUser.style.display = 'none';
    if (kelolaUserPanel) kelolaUserPanel.style.display = 'none';
    
    // Redirect if non-superadmin tries to access
    if (currentDashboardView === 'kelola-user') {
      setDashboardView('overview');
    }
  }

  // 🔄 Nav bawah pakai flexbox: link tersembunyi otomatis tidak meninggalkan space.
  // (CSS di @media max-width:640px sudah display:flex + .bottom-nav-link flex:1 1 0)
  const mobileNav = document.querySelector('.mobile-bottom-nav');
  if (mobileNav) {
    const isSuperadmin = !!(currentUser && currentUser.role === 'superadmin');
    mobileNav.classList.toggle('nav-compact-four', !isSuperadmin);
  }
}

function applyViewFromHash() {
  const allowedViews = ['overview', 'input', 'data', 'manifest', 'kelola-user'];
  let hashView = (window.location.hash || '#overview').replace('#', '').trim().toLowerCase();
  
  // Map 'user' hash to 'kelola-user' view (for backward compatibility with HTML links)
  if (hashView === 'user') hashView = 'kelola-user';
  
  const nextView = allowedViews.includes(hashView) ? hashView : 'overview';
  setDashboardView(nextView);
}

function initDashboardNavigation() {
  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', function(event) {
      const nextView = this.dataset.view || 'overview';
      if (window.location.hash === `#${nextView}`) {
        event.preventDefault();
        setDashboardView(nextView);
      }
    });
  });
}
function saveAppData() {
  const currentUser = getCurrentUser();
  
  // SuperAdmin tidak menyimpan data
  if (!currentUser || currentUser.username === 'ELDHI') return;
  
  localStorage.setItem('appData_' + currentUser.username, JSON.stringify(allDataTable));
}
function clearForm() {
      document.getElementById('dataForm').reset();
      resetEditMode();
    }
async function addData() {
      const photoFile = document.getElementById('photoInput').files[0];
      const name = document.getElementById('name').value.trim();
      const passport = document.getElementById('passport').value.trim();
      const debtRpRaw = document.getElementById('debtRp').value.trim();
      const debtRmRaw = document.getElementById('debtRm').value.trim();
      const debtBosRaw = document.getElementById('debtBos').value.trim();
      const statusBayar = document.getElementById('statusBayar').value;
      const tanggalMasuk = document.getElementById('tanggalMasuk').value;
      const tujuan = document.getElementById('tujuan').value;
      const keterangan = document.getElementById('keterangan').value.trim();

      if (!name || !passport || !tanggalMasuk || !tujuan || !statusBayar) {
        showNotification({ type: 'warning', message: 'Lengkapi data penumpang terlebih dahulu.' });
        return;
      }

      const debtRp = parseFloat(debtRpRaw.replace(/[^\d.-]/g, '')) || 0;
      const debtRm = parseFloat(debtRmRaw.replace(/[^\d.-]/g, '')) || 0;
      const debtBos = parseFloat(debtBosRaw.replace(/[^\d.-]/g, '')) || 0;

	let photoBase64 = '';

if (photoFile) {
  photoBase64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(photoFile);
  });
}	

const tanggalLahir = document.getElementById('tanggalLahir').value;

const newData = {
  name,
  passport,
  debtRp,
  debtRm,
  debtBos,
  statusBayar,
  tanggalMasuk,
  tujuan,
  keterangan,
  tanggalLahir: tanggalLahir || '',  // ← TAMBAHKAN
  photo: photoBase64
};

      const isEdit = editingIndex !== -1;
      if (isEdit) {
        allDataTable.splice(editingIndex, 0, newData);
        editingIndex = -1;
      } else {
        allDataTable.push(newData);
      }
      sortMasterData();
      resetDerivedCaches();
      applySearchAndSort({ updateOverview: true });
      clearForm();
      const btn = document.getElementById('submitBtn');
      if (btn) btn.textContent = 'Tambah Data';
      showNotification({ type: 'success', message: isEdit ? 'Data berhasil diperbarui.' : 'Data berhasil ditambahkan.' });
    }
function resetEditMode() {
  editingIndex = -1;
  const btn = document.getElementById('submitBtn');
  if (btn) btn.textContent = 'Tambah Data';
}

function editData(index) {
  if (index < 0 || index >= dataTable.length) return;
  const data = dataTable[index];

  document.getElementById('name').value = data.name;
  document.getElementById('passport').value = data.passport;
  document.getElementById('debtRp').value = data.debtRp;
  document.getElementById('debtRm').value = data.debtRm;
  document.getElementById('debtBos').value = data.debtBos || '';
  document.getElementById('statusBayar').value = data.statusBayar || '';
  document.getElementById('tanggalMasuk').value = data.tanggalMasuk;
  document.getElementById('tujuan').value = data.tujuan;
  document.getElementById('keterangan').value = data.keterangan;
  document.getElementById('tanggalLahir').value = data.tanggalLahir || '';

  const allIndex = allDataTable.indexOf(data);
  if (allIndex > -1) {
    editingIndex = allIndex;
    allDataTable.splice(allIndex, 1);
  }

  setDashboardView('input');
  const btn = document.getElementById('submitBtn');
  if (btn) btn.textContent = 'Update Data';
}
let searchTimeout;
function showConfirmModal({ title, message, onConfirm, confirmText, cancelText, confirmClass, iconClass }) {
  const overlay = document.getElementById('confirmModal');
  const textEl = document.getElementById('confirmModalText');
  const titleEl = document.getElementById('confirmModalTitle');
  const iconEl = document.querySelector('#confirmModal .confirm-modal-icon i');
  const confirmBtn = document.getElementById('confirmModalConfirm');
  const cancelBtn = document.getElementById('confirmModalCancel');
  if (!overlay || !textEl) return;
  if (title) titleEl.textContent = title;
  textEl.textContent = message;
  if (iconEl) {
    if (iconClass) { iconEl.className = 'fas ' + iconClass; } else { iconEl.className = 'fas fa-exclamation-triangle'; }
  }
  if (confirmText) confirmBtn.textContent = confirmText;
  if (cancelText) cancelBtn.textContent = cancelText;
  confirmBtn.className = 'confirm-modal-btn ' + (confirmClass || 'confirm-modal-btn--danger');
  overlay.style.display = 'flex';
  overlay.style.opacity = 0;
  requestAnimationFrame(function () { overlay.style.opacity = 1; overlay.style.transition = 'opacity 0.15s'; });
  function cleanup() {
    overlay.style.display = 'none';
    overlay.style.opacity = '';
    overlay.style.transition = '';
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  }
  function handleConfirm() { cleanup(); if (onConfirm) onConfirm(); }
  function handleCancel() { cleanup(); }
  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
}

function deleteData(index) {
      if (index < 0 || index >= dataTable.length) return;
      const item = dataTable[index];
      showConfirmModal({
        title: 'Konfirmasi Penghapusan',
        message: 'Yakin ingin menghapus data ini?',
        onConfirm: function () {
          const allIndex = allDataTable.indexOf(item);
          if (allIndex > -1) allDataTable.splice(allIndex, 1);
          resetDerivedCaches();
          applySearchAndSort({ updateOverview: true });
        }
      });
    }
function toggleStatus(index) {
  const data = dataTable[index];
  if (!data) return;
  data.statusBayar = data.statusBayar === 'Belum' ? 'Sudah' : 'Belum';
  const allIndex = allDataTable.findIndex(item => item === data);
  if (allIndex !== -1) allDataTable[allIndex].statusBayar = data.statusBayar;
  resetDerivedCaches();
  renderTable();
  renderOverviewStats();
}
function searchData() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentSearch = document.getElementById('searchInput').value.trim().toLowerCase();
    currentPage = 1;
    applySearchAndSort();
  }, 300);
}
function applySearchAndSort(options = {}) {
  const { resetPage = true, updateOverview = false } = options;

  if (!currentSearch) {
    dataTable = [...allDataTable];
  } else {
    dataTable = allDataTable.filter(data => getSearchIndex(data).includes(currentSearch));
  }

  if (resetPage) currentPage = 1;
  renderTable();
  if (updateOverview) renderOverviewStats();
}
function updateTotals() {
  if (!totalsCache) {
    totalsCache = allDataTable.reduce((acc, item) => {
      if (item.statusBayar !== 'Belum') return acc;

      acc.totalRp += parseFloat(String(item.debtRp).replace(/[^\d.-]/g, '')) || 0;
      acc.totalRm += parseFloat(item.debtRm) || 0;
      acc.totalBos += parseFloat(item.debtBos) || 0;
      return acc;
    }, { totalRp: 0, totalRm: 0, totalBos: 0 });
  }

  document.getElementById('totalRp').textContent = `RP ${totalsCache.totalRp.toLocaleString('id-ID')}`;
  document.getElementById('totalRm').textContent = `RM ${totalsCache.totalRm.toLocaleString('id-ID')}`;
  document.getElementById('totalBos').textContent = `${totalsCache.totalBos.toLocaleString('id-ID')}`;
}
function getWIBDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7));
  const y = wib.getFullYear();
  const m = String(wib.getMonth() + 1).padStart(2, '0');
  const d = String(wib.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
function getWIBDateObj() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 7));
}
function formatDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
let manifestHistoryCache = null;
function getManifestHistory() {
  if (!manifestHistoryCache) {
    manifestHistoryCache = JSON.parse(localStorage.getItem('manifestHistory') || '[]');
  }
  return manifestHistoryCache;
}
function saveManifestHistory() {
  localStorage.setItem('manifestHistory', JSON.stringify(manifestHistoryCache));
}
function initManifestHistory() {
  if (!localStorage.getItem('manifestHistory')) {
    localStorage.setItem('manifestHistory', JSON.stringify([]));
  }
  manifestHistoryCache = JSON.parse(localStorage.getItem('manifestHistory') || '[]');
}
function recordManifestUpload() {
  getManifestHistory().push({ date: getWIBDate(), type: 'upload' });
  saveManifestHistory();
}
function recordManifestProcess() {
  getManifestHistory().push({ date: getWIBDate(), type: 'process' });
  saveManifestHistory();
}
function normalizeTanggalMasuk(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const p = dateStr.split('-');
    return p[2] + '-' + p[1] + '-' + p[0];
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const p = dateStr.split('/');
    return p[2] + '-' + p[1] + '-' + p[0];
  }
  return dateStr;
}
function renderOverviewStats() {
  const totalPassengers = allDataTable.length;

  const kukupCount = allDataTable.filter(function(d) {
    const t = String(d.tujuan || '').toUpperCase();
    return t.includes('KUKUP');
  }).length;
  const johorCount = allDataTable.filter(function(d) {
    const t = String(d.tujuan || '').toUpperCase();
    return t.includes('JOHOR');
  }).length;

  const summaryKukup = document.getElementById('statsSummaryKukup');
  const summaryJohor = document.getElementById('statsSummaryJohor');
  if (summaryKukup) summaryKukup.textContent = kukupCount;
  if (summaryJohor) summaryJohor.textContent = johorCount;

  const totalEl = document.getElementById('statsTotalPassenger');
  if (totalEl) totalEl.textContent = totalPassengers;

  renderChart();
}
function renderChart() {
  const chartEl = document.getElementById('overviewPassengerChart');
  if (!chartEl) return;

  const activeSeries = [];
  document.querySelectorAll('#chartFilters .chart-filter-label').forEach(label => {
    const cb = label.querySelector('input[type="checkbox"]');
    if (cb && cb.checked) {
      activeSeries.push(label.dataset.series);
    }
  });

  const seriesConfig = {
    kukup: { color: '#2F5BFF', label: 'KUKUP' },
    johor: { color: '#7C4DFF', label: 'JOHOR' }
  };

  const yearMap = {};
  allDataTable.forEach(item => {
    const nd = normalizeTanggalMasuk(item.tanggalMasuk);
    if (!nd) return;
    const year = nd.substring(0, 4);
    if (!year || isNaN(year)) return;
    if (!yearMap[year]) yearMap[year] = { kukup: 0, johor: 0 };
    const t = String(item.tujuan || '').toUpperCase();
    if (t.includes('KUKUP')) yearMap[year].kukup++;
    else if (t.includes('JOHOR')) yearMap[year].johor++;
  });

  const years = Object.keys(yearMap).sort();
  if (years.length === 0) {
    chartEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:180px;font-size:0.88rem;font-weight:700;color:#64748b;">Belum ada data tahunan.</div>';
    return;
  }

  const data = years.map(y => {
    return { label: y, kukup: yearMap[y].kukup, johor: yearMap[y].johor };
  });

  const mobileLite = isMobileViewport();
  const width = 760;
  const height = mobileLite ? 200 : 240;
  const padX = mobileLite ? 40 : 48;
  const padTop = mobileLite ? 18 : 22;
  const padBottom = mobileLite ? 42 : 46;
  const baseY = height - padBottom;
  const chartH = height - padTop - padBottom;
  const effectiveW = width - padX * 2;

  const allValues = [];
  activeSeries.forEach(s => {
    data.forEach(d => { allValues.push(d[s]); });
  });
  allValues.push(1);
  const maxValue = Math.max.apply(null, allValues);

  const stepX = data.length > 1 ? effectiveW / (data.length - 1) : 0;

  function makeLine(vals) {
    if (vals.length === 0) return '';
    const pts = vals.map((v, i) => ({ x: padX + stepX * i, y: baseY - (v / maxValue) * chartH }));
    if (pts.length === 1) return 'M ' + pts[0].x + ' ' + pts[0].y;
    let path = 'M ' + pts[0].x + ' ' + pts[0].y;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ' C ' + cpx + ' ' + prev.y + ', ' + cpx + ' ' + curr.y + ', ' + curr.x + ' ' + curr.y;
    }
    return path;
  }

  let niceMax = Math.ceil(maxValue / 500) * 500;
  if (niceMax < 500) niceMax = 500;

  const gridSteps = 5;
  let gridMarkup = '';
  for (let gi = 0; gi < gridSteps; gi++) {
    const ratio = gi / (gridSteps - 1);
    const val = Math.round(niceMax - niceMax * ratio);
    const y = padTop + chartH * ratio;
    gridMarkup += '<line class="chart-grid-line" x1="' + padX + '" y1="' + y + '" x2="' + (width - padX) + '" y2="' + y + '"/><text class="chart-grid-label" x="' + (padX - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + val + '</text>';
  }

  let xLabels = '';
  const labelInterval = data.length > 8 ? Math.ceil(data.length / 7) : 1;
  for (let xi = 0; xi < data.length; xi++) {
    const x = padX + stepX * xi;
    if (xi % labelInterval === 0 || xi === data.length - 1) {
      xLabels += '<text class="chart-axis-label" x="' + x + '" y="' + (baseY + 18) + '" text-anchor="middle">' + data[xi].label + '</text>';
    }
  }

  let defsMarkup = '';
  let seriesMarkup = '';
  let dotsMarkup = '';
  let valueLabelsMarkup = '';
  let hasData = false;

  activeSeries.forEach(s => {
    const cfg = seriesConfig[s];
    const vals = data.map(d => d[s]);
    const linePath = makeLine(vals);
    if (vals.some(v => v > 0)) hasData = true;

    const gradId = 'grad_' + s;
    defsMarkup += '<linearGradient id="' + gradId + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="' + cfg.color + '"/><stop offset="100%" stop-color="' + cfg.color + '"/></linearGradient>';

    seriesMarkup += '<path d="' + linePath + '" fill="none" stroke="url(#' + gradId + ')" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';

    const pts = vals.map((v, i) => ({ x: padX + stepX * i, y: baseY - (v / maxValue) * chartH }));
    pts.forEach((p, i) => {
      if (vals[i] > 0) {
        dotsMarkup += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3.5" fill="' + cfg.color + '" stroke="#fff" stroke-width="2"/>';
        valueLabelsMarkup += '<text class="chart-value-label" x="' + p.x + '" y="' + (p.y - 9) + '" text-anchor="middle" fill="' + cfg.color + '">' + vals[i] + '</text>';
      }
    });
  });

  if (!hasData) {
    chartEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:180px;font-size:0.88rem;font-weight:700;color:#64748b;">Belum ada data untuk ditampilkan.</div>';
    return;
  }

  chartEl.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs>' + defsMarkup + '</defs>' + gridMarkup + seriesMarkup + dotsMarkup + valueLabelsMarkup + xLabels + '</svg>';
}
function initChartEvents() {
  document.querySelectorAll('#chartFilters .chart-filter-label input[type="checkbox"]').forEach(function(cb) {
    cb.addEventListener('change', renderChart);
  });
}
function renderTable() {
  const tbody = document.querySelector('#dataTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const paginatedData = getPaginatedData();
  const searchLower = currentSearch.toLowerCase();

  if (paginatedData.length === 0) {
    tbody.innerHTML = `<tr class="no-data-row"><td colspan="12">Data tidak ditemukan.</td></tr>`;
    updateTotals();
    document.getElementById('pageInfo').textContent = 'Halaman 1 / 1';
    return;
  }

  const rowsMarkup = paginatedData.map((data, index) => {
    const realIndex = (currentPage - 1) * rowsPerPage + index;
    const nameHTML = highlightMatch(data.name, searchLower);
    const passportHTML = highlightMatch(data.passport || '', searchLower);
    const tujuanHTML = highlightMatch(data.tujuan || '', searchLower);
    const debtRp = data.debtRp ? Number(data.debtRp).toLocaleString('id-ID') : '0';
    const debtRm = data.debtRm ? Number(data.debtRm).toLocaleString('id-ID') : '0';
    const debtBos = data.debtBos ? Number(data.debtBos).toLocaleString('id-ID') : '0';
    const statusBayar = data.statusBayar || 'Belum';
    const statusClass = statusBayar === 'Belum' ? 'status-belum' : 'status-sudah';
    const rowClass = statusBayar === 'Belum' ? 'row-belum' : 'row-sudah';

    return `
      <tr class="${rowClass}">
      <td data-label="No">${(currentPage - 1) * rowsPerPage + index + 1}</td>
      <td data-label="Nama" title="${escapeHtml(data.name || '')}">${nameHTML}</td>
      <td data-label="Passport">${passportHTML}</td>
      <td data-label="RP">${debtRp}</td>
      <td data-label="RM">${debtRm}</td>
      <td data-label="Uang Bos">${debtBos}</td>
      <td data-label="S/B"><button class="status-btn ${statusClass}" onclick="toggleStatus(${realIndex})">${statusBayar}</button></td>
      <td data-label="Masuk">${formatDate(data.tanggalMasuk)}</td>
      <td data-label="Lahir">${data.tanggalLahir ? formatDate(data.tanggalLahir) : '-'}</td>
      <td data-label="Tujuan">${tujuanHTML}</td>
      <td data-label="Keterangan"><input type="text" class="ket-input" value="${escapeHtml(data.keterangan)}" oninput="updateKet(${realIndex}, this.value)" /></td>
      <td data-label="Aksi">
  <div class="table-action-group">
    <button onclick="editData(${realIndex})" class="ac-btn ac-edit" title="Edit"><i class="fas fa-pencil-alt ac-icon"></i><span class="ac-text">Edit</span></button>
    <button onclick="deleteData(${realIndex})" class="ac-btn ac-delete" title="Hapus"><i class="fas fa-trash-alt ac-icon"></i><span class="ac-text">Hapus</span></button>
    <button onclick="viewPhoto(${realIndex})" class="ac-btn ac-view" title="View"><i class="fas fa-eye ac-icon"></i><span class="ac-text">View</span></button>
  </div>
</td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsMarkup;

  updateTotals();
  const totalPages = Math.ceil(dataTable.length / rowsPerPage);
  document.getElementById('pageInfo').textContent = `Halaman ${currentPage} / ${totalPages || 1}`;
}
function nextPage() {
  const totalPages = Math.ceil(dataTable.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
}
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
}
function exportToJSON() {
  if (allDataTable.length === 0) {
    showNotification({ type: 'warning', message: 'Belum ada data untuk diekspor.' });
    return;
  }
  
  const currentUser = getCurrentUser();
  const dataStr = JSON.stringify(allDataTable, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  // Nama file sesuai user
  link.download = 'data_' + currentUser.username + '_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function importFromJSON(event) {
  const file = event.target.files[0];
  if (!file) {
    showNotification({ type: 'warning', message: 'Pilih file terlebih dahulu.' });
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      if (!Array.isArray(importedData)) {
        throw new Error('Format file tidak valid.');
      }
      
      // Validasi data
      let validData = true;
      for (const item of importedData) {
        if (!item.name || !item.passport || !item.tanggalMasuk || !item.tujuan || !item.statusBayar) {
          validData = false;
          break;
        }
      }
      
      if (!validData) {
        throw new Error('Data tidak lengkap.');
      }

      const applyImport = function () {
        allDataTable = importedData;
        sortMasterData();
        resetDerivedCaches();
        applySearchAndSort({ updateOverview: true });
        renderChart();
        document.getElementById('importFile').value = '';
        showNotification({ type: 'success', message: 'Berhasil mengimpor ' + importedData.length + ' data.' });
      };
      
      if (allDataTable.length > 0) {
        document.getElementById('importFile').value = '';
        showConfirmModal({
          title: 'Konfirmasi Import',
          message: 'Data saat ini (' + allDataTable.length + ' record) akan diganti. Lanjutkan import?',
          confirmText: 'Import',
          cancelText: 'Batal',
          confirmClass: 'confirm-modal-btn--primary',
          iconClass: 'fa-file-import',
          onConfirm: applyImport
        });
        return;
      }

      applyImport();
      
    } catch(err) {
      showNotification({ type: 'error', message: 'Gagal mengimpor data. Coba lagi.' });
    }
  };
  reader.readAsText(file);
}
function exportDatabase() {
  const users = getAllUsers();
  
  if (users.length === 0) {
    showNotification({ type: 'warning', message: 'Belum ada user untuk diekspor.' }); return;
  }
  
  const backupData = {
    type: 'MISS_ALL_SUNDAY_BACKUP',
    version: '1.0',
    createdAt: new Date().toISOString(),
    users: users,
    totalUser: users.length,
    info: 'Import file ini untuk restore data user'
  };
  
  const blob = new Blob([JSON.stringify(backupData, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'USER_DATABASE_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
    showNotification({ type: 'success', message: 'Database berhasil diekspor (' + users.length + ' user).' });
}
function importDatabase(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      // Validasi format backup
      if (data.type !== 'MISS_ALL_SUNDAY_BACKUP') {
        showNotification({ type: 'error', message: 'File backup tidak valid.' });
        return;
      }
      
      if (!data.users || !Array.isArray(data.users)) {
        showNotification({ type: 'error', message: 'Format file backup rusak.' });
        return;
      }
      
      const usersLama = getAllUsers().length;

      const applyImport = function () {
        // 🔐 KONVERSI PASSWORD KE BASE64 JIKA MASIH PLAIN TEXT
        const usersFixed = data.users.map(user => {
          // Deteksi apakah password sudah Base64 (valid base64 & decode kembali sama)
          let password = user.password;
          if (password) {
            try {
              const decoded = atob(password);
              // Jika decode berhasil DAN hasil decode != password asli, berarti sudah Base64
              // Jika decode gagal atau hasil decode == password asli (plain text yang valid base64), cek panjang
              if (decoded !== password && /^[A-Za-z0-9+/]+=*$/.test(password)) {
                // Sudah Base64, biarkan apa adanya
              } else {
                // Plain text → encode ke Base64
                password = btoa(password);
              }
            } catch (err) {
              // atob gagal = plain text → encode ke Base64
              password = btoa(password);
            }
          }
          return { ...user, password };
        });
        
        // ⏱️ SIMPAN KE CACHE LOKAL
        localStorage.setItem('userDatabase', JSON.stringify(usersFixed));
        localStorage.setItem('userDatabase_cache', JSON.stringify(usersFixed));
        
        // 🔄 SYNC KE SERVER (satu per satu)
        async function syncImportedUsers() {
          for (const user of usersFixed) {
            if (user.username && user.username !== 'ELDHI') {
              try {
                const r = await apiCreateUser({
                  username: user.username,
                  password: user.password,
                  nama: user.nama,
                  role: user.role,
                  active: user.active,
                  createdAt: user.createdAt
                });
                if (!r.ok && r.status !== 409) {
                  // Coba update jika sudah ada
                  await apiUpdateUser(user.username, {
                    password: user.password,
                    nama: user.nama,
                    role: user.role,
                    active: user.active,
                    createdAt: user.createdAt
                  });
                }
              } catch (e) {
                console.warn('Sync import user ' + user.username + ' gagal:', e.message);
              }
            }
          }
          // Refresh cache dari server
          try { await syncUsersFromServer(); } catch(e) { console.warn('Sync setelah import gagal:', e); }
        }
        syncImportedUsers();
        
        showNotification({ type: 'success', message: 'Database berhasil diimpor (' + usersFixed.length + ' user).' });
        
        // 💾 REFRESH TABLE - tanpa logout!
        // Hanya refresh data tabel pada tab Kelola User, jangan buat ulang komponen
        const container = document.getElementById('kelolaUserContent');
        if (container) {
          renderUserManagementContent(container);
        }
      };

      showConfirmModal({
        title: 'Konfirmasi Import',
        message: 'Data user saat ini (' + usersLama + ') akan diganti dengan ' + data.users.length + ' user dari file backup.',
        confirmText: 'Import',
        cancelText: 'Batal',
        confirmClass: 'confirm-modal-btn--primary',
        iconClass: 'fa-file-import',
        onConfirm: applyImport
      });
      
    } catch(err) {
      showNotification({ type: 'error', message: 'Gagal mengimpor database. Coba lagi.' });
    }
  };
  reader.readAsText(event.target.files[0]);
  event.target.value = '';
}




function renderUserManagementContent(container) {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'superadmin') {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">Hanya Superadmin yang dapat mengakses!</div>';
    return;
  }

  const users = getAllUsers();
  const hitungUser = users.filter(u => u.role === 'user').length;

  let html = `
        <div class="section-heading" style="margin-bottom:16px;">
      <div>
        <span class="section-kicker" style="color:#7C4DFF;">FORM MANAJEMEN PENGGUNA</span>
        <h3>TOOLBAR</h3>
      </div>
    </div>

    <div class="toolbar-row" style="display:flex;gap:10px;flex-wrap:nowrap;margin-bottom:18px;">
      <button type="button" onclick="exportDatabase()" class="user-theme-btn user-theme-btn--success">
        <i class="fas fa-download"></i> Ekspor DB
      </button>

      <label class="user-theme-btn user-theme-btn--warning" style="position:relative;">
        <i class="fas fa-upload"></i> Impor DB
        <input type="file" id="importDbFile" accept=".json" onchange="importDatabase(event)" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;">
      </label>
    </div>

    <div class="surface-card form-card" style="padding:20px;margin-bottom:18px;">
      <div class="section-heading" style="margin-bottom:12px;">
        <div>
          <span class="section-kicker" style="color:#16B57A;">Form Input</span>
          <h3 style="margin:6px 0 0;font-family:'Space Grotesk','Inter',sans-serif;font-size:1.06rem;font-weight:700;line-height:1.22;letter-spacing:0.03em;color:#141419;">TAMBAH USER BARU</h3>
        </div>
      </div>

      <form onsubmit="event.preventDefault(); prosesTambahUser();">
        <div class="form-grid two-col" style="display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr));">
          <div class="input-group" style="display:flex;flex-direction:column;gap:2px;">
            <label style="color:#141419;font-size:0.8rem;font-weight:700;">Username</label>
            <input type="text" id="newUsername" autocomplete="off" placeholder="Username" required style="min-height:42px;padding:0 12px;border-radius:10px;border:2px solid #141419;background:#FAF8F2;color:#141419;font-size:0.88rem;font-weight:500;box-shadow:3px 3px 0 #141419;">
          </div>
          <div class="input-group" style="display:flex;flex-direction:column;gap:2px;">
            <label style="color:#141419;font-size:0.8rem;font-weight:700;">Nama Lengkap</label>
            <input type="text" id="newNama" autocomplete="off" placeholder="Nama Lengkap" required style="min-height:42px;padding:0 12px;border-radius:10px;border:2px solid #141419;background:#FAF8F2;color:#141419;font-size:0.88rem;font-weight:500;box-shadow:3px 3px 0 #141419;">
          </div>
        </div>

        <div class="form-grid two-col" style="display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:8px;">
          <div class="input-group" style="display:flex;flex-direction:column;gap:2px;">
            <label style="color:#141419;font-size:0.8rem;font-weight:700;">Password</label>
            <input type="text" id="newPassword" autocomplete="off" placeholder="Password" required style="min-height:42px;padding:0 12px;border-radius:10px;border:2px solid #141419;background:#FAF8F2;color:#141419;font-size:0.88rem;font-weight:500;box-shadow:3px 3px 0 #141419;">
          </div>
          <div class="input-group" style="display:flex;flex-direction:column;gap:2px;">
            <label style="color:#141419;font-size:0.8rem;font-weight:700;">Role</label>
            <div class="user-form-role">USER</div>
          </div>
        </div>

        <button type="submit" class="user-theme-btn user-theme-btn--primary" style="margin-top:12px;width:100%;">
          <i class="fas fa-user-plus"></i> Tambah User
        </button>
      </form>
    </div>

    <div class="section-heading" style="margin-bottom:12px;">
      <div>
        <span class="section-kicker" style="color:#6B7280;">Data Tersimpan</span>
        <h3>DAFTAR USER (${hitungUser})</h3>
      </div>
    </div>

      <div class="table-container">
      <table class="user-management-table">
        <thead>
          <tr>
            <th scope="col">Username</th>
            <th scope="col">Nama</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th scope="col">Masa Aktif</th>
            <th scope="col">Garansi</th>
            <th scope="col">Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;

  users.forEach(function (user) {
    if (user.role === 'superadmin') return;
    const isCurrentUser = user.username === currentUser.username;

    const statusLabel = !user.active ? 'Nonaktif' : 'Aktif';
    const statusClass = !user.active ? 'is-off' : 'is-on';
    const roleClass = 'is-user';
    const roleLabel = 'USER';

    let masaAktifHTML = '';
    const countdownId = 'countdown_masa_' + user.username;
    const countdownId2 = 'countdown2_masa_' + user.username;

    if (!user.active) {
      masaAktifHTML = '<span class="user-expired-text">KEDALUWARSA</span>';
    } else {
      masaAktifHTML = `
        <div id="${countdownId}" class="user-countdown-main is-safe">Menghitung...</div>
        <div id="${countdownId2}" class="user-countdown-sub is-safe">-</div>
      `;
    }

    let kolOmGaransi = '';
    let kolOmAksi = '';
    const jsUsername = user.username.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

    if (isCurrentUser) {
      kolOmGaransi = '<span class="user-self-note">(Anda)</span>';
      kolOmAksi = '<span style="color:#666;">-</span>';
    } else {
      const garansiStatus = !!user.active;
      const garansiLabel = garansiStatus ? 'ON' : 'OFF';
      const garansiBg = garansiStatus ? '#6EE7B7' : '#FCA5A5';
      const garansiColor = garansiStatus ? '#065F46' : '#991B1B';
      kolOmGaransi = `
        <button type="button"
                onclick="perpanjangMasaAktif('${jsUsername}')"
                class="user-icon-btn user-icon-btn--primary"
                title="Perpanjang 30 Hari"><i class="fas fa-sync-alt"></i></button>
        <button type="button"
                onclick="toggleUserActive('${jsUsername}')"
                class="user-icon-btn"
                title="${garansiStatus ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}"
                style="background:${garansiBg};color:${garansiColor};">${garansiLabel}</button>
      `;

      kolOmAksi = `
        <div style="display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap;">
          <button type="button"
                  onclick="showResetPasswordForUser('${jsUsername}')"
                  class="user-icon-btn"
                  title="Reset Password"
                  style="background:#BFDBFE;color:#1E40AF;border:2px solid #1E40AF;"><i class="fas fa-key"></i></button>
          <button type="button"
                  onclick="hapusUserPermanent('${jsUsername}')"
                  class="user-icon-btn user-icon-btn--danger"
                  title="Hapus Akun"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
    }

    html += `
      <tr class="user-table-row">
        <td data-label="Username" class="user-cell user-cell--strong">${user.username}</td>
        <td data-label="Nama" class="user-cell user-cell--strong">${user.nama}</td>
        <td data-label="Role" class="user-cell">
          <span class="user-role-badge ${roleClass}">${roleLabel}</span>
        </td>
        <td data-label="Status" class="user-cell">
          <span class="user-status-badge ${statusClass}">${statusLabel}</span>
        </td>
        <td data-label="Masa Aktif" class="user-cell">${masaAktifHTML}</td>
        <td data-label="Garansi" class="user-cell">${kolOmGaransi}</td>
        <td data-label="Aksi" class="user-cell" style="border-right:none;">${kolOmAksi}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
  startCountdownTimers();
}

async function prosesTambahUser() {
  const username = document.getElementById('newUsername').value.trim().toUpperCase();
  const nama = document.getElementById('newNama').value.trim();
  const password = document.getElementById('newPassword').value.trim();
  const role = 'user';
  
  if (!username || !nama || !password) {
    showNotification({ type: 'warning', message: 'Lengkapi semua data terlebih dahulu.' }); return;
  }
  
  const dibuatPada = new Date().toISOString();

  // PRIORITAS 1: Buat via API
  try {
    const r = await apiCreateUser({
      username: username,
      password: btoa(password),
      nama: nama,
      role: role,
      createdAt: dibuatPada
    });
    if (r.ok) {
      await syncUsersFromServer();
      saveUserPasswordLocally(username, btoa(password));
      showNotification({ type: 'success', message: 'User ' + username + ' berhasil ditambahkan.' });
    } else if (r.status === 409) {
      showNotification({ type: 'warning', message: 'Username ' + username + ' sudah digunakan.' });
      return;
    } else {
      showNotification({ type: 'error', message: 'Gagal menambahkan user. Coba lagi.' });
      return;
    }
  } catch (e) {
    // PRIORITAS 2: Fallback lokal jika API offline
    console.warn('API offline (prosesTambahUser):', e.message);
    const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
    if (users.find(u => u.username === username)) {
      showNotification({ type: 'warning', message: 'Username sudah digunakan.' }); return;
    }
    users.push({
      username, nama, password: btoa(password), role, active: true, createdAt: dibuatPada
    });
    localStorage.setItem('userDatabase', JSON.stringify(users));
    localStorage.setItem('userDatabase_cache', JSON.stringify(users));
  }

  // Kosongkan form
  document.getElementById('newUsername').value = '';
  document.getElementById('newNama').value = '';
  document.getElementById('newPassword').value = '';

  // Refresh tabel
  const container = document.getElementById('kelolaUserContent');
  if (container) renderUserManagementContent(container);
}

function perpanjangMasaAktif(username) {
  if (username === 'ELDHI') {
    showNotification({ type: 'warning', message: 'Akun Superadmin tidak memiliki batasan masa aktif.' }); 
    return;
  }
  
  showConfirmModal({
    title: 'Perpanjang Masa Aktif',
    message: 'Perpanjang masa aktif ' + username + ' selama 30 hari?',
    confirmText: 'Perpanjang',
    cancelText: 'Batal',
    confirmClass: 'confirm-modal-btn--primary',
    iconClass: 'fa-sync-alt',
    onConfirm: async function () {
      // PRIORITAS 1: Update via API
      try {
        const r = await apiExtendMasaAktif(username);
        if (r.ok) {
          await syncUsersFromServer();
          showNotification({ type: 'success', message: 'Masa aktif ' + username + ' diperpanjang 30 hari.' });
          const container = document.getElementById('kelolaUserContent');
          if (container) renderUserManagementContent(container);
          return;
        }
        showNotification({ type: 'error', message: 'Gagal memperpanjang masa aktif. Coba lagi.' });
      } catch (e) {
        // PRIORITAS 2: Fallback lokal
        console.warn('API offline (perpanjang):', e.message);
        const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
        const userIdx = users.findIndex(u => u.username === username);
        if (userIdx === -1) {
          showNotification({ type: 'error', message: 'User tidak ditemukan.' }); return;
        }
        users[userIdx].createdAt = new Date().toISOString();
        users[userIdx].active = true;
        localStorage.setItem('userDatabase', JSON.stringify(users));
        localStorage.setItem('userDatabase_cache', JSON.stringify(users));
        showNotification({ type: 'success', message: 'Masa aktif ' + username + ' diperpanjang 30 hari.' });
        const container = document.getElementById('kelolaUserContent');
        if (container) renderUserManagementContent(container);
      }
    }
  });
}
function toggleUserActive(username) {
  if (username === 'ELDHI') {
    showNotification({ type: 'warning', message: 'Status Superadmin tidak dapat diubah.' });
    return;
  }
  const user = getUser(username);
  if (!user) { showNotification({ type: 'error', message: 'User tidak ditemukan.' }); return; }
  const newStatus = !user.active;
  showConfirmModal({
    title: newStatus ? 'Aktifkan Akun' : 'Nonaktifkan Akun',
    message: 'Yakin ' + (newStatus ? 'mengaktifkan' : 'menonaktifkan') + ' akun ' + username + '?',
    confirmText: 'Ya, ' + (newStatus ? 'Aktifkan' : 'Nonaktifkan'),
    cancelText: 'Batal',
    confirmClass: newStatus ? 'confirm-modal-btn--primary' : 'confirm-modal-btn--danger',
    iconClass: newStatus ? 'fa-check-circle' : 'fa-times-circle',
    onConfirm: async function () {
      try {
        const r = await apiToggleActive(username, newStatus ? 1 : 0);
        if (r.ok) {
          await syncUsersFromServer();
          showNotification({ type: 'success', message: 'Akun ' + username + ' ' + (newStatus ? 'diaktifkan' : 'dinonaktifkan') + '.' });
          const container = document.getElementById('kelolaUserContent');
          if (container) renderUserManagementContent(container);
          return;
        }
        showNotification({ type: 'error', message: 'Gagal mengubah status akun. Coba lagi.' });
      } catch (e) {
        console.warn('API offline (toggle active):', e.message);
        const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
        const userIdx = users.findIndex(u => u.username === username);
        if (userIdx === -1) {
          showNotification({ type: 'error', message: 'User tidak ditemukan.' }); return;
        }
        users[userIdx].active = newStatus;
        localStorage.setItem('userDatabase', JSON.stringify(users));
        localStorage.setItem('userDatabase_cache', JSON.stringify(users));
        showNotification({ type: 'success', message: 'Akun ' + username + ' ' + (newStatus ? 'diaktifkan' : 'dinonaktifkan') + '.' });
        const container = document.getElementById('kelolaUserContent');
        if (container) renderUserManagementContent(container);
      }
    }
  });
}
function hapusUserPermanent(username) {
  if (username === 'ELDHI') {
    showNotification({ type: 'warning', message: 'Akun Superadmin tidak dapat dihapus.' }); 
    return;
  }
  
  showConfirmModal({
    title: 'Konfirmasi Penghapusan User',
    message: 'Hapus akun ' + username + '? Data yang terhapus tidak dapat dikembalikan.',
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    confirmClass: 'confirm-modal-btn--danger',
    iconClass: 'fa-trash-alt',
    onConfirm: async function () {
      // PRIORITAS 1: Hapus via API
      try {
        const r = await apiDeleteUser(username);
        if (r.ok) {
          await syncUsersFromServer();
          showNotification({ type: 'success', message: 'User ' + username + ' berhasil dihapus.' });
        } else if (r.status === 404) {
          showNotification({ type: 'warning', message: 'User ' + username + ' tidak ditemukan.' });
        } else {
          showNotification({ type: 'error', message: 'Gagal menghapus user. Coba lagi.' });
          // Hapus lokal sebagai fallback
          const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
          localStorage.setItem('userDatabase', JSON.stringify(users.filter(u => u.username !== username)));
          localStorage.setItem('userDatabase_cache', JSON.stringify(users.filter(u => u.username !== username)));
        }
      } catch (e) {
        // PRIORITAS 2: Fallback lokal
        console.warn('API offline (hapus):', e.message);
        const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
        const filtered = users.filter(u => u.username !== username);
        localStorage.setItem('userDatabase', JSON.stringify(filtered));
        localStorage.setItem('userDatabase_cache', JSON.stringify(filtered));
        showNotification({ type: 'success', message: 'User ' + username + ' berhasil dihapus.' });
      }
      
      const container = document.getElementById('kelolaUserContent');
      if (container) renderUserManagementContent(container);
    }
  });
}

function startCountdownTimers() {
  stopCountdownTimers();
  countdownIntervalId = setInterval(() => {
    const users = JSON.parse(localStorage.getItem('userDatabase_cache') || localStorage.getItem('userDatabase') || '[]');

    users.forEach(user => {
      if (user.role === 'user') {
        const countdownEl = document.getElementById('countdown_masa_' + user.username);
        const countdownEl2 = document.getElementById('countdown2_masa_' + user.username);

        if (!countdownEl) return;

        const userCreatedAt = user.createdAt;
        const createdDate = new Date(userCreatedAt);
        const expiredDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
        const now = new Date();
        const diff = expiredDate - now;

        if (diff <= 0) {
          const userIdx = users.findIndex(u => u.username === user.username);
          if (userIdx !== -1) {
            users[userIdx].active = false;
            localStorage.setItem('userDatabase', JSON.stringify(users));
            localStorage.setItem('userDatabase_cache', JSON.stringify(users));
            // 🔄 Nonaktifkan juga di server D1 agar perangkat lain ikut logout
            apiToggleActive(user.username, false);
          }

          countdownEl.className = 'user-countdown-main is-danger';
          countdownEl.textContent = 'KEDALUWARSA';

          if (countdownEl2) {
            countdownEl2.style.display = 'none';
            countdownEl2.textContent = '';
          }

          refreshUserTable();
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let toneClass = 'is-safe';
        if (days <= 3) toneClass = 'is-danger';
        else if (days <= 7) toneClass = 'is-warning';

        countdownEl.className = `user-countdown-main ${toneClass}`;
        countdownEl.textContent = `${days} HARI`;

        if (countdownEl2) {
          countdownEl2.style.display = 'block';
          countdownEl2.className = `user-countdown-sub ${toneClass}`;
          countdownEl2.textContent = `${days}hari ${hours}j ${minutes}m ${seconds}d`;
        }
      }
    });
  }, 5000);
}
// Logout paksa (dipakai kalau user dihapus / dinonaktifkan / masa aktif habis)
function forceLogout(reason) {
  if (reason) showNotification({ type: 'error', message: reason });
  stopAppIntervals();
  stopCountdownTimers();
  localStorage.removeItem('currentUser');
  dataTable = [];
  allDataTable = [];
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginContainer').style.display = 'flex';
  document.getElementById('loginForm').reset();
  hideLoginTransition();
  kodeVerifikasiGlobal = generateKodeVerifikasi();
  renderKodeVerifikasi();
  document.getElementById('userManagementBtn')?.remove();
  document.getElementById('userManagementModal')?.remove();
  document.body.classList.add('login-bg');
  document.body.classList.remove('app-bg');
}

// Sinkron dulu dari server, lalu jalankan pengecekan sesi.
async function checkUserSessionOnline() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  // PRIORITAS 1: Cek via API
  try {
    const session = await apiCheckSession(currentUser.username);
    if (session.valid === false) {
      if (session.reason === 'API_OFFLINE' || session.reason === 'API_ERROR') {
        console.warn('Session check: API offline, skipping force logout');
        return;
      }
      const reasons = {
        DELETED: 'Akun Anda telah dihapus oleh admin.',
        DISABLED: 'Akun dinonaktifkan. Hubungi admin.',
        EXPIRED: 'Masa aktif akun telah habis.',
      };
      forceLogout(reasons[session.reason] || 'Sesi tidak valid.');
      return;
    }
    if (session.valid === true) {
      // Sesi masih valid, sync cache
      await syncUsersFromServer();
      return;
    }
  } catch (e) {
    console.warn('API session check failed:', e.message);
  }

  // PRIORITAS 2: Fallback ke localStorage (jika API offline)
  if (currentUser.role === 'superadmin' || currentUser.role === 'admin') return;

  const users = getAllUsers();
  const exist = users.find(u => u.username === currentUser.username);
  if (!exist) {
    forceLogout('Akun Anda telah dihapus oleh admin.');
    return;
  }
  if (!exist.active) {
    forceLogout('Akun dinonaktifkan. Hubungi admin.');
    return;
  }

  const createdDate = new Date(currentUser.createdAt);
  const expiredDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  if (new Date() >= expiredDate) {
    forceLogout('Masa aktif akun telah habis.');
  }
}

function checkUserSession() {
  checkUserSessionOnline();
}
function cekBackupStatus() {
  const currentUser = getCurrentUser();
  
  // SuperAdmin tidak perlu cek backup
  if (currentUser && currentUser.username === 'ELDHI') return;
  
  const users = getAllUsers();
  
  if (users.length === 0) {
    showConfirmModal({
      title: 'Import Database',
      message: 'Database masih kosong. Import file backup untuk mengembalikan data?',
      confirmText: 'Import',
      cancelText: 'Nanti',
      confirmClass: 'confirm-modal-btn--primary',
      iconClass: 'fa-file-import',
      onConfirm: function () {
        const input = document.getElementById('importDbFile');
        if (input) input.click();
      }
    });
  }
}
async function readPDFFull(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument({ 
          data: typedarray,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/cmaps/',
          cMapPacked: true 
        }).promise;
        
        let allText = "";

        // 🔥 ALWAYS TRY TEXT FIRST (lebih reliable di HP)
        console.log("📖 Extracting TEXT layer...");
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          allText += " " + pageText;
        }

        // 🔥 OCR HANYA jika text BURUK (bukan <100 chars)
        if (allText.trim().length < 500 || !allText.match(/[A-Z]{1,2}[0-9]{6}/)) {
          console.log("🔍 Text kurang bagus → OCR ACTIVATED");
          allText = await ocrAllPages(pdf);
        }

        const pdfList = parseManifestAdvanced(allText);
        
        // 🔥 MINIMUM 3 ITEMS - VALIDASI HP
        if (pdfList.length < 3) {
          console.warn("⚠️ Hanya", pdfList.length, "items. Mencoba regex lebih agresif...");
          const extraList = aggressivePassportParse(allText);
          pdfList.push(...extraList);
        }
        
        console.log("📄 FINAL EXTRACTED:", pdfList.length, "items:", pdfList.map(p=>p.passport));
        resolve([...new Set(pdfList.map(JSON.stringify))].map(JSON.parse)); // UNIQUE
      } catch (err) {
        console.error("PDF ERROR:", err);
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
async function ocrAllPages(pdf) {
  let ocrText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    
    // 🔥 FIX HP/LAPTOP: DYNAMIC SCALE BERDASARKAN DEVICE
    const devicePixelRatio = window.devicePixelRatio || 1;
    let scale = 2.5 * devicePixelRatio; // ↑ TINGGI INI
    scale = Math.min(scale, 4.0); // MAX 4x prevent memory crash
    
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // 🔥 FIX SIZE HP
    canvas.height = Math.floor(viewport.height);
    canvas.width = Math.floor(viewport.width);
    
    // 🔥 BETTER RENDERING
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // 🔥 BETTER OCR CONFIG - HP FRIENDLY
    try {
      const { data: { text } } = await Tesseract.recognize(canvas, 'ind+eng', {
        logger: () => {},
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ', // STRICTER
        preserve_interword_spaces: '1'
      });
      ocrText += " " + text;
    } catch (ocrError) {
      console.warn("OCR Page", i, "failed:", ocrError);
      // FALLBACK: gunakan text extraction jika OCR gagal
      const textContent = await page.getTextContent();
      ocrText += " " + textContent.items.map(item => item.str).join(" ");
    }
    
    // 🔥 CLEANUP MEMORY - CRUCIAL UNTUK HP
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.remove();
  }
  console.log("🔍 OCR Complete:", ocrText.length, "chars");
  return ocrText.trim();
}
function aggressivePassportParse(text) {
  const patterns = [
    /[A-Z]{2}[0-9]{7,9}/gi,
    /[A-Z][0-9]{6,10}/gi,
    /P[A-Z0-9]{6,}/gi,
    /[A-Z]{3}[0-9]{6}/gi  // Tambahan pattern
  ];
  
  let passports = [];
  patterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    passports.push(...matches);
  });
  
  return [...new Set(passports)]
    .filter(p => p.length >= 6 && p.length <= 12)
    .map(passport => {
      // Simple name fallback
      const before = text.substring(Math.max(0, text.toUpperCase().indexOf(passport.toUpperCase()) - 50), 
                                   text.toUpperCase().indexOf(passport.toUpperCase()));
      const nameMatch = before.match(/[A-Z][A-Z\s]{5,25}$/);
      return {
        passport: passport.toUpperCase(),
        name: nameMatch ? nameMatch[0].trim() : "UNKNOWN"
      };
    });
}
function parseManifestAdvanced(text) {
  const pdfList = [];
  
  // Pattern cari passport
  const passportPatterns = [
    /[A-Z]{1,2}[0-9]{6,9}/gi, 
    /[A-Z][0-9]{5,10}/gi, 
    /P[A-Z0-9]{6,}/gi
  ];
  
  let allPassports = [];
  passportPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    allPassports.push(...matches);
  });
  allPassports = [...new Set(allPassports.map(p => p.toUpperCase()))];

  // Pattern cari TANGGAL LAHIR (多种格式)
  const dobPatterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,        // DD-MM-YYYY atau DD/MM/YYYY
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/g,       // DD-MM-YY atau DD/MM/YY
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,      // YYYY-MM-DD
    /\b(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{4})\b/gi  // DD MON YYYY
  ];
  
  let allDOBs = [];
  
  // Pattern 1-3: Angka
  [/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g, /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g].forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1].length === 4) {
        // YYYY-MM-DD
        allDOBs.push(`${match[1]}-${match[2]}-${match[3]}`);
      } else {
        // DD-MM-YYYY atau DD-MM-YY
        const year = match[3].length === 2 ? '20' + match[3] : match[3];
        allDOBs.push(`${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}-${year}`);
      }
    }
  });
  
  // Pattern 4: Bulan teks (JAN, FEB, dll)
  const monthMap = {'JAN':'01','FEB':'02','MAR':'03','APR':'04','MAY':'05','JUN':'06','JUL':'07','AUG':'08','SEP':'09','OCT':'10','NOV':'11','DEC':'12'};
  const textMonthPattern = /\b(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{4})\b/gi;
  let match;
  while ((match = textMonthPattern.exec(text)) !== null) {
    allDOBs.push(`${match[1].padStart(2,'0')}-${monthMap[match[2].toUpperCase()]}-${match[3]}`);
  }
  
  allDOBs = [...new Set(allDOBs)];

  // Loop setiap passport → cari nama & tanggal lahir
  allPassports.forEach(passport => {
    const index = text.toUpperCase().indexOf(passport);
    if (index === -1) return;
    
    // Cari nama sebelum passport
    const beforeText = text.substring(Math.max(0, index - 100), index);
    const nameCandidates = beforeText.match(/[A-ZÀ-Ú][A-ZÀ-Úa-zÀ-Ú\s]{3,30}([A-ZÀ-Ú][A-ZÀ-Úa-zÀ-Ú\s]{2,20})?/gi) || [];
    
    let bestName = "";
    let bestDistance = Infinity;
    nameCandidates.forEach(candidate => {
      const cleanName = candidate.replace(/[\d\-\/()#*]/g, '').replace(/\s+/g, ' ').trim();
      if (cleanName.length >= 5 && cleanName.split(' ').length >= 2) {
        const nameIndex = beforeText.lastIndexOf(cleanName);
        const distance = index - nameIndex;
        if (distance < bestDistance && distance > 5) {
          bestName = cleanName;
          bestDistance = distance;
        }
      }
    });
    
    // Cari tanggal lahir di dekat passport (±50 char)
    const nearText = text.substring(Math.max(0, index - 80), Math.min(text.length, index + 80));
    let dob = '';
    for (let dobCandidate of allDOBs) {
      if (nearText.includes(dobCandidate.replace(/-/g, '/')) || 
          nearText.includes(dobCandidate.replace(/-/g, '-'))) {
        dob = dobCandidate;
        break;
      }
    }
    
    if (bestName) {
      pdfList.push({ 
        name: bestName.trim(), 
        passport: passport,
        tanggalLahir: dob  // ← TAMBAHKAN
      });
    }
  });
  
  return pdfList.filter(item => item.passport.length >= 6 && item.name.length >= 5);
}
function findExactMatches(pdfList) {
  const matched = [];
  
  console.log(`🔍 MULAI MATCHING: ${pdfList.length} PDF vs ${allDataTable.length} TABEL...`);
  
  pdfList.forEach(pdfItem => {
    const pdfPassport = pdfItem.passport.toUpperCase().trim();
    const pdfName = pdfItem.name.toUpperCase().trim();
    const pdfDOB = pdfItem.tanggalLahir;
    
    const tableMatches = allDataTable.filter(tableItem => {
      const tablePassport = (tableItem.passport || '').toUpperCase().trim();
      const tableName = tableItem.name.toUpperCase().trim();
      const tableDOB = tableItem.tanggalLahir || '';
      
      const namaCocok = isNamaMatch(tableName, pdfName);
      const dobCocok = isDOBMatch(tableDOB, pdfDOB);
      const passportCocok = isPassportMatch(tablePassport, pdfPassport);
      
      if (namaCocok && dobCocok && passportCocok) return true;
      if (namaCocok && dobCocok && !passportCocok) return true;
      if (namaCocok && passportCocok && !dobCocok) return true;
      if (dobCocok && passportCocok && !namaCocok) return true;
      if (passportCocok && !namaCocok && !dobCocok) return true;
      return false;
    });
    
    matched.push(...tableMatches);
  });
  
  // Dedup berdasarkan identitas, namun WAJIB memilih record dengan TANGGAL MASUK terbaru.
  // Sebelumnya Map melacasi duplikat dan menyimpan record yang muncul paling akhir di array,
  // sehingga bisa mengambil data update LAMA. Kini dipilih yang tanggalMasuknya paling baru.
  const dedupMap = new Map();
  matched.forEach(item => {
    const key = item.passport;
    const existing = dedupMap.get(key);
    const newDate = normalizeTanggalMasuk(item.tanggalMasuk);
    const newTime = new Date(newDate).getTime();
    if (!existing || isNaN(existing.__cmp) || newTime > existing.__cmp) {
      item.__cmp = newTime;
      dedupMap.set(key, item);
    }
  });
  const uniqueMatched = [...dedupMap.values()]
    .sort((a, b) => (b.__cmp || 0) - (a.__cmp || 0))
    .map(item => { delete item.__cmp; return item; });
  
  console.log(`✅ MATCH: ${uniqueMatched.length}/${pdfList.length} PDF`);
  return uniqueMatched;
}
async function downloadMatchedPDF(matchedData, tujuan) {
  if (matchedData.length === 0) {
    showNotification({ type: 'warning', message: 'Belum ada data untuk diunduh.' });
    return;
  }
  
  try {
    await ensurePdfDownloadLibs();
    // =================>>> WARNA TUJUAN <<<================
    const titleColor = tujuan === 'KUKUP' ? [0, 180, 0] : [220, 50, 50];  // Hijau / Merah
    // =====================================================
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const currentUser = getCurrentUser();
    const userName = currentUser ? currentUser.nama : 'Admin';
    
    // ==================== HEADER ====================
    doc.setFillColor(35, 35, 35);
    doc.rect(0, 0, 297, 32, 'F');
    
    // Judul "LAPORAN DATA" (PUTIH) - di posisi 5mm
    doc.setFontSize(16);
    doc.setFont("helvetica", 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('LAPORAN DATA', 68, 8);
    
    // Judul tujuan - di posisi ~50mm (dengan spasi)
    doc.setTextColor(...titleColor);
    doc.text(tujuan.toUpperCase(), 115, 8);  // spasi dari 5mm ke 52mm
    
    // Garis
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(0, 12, 210, 12);
    
    // Garis
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(0, 13, 210, 13);
    
    // ========== INFO ==========
    const tgl = new Date();
    const tglStr = String(tgl.getDate()).padStart(2, '0') + '/' + 
                  String(tgl.getMonth() + 1).padStart(2, '0') + '/' + 
                  tgl.getFullYear();
    const jam = String(tgl.getHours()).padStart(2, '0') + ':' + 
               String(tgl.getMinutes()).padStart(2, '0') + ' WIB';
    
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.setTextColor(255, 255, 255);
    
    doc.text('USER         : ' + userName.toUpperCase(), 5, 20);
    doc.text('TANGGAL : ' + tglStr, 5, 28);
    doc.text('JAM           : ' + jam, 5, 24);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.setTextColor(255, 255, 255);
    
    doc.text('DARI               : ' + 'MALAYSIA' , 148, 20);
    doc.text('TUJUAN 	: ' + 'INDONESIA', 148, 24);
    doc.text('PELABUHAN : '+'TANJUNG BALAI KARIMUN' , 148, 28);
    
    // ==================== TABEL ====================
    const headers = [
      'NO', 'NAMA', 'PASSPORT', 
      'RP', 'RM', 'BOS', 
      'STATUS', 'LAHIR', 'MASUK', 'TUJUAN'
    ];
    
    const rows = matchedData.map((data, index) => [
      index + 1,
      data.name || '-',
      data.passport || '-',
      data.debtRp ? Number(data.debtRp).toLocaleString('id-ID') : '-',
      data.debtRm ? Number(data.debtRm).toLocaleString('id-ID') : '-',
      data.debtBos ? Number(data.debtBos).toLocaleString('id-ID') : '-',
      data.statusBayar || '-',
      data.tanggalLahir ? formatDate(data.tanggalLahir) : '-',
      formatDate(data.tanggalMasuk) || '-',
      data.tujuan || '-'
    ]);
    
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [35, 35, 35],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 14, halign: 'center' },
        7: { cellWidth: 20, halign: 'center' },
        8: { cellWidth: 20, halign: 'center' },
        9: { cellWidth: 16, halign: 'center' }
      },
      margin: { left: 11, right: 25 },
      theme: 'grid'
    });

    // ==================== TOTAL ====================
    const belumBayar = matchedData.filter(item => 
      item.statusBayar?.toUpperCase() === 'BELUM'
    );
    const totalRp = belumBayar.reduce((sum, item) => sum + (Number(item.debtRp) || 0), 0);
    const totalRm = belumBayar.reduce((sum, item) => sum + (Number(item.debtRm) || 0), 0);
    const totalBos = belumBayar.reduce((sum, item) => sum + (Number(item.debtBos) || 0), 0);

    const finalY = doc.lastAutoTable.finalY + 8;
    
    doc.setFillColor(200, 200, 200);
    doc.rect(50, finalY, 110, 14, 'FD');
    
    doc.setFontSize(9);
    doc.setFont("helvetica", 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL BELUM BAYAR : ' + belumBayar.length + ' PENUMPANG', 105, finalY + 5, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text(
      'Rp ' + totalRp.toLocaleString('id-ID') + ' | RM ' + totalRm.toLocaleString('id-ID') + ' | Bos ' + totalBos.toLocaleString('id-ID'),
      105, finalY + 11, { align: 'center' }
    );

    // ==================== FOOTER ====================
    const footerY = finalY + 18;
    doc.setLineWidth(0.3);
    doc.line(11, footerY, 198, footerY);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Hak Cipta 2025-2026 Muhammad Eldhi', 11, footerY + 5);

    // Save
    doc.save('MATCH_' + tujuan.toUpperCase() + '_' + matchedData.length + 'DATA_' + new Date().toISOString().slice(0,10) + '.pdf');
    
    console.log('✅ PDF Downloaded: ' + tujuan);
  } catch (error) {
    console.error('PDF Error:', error);
    showNotification({ type: 'error', message: 'Gagal mengunduh PDF. Coba lagi.' });
  }
}
function viewPhoto(index) {
  const data = dataTable[index];

  if (!data || !data.photo) {
    showNotification({ type: 'warning', message: 'Tidak ada foto.' });
    return;
  }

  document.getElementById('modalImg').src = data.photo;
  document.getElementById('photoModal').style.display = 'flex';
}
function closePhoto() {
  document.getElementById('photoModal').style.display = 'none';
}
async function downloadPDF() {
  if (dataTable.length === 0) {
    showNotification({ type: 'warning', message: 'Belum ada data untuk diunduh.' });
    return;
  }
  
  try {
    await ensurePdfDownloadLibs();
    // =================>>> KERTAS A4 PORTRAIT <<<================
    const kertasLebar = 210;   // A4 Portrait
    const kertasTinggi = 297;  // A4 Portrait
    // =========================================
    
    const { jsPDF } = window.jspdf;
    
    // ✅ PORTRAIT orientation
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const currentUser = getCurrentUser();
  const userName = currentUser ? currentUser.nama : 'Admin';
  
  // ==================== HEADER ====================
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 297, 32, 'F');
  
  // Judul
    doc.setFontSize(16);
    doc.setFont("helvetica", 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('LAPORAN DATA PENUMPANG', 64, 8);
    
    // Garis
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(0, 12, 210, 12);
    
    // Garis
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(0, 13, 210, 13);
    
    // ========== INFO ==========
    const tgl = new Date();
    const tglStr = String(tgl.getDate()).padStart(2, '0') + '/' + 
                  String(tgl.getMonth() + 1).padStart(2, '0') + '/' + 
                  tgl.getFullYear();
    const jam = String(tgl.getHours()).padStart(2, '0') + ':' + 
               String(tgl.getMinutes()).padStart(2, '0') + ' WIB';
    
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.setTextColor(255, 255, 255);
    
    doc.text('USER         : ' + userName.toUpperCase(), 5, 20);
    doc.text('TANGGAL : ' + tglStr, 5, 28);
    doc.text('JAM           : ' + jam, 5, 24);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.setTextColor(255, 255, 255);
    
    doc.text('DARI               : ' + 'MALAYSIA' , 148, 20);
    doc.text('TUJUAN 	: ' + 'INDONESIA', 148, 24);
    doc.text('PELABUHAN : '+'TANJUNG BALAI KARIMUN' , 148, 28);
  
  // ==================== TABEL ====================148
  const headers = [
    'NO', 'NAMA', 'PASSPORT', 
    'RP', 'RM', 'BOS', 
    'STATUS', 'LAHIR', 'MASUK', 'TUJUAN'
  ];
  
  const rows = dataTable.map((data, index) => [
    index + 1,
    data.name || '-',
    data.passport || '-',
    data.debtRp ? Number(data.debtRp).toLocaleString('id-ID') : '-',
    data.debtRm ? Number(data.debtRm).toLocaleString('id-ID') : '-',
    data.debtBos ? Number(data.debtBos).toLocaleString('id-ID') : '-',
    data.statusBayar || '-',
    data.tanggalLahir ? formatDate(data.tanggalLahir) : '-',
    formatDate(data.tanggalMasuk) || '-',
    data.tujuan || '-'
  ]);
  
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 20, halign: 'center' },
      8: { cellWidth: 20, halign: 'center' },
      9: { cellWidth: 16, halign: 'center' }
    },
    margin: { left: 11, right: 25 },
    theme: 'grid'
  });

  // ==================== TOTAL ====================
  const belumBayar = dataTable.filter(item => 
    item.statusBayar?.toUpperCase() === 'BELUM'
  );
  const totalRp = belumBayar.reduce((sum, item) => sum + (Number(item.debtRp) || 0), 0);
  const totalRm = belumBayar.reduce((sum, item) => sum + (Number(item.debtRm) || 0), 0);
  const totalBos = belumBayar.reduce((sum, item) => sum + (Number(item.debtBos) || 0), 0);

  const finalY = doc.lastAutoTable.finalY + 8;
  
  // Box
  doc.setFillColor(240, 240, 240);
  doc.rect(50, finalY, 110, 14, 'FD');
  
  // Text
  doc.setFontSize(9);
  doc.setFont("helvetica", 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL BELUM BAYAR: ' + belumBayar.length + ' PENUMPANG', 105, finalY + 5, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text(
    'Rp ' + totalRp.toLocaleString('id-ID') + ' | RM ' + totalRm.toLocaleString('id-ID') + ' | Bos ' + totalBos.toLocaleString('id-ID'),
    105, finalY + 11, { align: 'center' }
  );

  // ==================== FOOTER ====================
  const footerY = finalY + 18;
  doc.setLineWidth(0.3);
  doc.line(11, footerY, 198, footerY);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Hak Cipta 2025-2026 Muhammad Eldhi', 11, footerY + 5);

  doc.save('DATA_PENUMPANG_' + new Date().toISOString().slice(0,10) + '.pdf');
    
    console.log('✅ PDF Downloaded successfully');
  } catch (error) {
    console.error('PDF Error:', error);
    showNotification({ type: 'error', message: 'Gagal mengunduh PDF. Coba lagi.' });
  }
}
function isNamaMatch(tableName, pdfName) {
  if (!tableName || !pdfName) return false;
  
  // ✅ 100% EXACT - uppercase + trim + hapus spasiExtra
  const n1 = tableName.toUpperCase().replace(/\s+/g, ' ').trim();
  const n2 = pdfName.toUpperCase().replace(/\s+/g, ' ').trim();
  
  // ✅ 100% EXACT MATCH
  if (n1 === n2) return true;
  
  return false;
}
function isDOBMatch(tableDOB, pdfDOB) {
  if (!tableDOB || !pdfDOB) return false;
  
  // ✅ Normalize format ke YYYY-MM-DD
  const normalizeDate = (date) => {
    if (!date) return '';
    // Sudah YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    // DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(date)) {
      const parts = date.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
      const parts = date.split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return date;
  };
  
  const tDOB = normalizeDate(tableDOB);
  const pDOB = normalizeDate(pdfDOB);
  
  // ✅ 100% EXACT MATCH (format sama)
  if (tDOB === pDOB) return true;
  
  return false;
}
function isPassportMatch(tablePassport, pdfPassport) {
  if (!tablePassport || !pdfPassport) return false;
  
  // ✅ 100% EXACT - uppercase + trim
  const p1 = tablePassport.toUpperCase().trim();
  const p2 = pdfPassport.toUpperCase().trim();
  
  // ✅ 100% EXACT MATCH
  if (p1 === p2) return true;
  
  return false;
}

async function bootAplikasi() {
  // 🔒 Hapus sisa cache akun SUPERADMIN legacy dari localStorage
  purgeSuperadminFromLocal();

  // 🔥 Jangan block boot — jalankan sync user di background
  initUserDatabaseFIX().catch(err => {
    console.warn('⚠️ initUserDatabaseFIX gagal, lanjutkan:', err);
  });

  // Generate kode verifikasi baru
  kodeVerifikasiGlobal = generateKodeVerifikasi();
  renderKodeVerifikasi();
  initDashboardNavigation();
  window.addEventListener('hashchange', applyViewFromHash);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopAppIntervals(); stopCountdownTimers(); }
    else { startAppIntervals(); startCountdownTimers(); }
  });
  applyViewFromHash();
  updateDateTime();
  initManifestHistory();
  initChartEvents();

  console.log('✅ Sistem siap digunakan');

  // === SPLASH SCREEN ===
  setTimeout(function () {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.classList.add('splash-fade');
      setTimeout(function () {
        splash.style.display = 'none';
        splash.setAttribute('aria-hidden', 'true');
      }, 800);
    }
  }, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAplikasi);
} else {
  // DOM sudah siap (mis. script di-cache/dijalankan terlambat) -> jalankan langsung
  bootAplikasi();
}
setTimeout(() => {
  cekBackupStatus();
}, 2000);
function closeDropdown() {
  const menu = document.getElementById('logoDropdown');
  const trigger = document.querySelector('.header-logo');
  if (!menu) return;

  menu.classList.remove('show');
  menu.classList.remove('active');
  menu.setAttribute('aria-hidden', 'true');
  menu.removeAttribute('data-direction');

  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
  }
}

function positionDropdown() {
  const menu = document.getElementById('logoDropdown');
  const trigger = document.querySelector('.header-logo');

  if (!menu || !trigger) return;

  if (window.innerWidth <= 768) {
    menu.style.left = '';
    menu.style.top = '';
    return;
  }

  const rect = trigger.getBoundingClientRect();
  const menuWidth = Math.max(menu.offsetWidth || 230, 230);
  const menuHeight = Math.max(menu.offsetHeight || 190, 190);
  const gap = 10;

  let left = rect.right - menuWidth;
  if (left < 12) left = 12;
  if (left + menuWidth > window.innerWidth - 12) {
    left = window.innerWidth - menuWidth - 12;
  }

  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;

  let top;
  if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
    top = rect.bottom + gap;
    menu.setAttribute('data-direction', 'down');
  } else {
    top = rect.top - menuHeight - gap;
    menu.setAttribute('data-direction', 'up');
  }

  if (top < 12) top = 12;
  if (top + menuHeight > window.innerHeight - 12) {
    top = window.innerHeight - menuHeight - 12;
  }

  const offsetParent = menu.offsetParent;
  if (offsetParent) {
    const parentRect = offsetParent.getBoundingClientRect();
    menu.style.left = `${left - parentRect.left}px`;
    menu.style.top = `${top - parentRect.top}px`;
  } else {
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }
}

function openDropdown() {
  const menu = document.getElementById('logoDropdown');
  const trigger = document.querySelector('.header-logo');

  if (!menu || !trigger) return;

  menu.classList.remove('active');
  menu.classList.add('show');
  menu.setAttribute('aria-hidden', 'false');
  trigger.setAttribute('aria-expanded', 'true');

  requestDropdownPosition();
}

function toggleDropdown() {
  const menu = document.getElementById('logoDropdown');
  if (!menu) return;

  if (menu.classList.contains('show')) {
    closeDropdown();
  } else {
    openDropdown();
  }
}

document.addEventListener('click', function(e) {
  const menu = document.getElementById('logoDropdown');
  const trigger = document.querySelector('.header-logo');

  if (!menu || !trigger) return;

  if (!trigger.contains(e.target) && !menu.contains(e.target)) {
    closeDropdown();
  }
});

if (headerLogo) {
  headerLogo.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
    } else if (e.key === 'Escape') {
      closeDropdown();
      headerLogo.focus();
    }
  });

  headerLogo.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleDropdown();
  });
}

window.addEventListener('resize', function() {
  const menu = document.getElementById('logoDropdown');
  if (menu && menu.classList.contains('show')) {
    requestDropdownPosition();
  }
});

window.addEventListener('scroll', function() {
  const menu = document.getElementById('logoDropdown');
  if (menu && menu.classList.contains('show') && !isMobileViewport()) {
    requestDropdownPosition();
  }
}, { passive: true, capture: true });

if (dropdownExport) {
  dropdownExport.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    exportToJSON();
    closeDropdown();
  });
}

if (dropdownImport) {
  dropdownImport.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const input = document.getElementById('importFile');
    if (input) input.click();
    closeDropdown();
  });
}

if (dropdownPDF) {
  dropdownPDF.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    downloadPDF();
    closeDropdown();
  });
}

if (dropdownResetPassword) {
  dropdownResetPassword.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    showResetPassword();
    closeDropdown();
  });
}

if (dropdownNotifikasi) {
  dropdownNotifikasi.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    showNotifikasi();
  });
}

if (dropdownLogout) {
  dropdownLogout.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    logout();
    closeDropdown();
  });
}
// Klik widget cuaca untuk refresh manual
const headerWeatherEl = document.getElementById('headerWeather');
if (headerWeatherEl) {
  headerWeatherEl.style.cursor = 'pointer';
  headerWeatherEl.addEventListener('click', function() {
    updateCuaca();
  });
}

const notifOverlay = document.getElementById('notifikasiModal');
if (notifOverlay) {
  notifOverlay.addEventListener('click', function(e) {
    if (e.target === notifOverlay) closeNotifikasi();
  });
}
setTimeout(function(){ try{ updateNotifBadge(); }catch(e){} }, 600);

if (importFileInput) {
  importFileInput.addEventListener('change', function(event) {
    if (event.target.files.length > 0) {
      importFromJSON(event);
    }
  });
}
async function refreshUserTable() {
  try { await syncUsersFromServer(); } catch(e) { console.warn('refreshUserTable sync gagal:', e); }
  const container = document.getElementById('kelolaUserContent');
  if (container) {
    renderUserManagementContent(container);
  }
}
let resetTargetUsername = null;

// ===== RESET PASSWORD =====
function showResetPassword() {
  const modal = document.getElementById('resetPasswordModal');
  if (!modal) return;
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  if (String(currentUser.role || '').toLowerCase() !== 'superadmin') {
    showNotification({ type: 'error', message: 'Hanya Superadmin dapat reset password.' });
    return;
  }
  resetTargetUsername = String(currentUser.username).toUpperCase();
  const titleEl = document.getElementById('resetPwTitle');
  const usernameEl = document.querySelector('.reset-pw-username');
  if (titleEl) titleEl.textContent = 'RESET PASSWORD';
  if (usernameEl) usernameEl.textContent = resetTargetUsername;
  document.getElementById('resetPwNew').value = '';
  document.getElementById('resetPwConfirm').value = '';
  modal.style.display = 'flex';
  modal.style.opacity = 0;
  requestAnimationFrame(function () {
    modal.style.opacity = 1;
    modal.style.transition = 'opacity 0.15s';
  });
  const newPw = document.getElementById('resetPwNew');
  if (newPw) setTimeout(function () { newPw.focus(); }, 200);
}

function closeResetPassword() {
  const modal = document.getElementById('resetPasswordModal');
  if (!modal) return;
  modal.style.display = 'none';
  modal.style.opacity = '';
  modal.style.transition = '';
  resetTargetUsername = null;
}

function showResetPasswordForUser(username) {
  const modal = document.getElementById('resetPasswordModal');
  if (!modal) return;
  const currentUser = getCurrentUser();
  if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'superadmin') {
    showNotification({ type: 'error', message: 'Hanya Superadmin dapat reset password user.' });
    return;
  }
  if (!username) return;
  resetTargetUsername = String(username).toUpperCase();
  const titleEl = document.getElementById('resetPwTitle');
  const usernameEl = document.querySelector('.reset-pw-username');
  if (titleEl) titleEl.textContent = 'RESET PASSWORD USER';
  if (usernameEl) usernameEl.textContent = resetTargetUsername;
  document.getElementById('resetPwNew').value = '';
  document.getElementById('resetPwConfirm').value = '';
  modal.style.display = 'flex';
  modal.style.opacity = 0;
  requestAnimationFrame(function () {
    modal.style.opacity = 1;
    modal.style.transition = 'opacity 0.15s';
  });
  const newPw = document.getElementById('resetPwNew');
  if (newPw) setTimeout(function () { newPw.focus(); }, 200);
}

function resetCurrentUserPassword() {
  const newPw = document.getElementById('resetPwNew').value.trim();
  const confirmPw = document.getElementById('resetPwConfirm').value.trim();
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showNotification({ type: 'error', message: 'Sesi tidak valid.' });
    return;
  }

  if (!newPw || !confirmPw) {
    showNotification({ type: 'warning', message: 'Password baru dan konfirmasi harus diisi.' });
    return;
  }

  if (newPw !== confirmPw) {
    showNotification({ type: 'error', message: 'Password baru dan konfirmasi tidak sama.' });
    return;
  }

  if (newPw.length < 4) {
    showNotification({ type: 'warning', message: 'Password minimal 4 karakter.' });
    return;
  }

  const targetUsername = resetTargetUsername ? String(resetTargetUsername).toUpperCase() : String(currentUser.username).toUpperCase();
  const isSelfReset = targetUsername === String(currentUser.username).toUpperCase();

  const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
  const idx = users.findIndex(u => String(u.username).toUpperCase() === targetUsername);
  if (idx === -1) {
    const cache = JSON.parse(localStorage.getItem('userDatabase_cache') || '[]');
    const cachedUser = cache.find(u => String(u.username).toUpperCase() === targetUsername);
    if (cachedUser) {
      users.push({ ...cachedUser, password: btoa(newPw) });
      localStorage.setItem('userDatabase', JSON.stringify(users));
      closeResetPassword();
      const msg = isSelfReset ? 'Password berhasil direset.' : ('Password user ' + targetUsername + ' berhasil direset.');
      showNotification({ type: 'success', message: msg });
      apiUpdateUser(targetUsername, { password: btoa(newPw) }).then(function (r) { if (r.ok) syncUsersFromServer(); }).catch(function (e) { console.warn('Update password ' + targetUsername + ' gagal:', e); });
      const container = document.getElementById('kelolaUserContent');
      if (container) renderUserManagementContent(container);
      return;
    }
    showNotification({ type: 'error', message: 'Akun tidak ditemukan.' });
    return;
  }

  users[idx].password = btoa(newPw);
  localStorage.setItem('userDatabase', JSON.stringify(users));

  closeResetPassword();
  const successMsg = isSelfReset ? 'Password berhasil direset.' : ('Password user ' + targetUsername + ' berhasil direset.');
  showNotification({ type: 'success', message: successMsg });

  const container = document.getElementById('kelolaUserContent');
  if (container) renderUserManagementContent(container);

  apiUpdateUser(targetUsername, { password: btoa(newPw) }).then(function (r) {
    if (r.ok) syncUsersFromServer();
  }).catch(function (e) { console.warn('Update password ' + targetUsername + ' gagal:', e); });
}

const NOTIF_KEY = 'resetNotifications';
let notifFilter = 'all';

function getNotifications() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveNotifications(arr) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(arr));
}

function handleLupaPassword() {
  const input = document.getElementById('loginId');
  const usernameRaw = input ? input.value.trim() : '';
  if (!usernameRaw) {
    showNotification({ type: 'warning', message: 'Masukkan Nama Pengguna terlebih dahulu.' });
    if (input) input.focus();
    return;
  }
  const usernameUpper = usernameRaw.toUpperCase();
  const users = getAllUsers();
  const found = users.some(function(u){ return String(u.username).toUpperCase() === usernameUpper; });
  if (!found) {
    showNotification({ type: 'error', message: 'Maaf, nama pengguna tidak terdaftar.' });
    return;
  }
  const cooldownKey = 'lupaCooldown_' + usernameUpper;
  const last = parseInt(localStorage.getItem(cooldownKey) || '0', 10);
  const nowMs = Date.now();
  if (last && (nowMs - last) < 60000) {
    const sisa = Math.ceil((60000 - (nowMs - last)) / 1000);
    showNotification({ type: 'warning', message: 'Mohon tunggu ' + sisa + ' detik sebelum mengirim permintaan lagi.' });
    return;
  }
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7));
  const dd = String(wib.getDate()).padStart(2, '0');
  const mm = String(wib.getMonth() + 1).padStart(2, '0');
  const yyyy = wib.getFullYear();
  const hh = String(wib.getHours()).padStart(2, '0');
  const mi = String(wib.getMinutes()).padStart(2, '0');
  const displayName = users.find(function(u){ return String(u.username).toUpperCase() === usernameUpper; });
  const finalUsername = displayName ? displayName.username : usernameRaw;
  const notifs = getNotifications();
  notifs.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    username: finalUsername,
    date: dd + '/' + mm + '/' + yyyy,
    time: hh + ':' + mi,
    timestamp: wib.getTime(),
    read: false
  });
  saveNotifications(notifs);
  localStorage.setItem(cooldownKey, String(nowMs));
  updateNotifBadge();
  showNotification({ type: 'success', message: 'Permintaan reset kata sandi telah dikirim ke Superadmin.' });
}

function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const notifs = getNotifications();
  const unread = notifs.filter(function(n){ return !n.read; }).length;
  if (unread > 0) {
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function showNotifikasi() {
  const currentUser = getCurrentUser();
  if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'superadmin') {
    showNotification({ type: 'error', message: 'Hanya Superadmin dapat melihat notifikasi.' });
    return;
  }
  const modal = document.getElementById('notifikasiModal');
  if (!modal) return;
  notifFilter = 'all';
  renderNotifList();
  modal.style.display = 'flex';
  modal.style.opacity = 0;
  requestAnimationFrame(function(){ modal.style.opacity = 1; modal.style.transition = 'opacity 0.15s'; });
  const notifs = getNotifications();
  let changed = false;
  notifs.forEach(function(n){ if (!n.read) { n.read = true; changed = true; } });
  if (changed) { saveNotifications(notifs); updateNotifBadge(); }
  closeDropdown();
}

function closeNotifikasi() {
  const modal = document.getElementById('notifikasiModal');
  if (!modal) return;
  modal.style.display = 'none';
  modal.style.opacity = '';
  modal.style.transition = '';
  updateNotifBadge();
  renderNotifList();
}

function setNotifFilter(filter) {
  notifFilter = filter;
  document.querySelectorAll('.notif-filter').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });
  renderNotifList();
}

function renderNotifList() {
  const list = document.getElementById('notifList');
  if (!list) return;
  const all = getNotifications();
  let filtered = all;
  if (notifFilter === 'unread') filtered = all.filter(function(n){ return !n.read; });
  else if (notifFilter === 'read') filtered = all.filter(function(n){ return n.read; });
  if (filtered.length === 0) {
    const msg = notifFilter === 'all' ? 'Belum ada notifikasi.' : (notifFilter === 'unread' ? 'Tidak ada notifikasi belum dibaca.' : 'Tidak ada notifikasi sudah dibaca.');
    list.innerHTML = '<div class="notif-empty">' + msg + '</div>';
    return;
  }
  list.innerHTML = filtered.map(function(n){
    const cls = n.read ? 'is-read' : 'is-unread';
    return '<div class="notif-item ' + cls + '">'
      + '<div class="notif-item-user">' + escapeHtml(n.username) + '</div>'
      + '<div class="notif-item-desc">Meminta reset kata sandi</div>'
      + '<div class="notif-item-time">' + escapeHtml(n.date) + ' \u2022 ' + escapeHtml(n.time) + '</div>'
      + '<div class="notif-item-actions"><button type="button" onclick="hapusNotifikasi(\'' + n.id + '\')" class="notif-item-delete">Hapus</button></div>'
      + '</div>';
  }).join('');
}

function hapusNotifikasi(id) {
  let notifs = getNotifications();
  notifs = notifs.filter(function(n){ return n.id !== id; });
  saveNotifications(notifs);
  updateNotifBadge();
  renderNotifList();
}

function hapusSemuaNotifikasi() {
  if (getNotifications().length === 0) {
    showNotification({ type: 'info', message: 'Tidak ada notifikasi.' });
    return;
  }
  showConfirmModal({
    title: 'Hapus Semua Notifikasi',
    message: 'Yakin ingin menghapus semua notifikasi?',
    confirmText: 'HAPUS',
    cancelText: 'BATAL',
    confirmClass: 'confirm-modal-btn--danger',
    iconClass: 'fa-trash-alt',
    onConfirm: function(){
      saveNotifications([]);
      updateNotifBadge();
      renderNotifList();
      showNotification({ type: 'success', message: 'Semua notifikasi dihapus.' });
    }
  });
}

function updateKet(index, value) {
  const data = dataTable[index];
  if (!data) return;
  data.keterangan = value;
  const allIndex = allDataTable.findIndex(item => item === data);
  if (allIndex !== -1) allDataTable[allIndex].keterangan = value;
}
async function autoProcessPDF(e) {
  const file = document.getElementById('pdfUpload').files[0];
  if (!file) return showNotification({ type: 'warning', message: 'Pilih file PDF terlebih dahulu.' });
  if (allDataTable.length === 0) return showNotification({ type: 'warning', message: 'Impor data JSON terlebih dahulu.' });

  const btn = e ? e.target : document.querySelector('[onclick*="autoProcessPDF"]');
  const originalText = btn.textContent;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
  btn.disabled = true;

  try {
    await ensureManifestProcessingLibs();
    // 1. BACA PDF & EXTRACT passport + nama
    const pdfList = await readPDFFull(file);
    if (pdfList.length === 0) { showNotification({ type: 'error', message: 'Tidak ada nomor passport terdeteksi.' }); return; }

    console.log("📄 PDF Extracted:", pdfList.length, "items");
    recordManifestUpload();

    // 2. CARI MATCH di TABEL DATA
    const matched = findExactMatches(pdfList);
    console.log("✅ MATCH di TABEL:", matched.length, "data");

    if (matched.length === 0) {
      recordManifestProcess();
      showNotification({ type: 'error', message: 'Tidak ada data yang cocok.' });
      return;
    }
    recordManifestProcess();

    // 3. HANYA KUKUP & JOHOR (TIDAK ADA LAINNYA)
    const matchedKukup = matched.filter(item => item.tujuan?.toUpperCase() === 'KUKUP');
    const matchedJohor = matched.filter(item => item.tujuan?.toUpperCase() === 'JOHOR');

    console.log(`📊 MATCH TABLE: KUKUP=${matchedKukup.length} | JOHOR=${matchedJohor.length}`);

    // 4. DOWNLOAD HANYA KUKUP & JOHOR
    let downloaded = 0;
    
    if (matchedKukup.length > 0) {
      downloadMatchedPDF(matchedKukup, 'KUKUP');
      downloaded++;
    }
    
    if (matchedJohor.length > 0) {
      downloadMatchedPDF(matchedJohor, 'JOHOR');
      downloaded++;
    }

    // 5. NOTIFIKASI (TANPA LAINNYA)
    const totalMatch = matchedKukup.length + matchedJohor.length;
    
        showNotification({
      type: 'success',
      html: '<div class="notifikasi-message" style="font-weight:800;">Proses selesai.</div><div class="notifikasi-detail"><div>TOTAL DATA COCOK : ' + totalMatch + ' DATA</div><div class="notifikasi-detail-grid"><span>DARI KUKUP</span><span>: ' + matchedKukup.length + '</span><span>DARI JOHOR</span><span>: ' + matchedJohor.length + '</span></div></div>'
    });

  } catch (error) {
    console.error("ERROR:", error);
    showNotification({ type: 'error', message: 'Gagal memproses file. Coba lagi.' });
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
    document.getElementById('pdfUpload').value = '';
    renderOverviewStats();
  }
}
function formatTanggalLahir(input) {
  // Hapus karakter non-angka
  let value = input.value.replace(/[^\d]/g, '');
  
  // Format automatis: DD-MM-YYYY
  if (value.length > 2) {
    value = value.substring(0,2) + '-' + value.substring(2);
  }
  if (value.length > 5) {
    value = value.substring(0,5) + '-' + value.substring(5,9);
  }
  
  // Batasi max 10 karakter (DD-MM-YYYY)
  input.value = value.substring(0, 10);
}
function setTanggalLahirFromPicker(dateValue) {
  if (!dateValue) return;
  
  // Ubah format YYYY-MM-DD menjadi DD-MM-YYYY untuk tampilan
  const parts = dateValue.split('-');
  const formatted = parts[2] + '-' + parts[1] + '-' + parts[0];
  
  // Set ke input teks
  document.getElementById('tanggalLahir').value = formatted;
}
// Koordinat default (fallback) = Tanjung Balai Karimun, Karimun, Kepulauan Riau
const DEFAULT_WEATHER_LAT = 0.991894;
const DEFAULT_WEATHER_LON = 103.437710;

// Menyimpan lokasi terakhir agar bisa dideteksi perubahan
let lastWeatherLat = DEFAULT_WEATHER_LAT;
let lastWeatherLon = DEFAULT_WEATHER_LON;

// Mengambil lokasi pengguna via Geolocation API (GPS)
function getUserLocation() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation tidak didukung di perangkat/browser ini');
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        console.warn('Gagal mengambil lokasi GPS:', err.message);
        resolve(null); // fallback ke default
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

async function updateCuaca() {
  // Tampilkan loading state yang bersih selama data cuaca belum pernah berhasil dimuat.
  // Mencegah data mentah/placeholder/karakter acak terlihat di Dashboard.
  if (!weatherLoaded && !weatherLoading) {
    setWeatherLoading();
  }
  weatherLoading = true;
  try {
    // 1. Ambil lokasi pengguna (GPS) terlebih dahulu
    const loc = await getUserLocation();
    const lat = loc ? loc.lat : DEFAULT_WEATHER_LAT;
    const lon = loc ? loc.lon : DEFAULT_WEATHER_LON;
    lastWeatherLat = lat;
    lastWeatherLon = lon;

    // 2. Ambil data cuaca berdasarkan koordinat lokasi pengguna
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius&timezone=Asia/Jakarta`
    );
    if (!response.ok) throw new Error('Response tidak OK');

    const data = await response.json();
    const temp = data.current_weather?.temperature ?? null;
    const code = data.current_weather?.weathercode ?? 0;
    const waktu = data.current_weather?.time || '';

    if (temp === null || isNaN(temp)) throw new Error('Data cuaca tidak valid');

    const cuaca = getWeatherInfo(code);

    // 3. Update elemen DOM (ID tetap sama, tampilan tidak berubah)
    if (document.getElementById('weatherNama')) {
      document.getElementById('weatherNama').textContent = cuaca.nama;
    }
    if (document.getElementById('weatherIcon')) {
      document.getElementById('weatherIcon').textContent = cuaca.icon;
    }
    if (document.getElementById('weatherTemp')) {
      const suhuBulat = Math.round(temp);
      document.getElementById('weatherTemp').textContent = `${suhuBulat}°`;
    }
    const summaryWeather = document.getElementById('summaryWeather');
    if (summaryWeather) {
      summaryWeather.textContent = cuaca.nama;
    }

    weatherLoaded = true;
    weatherLoading = false;
    console.log(`🌤️ Cuaca: ${cuaca.nama} ${cuaca.icon} ${temp}° (${waktu}) | Lokasi: ${lat}, ${lon}`);
  } catch (error) {
    console.error('Cuaca Error:', error);
    weatherLoading = false;
    if (!weatherLoaded) {
      setWeatherUnavailable();
    }
  }
}
function setWeatherLoading() {
  const namaEl = document.getElementById('weatherNama');
  const iconEl = document.getElementById('weatherIcon');
  const tempEl = document.getElementById('weatherTemp');
  if (namaEl) namaEl.textContent = 'Memuat cuaca...';
  if (iconEl) iconEl.textContent = '';
  if (tempEl) tempEl.textContent = '';
}
function setWeatherUnavailable() {
  const namaEl = document.getElementById('weatherNama');
  const iconEl = document.getElementById('weatherIcon');
  const tempEl = document.getElementById('weatherTemp');
  if (namaEl) namaEl.textContent = 'Cuaca tidak tersedia';
  if (iconEl) iconEl.textContent = '';
  if (tempEl) tempEl.textContent = '';
  const summaryWeather = document.getElementById('summaryWeather');
  if (summaryWeather) summaryWeather.textContent = 'Tidak tersedia';
}
function getWeatherInfo(code) {
  return {
    0: { icon: '☀️', nama: 'CERAH' },
    1: { icon: '🌤️', nama: 'CERAH' },
    2: { icon: '⛅', nama: 'MENDUNG' },
    3: { icon: '☁️', nama: 'MENDUNG' },
    45: { icon: '🌫️', nama: 'KABUT' },
    48: { icon: '🌫️', nama: 'KABUT' },
    51: { icon: '🌧️', nama: 'HUJAN' },
    53: { icon: '🌧️', nama: 'HUJAN' },
    55: { icon: '🌧️', nama: 'HUJAN' },
    61: { icon: '🌧️', nama: 'HUJAN' },
    63: { icon: '🌧️', nama: 'HUJAN' },
    65: { icon: '🌧️', nama: 'HUJAN' },
    71: { icon: '❄️', nama: 'SALJU' },
    73: { icon: '❄️', nama: 'SALJU' },
    75: { icon: '❄️', nama: 'SALJU' },
    80: { icon: '🌦️', nama: 'HUJAN' },
    81: { icon: '🌦️', nama: 'HUJAN' },
    82: { icon: '🌦️', nama: 'HUJAN' },
    95: { icon: '⛈️', nama: 'BADAI' },
    96: { icon: '⛈️', nama: 'BADAI' },
    99: { icon: '⛈️', nama: 'BADAI' }
  }[code] || { icon: '🌡️', nama: 'NORMAL' };
}
