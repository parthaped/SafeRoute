import { useEffect, useRef } from 'react';
import { useRiskStore } from '../stores/useRiskStore';
import { useIncidentStore } from '../stores/useIncidentStore';
import { useBroadcastStore } from '../stores/useBroadcastStore';
import { useReportStore } from '../stores/useReportStore';
import { useMapStore } from '../stores/useMapStore';
import { useEscortStore } from '../stores/useEscortStore';
import type { ActiveRoute, PatrolSuggestion } from '../stores/useMapStore';
import type { EscortRequest } from '../types/escort';
import type { SegmentRisk, RiskFactorScore, HeatmapPoint } from '../types/risk';
import type { Incident } from '../types/incident';
import type { Broadcast } from '../types/broadcast';
import type { Sensor } from '../types/sensor';
import type { OfficerReport, CommunityPost } from '../types/report';
import type { LatLng } from '../types/geo';
import demoRaw from '../data/demoData.json';

// ─── DEMO MODE ──────────────────────────────────────────────────────────
// All data below is static demo data loaded from demoData.json.
// Remove this entire file (and its call-sites) once live sensors and a
// production database are connected.
// ─────────────────────────────────────────────────────────────────────────

function minutesAgoToEpoch(minutesAgo: number): number {
  return Date.now() - minutesAgo * 60_000;
}

// ── Segment hydration ───────────────────────────────────────────────────

function hydrateSegments(): SegmentRisk[] {
  return (demoRaw.segments as DemoSegment[]).map((s) => ({
    segmentId: s.segmentId,
    segment: {
      id: s.segmentId,
      path: s.path as LatLng[],
      name: s.name,
    },
    level: s.level as SegmentRisk['level'],
    score: s.score,
    factors: s.factors as RiskFactorScore[],
    updatedAt: minutesAgoToEpoch(s.minutesAgo),
    decayRate: s.decayRate,
  }));
}

type DemoSegment = (typeof demoRaw.segments)[number];

// ── Incident hydration ──────────────────────────────────────────────────

type DemoIncident = (typeof demoRaw.incidents)[number];

function hydrateIncidents(): Incident[] {
  return (demoRaw.incidents as DemoIncident[]).map((inc) => ({
    id: inc.id,
    type: inc.type as Incident['type'],
    severity: inc.severity as Incident['severity'],
    status: inc.status as Incident['status'],
    title: inc.title,
    description: inc.description,
    location: inc.location as LatLng,
    segmentId: inc.segmentId,
    sensorId: (inc as Record<string, unknown>).sensorId as string | undefined,
    reportedAt: minutesAgoToEpoch(inc.minutesAgo),
    updatedAt: minutesAgoToEpoch(inc.updatedMinutesAgo),
  }));
}

// ── Broadcast hydration ─────────────────────────────────────────────────

type DemoBroadcast = (typeof demoRaw.broadcasts)[number];

function hydrateBroadcasts(): Broadcast[] {
  return (demoRaw.broadcasts as DemoBroadcast[]).map((bc) => {
    const createdAt = minutesAgoToEpoch(bc.minutesAgo);
    const expiresAt = Date.now() + bc.expiresInMinutes * 60_000;
    return {
      id: bc.id,
      title: bc.title,
      message: bc.message,
      zone: {
        id: bc.zone.id,
        polygon: bc.zone.polygon as LatLng[],
        label: bc.zone.label,
      },
      status: bc.status as Broadcast['status'],
      createdAt,
      expiresAt,
      durationMinutes: bc.durationMinutes,
      affectedRouteCount: bc.affectedRouteCount,
      createdBy: bc.createdBy,
    };
  });
}

// ── Officer report hydration ────────────────────────────────────────────

type DemoReport = (typeof demoRaw.officerReports)[number];

function hydrateOfficerReports(): OfficerReport[] {
  return (demoRaw.officerReports as DemoReport[]).map((r) => {
    const ts = minutesAgoToEpoch(r.minutesAgo);
    return {
      id: r.id,
      crimeType: r.crimeType as OfficerReport['crimeType'],
      title: r.title,
      description: r.description,
      location: r.location as LatLng,
      locationName: r.locationName,
      priority: r.priority as OfficerReport['priority'],
      status: r.status as OfficerReport['status'],
      source: r.source as OfficerReport['source'],
      officerId: r.officerId,
      officerName: r.officerName,
      createdAt: ts,
      updatedAt: ts,
      broadcastToUsers: r.broadcastToUsers,
      addToHeatmap: r.addToHeatmap,
    };
  });
}

// ── Community post hydration ────────────────────────────────────────────

type DemoPost = (typeof demoRaw.communityPosts)[number];

function hydrateCommunityPosts(): CommunityPost[] {
  return (demoRaw.communityPosts as DemoPost[]).map((p) => ({
    id: p.id,
    content: p.content,
    type: p.type as CommunityPost['type'],
    timestamp: new Date(minutesAgoToEpoch(p.minutesAgo)),
    verified: p.verified,
    location: p.location
      ? { latitude: p.location.latitude, longitude: p.location.longitude }
      : undefined,
    authorId: p.authorId,
  }));
}

// ── Heatmap generation from cluster seeds ───────────────────────────────

function generateHeatmap(): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  const seededRng = mulberry32(42);

  for (const cluster of demoRaw.heatmapClusters) {
    for (let i = 0; i < cluster.count; i++) {
      const spread = 0.0012 * (1 - cluster.intensity + 0.3);
      points.push({
        lat: cluster.lat + (seededRng() - 0.5) * spread,
        lng: cluster.lng + (seededRng() - 0.5) * spread,
        weight: Math.min(1, cluster.intensity * (0.6 + seededRng() * 0.5)),
      });
    }
  }
  return points;
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Hook helper ─────────────────────────────────────────────────────────

function useOnce(fn: () => void) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fn();
  }, [fn]);
}

// ── Public hooks (called by individual panels) ──────────────────────────

export function useMockRiskData() {
  const setSegments = useRiskStore((s) => s.setSegments);
  useOnce(() => setSegments(hydrateSegments()));
}

export function useMockIncidentData() {
  const setIncidents = useIncidentStore((s) => s.setIncidents);
  const setHeatmapData = useMapStore((s) => s.setHeatmapData);
  useOnce(() => {
    setIncidents(hydrateIncidents());
    setHeatmapData(generateHeatmap());
  });
}

export function useMockBroadcastData() {
  const setBroadcasts = useBroadcastStore((s) => s.setBroadcasts);
  useOnce(() => setBroadcasts(hydrateBroadcasts()));
}

export function useMockReportData() {
  const setOfficerReports = useReportStore((s) => s.setOfficerReports);
  const setCommunityPosts = useReportStore((s) => s.setCommunityPosts);
  useOnce(() => {
    setOfficerReports(hydrateOfficerReports());
    setCommunityPosts(hydrateCommunityPosts());
  });
}

// ── Sensor hydration ─────────────────────────────────────────────────────

function hydrateSensors(): Sensor[] {
  return ((demoRaw as Record<string, unknown>).sensors as DemoSensor[]).map((s) => ({
    id: s.id,
    type: s.type as Sensor['type'],
    label: s.label,
    location: s.location as LatLng,
    health: s.health as Sensor['health'],
    lastPing: minutesAgoToEpoch(5),
    battery: s.battery,
    firmware: s.firmware,
    anomalyActive: s.anomalyActive,
  }));
}

type DemoSensor = {
  id: string;
  type: string;
  label: string;
  location: { lat: number; lng: number };
  health: string;
  battery: number;
  firmware: string;
  anomalyActive: boolean;
};

// ── Active route hydration ───────────────────────────────────────────────

function hydrateActiveRoutes(): ActiveRoute[] {
  return ((demoRaw as Record<string, unknown>).activeRoutes as DemoActiveRoute[]).map((r) => ({
    id: r.id,
    path: r.path as LatLng[],
    userId: r.userId,
    label: r.label,
    color: r.color,
  }));
}

type DemoActiveRoute = {
  id: string;
  path: { lat: number; lng: number }[];
  userId: string;
  label: string;
  color?: string;
};

// ── Patrol suggestion hydration ──────────────────────────────────────────

function hydratePatrolSuggestions(): PatrolSuggestion[] {
  return ((demoRaw as Record<string, unknown>).patrolSuggestions as DemoPatrol[]).map((p) => ({
    id: p.id,
    path: p.path as LatLng[],
    priority: p.priority as PatrolSuggestion['priority'],
    reason: p.reason,
    label: p.label,
  }));
}

type DemoPatrol = {
  id: string;
  path: { lat: number; lng: number }[];
  priority: string;
  reason: string;
  label: string;
};

// ── Escort request hydration ────────────────────────────────────────────

type DemoEscortRequest = {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  currentLocation: { lat: number; lng: number };
  routeLabel: string;
  priority: string;
  reason: string;
  status: string;
  minutesAgo: number;
  acceptedBy?: string;
  acceptedMinutesAgo?: number;
};

function hydrateEscortRequests(): EscortRequest[] {
  const raw = (demoRaw as Record<string, unknown>).escortRequests as DemoEscortRequest[] | undefined;
  if (!raw) return [];
  return raw.map((e) => ({
    id: e.id,
    userId: e.userId,
    userName: e.userName,
    userPhone: e.userPhone,
    origin: { lat: e.origin.lat, lng: e.origin.lng, name: e.origin.name },
    destination: { lat: e.destination.lat, lng: e.destination.lng, name: e.destination.name },
    currentLocation: { lat: e.currentLocation.lat, lng: e.currentLocation.lng },
    routeLabel: e.routeLabel,
    priority: e.priority as EscortRequest['priority'],
    reason: e.reason,
    status: e.status as EscortRequest['status'],
    requestedAt: minutesAgoToEpoch(e.minutesAgo),
    acceptedBy: e.acceptedBy,
    acceptedAt: e.acceptedMinutesAgo != null ? minutesAgoToEpoch(e.acceptedMinutesAgo) : undefined,
  }));
}

export function useMockEscortData() {
  const setRequests = useEscortStore((s) => s.setRequests);
  useOnce(() => setRequests(hydrateEscortRequests()));
}

// ── Map layers data hook (sensors, routes, patrols) ──────────────────────

export function useMockMapLayerData() {
  const setSensors = useMapStore((s) => s.setSensors);
  const setActiveRoutes = useMapStore((s) => s.setActiveRoutes);
  const setPatrolSuggestions = useMapStore((s) => s.setPatrolSuggestions);
  useOnce(() => {
    setSensors(hydrateSensors());
    setActiveRoutes(hydrateActiveRoutes());
    setPatrolSuggestions(hydratePatrolSuggestions());
  });
}
