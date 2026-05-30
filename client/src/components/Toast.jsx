import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  error: 'bg-red-600 text-white border-red-700',
  warning: 'bg-amber-500 text-white border-amber-600',
  success: 'bg-emerald-600 text-white border-emerald-700',
  info: 'bg-slate-800 text-white border-slate-900',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'error', durationMs = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[200] flex flex-col gap-2 w-[min(100%,22rem)] md:w-80 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto px-4 py-3 rounded-xl text-sm font-semibold shadow-lg border animate-[toastIn_0.25s_ease-out] ${TOAST_STYLES[t.type] || TOAST_STYLES.info}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
