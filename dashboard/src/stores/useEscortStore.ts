import { create } from 'zustand';
import type { EscortRequest, EscortStatus } from '../types/escort';

type EscortStore = {
  requests: EscortRequest[];
  selectedId: string | null;

  setRequests: (requests: EscortRequest[]) => void;
  addRequest: (request: EscortRequest) => void;
  updateStatus: (id: string, status: EscortStatus, officerName?: string) => void;
  select: (id: string | null) => void;
};

export const useEscortStore = create<EscortStore>((set) => ({
  requests: [],
  selectedId: null,

  setRequests: (requests) => set({ requests }),

  addRequest: (request) =>
    set((s) => ({ requests: [request, ...s.requests] })),

  updateStatus: (id, status, officerName) =>
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              ...(officerName ? { acceptedBy: officerName, acceptedAt: Date.now() } : {}),
            }
          : r
      ),
    })),

  select: (id) => set({ selectedId: id }),
}));
