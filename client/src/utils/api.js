const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN || 'local-dev-token';

export const resolveApiUrl = (pathOrUrl) => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!API_BASE) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) return `${API_BASE}${pathOrUrl}`;
  return `${API_BASE}/${pathOrUrl}`;
};

export const apiFetch = (pathOrUrl, opts = {}) => {
  const headers = new Headers(opts.headers || {});
  const hasBody = typeof opts.body !== 'undefined';
  if (!headers.has('Content-Type') && hasBody && !(opts.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (APP_TOKEN) {
    headers.set('x-app-token', APP_TOKEN);
  }

  return fetch(resolveApiUrl(pathOrUrl), {
    ...opts,
    headers,
  });
};
