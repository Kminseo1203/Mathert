export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    const clientId = "849893014181-p492lse5lvr230l9ecd6jc99go98nght.apps.googleusercontent.com";
    const redirectUri = "https://mathert.pages.dev/functions/api/auth/callback";
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    return Response.redirect(authUrl.toString(), 302);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: "https://mathert.pages.dev/functions/api/auth/callback",
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    return new Response(JSON.stringify(tokens), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response("인증 실패: " + error.message, { status: 500 });
  }
}
