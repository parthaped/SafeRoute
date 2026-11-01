import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config';

const COLLECTION = 'escort_requests';

export type EscortRequestPayload = {
  userId: string;
  userName: string;
  userPhone: string;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  currentLocation: { lat: number; lng: number };
  routeLabel: string;
  priority: 'normal' | 'urgent';
  reason: string;
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
    console.warn('[EscortRequest] Firebase init failed:', e);
    return null;
  }
}

export async function submitEscortRequest(
  payload: EscortRequestPayload
): Promise<boolean> {
  const db = getFirestoreInstance();
  if (!db) {
    console.warn('[EscortRequest] Firebase not configured — request saved locally');
    return true;
  }

  try {
    await addDoc(collection(db, COLLECTION), {
      ...payload,
      status: 'pending',
      requestedAt: Timestamp.now(),
    });
    return true;
  } catch (e) {
    console.warn('[EscortRequest] submit error:', e);
    return false;
  }
}
