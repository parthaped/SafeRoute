import { create } from 'zustand';
import type { Incident, IncidentStatus } from '../types/incident';
import {
  updateIncidentStatus as firestoreUpdateStatus,
  isFirebaseConfigured,
} from '../lib/firestoreSync';

type IncidentStore = {
  incidents: Incident[];
  selectedId: string | null;

  addIncident: (incident: Incident) => void;
  updateStatus: (id: string, status: IncidentStatus) => void;
  select: (id: string | null) => void;
  setIncidents: (incidents: Incident[]) => void;
};

export const useIncidentStore = create<IncidentStore>((set) => ({
  incidents: [],
  selectedId: null,

  addIncident: (incident) =>
    set((s) => ({ incidents: [incident, ...s.incidents] })),

  updateStatus: (id, status) => {
    // Optimistic local update
    set((s) => ({
      incidents: s.incidents.map((inc) =>
        inc.id === id ? { ...inc, status, updatedAt: Date.now() } : inc
      ),
    }));
    // Sync to Firestore → mobile app picks up via onSnapshot
    if (isFirebaseConfigured()) {
      firestoreUpdateStatus(id, status).catch((e) =>
        console.error('[Incidents] Firestore sync failed:', e)
      );
    }
  },

  select: (id) => set({ selectedId: id }),

  setIncidents: (incidents) => set({ incidents }),
}));
