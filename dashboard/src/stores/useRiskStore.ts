import { create } from 'zustand';
import type { SegmentRisk } from '../types/risk';

type RiskStore = {
  segments: SegmentRisk[];
  expandedSegmentId: string | null;

  setSegments: (segments: SegmentRisk[]) => void;
  updateSegment: (id: string, patch: Partial<SegmentRisk>) => void;
  expand: (id: string | null) => void;
};

export const useRiskStore = create<RiskStore>((set) => ({
  segments: [],
  expandedSegmentId: null,

  setSegments: (segments) => set({ segments }),

  updateSegment: (id, patch) =>
    set((s) => ({
      segments: s.segments.map((seg) =>
        seg.segmentId === id ? { ...seg, ...patch } : seg
      ),
    })),

  expand: (id) => set({ expandedSegmentId: id }),
}));
