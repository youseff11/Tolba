import { Briefcase, Clock, FolderPlus, Layers, Plus, Search, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { EmptyState, ErrorBox, Modal, PageHeader, Segmented, SkeletonCards, useApi } from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { useToast } from '../toast.jsx';
import { fmtTime } from '../utils.js';

export default function Cases() {
  const { t } = useT();
  const [status, setStatus] = useState('open');
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const cases = useApi(() => api.get('/cases'), []);
  const all = cases.data || [];
  const list = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return all.filter((c) => (!status || c.status === status) && (!f || `${c.title} ${c.description} #${c.id}`.toLowerCase().includes(f)));
  }, [all, status, filter]);

  return (
    <div className="page">
      <PageHeader icon={Briefcase} title={t('nav_cases')} subtitle={t('casesSub')}
        actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><FolderPlus size={16} /> {t('newCase')}</button>} />

      <div className="row-between">
        <Segmented value={status} onChange={setStatus} options={[
          { value: 'open', label: t('case_open'), count: all.filter((c) => c.status === 'open').length },
          { value: 'closed', label: t('case_closed'), count: all.filter((c) => c.status === 'closed').length },
          { value: '', label: t('any'), count: all.length },
        ]} />
        <div className="input-icon" style={{ width: 260 }}>
          <Search size={16} />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('filterCases')} dir="auto" />
        </div>
      </div>

      <ErrorBox error={cases.error && errMsg(cases.error)} onRetry={cases.reload} />
      {cases.loading && !cases.data ? <SkeletonCards n={6} h={190} /> : list.length === 0 ? (
        <div className="card">
          <EmptyState icon={Briefcase} title={t('noCasesTitle')} text={t('noCases')}
            action={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> {t('newCase')}</button>} />
        </div>
      ) : (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {list.map((c) => {
            const evidence = c.items_count;
            const reviewed = Math.max(0, evidence - c.pending_count);
            return (
              <Link key={c.id} to={`/cases/${c.id}`} className="case-card">
                <div className="row-between">
                  <span className="case-num">#{String(c.id).padStart(3, '0')}</span>
                  <span className={`badge ${c.status === 'open' ? 'badge-good' : ''}`}>{t(`case_${c.status}`)}</span>
                </div>
                <div>
                  <h3 dir="auto">{c.title}</h3>
                  {c.description && <p dir="auto" style={{ marginTop: 4 }}>{c.description}</p>}
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  <div className="row-between xs muted">
                    <span className="row"><Layers size={13} /> {c.items_count} {t('items')}</span>
                    {c.pending_count > 0 ? <span className="badge badge-warn">{c.pending_count} {t('pendingReview')}</span> : evidence > 0 && <span className="badge badge-good">{t('allReviewed')}</span>}
                  </div>
                  <div className="progress"><div className="progress-fill good" style={{ width: `${evidence ? (reviewed / evidence) * 100 : 0}%` }} /></div>
                </div>
                <div className="cc-foot">
                  <span className="row"><User size={13} /> {c.created_by || '—'}</span>
                  <span className="row"><Clock size={13} /> {fmtTime(c.updated_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {creating && <NewCaseModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewCaseModal({ onClose }) {
  const { t } = useT();
  const toast = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('/cases', form);
      toast.success(t('caseCreated'));
      nav(`/cases/${r.data.id}`);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }
  return (
    <Modal title={<span className="row"><FolderPlus size={18} /> {t('newCase')}</span>} onClose={onClose}>
      <form className="form" onSubmit={create}>
        <label className="field">
          <span>{t('caseTitle')}</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required dir="auto" autoFocus placeholder={t('caseTitlePh')} />
        </label>
        <label className="field">
          <span>{t('description')}</span>
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} dir="auto" placeholder={t('caseDescPh')} />
        </label>
        <ErrorBox error={error} />
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-primary" disabled={busy}><Plus size={16} /> {t('createCase')}</button>
        </div>
      </form>
    </Modal>
  );
}
