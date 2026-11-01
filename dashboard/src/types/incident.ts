import type { LatLng } from './geo';
import type { RiskLevel } from '../tokens/colors';

export type IncidentType =
  | 'sensor_anomaly'
  | 'verified_report'
  | 'unverified_report';

export type IncidentSeverity = RiskLevel;

export type IncidentStatus =
  | 'active'
  | 'verified'
  | 'dismissed'
  | 'escalated';

export type Incident = {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  location: LatLng;
  segmentId?: string;
  reportedAt: number;       // epoch ms
  updatedAt: number;
  sensorId?: string;
  assignedTo?: string;
};

export const incidentTypeLabel: Record<IncidentType, string> = {
  sensor_anomaly: 'Sensor Anomaly',
  verified_report: 'Verified Report',
  unverified_report: 'Unverified Report',
};
