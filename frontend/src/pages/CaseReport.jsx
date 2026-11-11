import { AlertTriangle, ArrowLeft, ClipboardList, FileText, Printer, Route, ScanEye, ShieldAlert, Sigma } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { Lanes, Legend } from '../components/charts.jsx';
import { CropImage, ErrorBox, KeyBadge, Skeleton, useApi } from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { EVENT_COLOR, fmtClockTime, fmtRange, fmtTime, pct } from '../utils.js';

export default function CaseReport() {
  const { id } = useParams();
  const { t } = useT();
  const rep = useApi(() => api.get(`/cases/${id}/report`), [id]);

  if (rep.loading && !rep.data) return <div className="page"><Skeleton h={600} r={20} /></div>;
  if (rep.error) return <div className="page"><ErrorBox error={errMsg(rep.error)} onRetry={rep.reload} /></div>;

  const r = rep.data;
  const byId = Object.fromEntries(r.items.map((i) => [i.id, i]));
  const ordered = r.timeline.map((x) => byId[x]).filter(Boolean);
  const s = r.summary;
  const refOf = (ids) => ids.map((x) => byId[x]?.ref_code || `#${x}`).join(', ');
  const kept = ordered.filter((i) => i.start_ts && i.camera && i.decision !== 'rejected');
  const lo = kept.length ? Math.min(...kept.map((i) => new Date(i.start_ts).getTime())) : 0;
  const hi = kept.length ? Math.max(...kept.map((i) => new Date(i.end_ts || i.start_ts).getTime())) : 1;
  const pad = Math.max(5000, (hi - lo) * 0.04);

  function warningText(w) {
    if (w.code === 'gap') return t('w_gap', { from: fmtTime(w.from), to: fmtTime(w.to) });
    if (w.code === 'conflict') return `${t('w_conflict', { cameras: w.cameras.join(' / ') })}: ${refOf(w.items)}`;
    return `${t(`w_${w.code}`, { count: w.count })}: ${refOf(w.items)}`;
  }

  return (
    <div className="page">
      <div className="no-print row-between">
        <Link className="btn btn-ghost btn-sm" to={`/cases/${id}`}><ArrowLeft size={15} className="flip-rtl" /> {t('back')}</Link>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> {t('print')}</button>
      </div>

      <article className="report">
        <header className="report-head">
          <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
            <div className="brand-mark"><ScanEye size={22} /></div>
            <div>
              <div className="xs muted" style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                VisionSeek AI · {t('reportTitle')}
              </div>
              <h1 dir="auto" style={{ marginTop: 4 }}>#{String(r.case.id).padStart(3, '0')} · {r.case.title}</h1>
              {r.case.description && <p dir="auto" className="text-2" style={{ marginTop: 6, maxWidth: 640 }}>{r.case.description}</p>}
            </div>
          </div>
          <div className="report-meta small">
            <span>{t('status')}: <b>{t(`case_${r.case.status}`)}</b></span>
            <span>{t('createdBy')}: <b>{r.case.created_by}</b></span>
            <span>{t('generated')}: <b>{fmtTime(new Date().toISOString())}</b></span>
          </div>
        </header>

        <section>
          <h2><Sigma size={18} /> {t('summary')}</h2>
          <div className="summary-tiles">
            <div><span>{t('items')}</span><b>{s.items}</b> <span className="xs">{Object.entries(s.by_kind).map(([k, v]) => `${v} ${t(`kind_${k}`)}`).join(' · ')}</span></div>
            <div><span>{t('decision_confirmed')}</span><b>{s.by_decision.confirmed || 0}</b></div>
            <div><span>{t('pendingReview')}</span><b>{s.by_decision.pending || 0}</b></div>
            <div><span>{t('decision_rejected')}</span><b>{s.by_decision.rejected || 0}</b></div>
            <div><span>{t('camerasInvolved')}</span><b>{s.cameras.join(', ') || '—'}</b></div>
            <div><span>{t('videos')}</span><b>{s.videos.join(', ') || '—'}</b></div>
            <div style={{ gridColumn: 'span 2' }}><span>{t('period')}</span><b>{fmtRange(s.first_ts, s.last_ts)}</b></div>
          </div>
        </section>

        <section>
          <h2><ShieldAlert size={18} /> {t('warnings')}</h2>
          {r.warnings.length === 0 ? <p className="muted">{t('noWarnings')}</p> : (
            <ul className="warnings">
              {r.warnings.map((w, i) => (
                <li key={i} className={`warn-${w.code}`}><AlertTriangle size={16} /> <span>{warningText(w)}</span></li>
              ))}
            </ul>
          )}
        </section>

        {kept.length > 0 && (
          <section>
            <h2><Route size={18} /> {t('crossCamera')}</h2>
            <div className="stack">
              <Legend items={[{ label: t('kind_track'), color: 'var(--s1)' }, { label: t('kind_event'), color: 'var(--s2)' }]} />
              <Lanes domain={[lo - pad, hi + pad]} fmtTick={(v) => fmtClockTime(new Date(v).toISOString())}
                lanes={s.cameras.map((cam) => ({
                  key: cam,
                  label: cam,
                  items: kept.filter((i) => i.camera === cam).map((i) => ({
                    id: i.id, start: new Date(i.start_ts).getTime(), end: new Date(i.end_ts || i.start_ts).getTime(),
                    color: i.kind === 'track' ? 'var(--s1)' : 'var(--s2)', cls: i.decision, title: i.ref_code,
                    sub: t(`decision_${i.decision}`), valueText: fmtClockTime(i.start_ts),
                  })),
                }))} />
            </div>
          </section>
        )}

        <section>
          <h2><ClipboardList size={18} /> {t('timeline')}</h2>
          <div className="table-wrap">
            <table className="table report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('time')}</th>
                  <th />
                  <th>{t('evidence')}</th>
                  <th>{t('probability')}</th>
                  <th>{t('status')}</th>
                  <th>{t('noteText')}</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((it, n) => (
                  <tr key={it.id} className={`dec-${it.decision}`}>
                    <td className="muted xs">{n + 1}</td>
                    <td className="small nowrap">{it.start_ts ? fmtRange(it.start_ts, it.end_ts) : '—'}</td>
                    <td>{it.kind === 'track' && it.crop_url ? <CropImage src={it.crop_url} className="report-img" /> : null}</td>
                    <td>
                      <div className="row-wrap">
                        <span className="badge">{t(`kind_${it.kind}`)}</span>
                        {it.ref_code && <span className="mono small">{it.ref_code}</span>}
                        {it.kind === 'event' && it.data?.type && <KeyBadge color={EVENT_COLOR[it.data.type]}>{t(`ev_${it.data.type}`)}</KeyBadge>}
                      </div>
                      <div className="xs muted" style={{ marginTop: 4 }}>
                        {[it.camera, it.video, it.data?.evidence?.frame_idx != null ? `${t('frame')} ${it.data.evidence.frame_idx}` : ''].filter(Boolean).join(' · ')}
                      </div>
                      {it.source_query && <div className="xs muted" dir="auto">{t('fromQuery')}: “{it.source_query}”</div>}
                    </td>
                    <td className="small">{it.kind === 'track' ? pct(it.match_probability) : ''}</td>
                    <td className="small">{it.kind !== 'note' ? t(`decision_${it.decision}`) : ''}</td>
                    <td className="small" dir="auto" style={{ maxWidth: 260 }}>{it.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="disclaimer"><FileText size={14} /> {t('reportDisclaimer')} {t('allTimesCairo')}</p>
      </article>
    </div>
  );
}
