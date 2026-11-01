import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config';

const COLLECTION = 'active_routes';

export type ActiveRoutePayload = {
  userId: string;
  userName: string;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  path: { lat: number; lng: number }[];
  label: string;
  durationText: string;
  distanceText: string;
  travelMode: 'walking' | 'driving';
};

let firestore: Firestore | null = null;

function getFirestoreInstance(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (firestore) return firestore;
  try {
    if (getApps().length === 0) {
      initializeApp(FIREBASE_CONFIG);
    }
    firestore = getFirestore();
    return firestore;
  } catch (e) {
    console.warn('[ActiveRouteSync] Firebase init failed:', e);
    return null;
  }
}

/**
 * Publish route to Firestore when navigation starts.
 * Uses the userId as the document ID so each device has one active route.
 */
export async function publishActiveRoute(
  payload: ActiveRoutePayload
): Promise<boolean> {
  const db = getFirestoreInstance();
  if (!db) {
    console.warn('[ActiveRouteSync] Firebase not configured — route not published');
    return false;
  }

  try {
    await setDoc(doc(db, COLLECTION, payload.userId), {
      ...payload,
      status: 'navigating',
      startedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (e) {
    console.warn('[ActiveRouteSync] publish error:', e);
    return false;
  }
}

/**
 * Remove route from Firestore when navigation ends.
 */
export async function removeActiveRoute(userId: string): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) return;

  try {
    await deleteDoc(doc(db, COLLECTION, userId));
  } catch (e) {
    console.warn('[ActiveRouteSync] remove error:', e);
  }
}

/**
 * Update the user's current location while navigating.
 */
export async function updateRouteLocation(
  userId: string,
  lat: number,
  lng: number
): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) return;

  try {
    await updateDoc(doc(db, COLLECTION, userId), {
      currentLocation: { lat, lng },
      updatedAt: Timestamp.now(),
    });
  } catch {
    // Silently ignore — location updates are best-effort
  }
}
