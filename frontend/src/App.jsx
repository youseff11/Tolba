import {
  Briefcase, ChevronsLeft, ChevronsRight, Command, Languages, LayoutDashboard, LogOut, Menu, Moon, ScanEye, Search, Siren,
  Shapes, Sun, Video, Webcam,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { ConnectionBanner, HealthProvider, useHealth } from './health.jsx';
import { Spinner } from './components/ui.jsx';
import { useT } from './i18n.jsx';
import Cameras from './pages/Cameras.jsx';
import CaseDetail from './pages/CaseDetail.jsx';
import CaseReport from './pages/CaseReport.jsx';
import Cases from './pages/Cases.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Events from './pages/Events.jsx';
import Login from './pages/Login.jsx';
import SearchPage from './pages/Search.jsx';
import VideoDetail from './pages/VideoDetail.jsx';
import Videos from './pages/Videos.jsx';
import Zones from './pages/Zones.jsx';
import { useTheme } from './theme.jsx';
import { initials } from './utils.js';

const NAV = [
  ['overview', [['/', 'nav_dashboard', LayoutDashboard]]],
  ['investigation', [['/search', 'nav_search', Search], ['/events', 'nav_events', Siren], ['/cases', 'nav_cases', Briefcase]]],
  ['data', [['/videos', 'nav_videos', Video], ['/cameras', 'nav_cameras', Webcam], ['/zones', 'nav_zones', Shapes]]],
];

function readCollapsed() {
  try {
    return localStorage.getItem('vs_sidebar') === '1';
  } catch {
    return false;
  }
}

function useAiHealth() {
  const { state, ai } = useHealth();
  if (state === 'backend-down') return { reachable: false, base_url: '', error: 'backend' };
  return ai;
}

function Sidebar({ collapsed, setCollapsed, open, onNavigate }) {
  const { t } = useT();
  const ai = useAiHealth();
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <ScanEye size={22} />
        </div>
        <div className="brand-text hide-collapsed">
          <b>VisionSeek AI</b>
          <small>{t('tagline')}</small>
        </div>
      </div>
      {NAV.map(([section, links]) => (
        <nav key={section}>
          <div className="nav-section hide-collapsed">{t(`sec_${section}`)}</div>
          {links.map(([to, key, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={collapsed ? t(key) : undefined} onClick={onNavigate}>
              <Icon size={19} />
              <span className="hide-collapsed">{t(key)}</span>
            </NavLink>
          ))}
        </nav>
      ))}
      <div className="sidebar-foot">
        {ai && (
          <div className="ai-card" title={ai.error || ai.base_url}>
            <b>
              <span className={`pulse ${ai.reachable ? '' : 'off'}`} />
              <span className="hide-collapsed">{ai.reachable ? t('aiOnline') : t('aiOffline')}</span>
            </b>
            <span className="hide-collapsed">
              {ai.mock ? t('mockMode') : ai.version ? `v${ai.version}` : ''}
            </span>
            <span className="url hide-collapsed">{ai.base_url}</span>
          </div>
        )}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronsRight size={16} className="flip-rtl" /> : <ChevronsLeft size={16} className="flip-rtl" />}
          <span className="hide-collapsed">{t('collapse')}</span>
        </button>
      </div>
    </aside>
  );
}

const CRUMB = { search: 'nav_search', events: 'nav_events', cases: 'nav_cases', videos: 'nav_videos', cameras: 'nav_cameras', zones: 'nav_zones' };

function Topbar({ onMenu, onCmd }) {
  const { t, toggle: toggleLang } = useT();
  const { resolved, toggle: toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const parts = loc.pathname.split('/').filter(Boolean);
  return (
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={onMenu} aria-label="menu">
        <Menu size={20} />
      </button>
      <div className="crumbs">
        <span>VisionSeek</span>
        <span>/</span>
        <b>{parts.length ? t(CRUMB[parts[0]] || parts[0]) : t('nav_dashboard')}</b>
        {parts[1] && (
          <>
            <span>/</span>
            <b className="mono">{parts[1]}</b>
          </>
        )}
        {parts[2] && (
          <>
            <span>/</span>
            <b>{t(parts[2])}</b>
          </>
        )}
      </div>
      <button className="cmdk-trigger" onClick={onCmd}>
        <Search size={16} />
        <span className="hide-sm">{t('cmdkHint')}</span>
        <kbd className="hide-sm">Ctrl K</kbd>
      </button>
      <div className="top-actions">
        <button className="icon-btn" onClick={toggleTheme} title={t(resolved === 'dark' ? 'lightMode' : 'darkMode')}>
          {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-btn" onClick={toggleLang} title={t('langToggle')}>
          <Languages size={18} />
        </button>
        <div className="user-menu">
          <button className="icon-btn" style={{ width: 'auto', padding: '0 4px', gap: 8, display: 'flex' }} onClick={() => setMenu(!menu)}>
            <span className="avatar">{initials(user)}</span>
          </button>
          {menu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setMenu(false)} />
              <div className="menu">
                <div className="menu-head">
                  <b>{user.first_name || user.username}</b>
                  <div className="xs muted">
                    @{user.username} {user.is_staff && `· ${t('admin')}`}
                  </div>
                </div>
                <button onClick={() => (setMenu(false), onCmd())}>
                  <Command size={16} /> {t('commandPalette')}
                </button>
                <button onClick={toggleTheme}>
                  {resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {t(resolved === 'dark' ? 'lightMode' : 'darkMode')}
                </button>
                <button onClick={toggleLang}>
                  <Languages size={16} /> {t('langToggle')}
                </button>
                <button onClick={signOut}>
                  <LogOut size={16} className="flip-rtl" /> {t('logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const { user, ready } = useAuth();
  const [collapsed, setCollapsedState] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmd, setCmd] = useState(false);
  const loc = useLocation();

  const setCollapsed = (v) => {
    setCollapsedState(v);
    try {
      localStorage.setItem('vs_sidebar', v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmd((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMobileOpen(false);
  }, [loc.pathname]);

  if (!ready) return <Spinner />;
  if (!user) return <Login />;

  return (
    <HealthProvider>
    <div className="shell">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} open={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)} />}
      <div className="main">
        <Topbar onMenu={() => setMobileOpen(true)} onCmd={() => setCmd(true)} />
        <ConnectionBanner />
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/videos/:code" element={<VideoDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/cases/:id/report" element={<CaseReport />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      {cmd && <CommandPalette onClose={() => setCmd(false)} />}
    </div>
    </HealthProvider>
  );
}
