import type { ConnectionHealth } from '../../types/system';

const healthStyles: Record<ConnectionHealth, { dot: string; glow: string }> = {
  healthy: {
    dot: 'bg-status-online',
    glow: 'shadow-[0_0_6px_rgba(46,204,113,0.4)]',
  },
  degraded: {
    dot: 'bg-status-degraded animate-pulse-slow',
    glow: 'shadow-[0_0_6px_rgba(255,214,10,0.4)]',
  },
  down: {
    dot: 'bg-status-offline',
    glow: 'shadow-[0_0_6px_rgba(225,6,0,0.4)]',
  },
};

type StatusIndicatorProps = {
  status: ConnectionHealth;
  size?: 'sm' | 'md';
  className?: string;
};

export function StatusIndicator({ status, size = 'sm', className = '' }: StatusIndicatorProps) {
  const s = healthStyles[status];
  const dims = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  return (
    <span className={`inline-block rounded-full ${dims} ${s.dot} ${s.glow} ${className}`} />
  );
}
