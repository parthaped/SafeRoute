/**
 * Crime heatmap and danger zones from Rutgers mock data.
 * Used to show red/hot areas on the map and to avoid high-crime zones when routing.
 */

import type { LatLng } from './directions';
import {
  ACTIVE_HAZARD_ZONES,
  LIGHTING_CONDITIONS,
} from '../data/demoAlerts';

export type WeightedLatLng = LatLng & { weight?: number };

type CrimeRecord = {
  incident_id: string;
  crime_type: string;
  severity_score: number;
  location_name: string;
  latitude: number;
  longitude: number;
  campus: string;
  reported_date?: string;
};

const MAX_CRIME_AGE_YEARS = 3;

let _crimeData: CrimeRecord[] | null = null;
function getCrimeData(): CrimeRecord[] {
  if (_crimeData) return _crimeData;
  try {
    const raw = require('../data/rutgersCrimeData.json') as CrimeRecord[];
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - MAX_CRIME_AGE_YEARS);
    _crimeData = raw.filter((r) => {
      if (!r.reported_date) return true;
      const d = new Date(r.reported_date);
      return !Number.isNaN(d.getTime()) && d >= cutoff;
    });
    return _crimeData;
  } catch {
    return [];
  }
}

export function getHeatmapPoints(): WeightedLatLng[] {
  const data = getCrimeData();
  return data.map((r) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    weight: Math.max(0.1, r.severity_score / 100),
  }));
}

const CELL_SIZE = 0.0003;
const DANGER_THRESHOLD = 50;
const SAFETY_PENALTY_MAX = 12;

type CellKey = string;
function cellKey(lat: number, lng: number): CellKey {
  const i = Math.floor(lat / CELL_SIZE);
  const j = Math.floor(lng / CELL_SIZE);
  return `${i},${j}`;
}

let _dangerCellsCache: Map<CellKey, number> | null = null;
let _maxCellSumCache: number | null = null;

function getDangerCells(): Map<CellKey, number> {
  if (_dangerCellsCache) return _dangerCellsCache;
  const data = getCrimeData();
  const sumByCell = new Map<CellKey, number>();
  for (const r of data) {
    const key = cellKey(r.latitude, r.longitude);
    sumByCell.set(key, (sumByCell.get(key) ?? 0) + r.severity_score);
  }
  const danger = new Map<CellKey, number>();
  sumByCell.forEach((sum, key) => {
    if (sum >= DANGER_THRESHOLD) danger.set(key, sum);
  });
  _dangerCellsCache = danger;
  return danger;
}

export type DangerZonePolygon = LatLng[];
export type DangerZoneWithScore = { coordinates: DangerZonePolygon; riskScore: number };

let _polygonsCache: DangerZonePolygon[] | null = null;
let _polygonsWithScoreCache: DangerZoneWithScore[] | null = null;

export function getDangerZonePolygons(): DangerZonePolygon[] {
  if (_polygonsCache) return _polygonsCache;
  _polygonsCache = getDangerZonePolygonsWithScore().map((p) => p.coordinates);
  return _polygonsCache;
}

function getMaxCellSum(): number {
  if (_maxCellSumCache != null) return _maxCellSumCache;
  const cells = getDangerCells();
  let max = 0;
  cells.forEach((sum) => {
    if (sum > max) max = sum;
  });
  _maxCellSumCache = max || 100;
  return _maxCellSumCache;
}

export function getDangerZonePolygonsWithScore(): DangerZoneWithScore[] {
  if (_polygonsWithScoreCache) return _polygonsWithScoreCache;
  const cells = getDangerCells();
  const maxSum = getMaxCellSum();
  const polygons: DangerZoneWithScore[] = [];
  cells.forEach((sum, key) => {
    const [i, j] = key.split(',').map(Number);
    const latMin = i * CELL_SIZE;
    const latMax = latMin + CELL_SIZE;
    const lngMin = j * CELL_SIZE;
    const lngMax = lngMin + CELL_SIZE;
    const coords: DangerZonePolygon = [
      { latitude: latMin, longitude: lngMin },
      { latitude: latMax, longitude: lngMin },
      { latitude: latMax, longitude: lngMax },
      { latitude: latMin, longitude: lngMax },
      { latitude: latMin, longitude: lngMin },
    ];
    const riskScore = Math.min(100, Math.round((sum / maxSum) * 100));
    polygons.push({ coordinates: coords, riskScore });
  });
  _polygonsWithScoreCache = polygons;
  return polygons;
}

// ── Hazard zone + dark lighting avoidance ────────────────────────────────

type HazardBBox = { latMin: number; latMax: number; lngMin: number; lngMax: number; label: string };

let _hazardBBoxes: HazardBBox[] | null = null;
function getHazardBBoxes(): HazardBBox[] {
  if (_hazardBBoxes) return _hazardBBoxes;
  _hazardBBoxes = ACTIVE_HAZARD_ZONES.map((zone) => {
    const lats = zone.polygon.map((p) => p.latitude);
    const lngs = zone.polygon.map((p) => p.longitude);
    return {
      latMin: Math.min(...lats),
      latMax: Math.max(...lats),
      lngMin: Math.min(...lngs),
      lngMax: Math.max(...lngs),
      label: zone.label,
    };
  });
  return _hazardBBoxes;
}

const DARK_LIGHT_RADIUS_DEG = 0.0003;
let _darkLightZones: { lat: number; lng: number; label: string }[] | null = null;
function getDarkLightZones(): { lat: number; lng: number; label: string }[] {
  if (_darkLightZones) return _darkLightZones;
  _darkLightZones = LIGHTING_CONDITIONS
    .filter((l) => l.condition === 'dark')
    .map((l) => ({ lat: l.location.latitude, lng: l.location.longitude, label: l.label }));
  return _darkLightZones;
}

function isPointInHazardZone(lat: number, lng: number): boolean {
  for (const bbox of getHazardBBoxes()) {
    if (lat >= bbox.latMin && lat <= bbox.latMax && lng >= bbox.lngMin && lng <= bbox.lngMax) return true;
  }
  for (const dark of getDarkLightZones()) {
    const dlat = lat - dark.lat;
    const dlng = lng - dark.lng;
    if (dlat * dlat + dlng * dlng <= DARK_LIGHT_RADIUS_DEG * DARK_LIGHT_RADIUS_DEG) return true;
  }
  return false;
}

function getHazardPenaltyAt(lat: number, lng: number): number {
  let penalty = 0;
  for (const bbox of getHazardBBoxes()) {
    if (lat >= bbox.latMin && lat <= bbox.latMax && lng >= bbox.lngMin && lng <= bbox.lngMax) {
      penalty = Math.max(penalty, SAFETY_PENALTY_MAX * 0.6);
    }
  }
  for (const dark of getDarkLightZones()) {
    const dlat = lat - dark.lat;
    const dlng = lng - dark.lng;
    const distSq = dlat * dlat + dlng * dlng;
    const radiusSq = DARK_LIGHT_RADIUS_DEG * DARK_LIGHT_RADIUS_DEG;
    if (distSq <= radiusSq) {
      penalty = Math.max(penalty, SAFETY_PENALTY_MAX * 0.35 * (1 - distSq / radiusSq));
    }
  }
  return penalty;
}

/** O(1) cell-based check: is this point in a danger cell? */
function isPointInDangerCell(lat: number, lng: number, dangerCells: Map<CellKey, number>): boolean {
  return dangerCells.has(cellKey(lat, lng));
}

const ROUTE_SAMPLE_STEP_DEG = 0.0002;
function denseRouteSample(coordinates: LatLng[]): LatLng[] {
  if (coordinates.length < 2) return coordinates;
  const out: LatLng[] = [];
  for (let i = 0; i < coordinates.length - 1; i++) {
    const a = coordinates[i];
    const b = coordinates[i + 1];
    out.push(a);
    const dlat = b.latitude - a.latitude;
    const dlng = b.longitude - a.longitude;
    const dist = Math.sqrt(dlat * dlat + dlng * dlng);
    const n = Math.max(1, Math.floor(dist / ROUTE_SAMPLE_STEP_DEG));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      out.push({
        latitude: a.latitude + t * dlat,
        longitude: a.longitude + t * dlng,
      });
    }
  }
  out.push(coordinates[coordinates.length - 1]);
  return out;
}

export function doesRouteIntersectDangerZones(routeCoordinates: LatLng[]): boolean {
  const dangerCells = getDangerCells();
  const sampled = denseRouteSample(routeCoordinates);
  for (const p of sampled) {
    if (dangerCells.size > 0 && isPointInDangerCell(p.latitude, p.longitude, dangerCells)) return true;
    if (isPointInHazardZone(p.latitude, p.longitude)) return true;
  }
  return false;
}

/** Haversine distance in meters (for safety score). */
function haversineMetersSafe(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

/**
 * Safety score for a route: higher = more danger exposure (meter-weighted).
 * Used to pick the best among Google's alternatives (mimic Google Maps + safety).
 */
export function getRouteSafetyScore(routeCoordinates: LatLng[]): number {
  if (routeCoordinates.length < 2) return 0;
  const sampled = denseRouteSample(routeCoordinates);
  let score = 0;
  for (let i = 0; i < sampled.length - 1; i++) {
    const a = sampled[i];
    const b = sampled[i + 1];
    const lenM = haversineMetersSafe(a, b);
    const midLat = (a.latitude + b.latitude) / 2;
    const midLng = (a.longitude + b.longitude) / 2;
    const crimeDanger = getDangerWeightAt(midLat, midLng);
    const hazardDanger = getHazardPenaltyAt(midLat, midLng);
    score += lenM * Math.max(crimeDanger, hazardDanger);
  }
  return score;
}

const AVOIDANCE_OFFSET_DEG = 0.002;

/**
 * Merge nearby zones into clusters so we don't flood the Directions API
 * with dozens of waypoints for individual crime cells.
 */
function clusterZones(
  zones: { latMin: number; latMax: number; lngMin: number; lngMax: number }[]
): { latMin: number; latMax: number; lngMin: number; lngMax: number }[] {
  if (zones.length === 0) return [];
  const MERGE_GAP = 0.002;
  const sorted = [...zones].sort((a, b) => a.latMin - b.latMin || a.lngMin - b.lngMin);
  const clusters = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const z = sorted[i];
    const last = clusters[clusters.length - 1];
    if (z.latMin <= last.latMax + MERGE_GAP && z.lngMin <= last.lngMax + MERGE_GAP &&
        z.lngMax >= last.lngMin - MERGE_GAP) {
      last.latMin = Math.min(last.latMin, z.latMin);
      last.latMax = Math.max(last.latMax, z.latMax);
      last.lngMin = Math.min(last.lngMin, z.lngMin);
      last.lngMax = Math.max(last.lngMax, z.lngMax);
    } else {
      clusters.push({ ...z });
    }
  }
  return clusters;
}

export function getAvoidanceWaypoints(
  origin: LatLng,
  destination: LatLng,
  routeCoordinates: LatLng[],
  maxWaypoints: number = 5
): LatLng[] {
  const sampled = denseRouteSample(routeCoordinates);
  const withOrder: { index: number; waypoint: LatLng }[] = [];
  const half = sampled.length / 2;

  const rawZones: { latMin: number; latMax: number; lngMin: number; lngMax: number }[] = [];

  for (const poly of getDangerZonePolygons()) {
    if (poly.length < 4) continue;
    rawZones.push({
      latMin: Math.min(...poly.map((p) => p.latitude)),
      latMax: Math.max(...poly.map((p) => p.latitude)),
      lngMin: Math.min(...poly.map((p) => p.longitude)),
      lngMax: Math.max(...poly.map((p) => p.longitude)),
    });
  }

  for (const bbox of getHazardBBoxes()) {
    rawZones.push(bbox);
  }

  for (const dark of getDarkLightZones()) {
    rawZones.push({
      latMin: dark.lat - DARK_LIGHT_RADIUS_DEG,
      latMax: dark.lat + DARK_LIGHT_RADIUS_DEG,
      lngMin: dark.lng - DARK_LIGHT_RADIUS_DEG,
      lngMax: dark.lng + DARK_LIGHT_RADIUS_DEG,
    });
  }

  const allZones = clusterZones(rawZones);

  for (const zone of allZones) {
    const centerLat = (zone.latMin + zone.latMax) / 2;
    const centerLng = (zone.lngMin + zone.lngMax) / 2;

    let firstHitIndex = -1;
    for (let i = 0; i < sampled.length; i++) {
      const p = sampled[i];
      if (p.latitude >= zone.latMin && p.latitude <= zone.latMax && p.longitude >= zone.lngMin && p.longitude <= zone.lngMax) {
        firstHitIndex = i;
        break;
      }
    }
    if (firstHitIndex < 0) continue;

    const perpLat = -(zone.lngMax - zone.lngMin);
    const perpLng = zone.latMax - zone.latMin;
    const perpLen = Math.sqrt(perpLat * perpLat + perpLng * perpLng) || 1;

    const useDestSide = firstHitIndex >= half;
    const refLat = useDestSide ? destination.latitude : origin.latitude;
    const refLng = useDestSide ? destination.longitude : origin.longitude;

    const toRef = { lat: refLat - centerLat, lng: refLng - centerLng };
    const dot = toRef.lat * (perpLat / perpLen) + toRef.lng * (perpLng / perpLen);
    const sign = dot >= 0 ? 1 : -1;

    const wpLat = centerLat + sign * (perpLat / perpLen) * AVOIDANCE_OFFSET_DEG;
    const wpLng = centerLng + sign * (perpLng / perpLen) * AVOIDANCE_OFFSET_DEG;
    withOrder.push({ index: firstHitIndex, waypoint: { latitude: wpLat, longitude: wpLng } });
  }

  withOrder.sort((a, b) => a.index - b.index);
  return withOrder.slice(0, maxWaypoints).map((x) => x.waypoint);
}

export interface DangerZoneSummary {
  areaName: string;
  crimeTypes: string[];
  reason: string;
}

export function getDangerZoneSummariesForRoute(routeCoordinates: LatLng[]): DangerZoneSummary[] {
  const data = getCrimeData();
  const dangerCells = getDangerCells();
  const sampled = denseRouteSample(routeCoordinates);
  const summariesByKey = new Map<string, { locationNames: Set<string>; crimeTypes: Set<string> }>();

  for (const p of sampled) {
    const key = cellKey(p.latitude, p.longitude);
    if (!dangerCells.has(key)) continue;
    if (!summariesByKey.has(key)) {
      summariesByKey.set(key, { locationNames: new Set(), crimeTypes: new Set() });
    }
    const entry = summariesByKey.get(key)!;
    for (const r of data) {
      const rKey = cellKey(r.latitude, r.longitude);
      if (rKey !== key) continue;
      if (r.location_name) entry.locationNames.add(r.location_name);
      if (r.crime_type) entry.crimeTypes.add(r.crime_type);
    }
  }

  const result: DangerZoneSummary[] = [];
  summariesByKey.forEach((entry) => {
    const areaName =
      entry.locationNames.size > 0
        ? [...entry.locationNames].slice(0, 2).join(', ')
        : 'High-crime area';
    const crimeTypes = [...entry.crimeTypes];
    const reason =
      crimeTypes.length > 0
        ? `Reported incidents: ${crimeTypes.slice(0, 4).join(', ')}${crimeTypes.length > 4 ? '…' : ''}`
        : 'Elevated crime reports in this area';
    result.push({ areaName, crimeTypes, reason });
  });

  const hitHazards = new Set<string>();
  const hitDarkAreas = new Set<string>();
  for (const p of sampled) {
    for (const bbox of getHazardBBoxes()) {
      if (p.latitude >= bbox.latMin && p.latitude <= bbox.latMax && p.longitude >= bbox.lngMin && p.longitude <= bbox.lngMax) {
        hitHazards.add(bbox.label);
      }
    }
    for (const dark of getDarkLightZones()) {
      const dlat = p.latitude - dark.lat;
      const dlng = p.longitude - dark.lng;
      if (dlat * dlat + dlng * dlng <= DARK_LIGHT_RADIUS_DEG * DARK_LIGHT_RADIUS_DEG) {
        hitDarkAreas.add(dark.label);
      }
    }
  }
  for (const label of hitHazards) {
    result.push({ areaName: label, crimeTypes: [], reason: 'Active RUPD hazard zone' });
  }
  for (const label of hitDarkAreas) {
    result.push({ areaName: label, crimeTypes: [], reason: 'Lighting outage — dark area' });
  }

  return result;
}

export interface DangerZoneIncident {
  incident_id: string;
  crime_type: string;
  severity_score: number;
  location_name: string;
  campus: string;
}

export function getIncidentsInPolygon(polygon: DangerZonePolygon): DangerZoneIncident[] {
  if (polygon.length < 4) return [];
  const latMin = Math.min(...polygon.map((p) => p.latitude));
  const latMax = Math.max(...polygon.map((p) => p.latitude));
  const lngMin = Math.min(...polygon.map((p) => p.longitude));
  const lngMax = Math.max(...polygon.map((p) => p.longitude));
  const data = getCrimeData();
  return data
    .filter(
      (r) =>
        r.latitude >= latMin &&
        r.latitude <= latMax &&
        r.longitude >= lngMin &&
        r.longitude <= lngMax
    )
    .map((r) => ({
      incident_id: r.incident_id,
      crime_type: r.crime_type,
      severity_score: r.severity_score,
      location_name: r.location_name,
      campus: r.campus,
    }))
    .sort((a, b) => b.severity_score - a.severity_score);
}

// ——— A* safety routing ———

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

const ROUTING_GRID_STEP = 0.0012;
const ROUTING_PADDING_CELLS = 2;
const PROXIMITY_CELLS = 1;

function getDangerWeightAt(lat: number, lng: number): number {
  const key = cellKey(lat, lng);
  const dangerCells = getDangerCells();
  const sum = dangerCells.get(key);
  const maxSum = getMaxCellSum();
  const step = ROUTING_GRID_STEP;
  const ci = Math.floor(lat / step);
  const cj = Math.floor(lng / step);

  let crimePenalty = 0;
  if (sum != null && maxSum > 0) {
    crimePenalty = (sum / maxSum) * SAFETY_PENALTY_MAX;
  } else {
    for (let di = -PROXIMITY_CELLS; di <= PROXIMITY_CELLS; di++) {
      for (let dj = -PROXIMITY_CELLS; dj <= PROXIMITY_CELLS; dj++) {
        if (di === 0 && dj === 0) continue;
        const nKey = `${ci + di},${cj + dj}`;
        const nSum = dangerCells.get(nKey);
        if (nSum != null && maxSum > 0) {
          const dist = Math.max(1, Math.sqrt(di * di + dj * dj));
          crimePenalty = Math.max(crimePenalty, (nSum / maxSum) * (SAFETY_PENALTY_MAX * 0.4) / dist);
        }
      }
    }
  }
  const hazardPenalty = getHazardPenaltyAt(lat, lng);
  return Math.max(crimePenalty, hazardPenalty);
}

function getGridBounds(origin: LatLng, destination: LatLng): { iMin: number; iMax: number; jMin: number; jMax: number } {
  let latMin = Math.min(origin.latitude, destination.latitude);
  let latMax = Math.max(origin.latitude, destination.latitude);
  let lngMin = Math.min(origin.longitude, destination.longitude);
  let lngMax = Math.max(origin.longitude, destination.longitude);
  for (const poly of getDangerZonePolygons()) {
    if (poly.length < 4) continue;
    for (const p of poly) {
      latMin = Math.min(latMin, p.latitude);
      latMax = Math.max(latMax, p.latitude);
      lngMin = Math.min(lngMin, p.longitude);
      lngMax = Math.max(lngMax, p.longitude);
    }
  }
  for (const bbox of getHazardBBoxes()) {
    latMin = Math.min(latMin, bbox.latMin);
    latMax = Math.max(latMax, bbox.latMax);
    lngMin = Math.min(lngMin, bbox.lngMin);
    lngMax = Math.max(lngMax, bbox.lngMax);
  }
  const step = ROUTING_GRID_STEP;
  const iMin = Math.floor(latMin / step) - ROUTING_PADDING_CELLS;
  const iMax = Math.ceil(latMax / step) + ROUTING_PADDING_CELLS;
  const jMin = Math.floor(lngMin / step) - ROUTING_PADDING_CELLS;
  const jMax = Math.ceil(lngMax / step) + ROUTING_PADDING_CELLS;
  return { iMin, iMax, jMin, jMax };
}

function cellToLatLng(i: number, j: number): LatLng {
  const step = ROUTING_GRID_STEP;
  return {
    latitude: (i + 0.5) * step,
    longitude: (j + 0.5) * step,
  };
}

function latLngToCell(lat: number, lng: number): { i: number; j: number } {
  const step = ROUTING_GRID_STEP;
  return {
    i: Math.floor(lat / step),
    j: Math.floor(lng / step),
  };
}

const NEIGHBORS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
];

type HeapNode = { i: number; j: number; f: number };

class MinHeap {
  private data: HeapNode[] = [];
  get size() { return this.data.length; }
  push(node: HeapNode) {
    this.data.push(node);
    this._bubbleUp(this.data.length - 1);
  }
  pop(): HeapNode | undefined {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0 && last) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }
  private _bubbleUp(idx: number) {
    const d = this.data;
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (d[parent].f <= d[idx].f) break;
      [d[parent], d[idx]] = [d[idx], d[parent]];
      idx = parent;
    }
  }
  private _sinkDown(idx: number) {
    const d = this.data;
    const n = d.length;
    while (true) {
      let smallest = idx;
      const l = 2 * idx + 1;
      const r = 2 * idx + 2;
      if (l < n && d[l].f < d[smallest].f) smallest = l;
      if (r < n && d[r].f < d[smallest].f) smallest = r;
      if (smallest === idx) break;
      [d[smallest], d[idx]] = [d[idx], d[smallest]];
      idx = smallest;
    }
  }
}

/** Single run: Dijkstra (useHeuristic=false) or A* (useHeuristic=true). Returns path and cost at goal. */
function runPathfind(
  origin: LatLng,
  destination: LatLng,
  useHeuristic: boolean
): { path: LatLng[]; cost: number } {
  const dangerCells = getDangerCells();
  const maxSum = getMaxCellSum();
  const bounds = getGridBounds(origin, destination);
  const start = latLngToCell(origin.latitude, origin.longitude);
  const end = latLngToCell(destination.latitude, destination.longitude);
  const nodeKey = (i: number, j: number) => `${i},${j}`;
  const gScore = new Map<string, number>();
  const prev = new Map<string, { i: number; j: number }>();
  const pq = new MinHeap();
  const startKey = nodeKey(start.i, start.j);
  gScore.set(startKey, 0);
  const h0 = useHeuristic ? haversineMeters(cellToLatLng(start.i, start.j), destination) : 0;
  pq.push({ i: start.i, j: start.j, f: h0 });

  const endKey = nodeKey(end.i, end.j);
  let iterations = 0;
  const maxIterations = 15000;
  let goalCost = Infinity;

  const dangerWeightFast = (lat: number, lng: number): number => {
    let crimePenalty = 0;
    const key = cellKey(lat, lng);
    const sum = dangerCells.get(key);
    if (sum != null && maxSum > 0) {
      crimePenalty = (sum / maxSum) * SAFETY_PENALTY_MAX;
    } else {
      const step = ROUTING_GRID_STEP;
      const ci = Math.floor(lat / step);
      const cj = Math.floor(lng / step);
      for (let di = -PROXIMITY_CELLS; di <= PROXIMITY_CELLS; di++) {
        for (let dj = -PROXIMITY_CELLS; dj <= PROXIMITY_CELLS; dj++) {
          if (di === 0 && dj === 0) continue;
          const nKey = `${ci + di},${cj + dj}`;
          const nSum = dangerCells.get(nKey);
          if (nSum != null && maxSum > 0) {
            const dist = Math.max(1, Math.sqrt(di * di + dj * dj));
            crimePenalty = Math.max(crimePenalty, (nSum / maxSum) * (SAFETY_PENALTY_MAX * 0.4) / dist);
          }
        }
      }
    }
    const hazardPenalty = getHazardPenaltyAt(lat, lng);
    return Math.max(crimePenalty, hazardPenalty);
  };

  while (pq.size > 0 && iterations < maxIterations) {
    iterations++;
    const u = pq.pop()!;
    const uKey = nodeKey(u.i, u.j);
    if (uKey === endKey) {
      goalCost = gScore.get(uKey) ?? Infinity;
      break;
    }
    const gu = gScore.get(uKey) ?? Infinity;
    const hU = useHeuristic ? haversineMeters(cellToLatLng(u.i, u.j), destination) : 0;
    if (u.f > gu + hU * 1.2) continue;

    const fromCenter = cellToLatLng(u.i, u.j);
    for (const [di, dj] of NEIGHBORS) {
      const vi = u.i + di;
      const vj = u.j + dj;
      if (vi < bounds.iMin || vi > bounds.iMax || vj < bounds.jMin || vj > bounds.jMax) continue;
      const vCenter = cellToLatLng(vi, vj);
      const danger = dangerWeightFast(vCenter.latitude, vCenter.longitude);
      const edgeMeters = haversineMeters(fromCenter, vCenter);
      const cost = edgeMeters * (1 + danger);
      const vKey = nodeKey(vi, vj);
      const altG = gu + cost;
      if (altG >= (gScore.get(vKey) ?? Infinity)) continue;
      gScore.set(vKey, altG);
      prev.set(vKey, { i: u.i, j: u.j });
      const h = useHeuristic ? haversineMeters(vCenter, destination) : 0;
      pq.push({ i: vi, j: vj, f: altG + h });
    }
  }

  const path: LatLng[] = [];
  let cur: { i: number; j: number } | undefined = { i: end.i, j: end.j };
  while (cur != null) {
    path.unshift(cellToLatLng(cur.i, cur.j));
    const key = nodeKey(cur.i, cur.j);
    if (key === startKey) break;
    cur = prev.get(key);
  }
  return { path, cost: goalCost };
}

function pathToWaypoints(
  origin: LatLng,
  path: LatLng[],
  maxWaypoints: number
): LatLng[] {
  if (path.length < 2) return [];
  const inner = path.slice(1, path.length - 1);
  const n = Math.min(maxWaypoints, Math.max(2, Math.floor(inner.length / 4)));
  if (inner.length <= n) return inner;
  const step = (inner.length - 1) / (n + 1);
  const waypoints: LatLng[] = [];
  for (let k = 0; k < n; k++) {
    const idx = Math.min(Math.round((k + 1) * step), inner.length - 1);
    waypoints.push(inner[idx]);
  }
  waypoints.sort(
    (a, b) => haversineMeters(origin, a) - haversineMeters(origin, b)
  );
  return waypoints;
}

const MAX_PATH_LENGTH_RATIO = 1.6;

/**
 * Combined Dijkstra + A*: run both on the same grid (cost = distance × (1 + danger)),
 * then pick the path with better cost and valid length. Returns waypoints for the chosen path.
 */
export function getSafeRouteWaypointsDijkstra(
  origin: LatLng,
  destination: LatLng,
  maxWaypoints: number = 5
): LatLng[] {
  const directM = haversineMeters(origin, destination);

  const { path: pathD, cost: costD } = runPathfind(origin, destination, false); // Dijkstra
  const { path: pathA, cost: costA } = runPathfind(origin, destination, true);  // A*

  const pathLength = (p: LatLng[]) => {
    let m = 0;
    for (let i = 0; i < p.length - 1; i++) m += haversineMeters(p[i], p[i + 1]);
    return m;
  };
  const valid = (p: LatLng[]) => p.length >= 2 && pathLength(p) <= directM * MAX_PATH_LENGTH_RATIO;

  const validD = valid(pathD);
  const validA = valid(pathA);

  const blendedScore = (p: LatLng[]) => {
    const dist = pathLength(p);
    const safety = getRouteSafetyScore(p);
    return dist + safety * 0.5;
  };

  let chosen: LatLng[];
  if (validD && validA) {
    chosen = blendedScore(pathD) <= blendedScore(pathA) ? pathD : pathA;
  } else if (validD) {
    chosen = pathD;
  } else if (validA) {
    chosen = pathA;
  } else {
    return [];
  }

  return pathToWaypoints(origin, chosen, maxWaypoints);
}
