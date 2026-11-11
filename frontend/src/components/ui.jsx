import {
  AlertTriangle, CheckCircle2, CircleDashed, Clock, Film, Inbox, Loader2, RefreshCw, X, XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { cropPath } from '../api.js';
import { useT } from '../i18n.jsx';
import { fmtRange, pct, probBand } from '../utils.js';

/* ---------------------------------------------------------------- layout bits */

export function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="page-header">
      {Icon && (
        <div className="ph-icon">
          <Icon size={22} />
        </div>
      )}
      <div className="ph-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, icon: Icon, subtitle, actions, children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            <div className="ch-title">
              {Icon && <Icon size={17} />}
              <h2>{title}</h2>
            </div>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'primary', to }) {
  const Tag = to ? Link : 'div';
  return (
    <Tag className={`stat tone-${tone}`} to={to}>
      {Icon && (
        <div className="stat-icon">
          <Icon size={20} />
        </div>
      )}
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value ?? <span className="skeleton" style={{ display: 'inline-block', width: 48, height: 26 }} />}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </Tag>
  );
}

export function Skeleton({ h = 16, w = '100%', r, style }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

export function SkeletonCards({ n = 6, h = 300 }) {
  return (
    <div className="cards-grid">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} h={h} r={14} />
      ))}
    </div>
  );
}

export function Spinner({ label }) {
  const { t } = useT();
  return (
    <div className="spinner-row">
      <Loader2 size={18} className="spin" /> {label || t('loading')}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={26} />
      </div>
      {title && <h3>{title}</h3>}
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  const { t } = useT();
  if (!error) return null;
  return (
    <div className="alert alert-error">
      <AlertTriangle size={18} />
      <div className="grow">{error}</div>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> {t('retry')}
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- badges */

const STATUS = {
  done: ['badge-good', CheckCircle2],
  failed: ['badge-bad', XCircle],
  processing: ['badge-info', Loader2],
  running: ['badge-info', Loader2],
  uploaded: ['badge-warn', Clock],
  pending: ['', CircleDashed],
};

export function StatusBadge({ status }) {
  const { t } = useT();
  const [cls, Icon] = STATUS[status] || ['', CircleDashed];
  return (
    <span className={`badge ${cls}`}>
      <Icon size={12} className={status === 'processing' || status === 'running' ? 'spin' : ''} />
      {t(`st_${status}`)}
    </span>
  );
}

export function DecisionBadge({ decision }) {
  const { t } = useT();
  const map = { confirmed: ['badge-good', CheckCircle2], rejected: ['badge-bad', XCircle], pending: ['badge-warn', Clock] };
  const [cls, Icon] = map[decision] || map.pending;
  return (
    <span className={`badge ${cls}`}>
      <Icon size={12} /> {t(`decision_${decision}`)}
    </span>
  );
}

/** Category badge: neutral text + coloured key (identity is never colour-only: the label is always there). */
export function KeyBadge({ color, children }) {
  return (
    <span className="badge badge-outline">
      <span className="dot" style={{ background: color }} />
      {children}
    </span>
  );
}

export function ProbBar({ p }) {
  const { t } = useT();
  if (p == null) return <span className="muted small">{t('colourBackend')}</span>;
  const band = probBand(p);
  return (
    <span className={`prob prob-${band}`} title={`${(p * 100).toFixed(1)}%`}>
      <span className="prob-track">
        <span className="prob-fill" style={{ width: `${Math.max(3, p * 100)}%` }} />
      </span>
      <b>{pct(p)}</b>
    </span>
  );
}

export function ProbRing({ p, size = 52 }) {
  const { t } = useT();
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const band = probBand(p);
  const color = { good: 'var(--good)', mid: 'var(--warn)', weak: 'var(--bad)', none: 'var(--muted)' }[band];
  return (
    <div className="ring" style={{ width: size, height: size }} title={t('probability')}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
        {p != null && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`} />
        )}
      </svg>
      <span>{p == null ? '—' : pct(p)}</span>
    </div>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)} role="tab"
          aria-selected={value === o.value}>
          {o.icon && <o.icon size={14} />}
          {o.label}
          {o.count != null && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- images */

// Crop images need the auth header, so they are fetched as blobs and cached per session.
const blobCache = new Map();
const inflight = new Map(); // one request per crop even when several <img> ask for it at once

export function AuthImage({ src, alt = '', className, onClick, style, onLoad }) {
  const path = cropPath(src);
  const [url, setUrl] = useState(() => blobCache.get(path) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path) return;
    if (blobCache.has(path)) {
      setUrl(blobCache.get(path));
      return;
    }
    let alive = true;
    setFailed(false);
    if (!inflight.has(path)) {
      inflight.set(
        path,
        api
          .get(path, { responseType: 'blob' })
          .then((r) => {
            const u = URL.createObjectURL(r.data);
            blobCache.set(path, u);
            return u;
          })
          .finally(() => inflight.delete(path))
      );
    }
    inflight
      .get(path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [path]);

  if (!path || failed)
    return (
      <div className={`img-missing ${className || ''}`} style={style} onClick={onClick}>
        <Film size={18} />
      </div>
    );
  if (!url) return <div className={`img-loading ${className || ''}`} style={style} />;
  return <img src={url} alt={alt} className={className} onClick={onClick} loading="lazy" style={style} onLoad={onLoad} />;
}

/**
 * Crops from the AI server are tiny (often ~30x80 px). Show the whole crop (contain) over a blurred copy
 * of itself instead of cropping and over-zooming it to fill the card.
 */
export function CropImage({ src, className = '', onClick }) {
  return (
    <div className={`crop-frame ${className}`} onClick={onClick}>
      <AuthImage src={src} className="crop-bg" />
      <AuthImage src={src} className="crop-fg" />
    </div>
  );
}

export function Modal({ title, onClose, children, wide, className = '' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''} ${className}`} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {title != null && (
          <div className="modal-head">
            <h3>{title}</h3>
            <button className="icon-btn sm" onClick={onClose} aria-label="close">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Evidence viewer: large crop, all ranks, and the metadata that proves where it came from. */
export function CropViewer({ crops, code, start = 0, onClose, meta }) {
  const { t } = useT();
  const [i, setI] = useState(start);
  const [dims, setDims] = useState(null);
  useEffect(() => setDims(null), [i]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setI((x) => Math.min(crops.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [crops.length]);
  return (
    <Modal title={<span className="mono">{code}</span>} onClose={onClose} wide>
      <div className="viewer">
        <div className="viewer-stage">
          <AuthImage src={crops[i]} className="crop-bg" />
          <AuthImage src={crops[i]} className="viewer-img" onLoad={(e) => setDims([e.target.naturalWidth, e.target.naturalHeight])}
            style={dims ? { height: `min(100%, ${dims[1] * 5}px)` } : undefined} />
        </div>
        <div className="viewer-side">
          <div className="viewer-thumbs">
            {crops.map((c, k) => (
              <AuthImage key={c} src={c} className={k === i ? 'active' : ''} onClick={() => setI(k)} />
            ))}
          </div>
          <div className="xs muted">
            {t('cropRank')} #{i} {i === 0 && `· ${t('bestView')}`}
            {dims && <> · {t('origSize')} <b className="mono">{dims[0]}×{dims[1]} px</b></>}
          </div>
          {dims && dims[1] < 120 && <div className="alert alert-info xs"><span className="grow">{t('lowResNote')}</span></div>}
          {meta && (
            <div className="kv-list">
              {meta.map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function evidenceMeta(t, x) {
  return [
    [t('camera'), x.camera || '—'],
    [t('video'), x.video || x.evidence?.video || '—'],
    [t('time'), fmtRange(x.start_ts, x.end_ts)],
    ...(x.evidence?.frame_idx != null ? [[t('frame'), x.evidence.frame_idx]] : []),
    ...(x.class ? [[t('class'), x.class]] : []),
  ];
}

/* ---------------------------------------------------------------- data hook */

export function useApi(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((r) => alive && setState({ data: r.data, loading: false, error: null }))
      .catch((e) => alive && setState((s) => ({ data: s.data, loading: false, error: e })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((x) => x + 1) };
}
