import type { SystemMetric } from '../../types/system';
import { StatusIndicator } from '../primitives/StatusIndicator';

type SystemMetricRowProps = {
  metric: SystemMetric;
};

export function SystemMetricRow({ metric }: SystemMetricRowProps) {
  const age = Math.round((Date.now() - metric.lastChecked) / 1000);

  return (
    <div className="flex items-center justify-between py-4 border-b border-surface-border last:border-b-0 group">
      <div className="flex items-center gap-4">
        <StatusIndicator status={metric.status} size="md" />
        <div>
          <p className="text-[13px] font-medium text-text-primary">{metric.label}</p>
          {metric.detail && (
            <p className="text-[11px] text-text-quaternary mt-0.5">{metric.detail}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-mono text-text-secondary tabular-nums">{metric.value}</p>
        <p className="text-[10px] text-text-quaternary mt-0.5">{age}s ago</p>
      </div>
    </div>
  );
}
