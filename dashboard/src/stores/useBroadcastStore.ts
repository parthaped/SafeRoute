import { create } from 'zustand';
import type { Broadcast } from '../types/broadcast';
import {
  createBroadcast as firestoreCreateBroadcast,
  updateBroadcastStatus as firestoreUpdateStatus,
  isFirebaseConfigured,
} from '../lib/firestoreSync';

type BroadcastStore = {
  broadcasts: Broadcast[];
  draftId: string | null;

  addBroadcast: (b: Broadcast) => void;
  updateBroadcast: (id: string, patch: Partial<Broadcast>) => void;
  setDraft: (id: string | null) => void;
  setBroadcasts: (b: Broadcast[]) => void;
  publishBroadcast: (b: Omit<Broadcast, 'id'>) => Promise<void>;
};

export const useBroadcastStore = create<BroadcastStore>((set) => ({
  broadcasts: [],
  draftId: null,

  addBroadcast: (b) =>
    set((s) => ({ broadcasts: [b, ...s.broadcasts] })),

  updateBroadcast: (id, patch) => {
    set((s) => ({
      broadcasts: s.broadcasts.map((b) =>
        b.id === id ? { ...b, ...patch } : b
      ),
    }));
    if (isFirebaseConfigured() && patch.status) {
      firestoreUpdateStatus(id, patch.status).catch((e) =>
        console.error('[Broadcast] Firestore sync failed:', e)
      );
    }
  },

  setDraft: (id) => set({ draftId: id }),

  setBroadcasts: (broadcasts) => set({ broadcasts }),

  /**
   * Publish to Firestore so mobile app users are notified in real time.
   * Falls back to local-only if Firebase is not configured.
   */
  publishBroadcast: async (b) => {
    if (isFirebaseConfigured()) {
      const id = await firestoreCreateBroadcast(b);
      if (id) {
        set((s) => ({ broadcasts: [{ ...b, id }, ...s.broadcasts] }));
        return;
      }
    }
    // Fallback: local only
    set((s) => ({
      broadcasts: [{ ...b, id: crypto.randomUUID() }, ...s.broadcasts],
    }));
  },
}));
