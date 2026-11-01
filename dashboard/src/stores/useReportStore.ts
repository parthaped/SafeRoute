import { create } from 'zustand';
import type { OfficerReport, ReportStatus, CommunityPost } from '../types/report';
import {
  createOfficerReport as firestoreCreate,
  updateReportStatus as firestoreUpdateStatus,
  isFirebaseConfigured,
} from '../lib/reportSync';

type ReportStore = {
  officerReports: OfficerReport[];
  communityPosts: CommunityPost[];
  selectedReportId: string | null;

  setOfficerReports: (r: OfficerReport[]) => void;
  setCommunityPosts: (p: CommunityPost[]) => void;
  selectReport: (id: string | null) => void;

  fileReport: (report: Omit<OfficerReport, 'id'>) => Promise<string | null>;
  updateStatus: (id: string, status: ReportStatus) => void;
};

export const useReportStore = create<ReportStore>((set) => ({
  officerReports: [],
  communityPosts: [],
  selectedReportId: null,

  setOfficerReports: (r) => set({ officerReports: r }),
  setCommunityPosts: (p) => set({ communityPosts: p }),
  selectReport: (id) => set({ selectedReportId: id }),

  fileReport: async (report) => {
    if (isFirebaseConfigured()) {
      const id = await firestoreCreate(report);
      if (id) {
        set((s) => ({
          officerReports: [{ ...report, id }, ...s.officerReports],
        }));
        return id;
      }
    }
    // Fallback local
    const id = crypto.randomUUID();
    set((s) => ({
      officerReports: [{ ...report, id }, ...s.officerReports],
    }));
    return id;
  },

  updateStatus: (id, status) => {
    set((s) => ({
      officerReports: s.officerReports.map((r) =>
        r.id === id ? { ...r, status, updatedAt: Date.now() } : r
      ),
    }));
    if (isFirebaseConfigured()) {
      firestoreUpdateStatus(id, status).catch(console.error);
    }
  },
}));
