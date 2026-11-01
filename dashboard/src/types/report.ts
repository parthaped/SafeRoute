import type { LatLng } from './geo';

/**
 * Crime types — matches the mobile app's CRIME_TYPES in incidentReporting.ts.
 * Officers can use the same categories + additional law-enforcement ones.
 */
export const CRIME_TYPES = [
  'Assault',
  'Burglary',
  'Robbery',
  'Theft',
  'Vandalism',
  'Harassment',
  'Drug Activity',
  'Suspicious Activity',
  'Vehicle Break-in',
  'Public Disturbance',
  'Domestic Violence',
  'Weapons Offense',
  'Trespassing',
  'Sexual Assault',
  'Arson',
  'DUI / Intoxication',
  'Missing Person',
  'Medical Emergency',
  'Other',
] as const;

export type CrimeType = (typeof CRIME_TYPES)[number];

export type ReportSource = 'officer' | 'user' | 'sensor';

export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus =
  | 'active'
  | 'responding'
  | 'resolved'
  | 'unfounded'
  | 'under_investigation';

export type OfficerReport = {
  id: string;
  crimeType: CrimeType;
  title: string;
  description: string;
  location: LatLng;
  locationName: string;
  priority: ReportPriority;
  status: ReportStatus;
  source: ReportSource;
  officerId: string;
  officerName: string;
  createdAt: number;
  updatedAt: number;
  /** If true, this report generates a broadcast to mobile app users */
  broadcastToUsers: boolean;
  /** If true, this feeds into the crime heatmap data */
  addToHeatmap: boolean;
};

/**
 * Community posts from the mobile app (Firebase `posts` collection).
 * Read-only on dashboard — officers can view but posts are authored by users.
 */
export type CommunityPost = {
  id: string;
  content: string;
  type: 'positive' | 'negative';
  timestamp: Date;
  verified: boolean;
  location?: { latitude: number; longitude: number };
  authorId: string;
};
