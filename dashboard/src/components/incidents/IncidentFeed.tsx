import { useIncidentStore } from '../../stores/useIncidentStore';
import { IncidentCard } from './IncidentCard';
import { Badge } from '../primitives/Badge';
import { useMockIncidentData } from '../../hooks/useMockData';

type IncidentFeedProps = {
  compact?: boolean;
};

export function IncidentFeed({ compact = false }: IncidentFeedProps) {
  useMockIncidentData();
  const incidents = useIncidentStore((s) => s.incidents);
  const activeCount = incidents.filter((i) => i.status === 'active').length;

  if (compact) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[13px] font-semibold text-text-primary">Incidents</h3>
            <p className="text-[11px] text-text-quaternary mt-0.5">Live feed</p>
          </div>
          {activeCount > 0 && <Badge variant="high" dot>{activeCount} active</Badge>}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {incidents.slice(0, 20).map((inc) => (
            <IncidentCard key={inc.id} incident={inc} compact />
          ))}
          {incidents.length === 0 && (
            <p className="text-[11px] text-text-quaternary text-center py-8">No incidents</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header card */}
      <div className="glass-raised px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-text-primary">Active Incidents</h3>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              Sensor anomalies, verified reports, and unverified reports
            </p>
          </div>
          {activeCount > 0 && <Badge variant="high" dot>{activeCount} active</Badge>}
        </div>
      </div>

      <div className="space-y-3">
        {incidents.map((inc) => (
          <IncidentCard key={inc.id} incident={inc} />
        ))}
        {incidents.length === 0 && (
          <div className="glass-raised py-12">
            <p className="text-[13px] text-text-tertiary text-center">No incidents recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
