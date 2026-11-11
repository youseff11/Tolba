import axios from 'axios';

// In dev Vite proxies /api to Django. For a separate deployment set VITE_API_URL=https://host/api
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('vs_token');
  if (t) cfg.headers.Authorization = `Token ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const st = err.response?.status;
    // Network failure or gateway error → let the connection watchdog re-check right away.
    if ((!err.response || st === 502 || st === 504) && err.config?.url !== '/health') {
      window.dispatchEvent(new Event('vs-net-error'));
    }
    if (st === 401 && !String(err.config?.url).startsWith('/auth/')) {
      localStorage.removeItem('vs_token');
      window.dispatchEvent(new Event('vs-logout'));
    }
    return Promise.reject(err);
  }
);

export function errMsg(err) {
  const d = err?.response?.data;
  if (!d) return err?.message || 'Network error';
  if (typeof d === 'string') return d.slice(0, 300);
  if (d.detail) return d.detail;
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${[].concat(v).join(' ')}`)
    .join(' · ');
}

/** "/api/v1/crops/37/0" (AI path) -> "/crops/37/0" (Django proxy path, relative to baseURL). */
// `?nc=2` skips crops that older builds let the browser cache for a day (they could come from the mock).
export const cropPath = (aiPath) => (aiPath ? `${aiPath.replace(/^\/?api\/v1\//, '/')}?nc=2` : '');

/** "2026-05-01T09:00" (datetime-local) -> "2026-05-01T09:00:00" (read as Africa/Cairo by the AI). */
export const localInput = (v) => (v && v.length === 16 ? `${v}:00` : v || '');

export default api;
