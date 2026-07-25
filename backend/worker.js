// ============================================================
// CLOUDFLARE WORKER — API Backend
// Sistem User Terpusat dengan Cloudflare D1
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function error(msg, status = 400) {
  return json({ error: msg }, status);
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const segments = path.split('/').filter(Boolean);

    try {
      // ── Route matching ──────────────────────────────────
      if (path === '/api' || path === '/api/') {
        if (method === 'GET') {
          // Health check or sync
          if (url.searchParams.has('caller')) {
            return handleListUsers(env);
          }
          return json({ status: 'ok', message: 'API User System running', version: '2.0' });
        }
        if (method === 'POST') {
          const body = await request.json();
          if (body && body.action) {
            // Backward-compatible action-based routing
            switch (body.action) {
              case 'create': return handleCreateUser(env, body);
              case 'update': return handleUpdateUser(env, body.username, body);
              case 'delete': return handleDeleteUser(env, body.username);
              default: return error('Unknown action: ' + body.action, 400);
            }
          }
          return error('Missing action field', 400);
        }
        return error('Method not allowed', 405);
      }

      // GET /api/users — List all users
      if (path === '/api/users' && method === 'GET') {
        return handleListUsers(env);
      }

      // POST /api/users — Create user
      if (path === '/api/users' && method === 'POST') {
        const body = await request.json();
        return handleCreateUser(env, body);
      }

      // PUT /api/users/:username — Update user
      if (segments.length === 3 && segments[0] === 'api' && segments[1] === 'users' && method === 'PUT') {
        const body = await request.json();
        return handleUpdateUser(env, segments[2], body);
      }

      // DELETE /api/users/:username — Delete user
      if (segments.length === 3 && segments[0] === 'api' && segments[1] === 'users' && method === 'DELETE') {
        return handleDeleteUser(env, segments[2]);
      }

      // PUT /api/users/:username/active — Toggle active
      if (segments.length === 4 && segments[0] === 'api' && segments[1] === 'users' && segments[3] === 'active' && method === 'PUT') {
        const body = await request.json();
        return handleUpdateUserField(env, segments[2], 'active', body.active);
      }

      // PUT /api/users/:username/masa-aktif — Extend masa aktif
      if (segments.length === 4 && segments[0] === 'api' && segments[1] === 'users' && segments[3] === 'masa-aktif' && method === 'PUT') {
        const body = await request.json();
        return handleUpdateUserField(env, segments[2], 'created_at', body.created_at || new Date().toISOString());
      }

      // PUT /api/users/:username/garansi — Update garansi
      if (segments.length === 4 && segments[0] === 'api' && segments[1] === 'users' && segments[3] === 'garansi' && method === 'PUT') {
        const body = await request.json();
        return handleUpdateUserField(env, segments[2], 'garansi', body.garansi);
      }

      // PUT /api/users/:username/role — Update role
      if (segments.length === 4 && segments[0] === 'api' && segments[1] === 'users' && segments[3] === 'role' && method === 'PUT') {
        const body = await request.json();
        return handleUpdateUserField(env, segments[2], 'role', body.role);
      }

      // POST /api/auth/login — Login
      if (path === '/api/auth/login' && method === 'POST') {
        const body = await request.json();
        return handleLogin(env, body);
      }

      // GET /api/auth/check/:username — Session check
      if (segments.length === 4 && segments[0] === 'api' && segments[1] === 'auth' && segments[2] === 'check' && method === 'GET') {
        return handleSessionCheck(env, segments[3]);
      }

      return error('Not found: ' + path, 404);
    } catch (err) {
      return error(err.message, 500);
    }
  },
};

// ── Handler Functions ──────────────────────────────────────

async function handleListUsers(env) {
  const { results } = await env.DB.prepare(
    `SELECT username, nama, role, active, created_at, masa_aktif_hari, garansi, updated_at
     FROM users ORDER BY username ASC`
  ).all();
  // Convert SQLite 0/1 to boolean for JS compatibility
  const mapped = results.map(u => ({ ...u, active: u.active === 1 }));
  return json(mapped);
}

async function handleCreateUser(env, data) {
  const username = (data.username || '').toUpperCase().trim();
  const password = data.password;
  const nama = (data.nama || '').trim();
  const role = data.role || 'user';
  const active = data.active !== undefined ? (data.active ? 1 : 0) : 1;
  const created_at = data.createdAt || data.created_at || new Date().toISOString();
  const masa_aktif_hari = data.masa_aktif_hari || 30;
  const garansi = data.garansi || null;

  if (!username || !password || !nama) {
    return error('username, password, and nama are required');
  }
  if (role !== 'user' && role !== 'superadmin') {
    return error('role must be "user" or "superadmin"');
  }

  const existing = await env.DB.prepare('SELECT username FROM users WHERE username = ?')
    .bind(username).first();
  if (existing) {
    return error('Username already exists', 409);
  }

  await env.DB.prepare(
    `INSERT INTO users (username, password, nama, role, active, created_at, masa_aktif_hari, garansi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(username, password, nama, role, active, created_at, masa_aktif_hari, garansi).run();

  return json({ success: true, username }, 201);
}

async function handleUpdateUser(env, username, data) {
  username = username.toUpperCase().trim();
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username).first();
  if (!user) return error('User not found', 404);

  // Build dynamic SET clause
  const updates = [];
  const values = [];
  const fields = ['password', 'nama', 'role', 'garansi'];

  for (const field of fields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  if (data.active !== undefined) {
    updates.push('active = ?');
    values.push(data.active ? 1 : 0);
  }
  if (data.createdAt !== undefined || data.created_at !== undefined) {
    updates.push('created_at = ?');
    values.push(data.createdAt || data.created_at);
  }
  if (data.masa_aktif_hari !== undefined) {
    updates.push('masa_aktif_hari = ?');
    values.push(data.masa_aktif_hari);
  }
  if (data.nama !== undefined) {
    updates.push('nama = ?');
    values.push(data.nama);
  }

  if (updates.length === 0) return error('No fields to update', 400);

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(username);

  await env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE username = ?`
  ).bind(...values).run();

  return json({ success: true, username });
}

async function handleDeleteUser(env, username) {
  username = username.toUpperCase().trim();
  if (username === 'SUPERADMIN') {
    return error('SUPERADMIN cannot be deleted', 403);
  }

  const result = await env.DB.prepare('DELETE FROM users WHERE username = ?')
    .bind(username).run();

  if (result.meta.changes === 0) {
    return error('User not found', 404);
  }
  return json({ success: true, username, deleted: true });
}

async function handleUpdateUserField(env, username, field, value) {
  username = username.toUpperCase().trim();
  const allowedFields = ['active', 'created_at', 'garansi', 'role', 'nama', 'password', 'masa_aktif_hari'];
  if (!allowedFields.includes(field)) {
    return error('Invalid field: ' + field, 400);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username).first();
  if (!user) return error('User not found', 404);

  let dbValue = value;
  if (field === 'active') dbValue = value ? 1 : 0;

  await env.DB.prepare(`UPDATE users SET ${field} = ?, updated_at = ? WHERE username = ?`)
    .bind(dbValue, new Date().toISOString(), username).run();

  return json({ success: true, username, [field]: value });
}

async function handleLogin(env, data) {
  const username = (data.username || '').toUpperCase().trim();
  const password = data.password || '';

  if (!username || !password) {
    return error('Username and password required', 400);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username).first();

  if (!user) {
    return json({ error: 'USERNAME SALAH !', code: 'USERNAME_NOT_FOUND' }, 401);
  }

  if (user.password !== password) {
    return json({ error: 'PASSWORD SALAH !', code: 'WRONG_PASSWORD' }, 401);
  }

  if (user.active !== 1) {
    return json({ error: 'AKUN DINONAKTIFKAN', code: 'ACCOUNT_DISABLED' }, 403);
  }

  const createdDate = new Date(user.created_at);
  const expiredDate = new Date(createdDate.getTime() + (user.masa_aktif_hari * 24 * 60 * 60 * 1000));
  const now = new Date();

  if (now >= expiredDate) {
    await env.DB.prepare('UPDATE users SET active = 0 WHERE username = ?')
      .bind(user.username).run();
    return json({ error: 'MASA AKTIF HABIS', code: 'EXPIRED' }, 403);
  }

  const sisaHari = Math.ceil((expiredDate - now) / (1000 * 60 * 60 * 24));

  const { password: _, ...safeUser } = user;
  return json({
    success: true,
    user: { ...safeUser, active: true, sisaHari },
  });
}

async function handleSessionCheck(env, username) {
  username = username.toUpperCase().trim();
  if (!username) return json({ valid: false, reason: 'NO_USERNAME' });

  const user = await env.DB.prepare(
    'SELECT username, role, active, created_at, masa_aktif_hari FROM users WHERE username = ?'
  ).bind(username).first();

  if (!user) return json({ valid: false, reason: 'DELETED' });
  if (user.active !== 1) return json({ valid: false, reason: 'DISABLED' });

  const createdDate = new Date(user.created_at);
  const expiredDate = new Date(createdDate.getTime() + (user.masa_aktif_hari * 24 * 60 * 60 * 1000));
  const now = new Date();

  if (now >= expiredDate) {
    await env.DB.prepare('UPDATE users SET active = 0 WHERE username = ?')
      .bind(user.username).run();
    return json({ valid: false, reason: 'EXPIRED' });
  }

  return json({ valid: true, user });
}
