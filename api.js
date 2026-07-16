const API_BASE = (function() {
  try {
    return new URL('/api', window.location.origin).href;
  } catch (e) {
    return '';
  }
})();

async function syncUsersFromServer() {
  try {
    if (!API_BASE) throw new Error('No API base');
    const response = await fetch(API_BASE + '?caller=sync', {
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return null;
    const serverUsers = await response.json();
    if (!Array.isArray(serverUsers) || serverUsers.length === 0) return null;

    const localUsers = JSON.parse(localStorage.getItem('userDatabase') || '[]');
    const serverUsernames = new Set(serverUsers.map(u => u.username.toUpperCase()));
    const merged = [...serverUsers];

    localUsers.forEach(localUser => {
      if (!serverUsernames.has(localUser.username.toUpperCase())) {
        merged.push(localUser);
      }
    });

    // 🔐 NORMALISASI PASSWORD YANG BENAR
    // Deteksi Base64 valid: decode → re-encode → harus sama dengan original
    function isValidBase64(str) {
      if (!str || typeof str !== 'string') return false;
      // Quick check: karakter valid Base64 & panjang kelipatan 4 (dengan padding)
      if (!/^[A-Za-z0-9+/]+=*$/.test(str)) return false;
      try {
        const decoded = atob(str);
        const reEncoded = btoa(decoded);
        // Normalisasi padding (=) untuk perbandingan
        return reEncoded.replace(/=+$/, '') === str.replace(/=+$/, '');
      } catch (e) {
        return false;
      }
    }

    const finalMerged = merged.map(user => {
      if (user.password && !isValidBase64(user.password)) {
        // Plain text → encode ke Base64
        return { ...user, password: btoa(user.password) };
      }
      return user;
    });

    localStorage.setItem('userDatabase', JSON.stringify(finalMerged));
    return finalMerged;
  } catch (err) {
    console.warn('API offline (syncUsersFromServer):', err.message);
    return null;
  }
}
async function apiCreateUser(data) {
  try {
    if (!API_BASE) throw new Error('No API base');
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...data }),
      signal: AbortSignal.timeout(5000)
    });
    const result = await response.json();
    return { ok: response.ok, data: result, status: response.status };
  } catch (err) {
    console.warn('API offline (apiCreateUser):', err.message);
    return { ok: false, offline: true, data: null };
  }
}

async function apiUpdateUser(username, updates) {
  try {
    if (!API_BASE) throw new Error('No API base');
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', username, ...updates }),
      signal: AbortSignal.timeout(5000)
    });
    const result = await response.json();
    return { ok: response.ok, data: result, status: response.status };
  } catch (err) {
    console.warn('API offline (apiUpdateUser):', err.message);
    return { ok: false, offline: true, data: null };
  }
}

async function apiDeleteUser(username) {
  try {
    if (!API_BASE) throw new Error('No API base');
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', username }),
      signal: AbortSignal.timeout(5000)
    });
    const result = await response.json();
    return { ok: response.ok, data: result, status: response.status };
  } catch (err) {
    console.warn('API offline (apiDeleteUser):', err.message);
    return { ok: false, offline: true, data: null };
  }
}
