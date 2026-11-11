import { CloudUpload, FileVideo, Film, RefreshCw, Search, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg, localInput } from '../api.js';
import { Card, EmptyState, ErrorBox, PageHeader, Segmented, Skeleton, StatusBadge, useApi } from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { useToast } from '../toast.jsx';
import { fmtBytes, fmtDur, fmtTime } from '../utils.js';

const showStart = (s) => (!s ? '—' : /[zZ]|[+-]\d\d:\d\d$/.test(s) ? fmtTime(s) : s.replace('T', ' '));

export default function Videos() {
  const { t } = useT();
  const toast = useToast();
  const nav = useNavigate();
  const videos = useApi(() => api.get('/videos'), []);
  const cams = useApi(() => api.get('/cameras'), []);
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('');
  const [syncing, setSyncing] = useState(false);

  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (videos.data || []).filter(
      (v) => (!status || v.status === status) && (!f || `${v.code} ${v.camera_code} ${v.original_name}`.toLowerCase().includes(f))
    );
  }, [videos.data, status, filter]);
  const count = (s) => (videos.data || []).filter((v) => !s || v.status === s).length;

  async function sync() {
    setSyncing(true);
    try {
      const r = await api.post('/videos/sync');
      toast.success(t('syncDone', { found: r.data.found, added: r.data.added }));
      videos.reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="page">
      <PageHeader icon={Film} title={t('nav_videos')} subtitle={t('videosSub')}
        actions={
          <button className="btn" onClick={sync} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'spin' : ''} /> {t('syncFromAi')}
          </button>
        } />

      <div className="grid g-main">
        <Card>
          <div className="row-between" style={{ marginBottom: 16 }}>
            <Segmented value={status} onChange={setStatus} options={[
              { value: '', label: t('any'), count: count('') },
              { value: 'done', label: t('st_done'), count: count('done') },
              { value: 'processing', label: t('st_processing'), count: count('processing') + count('uploaded') },
              { value: 'failed', label: t('st_failed'), count: count('failed') },
            ]} />
            <div className="input-icon" style={{ width: 240 }}>
              <Search size={16} />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('filterVideos')}
                onKeyDown={(e) => e.key === 'Enter' && /^vid-\d+$/i.test(filter.trim()) && nav(`/videos/${filter.trim().toUpperCase()}`)} />
            </div>
          </div>
          {videos.loading && !videos.data ? (
            <div className="stack">{[1, 2, 3, 4].map((i) => <Skeleton key={i} h={44} />)}</div>
          ) : videos.error ? (
            <ErrorBox error={errMsg(videos.error)} onRetry={videos.reload} />
          ) : list.length === 0 ? (
            <EmptyState icon={Film} title={t('noVideosTitle')} text={t('noVideos')}
              action={<button className="btn btn-soft" onClick={sync} disabled={syncing}><RefreshCw size={15} /> {t('syncFromAi')}</button>} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('video')}</th>
                    <th>{t('camera')}</th>
                    <th>{t('firstFrame')}</th>
                    <th>{t('duration')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((v) => (
                    <tr key={v.id} className="clickable" onClick={() => nav(`/videos/${v.code}`)}>
                      <td>
                        <div className="row">
                          <div className="stat-icon" style={{ width: 34, height: 34, borderRadius: 10 }}>
                            <FileVideo size={16} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <Link className="mono" to={`/videos/${v.code}`} onClick={(e) => e.stopPropagation()}>{v.code}</Link>
                            <div className="xs muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {v.original_name || t('fromAiServer')} {v.size_bytes ? `· ${fmtBytes(v.size_bytes)}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge">{v.camera_code}</span></td>
                      <td className="small nowrap">{showStart(v.start_time)}</td>
                      <td className="small">{fmtDur(v.duration_sec)}</td>
                      <td><StatusBadge status={v.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <UploadCard cams={cams.data || []} />
      </div>
    </div>
  );
}

function UploadCard({ cams }) {
  const { t } = useT();
  const toast = useToast();
  const nav = useNavigate();
  const inputRef = useRef(null);
  const [camera, setCamera] = useState('CAM-01');
  const [start, setStart] = useState('');
  const [file, setFile] = useState(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  async function upload(e) {
    e.preventDefault();
    setError(null);
    setProgress(0);
    const fd = new FormData();
    fd.append('camera_code', camera.trim().toUpperCase());
    fd.append('start_time', localInput(start));
    fd.append('file', file);
    try {
      const r = await api.post('/videos', fd, { onUploadProgress: (ev) => ev.total && setProgress(ev.loaded / ev.total) });
      toast.success(`${r.data.video_code} · ${t('uploadedProcessing')}`);
      nav(`/videos/${r.data.video_code}`);
    } catch (err) {
      setError(errMsg(err));
      setProgress(null);
    }
  }

  const big = file && file.size > 100 * 1024 * 1024;

  return (
    <Card icon={CloudUpload} title={t('uploadVideo')} subtitle={t('uploadSub')}>
      <form className="form" onSubmit={upload}>
        {!file ? (
          <div
            className={`dropzone ${over ? 'over' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => (e.preventDefault(), setOver(true))}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="dz-icon"><Upload size={24} /></div>
            <b>{t('dropHere')}</b>
            <span className="xs muted">MP4 · AVI · MKV · MOV</span>
          </div>
        ) : (
          <div className="file-pill">
            <div className="fi"><FileVideo size={18} /></div>
            <div className="grow" style={{ minWidth: 0 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{file.name}</div>
              <div className="xs muted">{fmtBytes(file.size)}</div>
            </div>
            {progress == null && (
              <button type="button" className="icon-btn sm" onClick={() => setFile(null)}><X size={15} /></button>
            )}
          </div>
        )}
        <input ref={inputRef} type="file" accept="video/*,.mkv,.avi" hidden onChange={(e) => e.target.files[0] && setFile(e.target.files[0])} />
        {big && <div className="alert alert-warn"><span className="grow">{t('bigFileWarn')}</span></div>}
        <label className="field">
          <span>{t('camera')}</span>
          <input list="cam-list" value={camera} onChange={(e) => setCamera(e.target.value)} required pattern="[Cc][Aa][Mm]-\d{2,}" />
          <datalist id="cam-list">
            {cams.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </datalist>
        </label>
        <label className="field">
          <span>{t('startTime')}</span>
          <input type="datetime-local" step="1" value={start} onChange={(e) => setStart(e.target.value)} required />
          <small>{t('startHint')}</small>
        </label>
        {progress != null && (
          <div className="stack" style={{ gap: 6 }}>
            <div className="row-between small">
              <span>{progress < 1 ? t('uploading') : t('sendingToAi')}</span>
              <b>{Math.round(progress * 100)}%</b>
            </div>
            <div className="progress progress-lg"><div className="progress-fill" style={{ width: `${progress * 100}%` }} /></div>
          </div>
        )}
        <ErrorBox error={error} />
        <button className="btn btn-primary btn-block btn-lg" disabled={progress != null || !file}>
          <CloudUpload size={18} /> {t('uploadBtn')}
        </button>
        <small className="muted xs">{t('oneAtATime')}</small>
      </form>
    </Card>
  );
}
