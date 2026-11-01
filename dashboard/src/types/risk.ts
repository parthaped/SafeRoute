import type { RiskLevel } from '../tokens/colors';
import type { GeoSegment } from './geo';

export type RiskFactor =
  | 'lighting'
  | 'density'
  | 'verified_reports'
  | 'environmental'
  | 'sensor_anomaly'
  | 'time_of_day';

export type RiskFactorScore = {
  factor: RiskFactor;
  label: string;
  score: number;     // 0–100
  weight: number;    // 0–1, how much this factor contributes
};

export type SegmentRisk = {
  segmentId: string;
  segment: GeoSegment;
  level: RiskLevel;
  score: number;              // 0–100 composite
  factors: RiskFactorScore[];
  updatedAt: number;          // epoch ms
  decayRate: number;          // score reduction per minute since last event
};

export type HeatmapPoint = {
  lat: number;
  lng: number;
  weight: number;   // 0–1 intensity
};
