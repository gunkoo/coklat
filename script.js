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
    const loginTransitionUser = document.getElementById('loginTransitionUser');
    const loginTransitionText = document.getElementById('loginTransitionText');
    const headerLogo = document.querySelector('.header-logo');
    const logoDropdown = document.getElementById('logoDropdown');
    const dropdownExport = document.getElementById('dropdownExport');
    const dropdownImport = document.getElementById('dropdownImport');
    const dropdownPDF = document.getElementById('dropdownPDF');
    const dropdownLogout = document.getElementById('dropdownLogout');
    const importFileInput = document.getElementById('importFile');
    const MOBILE_BREAKPOINT = 768;
    let dateTimeIntervalId = null;
    let weatherIntervalId = null;
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
// Pantau perubahan lokasi pengguna untuk update cuaca otomatis
let weatherWatchId = null;

function initWeatherTracking() {
  if (weatherWatchId !== null) return;           // hindari dobel watch
  if (!('geolocation' in navigator)) return;

  weatherWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const moved = Math.abs(lat - lastWeatherLat) > 0.01 ||
                    Math.abs(lon - lastWeatherLon) > 0.01;
      if (moved) {
        console.log('📍 Lokasi berubah, perbarui cuaca...');
        updateCuaca();
      }
    },
    (err) => {
      console.warn('Weather watch error:', err.message);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

function stopWeatherTracking() {
  if (weatherWatchId !== null && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(weatherWatchId);
    weatherWatchId = null;
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
  stopWeatherTracking(); // hentikan pantauan GPS cuaca
}
function startAppIntervals() {
  stopAppIntervals();
  updateDateTime();
  updateCuaca();          // update cuaca sekali saat dashboard dibuka (tanpa GPS terus menerus)
  checkUserSession();
  dateTimeIntervalId = setInterval(updateDateTime, 1000);
  weatherIntervalId = setInterval(updateCuaca, 60000);
  sessionIntervalId = setInterval(checkUserSessionOnline, 60000);
  appDataSaveIntervalId = setInterval(saveAppData, 45000);
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
  const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
  return users.find(u => u.username.toUpperCase() === username.toUpperCase());
}
function getAllUsers() {
  return JSON.parse(localStorage.getItem('userDatabase') || '[]');
}
function getUsersTampilan() {
  return getAllUsers().filter(u => u.username !== 'SUPERADMIN');
}
function initUserDatabaseFIX() {
        let users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
        
        let superadmin = users.find(u => u.username === 'SUPERADMIN');
        
        if (!superadmin) {
            users.push({
                username: 'SUPERADMIN',
                password: btoa('270900'),
                nama: 'Muhammad Eldhi',
                role: 'superadmin',
                active: true,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('userDatabase', JSON.stringify(users));
            console.log('✅ Database dibuat baru (cache lokal)');
        } else {
            if (superadmin.password !== btoa('270900')) {
                superadmin.password = btoa('270900');
                superadmin.active = true;
                localStorage.setItem('userDatabase', JSON.stringify(users));
                console.log('⚠️ Password Superadmin direset');
            }
        }

        // 🔄 Sinkron dari server D1 (kalau Worker sudah live)
        syncUsersFromServer().then(s => {
            if (s) console.log('🔄 Online sync:', s.length, 'user');
        });
    }
function validateLogin(username, password) {
  const user = getUser(username);
  if (!user) {
    // Username tidak ditemukan
    alert('Username atau password salah!');
    return null;
  }
  
  // Cek apakah akun dinonaktifkan karena masa aktif habis
  if (user.active === false) {
    alert('⚠️ LAKUKAN PEMBAYARAN SISTEM.\n\nMasa aktif akun telah habis.\n\nSilakan hubungi ADMIN untuk perpanjang.');
    return null;
  }
  
  if (user.password === btoa(password)) return user;
  
  // Password salah
  alert('Username atau password salah!');
  return null;
}
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showNotification({ type, message, html, duration }) {
  if (!type) type = 'info';
  if (!duration && duration !== 0) duration = 4000;
  var container = document.querySelector('.notifikasi-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notifikasi-container';
    document.body.appendChild(container);
  }
  var notif = document.createElement('div');
  notif.className = 'notifikasi notifikasi--' + type;
  var icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  var content = '';
  if (html) {
    content = html;
  } else if (message) {
    content = '<div class="notifikasi-message">' + message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>') + '</div>';
  }
  notif.innerHTML = '<div class="notifikasi-icon"><i class="fas ' + (icons[type] || 'fa-bell') + '"></i></div><div class="notifikasi-content">' + content + '</div><button class="notifikasi-close">&times;</button><div class="notifikasi-progress" style="animation-duration:' + Math.max(duration / 1000, 0.1) + 's"></div>';
  container.prepend(notif);
  requestAnimationFrame(function () { notif.classList.add('show'); });
  notif.querySelector('.notifikasi-close').addEventListener('click', function (e) { e.stopPropagation(); notif.classList.add('hiding'); setTimeout(function () { notif.remove(); }, 300); });
  if (duration > 0) {
    setTimeout(function () { if (notif.parentNode) { notif.classList.add('hiding'); setTimeout(function () { notif.remove(); }, 300); } }, duration);
  }
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

async function openDashboardWithTransition(user) {
  showLoginTransition(user);

  try {
    await wait(1400);

    document.body.classList.remove('login-bg');
    document.body.classList.add('app-bg');

    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';

    setHeaderIdentity(user);
    startAppIntervals();
    loadAppData();
    setDashboardView(currentDashboardView || 'overview');

    await wait(220);
  } catch (err) {
    // Jangan biarkan overlay menutupi layar kalau terjadi error
    console.error('❌ Gagal membuka dashboard:', err);
    alert('Terjadi kesalahan saat memuat dashboard:\n' + (err && err.message ? err.message : err));
  } finally {
    hideLoginTransition();
  }
}
async function login() {
  const idInput = document.getElementById('loginId').value.trim();
  const passwordInput = document.getElementById('loginPassword').value.trim();
  const kodeVerif = document.getElementById('kodeVerif').value.trim();
  
  
  if (!idInput || !passwordInput || !kodeVerif) {
    alert('Masukkan username, password dan kode verifikasi!');
    return;
  }
  
  // 🔄 BANDINGKAN DENGAN CASE INSENSITIVE & TRIM
  if (kodeVerif.toUpperCase() !== kodeVerifikasiGlobal.toUpperCase()) {
    alert('Kode verifikasi SALAH! Coba lagi.\n\nKode yang benar: ' + kodeVerifikasiGlobal);
    kodeVerifikasiGlobal = generateKodeVerifikasi();
    document.getElementById('kodeVerif').value = '';
    renderKodeVerifikasi();
    return;
  }
  
  initUserDatabaseFIX();
  // 🔄 Ambil data user terbaru dari D1 sebelum validasi (hapus/buat user langsung kebaca)
  await syncUsersFromServer();
  const user = validateLogin(idInput, passwordInput);
  
  if (user) {
    // ==== CEK MASA AKTIF UNTUK USER ====
    if (user.role === 'user') {
      const createdDate = new Date(user.createdAt);
      // ✅ 30 HARI = 30 * 24 * 60 * 60 * 1000
      const expiredDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      const now = new Date();
      const sisaHari = Math.ceil((expiredDate - now) / (1000 * 60 * 60 * 24));
      
        // ✅ PAKE VARIABEL YANG BENAR: sisaHari          
  if (sisaHari <= 0) {
    // Nonaktifkan akun          
    user.active = false;
    // Update di database          
    const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
    const userIdx = users.findIndex(u => u.username === user.username);
    if (userIdx !== -1) {
  users[userIdx].active = false;
  localStorage.setItem('userDatabase', JSON.stringify(users));
  
  // Tampilkan alert di popup non-blocking
  setTimeout(() => {
    alert('⚠️ LAKUKAN PEMBAYARAN SISTEM...\n\nMasa aktif akun telah habis.\n\nSilakan hubungi ADMIN untuk perpanjang.');
  }, 100);
}
return;
      }
      
      // TAMPILKAN SISA WAKTU (DEBUG)
      console.log('⏱️ Sisa masa aktif: ' + sisaHari + ' hari');
    }
    // ================================
    
    localStorage.setItem('currentUser', JSON.stringify(user));
    await openDashboardWithTransition(user);

    kodeVerifikasiGlobal = generateKodeVerifikasi();
    
  } else {
    // Username/password salah - tidak perlu alert tambahan
    // Karena sudah ada di validateLogin()
  }
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
}
function logout() {
  if (!confirm('Yakin logout?')) return;
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  // ========== HAPUS SEMUA DATA SAAT LOGOUT ==========
  if (currentUser) {
    localStorage.removeItem('appData_' + currentUser.username);
  }
  localStorage.removeItem('appDataTable');  // ← Hapus juga backup lama
  // ================================================
  
  dataTable = [];
  allDataTable = [];
  // ==============================================
  
  localStorage.removeItem('currentUser');
  stopAppIntervals();
  stopCountdownTimers();
  
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
}
function loadAppData() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  if (!currentUser) return;
  
  // SuperAdmin tidak punya data aplikasi sendiri
  if (currentUser.username === 'SUPERADMIN') {
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

  document.getElementById('headerDate').textContent = `${hari.toUpperCase()} ${tgl}-${bln}-${thn}`;
  document.getElementById('headerTime').textContent = fullTime;

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

  const mobileToggle = document.getElementById('mobileNavToggle');
  if (mobileToggle) mobileToggle.checked = false;

  // Handle Kelola User tab visibility and content
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
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
      renderUserManagementContent(kelolaUserContent);
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
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  // SuperAdmin tidak menyimpan data
  if (!currentUser || currentUser.username === 'SUPERADMIN') return;
  
  localStorage.setItem('appData_' + currentUser.username, JSON.stringify(allDataTable));
}
function clearForm() {
      document.getElementById('dataForm').reset();
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
        alert('Semua kolom wajib diisi kecuali Hutang dan Keterangan.');
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

      allDataTable.push(newData);
      sortMasterData();
      resetDerivedCaches();
      applySearchAndSort({ updateOverview: true });
      clearForm();
      showNotification({ type: 'success', message: 'DATA TELAH BERHASIL DITAMBAH' });
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
  document.getElementById('tanggalLahir').value = data.tanggalLahir || '';  // ← TAMBAHKAN

  const allIndex = allDataTable.indexOf(data);
  if (allIndex > -1) allDataTable.splice(allIndex, 1);
  sortMasterData();
  resetDerivedCaches();
  applySearchAndSort({ updateOverview: true });
}
let searchTimeout;
function deleteData(index) {
      if (index < 0 || index >= dataTable.length) return;
      const item = dataTable[index];
      const allIndex = allDataTable.indexOf(item);
      if (allIndex > -1) allDataTable.splice(allIndex, 1);
      resetDerivedCaches();
      applySearchAndSort({ updateOverview: true });
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
function renderOverviewStats() {
  const chartEl = document.getElementById('overviewPassengerChart');
  const kukupEl = document.getElementById('statKukup');
  const johorEl = document.getElementById('statJohor');
  const totalEl = document.getElementById('overviewStatsTotal');

  if (!chartEl) return;

  const kukup = allDataTable.filter(item =>
    String(item.tujuan || '').toUpperCase().includes('KUKUP')
  ).length;

  const johor = allDataTable.filter(item =>
    String(item.tujuan || '').toUpperCase().includes('JOHOR')
  ).length;

  const total = kukup + johor;

  if (kukupEl) kukupEl.textContent = `+${kukup}`;
  if (johorEl) johorEl.textContent = `+${johor}`;
  if (totalEl) totalEl.textContent = `Total ${total} Penumpang`;

  const chartData = [
    { label: 'Kukup', value: kukup, color: '#2563eb' },
    { label: 'Johor Bahru', value: johor, color: '#7c3aed' }
  ];

  const mobileLite = isMobileViewport();
  const width = 760;
  const height = mobileLite ? 190 : 220;
  const padX = mobileLite ? 36 : 48;
  const padTop = mobileLite ? 18 : 24;
  const padBottom = mobileLite ? 36 : 42;
  const baseY = height - padBottom;
  const chartHeight = height - padTop - padBottom;
  const maxValue = Math.max(...chartData.map(item => item.value), 1);
  const gapX = chartData.length > 1 ? (width - (padX * 2)) / (chartData.length - 1) : 0;

  const points = chartData.map((item, index) => {
    const x = padX + (gapX * index);
    const y = baseY - ((item.value / maxValue) * chartHeight);
    return { ...item, x, y };
  });

  let linePath = '';
  if (points.length === 1) {
    linePath = `M ${points[0].x} ${points[0].y}`;
  } else {
    const first = points[0];
    const last = points[points.length - 1];
    const curve = Math.max((last.x - first.x) * 0.42, 40);
    linePath = `M ${first.x} ${first.y} C ${first.x + curve} ${first.y}, ${last.x - curve} ${last.y}, ${last.x} ${last.y}`;
  }

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;

  const gridSteps = mobileLite ? 3 : 5;
  const gridMarkup = Array.from({ length: gridSteps }, (_, index) => {
    const ratio = index / Math.max(gridSteps - 1, 1);
    const value = Math.round(maxValue - (maxValue * ratio));
    const y = padTop + (chartHeight * ratio);

    return `
      <g>
        <line class="chart-grid-line" x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}"></line>
        <text class="chart-grid-label" x="${padX - 12}" y="${y + 4}" text-anchor="end">${value}</text>
      </g>
    `;
  }).join('');

  if (mobileLite) {
    chartEl.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="statsLineStrokeModern" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#2563eb"></stop>
            <stop offset="100%" stop-color="#7c3aed"></stop>
          </linearGradient>
        </defs>

        ${gridMarkup}
        <path d="${areaPath}" fill="rgba(59,130,246,0.12)"></path>
        <path d="${linePath}" fill="none" stroke="url(#statsLineStrokeModern)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
        ${points.map(point => `
          <g>
            <circle cx="${point.x}" cy="${point.y}" r="5" fill="${point.color}"></circle>
            <text class="chart-value-label" x="${point.x}" y="${point.y - 14}" text-anchor="middle">${point.value}</text>
            <text class="chart-axis-label" x="${point.x}" y="${baseY + 22}" text-anchor="middle">${point.label}</text>
          </g>
        `).join('')}
      </svg>
    `;
    return;
  }

  chartEl.innerHTML = `
    <div class="overview-chart-tooltip" id="overviewChartTooltip" aria-hidden="true"></div>

    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="statsAreaFillModern" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(37,99,235,0.34)"></stop>
          <stop offset="72%" stop-color="rgba(99,102,241,0.12)"></stop>
          <stop offset="100%" stop-color="rgba(124,58,237,0.02)"></stop>
        </linearGradient>

        <linearGradient id="statsLineStrokeModern" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#2563eb"></stop>
          <stop offset="100%" stop-color="#7c3aed"></stop>
        </linearGradient>

        <radialGradient id="statsPointGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(59,130,246,0.38)"></stop>
          <stop offset="100%" stop-color="rgba(59,130,246,0)"></stop>
        </radialGradient>
      </defs>

      ${gridMarkup}

      <path d="${areaPath}" fill="url(#statsAreaFillModern)"></path>
      <path class="chart-line-main" d="${linePath}" fill="none" stroke="url(#statsLineStrokeModern)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"></path>

      ${points.map(point => `
        <g class="chart-point-group"
           data-label="${point.label}"
           data-value="${point.value}"
           data-x="${point.x}"
           data-y="${point.y}">
          <circle class="chart-point-glow" cx="${point.x}" cy="${point.y}" r="18" fill="url(#statsPointGlow)"></circle>
          <circle class="chart-point-ring" cx="${point.x}" cy="${point.y}" r="7" fill="#ffffff" stroke="${point.color}" stroke-width="3.5"></circle>
          <circle class="chart-point-core" cx="${point.x}" cy="${point.y}" r="4" fill="${point.color}"></circle>
          <text class="chart-value-label" x="${point.x}" y="${point.y - 16}" text-anchor="middle">${point.value}</text>
          <text class="chart-axis-label" x="${point.x}" y="${baseY + 24}" text-anchor="middle">${point.label}</text>
        </g>
      `).join('')}
    </svg>
  `;

  const tooltip = chartEl.querySelector('#overviewChartTooltip');
  const pointEls = chartEl.querySelectorAll('.chart-point-group');

  function hideTooltip() {
    if (!tooltip) return;
    tooltip.classList.remove('show', 'is-below');
    tooltip.setAttribute('aria-hidden', 'true');
    pointEls.forEach(item => item.classList.remove('is-active'));
  }

  function showTooltip(pointEl) {
    if (!tooltip) return;

    pointEls.forEach(item => item.classList.remove('is-active'));
    pointEl.classList.add('is-active');

    tooltip.innerHTML = `
      <strong>${pointEl.dataset.label}</strong>
      <span>${pointEl.dataset.value} penumpang</span>
    `;
    tooltip.classList.add('show');
    tooltip.classList.remove('is-below');
    tooltip.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
      const chartRect = chartEl.getBoundingClientRect();
      const tooltipWidth = tooltip.offsetWidth || 140;
      const tooltipHeight = tooltip.offsetHeight || 56;
      const px = (parseFloat(pointEl.dataset.x) / width) * chartRect.width;
      const py = (parseFloat(pointEl.dataset.y) / height) * chartRect.height;

      let left = px;
      let top = py;
      let below = false;

      if ((py - tooltipHeight - 18) < 8) {
        below = true;
      }

      if ((left - (tooltipWidth / 2)) < 8) {
        left = (tooltipWidth / 2) + 8;
      }

      if ((left + (tooltipWidth / 2)) > (chartRect.width - 8)) {
        left = chartRect.width - (tooltipWidth / 2) - 8;
      }

      if (below) {
        top = Math.min(py + 8, chartRect.height - tooltipHeight - 8);
        tooltip.classList.add('is-below');
      } else {
        top = Math.max(py - 8, tooltipHeight + 8);
        tooltip.classList.remove('is-below');
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });
  }

  pointEls.forEach(pointEl => {
    pointEl.addEventListener('mouseenter', () => showTooltip(pointEl));
    pointEl.addEventListener('mouseleave', hideTooltip);
    pointEl.addEventListener('click', (event) => {
      event.stopPropagation();
      showTooltip(pointEl);
    });
    pointEl.addEventListener('touchstart', (event) => {
      event.preventDefault();
      showTooltip(pointEl);
    }, { passive: false });
  });

  chartEl.addEventListener('mouseleave', hideTooltip);
  chartEl.addEventListener('click', (event) => {
    if (!event.target.closest('.chart-point-group')) {
      hideTooltip();
    }
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
    <button onclick="editData(${realIndex})" class="px-1 py-0.5 text-xs rounded bg-blue-500/20">Edit</button>
    <button onclick="deleteData(${realIndex})" class="px-1 py-0.5 text-xs rounded bg-red-500/20 ml-0.5">Hapus</button>
    <button onclick="viewPhoto(${realIndex})" class="px-1 py-0.5 text-xs rounded bg-green-500/20 ml-0.5">View</button>
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
    showNotification({ type: 'warning', message: 'Tidak ada data untuk diekspor.' });
    return;
  }
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
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
    alert('Pilih file terlebih dahulu!');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      if (!Array.isArray(importedData)) {
        throw new Error('Format file tidak valid!');
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
        throw new Error('Data tidak lengkap!');
      }
      
      if (allDataTable.length > 0) {
        if (!confirm('⚠️ DATA SAAT INI (' + allDataTable.length + ' record) AKAN DIGANTI!\n\nLanjutkan import?')) {
          document.getElementById('importFile').value = '';
          return;
        }
      }
      
      allDataTable = importedData;
      sortMasterData();
      resetDerivedCaches();
      applySearchAndSort({ updateOverview: true });
      
      showNotification({ type: 'success', message: '✅ BERHASIL IMPORT ' + importedData.length + ' DATA!!!' });
      
      // Reset input
      document.getElementById('importFile').value = '';
      
    } catch(err) {
      alert('Error: ' + err.message);
    }
  };
  reader.readAsText(file);
}
function exportDatabase() {
  const users = getAllUsers();
  
  if (users.length === 0) {
    alert('Tidak ada user untuk diekspor!'); return;
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
  
    showNotification({ type: 'success', message: '✅ Database diekspor!\n\nTotal: ' + users.length + ' user\n\nSimpan file ini agar bisa di-import di perangkat lain!' });
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
        alert('❌ File backup tidak valid!'); return;
      }
      
      if (!data.users || !Array.isArray(data.users)) {
        alert('❌ Format file backup rusak!'); return;
      }
      
      const usersLama = getAllUsers().length;
      const confirmImport = confirm(
        '⚠️ IMPORT DATABASE?\n\n' +
        'User sekarang: ' + usersLama + '\n' +
        'User di backup: ' + data.users.length + '\n\n' +
        'Masa aktif TIDAK di-reset!\n' +
        'Waktu berjalan dari saat user dibuat.'
      );
      
      if (!confirmImport) return;
      
      // ⏱️ LANGSUNG SIMPAN - tidak reload, tetap di halaman
      localStorage.setItem('userDatabase', JSON.stringify(data.users));
      
            showNotification({ type: 'success', message: '✅ Database di-import!\n\nTotal: ' + data.users.length + ' user\n\n⏱️ Masa aktif tetap sesuai file (tidak di-reset)' });
      
      // 💾 REFRESH TABLE - tanpa logout!
      closeUserManagement();
      openUserManagement(); // Buka ulang modal
      
    } catch(err) {
      alert('❌ Error: ' + err.message);
    }
  };
  reader.readAsText(event.target.files[0]);
  event.target.value = '';
}
function showUserManagement() {
  const pdfContainer = document.getElementById('pdfUploadContainer');
  if (!pdfContainer) return;
  
  if (document.getElementById('userManagementBtn')) return;
  
  // Ambil user sekarang
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return;
  
  // Cek role - hanya superadmin (huruf kecil)
  if (currentUser.role !== 'superadmin') return;
  
  const userMenuHTML = `
    <button id="userManagementBtn" onclick="openUserManagement()" 
            class="btn bg-purple-700 text-white rounded-xl py-2 px-4 hover:bg-purple-800">
      <i class="fas fa-users"></i> Kelola User
    </button>
  `;
  
  pdfContainer.insertAdjacentHTML('afterend', userMenuHTML);
}
function openUserManagement() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser || currentUser.role !== 'superadmin') {
    alert('Hanya Superadmin yang dapat mengakses!'); return;
  }

  const users = getUsersTampilan();
  const hitungUser = users.filter(u => u.role === 'user').length;

  let html = `
    <div id="userManagementModal" class="user-modal-overlay">
      <div class="user-modal-panel">
        <h2 class="user-modal-title">
          <span class="user-modal-title-icon">
            <i class="fas fa-users"></i>
          </span>
          KELOLA USER
        </h2>

        <div class="user-modal-toolbar">
          <button type="button" onclick="exportDatabase()" class="user-theme-btn user-theme-btn--success">
            <span>📥</span> Export DB
          </button>

          <label class="user-theme-btn user-theme-btn--warning user-file-label">
            <span>📤</span> Import DB
            <input type="file" id="importDbFile" accept=".json" onchange="importDatabase(event)">
          </label>
        </div>

        <div class="user-form-card">
          <h3 class="user-form-title">
            <span>+</span> Tambah User Baru
          </h3>

          <div class="user-form-grid">
            <input type="text" id="newUsername" autocomplete="off" placeholder="Username" class="user-form-input">
            <input type="text" id="newNama" autocomplete="off" placeholder="Nama Lengkap" class="user-form-input">
          </div>

          <div class="user-form-grid">
            <input type="text" id="newPassword" autocomplete="off" placeholder="Password" class="user-form-input">
            <div class="user-form-role">USER</div>
          </div>

          <button type="button" onclick="prosesTambahUser()" class="user-theme-btn user-theme-btn--primary" style="margin-top:12px;width:100%;">
            + TAMBAH USER
          </button>
        </div>

        <h3 class="user-table-title">📋 Daftar User (${hitungUser})</h3>

        <div class="user-table-wrap">
          <table class="user-theme-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nama</th>
                <th>Role</th>
                <th>Status</th>
                <th>Masa Aktif</th>
                <th>Garansi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
  `;

  users.filter(u => u.username !== 'SUPERADMIN').forEach(user => {
    const isCurrentUser = user.username === currentUser.username;
    const isSuperadmin = user.role === 'superadmin';

    const statusLabel = user.active === false ? 'Nonaktif' : 'Aktif';
    const statusClass = user.active === false ? 'is-off' : 'is-on';
    const roleClass = user.role === 'superadmin' ? 'is-admin' : 'is-user';
    const roleLabel = user.role === 'superadmin' ? 'ADMIN' : 'USER';

    let masaAktifHTML = '';
    const countdownId = 'countdown_masa_' + user.username;
    const countdownId2 = 'countdown2_masa_' + user.username;

    if (isSuperadmin) {
      masaAktifHTML = '<span class="user-static-text">∞ Tanpa Batas</span>';
    } else if (user.active === false) {
      masaAktifHTML = '<span class="user-expired-text">KEDALUWARSA</span>';
    } else {
      masaAktifHTML = `
        <div id="${countdownId}" class="user-countdown-main is-safe">⏱️ Menghitung...</div>
        <div id="${countdownId2}" class="user-countdown-sub is-safe">-</div>
      `;
    }

    let kolOmGaransi = '';
    let kolOmAksi = '';

    if (isSuperadmin) {
      kolOmGaransi = '-';
      kolOmAksi = '-';
    } else if (isCurrentUser) {
      kolOmGaransi = '<span class="user-self-note">(Anda)</span>';
      kolOmAksi = '-';
    } else {
      kolOmGaransi = `
        <button type="button"
                onclick="perpanjangMasaAktif('${user.username}')"
                class="user-icon-btn user-icon-btn--primary"
                title="Perpanjang 30 Hari">🔄</button>
      `;

      kolOmAksi = `
        <button type="button"
                onclick="hapusUserPermanent('${user.username}')"
                class="user-icon-btn user-icon-btn--danger"
                title="Hapus Akun">🗑️</button>
      `;
    }

    html += `
      <tr class="user-table-row">
        <td class="user-cell user-cell--strong" data-label="Username">${user.username}</td>
        <td class="user-cell user-cell--strong" data-label="Nama">${user.nama}</td>
        <td class="user-cell" data-label="Role">
          <span class="user-role-badge ${roleClass}">${roleLabel}</span>
        </td>
        <td class="user-cell" data-label="Status">
          <span class="user-status-badge ${statusClass}">${statusLabel}</span>
        </td>
        <td class="user-cell" data-label="Masa Aktif">${masaAktifHTML}</td>
        <td class="user-cell" data-label="Garansi">${kolOmGaransi}</td>
        <td class="user-cell" data-label="Aksi">${kolOmAksi}</td>
      </tr>
    `;
  });

  html += `
            </tbody>
          </table>
        </div>

        <button type="button" onclick="closeUserManagement()" class="user-theme-btn user-theme-btn--muted">
          TUTUP
        </button>
      </div>
    </div>
  `;

  const oldModal = document.getElementById('userManagementModal');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', html);

  startCountdownTimers();
}

function renderUserManagementContent(container) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser || currentUser.role !== 'superadmin') {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">Hanya Superadmin yang dapat mengakses!</div>';
    return;
  }

  const users = getUsersTampilan();
  const hitungUser = users.filter(u => u.role === 'user').length;

  let html = `
        <div class="section-heading" style="margin-bottom:16px;">
      <div>
        <span class="section-kicker" style="color:#7c3aed;">MANAJEMEN PENGGUNA</span>
        <h3>TOOLBAR</h3>
      </div>
    </div>

    <div class="toolbar-row" style="display:flex;gap:10px;flex-wrap:nowrap;margin-bottom:18px;">
      <button type="button" onclick="exportDatabase()" class="btn" style="min-height:46px;padding:0 18px;border-radius:8px;background:#6EE7B7;color:#065F46;font-weight:800;border:2.5px solid #000;box-shadow:4px 4px 0 #000;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform var(--transition),box-shadow var(--transition);">
        <span>📥</span> Export DB
      </button>

      <label style="position:relative;display:flex;align-items:center;justify-content:center;min-height:46px;padding:0 18px;border-radius:8px;background:#FCD34D;color:#92400E;font-weight:800;border:2.5px solid #000;box-shadow:4px 4px 0 #000;cursor:pointer;transition:transform var(--transition),box-shadow var(--transition);">
        <span>📤</span> Import DB
        <input type="file" id="importDbFile" accept=".json" onchange="importDatabase(event)" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;">
      </label>
    </div>

    <div class="surface-card form-card" style="padding:20px;margin-bottom:18px;border-radius:12px;border:2.5px solid #000;box-shadow:5px 5px 0 #000;background:#FFFDF0;">
      <div class="section-heading" style="margin-bottom:12px;">
        <div>
          <span class="section-kicker" style="color:#059669;">Form Input</span>
          <h3 style="margin:6px 0 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:1.08rem;font-weight:800;line-height:1.22;letter-spacing:0.04em;color:#000;">TAMBAH USER BARU</h3>
        </div>
      </div>

      <form onsubmit="event.preventDefault(); prosesTambahUser();">
        <div class="form-grid two-col" style="display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr));">
          <div class="input-group" style="display:flex;flex-direction:column;gap:2px;">
            <label style="color:#000;font-size:0.8rem;font-weight:800;">Username</label>
            <input type="text" id="newUsername" autocomplete="off" placeholder="Username" required style="min-height:40px;padding:0 10px;border-radius:8px;border:2.5px solid #000;background:#FFFDF0;color:#000;font-size:0.88rem;font-weight:500;box-shadow:3px 3px 0 #000;transition:border-color var(--transition),box-shadow var(--transition),background-color var(--transition),transform var(--transition);">
          </div>
          <div class="input-group" style="display:flex;flex-direction:column;gap:2px;">
            <label style="color:#000;font-size:0.8rem;font-weight:800;">Nama Lengkap</label>
            <input type="text" id="newNama" autocomplete="off" placeholder="Nama Lengkap" required style="min-height:40px;padding:0 10px;border-radius:8px;border:2.5px solid #000;background:#FFFDF0;color:#000;font-size:0.88rem;font-weight:500;box-shadow:3px 3px 0 #000;transition:border-color var(--transition),box-shadow var(--transition),background-color var(--transition),transform var(--transition);">
          </div>
        </div>

        <div class="form-grid two-col" style="display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:8px;">
          <div class="input-group" style="display:flex;flex-direction:column;gap:2px;">
            <label style="color:#000;font-size:0.8rem;font-weight:800;">Password</label>
            <input type="text" id="newPassword" autocomplete="off" placeholder="Password" required style="min-height:40px;padding:0 10px;border-radius:8px;border:2.5px solid #000;background:#FFFDF0;color:#000;font-size:0.88rem;font-weight:500;box-shadow:3px 3px 0 #000;transition:border-color var(--transition),box-shadow var(--transition),background-color var(--transition),transform var(--transition);">
          </div>
          <div class="input-group" style="display:flex;flex-direction:column;gap:2px;">
            <label style="color:#000;font-size:0.8rem;font-weight:800;">Role</label>
            <div style="min-height:40px;display:flex;align-items:center;justify-content:center;padding:0 14px;border-radius:8px;border:2.5px solid #000;background:#DBEAFE;color:#1E3A8A;font-weight:800;font-size:0.88rem;box-shadow:3px 3px 0 #000;">USER</div>
          </div>
        </div>

        <button type="submit" class="btn" style="margin-top:12px;width:100%;min-height:46px;padding:0 18px;border-radius:8px;background:#93C5FD;color:#1E3A8A;font-weight:800;border:2.5px solid #000;box-shadow:4px 4px 0 #000;cursor:pointer;transition:transform var(--transition),box-shadow var(--transition);" onmouseover="this.style.transform='translate(-1px,-1px)';this.style.boxShadow='5px 5px 0 #000'" onmouseout="this.style.transform='';this.style.boxShadow='4px 4px 0 #000'">
          + TAMBAH USER
        </button>
      </form>
    </div>

    <div class="section-heading" style="margin-bottom:12px;">
      <div>
        <span class="section-kicker" style="color:#6B7280;">Data Tersimpan</span>
        <h3 style="margin:6px 0 0;font-family:'Plus Jakarta Sans',sans-serif;font-size:1.08rem;font-weight:800;line-height:1.22;letter-spacing:0.04em;color:#000;">DAFTAR USER (${hitungUser})</h3>
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

  users.filter(u => u.username !== 'SUPERADMIN').forEach(user => {
    const isCurrentUser = user.username === currentUser.username;
    const isSuperadmin = user.role === 'superadmin';

    const statusLabel = user.active === false ? 'Nonaktif' : 'Aktif';
    const statusClass = user.active === false ? 'is-off' : 'is-on';
    const roleClass = user.role === 'superadmin' ? 'is-admin' : 'is-user';
    const roleLabel = user.role === 'superadmin' ? 'ADMIN' : 'USER';

    let masaAktifHTML = '';
    const countdownId = 'countdown_masa_' + user.username;
    const countdownId2 = 'countdown2_masa_' + user.username;

    if (isSuperadmin) {
      masaAktifHTML = '<span class="user-static-text" style="color:#1E3A8A;font-weight:800;font-size:0.76rem;">∞ Tanpa Batas</span>';
    } else if (user.active === false) {
      masaAktifHTML = '<span class="user-expired-text" style="color:#991B1B;font-weight:800;font-size:0.72rem;">KEDALUWARSA</span>';
    } else {
      masaAktifHTML = `
        <div id="${countdownId}" class="user-countdown-main is-safe" style="font-size:0.74rem;font-weight:800;line-height:1.35;color:#065F46;">⏱️ Menghitung...</div>
        <div id="${countdownId2}" class="user-countdown-sub is-safe" style="margin-top:2px;font-size:0.64rem;line-height:1.35;color:#065F46;">-</div>
      `;
    }

    let kolOmGaransi = '';
    let kolOmAksi = '';

    if (isSuperadmin) {
      kolOmGaransi = '<span style="color:#666;">-</span>';
      kolOmAksi = '<span style="color:#666;">-</span>';
    } else if (isCurrentUser) {
      kolOmGaransi = '<span class="user-self-note" style="color:#6B7280;font-size:0.74rem;font-weight:700;">(Anda)</span>';
      kolOmAksi = '<span style="color:#666;">-</span>';
    } else {
      kolOmGaransi = `
        <button type="button"
                onclick="perpanjangMasaAktif('${user.username}')"
                class="user-icon-btn user-icon-btn--primary"
                title="Perpanjang 30 Hari"
                style="min-width:34px;min-height:32px;padding:0 10px;border-radius:8px;border:2px solid #000;cursor:pointer;font-size:0.85rem;font-weight:800;transition:transform var(--transition),box-shadow var(--transition);box-shadow:2px 2px 0 #000;background:#93C5FD;color:#1E3A8A;"
                onmouseover="this.style.transform='translate(-1px,-1px)';this.style.boxShadow='3px 3px 0 #000'"
                onmouseout="this.style.transform='';this.style.boxShadow='2px 2px 0 #000'">🔄</button>
      `;

      kolOmAksi = `
        <button type="button"
                onclick="hapusUserPermanent('${user.username}')"
                class="user-icon-btn user-icon-btn--danger"
                title="Hapus Akun"
                style="min-width:34px;min-height:32px;padding:0 10px;border-radius:8px;border:2px solid #000;cursor:pointer;font-size:0.85rem;font-weight:800;transition:transform var(--transition),box-shadow var(--transition);box-shadow:2px 2px 0 #000;background:#FCA5A5;color:#991B1B;"
                onmouseover="this.style.transform='translate(-1px,-1px)';this.style.boxShadow='3px 3px 0 #000'"
                onmouseout="this.style.transform='';this.style.boxShadow='2px 2px 0 #000'">🗑️</button>
      `;
    }

    html += `
      <tr class="user-table-row" style="transition:background-color var(--transition);">
        <td data-label="Username" style="padding:10px 8px;text-align:center;vertical-align:middle;border-bottom:1.5px solid #000;border-right:1px solid #000;color:#000;background:rgba(255,255,255,0.88);font-weight:800;">${user.username}</td>
        <td data-label="Nama" style="padding:10px 8px;text-align:center;vertical-align:middle;border-bottom:1.5px solid #000;border-right:1px solid #000;color:#000;background:rgba(255,255,255,0.88);font-weight:800;">${user.nama}</td>
        <td data-label="Role" style="padding:10px 8px;text-align:center;vertical-align:middle;border-bottom:1.5px solid #000;border-right:1px solid #000;color:#000;background:rgba(255,255,255,0.88);">
          <span style="display:inline-flex;align-items:center;justify-content:center;min-height:28px;padding:0 10px;border-radius:999px;font-size:0.72rem;font-weight:800;${roleClass === 'is-admin' ? 'background:#FCD34D;color:#92400E;' : 'background:#A5B4FC;color:#3730A3;'}">${roleLabel}</span>
        </td>
        <td data-label="Status" style="padding:10px 8px;text-align:center;vertical-align:middle;border-bottom:1.5px solid #000;border-right:1px solid #000;color:#000;background:rgba(255,255,255,0.88);">
          <span style="display:inline-flex;align-items:center;justify-content:center;min-height:28px;padding:0 10px;border-radius:999px;font-size:0.72rem;font-weight:800;${statusClass === 'is-on' ? 'background:#6EE7B7;color:#065F46;' : 'background:#FCA5A5;color:#991B1B;'}">${statusLabel}</span>
        </td>
        <td data-label="Masa Aktif" style="padding:10px 8px;text-align:center;vertical-align:middle;border-bottom:1.5px solid #000;border-right:1px solid #000;color:#000;background:rgba(255,255,255,0.88);">${masaAktifHTML}</td>
        <td data-label="Garansi" style="padding:10px 8px;text-align:center;vertical-align:middle;border-bottom:1.5px solid #000;border-right:1px solid #000;color:#000;background:rgba(255,255,255,0.88);">${kolOmGaransi}</td>
        <td data-label="Aksi" style="padding:10px 8px;text-align:center;vertical-align:middle;border-bottom:1.5px solid #000;color:#000;background:rgba(255,255,255,0.88);">${kolOmAksi}</td>
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

function prosesTambahUser() {
  const username = document.getElementById('newUsername').value.trim().toUpperCase();
  const nama = document.getElementById('newNama').value.trim();
  const password = document.getElementById('newPassword').value.trim();
  const role = 'user';
  
  if (!username || !nama || !password) {
    alert('Semua kolom wajib diisi!'); return;
  }
  
  const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
  if (users.find(u => u.username === username)) {
    alert('Username sudah digunakan!'); return;
  }
  
  const dibuatPada = new Date().toISOString();
  
  users.push({
    username: username,
    password: btoa(password),
    nama: nama,
    role: role,
    active: true,
    createdAt: dibuatPada
  });
  
  localStorage.setItem('userDatabase', JSON.stringify(users));
  
  apiCreateUser({
    username: username,
    password: btoa(password),
    nama: nama,
    role: role,
    createdAt: dibuatPada
  }).then(r => {
    if (!r.ok && !r.offline) {
      alert('⚠️ Gagal simpan online: ' + (r.data && r.data.error ? r.data.error : r.status));
    } else {
      syncUsersFromServer();
    }
  });
  
  // Kosongkan form
  document.getElementById('newUsername').value = '';
  document.getElementById('newNama').value = '';
  document.getElementById('newPassword').value = '';
  
  // Refresh tabel di dalam tab Kelola User (bukan modal)
  const container = document.getElementById('kelolaUserContent');
  if (container) {
    renderUserManagementContent(container);
  }
  
    showNotification({ type: 'success', message: '✅ User ' + username + ' berhasil ditambahkan!' });
}

function perpanjangMasaAktif(username) {
  if (username === 'SUPERADMIN') {
    alert('❌ Akun SUPERADMIN tidak memiliki batasan masa aktif!'); 
    return;
  }
  
  // ✅ 30 HARI
  if (!confirm('🔄 Perpanjang masa aktif ' + username + ' selama 30 HARI?')) return;
  
  const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
  const userIdx = users.findIndex(u => u.username === username);
  
  if (userIdx === -1) {
    alert('User tidak ditemukan!'); return;
  }
  
  if (users[userIdx].role === 'superadmin' || users[userIdx].role === 'admin') {
    alert('SUPERADMIN & ADMIN tidak memiliki batasan masa aktif!'); return;
  }
  
  // ✅ RESET 30 HARI
  users[userIdx].createdAt = new Date().toISOString();
  users[userIdx].active = true;
  localStorage.setItem('userDatabase', JSON.stringify(users));
  
  // 🔄 Update masa aktif di server D1
  apiUpdateUser(username, { createdAt: users[userIdx].createdAt, active: true }).then(r => {
    if (!r.ok && !r.offline) {
      alert('⚠️ Gagal sync online: ' + (r.data && r.data.error ? r.data.error : r.status));
    } else {
      syncUsersFromServer();
    }
  });
  
    showNotification({ type: 'success', message: '✅ Masa aktif ' + username + ' diperpanjang 30 HARI!\n\n⏱️ Timer restart.\n\n✅ Status: AKTIF' });
  
  // Refresh tabel di dalam tab Kelola User
  const container = document.getElementById('kelolaUserContent');
  if (container) {
    renderUserManagementContent(container);
  }
}
async function hapusUserPermanent(username) {
  // PENGAMANAN: SuperAdmin tidak bisa dihapus
  if (username === 'SUPERADMIN') {
    alert('❌ Akun SUPERADMIN tidak dapat dihapus!'); 
    return;
  }
  
  if (!confirm('⚠️ PERINGATAN!\n\nMenghapus USER: ' + username + '\n\nData tidak bisa dikembalikan!\n\nLanjutkan?')) return;
  
  const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');
  const filtered = users.filter(u => u.username !== username);
  localStorage.setItem('userDatabase', JSON.stringify(filtered));
  
    showNotification({ type: 'success', message: '✅ User ' + username + ' dihapus (lokal)!' });
  
  // 🔄 Hapus di server D1 -> semua perangkat lain ikut kehapus (auto logout)
  const r = await apiDeleteUser(username);
  if (!r.ok && !r.offline) {
    alert('⚠️ Gagal hapus online: ' + (r.data && r.data.error ? r.data.error : r.status));
  } else {
    syncUsersFromServer();
  }
  
  // Refresh tabel di dalam tab Kelola User
  const container = document.getElementById('kelolaUserContent');
  if (container) {
    renderUserManagementContent(container);
  }
}
function closeUserManagement() {
  const modal = document.getElementById('userManagementModal');
  if (modal) modal.remove();
}
function startCountdownTimers() {
  stopCountdownTimers();
  countdownIntervalId = setInterval(() => {
    const users = JSON.parse(localStorage.getItem('userDatabase') || '[]');

    users.forEach(user => {
      if (user.role === 'user') {
        const countdownEl = document.getElementById('countdown_masa_' + user.username);
        const countdownEl2 = document.getElementById('countdown2_masa_' + user.username);

        if (!countdownEl) return;

        if (user.active === false) {
          countdownEl.className = 'user-countdown-main is-danger';
          countdownEl.textContent = 'KEDALUWARSA';

          if (countdownEl2) {
            countdownEl2.style.display = 'none';
            countdownEl2.textContent = '';
          }
          return;
        }

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
            // 🔄 Nonaktifkan juga di server D1 agar perangkat lain ikut logout
            apiUpdateUser(user.username, { active: false });
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
  }, 1000);
}
// Logout paksa (dipakai kalau user dihapus / dinonaktifkan / masa aktif habis)
function forceLogout(reason) {
  if (reason) alert(reason);
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
  await syncUsersFromServer();
  checkUserSession();
}

function checkUserSession() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return;
  
  if (currentUser.role === 'superadmin' || currentUser.role === 'admin') return;
  
  // 🔄 Cek apakah user masih ada & aktif di database (sudah disinkron dari D1)
  const users = getAllUsers();
  const exist = users.find(u => u.username === currentUser.username);
  if (!exist) {
    console.log('⚠️ User ' + currentUser.username + ' tidak ada lagi -> logout paksa');
    forceLogout('❌ Akun Anda telah dihapus oleh Admin.');
    return;
  }
  if (exist.active === false) {
    console.log('⚠️ User ' + currentUser.username + ' dinonaktifkan -> logout paksa');
    forceLogout('⚠️ Akun dinonaktifkan. Silakan hubungi Admin.');
    return;
  }
  
  // ✅ 30 HARI
  const createdDate = new Date(currentUser.createdAt);
  const expiredDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  const now = new Date();
  
  if (now >= expiredDate) {
    console.log('⚠️ User ' + currentUser.username + ' expired! Auto logout...');
    // Tandai nonaktif di server & lokal
    const idx = users.findIndex(u => u.username === currentUser.username);
    if (idx !== -1) {
      users[idx].active = false;
      localStorage.setItem('userDatabase', JSON.stringify(users));
      apiUpdateUser(currentUser.username, { active: false });
    }
    forceLogout('⏱️ Masa aktif akun telah habis.');
  }
}
function cekBackupStatus() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  // SuperAdmin tidak perlu cek backup
  if (currentUser && currentUser.username === 'SUPERADMIN') return;
  
  const users = getAllUsers();
  
  if (users.length === 0) {
    const confirmImport = confirm(
      '⚠️ DATABASE KOSONG!\n\n' +
      'Sepertinya ini pertama kali dibuka di perangkat ini, atau data belum di-backup.\n\n' +
      'IMPORT DATABASE sekarang?\n\n' +
      '(Pilih file backup JSON yang sudah di-download dari perangkat sebelumnya)'
    );
    
    if (confirmImport) {
      document.getElementById('importDbFile').click();
    }
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
  
  pdfList.forEach((pdfItem, pdfIndex) => {
    const pdfPassport = pdfItem.passport.toUpperCase().trim();
    const pdfName = pdfItem.name.toUpperCase().trim();
    const pdfDOB = pdfItem.tanggalLahir;
    
    console.log(`\n📄 PDF[${pdfIndex+1}]: ${pdfItem.name} | ${pdfPassport} | DOB: ${pdfDOB}`);
    
    const tableMatches = allDataTable.filter(tableItem => {
      const tablePassport = (tableItem.passport || '').toUpperCase().trim();
      const tableName = tableItem.name.toUpperCase().trim();
      const tableDOB = tableItem.tanggalLahir || '';
      
      // Cek masing-masing要素 (100% EXACT)
      const namaCocok = isNamaMatch(tableName, pdfName);
      const dobCocok = isDOBMatch(tableDOB, pdfDOB);
      const passportCocok = isPassportMatch(tablePassport, pdfPassport);
      
      // ========== 5️⃣ KOMBINASI 100% EXACT ==========
      
      // 1️⃣ 100%: NAMA + DOB + PASSPORT (PRIORITY #1)
      if (namaCocok && dobCocok && passportCocok) {
        console.log(`  ✅ 100% NAMA+DOB+PASSPORT: ${tableItem.name}`);
        return true;
      }
      
      // 2️⃣ 100%: NAMA + DOB
      if (namaCocok && dobCocok && !passportCocok) {
        console.log(`  ✅ 100% NAMA+DOB: ${tableItem.name}`);
        return true;
      }
      
      // 3️⃣ 100%: NAMA + PASSPORT
      if (namaCocok && passportCocok && !dobCocok) {
        console.log(`  ✅ 100% NAMA+PASSPORT: ${tableItem.name}`);
        return true;
      }
      
      // 4️⃣ 100%: DOB + PASSPORT
      if (dobCocok && passportCocok && !namaCocok) {
        console.log(`  ✅ 100% DOB+PASSPORT: ${tableItem.name}`);
        return true;
      }
      
      // 5️⃣ 100%: PASSPORT SAJA (PRIORITY TERAKHIR)
      if (passportCocok && !namaCocok && !dobCocok) {
        console.log(`  ✅ 100% PASSPORT: ${tableItem.name}`);
        return true;
      }
      return false;
    });
    
    matched.push(...tableMatches);
  });
  
  // Hilangkan duplikasi berdasarkan passport
  const uniqueMatched = [...new Map(matched.map(item => [item.passport, item])).values()]
    .sort((a, b) => new Date(b.tanggalMasuk) - new Date(a.tanggalMasuk));
  
  console.log(`\n✅ TOTAL MATCH:  ${uniqueMatched.length}/${pdfList.length} PDF`);
  return uniqueMatched;
}
async function downloadMatchedPDF(matchedData, tujuan) {
  if (matchedData.length === 0) {
    showNotification({ type: 'warning', message: 'Tidak ada data untuk diunduh.' });
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

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
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
    showNotification({ type: 'error', message: 'Gagal download PDF: ' + error.message });
  }
}
function viewPhoto(index) {
  const data = dataTable[index];

  if (!data || !data.photo) {
    showNotification({ type: 'warning', message: 'Tidak ada foto' });
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
    showNotification({ type: 'warning', message: 'Tidak ada data untuk diunduh.' });
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

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
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
    showNotification({ type: 'error', message: 'Gagal download PDF: ' + error.message });
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

function bootAplikasi() {
  try {
    // Inisialisasi database (tidak akan hapus user lama)
    initUserDatabaseFIX();
  } catch (err) {
    console.warn('⚠️ initUserDatabaseFIX gagal, lanjutkan:', err);
  }

  // Generate kode verifikasi baru
  kodeVerifikasiGlobal = generateKodeVerifikasi();
  renderKodeVerifikasi();
  initDashboardNavigation();
  window.addEventListener('hashchange', applyViewFromHash);
  applyViewFromHash();
  updateDateTime();

  console.log('✅ Sistem siap digunakan');
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

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
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

if (importFileInput) {
  importFileInput.addEventListener('change', function(event) {
    if (event.target.files.length > 0) {
      importFromJSON(event);
    }
  });
}
function refreshUserTable() {
  const modal = document.getElementById('userManagementModal');
  if (modal) {
    openUserManagement();
  }
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
  if (!file) return alert("📁 Pilih file PDF dulu!");
  if (allDataTable.length === 0) return alert("📊 Import JSON dulu!");

  const btn = e ? e.target : document.querySelector('[onclick*="autoProcessPDF"]');
  const originalText = btn.textContent;
  btn.textContent = "⏳ Processing...";
  btn.disabled = true;

  try {
    await ensureManifestProcessingLibs();
    // 1. BACA PDF & EXTRACT passport + nama
    const pdfList = await readPDFFull(file);
    if (pdfList.length === 0) { showNotification({ type: 'error', message: '❌ TIDAK ADA PASSPORT DI PDF!!!' }); return; }

    console.log("📄 PDF Extracted:", pdfList.length, "items");

    // 2. CARI MATCH di TABEL DATA
    const matched = findExactMatches(pdfList);
    console.log("✅ MATCH di TABEL:", matched.length, "data");

    if (matched.length === 0) {
      showNotification({ type: 'error', message: '❌ TIDAK ADA DATA COCOK !!!\n\nANDA TIDAK PERLU MENUNGGU KAPAL !!!' });
      return;
    }

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
      html: '<div class="notifikasi-message" style="font-weight:800;">✅ SELESAI!!!</div><div class="notifikasi-detail"><div>📊 TOTAL DATA COCOK : ' + totalMatch + ' DATA</div><div style="margin-top:8px;font-weight:800;">📋 RINCIAN</div><div class="notifikasi-detail-grid"><span>• DARI KUKUP</span><span>: ' + matchedKukup.length + '</span><span>• DARI JOHOR BAHRU</span><span>: ' + matchedJohor.length + '</span></div></div>'
    });

  } catch (error) {
    console.error("ERROR:", error);
    showNotification({ type: 'error', message: '❌ ' + error.message });
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
    document.getElementById('pdfUpload').value = '';
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

    const data = await response.json();
    const temp = data.current_weather?.temperature || '--';
    const code = data.current_weather?.weathercode || 0;
    const waktu = data.current_weather?.time || '';

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

    console.log(`🌤️ Cuaca: ${cuaca.nama} ${cuaca.icon} ${temp}° (${waktu}) | Lokasi: ${lat}, ${lon}`);
  } catch (error) {
    console.error('Cuaca Error:', error);
    if (document.getElementById('weatherNama')) {
      document.getElementById('weatherNama').textContent = 'ERROR';
    }
    if (document.getElementById('weatherIcon')) {
      document.getElementById('weatherIcon').textContent = '⛔';
    }
    if (document.getElementById('weatherTemp')) {
      document.getElementById('weatherTemp').textContent = '--°';
    }
    const summaryWeather = document.getElementById('summaryWeather');
    if (summaryWeather) summaryWeather.textContent = 'Tidak tersedia';
  }
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
