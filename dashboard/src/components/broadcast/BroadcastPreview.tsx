import type { Broadcast } from '../../types/broadcast';
import { Badge } from '../primitives/Badge';

type BroadcastPreviewProps = {
  broadcast: Broadcast;
};

const STATUS_VARIANT: Record<string, 'neutral' | 'low' | 'medium' | 'high'> = {
  draft: 'neutral',
  active: 'high',
  expired: 'neutral',
  cancelled: 'neutral',
};

export function BroadcastPreview({ broadcast }: BroadcastPreviewProps) {
  const remaining = Math.max(0, broadcast.expiresAt - Date.now());
  const remainingMin = Math.round(remaining / 60_000);

  return (
    <div className={`glass-raised animate-slide-up overflow-hidden ${broadcast.status === 'active' ? 'glow-red' : ''}`}>
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-text-primary truncate">{broadcast.title}</p>
            <p className="text-[11px] text-text-quaternary mt-0.5">{broadcast.zone.label}</p>
          </div>
          <Badge variant={STATUS_VARIANT[broadcast.status] ?? 'neutral'} dot>
            {broadcast.status}
          </Badge>
        </div>

        <div className="p-3.5 bg-surface-card rounded-xl border border-surface-border">
          <p className="text-[12px] text-text-secondary leading-relaxed">{broadcast.message}</p>
        </div>

        <div className="flex items-center gap-5 text-[11px] text-text-quaternary">
          <span>{broadcast.durationMinutes}m duration</span>
          {broadcast.status === 'active' && (
            <span className="text-accent-red font-medium">{remainingMin}m remaining</span>
          )}
          <span>{broadcast.affectedRouteCount} routes affected</span>
        </div>
      </div>
    </div>
  );
}
