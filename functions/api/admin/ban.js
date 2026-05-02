const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ADMIN_EMAIL = 'kmimseo1203@gmail.com';

async function verifyAdmin(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(token))));
    if (payload.exp < Date.now()) return null;
    if (payload.email !== ADMIN_EMAIL) return null;
    return payload;
  } catch { return null; }
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const admin = await verifyAdmin(request);
  if (!admin) return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403, headers: cors });

  const db = context.env.DB;
  const url = new URL(request.url);

  try {
    // 밴 목록 조회
    if (request.method === 'GET') {
      const bans = await db.prepare(`
        SELECT b.*, u.name, u.email, u.avatar
        FROM bans b
        LEFT JOIN users u ON b.user_id = u.id
        ORDER BY b.created_at DESC
      `).all();
      return new Response(JSON.stringify({ bans: bans.results }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 밴 추가
    if (request.method === 'POST') {
      const { user_id, ip, reason, ban_type, duration_hours } = await request.json();
      let expires_at = null;
      if (ban_type === 'temp' && duration_hours) {
        const exp = new Date(Date.now() + duration_hours * 60 * 60 * 1000);
        expires_at = exp.toISOString().replace('T', ' ').split('.')[0];
      }
      await db.prepare(`
        INSERT INTO bans (user_id, ip, reason, ban_type, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(user_id || null, ip || null, reason || '', ban_type || 'permanent', expires_at).run();

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 밴 해제
    if (request.method === 'DELETE') {
      const { id } = await request.json();
      await db.prepare('DELETE FROM bans WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
