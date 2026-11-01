export type ConnectionHealth = 'healthy' | 'degraded' | 'down';

export type SystemMetric = {
  id: string;
  label: string;
  status: ConnectionHealth;
  value: string;
  detail?: string;
  lastChecked: number;
};

export type SystemState = {
  fiveGRan: SystemMetric;
  mecEdge: SystemMetric;
  sensorFleet: SystemMetric;
  aiModel: SystemMetric;
  webSocket: SystemMetric;
};
