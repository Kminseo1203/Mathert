const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const db = context.env.DB;
    const ranking = await db.prepare(`
      SELECT name, avatar, total_score, total_correct, total_answered, best_streak
      FROM users
      WHERE total_answered > 0
      ORDER BY total_score DESC
      LIMIT 10
    `).all();

    return new Response(JSON.stringify({ ranking: ranking.results }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
