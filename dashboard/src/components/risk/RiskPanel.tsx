import { useRiskStore } from '../../stores/useRiskStore';
import { RiskSegmentCard } from './RiskSegmentCard';
import { Panel } from '../primitives/Panel';
import { useMockRiskData } from '../../hooks/useMockData';

export function RiskPanel() {
  useMockRiskData();
  const segments = useRiskStore((s) => s.segments);

  const sorted = [...segments].sort((a, b) => b.score - a.score);
  const highCount = segments.filter((s) => s.level === 'high' || s.level === 'critical').length;
  const avg = segments.length
    ? Math.round(segments.reduce((sum, s) => sum + s.score, 0) / segments.length)
    : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Monitored" value={segments.length.toString()} />
        <StatCard label="Elevated Risk" value={highCount.toString()} accent={highCount > 0} />
        <StatCard label="Avg Score" value={avg.toString()} />
      </div>

      {/* Segments */}
      <div className="space-y-3">
        <p className="label-caps px-1">Segments by Risk Level</p>
        {sorted.map((seg) => (
          <RiskSegmentCard key={seg.segmentId} segment={seg} />
        ))}
        {sorted.length === 0 && (
          <Panel>
            <p className="text-[13px] text-text-tertiary text-center py-8">No segment data available</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`glass-raised px-5 py-4 ${accent ? 'glow-red' : ''}`}>
      <p className="label-caps">{label}</p>
      <p className={`text-[28px] font-bold font-mono mt-1 tabular-nums tracking-tight ${accent ? 'text-accent-red' : 'text-text-primary'}`}>
        {value}
      </p>
    </div>
  );
}
