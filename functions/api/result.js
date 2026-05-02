const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }
  // Origin 화이트리스트 체크
  const origin = request.headers.get('Origin');
  const allowed = ['https://mathert.pages.dev', 'https://kminseo1203.github.io'];
  if (origin && !allowed.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }



  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: '로그인 필요' }), { status: 401, headers: cors });
    }

    const payload = JSON.parse(decodeURIComponent(escape(atob(token))));
    if (payload.exp < Date.now()) {
      return new Response(JSON.stringify({ error: '토큰 만료' }), { status: 401, headers: cors });
    }

    const body = await request.json();
    const { grade, score, correct, total, maxStreak } = body;
    const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;

    const db = context.env.DB;
    const user = await db.prepare('SELECT id, best_streak FROM users WHERE google_id = ?')
      .bind(payload.googleId)
      .first();

    if (!user) {
      return new Response(JSON.stringify({ error: '유저 없음' }), { status: 404, headers: cors });
    }

    // 밴 체크
    const ban = await db.prepare(`
      SELECT id FROM bans WHERE user_id = ?
      AND (ban_type = 'permanent' OR (ban_type = 'temp' AND expires_at > datetime('now')))
      LIMIT 1
    `).bind(user.id).first();
    if (ban) {
      return new Response(JSON.stringify({ error: '정지된 계정입니다.' }), { status: 403, headers: cors });
    }

    const newBestStreak = Math.max(user.best_streak, maxStreak);

    await db.prepare(`
      UPDATE users SET
        total_score = total_score + ?,
        total_correct = total_correct + ?,
        total_answered = total_answered + ?,
        best_streak = ?
      WHERE id = ?
    `).bind(score, correct, total, newBestStreak, user.id).run();

    await db.prepare(`
      INSERT INTO records (user_id, grade, score, correct, total, accuracy, max_streak)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(user.id, grade, score, correct, total, accuracy, maxStreak).run();

    await db.prepare(`
      DELETE FROM records WHERE user_id = ? AND id NOT IN (
        SELECT id FROM records WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
      )
    `).bind(user.id, user.id).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: cors,
    });
  }
}
