const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: '로그인 필요' }), { status: 401, headers: corsHeaders });

    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) return new Response(JSON.stringify({ error: '토큰 만료' }), { status: 401, headers: corsHeaders });

    const { grade, score, correct, total, maxStreak } = await request.json();
    const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;

    // 현재 유저 데이터 가져오기
    const getRes = await fetch(`${env.MONGODB_DATA_API}/action/findOne`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': env.MONGODB_API_KEY },
      body: JSON.stringify({
        collection: 'users', database: 'math-quiz', dataSource: 'Cluster0',
        filter: { googleId: payload.googleId },
      }),
    });
    const getData = await getRes.json();
    const user = getData.document;
    if (!user) return new Response(JSON.stringify({ error: '유저 없음' }), { status: 404, headers: corsHeaders });

    const records = [...(user.records || []), { grade, score, correct, total, accuracy, maxStreak, date: new Date().toISOString() }].slice(-20);

    // 업데이트
    await fetch(`${env.MONGODB_DATA_API}/action/updateOne`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': env.MONGODB_API_KEY },
      body: JSON.stringify({
        collection: 'users', database: 'math-quiz', dataSource: 'Cluster0',
        filter: { googleId: payload.googleId },
        update: {
          $inc: { totalScore: score, totalCorrect: correct, totalAnswered: total },
          $max: { bestStreak: maxStreak },
          $set: { records },
        },
      }),
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
