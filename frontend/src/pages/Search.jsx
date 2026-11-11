import {
  ArrowDownWideNarrow, Camera, Clock, Film, Hash, Info, LayoutGrid, List, Languages, SearchX, Search as SearchIcon,
  SlidersHorizontal, Sparkles, TriangleAlert, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg, localInput } from '../api.js';
import AddToCase from '../components/AddToCase.jsx';
import {
  AuthImage, CropImage, CropViewer, EmptyState, ErrorBox, evidenceMeta, KeyBadge, ProbBar, Segmented, SkeletonCards, useApi,
} from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { CLASSES, CLASS_COLOR, fmtRange, itemFromHit, pct, probBand } from '../utils.js';

const EXAMPLES = ['شخص لابس قميص أحمر', 'راجل لابس جاكيت كحلي', 'عربية فضي', 'person wearing a blue shirt', 'silver car'];
const FILTER_KEYS = ['camera', 'site', 'cls', 'start', 'end', 'limit', 'min_prob'];
const BAND_COLOR = { good: 'var(--good)', mid: 'var(--warn)', weak: 'var(--bad)', none: 'var(--muted)' };

function readView() {
  try {
    return localStorage.getItem('vs_search_view') || 'grid';
  } catch {
    return 'grid';
  }
}

export default function SearchPage() {
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const cams = useApi(() => api.get('/cameras'), []);
  const history = useApi(() => api.get('/search/history'), []);
  const [q, setQ] = useState(params.get('q') || '');
  const [f, setF] = useState(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])));
  const [showFilters, setShowFilters] = useState(FILTER_KEYS.some((k) => params.get(k)));
  const [res, setRes] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setViewState] = useState(readView);
  const [sort, setSort] = useState('match');
  const [viewer, setViewer] = useState(null);
  const sites = [...new Set((cams.data || []).map((c) => c.site).filter(Boolean))];
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k));

  const setView = (v) => {
    setViewState(v);
    try {
      localStorage.setItem('vs_search_view', v);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    setQ(params.get('q') || '');
    const query = params.get('q');
    if (!query) {
      setRes(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    const p = { q: query };
    for (const k of FILTER_KEYS) if (params.get(k)) p[k] = params.get(k);
    if (p.start) p.start = localInput(p.start);
    if (p.end) p.end = localInput(p.end);
    api
      .get('/search', { params: p })
      .then((r) => alive && setRes(r.data))
      .catch((e) => alive && (setError(errMsg(e)), setRes(null)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [params]);

  function run(e, overrides = {}) {
    e?.preventDefault?.();
    const text = (overrides.q ?? q).trim();
    if (!text) return;
    const next = { q: text };
    const all = { ...f, ...overrides };
    for (const k of FILTER_KEYS) if (all[k] !== '' && all[k] != null) next[k] = all[k];
    setParams(next);
  }

  const clearFilter = (k) => {
    const nf = { ...f, [k]: '' };
    setF(nf);
    run(null, nf);
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const hits = useMemo(() => {
    if (!res) return [];
    const xs = res.hits.map((h, i) => ({ ...h, rank: i + 1 }));
    if (sort === 'time') xs.sort((a, b) => a.start_ts.localeCompare(b.start_ts));
    return xs;
  }, [res, sort]);
  const noGoodMatch = res && res.hits.length === 0 && res.weak_left_out > 0;
  const recent = [...new Set((history.data || []).map((h) => h.query))].slice(0, 6);
  const filterLabel = { camera: t('camera'), site: t('site'), cls: t('class'), start: t('start'), end: t('end'), limit: t('limit'), min_prob: t('minProbShort') };

  return (
    <div className="page">
      <div className="search-hero">
        <div className="search-hero-inner">
          <div className="row-between">
            <div className="row">
              <Sparkles size={18} style={{ color: 'var(--primary)' }} />
              <h2>{t('searchTitle')}</h2>
            </div>
            <span className="xs muted row">
              <Languages size={14} /> {t('searchLangs')}
            </span>
          </div>
          <form className="search-bar" onSubmit={run}>
            <div className="input-icon">
              <SearchIcon size={20} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} dir="auto" autoFocus />
            </div>
            <button className="btn btn-primary btn-lg" disabled={!q.trim() || loading}>
              <SearchIcon size={18} /> {t('searchBtn')}
            </button>
            <button type="button" className={`btn btn-lg ${showFilters ? 'btn-soft' : ''}`} onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={18} /> {t('filters')}
              {activeFilters.length > 0 && <span className="badge badge-primary">{activeFilters.length}</span>}
            </button>
          </form>
          <div className="chips">
            <span className="xs muted">{t('examples')}:</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="chip" dir="auto" onClick={() => run(null, { q: ex })}>
                {ex}
              </button>
            ))}
          </div>
          {showFilters && (
            <>
              <hr className="divider" style={{ margin: 0 }} />
              <div className="filters-grid">
                <label className="field">
                  <span>{t('camera')}</span>
                  <select value={f.camera} onChange={set('camera')}>
                    <option value="">{t('any')}</option>
                    {(cams.data || []).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                        {c.name !== c.code ? ` · ${c.name}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t('site')}</span>
                  <select value={f.site} onChange={set('site')}>
                    <option value="">{t('any')}</option>
                    {sites.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t('class')}</span>
                  <select value={f.cls} onChange={set('cls')}>
                    <option value="">{t('autoDetect')}</option>
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {t(`cls_${c}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t('start')}</span>
                  <input type="datetime-local" step="1" value={f.start} onChange={set('start')} />
                </label>
                <label className="field">
                  <span>{t('end')}</span>
                  <input type="datetime-local" step="1" value={f.end} onChange={set('end')} />
                </label>
                <label className="field">
                  <span>{t('limit')}</span>
                  <input type="number" min="1" max="50" value={f.limit} onChange={set('limit')} placeholder="10" />
                </label>
                <label className="field">
                  <span>{t('minProb')}</span>
                  <input type="number" min="0" max="1" step="0.05" value={f.min_prob} onChange={set('min_prob')} placeholder="0.05" />
                </label>
                <div className="form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setF(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])))}>
                    {t('clear')}
                  </button>
                  <button type="button" className="btn btn-soft" onClick={run} disabled={!q.trim()}>
                    {t('apply')}
                  </button>
                </div>
              </div>
              <span className="xs muted row">
                <Clock size={13} /> {t('allTimesCairo')}
              </span>
            </>
          )}
        </div>
      </div>

      {!params.get('q') && (
        <div className="grid g-3">
          <TipCard icon={Sparkles} title={t('tip1Title')} text={t('tip1Text')} />
          <TipCard icon={Film} title={t('tip2Title')} text={t('tip2Text')} />
          <TipCard icon={Info} title={t('tip3Title')} text={t('tip3Text')} />
          {recent.length > 0 && (
            <div className="card span-all">
              <div className="card-header">
                <h2>{t('history')}</h2>
              </div>
              <div className="chips">
                {recent.map((r) => (
                  <button key={r} className="chip" dir="auto" onClick={() => run(null, { q: r })}>
                    <SearchIcon size={13} /> {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ErrorBox error={error} />
      {loading && <SkeletonCards n={8} h={330} />}

      {res && !loading && (
        <>
          <div className="result-bar">
            <span className="query-pill">
              <Languages size={14} className="muted" />
              {t('searchedAs')}: <b className="mono">{res.query_en}</b>
            </span>
            <span className="small text-2">
              <b>{res.hits.length}</b> {t('results')} · {res.candidates} {t('candidates')}
              {res.weak_left_out > 0 && ` · ${res.weak_left_out} ${t('weakLeftOut')}`}
            </span>
            {Object.entries(res.filters || {})
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <span key={k} className="badge badge-primary">
                  {filterLabel[k === 'class' ? 'cls' : k] || k}: {k === 'class' ? t(`cls_${v}`) : v}
                </span>
              ))}
            {activeFilters
              .filter((k) => !['camera', 'site', 'cls'].includes(k))
              .map((k) => (
                <button key={k} className="chip active" onClick={() => clearFilter(k)}>
                  {filterLabel[k]}: {params.get(k).replace('T', ' ')} <X size={12} />
                </button>
              ))}
            <span className="grow" />
            {res.hits.length > 1 && (
              <>
                <Segmented value={sort} onChange={setSort} options={[
                  { value: 'match', label: t('sortMatch'), icon: ArrowDownWideNarrow },
                  { value: 'time', label: t('sortTime'), icon: Clock },
                ]} />
                <Segmented value={view} onChange={setView} options={[
                  { value: 'grid', label: '', icon: LayoutGrid },
                  { value: 'list', label: '', icon: List },
                ]} />
              </>
            )}
          </div>

          {res.untranslated?.length > 0 && (
            <div className="alert alert-warn">
              <TriangleAlert size={18} />
              <div className="grow">
                {t('untranslated')}: <b dir="auto">{res.untranslated.join('، ')}</b> — {t('untranslatedHint')}
              </div>
            </div>
          )}

          {noGoodMatch ? (
            <div className="card">
              <EmptyState icon={SearchX} title={t('noGoodMatch')} text={t('noGoodMatchText')}
                action={<button className="btn btn-soft" onClick={() => run(null, { min_prob: '0' })}>{t('showClosest')}</button>} />
            </div>
          ) : res.hits.length === 0 ? (
            <div className="card">
              <EmptyState icon={SearchX} title={t('noResultsTitle')} text={t('noResults')} />
            </div>
          ) : view === 'grid' ? (
            <div className="cards-grid">
              {hits.map((h) => (
                <HitCard key={h.track_code} h={h} query={res.query} onOpen={(i) => setViewer({ h, i })} />
              ))}
            </div>
          ) : (
            <div className="hit-list">
              {hits.map((h) => (
                <div key={h.track_code} className="hit-row">
                  <CropImage src={h.crops[0]} className="row-img" onClick={() => setViewer({ h, i: 0 })} />
                  <div className="stack" style={{ gap: 6, minWidth: 0 }}>
                    <div className="row-wrap">
                      <span className="badge">#{h.rank}</span>
                      <span className="mono">{h.track_code}</span>
                      <KeyBadge color={CLASS_COLOR[h.class]}>{t(`cls_${h.class}`)}</KeyBadge>
                      <ProbBar p={h.match_probability} />
                    </div>
                    <div className="meta-line"><Camera size={14} /> <b>{h.camera}</b> · {fmtRange(h.start_ts, h.end_ts)}</div>
                    <div className="meta-line xs">
                      <Film size={13} /> <Link to={`/videos/${h.evidence.video}`} className="mono">{h.evidence.video}</Link>
                      · {t('frame')} {h.evidence.frame_idx} · {t('score')} {h.score.toFixed(3)}
                    </div>
                  </div>
                  <AddToCase item={itemFromHit(h, res.query)} />
                </div>
              ))}
            </div>
          )}
          <p className="disclaimer">
            <Info size={14} /> {t('disclaimer')}
          </p>
        </>
      )}

      {viewer && (
        <CropViewer crops={viewer.h.crops} code={viewer.h.track_code} start={viewer.i} onClose={() => setViewer(null)}
          meta={[[t('probability'), pct(viewer.h.match_probability)], ...evidenceMeta(t, { ...viewer.h, class: t(`cls_${viewer.h.class}`) })]} />
      )}
    </div>
  );
}

function TipCard({ icon: Icon, title, text }) {
  return (
    <div className="card row" style={{ alignItems: 'flex-start', gap: 14 }}>
      <div className="stat-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
        <Icon size={20} />
      </div>
      <div>
        <h3>{title}</h3>
        <p className="small text-2" style={{ marginTop: 4 }}>{text}</p>
      </div>
    </div>
  );
}

function HitCard({ h, query, onOpen }) {
  const { t } = useT();
  const p = h.match_probability;
  return (
    <div className="hit">
      <div className="hit-media" onClick={() => onOpen(0)}>
        <CropImage src={h.crops[0]} className="main-img" />
        {h.crops.length > 1 && (
          <div className="side">
            {h.crops.slice(1, 5).map((c, i) => (
              <AuthImage key={c} src={c} onClick={(e) => (e.stopPropagation(), onOpen(i + 1))} />
            ))}
          </div>
        )}
        <span className="hit-rank">#{h.rank}</span>
        <span className="hit-score">
          <span className="dot" style={{ background: BAND_COLOR[probBand(p)] }} />
          {p == null ? t('score') + ' ' + h.score.toFixed(2) : `${pct(p)} ${t('match')}`}
        </span>
      </div>
      <div className="hit-body">
        <div className="hit-title">
          <span className="mono small">{h.track_code}</span>
          <KeyBadge color={CLASS_COLOR[h.class]}>{t(`cls_${h.class}`)}</KeyBadge>
        </div>
        <ProbBar p={p} />
        <div className="meta-line">
          <Camera size={14} /> <b>{h.camera}</b>
        </div>
        <div className="meta-line xs">
          <Clock size={13} /> {fmtRange(h.start_ts, h.end_ts)}
        </div>
        <div className="meta-line xs">
          <Hash size={13} />
          <Link to={`/videos/${h.evidence.video}`} className="mono">{h.evidence.video}</Link>· {t('frame')} {h.evidence.frame_idx}
        </div>
        <div className="hit-foot">
          <AddToCase item={itemFromHit(h, query)} full />
        </div>
      </div>
    </div>
  );
}
