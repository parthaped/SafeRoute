import { useState } from 'react';
import { useEscortStore } from '../../stores/useEscortStore';
import { useMockEscortData } from '../../hooks/useMockData';
import type { EscortRequest, EscortStatus } from '../../types/escort';

export function EscortPanel() {
  useMockEscortData();
  const requests = useEscortStore((s) => s.requests);
  const updateStatus = useEscortStore((s) => s.updateStatus);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');

  const filtered = requests.filter((r) => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'active') return r.status === 'accepted' || r.status === 'en_route';
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const activeCount = requests.filter((r) => r.status === 'accepted' || r.status === 'en_route').length;

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">
      {/* Header */}
      <div className="glass-raised px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.3px]">
              Escort Requests
            </h2>
            <p className="text-[13px] text-text-tertiary mt-1">
              Users requesting a walking escort from RUPD officers
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FF3B30]/[0.12] border border-[#FF3B30]/[0.15]">
                <span className="h-2 w-2 rounded-full bg-[#FF3B30] animate-pulse" />
                <span className="text-[12px] font-semibold text-[#FF3B30]">
                  {pendingCount} pending
                </span>
              </div>
            )}
            {activeCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00D4FF]/[0.10] border border-[#00D4FF]/[0.12]">
                <span className="h-2 w-2 rounded-full bg-[#00D4FF]" />
                <span className="text-[12px] font-semibold text-[#00D4FF]">
                  {activeCount} active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mt-4">
          {(['all', 'pending', 'active'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-[#E10600] text-white'
                  : 'bg-surface-card text-text-tertiary hover:bg-surface-hover hover:text-text-secondary'
              }`}
            >
              {f === 'all' ? `All (${requests.length})` : f === 'pending' ? `Pending (${pendingCount})` : `Active (${activeCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Requests list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="glass-raised p-12 text-center">
            <p className="text-[13px] text-text-quaternary">No escort requests match this filter</p>
          </div>
        )}
        {filtered.map((req) => (
          <EscortCard key={req.id} request={req} onUpdateStatus={updateStatus} />
        ))}
      </div>
    </div>
  );
}

function EscortCard({
  request: r,
  onUpdateStatus,
}: {
  request: EscortRequest;
  onUpdateStatus: (id: string, status: EscortStatus, officer?: string) => void;
}) {
  const isPending = r.status === 'pending';
  const isUrgent = r.priority === 'urgent';
  const borderColor = isPending
    ? isUrgent
      ? 'border-[#FF3B30]/30'
      : 'border-[#FFD60A]/20'
    : r.status === 'en_route'
      ? 'border-[#00D4FF]/20'
      : 'border-surface-border';

  return (
    <div className={`glass-raised p-5 ${borderColor} transition-all hover:bg-surface-hover`}>
      {/* Top row: user + priority + status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold ${
            isPending ? 'bg-[#FF3B30]/15 text-[#FF3B30]' : 'bg-[#00D4FF]/15 text-[#00D4FF]'
          }`}>
            {r.userName.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-text-primary tracking-[-0.2px]">{r.userName}</p>
            <p className="text-[11px] text-text-quaternary mt-0.5">{r.userPhone} · {r.userId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={r.priority} />
          <StatusBadge status={r.status} />
        </div>
      </div>

      {/* Route info */}
      <div className="p-3.5 rounded-lg bg-surface-card border border-surface-card-border mb-4">
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-text-quaternary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-[10px] font-semibold tracking-[1px] uppercase text-text-quaternary">Route</span>
        </div>
        <p className="text-[13px] text-text-secondary leading-relaxed mb-2">{r.routeLabel}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[9px] text-text-quaternary uppercase tracking-wide block mb-0.5">From</span>
            <span className="text-[12px] text-text-tertiary">{r.origin.name}</span>
          </div>
          <div>
            <span className="text-[9px] text-text-quaternary uppercase tracking-wide block mb-0.5">To</span>
            <span className="text-[12px] text-text-tertiary">{r.destination.name}</span>
          </div>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <span className="text-[10px] font-semibold tracking-[1px] uppercase text-text-quaternary block mb-1.5">Reason</span>
        <p className="text-[13px] text-text-tertiary leading-[1.7]">{r.reason}</p>
      </div>

      {/* Location + time */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricCard label="Location" value={`${r.currentLocation.lat.toFixed(4)}, ${r.currentLocation.lng.toFixed(4)}`} />
        <MetricCard label="Requested" value={timeAgo(r.requestedAt)} />
        {r.acceptedBy ? (
          <MetricCard label="Assigned" value={r.acceptedBy} accent="#00D4FF" />
        ) : (
          <MetricCard label="Wait Time" value={timeAgo(r.requestedAt)} accent={isPending ? '#FF3B30' : undefined} />
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateStatus(r.id, 'accepted', 'Ofc. R. Martinez')}
            className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold tracking-wide bg-[#E10600] text-white hover:bg-[#c50500] transition-colors cursor-pointer"
          >
            Accept Escort
          </button>
          <button
            onClick={() => onUpdateStatus(r.id, 'cancelled')}
            className="px-4 py-2.5 rounded-lg text-[12px] font-semibold tracking-wide bg-surface-card text-text-tertiary border border-surface-card-border hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Decline
          </button>
        </div>
      )}
      {r.status === 'accepted' && (
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateStatus(r.id, 'en_route')}
            className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold tracking-wide bg-[#00D4FF] text-black hover:bg-[#00b8dd] transition-colors cursor-pointer"
          >
            Mark En Route
          </button>
          <button
            onClick={() => onUpdateStatus(r.id, 'completed')}
            className="px-4 py-2.5 rounded-lg text-[12px] font-semibold tracking-wide bg-surface-card text-text-tertiary border border-surface-card-border hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Complete
          </button>
        </div>
      )}
      {r.status === 'en_route' && (
        <button
          onClick={() => onUpdateStatus(r.id, 'completed')}
          className="w-full py-2.5 rounded-lg text-[12px] font-semibold tracking-wide bg-[#2ECC71] text-black hover:bg-[#27ae60] transition-colors cursor-pointer"
        >
          Mark Completed
        </button>
      )}
      {(r.status === 'completed' || r.status === 'cancelled') && (
        <div className={`py-2 text-center text-[11px] font-semibold tracking-wide uppercase rounded-lg ${
          r.status === 'completed' ? 'bg-[#2ECC71]/10 text-[#2ECC71]' : 'bg-surface-card text-text-quaternary'
        }`}>
          {r.status === 'completed' ? 'Escort Completed' : 'Request Declined'}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const isUrgent = priority === 'urgent';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase ${
        isUrgent
          ? 'bg-[#FF3B30]/15 text-[#FF3B30]'
          : 'bg-[#FFD60A]/12 text-[#FFD60A]'
      }`}
    >
      {isUrgent && <span className="mr-1">!</span>}
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#FF3B30',
    accepted: '#FFD60A',
    en_route: '#00D4FF',
    completed: '#2ECC71',
    cancelled: '#666',
  };
  const c = colors[status] ?? '#888';
  const labels: Record<string, string> = {
    pending: 'Awaiting Response',
    accepted: 'Accepted',
    en_route: 'En Route',
    completed: 'Completed',
    cancelled: 'Declined',
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase"
      style={{ backgroundColor: c + '15', color: c }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {labels[status] ?? status}
    </span>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-surface-card border border-surface-card-border">
      <span className="text-[9px] text-text-quaternary block mb-0.5 tracking-wide uppercase">{label}</span>
      <span className="text-[12px] font-medium tracking-[-0.1px] text-text-secondary" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}

function timeAgo(epoch: number): string {
  const mins = Math.round((Date.now() - epoch) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
