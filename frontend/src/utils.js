const TZ = 'Africa/Cairo';
// Unicode isolates keep "date time → time" in LTR order inside Arabic (RTL) text.
const LTR = (x) => `⁦${x}⁩`;

const fmtFull = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const fmtClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

/** UTC ISO from the API -> Cairo wall-clock text. */
export function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : LTR(fmtFull.format(d).replace(',', ''));
}

export function fmtClockTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : LTR(fmtClock.format(d));
}

export function fmtRange(a, b) {
  if (!a) return '—';
  const day = (x) => fmtFull.format(new Date(x)).slice(0, 10);
  const same = b && day(a) === day(b);
  return b ? LTR(`${fmtTime(a)} → ${same ? fmtClockTime(b) : fmtTime(b)}`) : fmtTime(a);
}

export function durationSec(a, b) {
  if (!a || !b) return null;
  return Math.max(0, (new Date(b) - new Date(a)) / 1000);
}

export function fmtDur(sec) {
  if (sec == null) return '—';
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  return `${m}m ${Math.round(sec % 60)}s`;
}

export function fmtBytes(n) {
  if (!n) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}

/** Probability bands from the AI docs: ≥0.5 good, 0.1–0.5 medium, below weak. */
export function probBand(p) {
  if (p == null) return 'none';
  if (p >= 0.5) return 'good';
  if (p >= 0.1) return 'mid';
  return 'weak';
}

export const pct = (p) => (p == null ? '—' : `${Math.round(p * 100)}%`);

export const CLASSES = ['person', 'car', 'motorcycle', 'bus', 'truck', 'bicycle'];
export const EVENT_TYPES = ['zone_enter', 'zone_exit', 'loitering', 'crowding', 'line_cross'];

/** Build case-item payloads from AI objects (snapshot kept in `data`). */
export const itemFromHit = (h, query) => ({
  kind: 'track', ref_code: h.track_code, camera: h.camera, video: h.video, start_ts: h.start_ts,
  end_ts: h.end_ts, crop_url: h.crops?.[0] || '', score: h.score, match_probability: h.match_probability,
  source_query: query || '', data: h,
});

export const itemFromTrack = (t, video, camera) => ({
  kind: 'track', ref_code: t.code, camera: camera || '', video, start_ts: t.start_ts, end_ts: t.end_ts,
  crop_url: t.crops?.[0] || '', data: { ...t, video, camera },
});

export const itemFromEvent = (e) => ({
  kind: 'event', ref_code: e.event_code, camera: e.camera, video: e.evidence?.video || '',
  start_ts: e.start_ts, end_ts: e.end_ts, data: e,
});

/** Fixed categorical slots (validated palette, see styles.css --s1..--s6). Colour follows the entity. */
export const CLASS_COLOR = {
  person: 'var(--s1)', car: 'var(--s2)', truck: 'var(--s3)', bus: 'var(--s4)', motorcycle: 'var(--s5)', bicycle: 'var(--s6)',
};
export const EVENT_COLOR = {
  zone_enter: 'var(--s1)', zone_exit: 'var(--s2)', loitering: 'var(--s3)', crowding: 'var(--s4)', line_cross: 'var(--s5)',
};

const fmtHM = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDay = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short' });
export const fmtHourMin = (iso) => (iso ? fmtHM.format(new Date(iso)) : '');
export const fmtDayShort = (iso) => (iso ? fmtDay.format(new Date(iso)) : '');

export const initials = (u) => ((u?.first_name || u?.username || '?').trim()[0] || '?');
