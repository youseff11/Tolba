import { BarChart3, Clock, Filter, Siren, Table2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, localInput } from '../api.js';
import AddToCase from '../components/AddToCase.jsx';
import { BarList, ColumnChart, Legend } from '../components/charts.jsx';
import { Card, EmptyState, ErrorBox, KeyBadge, PageHeader, Skeleton, useApi } from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { durationSec, EVENT_COLOR, EVENT_TYPES, fmtDur, fmtHourMin, fmtRange, fmtTime, itemFromEvent } from '../utils.js';

const EMPTY = { camera: '', site: '', type: '', name: '', start: '', end: '', limit: '200' };

function Details({ e }) {
  const { t } = useT();
  const d = e.details || {};
  const parts = [];
  if (d.cls) parts.push(t(`cls_${d.cls}`));
  if (d.dwell_sec != null) parts.push(`${t('dwell')} ${d.dwell_sec}s`);
  if (d.direction) parts.push(d.direction.replace('->', ' → '));
  if (d.peak_count != null) parts.push(`${t('peak')} ${d.peak_count}`);
  if (d.duration_sec != null && d.peak_count != null) parts.push(`${d.duration_sec}s`);
  if (d.already_inside) parts.push(t('alreadyInside'));
  if (d.track_ended_inside) parts.push(t('endedInside'));
  return <span dir="auto">{parts.join(' · ') || '—'}</span>;
}

function buckets(events, t) {
  if (!events.length) return [];
  const ts = events.map((e) => new Date(e.start_ts).getTime());
  const lo = Math.min(...ts);
  const hi = Math.max(...ts);
  const sizes = [60e3, 300e3, 900e3, 1800e3, 3600e3, 3 * 3600e3, 6 * 3600e3, 86400e3];
  const size = sizes.find((s) => (hi - lo) / s <= 24) || sizes.at(-1);
  const start = Math.floor(lo / size) * size;
  const n = Math.floor((hi - start) / size) + 1;
  const out = Array.from({ length: n }, (_, i) => ({ t: start + i * size, values: {} }));
  events.forEach((e, i) => {
    const b = out[Math.floor((ts[i] - start) / size)];
    b.values[e.type] = (b.values[e.type] || 0) + 1;
  });
  return out.map((b) => {
    const iso = new Date(b.t).toISOString();
    const total = Object.values(b.values).reduce((s, v) => s + v, 0);
    return { label: fmtHourMin(iso), title: `${fmtTime(iso)} · ${total} ${t('events')}`, values: b.values };
  });
}

export default function Events() {
  const { t } = useT();
  const cams = useApi(() => api.get('/cameras'), []);
  const [form, setForm] = useState(EMPTY);
  const [query, setQuery] = useState(EMPTY);
  const [typeView, setTypeView] = useState('');
  const events = useApi(() => api.get('/events', { params: { ...query, start: localInput(query.start), end: localInput(query.end) } }), [query]);
  const sites = [...new Set((cams.data || []).map((c) => c.site).filter(Boolean))];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const all = events.data || [];
  const rows = all.filter((e) => !typeView || e.type === typeView);
  const counts = useMemo(() => Object.fromEntries(EVENT_TYPES.map((k) => [k, all.filter((e) => e.type === k).length])), [all]);
  const byCamera = useMemo(() => {
    const c = {};
    for (const e of all) c[e.camera] = (c[e.camera] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [all]);
  const series = EVENT_TYPES.map((k) => ({ key: k, label: t(`ev_${k}`), color: EVENT_COLOR[k] }));

  return (
    <div className="page">
      <PageHeader icon={Siren} title={t('eventsTitle')} subtitle={t('eventsSub')} />

      <form className="card" onSubmit={(e) => (e.preventDefault(), setQuery({ ...form }))}>
        <div className="filters-grid">
          <label className="field">
            <span>{t('type')}</span>
            <select value={form.type} onChange={set('type')}>
              <option value="">{t('any')}</option>
              {EVENT_TYPES.map((x) => <option key={x} value={x}>{t(`ev_${x}`)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t('camera')}</span>
            <select value={form.camera} onChange={set('camera')}>
              <option value="">{t('any')}</option>
              {(cams.data || []).map((c) => <option key={c.code}>{c.code}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t('site')}</span>
            <select value={form.site} onChange={set('site')}>
              <option value="">{t('any')}</option>
              {sites.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t('zoneName')}</span>
            <input value={form.name} onChange={set('name')} dir="auto" />
          </label>
          <label className="field">
            <span>{t('start')}</span>
            <input type="datetime-local" step="1" value={form.start} onChange={set('start')} />
          </label>
          <label className="field">
            <span>{t('end')}</span>
            <input type="datetime-local" step="1" value={form.end} onChange={set('end')} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => (setForm(EMPTY), setQuery(EMPTY))}>{t('clear')}</button>
            <button className="btn btn-primary"><Filter size={15} /> {t('apply')}</button>
          </div>
        </div>
      </form>

      <ErrorBox error={events.error && errMsg(events.error)} onRetry={events.reload} />

      {events.loading && !events.data ? <Skeleton h={300} r={14} /> : all.length === 0 ? (
        <div className="card"><EmptyState icon={Siren} title={t('noEventsTitle')} text={t('noEvents')} action={<Link className="btn btn-primary" to="/zones">{t('setupZones')}</Link>} /></div>
      ) : (
        <>
          <div className="grid g-main" style={{ opacity: events.loading ? 0.6 : 1 }}>
            <Card icon={BarChart3} title={t('eventsOverTime')}>
              <div className="stack">
                <Legend items={series} />
                <ColumnChart buckets={buckets(all, t)} series={series} height={210} />
              </div>
            </Card>
            <Card icon={Clock} title={t('eventsByCamera')}>
              <BarList items={byCamera.map(([k, v]) => ({ key: k, label: k, value: v, color: 'var(--s1)' }))} />
            </Card>
          </div>

          <Card icon={Table2} title={t('eventLog')} subtitle={`${rows.length} / ${all.length}${all.length >= Number(query.limit) ? ` · ${t('capped')}` : ''}`}
            actions={
              <div className="chips">
                <button className={`chip ${!typeView ? 'active' : ''}`} onClick={() => setTypeView('')}>{t('any')} <span className="count">{all.length}</span></button>
                {EVENT_TYPES.filter((k) => counts[k]).map((k) => (
                  <button key={k} className={`chip ${typeView === k ? 'active' : ''}`} onClick={() => setTypeView(k)}>
                    <span className="dot" style={{ background: EVENT_COLOR[k] }} /> {t(`ev_${k}`)} <span className="count">{counts[k]}</span>
                  </button>
                ))}
              </div>
            }>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('code')}</th>
                    <th>{t('type')}</th>
                    <th>{t('zoneName')}</th>
                    <th>{t('camera')}</th>
                    <th>{t('time')}</th>
                    <th>{t('duration')}</th>
                    <th>{t('details')}</th>
                    <th>{t('evidence')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.event_code}>
                      <td className="mono xs">{e.event_code}</td>
                      <td><KeyBadge color={EVENT_COLOR[e.type]}>{t(`ev_${e.type}`)}</KeyBadge></td>
                      <td dir="auto">{e.name}</td>
                      <td><span className="badge">{e.camera}</span></td>
                      <td className="small nowrap">{fmtRange(e.start_ts, e.end_ts)}</td>
                      <td className="small">{fmtDur(durationSec(e.start_ts, e.end_ts))}</td>
                      <td className="small text-2">
                        <Details e={e} />
                        <div className="mono xs muted" title={e.tracks.join(', ')}>
                          {e.tracks.slice(0, 2).join(', ')}{e.tracks.length > 2 && ` +${e.tracks.length - 2}`}
                        </div>
                      </td>
                      <td className="small nowrap">
                        <Link className="mono" to={`/videos/${e.evidence.video}`}>{e.evidence.video}</Link>
                        <div className="xs muted">{t('frames')} {e.evidence.start_frame}–{e.evidence.end_frame}</div>
                      </td>
                      <td><AddToCase item={itemFromEvent(e)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
