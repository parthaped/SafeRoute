import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  type Firestore,
  type Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config';

const COLLECTION = 'route_messages';

export type RouteMessage = {
  id: string;
  routeId: string;
  userId: string;
  sender: 'officer' | 'user';
  senderName: string;
  text: string;
  timestamp: Date;
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
    console.warn('[RouteMessaging] Firebase init failed:', e);
    return null;
  }
}

export function subscribeToRouteMessages(
  userId: string,
  onMessages: (msgs: RouteMessage[]) => void
): Unsubscribe | null {
  const db = getFirestoreInstance();
  if (!db) return null;

  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const msgs: RouteMessage[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          routeId: data.routeId ?? '',
          userId: data.userId ?? '',
          sender: data.sender ?? 'officer',
          senderName: data.senderName ?? 'RUPD',
          text: data.text ?? '',
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp ?? Date.now()),
        };
      });
      onMessages(msgs);
    },
    (err) => {
      console.warn('[RouteMessaging] subscribe error:', err);
    }
  );
}

export async function sendRouteMessage(
  routeId: string,
  userId: string,
  text: string,
  sender: 'officer' | 'user' = 'user',
  senderName = 'User'
): Promise<boolean> {
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    await addDoc(collection(db, COLLECTION), {
      routeId,
      userId,
      sender,
      senderName,
      text,
      timestamp: Timestamp.now(),
    });
    return true;
  } catch (e) {
    console.warn('[RouteMessaging] send error:', e);
    return false;
  }
}
