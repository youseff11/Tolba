import {
  ArrowLeftRight, Check, ClipboardCopy, Download, Hexagon, ImagePlus, Info, MousePointer2, PenLine, Save, Shapes, Sparkles,
  Trash2, Undo2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { errMsg } from '../api.js';
import { Card, EmptyState, ErrorBox, PageHeader, Skeleton, useApi } from '../components/ui.jsx';
import { useT } from '../i18n.jsx';
import { useToast } from '../toast.jsx';
import { CLASSES } from '../utils.js';

const W = 1000;
const ZONE_COLORS = ['var(--s1)', 'var(--s3)', 'var(--s5)', 'var(--s6)', 'var(--s2)'];
const LINE_COLOR = 'var(--s4)';
const r3 = (v) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;

export default function Zones() {
  const { t } = useT();
  const toast = useToast();
  const cams = useApi(() => api.get('/cameras'), []);
  const all = useApi(() => api.get('/zones'), []);
  const [camera, setCamera] = useState('');
  const [cfg, setCfg] = useState({ zones: [], lines: [] });
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(false);
  const [tool, setTool] = useState('select');
  const [draft, setDraft] = useState([]);
  const [sel, setSel] = useState(null); // {kind:'zone'|'line', i}
  const [drag, setDrag] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [bg, setBg] = useState({}); // camera -> {url, aspect}
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const svgRef = useRef(null);
  const fileRef = useRef(null);

  const aspect = bg[camera]?.aspect || 16 / 9;
  const H = W / aspect;
  const dirty = JSON.stringify(cfg) !== saved;
  const counts = useMemo(() => Object.fromEntries((all.data || []).map((c) => [c.camera, c.zones.length + c.lines.length])), [all.data]);

  useEffect(() => {
    if (!camera && cams.data?.length) setCamera(cams.data[0].code);
  }, [cams.data, camera]);

  useEffect(() => {
    if (!camera) return;
    setLoading(true);
    setSel(null);
    setDraft([]);
    api
      .get(`/zones/${camera}`)
      .then((r) => {
        const c = { zones: r.data.zones, lines: r.data.lines };
        setCfg(c);
        setSaved(JSON.stringify(c));
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [camera]);

  const toNorm = useCallback(
    (e) => {
      const b = svgRef.current.getBoundingClientRect();
      return [r3((e.clientX - b.left) / b.width), r3((e.clientY - b.top) / b.height)];
    },
    []
  );

  function finishZone(pts) {
    if (pts.length < 3) return;
    const zone = { name: `${t('zoneWord')} ${cfg.zones.length + 1}`, polygon: pts, classes: ['person'], loiter_sec: 15 };
    setCfg({ ...cfg, zones: [...cfg.zones, zone] });
    setSel({ kind: 'zone', i: cfg.zones.length });
    setDraft([]);
    setTool('select');
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'Escape') {
        setDraft([]);
        setTool('select');
      } else if (e.key === 'Enter' && tool === 'zone') finishZone(draft);
      else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) removeSel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function onCanvasDown(e) {
    if (e.button !== 0) return;
    const p = toNorm(e);
    if (tool === 'zone') {
      if (draft.length >= 3 && Math.hypot(p[0] - draft[0][0], (p[1] - draft[0][1]) / aspect) < 0.02) return finishZone(draft);
      setDraft([...draft, p]);
    } else if (tool === 'line') {
      if (!draft.length) setDraft([p]);
      else {
        const line = { name: `${t('lineWord')} ${cfg.lines.length + 1}`, p1: draft[0], p2: p, a_label: 'A', b_label: 'B' };
        setCfg({ ...cfg, lines: [...cfg.lines, line] });
        setSel({ kind: 'line', i: cfg.lines.length });
        setDraft([]);
        setTool('select');
      }
    } else {
      setSel(null);
    }
  }

  function onMove(e) {
    const p = toNorm(e);
    setCursor(p);
    if (!drag) return;
    setCfg((c) => {
      if (drag.kind === 'zone') {
        const zones = c.zones.map((z, i) =>
          i !== drag.i ? z : { ...z, polygon: z.polygon.map((q, k) => (k === drag.k ? p : q)) }
        );
        return { ...c, zones };
      }
      const lines = c.lines.map((l, i) => (i !== drag.i ? l : { ...l, [drag.k]: p }));
      return { ...c, lines };
    });
  }

  const update = (kind, i, patch) =>
    setCfg((c) => ({ ...c, [`${kind}s`]: c[`${kind}s`].map((x, k) => (k === i ? { ...x, ...patch } : x)) }));

  function removeSel() {
    if (!sel) return;
    setCfg((c) => ({ ...c, [`${sel.kind}s`]: c[`${sel.kind}s`].filter((_, k) => k !== sel.i) }));
    setSel(null);
  }

  function addTemplate() {
    setCfg((c) => ({
      zones: [
        ...c.zones,
        { name: t('tplEntrance'), polygon: [[0.15, 0.55], [0.85, 0.55], [0.92, 0.95], [0.08, 0.95]], classes: ['person'], loiter_sec: 15, crowd_count: 4, crowd_sec: 5 },
      ],
      lines: [...c.lines, { name: t('tplGate'), p1: [0.5, 0.15], p2: [0.5, 0.55], a_label: t('tplWest'), b_label: t('tplEast') }],
    }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.put(`/zones/${camera}`, cfg);
      const c = { zones: r.data.zones, lines: r.data.lines };
      setCfg(c);
      setSaved(JSON.stringify(c));
      all.reload();
      toast.success(t('zonesSaved', { cam: camera }));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function exportYaml(copy) {
    try {
      if (dirty) await save();
      const r = await api.get('/zones/export.yaml', { responseType: 'text', transformResponse: (x) => x });
      if (copy) {
        await navigator.clipboard.writeText(r.data);
        toast.success(t('yamlCopied'));
      } else {
        const url = URL.createObjectURL(new Blob([r.data], { type: 'text/yaml;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_zones.yaml';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function loadBg(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setBg((b) => ({ ...b, [camera]: { url, aspect: img.naturalWidth / img.naturalHeight } }));
    img.src = url;
  }

  const X = (v) => v * W;
  const Y = (v) => v * H;
  const selected = sel && cfg[`${sel.kind}s`][sel.i];

  return (
    <div className="page">
      <PageHeader icon={Shapes} title={t('nav_zones')} subtitle={t('zonesSub')}
        actions={
          <>
            <button className="btn" onClick={() => exportYaml(true)}><ClipboardCopy size={16} /> {t('copyYaml')}</button>
            <button className="btn btn-primary" onClick={() => exportYaml(false)}><Download size={16} /> my_zones.yaml</button>
          </>
        } />

      {cams.loading && !cams.data ? <Skeleton h={500} r={14} /> : !cams.data?.length ? (
        <div className="card"><EmptyState title={t('noCameras')} text={t('noCamerasText')} /></div>
      ) : (
        <>
          <div className="row-between">
            <div className="chips">
              {cams.data.map((c) => (
                <button key={c.code} className={`chip ${camera === c.code ? 'active' : ''}`}
                  onClick={() => (!dirty || window.confirm(t('discardChanges'))) && setCamera(c.code)}>
                  {c.code} <span className="count">{counts[c.code] || 0}</span>
                </button>
              ))}
            </div>
            <div className="row-wrap">
              {dirty && <span className="badge badge-warn">{t('unsaved')}</span>}
              <button className="btn btn-primary" onClick={save} disabled={!dirty || busy}><Save size={16} /> {t('save')}</button>
            </div>
          </div>

          <div className="grid zones-layout">
            <Card>
              <div className="row-between" style={{ marginBottom: 12 }}>
                <div className="segmented">
                  <button className={tool === 'select' ? 'active' : ''} onClick={() => (setTool('select'), setDraft([]))}><MousePointer2 size={14} /> {t('toolSelect')}</button>
                  <button className={tool === 'zone' ? 'active' : ''} onClick={() => (setTool('zone'), setDraft([]), setSel(null))}><Hexagon size={14} /> {t('toolZone')}</button>
                  <button className={tool === 'line' ? 'active' : ''} onClick={() => (setTool('line'), setDraft([]), setSel(null))}><PenLine size={14} /> {t('toolLine')}</button>
                </div>
                <div className="row-wrap">
                  <button className="btn btn-sm" onClick={() => fileRef.current?.click()}><ImagePlus size={14} /> {t('loadFrame')}</button>
                  <button className="btn btn-sm btn-ghost" onClick={addTemplate}><Sparkles size={14} /> {t('starter')}</button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && loadBg(e.target.files[0])} />
                </div>
              </div>

              <div className="zone-stage" style={{ aspectRatio: `${aspect}` }}>
                {bg[camera] ? <img src={bg[camera].url} alt="" className="zone-bg" /> : (
                  <div className="zone-placeholder"><ImagePlus size={28} /><span>{t('noFrame')}</span></div>
                )}
                {loading && <div className="zone-loading" />}
                <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={`zone-svg tool-${tool}`}
                  onPointerDown={onCanvasDown} onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerLeave={() => (setDrag(null), setCursor(null))}
                  onDoubleClick={() => tool === 'zone' && finishZone(draft)}>
                  {Array.from({ length: 9 }, (_, i) => (i + 1) / 10).map((v) => (
                    <g key={v} className="zone-grid">
                      <line x1={X(v)} x2={X(v)} y1={0} y2={H} />
                      <line x1={0} x2={W} y1={Y(v)} y2={Y(v)} />
                      <text x={X(v) + 4} y={14}>{v.toFixed(1)}</text>
                      <text x={4} y={Y(v) - 4}>{v.toFixed(1)}</text>
                    </g>
                  ))}
                  {cfg.zones.map((z, i) => {
                    const color = ZONE_COLORS[i % ZONE_COLORS.length];
                    const active = sel?.kind === 'zone' && sel.i === i;
                    const cx = z.polygon.reduce((s, p) => s + p[0], 0) / z.polygon.length;
                    const cy = z.polygon.reduce((s, p) => s + p[1], 0) / z.polygon.length;
                    return (
                      <g key={`z${i}`} className={`zone-shape ${active ? 'active' : ''}`}>
                        <polygon points={z.polygon.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ')} style={{ fill: color, stroke: color }}
                          onPointerDown={(e) => tool === 'select' && (e.stopPropagation(), setSel({ kind: 'zone', i }))} />
                        <text x={X(cx)} y={Y(cy)} className="zone-label">{z.name}</text>
                        {active && z.polygon.map((p, k) => (
                          <circle key={k} cx={X(p[0])} cy={Y(p[1])} r={9} className="zone-handle" style={{ stroke: color }}
                            onPointerDown={(e) => (e.stopPropagation(), e.currentTarget.setPointerCapture?.(e.pointerId), setDrag({ kind: 'zone', i, k }))} />
                        ))}
                      </g>
                    );
                  })}
                  {cfg.lines.map((l, i) => {
                    const active = sel?.kind === 'line' && sel.i === i;
                    const dx = l.p2[0] - l.p1[0];
                    const dy = (l.p2[1] - l.p1[1]) / aspect;
                    const len = Math.hypot(dx, dy) || 1;
                    // A side: cross(p2-p1, p-p1) > 0  ⇒  normal (-dy, dx) in image coords (y down)
                    const nx = (-dy / len) * 0.06;
                    const ny = (dx / len) * 0.06 * aspect;
                    const mx = (l.p1[0] + l.p2[0]) / 2;
                    const my = (l.p1[1] + l.p2[1]) / 2;
                    return (
                      <g key={`l${i}`} className={`zone-line ${active ? 'active' : ''}`}>
                        <line x1={X(l.p1[0])} y1={Y(l.p1[1])} x2={X(l.p2[0])} y2={Y(l.p2[1])} className="hit"
                          onPointerDown={(e) => tool === 'select' && (e.stopPropagation(), setSel({ kind: 'line', i }))} />
                        <line x1={X(l.p1[0])} y1={Y(l.p1[1])} x2={X(l.p2[0])} y2={Y(l.p2[1])} style={{ stroke: LINE_COLOR }} className="stroke" />
                        <text x={X(mx + nx)} y={Y(my + ny)} className="side-label">A · {l.a_label}</text>
                        <text x={X(mx - nx)} y={Y(my - ny)} className="side-label">B · {l.b_label}</text>
                        <text x={X(mx)} y={Y(my) - 12} className="zone-label">{l.name}</text>
                        {['p1', 'p2'].map((k) => (
                          <circle key={k} cx={X(l[k][0])} cy={Y(l[k][1])} r={active ? 9 : 5} className="zone-handle" style={{ stroke: LINE_COLOR }}
                            onPointerDown={(e) => tool === 'select' && (e.stopPropagation(), setSel({ kind: 'line', i }), setDrag({ kind: 'line', i, k }))} />
                        ))}
                      </g>
                    );
                  })}
                  {draft.length > 0 && (
                    <g className="zone-draft">
                      <polyline points={[...draft, ...(cursor ? [cursor] : [])].map((p) => `${X(p[0])},${Y(p[1])}`).join(' ')} />
                      {draft.map((p, k) => <circle key={k} cx={X(p[0])} cy={Y(p[1])} r={k === 0 && draft.length >= 3 ? 11 : 6} />)}
                    </g>
                  )}
                </svg>
              </div>
              <div className="row-between xs muted" style={{ marginTop: 8 }}>
                <span>{tool === 'zone' ? t('hintZone') : tool === 'line' ? t('hintLine') : t('hintSelect')}</span>
                <span className="mono">{cursor ? `x ${cursor[0].toFixed(3)} · y ${cursor[1].toFixed(3)}` : ''}</span>
              </div>
            </Card>

            <div className="stack" style={{ gap: 20 }}>
              <Card title={selected ? (sel.kind === 'zone' ? t('zoneProps') : t('lineProps')) : t('rulesOf', { cam: camera })}
                actions={selected && <button className="icon-btn sm" onClick={removeSel} title={t('delete')}><Trash2 size={15} /></button>}>
                {!selected ? (
                  cfg.zones.length + cfg.lines.length === 0 ? (
                    <EmptyState icon={Shapes} text={t('noRules')}
                      action={<button className="btn btn-soft btn-sm" onClick={addTemplate}><Sparkles size={14} /> {t('starter')}</button>} />
                  ) : (
                    <div className="stack" style={{ gap: 6 }}>
                      {cfg.zones.map((z, i) => (
                        <button key={`z${i}`} className="cmdk-item" onClick={() => setSel({ kind: 'zone', i })}>
                          <Hexagon size={16} style={{ color: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                          <span dir="auto">{z.name}</span>
                          <span className="hint">{z.polygon.length} {t('points')}</span>
                        </button>
                      ))}
                      {cfg.lines.map((l, i) => (
                        <button key={`l${i}`} className="cmdk-item" onClick={() => setSel({ kind: 'line', i })}>
                          <PenLine size={16} style={{ color: LINE_COLOR }} />
                          <span dir="auto">{l.name}</span>
                          <span className="hint" dir="auto">{l.a_label} ⇄ {l.b_label}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : sel.kind === 'zone' ? (
                  <ZoneForm z={selected} onChange={(p) => update('zone', sel.i, p)} onDone={() => setSel(null)} />
                ) : (
                  <LineForm l={selected} onChange={(p) => update('line', sel.i, p)} onDone={() => setSel(null)} />
                )}
              </Card>
              <ErrorBox error={error} />
              <Card icon={Info} title={t('howToApply')}>
                <ol className="steps">
                  <li>{t('apply1')}</li>
                  <li dangerouslySetInnerHTML={{ __html: t('apply2') }} />
                  <li dangerouslySetInnerHTML={{ __html: t('apply3') }} />
                  <li dangerouslySetInnerHTML={{ __html: t('apply4') }} />
                  <li>{t('apply5')}</li>
                </ol>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ZoneForm({ z, onChange, onDone }) {
  const { t } = useT();
  const num = (k) => (e) => onChange({ [k]: e.target.value === '' ? undefined : Number(e.target.value) });
  const crowd = z.crowd_count != null || z.crowd_sec != null;
  return (
    <div className="form">
      <label className="field">
        <span>{t('name')}</span>
        <input value={z.name} onChange={(e) => onChange({ name: e.target.value })} dir="auto" />
      </label>
      <div className="field">
        <span>{t('watchClasses')}</span>
        <div className="chips">
          {CLASSES.map((c) => {
            const on = z.classes.includes(c);
            return (
              <button key={c} type="button" className={`chip ${on ? 'active' : ''}`}
                onClick={() => onChange({ classes: on ? z.classes.filter((x) => x !== c) : [...z.classes, c] })}>
                {on && <Check size={12} />} {t(`cls_${c}`)}
              </button>
            );
          })}
        </div>
      </div>
      <label className="field">
        <span>{t('loiterSec')}</span>
        <input type="number" min="1" step="1" value={z.loiter_sec ?? ''} onChange={num('loiter_sec')} placeholder={t('off')} />
        <small>{t('loiterHint')}</small>
      </label>
      <label className="row small" style={{ fontWeight: 600 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={crowd}
          onChange={(e) => onChange(e.target.checked ? { crowd_count: 4, crowd_sec: 5 } : { crowd_count: undefined, crowd_sec: undefined })} />
        {t('crowdDetect')}
      </label>
      {crowd && (
        <div className="grid g-2" style={{ gap: 10 }}>
          <label className="field">
            <span>{t('crowdCount')}</span>
            <input type="number" min="2" step="1" value={z.crowd_count ?? ''} onChange={num('crowd_count')} />
          </label>
          <label className="field">
            <span>{t('crowdSec')}</span>
            <input type="number" min="1" step="1" value={z.crowd_sec ?? ''} onChange={num('crowd_sec')} />
          </label>
        </div>
      )}
      <div className="xs muted mono" style={{ direction: 'ltr', textAlign: 'start' }}>{JSON.stringify(z.polygon)}</div>
      <button className="btn btn-sm" onClick={onDone}><Undo2 size={14} /> {t('backToList')}</button>
    </div>
  );
}

function LineForm({ l, onChange, onDone }) {
  const { t } = useT();
  return (
    <div className="form">
      <label className="field">
        <span>{t('name')}</span>
        <input value={l.name} onChange={(e) => onChange({ name: e.target.value })} dir="auto" />
      </label>
      <div className="grid g-2" style={{ gap: 10 }}>
        <label className="field">
          <span>{t('sideA')}</span>
          <input value={l.a_label} onChange={(e) => onChange({ a_label: e.target.value })} dir="auto" />
        </label>
        <label className="field">
          <span>{t('sideB')}</span>
          <input value={l.b_label} onChange={(e) => onChange({ b_label: e.target.value })} dir="auto" />
        </label>
      </div>
      <button className="btn btn-sm" type="button" onClick={() => onChange({ a_label: l.b_label, b_label: l.a_label })}>
        <ArrowLeftRight size={14} /> {t('swapSides')}
      </button>
      <small className="muted">{t('lineHint')}</small>
      <div className="xs muted mono" style={{ direction: 'ltr', textAlign: 'start' }}>p1 {JSON.stringify(l.p1)} · p2 {JSON.stringify(l.p2)}</div>
      <button className="btn btn-sm" onClick={onDone}><Undo2 size={14} /> {t('backToList')}</button>
    </div>
  );
}
