/**
 * Firebase initialization — same project as the mobile app.
 * Reads config from VITE_ env vars (mirrors EXPO_PUBLIC_ vars in mobile).
 * Shares the same Firestore database so dashboard writes are
 * visible to mobile users in real time and vice versa.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function getFirestoreDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (db) return db;
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0]!;
    }
    db = getFirestore(app);
    return db;
  } catch (e) {
    console.error('[Dashboard] Firebase init failed:', e);
    return null;
  }
}
