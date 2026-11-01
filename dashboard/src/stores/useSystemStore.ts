import { create } from 'zustand';
import type { SystemMetric, ConnectionHealth } from '../types/system';

function metric(
  id: string,
  label: string,
  value: string,
  status: ConnectionHealth = 'healthy',
  detail?: string,
): SystemMetric {
  return { id, label, status, value, detail, lastChecked: Date.now() };
}

type SystemStore = {
  metrics: SystemMetric[];
  wsConnected: boolean;

  updateMetric: (id: string, patch: Partial<SystemMetric>) => void;
  setWsConnected: (v: boolean) => void;
};

export const useSystemStore = create<SystemStore>((set) => ({
  metrics: [
    metric('5g-ran', '5G RAN', '28 GHz mmWave', 'healthy', 'Latency 4ms'),
    metric('mec', 'MEC Edge', '3 nodes active', 'healthy', 'Load 42%'),
    metric('sensors', 'Sensor Fleet', '147 / 152 online', 'healthy', '96.7% uptime'),
    metric('ai-model', 'AI Model', 'v2.4.1 deployed', 'healthy', 'Edge inference active'),
    metric('firestore', 'Firestore Sync', 'Demo Mode', 'healthy', 'Static demo data active'),
    metric('ws', 'WebSocket', 'Connected', 'healthy', 'Last ping 120ms'),
  ],
  wsConnected: false,

  updateMetric: (id, patch) =>
    set((s) => ({
      metrics: s.metrics.map((m) =>
        m.id === id ? { ...m, ...patch, lastChecked: Date.now() } : m
      ),
    })),

  setWsConnected: (v) => set({ wsConnected: v }),
}));
