import { create } from 'zustand';
import type { HeatmapPoint } from '../types/risk';
import type { Sensor } from '../types/sensor';
import type { LatLng } from '../types/geo';

export type ActiveRoute = {
  id: string;
  path: LatLng[];
  userId: string;
  label: string;
  color?: string;
};

export type PatrolSuggestion = {
  id: string;
  path: LatLng[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  label: string;
};

export type MarkerDetail =
  | { kind: 'incident'; id: string; title: string; description: string; severity: string; status: string; reportedAt: number; sensorId?: string; location: LatLng }
  | { kind: 'sensor'; id: string; label: string; type: string; health: string; battery?: number; firmware: string; location: LatLng }
  | { kind: 'broadcast'; id: string; title: string; message: string; zoneLabel: string; createdAt: number; createdBy: string; affectedRouteCount: number; location: LatLng }
  | { kind: 'patrol'; id: string; label: string; reason: string; priority: string; location: LatLng }
  | { kind: 'route'; id: string; label: string; userId: string; location: LatLng };

type MapLayerVisibility = {
  heatmap: boolean;
  activeRoutes: boolean;
  sensorAnomalies: boolean;
  reports: boolean;
  hazardBroadcasts: boolean;
  patrolSuggestions: boolean;
};

type MapStore = {
  center: [number, number];
  zoom: number;
  layers: MapLayerVisibility;
  heatmapData: HeatmapPoint[];
  sensors: Sensor[];
  activeRoutes: ActiveRoute[];
  patrolSuggestions: PatrolSuggestion[];
  selectedSegmentId: string | null;
  markerDetail: MarkerDetail | null;

  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  toggleLayer: (layer: keyof MapLayerVisibility) => void;
  setHeatmapData: (data: HeatmapPoint[]) => void;
  setSensors: (sensors: Sensor[]) => void;
  setActiveRoutes: (routes: ActiveRoute[]) => void;
  setPatrolSuggestions: (suggestions: PatrolSuggestion[]) => void;
  selectSegment: (id: string | null) => void;
  openMarkerDetail: (detail: MarkerDetail) => void;
  closeMarkerDetail: () => void;
};

export const useMapStore = create<MapStore>((set) => ({
  center: [-74.4474, 40.5008],
  zoom: 15,
  layers: {
    heatmap: true,
    activeRoutes: true,
    sensorAnomalies: true,
    reports: true,
    hazardBroadcasts: true,
    patrolSuggestions: true,
  },
  heatmapData: [],
  sensors: [],
  activeRoutes: [],
  patrolSuggestions: [],
  selectedSegmentId: null,
  markerDetail: null,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  toggleLayer: (layer) =>
    set((s) => ({
      layers: { ...s.layers, [layer]: !s.layers[layer] },
    })),
  setHeatmapData: (data) => set({ heatmapData: data }),
  setSensors: (sensors) => set({ sensors }),
  setActiveRoutes: (routes) => set({ activeRoutes: routes }),
  setPatrolSuggestions: (suggestions) => set({ patrolSuggestions: suggestions }),
  selectSegment: (id) => set({ selectedSegmentId: id }),
  openMarkerDetail: (detail) => set({ markerDetail: detail }),
  closeMarkerDetail: () => set({ markerDetail: null }),
}));
