/**
 * Community safety alerts — shared across all app users via Firebase Firestore.
 * Purpose: protection. Users share things others should be wary of (hazards, suspicious activity, poor lighting).
 * One person posts → everyone sees it. Creator can delete their own post.
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  type Firestore,
  type Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config';

const DEVICE_USER_ID_KEY = '@saferoute:community_device_user_id';
const POSTS_COLLECTION = 'posts';
const MAX_POSTS = 200;

export type CommunityPost = {
  id: string;
  content: string;
  type: 'positive' | 'negative';
  timestamp: Date;
  verified: boolean;
  location?: { latitude: number; longitude: number };
  authorId: string;
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
    console.warn('[Community] Firebase init failed:', e);
    return null;
  }
}

/**
 * Stable device/user ID so this device can delete only its own posts.
 */
export async function getDeviceUserId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_USER_ID_KEY);
    if (existing) return existing;
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    await AsyncStorage.setItem(DEVICE_USER_ID_KEY, uuid);
    return uuid;
  } catch {
    return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function isCommunityBackendAvailable(): boolean {
  return isFirebaseConfigured() && getFirestoreInstance() !== null;
}

/**
 * Subscribe to community posts in real time. Returns unsubscribe function.
 */
export function subscribePosts(
  onPosts: (posts: CommunityPost[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const db = getFirestoreInstance();
  if (!db) {
    onPosts([]);
    return null;
  }
  try {
    const col = collection(db, POSTS_COLLECTION);
    const q = query(col, orderBy('timestamp', 'desc'), limit(MAX_POSTS));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const posts: CommunityPost[] = snapshot.docs.map((d) => {
          const data = d.data();
          const ts = data.timestamp;
          return {
            id: d.id,
            content: data.content ?? '',
            type: data.type === 'negative' ? 'negative' : 'positive',
            timestamp: ts?.toDate?.() ?? new Date(ts ?? Date.now()),
            verified: !!data.verified,
            location: data.location,
            authorId: data.authorId ?? '',
          };
        });
        onPosts(posts);
      },
      (err) => {
        console.warn('[Community] subscribePosts error:', err);
        onError?.(err);
        onPosts([]);
      }
    );
    return unsub;
  } catch (e) {
    console.warn('[Community] subscribePosts setup failed:', e);
    onPosts([]);
    return null;
  }
}

/**
 * Create a post visible to all app users.
 */
export async function createPost(
  content: string,
  type: 'positive' | 'negative',
  location?: { latitude: number; longitude: number }
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestoreInstance();
  if (!db) {
    return { success: false, error: 'Firebase not configured. Add Firebase config to sync posts with all users.' };
  }
  const authorId = await getDeviceUserId();
  try {
    await addDoc(collection(db, POSTS_COLLECTION), {
      content: content.trim(),
      type,
      timestamp: Timestamp.now(),
      verified: false,
      location: location ?? null,
      authorId,
    });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to post';
    return { success: false, error: msg };
  }
}

/**
 * Delete a post. Only succeeds if the current device is the author.
 */
export async function deletePost(postId: string, authorId: string): Promise<{ success: boolean; error?: string }> {
  const db = getFirestoreInstance();
  if (!db) {
    return { success: false, error: 'Firebase not configured.' };
  }
  const currentId = await getDeviceUserId();
  if (currentId !== authorId) {
    return { success: false, error: 'You can only delete your own posts.' };
  }
  try {
    await deleteDoc(doc(db, POSTS_COLLECTION, postId));
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to delete';
    return { success: false, error: msg };
  }
}
