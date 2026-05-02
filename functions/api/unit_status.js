const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function getUser(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;
    const payload = JSON.parse(decodeURIComponent(escape(atob(token))));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const payload = getUser(request);
  if (!payload) return new Response(JSON.stringify({ error: '로그인 필요' }), { status: 401, headers: cors });

  const db = context.env.DB;
  const user = await db.prepare('SELECT id FROM users WHERE google_id = ?').bind(payload.googleId).first();
  if (!user) return new Response(JSON.stringify({ error: '유저 없음' }), { status: 404, headers: cors });

  try {
    if (request.method === 'GET') {
      const stats = await db.prepare(`
        SELECT unit, correct, total,
          ROUND(CAST(correct AS FLOAT) / total * 100) as accuracy
        FROM unit_stats WHERE user_id = ?
        ORDER BY total DESC
      `).bind(user.id).all();
      return new Response(JSON.stringify({ stats: stats.results }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST') {
      const { unit, correct } = await request.json();
      const existing = await db.prepare('SELECT id FROM unit_stats WHERE user_id = ? AND unit = ?').bind(user.id, unit).first();
      if (existing) {
        await db.prepare('UPDATE unit_stats SET correct = correct + ?, total = total + 1 WHERE user_id = ? AND unit = ?')
          .bind(correct ? 1 : 0, user.id, unit).run();
      } else {
        await db.prepare('INSERT INTO unit_stats (user_id, unit, correct, total) VALUES (?, ?, ?, 1)')
          .bind(user.id, unit, correct ? 1 : 0).run();
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
