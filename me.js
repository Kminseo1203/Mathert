const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ user: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) return new Response(JSON.stringify({ user: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // MongoDB에서 유저 정보 가져오기
    const res = await fetch(`${env.MONGODB_DATA_API}/action/findOne`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': env.MONGODB_API_KEY },
      body: JSON.stringify({
        collection: 'users',
        database: 'math-quiz',
        dataSource: 'Cluster0',
        filter: { googleId: payload.googleId },
      }),
    });
    const data = await res.json();
    const user = data.document;

    return new Response(JSON.stringify({ user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ user: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
