export async function onRequest(context) {
  const { env } = context;
  
  // 1. 이미지(image_4c2c04.png)에서 확인한 환경 변수 사용
  const baseUrl = env.BASE_URL || 'https://mathert.pages.dev';
  
  // 2. 주소를 반드시 'callback'으로 맞춰야 합니다.
  const redirectUri = `${baseUrl}/api/auth/callback`;
  
  const clientId = "849893014181-p492lse5lvr230l9ecd6jc99go98nght.apps.googleusercontent.com";
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri); // 여기가 수정 포인트!
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('prompt', 'select_account');

  return Response.redirect(authUrl.toString(), 302);
}
