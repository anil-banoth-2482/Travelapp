// Use VITE_API_BASE if set, otherwise fall back to the Railway backend so that
// images/media resolve correctly in production builds and on mobile devices.
const FALLBACK_API = 'https://travelapp-production-a035.up.railway.app';
const API_BASE = (import.meta.env.VITE_API_BASE || FALLBACK_API).replace(/\/$/, '');
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN || 'local-dev-token';
let authToken = '';

export const setAuthToken = (token = '') => {
  authToken = token || '';
};

export const clearAuthToken = () => {
  authToken = '';
};

export const getAuthToken = () => authToken;

export const resolveApiUrl = (pathOrUrl) => {
  if (!pathOrUrl) return '';
  // Already a full URL — return as-is (handles http/https AND data: base64 URLs)
  if (/^(https?|data):\/\//i.test(pathOrUrl)) return pathOrUrl;
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
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(resolveApiUrl(pathOrUrl), {
    ...opts,
    headers,
    credentials: 'include',
  });
};
