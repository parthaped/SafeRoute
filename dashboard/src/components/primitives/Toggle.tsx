type ToggleProps = {
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
};

export function Toggle({ label, enabled, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-3 group cursor-pointer w-full py-1"
    >
      <span
        className={`relative inline-flex h-[22px] w-[38px] rounded-full transition-colors duration-200 ${
          enabled ? 'bg-accent-red' : 'bg-surface-border-light'
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors">
        {label}
      </span>
    </button>
  );
}
