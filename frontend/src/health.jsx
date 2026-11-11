import { RefreshCw, ServerOff, WifiOff } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from './api.js';
import { useT } from './i18n.jsx';
import { useToast } from './toast.jsx';

/**
 * Connection watchdog: polls /api/health (30 s when fine, 5 s when something is down) and
 * re-checks at once when any API call fails with a network / gateway error.
 * state: 'ok' | 'ai-down' | 'backend-down'
 */
const HealthCtx = createContext({ state: 'ok', ai: null, check: () => {} });

export function HealthProvider({ children }) {
  const { t } = useT();
  const toast = useToast();
  const [h, setH] = useState({ state: 'ok', ai: null, checking: false });
  const prev = useRef('ok');
  const timer = useRef(null);

  const check = useCallback(async () => {
    clearTimeout(timer.current);
    setH((x) => ({ ...x, checking: true }));
    let next;
    try {
      const r = await api.get('/health', { timeout: 20000 });
      next = { state: r.data.ai.reachable ? 'ok' : 'ai-down', ai: r.data.ai };
    } catch {
      next = { state: 'backend-down', ai: null };
    }
    setH({ ...next, checking: false });
    if (prev.current !== 'ok' && next.state === 'ok') toast.success(t('connRestored'));
    prev.current = next.state;
    timer.current = setTimeout(check, next.state === 'ok' ? 30000 : 5000);
  }, [t, toast]);

  useEffect(() => {
    check();
    let last = 0;
    const onFail = () => {
      if (Date.now() - last < 4000) return; // many failing requests at once → one re-check
      last = Date.now();
      check();
    };
    window.addEventListener('vs-net-error', onFail);
    window.addEventListener('online', onFail);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('vs-net-error', onFail);
      window.removeEventListener('online', onFail);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <HealthCtx.Provider value={{ ...h, check }}>{children}</HealthCtx.Provider>;
}

export const useHealth = () => useContext(HealthCtx);

export function ConnectionBanner() {
  const { t } = useT();
  const { state, ai, check, checking } = useHealth();
  if (state === 'ok') return null;
  const backend = state === 'backend-down';
  return (
    <div className={`conn-banner ${backend ? 'bad' : 'warn'}`} role="alert">
      {backend ? <ServerOff size={18} /> : <WifiOff size={18} />}
      <div className="grow">
        <b>{backend ? t('connBackendDown') : t('connAiDown')}</b>
        <span>{backend ? t('connBackendHint') : t('connAiHint')}</span>
        {!backend && ai?.error && <small className="mono">{ai.error.slice(0, 160)}</small>}
      </div>
      <button className="btn btn-sm" onClick={check} disabled={checking}>
        <RefreshCw size={14} className={checking ? 'spin' : ''} /> {t('retry')}
      </button>
    </div>
  );
}
