import { useEffect, useRef } from 'react';
import {
  subscribeBroadcasts,
  subscribeIncidents,
  subscribeRiskSegments,
  subscribeActiveRoutes,
  isFirebaseConfigured,
  type LiveRoute,
} from '../lib/firestoreSync';
import {
  subscribeOfficerReports,
  subscribeCommunityPosts,
} from '../lib/reportSync';
import { useBroadcastStore } from '../stores/useBroadcastStore';
import { useIncidentStore } from '../stores/useIncidentStore';
import { useRiskStore } from '../stores/useRiskStore';
import { useReportStore } from '../stores/useReportStore';
import { useSystemStore } from '../stores/useSystemStore';
import { useMapStore } from '../stores/useMapStore';
import { useNotificationStore } from '../stores/useNotificationStore';

/**
 * Master Firestore subscription hook. Mount once at the app root.
 *
 * DEMO MODE: While static demo data (demoData.json) is in use, Firestore
 * subscriptions still run but will NOT overwrite the stores with empty
 * collections. Once live sensor data populates Firestore, it will
 * seamlessly take over. Remove this guard when demo data is retired.
 */
export function useFirestoreSync() {
  const setBroadcasts = useBroadcastStore((s) => s.setBroadcasts);
  const setIncidents = useIncidentStore((s) => s.setIncidents);
  const setSegments = useRiskStore((s) => s.setSegments);
  const setOfficerReports = useReportStore((s) => s.setOfficerReports);
  const setCommunityPosts = useReportStore((s) => s.setCommunityPosts);
  const updateMetric = useSystemStore((s) => s.updateMetric);
  const setActiveRoutes = useMapStore((s) => s.setActiveRoutes);
  const pushToast = useNotificationStore((s) => s.push);
  const knownRouteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      updateMetric('firestore', {
        status: 'degraded',
        value: 'Demo mode',
        detail: 'Showing demo data — set VITE_FIREBASE_* in .env for live sync',
      });
      return;
    }

    updateMetric('firestore', {
      status: 'healthy',
      value: 'Connected',
      detail: 'Demo data active — live Firestore overlay ready',
    });

    const unsubs: (() => void)[] = [];

    const u1 = subscribeBroadcasts((data) => { if (data.length > 0) setBroadcasts(data); });
    if (u1) unsubs.push(u1);

    const u2 = subscribeIncidents((data) => { if (data.length > 0) setIncidents(data); });
    if (u2) unsubs.push(u2);

    const u3 = subscribeRiskSegments((data) => { if (data.length > 0) setSegments(data); });
    if (u3) unsubs.push(u3);

    const u4 = subscribeOfficerReports((data) => { if (data.length > 0) setOfficerReports(data); });
    if (u4) unsubs.push(u4);

    const u5 = subscribeCommunityPosts((data) => { if (data.length > 0) setCommunityPosts(data); });
    if (u5) unsubs.push(u5);

    // Live routes from mobile phones → dashboard
    const u6 = subscribeActiveRoutes((liveRoutes: LiveRoute[]) => {
      // Detect newly added routes and push a notification
      for (const r of liveRoutes) {
        if (!knownRouteIdsRef.current.has(r.id)) {
          knownRouteIdsRef.current.add(r.id);
          pushToast({
            title: 'New Route Active',
            message: `${r.userName} started navigating: ${r.label}`,
            variant: 'route',
          });
        }
      }
      // Remove IDs that are no longer present
      const currentIds = new Set(liveRoutes.map((r) => r.id));
      for (const id of knownRouteIdsRef.current) {
        if (!currentIds.has(id)) knownRouteIdsRef.current.delete(id);
      }

      // Merge live routes with existing demo routes (avoid duplicates by ID prefix)
      const demoRoutes = useMapStore.getState().activeRoutes.filter((r) => r.id.startsWith('route-'));
      const liveAsStore = liveRoutes.map((r) => ({
        id: `live-${r.id}`,
        path: r.path,
        userId: r.userId,
        label: r.label,
      }));
      setActiveRoutes([...demoRoutes, ...liveAsStore]);
    });
    if (u6) unsubs.push(u6);

    return () => unsubs.forEach((u) => u());
  }, [setBroadcasts, setIncidents, setSegments, setOfficerReports, setCommunityPosts, updateMetric, setActiveRoutes, pushToast]);
}
