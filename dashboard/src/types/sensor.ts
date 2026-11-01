import type { LatLng } from './geo';

export type SensorType =
  | 'environmental'
  | 'motion'
  | 'acoustic'
  | 'light';

export type SensorHealth = 'online' | 'degraded' | 'offline';

export type Sensor = {
  id: string;
  type: SensorType;
  label: string;
  location: LatLng;
  health: SensorHealth;
  lastPing: number;         // epoch ms
  battery?: number;         // 0–100
  firmware: string;
  anomalyActive: boolean;
};
