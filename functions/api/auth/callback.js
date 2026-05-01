export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${env.BASE_URL}/api/auth/callback`;
  const frontendUrl = env.FRONTEND_URL || 'https://kminseo1203.github.io/Mathert';

  try {

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
    if (!tokenData.access_token) throw new Error('토큰 발급 실패');

    // 2. 유저 정보
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const u = await userRes.json();

    // 3. D1에 유저 저장/업데이트
    const db = context.env.DB;
    const existing = await db.prepare('SELECT id FROM users WHERE google_id = ?').bind(u.id).first();
    if (existing) {
      await db.prepare('UPDATE users SET name=?, email=?, avatar=?, last_login_at=datetime("now") WHERE google_id=?')
        .bind(u.name, u.email, u.picture, u.id).run();
    } else {
      await db.prepare('INSERT INTO users (google_id, name, email, avatar) VALUES (?,?,?,?)')
        .bind(u.id, u.name, u.email, u.picture).run();
    }

    // 4. JWT 토큰 생성 (base64)
    const payload = {
      googleId: u.id,
      name: u.name,
      email: u.email,
      avatar: u.picture,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    const token = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

    return Response.redirect(`${frontendUrl}?token=${token}`, 302);
  } catch (err) {
    return Response.redirect(`${frontendUrl}?error=auth&msg=${encodeURIComponent(err.message)}`, 302);
  }
}
