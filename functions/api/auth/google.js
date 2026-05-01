// google.js (인증 시작 부분)
export async function onRequest(context) {
  const { env } = context;
  
  // 1. 환경 변수에서 BASE_URL을 가져오되, 없을 경우를 대비한 기본값 설정
  const baseUrl = env.BASE_URL || 'https://mathert.pages.dev';
  
  // 2. 반드시 callback.js에서 사용하는 주소와 철자 하나까지 똑같아야 함
  const redirectUri = `${baseUrl}/functions/api/auth/callback`;
  
  const clientId = "849893014181-p492lse5lvr230l9ecd6jc99go98nght.apps.googleusercontent.com";
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri); // 바로 이 주소!
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('prompt', 'select_account'); // 계정 선택창 강제 표시

  return Response.redirect(authUrl.toString(), 302);
}
