import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);
let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info') => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none"
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
    el.style.transform = 'translateY(8px)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.18s ease-out, transform 0.18s ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, []);

  const typeStyles = {
    success: 'border-green-600/60 [&_span]:text-green-500',
    error:   'border-red-600/60   [&_span]:text-red-500',
    info:    'border-gold/50       [&_span]:text-gold',
  };

  const icons = { success: '✓', error: '✕', info: 'i' };

  return (
    <div
      ref={ref}
      role="status"
      className={`pointer-events-auto flex items-start gap-3 bg-card border ${typeStyles[toast.type] || typeStyles.info}
        rounded-xl px-4 py-3 shadow-float min-w-[280px] max-w-sm`}
    >
      <span className="text-sm font-bold mt-0.5 shrink-0">{icons[toast.type]}</span>
      <p className="text-sm text-ink flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar notificación"
        className="text-ink-3 hover:text-ink text-xs mt-0.5 ml-1 shrink-0 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
