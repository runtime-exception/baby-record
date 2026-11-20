const fetchOriginal = globalThis.fetch;
globalThis.fetch = (value, options) => {
  const url = new URL(value);
  if (url.hostname !== 'api.weixin.qq.com') return fetchOriginal(value, options);
  if (url.pathname === '/sns/jscode2session') {
    const code = url.searchParams.get('js_code');
    return Promise.resolve(Response.json(code?.startsWith('fixture-') ? { openid: code } : { errcode: 40029 }));
  }
  if (url.pathname === '/cgi-bin/token') {
    return Promise.resolve(Response.json({ access_token: 'fixture-token', expires_in: 7200 }));
  }
  if (url.pathname === '/wxa/getwxacodeunlimit') {
    return Promise.resolve(new Response(Buffer.from('fake-code'), { headers: { 'Content-Type': 'image/png' } }));
  }
  throw new Error('Unexpected WeChat fixture endpoint');
};
