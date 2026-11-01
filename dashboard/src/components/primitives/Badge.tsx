import type { RiskLevel } from '../../tokens/colors';

const variants: Record<RiskLevel | 'neutral' | 'info', string> = {
  low: 'bg-risk-low-bg text-risk-low',
  medium: 'bg-risk-medium-bg text-risk-medium',
  high: 'bg-risk-high-bg text-risk-high',
  critical: 'bg-risk-critical-bg text-risk-critical',
  neutral: 'bg-surface-hover text-text-tertiary',
  info: 'bg-accent-blue-subtle text-accent-blue',
};

type BadgeProps = {
  variant?: RiskLevel | 'neutral' | 'info';
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
};

export function Badge({ variant = 'neutral', children, dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${variants[variant]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
