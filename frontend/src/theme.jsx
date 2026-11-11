import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext(null);
const KEY = 'vs_theme'; // 'light' | 'dark' | 'system'

function read() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(read);
  const [resolved, setResolved] = useState(() => (mode === 'system' ? (systemDark() ? 'dark' : 'light') : mode));

  useEffect(() => {
    const apply = () => {
      const r = mode === 'system' ? (systemDark() ? 'dark' : 'light') : mode;
      setResolved(r);
      document.documentElement.dataset.theme = r;
    };
    apply();
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const toggle = useCallback(() => setMode(resolved === 'dark' ? 'light' : 'dark'), [resolved]);
  return <ThemeCtx.Provider value={{ mode, resolved, setMode, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
