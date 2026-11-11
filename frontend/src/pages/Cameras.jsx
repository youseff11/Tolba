import { Camera, Film, MapPin, Pencil, Plus, Video, Webcam } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { EmptyState, ErrorBox, Modal, PageHeader, SkeletonCards, useApi } from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { useToast } from '../toast.jsx';

const EMPTY = { code: '', name: '', site: '', location: '' };

export default function Cameras() {
  const { t } = useT();
  const cams = useApi(() => api.get('/cameras'), []);
  const videos = useApi(() => api.get('/videos'), []);
  const [edit, setEdit] = useState(null);

  const groups = useMemo(() => {
    const g = {};
    for (const c of cams.data || []) (g[c.site || ''] ||= []).push(c);
    return Object.entries(g).sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  }, [cams.data]);
  const vidCount = (code) => (videos.data || []).filter((v) => v.camera_code === code).length;
  const nextCode = () => {
    const nums = (cams.data || []).map((c) => Number(c.code.split('-')[1]) || 0);
    return `CAM-${String(Math.max(0, ...nums) + 1).padStart(2, '0')}`;
  };

  return (
    <div className="page">
      <PageHeader icon={Webcam} title={t('nav_cameras')} subtitle={t('camerasSub')}
        actions={<button className="btn btn-primary" onClick={() => setEdit({ ...EMPTY, code: nextCode(), isNew: true })}><Plus size={16} /> {t('addCamera')}</button>} />

      <ErrorBox error={cams.error && errMsg(cams.error)} onRetry={cams.reload} />
      {cams.loading && !cams.data ? <SkeletonCards n={4} h={240} /> : (cams.data || []).length === 0 ? (
        <div className="card"><EmptyState icon={Camera} title={t('noCameras')} text={t('noCamerasText')} /></div>
      ) : (
        groups.map(([site, list]) => (
          <section key={site || '_'} className="stack">
            <div className="row">
              <MapPin size={16} className="muted" />
              <h2 dir="auto">{site || t('noSite')}</h2>
              <span className="badge">{list.length}</span>
            </div>
            <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {list.map((c) => (
                <div key={c.code} className="cam-card">
                  <div className="cam-preview">
                    <span className="rec"><i /> REC</span>
                    <Video size={34} />
                    <span className="code">{c.code}</span>
                  </div>
                  <div className="row-between">
                    <div style={{ minWidth: 0 }}>
                      <h3 dir="auto">{c.name}</h3>
                      <div className="xs muted row" dir="auto"><MapPin size={12} /> {c.location || '—'}</div>
                    </div>
                    <button className="icon-btn sm" onClick={() => setEdit({ code: c.code, name: c.name || '', site: c.site || '', location: c.location || '' })} title={t('edit')}>
                      <Pencil size={15} />
                    </button>
                  </div>
                  <div className="row-between xs">
                    <span className="row muted"><Film size={13} /> {vidCount(c.code)} {t('videosHere')}</span>
                    <Link to={`/search?camera=${c.code}&q=person`} className="link">{t('searchThisCamera')}</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
      {edit && <CameraModal initial={edit} onClose={() => setEdit(null)} onSaved={() => (setEdit(null), cams.reload())} sites={groups.map(([s]) => s).filter(Boolean)} />}
    </div>
  );
}

function CameraModal({ initial, onClose, onSaved, sites }) {
  const { t } = useT();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/cameras', { code: form.code.trim().toUpperCase(), name: form.name, site: form.site, location: form.location });
      toast.success(t('saved'));
      onSaved();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={<span className="row"><Camera size={18} /> {initial.isNew ? t('addCamera') : t('editCamera')}</span>} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>{t('code')}</span>
          <input value={form.code} onChange={set('code')} required pattern="[Cc][Aa][Mm]-\d{2,}" disabled={!initial.isNew} className="mono" />
          <small>{t('cameraCodeHint')}</small>
        </label>
        <label className="field">
          <span>{t('name')}</span>
          <input value={form.name} onChange={set('name')} dir="auto" placeholder={t('cameraNamePh')} />
        </label>
        <label className="field">
          <span>{t('site')}</span>
          <input value={form.site} onChange={set('site')} dir="auto" list="sites" placeholder="Main Street" />
          <datalist id="sites">{sites.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        <label className="field">
          <span>{t('location')}</span>
          <input value={form.location} onChange={set('location')} dir="auto" />
        </label>
        <ErrorBox error={error} />
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-primary" disabled={busy}>{t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}
