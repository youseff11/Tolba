import {
  ArrowLeft, Camera, Check, CheckCircle2, Clock, FileText, Film, Info, Lock, MessageSquarePlus, Pencil, Route, Siren, StickyNote,
  Trash2, Undo2, Unlock, User, X, XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg, localInput } from '../api.js';
import { Lanes, Legend } from '../components/charts.jsx';
import {
  Card, CropImage, DecisionBadge, EmptyState, ErrorBox, KeyBadge, ProbBar, Skeleton, StatCard,
} from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { useToast } from '../toast.jsx';
import { EVENT_COLOR, fmtClockTime, fmtRange, fmtTime } from '../utils.js';

export default function CaseDetail() {
  const { id } = useParams();
  const { t } = useT();
  const toast = useToast();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [head, setHead] = useState({ title: '', description: '' });
  const [note, setNote] = useState({ text: '', time: '' });
  const [kind, setKind] = useState('');

  const load = () =>
    api
      .get(`/cases/${id}`)
      .then((r) => {
        setC(r.data);
        setHead({ title: r.data.title, description: r.data.description });
      })
      .catch((e) => setError(errMsg(e)));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(fn, okMsg) {
    try {
      await fn();
      await load();
      if (okMsg) toast.success(okMsg);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const patchCase = (data, msg) => act(() => api.patch(`/cases/${id}`, data), msg);
  const patchItem = (itemId, data, msg) => act(() => api.patch(`/case-items/${itemId}`, data), msg);

  const stats = useMemo(() => {
    const ev = (c?.items || []).filter((i) => i.kind !== 'note');
    return {
      total: c?.items.length || 0,
      confirmed: ev.filter((i) => i.decision === 'confirmed').length,
      pending: ev.filter((i) => i.decision === 'pending').length,
      rejected: ev.filter((i) => i.decision === 'rejected').length,
      cameras: [...new Set((c?.items || []).map((i) => i.camera).filter(Boolean))],
    };
  }, [c]);

  const lanes = useMemo(() => {
    const timed = (c?.items || []).filter((i) => i.start_ts && i.camera);
    if (!timed.length) return null;
    const lo = Math.min(...timed.map((i) => new Date(i.start_ts).getTime()));
    const hi = Math.max(...timed.map((i) => new Date(i.end_ts || i.start_ts).getTime()));
    const pad = Math.max(5000, (hi - lo) * 0.04);
    return {
      domain: [lo - pad, hi + pad],
      lanes: stats.cameras.map((cam) => ({
        key: cam,
        label: <><Camera size={13} /> {cam}</>,
        items: timed.filter((i) => i.camera === cam).map((i) => ({
          id: i.id,
          start: new Date(i.start_ts).getTime(),
          end: new Date(i.end_ts || i.start_ts).getTime(),
          color: i.kind === 'track' ? 'var(--s1)' : 'var(--s2)',
          cls: i.decision,
          title: i.ref_code,
          sub: `${t(`kind_${i.kind}`)} · ${t(`decision_${i.decision}`)}`,
          valueText: fmtClockTime(i.start_ts),
        })),
      })),
    };
  }, [c, stats.cameras, t]);

  if (!c) {
    return (
      <div className="page">
        {error ? <ErrorBox error={error} /> : <><Skeleton h={90} r={14} /><Skeleton h={400} r={14} /></>}
      </div>
    );
  }

  const items = c.items.filter((i) => !kind || i.kind === kind);

  return (
    <div className="page">
      <Link to="/cases" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={15} className="flip-rtl" /> {t('nav_cases')}
      </Link>

      <div className="card" style={{ padding: 22 }}>
        {editing ? (
          <form className="form" onSubmit={(e) => (e.preventDefault(), patchCase(head, t('saved')).then(() => setEditing(false)))}>
            <input value={head.title} onChange={(e) => setHead({ ...head, title: e.target.value })} dir="auto" required style={{ fontSize: 18, fontWeight: 700 }} />
            <textarea rows={2} value={head.description} onChange={(e) => setHead({ ...head, description: e.target.value })} dir="auto" placeholder={t('description')} />
            <div className="form-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{t('cancel')}</button>
              <button className="btn btn-primary btn-sm"><Check size={14} /> {t('save')}</button>
            </div>
          </form>
        ) : (
          <div className="page-header">
            <div className="ph-icon"><FileText size={22} /></div>
            <div className="ph-text">
              <div className="row-wrap">
                <span className="case-num">#{String(c.id).padStart(3, '0')}</span>
                <span className={`badge ${c.status === 'open' ? 'badge-good' : ''}`}>{c.status === 'open' ? <Unlock size={12} /> : <Lock size={12} />} {t(`case_${c.status}`)}</span>
              </div>
              <h1 dir="auto" style={{ marginTop: 4 }}>{c.title}</h1>
              {c.description && <p dir="auto">{c.description}</p>}
              <div className="row-wrap xs muted" style={{ marginTop: 8 }}>
                <span className="row"><User size={13} /> {c.created_by}</span>
                <span className="row"><Clock size={13} /> {fmtTime(c.created_at)}</span>
              </div>
            </div>
            <div className="ph-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil size={14} /> {t('edit')}</button>
              <button className="btn btn-sm" onClick={() => patchCase({ status: c.status === 'open' ? 'closed' : 'open' }, t('saved'))}>
                {c.status === 'open' ? <><Lock size={14} /> {t('closeCase')}</> : <><Unlock size={14} /> {t('reopenCase')}</>}
              </button>
              <Link className="btn btn-primary btn-sm" to={`/cases/${id}/report`}><FileText size={14} /> {t('report')}</Link>
              <button className="icon-btn" title={t('delete')}
                onClick={() => window.confirm(t('deleteCaseConfirm')) && api.delete(`/cases/${id}`).then(() => (toast.success(t('deleted')), nav('/cases')))}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid g-4">
        <StatCard icon={FileText} tone="primary" label={t('items')} value={stats.total} />
        <StatCard icon={CheckCircle2} tone="good" label={t('decision_confirmed')} value={stats.confirmed} />
        <StatCard icon={Clock} tone="warn" label={t('pendingReview')} value={stats.pending} />
        <StatCard icon={Camera} tone="info" label={t('camerasInvolved')} value={stats.cameras.length} hint={stats.cameras.join(' · ')} />
      </div>

      {lanes && (
        <Card icon={Route} title={t('crossCamera')} subtitle={t('crossCameraSub')}>
          <div className="stack">
            <Legend items={[{ label: t('kind_track'), color: 'var(--s1)' }, { label: t('kind_event'), color: 'var(--s2)' }]} />
            <Lanes lanes={lanes.lanes} domain={lanes.domain} fmtTick={(v) => fmtClockTime(new Date(v).toISOString())}
              onPick={(it) => document.getElementById(`item-${it.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
          </div>
        </Card>
      )}

      <div className="grid g-main">
        <Card icon={Clock} title={t('timeline')} subtitle={t('timelineSub')}
          actions={
            <div className="segmented">
              {['', 'track', 'event', 'note'].map((k) => (
                <button key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
                  {k ? t(`kind_${k}`) : t('any')}
                  <span className="count">{k ? c.items.filter((i) => i.kind === k).length : c.items.length}</span>
                </button>
              ))}
            </div>
          }>
          {items.length === 0 ? (
            <EmptyState icon={FileText} title={t('emptyCaseTitle')} text={t('emptyCase')}
              action={<Link to="/search" className="btn btn-soft">{t('goSearch')}</Link>} />
          ) : (
            <ol className="timeline">
              {items.map((it) => (
                <TimelineItem key={it.id} it={it} onPatch={patchItem}
                  onDelete={() => act(() => api.delete(`/case-items/${it.id}`), t('deleted'))} />
              ))}
            </ol>
          )}
        </Card>
        <div className="stack" style={{ gap: 20 }}>
          <Card icon={MessageSquarePlus} title={t('addNote')}>
            <form className="form" onSubmit={(e) => {
              e.preventDefault();
              act(() => api.post(`/cases/${id}/items`, { kind: 'note', note: note.text, start_ts: note.time ? localInput(note.time) : null }), t('noteAdded'))
                .then(() => setNote({ text: '', time: '' }));
            }}>
              <label className="field">
                <span>{t('noteText')}</span>
                <textarea rows={4} value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} required dir="auto" placeholder={t('notePh')} />
              </label>
              <label className="field">
                <span>{t('noteTime')}</span>
                <input type="datetime-local" step="1" value={note.time} onChange={(e) => setNote({ ...note, time: e.target.value })} />
                <small>{t('noteTimeHint')}</small>
              </label>
              <button className="btn btn-primary btn-block"><StickyNote size={16} /> {t('add')}</button>
            </form>
          </Card>
          <div className="alert alert-info">
            <Info size={18} />
            <div className="grow small">{t('reviewHint')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ it, onPatch, onDelete }) {
  const { t } = useT();
  const [note, setNote] = useState(it.note);
  useEffect(() => setNote(it.note), [it.note]);
  const Icon = it.kind === 'track' ? User : it.kind === 'event' ? Siren : StickyNote;

  return (
    <li id={`item-${it.id}`} className={`tl-item tl-${it.kind} dec-${it.kind === 'note' ? 'note' : it.decision}`}>
      <div className="tl-node"><Icon size={16} /></div>
      <div className="tl-time">{it.start_ts ? fmtRange(it.start_ts, it.end_ts) : t('noTime')}</div>
      <div className="tl-card">
        {it.kind === 'track' && <CropImage src={it.crop_url} className="tl-img" />}
        <div className="tl-body">
          <div className="row-wrap">
            {it.ref_code && <span className="mono small" style={{ fontWeight: 600 }}>{it.ref_code}</span>}
            {it.kind === 'event' && it.data?.type && <KeyBadge color={EVENT_COLOR[it.data.type]}>{t(`ev_${it.data.type}`)}</KeyBadge>}
            {it.camera && <span className="badge"><Camera size={11} /> {it.camera}</span>}
            {it.video && <Link to={`/videos/${it.video}`} className="badge badge-outline"><Film size={11} /> {it.video}</Link>}
            {it.kind !== 'note' && <DecisionBadge decision={it.decision} />}
          </div>
          {it.kind === 'track' && it.score != null && <ProbBar p={it.match_probability} />}
          {it.source_query && <div className="xs muted" dir="auto">{t('fromQuery')}: “{it.source_query}”</div>}
          <textarea className="tl-note" rows={it.kind === 'note' ? 3 : 1} value={note} placeholder={t('investigatorNote')}
            onChange={(e) => setNote(e.target.value)} onBlur={() => note !== it.note && onPatch(it.id, { note }, t('saved'))} dir="auto" />
          <div className="tl-actions">
            {it.kind !== 'note' && (it.decision === 'pending' ? (
              <>
                <button className="btn btn-good btn-sm" onClick={() => onPatch(it.id, { decision: 'confirmed' })}><CheckCircle2 size={14} /> {t('confirm')}</button>
                <button className="btn btn-danger btn-sm" onClick={() => onPatch(it.id, { decision: 'rejected' })}><XCircle size={14} /> {t('reject')}</button>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => onPatch(it.id, { decision: 'pending' })}><Undo2 size={14} /> {t('markPending')}</button>
            ))}
            <span className="grow" />
            <span className="xs muted">{it.added_by}</span>
            <button className="icon-btn sm" onClick={() => window.confirm(t('deleteConfirm')) && onDelete()} title={t('delete')}><X size={15} /></button>
          </div>
        </div>
      </div>
    </li>
  );
}
