import { useState } from 'react';
import { useReportStore } from '../../stores/useReportStore';
import { ReportCard } from './ReportCard';
import { CommunityFeed } from './CommunityFeed';
import { ReportForm } from './ReportForm';
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';
import { useMockReportData } from '../../hooks/useMockData';

type Tab = 'officer' | 'community';

export function ReportsPanel() {
  useMockReportData();
  const [tab, setTab] = useState<Tab>('officer');
  const [showForm, setShowForm] = useState(false);
  const officerReports = useReportStore((s) => s.officerReports);
  const communityPosts = useReportStore((s) => s.communityPosts);

  const activeReports = officerReports.filter((r) => r.status === 'active').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header + tabs */}
      <div className="glass-raised px-5 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-text-primary">Reports</h3>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              Officer reports, user submissions, and community alerts
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setShowForm(true)}>
            File Report
          </Button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-surface-card rounded-xl p-1">
          <TabButton
            active={tab === 'officer'}
            onClick={() => setTab('officer')}
            badge={activeReports > 0 ? activeReports : undefined}
          >
            Officer Reports
          </TabButton>
          <TabButton
            active={tab === 'community'}
            onClick={() => setTab('community')}
            badge={communityPosts.length > 0 ? communityPosts.length : undefined}
          >
            Community Posts
          </TabButton>
        </div>
      </div>

      {/* Form */}
      {showForm && <ReportForm onClose={() => setShowForm(false)} />}

      {/* Content */}
      {tab === 'officer' && (
        <div className="space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            <MiniStat label="Active" value={officerReports.filter((r) => r.status === 'active').length} accent />
            <MiniStat label="Responding" value={officerReports.filter((r) => r.status === 'responding').length} />
            <MiniStat label="Investigating" value={officerReports.filter((r) => r.status === 'under_investigation').length} />
            <MiniStat label="Resolved" value={officerReports.filter((r) => r.status === 'resolved').length} />
          </div>

          {officerReports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
          {officerReports.length === 0 && !showForm && (
            <div className="glass-raised py-12 text-center">
              <p className="text-[13px] text-text-tertiary">No officer reports filed yet</p>
              <p className="text-[11px] text-text-quaternary mt-1">Click "File Report" to create one</p>
            </div>
          )}
        </div>
      )}

      {tab === 'community' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <p className="label-caps">User Community Posts</p>
            <Badge variant="neutral">{communityPosts.length} posts</Badge>
          </div>
          <CommunityFeed />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-medium rounded-lg transition-all cursor-pointer ${
        active
          ? 'bg-surface-overlay text-text-primary'
          : 'text-text-tertiary hover:text-text-secondary'
      }`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-accent-red/20 text-accent-red' : 'bg-surface-hover text-text-quaternary'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function MiniStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="glass-raised px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-quaternary">{label}</p>
      <p className={`text-[20px] font-bold font-mono mt-0.5 tabular-nums ${accent && value > 0 ? 'text-accent-red' : 'text-text-primary'}`}>
        {value}
      </p>
    </div>
  );
}
