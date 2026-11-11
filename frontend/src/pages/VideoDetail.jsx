import {
  ArrowLeft, Boxes, Camera, Clock, Cpu, Film, Gauge, ImageIcon, Layers, Radar, ScanSearch, Siren, Sparkles, Waves,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import AddToCase from '../components/AddToCase.jsx';
import { Gantt, Legend } from '../components/charts.jsx';
import {
  Card, CropImage, CropViewer, EmptyState, ErrorBox, evidenceMeta, KeyBadge, Skeleton, SkeletonCards, StatCard, StatusBadge,
} from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import {
  CLASS_COLOR, EVENT_COLOR, durationSec, fmtClockTime, fmtDur, fmtRange, fmtTime, itemFromEvent, itemFromTrack,
} from '../utils.js';

const STAGES = [
  ['ingest', Film], ['motion', Waves], ['detect_track', ScanSearch], ['crops', ImageIcon], ['embed', Cpu], ['events', Siren],
];

export default function VideoDetail() {
  const { code } = useParams();
  const { t } = useT();
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [tracks, setTracks] = useState(null);
  const [events, setEvents] = useState(null);
  const [cls, setCls] = useState('');
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer;
    setVideo(null);
    setTracks(null);
    setEvents(null);
    setError(null);
    const load = async () => {
      try {
        const r = await api.get(`/videos/${code}`);
        if (!alive) return;
        setVideo(r.data);
        setError(null);
        if (r.data.status === 'uploaded' || r.data.status === 'processing') {
          timer = setTimeout(load, 3000);
        } else if (r.data.status === 'done') {
          const [tr, ev] = await Promise.all([
            api.get(`/videos/${code}/tracks`),
            api.get('/events', { params: { camera: r.data.camera, limit: 500 } }).catch(() => ({ data: [] })),
          ]);
          if (!alive) return;
          setTracks(tr.data);
          setEvents(ev.data.filter((e) => e.evidence?.video === code));
        }
      } catch (e) {
        if (!alive) return;
        setError(errMsg(e));
        if (e.response?.status !== 404) timer = setTimeout(load, 6000);
      }
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [code]);

  const counts = useMemo(() => {
    const c = {};
    for (const x of tracks || []) c[x.class] = (c[x.class] || 0) + 1;
    return c;
  }, [tracks]);
  const shown = (tracks || []).filter((x) => !cls || x.class === cls);
  const domain = useMemo(() => {
    if (!video) return [0, 1];
    const s = new Date(video.start_time).getTime();
    return [s, s + (video.duration_sec || 1) * 1000];
  }, [video]);

  if (!video) {
    return (
      <div className="page">
        <BackLink />
        {error ? <ErrorBox error={error} /> : <><Skeleton h={120} r={14} /><Skeleton h={300} r={14} /></>}
      </div>
    );
  }

  const stageIdx = STAGES.findIndex(([s]) => video.stages?.[s]?.status === 'running');
  return (
    <div className="page">
      <BackLink />
      <div className="page-header">
        <div className="ph-icon"><Film size={22} /></div>
        <div className="ph-text">
          <div className="row-wrap">
            <h1 className="mono">{code}</h1>
            <StatusBadge status={video.status} />
          </div>
          <p>{t('videoSub', { cam: video.camera, time: fmtTime(video.start_time) })}</p>
        </div>
      </div>

      <div className="grid g-4">
        <StatCard icon={Camera} tone="info" label={t('camera')} value={video.camera} />
        <StatCard icon={Clock} tone="primary" label={t('duration')} value={fmtDur(video.duration_sec)} hint={video.fps ? `${video.fps} FPS` : null} />
        <StatCard icon={Boxes} tone="good" label={t('tracksFound')} value={tracks ? tracks.length : video.status === 'done' ? null : '—'}
          hint={tracks && Object.entries(counts).map(([k, v]) => `${v} ${t(`cls_${k}`)}`).join(' · ')} />
        <StatCard icon={Siren} tone="warn" label={t('eventsDetected')} value={events ? events.length : video.status === 'done' ? null : '—'} />
      </div>

      <Card icon={Layers} title={t('stages')} subtitle={video.status === 'processing' || video.status === 'uploaded' ? t('liveUpdating') : null}>
        {video.error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span className="grow">{video.error}</span></div>}
        <div className="stepper">
          {STAGES.map(([s, Icon], i) => {
            const st = video.stages?.[s];
            const status = st?.status || (video.status === 'done' ? 'skipped' : 'pending');
            return (
              <div key={s} className={`step ${status}`}>
                <div className="step-icon"><Icon size={20} className={status === 'running' ? 'spin-slow' : ''} /></div>
                <div className="step-name">{t(`stage_${s}`)}</div>
                <div className="step-sub">
                  {status === 'running' ? `${Math.round((st.progress || 0) * 100)}%` : status === 'skipped' ? t('notRun') : t(`st_${status}`)}
                </div>
                {status === 'running' && (
                  <div className="progress" style={{ width: '70%', height: 4 }}>
                    <div className="progress-fill" style={{ width: `${(st.progress || 0) * 100}%` }} />
                  </div>
                )}
                {i === stageIdx && <span className="sr-only">running</span>}
              </div>
            );
          })}
        </div>
        <details style={{ marginTop: 16 }}>
          <summary className="small muted" style={{ cursor: 'pointer' }}>{t('stageDetails')}</summary>
          <div className="stage-details">
            {STAGES.filter(([s]) => video.stages?.[s]?.stats && Object.keys(video.stages[s].stats).length).map(([s, Icon]) => (
              <div key={s} className="stage-box">
                <h4><Icon size={14} /> {t(`stage_${s}`)}</h4>
                <div className="stage-stats">
                  {Object.entries(video.stages[s].stats).map(([k, v]) => (
                    <span key={k}>{k}: <b>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</b></span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </Card>

      {video.status === 'done' && (
        <Card icon={Radar} title={t('trackTimeline')} subtitle={t('trackTimelineSub')}>
          {!tracks ? <Skeleton h={200} /> : tracks.length === 0 ? <EmptyState text={t('none')} /> : (
            <div className="stack">
              <Legend items={Object.keys(counts).map((k) => ({ label: `${t(`cls_${k}`)} (${counts[k]})`, color: CLASS_COLOR[k] || 'var(--s1)' }))} />
              <Gantt
                domain={domain}
                fmtTick={(v) => fmtClockTime(new Date(v).toISOString())}
                rows={[...tracks].sort((a, b) => a.start_ts.localeCompare(b.start_ts)).map((x) => ({
                  key: x.code,
                  start: new Date(x.start_ts).getTime(),
                  end: new Date(x.end_ts).getTime(),
                  color: CLASS_COLOR[x.class] || 'var(--s1)',
                  label: x.code,
                  sub: t(`cls_${x.class}`),
                  valueText: `${fmtClockTime(x.start_ts)} · ${fmtDur(durationSec(x.start_ts, x.end_ts))}`,
                  track: x,
                }))}
                onPick={(r) => setViewer(r.track)}
              />
            </div>
          )}
        </Card>
      )}

      {events && events.length > 0 && (
        <Card icon={Siren} title={t('eventsInVideo')} subtitle={`${events.length}`}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>{t('type')}</th><th>{t('zoneName')}</th><th>{t('time')}</th><th>{t('tracks')}</th><th /></tr>
              </thead>
              <tbody>
                {events.slice(0, 50).map((e) => (
                  <tr key={e.event_code}>
                    <td><KeyBadge color={EVENT_COLOR[e.type]}>{t(`ev_${e.type}`)}</KeyBadge></td>
                    <td dir="auto">{e.name}</td>
                    <td className="small nowrap">{fmtRange(e.start_ts, e.end_ts)}</td>
                    <td className="mono xs">{e.tracks.join(', ')}</td>
                    <td><AddToCase item={itemFromEvent(e)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card icon={Boxes} title={t('tracksFound')} subtitle={tracks ? `${shown.length} / ${tracks.length}` : null}
        actions={tracks && Object.keys(counts).length > 1 && (
          <div className="chips">
            <button className={`chip ${!cls ? 'active' : ''}`} onClick={() => setCls('')}>{t('allClasses')} <span className="count">{tracks.length}</span></button>
            {Object.entries(counts).map(([k, v]) => (
              <button key={k} className={`chip ${cls === k ? 'active' : ''}`} onClick={() => setCls(k)}>
                <span className="dot" style={{ background: CLASS_COLOR[k] }} /> {t(`cls_${k}`)} <span className="count">{v}</span>
              </button>
            ))}
          </div>
        )}>
        {video.status !== 'done' ? (
          <EmptyState icon={video.status === 'failed' ? Gauge : Sparkles} title={video.status === 'failed' ? t('st_failed') : t('st_processing')}
            text={video.status === 'failed' ? video.error : t('waitingTracks')} />
        ) : !tracks ? (
          <SkeletonCards n={8} h={280} />
        ) : shown.length === 0 ? (
          <EmptyState text={t('none')} />
        ) : (
          <div className="cards-grid">
            {shown.map((tr) => (
              <div key={tr.code} className="hit">
                <div className="hit-media" style={{ height: 190 }} onClick={() => setViewer(tr)}>
                  <CropImage src={tr.crops[0]} className="main-img" />
                  <span className="hit-score">{fmtDur(durationSec(tr.start_ts, tr.end_ts))}</span>
                </div>
                <div className="hit-body">
                  <div className="hit-title">
                    <span className="mono small">{tr.code}</span>
                    <KeyBadge color={CLASS_COLOR[tr.class]}>{t(`cls_${tr.class}`)}</KeyBadge>
                  </div>
                  <div className="meta-line xs"><Clock size={13} /> {fmtRange(tr.start_ts, tr.end_ts)}</div>
                  <div className="meta-line xs"><Gauge size={13} /> {tr.n_obs} {t('obs')} · {t('conf')} {Math.round(tr.mean_conf * 100)}%</div>
                  <div className="hit-foot"><AddToCase item={itemFromTrack(tr, code, video.camera)} full /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {viewer && (
        <CropViewer crops={viewer.crops} code={viewer.code} onClose={() => setViewer(null)}
          meta={evidenceMeta(t, { ...viewer, camera: video.camera, video: code, class: t(`cls_${viewer.class}`) })} />
      )}
    </div>
  );
}

function BackLink() {
  const { t } = useT();
  return (
    <Link to="/videos" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>
      <ArrowLeft size={15} className="flip-rtl" /> {t('nav_videos')}
    </Link>
  );
}
