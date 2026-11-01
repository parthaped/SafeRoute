import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { LiveMap } from '../map/LiveMap';
import { MapControls } from '../map/MapControls';
import { MapDetailPanel } from '../map/MapDetailPanel';
import { RiskPanel } from '../risk/RiskPanel';
import { ReportsPanel } from '../reports/ReportsPanel';
import { IncidentFeed } from '../incidents/IncidentFeed';
import { BroadcastPanel } from '../broadcast/BroadcastPanel';
import { SystemStatus } from '../system/SystemStatus';
import { EscortPanel } from '../escorts/EscortPanel';

const PANEL_META: Record<string, { title: string; subtitle: string }> = {
  map: { title: 'Live Operations Map', subtitle: 'Real-time campus monitoring and response' },
  risk: { title: 'Risk Intelligence', subtitle: 'Segment-level risk analysis and breakdown' },
  reports: { title: 'Officer Reports', subtitle: 'File, track, and manage field reports' },
  incidents: { title: 'Incident Feed', subtitle: 'Sensor anomalies and automated alerts' },
  broadcast: { title: 'Broadcast Control', subtitle: 'Hazard notifications synced to all users' },
  escorts: { title: 'Escort Requests', subtitle: 'Walking escort requests from students and staff' },
  system: { title: 'System & Settings', subtitle: 'Infrastructure health and dashboard preferences' },
};

export function DashboardLayout() {
  const [activePanel, setActivePanel] = useState('map');
  const meta = PANEL_META[activePanel] ?? PANEL_META['map']!;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-base">
      <Sidebar activePanel={activePanel} onNavigate={setActivePanel} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={meta.title} subtitle={meta.subtitle} />

        <main className="flex-1 overflow-hidden">
          {activePanel === 'map' && (
            <div className="flex h-full">
              <div className="flex-1 relative">
                <LiveMap />
                <MapControls />
                <MapDetailPanel />
              </div>
              <div className="w-[340px] border-l border-surface-border bg-surface-base/60 backdrop-blur-[40px] flex flex-col overflow-hidden">
                <IncidentFeed compact />
              </div>
            </div>
          )}

          {activePanel === 'risk' && (
            <div className="h-full overflow-y-auto p-6">
              <RiskPanel />
            </div>
          )}

          {activePanel === 'reports' && (
            <div className="h-full overflow-y-auto p-6">
              <ReportsPanel />
            </div>
          )}

          {activePanel === 'incidents' && (
            <div className="h-full overflow-y-auto p-6">
              <IncidentFeed />
            </div>
          )}

          {activePanel === 'broadcast' && (
            <div className="h-full overflow-y-auto p-6">
              <BroadcastPanel />
            </div>
          )}

          {activePanel === 'escorts' && (
            <div className="h-full overflow-y-auto p-6">
              <EscortPanel />
            </div>
          )}

          {activePanel === 'system' && (
            <div className="h-full overflow-y-auto p-6">
              <SystemStatus />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
