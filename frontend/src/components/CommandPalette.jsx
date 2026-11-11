import { Briefcase, CornerDownLeft, Film, History, LayoutDashboard, Search, Siren, Video, Webcam } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useT } from '../i18n.jsx';
import { Modal } from './ui.jsx';

export default function CommandPalette({ onClose }) {
  const { t } = useT();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [cases, setCases] = useState([]);
  const [history, setHistory] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    api.get('/cases').then((r) => setCases(r.data.slice(0, 20))).catch(() => {});
    api.get('/search/history').then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  const items = useMemo(() => {
    const text = q.trim();
    const low = text.toLowerCase();
    const out = [];
    if (text) {
      out.push({ group: t('actions'), icon: Search, label: `${t('searchFootageFor')} “${text}”`, go: `/search?q=${encodeURIComponent(text)}` });
      const vid = text.toUpperCase().match(/^VID-?(\d+)$/);
      if (vid) out.push({ group: t('actions'), icon: Film, label: `${t('openVideo')} VID-${vid[1].padStart(4, '0')}`, go: `/videos/VID-${vid[1].padStart(4, '0')}` });
    }
    const pages = [
      ['/', 'nav_dashboard', LayoutDashboard],
      ['/search', 'nav_search', Search],
      ['/events', 'nav_events', Siren],
      ['/cases', 'nav_cases', Briefcase],
      ['/videos', 'nav_videos', Video],
      ['/cameras', 'nav_cameras', Webcam],
    ];
    for (const [to, key, icon] of pages) {
      if (!low || t(key).toLowerCase().includes(low)) out.push({ group: t('pages'), icon, label: t(key), go: to });
    }
    for (const c of cases) {
      if (!low || c.title.toLowerCase().includes(low) || String(c.id) === low.replace('#', ''))
        out.push({ group: t('nav_cases'), icon: Briefcase, label: `#${c.id} · ${c.title}`, go: `/cases/${c.id}` });
    }
    const seen = new Set();
    for (const h of history) {
      if (seen.has(h.query) || (low && !h.query.toLowerCase().includes(low))) continue;
      seen.add(h.query);
      if (seen.size > 5) break;
      out.push({ group: t('recentSearches'), icon: History, label: h.query, go: `/search?q=${encodeURIComponent(h.query)}`, hint: `${h.hits} ${t('hits')}` });
    }
    return out;
  }, [q, cases, history, t]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector('.cmdk-item.active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (it) => {
    if (!it) return;
    nav(it.go);
    onClose();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      go(items[active]);
    }
  };

  let lastGroup = null;
  return (
    <Modal onClose={onClose} className="cmdk">
      <div style={{ margin: -20 }}>
        <div className="cmdk-input">
          <Search size={18} className="muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={t('cmdkPlaceholder')} dir="auto" />
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk-list" ref={listRef}>
          {items.length === 0 && <div className="empty">{t('noMatches')}</div>}
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? <div className="cmdk-group">{it.group}</div> : null;
            lastGroup = it.group;
            return (
              <div key={`${it.group}-${it.label}`}>
                {head}
                <button className={`cmdk-item ${i === active ? 'active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => go(it)}>
                  <it.icon size={17} />
                  <span dir="auto">{it.label}</span>
                  {it.hint && <span className="hint">{it.hint}</span>}
                  {i === active && <CornerDownLeft size={14} className="hint" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="cmdk-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> {t('navigate')}
          </span>
          <span>
            <kbd>Enter</kbd> {t('open')}
          </span>
        </div>
      </div>
    </Modal>
  );
}
