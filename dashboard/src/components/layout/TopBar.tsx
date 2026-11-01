import { useEffect, useState } from 'react';

type TopBarProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-surface-border bg-surface-topbar backdrop-blur-[60px] shrink-0 z-10">
      <div>
        <h1 className="text-[17px] font-semibold text-text-primary tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-text-quaternary mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-6">
        {actions}
        <div className="text-right pl-6 border-l border-surface-border">
          <p className="text-[15px] font-mono font-medium text-text-primary tabular-nums tracking-tight">{timeStr}</p>
          <p className="text-[11px] text-text-quaternary">{dateStr}</p>
        </div>
      </div>
    </header>
  );
}
