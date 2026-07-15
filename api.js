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
    const users = await response.json();
    if (Array.isArray(users) && users.length > 0) {
      localStorage.setItem('userDatabase', JSON.stringify(users));
    }
    return users;
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
