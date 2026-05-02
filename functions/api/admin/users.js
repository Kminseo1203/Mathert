const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ADMIN_EMAIL = 'kmimseo1203@gmail.com';

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    // 토큰 검증
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: '로그인 필요' }), { status: 401, headers: cors });

    const payload = JSON.parse(decodeURIComponent(escape(atob(token))));
    if (payload.exp < Date.now()) return new Response(JSON.stringify({ error: '토큰 만료' }), { status: 401, headers: cors });

    // 관리자 확인
    if (payload.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: '권한 없음' }), { status: 403, headers: cors });
    }

    const db = context.env.DB;

    // 모든 유저 + 각 유저의 최근 기록
    const users = await db.prepare(`
      SELECT id, name, email, avatar, total_score, total_correct, total_answered, best_streak, created_at, last_login_at
      FROM users
      ORDER BY total_score DESC
    `).all();

    // 각 유저의 최근 기록 10개씩
    const result = await Promise.all(users.results.map(async u => {
      const records = await db.prepare(`
        SELECT grade, score, correct, total, accuracy, max_streak, created_at
        FROM records WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
      `).bind(u.id).all();
      return { ...u, records: records.results };
    }));

    return new Response(JSON.stringify({ users: result }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
