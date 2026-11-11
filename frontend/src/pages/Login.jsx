import { ArrowRight, Briefcase, Languages, Lock, Moon, ScanEye, Search, ShieldCheck, Sun, User } from 'lucide-react';
import { useState } from 'react';
import { errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox } from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { useTheme } from '../theme.jsx';

const FEEDS = [
  { cam: 'CAM-01', boxes: [[18, 30, 14, 40], [58, 22, 12, 46]] },
  { cam: 'CAM-02', boxes: [[34, 26, 16, 52]] },
  { cam: 'CAM-03', boxes: [[12, 40, 30, 22], [62, 30, 12, 40]] },
];

export default function Login() {
  const { signIn } = useAuth();
  const { t, toggle } = useT();
  const { resolved, toggle: toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', first_name: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(mode, form);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-art">
        <div className="row" style={{ gap: 12 }}>
          <div className="brand-mark"><ScanEye size={22} /></div>
          <div className="brand-text">
            <b>VisionSeek AI</b>
            <small>{t('tagline')}</small>
          </div>
        </div>
        <div>
          <h1 dangerouslySetInnerHTML={{ __html: t('loginHeadline') }} />
          <p>{t('loginText')}</p>
          <div className="feeds">
            {FEEDS.map((f, i) => (
              <div key={f.cam} className="feed">
                {f.boxes.map(([x, y, w, h], k) => (
                  <i key={k} style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, animationDelay: `${(i + k) * 0.7}s` }} />
                ))}
                <span>{f.cam} ● REC</span>
              </div>
            ))}
          </div>
          <div className="features">
            <div><Search size={18} /> {t('feat1')}</div>
            <div><ShieldCheck size={18} /> {t('feat2')}</div>
            <div><Briefcase size={18} /> {t('feat3')}</div>
          </div>
        </div>
        <div className="xs" style={{ color: '#6c7892' }}>{t('loginFoot')}</div>
      </div>

      <div className="login-form-wrap" style={{ position: 'relative' }}>
        <div className="login-top">
          <button className="icon-btn" onClick={toggleTheme}>{resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="btn btn-ghost btn-sm" onClick={toggle}><Languages size={15} /> {t('langToggle')}</button>
        </div>
        <form className="login-card" onSubmit={submit}>
          <div>
            <h2>{mode === 'login' ? t('welcomeBack') : t('register')}</h2>
            <p className="sub">{mode === 'login' ? t('signInSub') : t('registerSub')}</p>
          </div>
          {mode === 'register' && (
            <label className="field">
              <span>{t('fullName')}</span>
              <div className="input-icon"><User size={16} /><input value={form.first_name} onChange={set('first_name')} dir="auto" /></div>
            </label>
          )}
          <label className="field">
            <span>{t('username')}</span>
            <div className="input-icon"><User size={16} /><input value={form.username} onChange={set('username')} autoComplete="username" required autoFocus /></div>
          </label>
          <label className="field">
            <span>{t('password')}</span>
            <div className="input-icon">
              <Lock size={16} />
              <input type="password" value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 6 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
          </label>
          <ErrorBox error={error} />
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {mode === 'login' ? t('signIn') : t('register')} <ArrowRight size={18} className="flip-rtl" />
          </button>
          <p className="small text-2" style={{ textAlign: 'center' }}>
            {mode === 'login' ? t('noAccountQ') : t('haveAccountQ')}{' '}
            <button type="button" className="link" onClick={() => (setMode(mode === 'login' ? 'register' : 'login'), setError(null))}>
              {mode === 'login' ? t('register') : t('signIn')}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
