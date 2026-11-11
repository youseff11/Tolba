import { BriefcaseBusiness, Check, FolderPlus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useT } from '../i18n.jsx';
import { useToast } from '../toast.jsx';
import { ErrorBox, Modal, Spinner } from './ui.jsx';

/** Button + dialog that adds one piece of evidence (built with utils.itemFrom*) to a case. */
export default function AddToCase({ item, small = true, full }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(null);
  const cls = `btn ${small ? 'btn-sm' : ''} ${full ? 'btn-block' : ''}`;
  return (
    <>
      {done ? (
        <Link className={`${cls} btn-good`} to={`/cases/${done}`}>
          <Check size={14} /> {t('viewCase')}
        </Link>
      ) : (
        <button className={`${cls} btn-soft`} onClick={() => setOpen(true)}>
          <Plus size={14} /> {t('addToCase')}
        </button>
      )}
      {open && (
        <AddDialog
          item={item}
          onClose={() => setOpen(false)}
          onDone={(id) => {
            setDone(id);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function AddDialog({ item, onClose, onDone }) {
  const { t } = useT();
  const toast = useToast();
  const [cases, setCases] = useState(null);
  const [mode, setMode] = useState('existing');
  const [caseId, setCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/cases', { params: { status: 'open' } })
      .then((r) => {
        setCases(r.data);
        if (r.data.length) setCaseId(String(r.data[0].id));
        else setMode('new');
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let id = caseId;
      if (mode === 'new') id = (await api.post('/cases', { title: title.trim() })).data.id;
      await api.post(`/cases/${id}/items`, { ...item, note });
      toast.success(`${item.ref_code} → ${t('added')}`);
      onDone(id);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={<span className="row"><BriefcaseBusiness size={18} /> {t('addToCase')} <span className="mono muted">{item.ref_code}</span></span>} onClose={onClose}>
      {!cases && !error ? (
        <Spinner />
      ) : (
        <form onSubmit={submit} className="form">
          {cases?.length > 0 && (
            <div className="segmented" style={{ alignSelf: 'flex-start' }}>
              <button type="button" className={mode === 'existing' ? 'active' : ''} onClick={() => setMode('existing')}>
                <BriefcaseBusiness size={14} /> {t('existingCase')}
              </button>
              <button type="button" className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>
                <FolderPlus size={14} /> {t('newCase')}
              </button>
            </div>
          )}
          {mode === 'existing' ? (
            <label className="field">
              <span>{t('chooseCase')}</span>
              <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                {cases?.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} · {c.title} ({c.items_count})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>{t('caseTitle')}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" required autoFocus placeholder={t('caseTitlePh')} />
            </label>
          )}
          <label className="field">
            <span>{t('investigatorNote')}</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} dir="auto" placeholder={t('notePh')} />
          </label>
          <ErrorBox error={error} />
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" disabled={busy || (mode === 'existing' ? !caseId : !title.trim())}>
              <Plus size={16} /> {t('add')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
