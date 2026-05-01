const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const res = await fetch(`${env.MONGODB_DATA_API}/action/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': env.MONGODB_API_KEY },
      body: JSON.stringify({
        collection: 'users', database: 'math-quiz', dataSource: 'Cluster0',
        filter: { totalAnswered: { $gt: 0 } },
        sort: { totalScore: -1 },
        limit: 10,
        projection: { name: 1, avatar: 1, totalScore: 1, totalCorrect: 1, totalAnswered: 1, bestStreak: 1 },
      }),
    });
    const data = await res.json();
    return new Response(JSON.stringify({ ranking: data.documents }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
