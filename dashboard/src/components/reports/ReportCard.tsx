import type { OfficerReport } from '../../types/report';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { useReportStore } from '../../stores/useReportStore';

type ReportCardProps = {
  report: OfficerReport;
};

const SOURCE_LABEL: Record<string, string> = {
  officer: 'Officer Report',
  user: 'User Report',
  sensor: 'Sensor Detected',
};

const STATUS_OPTIONS: { value: OfficerReport['status']; label: string }[] = [
  { value: 'responding', label: 'Responding' },
  { value: 'under_investigation', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'unfounded', label: 'Unfounded' },
];

export function ReportCard({ report }: ReportCardProps) {
  const updateStatus = useReportStore((s) => s.updateStatus);
  const age = formatAge(report.createdAt);

  return (
    <div className={`glass-raised animate-slide-up overflow-hidden ${report.priority === 'critical' ? 'glow-red' : ''}`}>
      <div className="px-5 py-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={report.priority} dot>{report.priority}</Badge>
              <Badge variant="neutral">{report.crimeType}</Badge>
              {report.broadcastToUsers && (
                <Badge variant="high" dot>Live</Badge>
              )}
            </div>
            <p className="text-[14px] font-semibold text-text-primary">{report.title}</p>
            <p className="text-[11px] text-text-quaternary mt-0.5">
              {SOURCE_LABEL[report.source] ?? 'Report'} &middot; {report.officerName} &middot; {age}
            </p>
          </div>
          <StatusBadge status={report.status} />
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-[12px] text-text-tertiary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{report.locationName || `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`}</span>
        </div>

        {/* Description */}
        <p className="text-[12px] text-text-secondary leading-relaxed">{report.description}</p>

        {/* Actions */}
        {report.status === 'active' && (
          <div className="flex items-center gap-2 pt-1">
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={opt.value === 'resolved' ? 'primary' : opt.value === 'unfounded' ? 'ghost' : 'secondary'}
                onClick={() => updateStatus(report.id, opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'text-accent-red bg-accent-red-subtle',
    responding: 'text-risk-medium bg-risk-medium-bg',
    under_investigation: 'text-accent-blue bg-accent-blue-subtle',
    resolved: 'text-accent-green bg-accent-green-subtle',
    unfounded: 'text-text-quaternary bg-surface-hover',
  };
  const labels: Record<string, string> = {
    active: 'Active',
    responding: 'Responding',
    under_investigation: 'Investigating',
    resolved: 'Resolved',
    unfounded: 'Unfounded',
  };
  return (
    <span className={`shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${styles[status] ?? styles['active']}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatAge(epochMs: number): string {
  const mins = Math.round((Date.now() - epochMs) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
