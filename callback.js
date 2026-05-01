export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${env.BASE_URL}/functions/api/auth/callback`;

  try {
    // 1. code → access_token 교환
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();

    // 2. 유저 정보 가져오기
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userRes.json();

    // 3. MongoDB에 유저 저장/업데이트
    const mongoRes = await fetch(`${env.MONGODB_URI}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': env.MONGODB_API_KEY },
      body: JSON.stringify({
        collection: 'users',
        database: 'math-quiz',
        dataSource: 'Cluster0',
        filter: { googleId: userInfo.id },
        update: {
          $set: {
            googleId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.picture,
            lastLoginAt: new Date().toISOString(),
          },
          $setOnInsert: {
            totalScore: 0,
            totalCorrect: 0,
            totalAnswered: 0,
            bestStreak: 0,
            records: [],
            createdAt: new Date().toISOString(),
          },
        },
        upsert: true,
      }),
    });

    // 4. JWT 토큰 생성 (간단히 base64 인코딩)
    const payload = {
      googleId: userInfo.id,
      name: userInfo.name,
      email: userInfo.email,
      avatar: userInfo.picture,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7일
    };
    const token = btoa(JSON.stringify(payload));

    // 5. 프론트엔드로 리디렉트 (토큰을 URL 파라미터로 전달)
    return Response.redirect(`${env.FRONTEND_URL}/?token=${token}`, 302);

  } catch (err) {
    return Response.redirect(`${env.FRONTEND_URL}/?error=auth`, 302);
  }
}
