import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  sub?: string;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-24 right-4 z-[80] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#2a2a2a] px-3.5 py-3 shadow-2xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
        <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{toast.message}</p>
        {toast.sub && <p className="text-xs text-muted mt-0.5">{toast.sub}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-md hover:bg-white/8 text-muted hover:text-white transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
