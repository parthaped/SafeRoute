import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';

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

export async function sendMessageToUser(
  routeId: string,
  userId: string,
  text: string,
  officerName = 'RUPD Dispatch'
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) {
    console.warn('[RouteMessaging] Firebase not configured — message not sent');
    return false;
  }

  try {
    await addDoc(collection(db, COLLECTION), {
      routeId,
      userId,
      sender: 'officer',
      senderName: officerName,
      text,
      timestamp: Timestamp.now(),
    });
    return true;
  } catch (e) {
    console.error('[RouteMessaging] send error:', e);
    return false;
  }
}

export function subscribeToRouteMessages(
  userId: string,
  onMessages: (msgs: RouteMessage[]) => void
): Unsubscribe | null {
  const db = getFirestoreDb();
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
    (err) => console.warn('[RouteMessaging] subscribe error:', err)
  );
}
