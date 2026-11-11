/**
 * Small hand-built SVG/HTML charts that follow the dataviz rules:
 * thin marks, 2px gaps, 4px rounded data-ends, recessive grid, one axis,
 * legend for >= 2 series, hover tooltip on every mark, text in text tokens.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

/* ---------------------------------------------------------------- size */

function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/* ---------------------------------------------------------------- tooltip */

function useTip() {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);
  const show = (e, content) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.min(Math.max(e.clientX - box.left, 70), box.width - 70);
    setTip({ x, y: e.clientY - box.top, content });
  };
  const hide = () => setTip(null);
  const el = tip && (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  );
  return { ref, show, hide, el };
}

export function TipRows({ title, rows }) {
  return (
    <>
      {title && <div className="tt-title">{title}</div>}
      {rows.map((r) => (
        <div className="tt-row" key={r.label}>
          <span className="key" style={{ background: r.color }} />
          <b>{r.value}</b>
          <span className="muted">{r.label}</span>
        </div>
      ))}
    </>
  );
}

export function Legend({ items }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <i className="sw" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- column chart (stacked) */

/**
 * buckets: [{ label, title, values: {key: n} }], series: [{ key, label, color }]
 */
export function ColumnChart({ buckets, series, height = 220, emptyText = '—' }) {
  const tip = useTip();
  const [hover, setHover] = useState(null);
  const W = useWidth(tip.ref) || 600;
  const H = height;
  const pad = { l: 34, r: 8, t: 10, b: 26 };
  const totals = buckets.map((b) => series.reduce((s, x) => s + (b.values[x.key] || 0), 0));
  const max = Math.max(1, ...totals);
  const nice = niceMax(max);
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / Math.max(1, buckets.length);
  const bw = Math.max(4, Math.min(42, slot * 0.62));
  const y = (v) => pad.t + ih - (v / nice) * ih;
  const ticks = [0, nice / 2, nice];
  const labelEvery = Math.max(1, Math.ceil(buckets.length / Math.max(1, Math.floor(iw / 58))));

  if (!buckets.length) return <div className="empty">{emptyText}</div>;

  return (
    <div className="chart" ref={tip.ref} onMouseLeave={() => (tip.hide(), setHover(null))}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ direction: 'ltr' }}>
        {ticks.map((v) => (
          <g key={v}>
            <line className={v === 0 ? 'baseline' : 'gridline'} x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const cx = pad.l + slot * i + slot / 2;
          let acc = 0;
          const segs = series
            .map((s) => ({ s, v: b.values[s.key] || 0 }))
            .filter((x) => x.v > 0);
          return (
            <g key={i} className={hover === i ? 'hovered' : ''}>
              {segs.map(({ s, v }, k) => {
                const y0 = y(acc);
                acc += v;
                const y1 = y(acc);
                const top = k === segs.length - 1;
                const h = Math.max(1, y0 - y1 - (top ? 0 : 2)); // 2px surface gap between stacked fills
                return top ? (
                  <path key={s.key} d={roundTop(cx - bw / 2, y1, bw, h, Math.min(4, bw / 2, h))} fill={s.color} />
                ) : (
                  <rect key={s.key} x={cx - bw / 2} y={y1 + 2} width={bw} height={h} fill={s.color} />
                );
              })}
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle">
                  {b.label}
                </text>
              )}
              <rect
                className="col-hit"
                x={pad.l + slot * i}
                y={pad.t}
                width={slot}
                height={ih}
                onMouseMove={(e) => {
                  setHover(i);
                  tip.show(
                    e,
                    <TipRows
                      title={b.title || b.label}
                      rows={series.map((s) => ({ label: s.label, value: b.values[s.key] || 0, color: s.color }))}
                    />
                  );
                }}
              />
            </g>
          );
        })}
      </svg>
      {tip.el}
    </div>
  );
}

function roundTop(x, y, w, h, r) {
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  const n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return Math.max(2, n * p);
}

/* ---------------------------------------------------------------- bar list (horizontal, direct-labelled) */

export function BarList({ items, emptyText = '—', format = (v) => v }) {
  const tip = useTip();
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="empty">{emptyText}</div>;
  return (
    <div className="chart barlist" ref={tip.ref} onMouseLeave={tip.hide}>
      {items.map((i) => (
        <div
          key={i.key || i.label}
          className="barlist-row"
          onMouseMove={(e) => tip.show(e, <TipRows rows={[{ label: i.label, value: format(i.value), color: i.color }]} />)}
        >
          <span className="lbl">
            {i.icon}
            {i.label}
          </span>
          <span className="track">
            <span className="fill" style={{ display: 'block', width: `${(i.value / max) * 100}%`, background: i.color || 'var(--s1)' }} />
          </span>
          <span className="val">{format(i.value)}</span>
        </div>
      ))}
      {tip.el}
    </div>
  );
}

/* ---------------------------------------------------------------- segmented bar (part-to-whole) */

export function SegBar({ parts }) {
  const tip = useTip();
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="chart" ref={tip.ref} onMouseLeave={tip.hide}>
      <div className="segbar">
        {total === 0 ? null : parts.filter((p) => p.value > 0).map((p) => (
          <div
            key={p.label}
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
            onMouseMove={(e) =>
              tip.show(e, <TipRows rows={[{ label: p.label, value: `${p.value} · ${Math.round((p.value / total) * 100)}%`, color: p.color }]} />)
            }
          />
        ))}
      </div>
      {tip.el}
    </div>
  );
}

/* ---------------------------------------------------------------- gantt (tracks along a video) */

/**
 * rows: [{ key, start, end (Date ms), color, label, sub }], domain: [ms, ms]
 */
export function Gantt({ rows, domain, onPick, fmtTick }) {
  const tip = useTip();
  const [lo, hi] = domain;
  const span = Math.max(1, hi - lo);
  const pos = (v) => ((v - lo) / span) * 100;
  const ticks = useMemo(() => Array.from({ length: 6 }, (_, i) => lo + (span * i) / 5), [lo, span]);
  return (
    <div className={`chart gantt ${rows.length > 30 ? 'dense' : ''}`} ref={tip.ref} onMouseLeave={tip.hide}>
      <div className="gantt-axis">
        {ticks.map((v) => (
          <span key={v}>{fmtTick(v)}</span>
        ))}
      </div>
      <div className="gantt-body">
        {ticks.slice(1, -1).map((v) => (
          <div key={v} className="gantt-grid" style={{ left: `${pos(v)}%` }} />
        ))}
        {rows.map((r) => (
          <div className="gantt-row" key={r.key}>
            <div
              className="gantt-bar"
              style={{ left: `${pos(r.start)}%`, width: `${Math.max(0.6, pos(r.end) - pos(r.start))}%`, background: r.color }}
              onMouseMove={(e) => tip.show(e, <TipRows title={r.label} rows={[{ label: r.sub, value: r.valueText, color: r.color }]} />)}
              onClick={() => onPick?.(r)}
            />
          </div>
        ))}
      </div>
      {tip.el}
    </div>
  );
}

/* ---------------------------------------------------------------- swimlanes (case evidence per camera) */

/**
 * lanes: [{ key, label, items: [{ id, start, end, color, cls, title, sub }] }], domain: [ms, ms]
 */
export function Lanes({ lanes, domain, fmtTick, onPick }) {
  const tip = useTip();
  const [lo, hi] = domain;
  const span = Math.max(1, hi - lo);
  const pos = (v) => ((v - lo) / span) * 100;
  const ticks = Array.from({ length: 5 }, (_, i) => lo + (span * i) / 4);
  return (
    <div className="chart" ref={tip.ref} onMouseLeave={tip.hide}>
      <div className="lane" style={{ marginBottom: 4 }}>
        <span />
        <div className="gantt-axis">
          {ticks.map((v) => (
            <span key={v}>{fmtTick(v)}</span>
          ))}
        </div>
      </div>
      <div className="lanes">
        {lanes.map((l) => (
          <div className="lane" key={l.key}>
            <div className="lane-label">{l.label}</div>
            <div className="lane-track">
              {l.items.map((it) => (
                <div
                  key={it.id}
                  className={`lane-mark ${it.cls || ''}`}
                  style={{
                    left: `${Math.min(98.5, pos(it.start))}%`,
                    width: `${Math.max(0, pos(it.end) - pos(it.start))}%`,
                    background: it.color,
                  }}
                  onMouseMove={(e) => tip.show(e, <TipRows title={it.title} rows={[{ label: it.sub, value: it.valueText, color: it.color }]} />)}
                  onClick={() => onPick?.(it)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {tip.el}
    </div>
  );
}
