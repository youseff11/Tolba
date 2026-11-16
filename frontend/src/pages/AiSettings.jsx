import { CheckCircle2, KeyRound, Save, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import { useHealth } from '../health.jsx';
import { useT } from '../i18n.jsx';
import { useToast } from '../toast.jsx';
import { Card, ErrorBox, PageHeader } from '../components/ui.jsx';

/** Admin page: change the AI server link (Cloudflare tunnel) and its X-API-Key without redeploying. */
export default function AiSettings() {
  const { t } = useT();
  const toast = useToast();
  const { check } = useHealth();
  const [cur, setCur] = useState(null);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [clearKey, setClearKey] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/ai-settings').then(
      (r) => { setCur(r.data); setUrl(r.data.base_url || ''); },
      (e) => setError(errMsg(e)),
    );
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = { base_url: url };
      if (key.trim()) body.api_key = key.trim();
      else if (clearKey) body.api_key = '';
      const r = await api.put('/ai-settings', body, { timeout: 30000 });
      setCur(r.data);
      setUrl(r.data.base_url);
      setKey('');
      setClearKey(false);
      setResult(r.data);
      toast.success(t('saved'));
      check();
    } catch (err) {
      setError(errMsg(err));
    }
    setBusy(false);
  }

  return (
    <div className="page">
      <PageHeader icon={KeyRound} title={t('aiSettings')} subtitle={t('aiSettingsSub')} />
      <Card style={{ maxWidth: 720 }}>
      {cur && (
        <div className="row xs muted" style={{ gap: 6, marginBottom: 14 }}>
          <span>{t('aiCurrent')}:</span> <b className="mono" dir="ltr">{cur.base_url || '—'}</b>
          <span>· {t(cur.source === 'ui' ? 'aiSourceUi' : 'aiSourceEnv')}</span>
        </div>
      )}
      <form className="form" onSubmit={save}>
        <label className="field">
          <span>{t('aiLink')}</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} required dir="ltr"
            placeholder="https://xxxx-xxxx.trycloudflare.com" className="mono" />
          <small className="muted xs">{t('aiLinkHint')}</small>
        </label>
        <label className="field">
          <span>{t('aiKey')}</span>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} dir="ltr" autoComplete="new-password"
            placeholder={cur?.has_key ? `${t('aiKeyKeep')} (${cur.key_hint})` : t('aiKeyNone')} className="mono" />
        </label>
        {cur?.has_key && !key && (
          <label className="row xs muted" style={{ gap: 6 }}>
            <input type="checkbox" checked={clearKey} onChange={(e) => setClearKey(e.target.checked)} /> {t('aiKeyClear')}
          </label>
        )}
        {result && (
          <div className="row xs" style={{ gap: 6, color: result.reachable ? 'var(--good)' : 'var(--bad)' }}>
            {result.reachable ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{result.reachable ? t('aiTestOk') : `${t('aiTestFail')} ${result.error || ''}`}</span>
          </div>
        )}
        <ErrorBox error={error} />
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy || !cur}><Save size={16} /> {t('aiSaveTest')}</button>
        </div>
      </form>
      </Card>
    </div>
  );
}
