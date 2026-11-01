type PanelProps = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  noPadding?: boolean;
};

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
  scrollable = false,
  noPadding = false,
}: PanelProps) {
  return (
    <div className={`glass-raised flex flex-col ${className}`}>
      {title && (
        <div className="glass-header shrink-0">
          <div>
            <h3 className="text-[13px] font-semibold text-text-primary tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`flex-1 ${scrollable ? 'overflow-y-auto' : ''} ${noPadding ? '' : 'glass-body'}`}>
        {children}
      </div>
    </div>
  );
}
