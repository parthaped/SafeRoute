import { Toggle } from '../primitives/Toggle';
import { useMapStore } from '../../stores/useMapStore';
import { useIncidentStore } from '../../stores/useIncidentStore';
import { useBroadcastStore } from '../../stores/useBroadcastStore';

type LayerMeta = {
  key: string;
  label: string;
  count: number;
};

export function MapControls() {
  const layers = useMapStore((s) => s.layers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);

  const heatmapCount = useMapStore((s) => s.heatmapData.length);
  const routeCount = useMapStore((s) => s.activeRoutes.length);
  const sensorCount = useMapStore((s) => s.sensors.filter((s) => s.anomalyActive).length);
  const incidentCount = useIncidentStore((s) =>
    s.incidents.filter((i) => i.status === 'active' || i.status === 'escalated').length
  );
  const broadcastCount = useBroadcastStore((s) =>
    s.broadcasts.filter((b) => b.status === 'active').length
  );
  const patrolCount = useMapStore((s) => s.patrolSuggestions.length);

  const layerMeta: LayerMeta[] = [
    { key: 'heatmap', label: 'Risk Heatmap', count: heatmapCount },
    { key: 'activeRoutes', label: 'Active Routes', count: routeCount },
    { key: 'sensorAnomalies', label: 'Sensor Anomalies', count: sensorCount },
    { key: 'reports', label: 'Incident Reports', count: incidentCount },
    { key: 'hazardBroadcasts', label: 'Hazard Zones', count: broadcastCount },
    { key: 'patrolSuggestions', label: 'Patrol Suggestions', count: patrolCount },
  ];

  return (
    <div className="absolute top-4 left-4 z-10 bg-surface-sidebar backdrop-blur-[30px] border border-surface-border rounded-2xl p-4 w-60">
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-text-quaternary mb-3">
        Map Layers
      </p>
      <div className="space-y-1.5">
        {layerMeta.map(({ key, label, count }) => (
          <div key={key} className="flex items-center justify-between">
            <Toggle
              label={label}
              enabled={layers[key as keyof typeof layers]}
              onChange={() => toggleLayer(key as keyof typeof layers)}
            />
            {count > 0 && (
              <span className="text-[10px] tabular-nums text-text-quaternary min-w-[20px] text-right">
                {count}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
