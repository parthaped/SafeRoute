import type { LatLng } from './geo';

export type BroadcastStatus = 'draft' | 'active' | 'expired' | 'cancelled';

export type HazardZone = {
  id: string;
  polygon: LatLng[];     // geofence vertices
  label: string;
};

export type Broadcast = {
  id: string;
  title: string;
  message: string;
  zone: HazardZone;
  status: BroadcastStatus;
  createdAt: number;
  expiresAt: number;      // epoch ms
  durationMinutes: number;
  affectedRouteCount: number;
  createdBy: string;
};
