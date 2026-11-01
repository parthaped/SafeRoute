import { useSystemStore } from '../../stores/useSystemStore';
import { useThemeStore, type Theme } from '../../stores/useThemeStore';
import { SystemMetricRow } from './SystemMetricRow';
import { Panel } from '../primitives/Panel';
import { StatusIndicator } from '../primitives/StatusIndicator';
import type { ConnectionHealth } from '../../types/system';

export function SystemStatus() {
  const metrics = useSystemStore((s) => s.metrics);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const overallHealth: ConnectionHealth = metrics.some((m) => m.status === 'down')
    ? 'down'
    : metrics.some((m) => m.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  const healthLabel: Record<ConnectionHealth, string> = {
    healthy: 'All Systems Operational',
    degraded: 'Partial Degradation',
    down: 'System Outage Detected',
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Appearance settings */}
      <Panel title="Appearance" subtitle="Dashboard display preferences">
        <div className="space-y-4">
          <div>
            <p className="text-[12px] font-medium text-text-secondary mb-3">Theme</p>
            <div className="flex gap-3">
              <ThemeOption
                label="Light"
                value="light"
                current={theme}
                onSelect={setTheme}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                }
              />
              <ThemeOption
                label="Dark"
                value="dark"
                current={theme}
                onSelect={setTheme}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </Panel>

      {/* Overall health banner */}
      <div className={`glass-raised px-6 py-5 ${overallHealth === 'down' ? 'glow-red' : ''}`}>
        <div className="flex items-center gap-4">
          <StatusIndicator status={overallHealth} size="md" />
          <div>
            <p className="text-[17px] font-semibold text-text-primary">{healthLabel[overallHealth]}</p>
            <p className="text-[12px] text-text-tertiary mt-0.5">{metrics.length} subsystems monitored</p>
          </div>
        </div>
      </div>

      {/* Infrastructure detail */}
      <Panel title="Infrastructure" subtitle="Real-time subsystem health">
        <div>
          {metrics.map((m) => (
            <SystemMetricRow key={m.id} metric={m} />
          ))}
        </div>
      </Panel>

      {/* Data flow */}
      <Panel title="Edge Architecture" subtitle="Sensor-to-dashboard data pipeline">
        <div className="space-y-0">
          <ArchRow
            label="Sensor Fleet"
            detail="IoT sensors → 5G RAN uplink"
            status={metrics.find((m) => m.id === 'sensors')?.status ?? 'healthy'}
            first
          />
          <ArchRow
            label="5G Transport"
            detail="mmWave uplink → MEC ingest"
            status={metrics.find((m) => m.id === '5g-ran')?.status ?? 'healthy'}
          />
          <ArchRow
            label="Edge Inference"
            detail="MEC nodes → AI risk scoring"
            status={metrics.find((m) => m.id === 'mec')?.status ?? 'healthy'}
          />
          <ArchRow
            label="Firestore Sync"
            detail="Cloud DB → Dashboard + Mobile App (real-time)"
            status={metrics.find((m) => m.id === 'firestore')?.status ?? 'healthy'}
          />
          <ArchRow
            label="WebSocket"
            detail="Live push → Operations dashboard"
            status={metrics.find((m) => m.id === 'ws')?.status ?? 'healthy'}
            last
          />
        </div>
      </Panel>
    </div>
  );
}

function ThemeOption({
  label,
  value,
  current,
  onSelect,
  icon,
}: {
  label: string;
  value: Theme;
  current: Theme;
  onSelect: (t: Theme) => void;
  icon: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all cursor-pointer ${
        active
          ? 'border-accent-red bg-accent-red-subtle'
          : 'border-surface-border hover:border-surface-border-light hover:bg-surface-hover'
      }`}
    >
      <span className={active ? 'text-accent-red' : 'text-text-tertiary'}>{icon}</span>
      <span className={`text-[12px] font-semibold ${active ? 'text-accent-red' : 'text-text-secondary'}`}>
        {label}
      </span>
    </button>
  );
}

function ArchRow({
  label,
  detail,
  status,
  first = false,
  last = false,
}: {
  label: string;
  detail: string;
  status: ConnectionHealth;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex items-stretch gap-4 min-h-[48px]">
      <div className="flex flex-col items-center w-3 py-1">
        {!first && <div className="w-px flex-1 bg-surface-border" />}
        <StatusIndicator status={status} size="md" className="shrink-0 my-1" />
        {!last && <div className="w-px flex-1 bg-surface-border" />}
      </div>
      <div className="flex-1 flex items-center py-2">
        <div>
          <p className="text-[13px] font-medium text-text-primary">{label}</p>
          <p className="text-[11px] text-text-quaternary">{detail}</p>
        </div>
      </div>
    </div>
  );
}
