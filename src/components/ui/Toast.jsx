import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);
let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info') => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div
        className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={remove} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px) scale(0.97)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
    });
  }, []);

  const config = {
    success: {
      bar:  'bg-green-500',
      icon: (
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bar:  'bg-red-500',
      icon: (
        <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    info: {
      bar:  'bg-gold',
      icon: (
        <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const { bar, icon } = config[toast.type] || config.info;

  return (
    <div
      ref={ref}
      role="status"
      className="pointer-events-auto flex items-start gap-3 bg-card border border-edge
                 rounded-2xl px-4 py-3.5 shadow-float min-w-[280px] max-w-sm overflow-hidden relative"
    >
      <span className={`absolute top-0 left-0 w-0.5 h-full ${bar} rounded-l-2xl`} aria-hidden="true" />
      <span className="shrink-0 mt-0.5 ml-1">{icon}</span>
      <p className="text-sm text-ink flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar notificación"
        className="text-ink-3 hover:text-ink transition-colors shrink-0 mt-0.5 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
