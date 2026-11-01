import { useEffect } from 'react';
import { useNotificationStore, type Toast } from '../../stores/useNotificationStore';

const AUTO_DISMISS_MS = 6000;

const VARIANT_STYLES: Record<Toast['variant'], { border: string; accent: string; icon: string }> = {
  route: { border: 'border-[#00D4FF]/30', accent: '#00D4FF', icon: '→' },
  alert: { border: 'border-[#FF3B30]/30', accent: '#FF3B30', icon: '!' },
  info: { border: 'border-[#A78BFA]/30', accent: '#A78BFA', icon: 'i' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useNotificationStore((s) => s.dismiss);
  const style = VARIANT_STYLES[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-raised backdrop-blur-[60px] border ${style.border} shadow-lg animate-slide-up max-w-sm`}
    >
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold mt-0.5"
        style={{ backgroundColor: style.accent + '18', color: style.accent }}
      >
        {style.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-text-primary tracking-tight">{toast.title}</p>
        <p className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-text-quaternary hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer mt-0.5"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="1" x2="7" y2="7" />
          <line x1="7" y1="1" x2="1" y2="7" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-2.5">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
