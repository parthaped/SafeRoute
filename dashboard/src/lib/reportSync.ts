/**
 * Officer report Firestore sync.
 *
 * Collections:
 *   - `officer_reports` — reports filed by police/admin from this dashboard
 *   - `posts`           — community posts from mobile app users (read-only here)
 *
 * When an officer files a report with broadcastToUsers=true, a corresponding
 * document is also written to `broadcasts` so mobile users are notified.
 * When addToHeatmap=true, the data feeds into the risk engine.
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';
import type { OfficerReport, ReportStatus, CommunityPost } from '../types/report';

const REPORTS_COL = 'officer_reports';
const POSTS_COL = 'posts';
const BROADCASTS_COL = 'broadcasts';

// ---------------------------------------------------------------------------
// Officer Reports
// ---------------------------------------------------------------------------

export function subscribeOfficerReports(
  onData: (reports: OfficerReport[]) => void,
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const q = query(collection(db, REPORTS_COL), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q, (snap) => {
    const reports: OfficerReport[] = snap.docs.map((d) => docToReport(d.id, d.data()));
    onData(reports);
  });
}

export async function createOfficerReport(
  report: Omit<OfficerReport, 'id'>,
): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const ref = await addDoc(collection(db, REPORTS_COL), {
    crimeType: report.crimeType,
    title: report.title,
    description: report.description,
    location: report.location,
    locationName: report.locationName,
    priority: report.priority,
    status: report.status,
    source: report.source,
    officerId: report.officerId,
    officerName: report.officerName,
    createdAt: Timestamp.fromMillis(report.createdAt),
    updatedAt: Timestamp.now(),
    broadcastToUsers: report.broadcastToUsers,
    addToHeatmap: report.addToHeatmap,
  });

  // Auto-create broadcast if officer flagged it
  if (report.broadcastToUsers) {
    await addDoc(collection(db, BROADCASTS_COL), {
      title: `${report.crimeType} — ${report.locationName}`,
      message: report.description,
      zone: { id: ref.id, polygon: [], label: report.locationName },
      status: 'active',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60_000), // 1 hour default
      durationMinutes: 60,
      affectedRouteCount: 0,
      createdBy: report.officerName,
    });
  }

  return ref.id;
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus,
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await updateDoc(doc(db, REPORTS_COL, id), { status, updatedAt: Timestamp.now() });
}

function docToReport(id: string, d: DocumentData): OfficerReport {
  return {
    id,
    crimeType: d.crimeType ?? 'Other',
    title: d.title ?? '',
    description: d.description ?? '',
    location: d.location ?? { lat: 0, lng: 0 },
    locationName: d.locationName ?? '',
    priority: d.priority ?? 'medium',
    status: d.status ?? 'active',
    source: d.source ?? 'officer',
    officerId: d.officerId ?? '',
    officerName: d.officerName ?? '',
    createdAt: toEpoch(d.createdAt),
    updatedAt: toEpoch(d.updatedAt),
    broadcastToUsers: d.broadcastToUsers ?? false,
    addToHeatmap: d.addToHeatmap ?? false,
  };
}

// ---------------------------------------------------------------------------
// Community Posts (read-only from mobile app)
// ---------------------------------------------------------------------------

export function subscribeCommunityPosts(
  onData: (posts: CommunityPost[]) => void,
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) return null;

  const q = query(collection(db, POSTS_COL), orderBy('timestamp', 'desc'), limit(200));
  return onSnapshot(q, (snap) => {
    const posts: CommunityPost[] = snap.docs.map((d) => {
      const data = d.data();
      const ts = data.timestamp;
      return {
        id: d.id,
        content: data.content ?? '',
        type: data.type === 'negative' ? 'negative' : 'positive',
        timestamp: ts?.toDate?.() ?? new Date(ts ?? Date.now()),
        verified: !!data.verified,
        location: data.location ?? undefined,
        authorId: data.authorId ?? '',
      };
    });
    onData(posts);
  });
}

export { isFirebaseConfigured };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEpoch(val: unknown): number {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof (val as Timestamp).toMillis === 'function') return (val as Timestamp).toMillis();
  return Date.now();
}
