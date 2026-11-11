import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastCtx = createContext(null);
const ICONS = { success: CheckCircle2, error: TriangleAlert, info: Info };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (kind, text, ms = 3800) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-3), { id, kind, text }]);
      setTimeout(() => dismiss(id), ms);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (t) => push('success', t),
      error: (t) => push('error', t, 6000),
      info: (t) => push('info', t),
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((x) => {
          const Icon = ICONS[x.kind];
          return (
            <div key={x.id} className={`toast toast-${x.kind}`}>
              <Icon size={18} />
              <span>{x.text}</span>
              <button className="icon-btn" onClick={() => dismiss(x.id)} aria-label="dismiss">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
