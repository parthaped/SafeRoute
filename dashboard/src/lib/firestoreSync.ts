/**
 * Firestore real-time sync layer.
 *
 * Shared collections between dashboard and mobile app:
 *   - `broadcasts`  — hazard alerts created by admin, shown to mobile users
 *   - `incidents`   — anomalies/reports; admin can verify/escalate, mobile users see status
 *   - `risk_segments` — per-segment risk scores pushed by edge pipeline, consumed by both
 *   - `posts`       — existing community posts collection (mobile app already writes here)
 *
 * Dashboard writes to these collections → mobile app's onSnapshot listeners
 * pick up changes in real time. Same Firebase project, same Firestore database.
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';
import type { Incident, IncidentStatus } from '../types/incident';
import type { Broadcast } from '../types/broadcast';
import type { SegmentRisk } from '../types/risk';

// ---------------------------------------------------------------------------
// Collection names (shared with mobile app)
// ---------------------------------------------------------------------------
const BROADCASTS_COL = 'broadcasts';
const INCIDENTS_COL = 'incidents';
const RISK_SEGMENTS_COL = 'risk_segments';

// ---------------------------------------------------------------------------
// Broadcasts (dashboard → mobile)
// ---------------------------------------------------------------------------

export function subscribeBroadcasts(
  onData: (broadcasts: Broadcast[]) => void,
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const q = query(collection(db, BROADCASTS_COL), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    const broadcasts: Broadcast[] = snap.docs.map((d) => docToBroadcast(d.id, d.data()));
    onData(broadcasts);
  });
}

export async function createBroadcast(broadcast: Omit<Broadcast, 'id'>): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const ref = await addDoc(collection(db, BROADCASTS_COL), {
    title: broadcast.title,
    message: broadcast.message,
    zone: broadcast.zone,
    status: broadcast.status,
    createdAt: Timestamp.fromMillis(broadcast.createdAt),
    expiresAt: Timestamp.fromMillis(broadcast.expiresAt),
    durationMinutes: broadcast.durationMinutes,
    affectedRouteCount: broadcast.affectedRouteCount,
    createdBy: broadcast.createdBy,
  });
  return ref.id;
}

export async function updateBroadcastStatus(id: string, status: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await updateDoc(doc(db, BROADCASTS_COL, id), { status });
}

function docToBroadcast(id: string, d: DocumentData): Broadcast {
  return {
    id,
    title: d.title ?? '',
    message: d.message ?? '',
    zone: d.zone ?? { id: '', polygon: [], label: '' },
    status: d.status ?? 'draft',
    createdAt: toEpoch(d.createdAt),
    expiresAt: toEpoch(d.expiresAt),
    durationMinutes: d.durationMinutes ?? 30,
    affectedRouteCount: d.affectedRouteCount ?? 0,
    createdBy: d.createdBy ?? 'Unknown',
  };
}

// ---------------------------------------------------------------------------
// Incidents (bidirectional: sensors/mobile → Firestore ← dashboard actions)
// ---------------------------------------------------------------------------

export function subscribeIncidents(
  onData: (incidents: Incident[]) => void,
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const q = query(collection(db, INCIDENTS_COL), orderBy('reportedAt', 'desc'), limit(100));
  return onSnapshot(q, (snap) => {
    const incidents: Incident[] = snap.docs.map((d) => docToIncident(d.id, d.data()));
    onData(incidents);
  });
}

export async function updateIncidentStatus(id: string, status: IncidentStatus): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await updateDoc(doc(db, INCIDENTS_COL, id), {
    status,
    updatedAt: Timestamp.now(),
  });
}

export async function createIncident(incident: Omit<Incident, 'id'>): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const ref = await addDoc(collection(db, INCIDENTS_COL), {
    type: incident.type,
    severity: incident.severity,
    status: incident.status,
    title: incident.title,
    description: incident.description,
    location: incident.location,
    segmentId: incident.segmentId ?? null,
    reportedAt: Timestamp.fromMillis(incident.reportedAt),
    updatedAt: Timestamp.now(),
    sensorId: incident.sensorId ?? null,
    assignedTo: incident.assignedTo ?? null,
  });
  return ref.id;
}

export async function deleteIncident(id: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await deleteDoc(doc(db, INCIDENTS_COL, id));
}

function docToIncident(id: string, d: DocumentData): Incident {
  return {
    id,
    type: d.type ?? 'unverified_report',
    severity: d.severity ?? 'medium',
    status: d.status ?? 'active',
    title: d.title ?? '',
    description: d.description ?? '',
    location: d.location ?? { lat: 0, lng: 0 },
    segmentId: d.segmentId ?? undefined,
    reportedAt: toEpoch(d.reportedAt),
    updatedAt: toEpoch(d.updatedAt),
    sensorId: d.sensorId ?? undefined,
    assignedTo: d.assignedTo ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Risk Segments (edge pipeline → Firestore → dashboard + mobile)
// ---------------------------------------------------------------------------

export function subscribeRiskSegments(
  onData: (segments: SegmentRisk[]) => void,
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const q = query(collection(db, RISK_SEGMENTS_COL), orderBy('score', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    const segments: SegmentRisk[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        segmentId: d.id,
        segment: data.segment ?? { id: d.id, path: [], name: d.id },
        level: data.level ?? 'low',
        score: data.score ?? 0,
        factors: data.factors ?? [],
        updatedAt: toEpoch(data.updatedAt),
        decayRate: data.decayRate ?? 0.3,
      } satisfies SegmentRisk;
    });
    onData(segments);
  });
}

// ---------------------------------------------------------------------------
// Active Routes (mobile → Firestore → dashboard, real-time)
// ---------------------------------------------------------------------------

const ACTIVE_ROUTES_COL = 'active_routes';

export type LiveRoute = {
  id: string;
  userId: string;
  userName: string;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  path: { lat: number; lng: number }[];
  label: string;
  durationText: string;
  distanceText: string;
  travelMode: string;
  status: string;
  startedAt: number;
};

export function subscribeActiveRoutes(
  onData: (routes: LiveRoute[]) => void,
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const q = query(collection(db, ACTIVE_ROUTES_COL), limit(50));
  return onSnapshot(q, (snap) => {
    const routes: LiveRoute[] = snap.docs
      .map((d) => docToLiveRoute(d.id, d.data()))
      .filter((r) => r.status === 'navigating');
    onData(routes);
  });
}

function docToLiveRoute(id: string, d: DocumentData): LiveRoute {
  return {
    id,
    userId: d.userId ?? id,
    userName: d.userName ?? 'Unknown User',
    origin: d.origin ?? { lat: 0, lng: 0, name: '' },
    destination: d.destination ?? { lat: 0, lng: 0, name: '' },
    path: Array.isArray(d.path) ? d.path : [],
    label: d.label ?? '',
    durationText: d.durationText ?? '',
    distanceText: d.distanceText ?? '',
    travelMode: d.travelMode ?? 'walking',
    status: d.status ?? 'navigating',
    startedAt: toEpoch(d.startedAt),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEpoch(val: unknown): number {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof (val as Timestamp).toMillis === 'function') return (val as Timestamp).toMillis();
  return Date.now();
}

export { isFirebaseConfigured };
