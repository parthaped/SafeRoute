import type { SegmentRisk } from '../../types/risk';
import { Badge } from '../primitives/Badge';
import { RiskBreakdown } from './RiskBreakdown';
import { useRiskStore } from '../../stores/useRiskStore';

type RiskSegmentCardProps = {
  segment: SegmentRisk;
};

export function RiskSegmentCard({ segment }: RiskSegmentCardProps) {
  const expandedId = useRiskStore((s) => s.expandedSegmentId);
  const expand = useRiskStore((s) => s.expand);
  const isExpanded = expandedId === segment.segmentId;

  const ageMinutes = Math.round((Date.now() - segment.updatedAt) / 60_000);
  const decayedScore = Math.max(0, segment.score - segment.decayRate * ageMinutes);

  return (
    <div className="glass-raised animate-slide-up overflow-hidden">
      <button
        onClick={() => expand(isExpanded ? null : segment.segmentId)}
        className="w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Score pill */}
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-[15px] font-bold font-mono"
            style={{
              backgroundColor: levelBg(segment.level),
              color: levelColor(segment.level),
            }}
          >
            {Math.round(decayedScore)}
          </div>
          <div className="text-left">
            <p className="text-[13px] font-medium text-text-primary">
              {segment.segment.name ?? `Segment ${segment.segmentId}`}
            </p>
            <p className="text-[11px] text-text-quaternary mt-0.5">
              Updated {ageMinutes}m ago
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={segment.level} dot>{segment.level}</Badge>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-text-quaternary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 pt-1 border-t border-surface-border animate-fade-in">
          <RiskBreakdown factors={segment.factors} />
          <div className="mt-4 p-4 bg-surface-card rounded-xl border border-surface-border">
            <p className="label-caps mb-2">Why is this flagged?</p>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              {explainRisk(segment)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function levelColor(level: string): string {
  const map: Record<string, string> = { low: '#2ECC71', medium: '#FFD60A', high: '#E10600', critical: '#FF3B30' };
  return map[level] ?? '#fff';
}

function levelBg(level: string): string {
  const map: Record<string, string> = {
    low: 'rgba(46,204,113,0.12)',
    medium: 'rgba(255,214,10,0.12)',
    high: 'rgba(225,6,0,0.12)',
    critical: 'rgba(255,59,48,0.15)',
  };
  return map[level] ?? 'rgba(255,255,255,0.05)';
}

function explainRisk(seg: SegmentRisk): string {
  const top = [...seg.factors]
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .slice(0, 2);

  const parts = top.map((f) => {
    switch (f.factor) {
      case 'lighting': return 'low lighting conditions in this area';
      case 'density': return 'reduced pedestrian density reducing natural surveillance';
      case 'verified_reports': return 'recent verified incident reports nearby';
      case 'environmental': return 'environmental factors such as weather or construction';
      case 'sensor_anomaly': return 'an active sensor anomaly detected in this segment';
      case 'time_of_day': return 'historically elevated risk at this time of day';
      default: return f.label.toLowerCase();
    }
  });

  return `This segment has elevated risk primarily due to ${parts.join(' and ')}.`;
}
