import { Button } from '../primitives/Button';
import { useIncidentStore } from '../../stores/useIncidentStore';
import type { Incident } from '../../types/incident';

type IncidentActionsProps = {
  incident: Incident;
};

export function IncidentActions({ incident }: IncidentActionsProps) {
  const updateStatus = useIncidentStore((s) => s.updateStatus);

  if (incident.status !== 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-quaternary">
        <span className="h-1 w-1 rounded-full bg-current" />
        {incident.status}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="primary"
        onClick={() => updateStatus(incident.id, 'verified')}
      >
        Verify
      </Button>
      <Button
        size="sm"
        variant="danger"
        onClick={() => updateStatus(incident.id, 'escalated')}
      >
        Escalate
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => updateStatus(incident.id, 'dismissed')}
      >
        Dismiss
      </Button>
    </div>
  );
}
