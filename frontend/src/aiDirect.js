import axios, { AxiosError } from 'axios';

/**
 * Direct mode: the browser talks to the VisionSeek AI server itself instead of going through
 * Django (needed when the Django host can't reach the AI, e.g. a PythonAnywhere free account
 * whose outbound proxy blocks trycloudflare.com). Pages keep calling the same Django-style paths
 * (`/search`, `/videos/VID-0001`, …); `api.js` hands those requests to `directAdapter`, which
 * calls the AI and then reports results back to Django so history and the video index stay complete.
 */

const BASE = import.meta.env.VITE_API_URL || '/api';

// Plain Django client (no interceptors → no recursion through the direct adapter).
const django = axios.create({ baseURL: BASE });
django.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('vs_token');
  if (t) cfg.headers.Authorization = `Token ${t}`;
  return cfg;
});

const aiHttp = axios.create();

let cfgPromise = null;

/** { direct, base_url, api_key } – fetched once per session, reset when settings change. */
export function getAiConfig() {
  if (!localStorage.getItem('vs_token')) return Promise.resolve({ direct: false });
  if (!cfgPromise) {
    cfgPromise = django.get('/ai-config', { timeout: 15000 }).then(
      (r) => r.data,
      () => {
        cfgPromise = null; // try again on the next request
        return { direct: false };
      }
    );
  }
  return cfgPromise;
}

export function resetAiConfig() {
  cfgPromise = null;
}
window.addEventListener('vs-logout', resetAiConfig);

const clean = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** Same rules as the old Django proxy: friendly messages, and an AI 401 never logs the user out. */
function aiError(err, cfg, aiCfg) {
  const r = err.response;
  let status = r?.status || 502;
  let detail;
  if (!r) {
    detail = `AI service unreachable at ${aiCfg.base_url} (${err.code === 'ECONNABORTED' ? 'timeout' : 'offline, or CORS not enabled on the AI server'})`;
  } else {
    let d = r.data;
    if (d instanceof Blob) d = null; // crop requests
    const text = typeof d === 'string' ? d : '';
    if (text.trimStart().startsWith('<')) {
      const title = (text.match(/<title>(.*?)<\/title>/is)?.[1] || r.statusText || '').replace(/\s+/g, ' ').trim();
      status = 502;
      detail = `AI server is not reachable through its tunnel (HTTP ${r.status}: ${title.slice(0, 120)}). Restart it and update the AI link if it changed.`;
    } else {
      detail = d?.detail ?? (text || r.statusText || `HTTP ${r.status}`);
      if (Array.isArray(detail)) {
        detail = detail.map((x) => `${(x.loc || []).slice(1).join('.')}: ${x.msg}`).join('; ');
      }
    }
    if (r.status === 401) {
      status = 502;
      detail = 'AI service rejected the API key (check the key in AI settings)';
    } else if (r.status >= 500 && r.status !== 503) {
      status = 502;
    }
  }
  const response = { data: { detail: String(detail), source: 'ai' }, status, statusText: '', headers: {}, config: cfg };
  return new AxiosError(String(detail), err.code, cfg, null, response);
}

function ai(aiCfg, cfg, method, path, opts = {}) {
  const headers = aiCfg.api_key ? { 'X-API-Key': aiCfg.api_key } : {};
  return aiHttp
    .request({ method, url: aiCfg.base_url + path, headers, timeout: 60000, ...opts })
    .catch((e) => {
      throw aiError(e, cfg, aiCfg);
    });
}

const ok = (cfg, data, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config: cfg, request: null });

/** Requests that have to reach the AI server. Returns true for paths `directAdapter` handles. */
export function isAiRoute(cfg) {
  const url = String(cfg.url || '').split('?')[0];
  const m = (cfg.method || 'get').toLowerCase();
  if (m === 'get') return /^\/(health|cameras|events|search|analytics|crops\/\d+\/\d+|videos\/[^/]+(\/tracks)?)$/.test(url);
  if (m === 'post') return url === '/cameras' || url === '/videos' || url === '/videos/sync';
  return false;
}

export async function directAdapter(cfg, aiCfg) {
  const url = String(cfg.url || '').split('?')[0];
  const m = (cfg.method || 'get').toLowerCase();
  const params = clean(cfg.params);
  let mm;

  if (url === '/health') {
    const h = (await django.get('/health', { timeout: cfg.timeout || 20000 })).data;
    const info = { ...h.ai, base_url: aiCfg.base_url, direct: true };
    try {
      const r = await ai(aiCfg, cfg, 'get', '/health', { timeout: 15000 });
      return ok(cfg, { ...h, ai: { ...info, ...r.data, reachable: true } });
    } catch (e) {
      return ok(cfg, { ...h, ai: { ...info, reachable: false, error: e.response?.data?.detail || e.message } });
    }
  }

  if (url === '/cameras' && m === 'get') return ok(cfg, (await ai(aiCfg, cfg, 'get', '/api/v1/cameras')).data);

  if (url === '/cameras' && m === 'post') {
    const body = clean(typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data);
    return ok(cfg, (await ai(aiCfg, cfg, 'post', '/api/v1/cameras', { data: body })).data, 201);
  }

  if (url === '/events') return ok(cfg, (await ai(aiCfg, cfg, 'get', '/api/v1/events', { params })).data);

  if (url === '/search') {
    if (!String(params.q || '').trim()) {
      const response = { data: { detail: 'q is required' }, status: 422, statusText: '', headers: {}, config: cfg };
      throw new AxiosError('q is required', 'ERR_BAD_REQUEST', cfg, null, response);
    }
    const data = (await ai(aiCfg, cfg, 'get', '/api/v1/search', { params })).data;
    const { q, ...filters } = params;
    django
      .post('/search/log', { q, query_en: data.query_en || '', filters, hits: (data.hits || []).length })
      .catch(() => {});
    return ok(cfg, data);
  }

  if ((mm = url.match(/^\/crops\/(\d+)\/(\d+)$/))) {
    const r = await ai(aiCfg, cfg, 'get', `/api/v1/crops/${mm[1]}/${mm[2]}`, { responseType: cfg.responseType || 'blob' });
    return ok(cfg, r.data);
  }

  if ((mm = url.match(/^\/videos\/([^/]+)\/tracks$/))) {
    return ok(cfg, (await ai(aiCfg, cfg, 'get', `/api/v1/videos/${encodeURIComponent(mm[1])}/tracks`)).data);
  }

  if (m === 'get' && (mm = url.match(/^\/videos\/([^/]+)$/))) {
    const data = (await ai(aiCfg, cfg, 'get', `/api/v1/videos/${encodeURIComponent(mm[1])}`)).data;
    django.post(`/videos/${encodeURIComponent(mm[1])}`, data).catch(() => {});
    return ok(cfg, data);
  }

  if (url === '/videos' && m === 'post') {
    const fd = cfg.data;
    const file = fd.get('file');
    let result;
    try {
      result = (
        await ai(aiCfg, cfg, 'post', '/api/v1/videos', { data: fd, timeout: 0, onUploadProgress: cfg.onUploadProgress })
      ).data;
    } catch (e) {
      if (e.response?.data?.source === 'ai' && /unreachable/.test(e.response.data.detail || '')) {
        // No HTTP answer the browser can read: almost always the tunnel cutting the upload.
        e.response.data.detail =
          `Upload was cut before the AI server answered (${(file?.size / 1e6 || 0).toFixed(0)} MB). ` +
          'The Cloudflare tunnel rejects files over 100 MB and drops uploads the AI takes more than 100 s to accept. ' +
          'Compress or split the video, or check that the AI server is running.';
        e.message = e.response.data.detail;
      }
      throw e;
    }
    const record = (
      await django.post('/videos/record', {
        video_code: result.video_code,
        camera_code: fd.get('camera_code'),
        start_time: fd.get('start_time'),
        original_name: file?.name || '',
        size_bytes: file?.size || 0,
        status: result.status || 'uploaded',
      })
    ).data;
    return ok(cfg, { ...result, record }, 202);
  }

  if (url === '/videos/sync') {
    // The AI API has no "list videos": probe VID-0001..VID-0080 and index the ones that exist.
    const codes = Array.from({ length: 80 }, (_, i) => `VID-${String(i + 1).padStart(4, '0')}`);
    const found = [];
    let next = 0;
    const worker = async () => {
      while (next < codes.length) {
        const code = codes[next++];
        try {
          const d = (await ai(aiCfg, cfg, 'get', `/api/v1/videos/${code}`, { timeout: 30000 })).data;
          found.push({ code, ...d });
        } catch (e) {
          if (e.response?.status !== 404) throw e;
        }
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    return ok(cfg, (await django.post('/videos/sync', { videos: found })).data);
  }

  if (url === '/analytics') {
    let events = [];
    let cameras = [];
    let aiErr = null;
    try {
      [events, cameras] = await Promise.all([
        ai(aiCfg, cfg, 'get', '/api/v1/events', { params: { limit: 500 } }).then((r) => r.data),
        ai(aiCfg, cfg, 'get', '/api/v1/cameras').then((r) => r.data),
      ]);
    } catch (e) {
      events = [];
      cameras = [];
      aiErr = e.response?.data?.detail || e.message;
    }
    return ok(cfg, (await django.post('/analytics', { events, cameras, ai_error: aiErr })).data);
  }

  throw new AxiosError(`No direct route for ${m.toUpperCase()} ${url}`, 'ERR_BAD_REQUEST', cfg);
}
