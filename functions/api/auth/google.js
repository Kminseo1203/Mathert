export async function onRequest(context) {
  const clientId = "849893014181-p492lse5lvr230l9ecd6jc99go98nght.apps.googleusercontent.com";
  const redirectUri = "https://mathert.pages.dev/functions/api/auth/google";

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('prompt', 'select_account');

  // 즉시 구글로 리다이렉트
  return Response.redirect(url.toString(), 302);
}
