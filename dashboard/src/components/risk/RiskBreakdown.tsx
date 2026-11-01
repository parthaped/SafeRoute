import type { RiskFactorScore } from '../../types/risk';

const FACTOR_LABELS: Record<string, string> = {
  lighting: 'Lighting Conditions',
  density: 'Pedestrian Density',
  verified_reports: 'Verified Reports',
  environmental: 'Environmental',
  sensor_anomaly: 'Sensor Anomaly',
  time_of_day: 'Time of Day',
};

type RiskBreakdownProps = {
  factors: RiskFactorScore[];
};

export function RiskBreakdown({ factors }: RiskBreakdownProps) {
  const sorted = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight);

  return (
    <div className="space-y-3">
      <p className="label-caps">Contributing Factors</p>
      {sorted.map((f) => {
        const contribution = Math.round(f.score * f.weight);
        return (
          <div key={f.factor} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-text-secondary">
                {FACTOR_LABELS[f.factor] ?? f.label}
              </span>
              <span className="text-[11px] font-mono text-text-tertiary tabular-nums">
                {contribution}
              </span>
            </div>
            <div className="h-[3px] w-full bg-surface-card-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(contribution, 100)}%`,
                  backgroundColor: barColor(contribution),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function barColor(value: number): string {
  if (value >= 70) return '#E10600';
  if (value >= 40) return '#FFD60A';
  return '#2ECC71';
}
