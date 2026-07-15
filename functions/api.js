export async function onRequest(context) {
  const {
    request,
    env,
    waitUntil,
    defer,
    executionCtx
  } = context;

  const url = new URL(request.url);
  const method = request.method;
  const body = method === 'GET' ? null : await request.json();

  try {
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    url.searchParams.get('ip') || 
                    '127.0.0.1';

    const allowedIPs = ["103.127.23.156", "112.78.5.159", "192.168.1.1", "127.0.0.1"];
    if (!allowedIPs.includes(clientIP)) {
      console.warn('⚠️ IP ditolak:', clientIP);
      return new Response(JSON.stringify({ success: false, message: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const databaseName = env.MISS_ALL_SUNDAY_DB || 'miss_all_sunday_db';
    const db = await (await env.DB.get(databaseName, 'text'))?.toString();

    if (!db) {
      console.log('⚠️ Database kosong di Workers, mengembalikan kosong');
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(db);

    if (method === 'GET') {
      const caller = url.searchParams.get('caller') || 'default';
      console.log('[CLIENT]', clientIP, '| CALLER:', caller, '| GET /api/users');
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[CLIENT]', clientIP, '| USER:', body.username, '| ACTION:', body.action);

    const userIndex = data.findIndex(u => u.username === body.username);
    switch (body.action) {
      case 'create':
        if (userIndex >= 0) {
          return new Response(JSON.stringify({ success: false, message: 'User sudah ada' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        data.push(body);
        break;

      case 'update':
        if (userIndex < 0) {
          return new Response(JSON.stringify({ success: false, message: 'User tidak ditemukan' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        data[userIndex] = { ...data[userIndex], ...body };
        break;

      case 'delete':
        if (userIndex < 0) {
          return new Response(JSON.stringify({ success: false, message: 'User tidak ditemukan' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        data.splice(userIndex, 1);
        break;

      case 'replace':
        if (userIndex < 0) {
          return new Response(JSON.stringify({ success: false, message: 'User tidak ditemukan' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        data[userIndex] = body;
        break;

      case 'init':
        let users = data;
        const superadminExists = users.find(u => u.username === 'SUPERADMIN');
        if (superadminExists) {
          if (superadminExists.password !== '270900') {
            users = users.map(u => u.username === 'SUPERADMIN' ? { ...u, password: '270900', active: true } : u);
            await env.DB.put(databaseName, JSON.stringify(users), { ttl: 3600 });
            console.log('🔄 Password Superadmin di-update dari Workers');
          }
        } else {
          users.push({
            username: 'SUPERADMIN',
            password: '270900',
            nama: 'Muhammad Eldhi',
            role: 'superadmin',
            active: true,
            createdAt: new Date().toISOString()
          });
          await env.DB.put(databaseName, JSON.stringify(users), { ttl: 3600 });
          console.log('🔄 Superadmin dibuat dari Workers');
        }
        return new Response(JSON.stringify({ success: true, data: users }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ success: false, message: 'Action tidak dikenal' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    await env.DB.put(databaseName, JSON.stringify(data), { ttl: 3600 });
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Workers ERROR:', error);
    return new Response(JSON.stringify({ success: false, message: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
