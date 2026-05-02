const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    // 오답 노트 조회
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const solved = url.searchParams.get('solved') || '0';
      const notes = await db.prepare(`
        SELECT * FROM wrong_notes WHERE user_id = ? AND solved = ?
        ORDER BY created_at DESC LIMIT 50
      `).bind(user.id, parseInt(solved)).all();
      return new Response(JSON.stringify({ notes: notes.results }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 오답 추가
    if (request.method === 'POST') {
      const { grade, unit, question, answer, steps, concept } = await request.json();
      // 중복 체크
      const existing = await db.prepare(
        'SELECT id FROM wrong_notes WHERE user_id = ? AND question = ? AND solved = 0'
      ).bind(user.id, question).first();
      if (!existing) {
        await db.prepare(`
          INSERT INTO wrong_notes (user_id, grade, unit, question, answer, steps, concept)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(user.id, grade, unit, question, answer, JSON.stringify(steps), concept).run();
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 오답 해결 처리
    if (request.method === 'PUT') {
      const { id } = await request.json();
      await db.prepare('UPDATE wrong_notes SET solved = 1 WHERE id = ? AND user_id = ?').bind(id, user.id).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 오답 삭제
    if (request.method === 'DELETE') {
      const { id } = await request.json();
      await db.prepare('DELETE FROM wrong_notes WHERE id = ? AND user_id = ?').bind(id, user.id).run();
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
