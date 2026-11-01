import type { LatLng } from './geo';

export type EscortPriority = 'normal' | 'urgent';
export type EscortStatus = 'pending' | 'accepted' | 'en_route' | 'completed' | 'cancelled';

export type EscortRequest = {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  origin: LatLng & { name: string };
  destination: LatLng & { name: string };
  currentLocation: LatLng;
  routeLabel: string;
  priority: EscortPriority;
  reason: string;
  status: EscortStatus;
  requestedAt: number;
  acceptedBy?: string;
  acceptedAt?: number;
};
