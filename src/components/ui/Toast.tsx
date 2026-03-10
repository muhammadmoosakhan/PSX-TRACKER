'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: AlertCircle,
};

const colorMap = {
  success: 'var(--accent-success)',
  error: 'var(--accent-danger)',
  warning: 'var(--accent-warning)',
  info: 'var(--accent-primary)',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = iconMap[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[14px] min-w-[280px] max-w-[400px] animate-[slide-in-right_0.3s_ease-out]"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-lg)',
        borderLeft: `4px solid ${colorMap[toast.type]}`,
      }}
    >
      <Icon size={18} style={{ color: colorMap[toast.type], flexShrink: 0 }} />
      <p className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded-full hover:opacity-70 transition-opacity cursor-pointer"
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
