import {
  Activity, BarChart3, Briefcase, CheckCircle2, Film, History, Plus, Search, ShieldCheck, Siren, Upload, Webcam,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { BarList, ColumnChart, Legend, SegBar } from '../components/charts.jsx';
import { Card, EmptyState, ErrorBox, KeyBadge, Skeleton, StatCard, StatusBadge, useApi } from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { EVENT_COLOR, EVENT_TYPES, fmtClockTime, fmtDayShort, fmtHourMin, fmtTime } from '../utils.js';

export default function Dashboard() {
  const { t, lang } = useT();
  const { user } = useAuth();
  const nav = useNavigate();
  const an = useApi(() => api.get('/analytics'), []);
  const dash = useApi(() => api.get('/dashboard'), []);
  const health = useApi(() => api.get('/health'), []);
  const a = an.data;
  const d = dash.data;
  const ai = health.data?.ai;

  const series = EVENT_TYPES.map((k) => ({ key: k, label: t(`ev_${k}`), color: EVENT_COLOR[k] }));
  const tl = a?.events_timeline;
  const buckets = (tl?.buckets || []).map((b) => ({
    label: tl.bucket_sec >= 86400 ? fmtDayShort(b.start) : fmtHourMin(b.start),
    title: `${fmtTime(b.start)} · ${b.total} ${t('events')}`,
    values: b.by_type,
  }));
  const dec = a?.decisions || {};
  const decTotal = (dec.confirmed || 0) + (dec.pending || 0) + (dec.rejected || 0);
  const hour = new Date().getHours();
  const greet = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');
  const today = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="page">
      <section className="hero">
        <div className="xs" style={{ opacity: 0.8, fontWeight: 600 }}>{today}</div>
        <h1 style={{ marginTop: 6 }}>
          {greet}{lang === 'ar' ? '،' : ','} {user.first_name || user.username}
        </h1>
        <p>{t('heroText')}</p>
        <div className="hero-actions">
          <button className="btn btn-white" onClick={() => nav('/search')}>
            <Search size={16} /> {t('newSearch')}
          </button>
          <button className="btn btn-glass" onClick={() => nav('/videos')}>
            <Upload size={16} /> {t('uploadVideo')}
          </button>
          <button className="btn btn-glass" onClick={() => nav('/cases')}>
            <Plus size={16} /> {t('newCase')}
          </button>
        </div>
      </section>

      <ErrorBox error={an.error && errMsg(an.error)} onRetry={an.reload} />
      {a?.ai_error && <ErrorBox error={`${t('aiService')}: ${a.ai_error}`} onRetry={an.reload} />}

      <div className="grid g-4">
        <StatCard
          icon={ShieldCheck}
          tone={ai ? (ai.reachable ? 'good' : 'bad') : 'primary'}
          label={t('aiService')}
          value={ai ? (ai.reachable ? t('online') : t('offline')) : null}
          hint={ai && (ai.mock ? t('mockMode') : ai.reachable ? (ai.version ? `v${ai.version}` : '') : t('aiDownHint'))}
        />
        <StatCard icon={Webcam} tone="info" to="/cameras" label={t('nav_cameras')} value={a?.cameras}
          hint={a && `${a.sites} ${t('sites')}`} />
        <StatCard icon={Siren} tone="warn" to="/events" label={t('eventsDetected')} value={a?.events_total}
          hint={a && `${a.events_by_type.loitering || 0} ${t('ev_loitering')} · ${a.events_by_type.crowding || 0} ${t('ev_crowding')}`} />
        <StatCard icon={Briefcase} tone="primary" to="/cases" label={t('openCases')} value={a ? a.cases_by_status.open || 0 : null}
          hint={a && `${dec.pending || 0} ${t('pendingReview')}`} />
      </div>

      <div className="grid g-main">
        <Card icon={BarChart3} title={t('eventsOverTime')} subtitle={tl?.bucket_sec ? t('perBucket', { n: bucketLabel(tl.bucket_sec, t) }) : ''}
          actions={<Link to="/events" className="btn btn-ghost btn-sm">{t('viewAll')}</Link>}>
          {an.loading && !a ? <Skeleton h={250} /> : (
            <div className="stack">
              <Legend items={series} />
              <ColumnChart buckets={buckets} series={series} height={230} emptyText={t('noEvents')} />
            </div>
          )}
        </Card>
        <Card icon={Activity} title={t('eventsByType')}>
          {!a ? <Skeleton h={200} /> : (
            <BarList
              emptyText={t('noEvents')}
              items={EVENT_TYPES.map((k) => ({ key: k, label: t(`ev_${k}`), value: a.events_by_type[k] || 0, color: EVENT_COLOR[k] }))}
            />
          )}
        </Card>
      </div>

      <div className="grid g-3">
        <Card icon={Webcam} title={t('eventsByCamera')}>
          {!a ? <Skeleton h={160} /> : (
            <BarList emptyText={t('noEvents')}
              items={Object.entries(a.events_by_camera).map(([k, v]) => ({ key: k, label: k, value: v, color: 'var(--s1)' }))} />
          )}
        </Card>
        <Card icon={Search} title={t('searches7d')} subtitle={a && `${a.searches_total} ${t('total')}`}>
          {!a ? <Skeleton h={160} /> : (
            <ColumnChart height={170}
              buckets={a.searches_7d.map((x) => ({ label: fmtDayShort(x.day + 'T12:00:00Z'), values: { n: x.count } }))}
              series={[{ key: 'n', label: t('searches'), color: 'var(--s1)' }]} />
          )}
        </Card>
        <Card icon={CheckCircle2} title={t('reviewProgress')} subtitle={t('reviewProgressSub')}>
          {!a ? <Skeleton h={160} /> : decTotal === 0 ? (
            <EmptyState icon={Briefcase} text={t('noEvidenceYet')} />
          ) : (
            <div className="stack">
              <div className="stat-value">{Math.round((((dec.confirmed || 0) + (dec.rejected || 0)) / decTotal) * 100)}%</div>
              <SegBar parts={[
                { label: t('decision_confirmed'), value: dec.confirmed || 0, color: 'var(--good)' },
                { label: t('decision_pending'), value: dec.pending || 0, color: 'var(--warn)' },
                { label: t('decision_rejected'), value: dec.rejected || 0, color: 'var(--bad)' },
              ]} />
              <Legend items={[
                { label: `${t('decision_confirmed')} ${dec.confirmed || 0}`, color: 'var(--good)' },
                { label: `${t('decision_pending')} ${dec.pending || 0}`, color: 'var(--warn)' },
                { label: `${t('decision_rejected')} ${dec.rejected || 0}`, color: 'var(--bad)' },
              ]} />
            </div>
          )}
        </Card>
      </div>

      <div className="grid g-3">
        <Card icon={Film} title={t('recentVideos')} actions={<Link to="/videos" className="btn btn-ghost btn-sm">{t('viewAll')}</Link>}>
          {!d ? <Skeleton h={180} /> : d.recent_videos.length === 0 ? (
            <EmptyState icon={Film} text={t('noVideos')} action={<Link className="btn btn-soft btn-sm" to="/videos"><Upload size={14} /> {t('uploadVideo')}</Link>} />
          ) : (
            <div className="stack" style={{ gap: 4 }}>
              {d.recent_videos.map((v) => (
                <Link key={v.id} to={`/videos/${v.code}`} className="cmdk-item" style={{ padding: '8px 6px' }}>
                  <Film size={16} />
                  <div style={{ minWidth: 0 }}>
                    <div className="mono">{v.code} <span className="muted">· {v.camera_code}</span></div>
                    <div className="xs muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.original_name}</div>
                  </div>
                  <span className="hint"><StatusBadge status={v.status} /></span>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card icon={History} title={t('recentSearches')}>
          {!d ? <Skeleton h={180} /> : d.recent_searches.length === 0 ? (
            <EmptyState icon={Search} text={t('noSearches')} />
          ) : (
            <div className="stack" style={{ gap: 4 }}>
              {d.recent_searches.slice(0, 6).map((s) => (
                <Link key={s.id} to={`/search?q=${encodeURIComponent(s.query)}`} className="cmdk-item" style={{ padding: '8px 6px' }}>
                  <Search size={16} />
                  <span dir="auto" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.query}</span>
                  <span className="hint">{s.hits} {t('hits')}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card icon={Siren} title={t('latestEvents')} actions={<Link to="/events" className="btn btn-ghost btn-sm">{t('viewAll')}</Link>}>
          {!a ? <Skeleton h={180} /> : a.recent_events.length === 0 ? (
            <EmptyState icon={Siren} text={t('noEvents')} />
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {a.recent_events.map((e) => (
                <div key={e.event_code} className="row-between">
                  <div className="row" style={{ minWidth: 0 }}>
                    <KeyBadge color={EVENT_COLOR[e.type]}>{t(`ev_${e.type}`)}</KeyBadge>
                    <span className="small text-2" dir="auto">{e.name}</span>
                  </div>
                  <span className="xs muted nowrap">{e.camera} · {fmtClockTime(e.start_ts)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function bucketLabel(sec, t) {
  if (sec < 3600) return `${sec / 60} ${t('minutes')}`;
  if (sec < 86400) return `${sec / 3600} ${t('hours')}`;
  return t('day');
}
