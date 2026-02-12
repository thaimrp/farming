(function initHelpers(global) {
  const runtimeOrigin = window.location.origin;
  const isLiveServer = window.location.port === '5500';
  const apiOrigin = isLiveServer ? 'http://localhost:2255' : runtimeOrigin;
  const AUTH_BASE = `${apiOrigin}/api/authen`;

  function safeJson(res) {
    return res.json().catch(() => ({ result: false, message: 'Invalid JSON response' }));
  }

  async function shortFetch(path, method = 'GET', body = null) {
    const res = await fetch(`${AUTH_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null
    });

    const data = await safeJson(res);
    return { res, data };
  }

  async function fetchWithAuthen(path, token, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${AUTH_BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const data = await safeJson(res);
    return { res, data };
  }

  global.sf = {
    AUTH_BASE,
    shortFetch,
    fetchWithAuthen
  };
})(window);
