import { type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-accent-red text-white hover:bg-accent-red-muted active:brightness-90',
  secondary:
    'bg-surface-overlay text-text-primary border border-surface-border hover:bg-surface-hover active:bg-surface-base',
  ghost:
    'text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-overlay',
  danger:
    'bg-risk-high-bg text-accent-red hover:bg-accent-red-subtle active:bg-accent-red-glow',
  outline:
    'bg-transparent text-accent-red border border-accent-red/30 hover:bg-accent-red-subtle active:bg-accent-red-glow',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2 text-xs',
  lg: 'px-5 py-2.5 text-sm',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = 'secondary',
  size = 'sm',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
