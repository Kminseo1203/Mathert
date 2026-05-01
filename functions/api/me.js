const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ user: null }), { headers: { ...cors, 'Content-Type': 'application/json' } });

    const payload = JSON.parse(decodeURIComponent(escape(atob(token))));
    if (payload.exp < Date.now()) return new Response(JSON.stringify({ user: null }), { headers: { ...cors, 'Content-Type': 'application/json' } });

    const db = context.env.DB;
    const user = await db.prepare('SELECT * FROM users WHERE google_id = ?').bind(payload.googleId).first();
    if (!user) return new Response(JSON.stringify({ user: null }), { headers: { ...cors, 'Content-Type': 'application/json' } });

    const records = await db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').bind(user.id).all();

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        totalScore: user.total_score,
        totalCorrect: user.total_correct,
        totalAnswered: user.total_answered,
        bestStreak: user.best_streak,
        records: records.results,
      }
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ user: null, error: err.message }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
}
