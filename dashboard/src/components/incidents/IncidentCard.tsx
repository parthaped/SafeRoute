import type { Incident } from '../../types/incident';
import { incidentTypeLabel } from '../../types/incident';
import { Badge } from '../primitives/Badge';
import { IncidentActions } from './IncidentActions';

type IncidentCardProps = {
  incident: Incident;
  compact?: boolean;
};

const TYPE_ICON: Record<string, { letter: string; color: string; bg: string }> = {
  sensor_anomaly: { letter: 'S', color: '#FFD60A', bg: 'rgba(255,214,10,0.12)' },
  verified_report: { letter: 'V', color: '#2ECC71', bg: 'rgba(46,204,113,0.12)' },
  unverified_report: { letter: 'U', color: '#E10600', bg: 'rgba(225,6,0,0.12)' },
};

export function IncidentCard({ incident, compact = false }: IncidentCardProps) {
  const age = formatAge(incident.reportedAt);
  const icon = TYPE_ICON[incident.type] ?? TYPE_ICON['unverified_report']!;

  return (
    <div className="glass-raised animate-slide-up overflow-hidden">
      <div className={`${compact ? 'px-4 py-3' : 'px-5 py-4'} space-y-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold"
              style={{ backgroundColor: icon.bg, color: icon.color }}
            >
              {icon.letter}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-text-primary truncate">
                {incident.title}
              </p>
              <p className="text-[11px] text-text-quaternary mt-0.5">
                {incidentTypeLabel[incident.type]} &middot; {age}
              </p>
            </div>
          </div>
          <Badge variant={incident.severity} dot>{incident.severity}</Badge>
        </div>

        {!compact && incident.description && (
          <p className="text-[12px] text-text-secondary leading-relaxed pl-11">
            {incident.description}
          </p>
        )}

        <div className={compact ? '' : 'pl-11'}>
          <IncidentActions incident={incident} />
        </div>
      </div>
    </div>
  );
}

function formatAge(epochMs: number): string {
  const mins = Math.round((Date.now() - epochMs) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}
