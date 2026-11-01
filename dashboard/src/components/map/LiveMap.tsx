import { useEffect, useRef, useCallback, useState } from 'react';
import { getLoader, DEFAULT_CENTER, DEFAULT_ZOOM, DARK_MAP_STYLES, LIGHT_MAP_STYLES } from '../../lib/mapbox';
import { useMapStore } from '../../stores/useMapStore';
import { useIncidentStore } from '../../stores/useIncidentStore';
import { useBroadcastStore } from '../../stores/useBroadcastStore';
import { useMockIncidentData, useMockMapLayerData, useMockBroadcastData } from '../../hooks/useMockData';
import { useThemeStore } from '../../stores/useThemeStore';
import type { LatLng } from '../../types/geo';

export function LiveMap() {
  useMockIncidentData();
  useMockMapLayerData();
  useMockBroadcastData();

  const theme = useThemeStore((s) => s.theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const incidentMarkersRef = useRef<google.maps.Marker[]>([]);
  const sensorMarkersRef = useRef<google.maps.Marker[]>([]);
  const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const routeMarkersRef = useRef<google.maps.Marker[]>([]);
  const patrolPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const patrolMarkersRef = useRef<google.maps.Marker[]>([]);
  const broadcastPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const broadcastMarkersRef = useRef<google.maps.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const snappedRef = useRef(false);

  const openDetail = useMapStore((s) => s.openMarkerDetail);
  const closeDetail = useMapStore((s) => s.closeMarkerDetail);

  const layers = useMapStore((s) => s.layers);
  const heatmapData = useMapStore((s) => s.heatmapData);
  const sensors = useMapStore((s) => s.sensors);
  const activeRoutes = useMapStore((s) => s.activeRoutes);
  const patrolSuggestions = useMapStore((s) => s.patrolSuggestions);
  const setActiveRoutes = useMapStore((s) => s.setActiveRoutes);
  const setPatrolSuggestions = useMapStore((s) => s.setPatrolSuggestions);
  const incidents = useIncidentStore((s) => s.incidents);
  const broadcasts = useBroadcastStore((s) => s.broadcasts);


  const initMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current) return;

    try {
      const loader = getLoader();
      const { Map } = await loader.importLibrary('maps');
      const { HeatmapLayer } = await loader.importLibrary('visualization');

      const currentTheme = useThemeStore.getState().theme;
      const map = new Map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        styles: currentTheme === 'light' ? LIGHT_MAP_STYLES : DARK_MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        keyboardShortcuts: false,
        backgroundColor: currentTheme === 'light' ? '#f5f5f7' : '#000000',
        gestureHandling: 'greedy',
        scrollwheel: true,
        isFractionalZoomEnabled: true,
      });

      const heatmap = new HeatmapLayer({
        map,
        data: [],
        radius: 45,
        opacity: 0.45,
        gradient: [
          'rgba(0,0,0,0)',
          'rgba(225,6,0,0.04)',
          'rgba(225,6,0,0.10)',
          'rgba(225,6,0,0.18)',
          'rgba(225,6,0,0.30)',
          'rgba(225,6,0,0.42)',
          'rgba(225,6,0,0.55)',
          'rgba(225,6,0,0.70)',
        ],
      });

      map.addListener('click', () => {
        closeDetail();
      });

      mapRef.current = map;
      heatmapLayerRef.current = heatmap;
      setMapReady(true);
    } catch (err) {
      console.error('[LiveMap] Map init failed:', err);
      setMapError(
        'Could not load Google Maps. Ensure the Maps JavaScript API is enabled and localhost is allowed in HTTP referrer restrictions.'
      );
    }
  }, []);

  useEffect(() => {
    initMap();
  }, [initMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({
      styles: theme === 'light' ? LIGHT_MAP_STYLES : DARK_MAP_STYLES,
    });
  }, [theme]);

  // ── Snap demo routes to real roads via Directions API ─────────────────
  // Live routes from mobile already have road-snapped paths; only snap
  // demo routes (id starts with "route-") and patrol suggestions.
  useEffect(() => {
    if (!mapReady || snappedRef.current) return;
    const demoRoutes = activeRoutes.filter((r) => r.id.startsWith('route-'));
    if (demoRoutes.length === 0 && patrolSuggestions.length === 0) return;
    snappedRef.current = true;

    const service = new google.maps.DirectionsService();

    async function snapPath(path: LatLng[]): Promise<LatLng[]> {
      if (path.length < 2) return path;
      const origin = path[0];
      const dest = path[path.length - 1];
      const wps = path.slice(1, -1).map((p) => ({
        location: new google.maps.LatLng(p.lat, p.lng),
        stopover: false,
      }));

      const result = await service.route({
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(dest.lat, dest.lng),
        waypoints: wps.length > 0 ? wps : undefined,
        travelMode: google.maps.TravelMode.WALKING,
        provideRouteAlternatives: wps.length === 0,
      });

      // Pick the shortest route when alternatives are available
      let best = result.routes[0];
      if (result.routes.length > 1) {
        let bestDist = Infinity;
        for (const r of result.routes) {
          const dist = r.legs.reduce((sum, l) => sum + (l.distance?.value ?? 0), 0);
          if (dist < bestDist) {
            bestDist = dist;
            best = r;
          }
        }
      }

      const overview = best?.overview_path;
      if (overview?.length) {
        return overview.map((p) => ({ lat: p.lat(), lng: p.lng() }));
      }
      return path;
    }

    (async () => {
      try {
        const [snappedDemoRoutes, snappedPatrols] = await Promise.all([
          Promise.all(
            demoRoutes.map(async (r) => {
              try { return { ...r, path: await snapPath(r.path) }; }
              catch { return r; }
            })
          ),
          Promise.all(
            patrolSuggestions.map(async (p) => {
              try { return { ...p, path: await snapPath(p.path) }; }
              catch { return p; }
            })
          ),
        ]);
        const liveRoutes = activeRoutes.filter((r) => !r.id.startsWith('route-'));
        setActiveRoutes([...snappedDemoRoutes, ...liveRoutes]);
        setPatrolSuggestions(snappedPatrols);
      } catch (err) {
        console.warn('[LiveMap] Route snapping failed, using raw paths:', err);
      }
    })();
  }, [mapReady, activeRoutes, patrolSuggestions, setActiveRoutes, setPatrolSuggestions]);

  // ── Layer 1: Heatmap ────────────────────────────────────────────────────
  useEffect(() => {
    const heatmap = heatmapLayerRef.current;
    if (!heatmap || !mapReady) return;
    heatmap.setData(
      heatmapData.map((p) => ({
        location: new google.maps.LatLng(p.lat, p.lng),
        weight: p.weight,
      }))
    );
  }, [heatmapData, mapReady]);

  useEffect(() => {
    const heatmap = heatmapLayerRef.current;
    if (!heatmap || !mapReady) return;
    heatmap.setMap(layers.heatmap ? mapRef.current : null);
  }, [layers.heatmap, mapReady]);

  // ── Layer 2: Active Routes (with user markers + labels) ─────────────────
  useEffect(() => {
    const map = mapRef.current;
    routePolylinesRef.current.forEach((p) => p.setMap(null));
    routePolylinesRef.current = [];
    routeMarkersRef.current.forEach((m) => m.setMap(null));
    routeMarkersRef.current = [];
    if (!map || !mapReady || !layers.activeRoutes) return;

    activeRoutes.forEach((route) => {
      const routeColor = route.color ?? '#00D4FF';

      const glow = new google.maps.Polyline({
        map,
        path: route.path,
        strokeColor: routeColor,
        strokeOpacity: 0.25,
        strokeWeight: 14,
        geodesic: true,
        zIndex: 12,
      });
      routePolylinesRef.current.push(glow);

      const border = new google.maps.Polyline({
        map,
        path: route.path,
        strokeColor: '#000000',
        strokeOpacity: 0.6,
        strokeWeight: 6,
        geodesic: true,
        zIndex: 13,
      });
      routePolylinesRef.current.push(border);

      const polyline = new google.maps.Polyline({
        map,
        path: route.path,
        strokeColor: routeColor,
        strokeOpacity: 1,
        strokeWeight: 4,
        geodesic: true,
        zIndex: 14,
      });
      routePolylinesRef.current.push(polyline);

      const start = route.path[0];
      if (start) {
        const userSvg = activeRouteUserSvg(routeColor);
        const marker = new google.maps.Marker({
          map,
          position: start,
          icon: {
            url: userSvg,
            scaledSize: new google.maps.Size(26, 26),
            anchor: new google.maps.Point(13, 13),
          },
          zIndex: 16,
        });
        marker.addListener('click', () => {
          openDetail({ kind: 'route', id: route.id, label: route.label, userId: route.userId, location: start });
        });
        routeMarkersRef.current.push(marker);
      }

      const end = route.path[route.path.length - 1];
      if (end) {
        const destSvg = activeRouteDestSvg(routeColor);
        const marker = new google.maps.Marker({
          map,
          position: end,
          icon: {
            url: destSvg,
            scaledSize: new google.maps.Size(18, 18),
            anchor: new google.maps.Point(9, 9),
          },
          zIndex: 16,
        });
        routeMarkersRef.current.push(marker);
      }
    });
  }, [activeRoutes, layers.activeRoutes, mapReady]);

  // ── Layer 3: Sensor Anomalies ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    sensorMarkersRef.current.forEach((m) => m.setMap(null));
    sensorMarkersRef.current = [];
    if (!map || !mapReady || !layers.sensorAnomalies) return;

    const anomalySensors = sensors.filter((s) => s.anomalyActive);

    anomalySensors.forEach((sensor) => {
      const color = sensorHealthColor(sensor.health);
      const svg = sensorMarkerSvg(sensor.type, color);

      const marker = new google.maps.Marker({
        map,
        position: sensor.location,
        icon: {
          url: svg,
          scaledSize: new google.maps.Size(26, 26),
          anchor: new google.maps.Point(13, 13),
        },
        zIndex: 30,
      });
      marker.addListener('click', () => {
        openDetail({
          kind: 'sensor',
          id: sensor.id,
          label: sensor.label,
          type: sensor.type,
          health: sensor.health,
          battery: sensor.battery,
          firmware: sensor.firmware,
          location: sensor.location,
        });
      });
      sensorMarkersRef.current.push(marker);
    });
  }, [sensors, layers.sensorAnomalies, mapReady]);

  // ── Layer 4: Incident Reports ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    incidentMarkersRef.current.forEach((m) => m.setMap(null));
    incidentMarkersRef.current = [];
    if (!map || !mapReady || !layers.reports) return;

    const visible = incidents.filter(
      (i) => i.status === 'active' || i.status === 'escalated'
    );

    visible.forEach((inc) => {
      const color = severityColor(inc.severity);
      const isEscalated = inc.status === 'escalated';
      const size = isEscalated ? 22 : 14;
      const svg = incidentMarkerSvg(color, isEscalated, size);

      const marker = new google.maps.Marker({
        map,
        position: inc.location,
        icon: {
          url: svg,
          scaledSize: new google.maps.Size(size, size),
          anchor: new google.maps.Point(size / 2, size / 2),
        },
        zIndex: isEscalated ? 50 : 40,
      });

      marker.addListener('click', () => {
        openDetail({
          kind: 'incident',
          id: inc.id,
          title: inc.title,
          description: inc.description,
          severity: inc.severity,
          status: inc.status,
          reportedAt: inc.reportedAt,
          sensorId: inc.sensorId,
          location: inc.location,
        });
      });

      incidentMarkersRef.current.push(marker);
    });
  }, [incidents, layers.reports, mapReady]);

  // ── Layer 5: Hazard Broadcasts ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    broadcastPolygonsRef.current.forEach((p) => p.setMap(null));
    broadcastPolygonsRef.current = [];
    broadcastMarkersRef.current.forEach((m) => m.setMap(null));
    broadcastMarkersRef.current = [];
    if (!map || !mapReady || !layers.hazardBroadcasts) return;

    const activeBroadcasts = broadcasts.filter((b) => b.status === 'active');

    activeBroadcasts.forEach((bc) => {
      const polygon = new google.maps.Polygon({
        map,
        paths: bc.zone.polygon,
        strokeColor: '#FF3B30',
        strokeOpacity: 0.6,
        strokeWeight: 1.5,
        fillColor: '#FF3B30',
        fillOpacity: 0.06,
        zIndex: 10,
      });
      broadcastPolygonsRef.current.push(polygon);

      const center = polygonCenter(bc.zone.polygon);
      const labelSvg = hazardBadgeSvg();

      const marker = new google.maps.Marker({
        map,
        position: center,
        icon: {
          url: labelSvg,
          scaledSize: new google.maps.Size(22, 22),
          anchor: new google.maps.Point(11, 11),
        },
        zIndex: 15,
      });

      const bcDetail = {
        kind: 'broadcast' as const,
        id: bc.id,
        title: bc.title,
        message: bc.message,
        zoneLabel: bc.zone.label,
        createdAt: bc.createdAt,
        createdBy: bc.createdBy,
        affectedRouteCount: bc.affectedRouteCount,
        location: center,
      };

      marker.addListener('click', () => openDetail(bcDetail));
      polygon.addListener('click', () => openDetail(bcDetail));

      broadcastMarkersRef.current.push(marker);
    });
  }, [broadcasts, layers.hazardBroadcasts, mapReady]);

  // ── Layer 6: Patrol Suggestions ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    patrolPolylinesRef.current.forEach((p) => p.setMap(null));
    patrolPolylinesRef.current = [];
    patrolMarkersRef.current.forEach((m) => m.setMap(null));
    patrolMarkersRef.current = [];
    if (!map || !mapReady || !layers.patrolSuggestions) return;

    patrolSuggestions.forEach((patrol) => {
      const color = patrolPriorityColor(patrol.priority);

      const glow = new google.maps.Polyline({
        map,
        path: patrol.path,
        strokeColor: color,
        strokeOpacity: 0.12,
        strokeWeight: 10,
        geodesic: true,
        zIndex: 19,
      });
      patrolPolylinesRef.current.push(glow);

      const line = new google.maps.Polyline({
        map,
        path: patrol.path,
        strokeColor: color,
        strokeOpacity: 0,
        strokeWeight: 2.5,
        geodesic: true,
        zIndex: 20,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.85,
              strokeColor: color,
              strokeWeight: 2.5,
              scale: 3,
            },
            offset: '0',
            repeat: '14px',
          },
        ],
      });
      patrolPolylinesRef.current.push(line);

      const start = patrol.path[0];
      if (start) {
        const badgeSvg = patrolBadgeSvg(patrol.priority);
        const marker = new google.maps.Marker({
          map,
          position: start,
          icon: {
            url: badgeSvg,
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12),
          },
          zIndex: 25,
        });
        marker.addListener('click', () => {
          openDetail({
            kind: 'patrol',
            id: patrol.id,
            label: patrol.label,
            reason: patrol.reason,
            priority: patrol.priority,
            location: start,
          });
        });
        patrolMarkersRef.current.push(marker);
      }
    });
  }, [patrolSuggestions, layers.patrolSuggestions, mapReady]);

  // ── Zoom controls ───────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    const map = mapRef.current;
    if (map) map.setZoom((map.getZoom() ?? DEFAULT_ZOOM) + 1);
  }, []);

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current;
    if (map) map.setZoom((map.getZoom() ?? DEFAULT_ZOOM) - 1);
  }, []);

  if (mapError) {
    return (
      <div className="relative w-full h-full bg-surface-base flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="text-center p-8 max-w-md">
          <p className="text-[14px] text-risk-high font-medium mb-2">Map Unavailable</p>
          <p className="text-[12px] text-text-tertiary leading-relaxed">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-surface-base" style={{ minHeight: 400 }}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-5 z-10 flex flex-col">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 flex items-center justify-center bg-surface-sidebar backdrop-blur-[30px] border border-surface-border rounded-t-xl text-text-tertiary hover:text-text-primary hover:bg-surface-hover active:bg-surface-card transition-all cursor-pointer"
          aria-label="Zoom in"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
        </button>
        <div className="h-px bg-surface-border" />
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 flex items-center justify-center bg-surface-sidebar backdrop-blur-[30px] border border-surface-border border-t-0 rounded-b-xl text-text-tertiary hover:text-text-primary hover:bg-surface-hover active:bg-surface-card transition-all cursor-pointer"
          aria-label="Zoom out"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
        </button>
      </div>

      {/* Map legend */}
      <div className="absolute bottom-6 left-4 z-10 bg-surface-sidebar backdrop-blur-[30px] border border-surface-border rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
        <LegendDot color="#E10600" label="Critical" />
        <LegendDot color="#FF6B35" label="High" />
        <LegendDot color="#FFD60A" label="Medium" />
        <LegendDot color="#2ECC71" label="Low" />
        <div className="h-px bg-surface-border my-0.5" />
        <LegendLine color="#00D4FF" label="Active Route" dashed={false} />
        <LegendLine color="#FF3B30" label="Hazard Zone" dashed={false} />
        <LegendLine color="#A78BFA" label="Patrol Route" dashed />
      </div>
    </div>
  );
}

// ── Legend helpers ─────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-text-tertiary tracking-wide">{label}</span>
    </div>
  );
}

function LegendLine({ color, label, dashed }: { color: string; label: string; dashed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-3.5 h-[2px] inline-block rounded-full"
        style={
          dashed
            ? {
                backgroundImage: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 3px, transparent 3px, transparent 6px)`,
              }
            : { backgroundColor: color }
        }
      />
      <span className="text-[10px] text-text-tertiary tracking-wide">{label}</span>
    </div>
  );
}

// ── SVG builders ──────────────────────────────────────────────────────────

function incidentMarkerSvg(color: string, escalated: boolean, size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = cx - 1;
  const innerR = escalated ? outerR - 3.5 : outerR;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      (escalated
        ? `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.35"/>`
        : '') +
      `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${color}" opacity="0.9"/>` +
      `</svg>`
  )}`;
}

function sensorMarkerSvg(type: string, color: string): string {
  const iconPath = sensorSvgPath(type);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">` +
      `<rect x="1" y="1" width="24" height="24" rx="6" fill="#0A0A0A" stroke="${color}" stroke-width="1.2" opacity="0.92"/>` +
      `<g transform="translate(5,5)" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">` +
      iconPath +
      `</g>` +
      `</svg>`
  )}`;
}

function sensorSvgPath(type: string): string {
  switch (type) {
    case 'motion':
      return '<path d="M3 8 L8 3 L13 8 L8 13 Z"/>';
    case 'light':
      return '<circle cx="8" cy="8" r="4"/><line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/>';
    case 'acoustic':
      return '<path d="M6 5 v6"/><path d="M9 3 v10"/><path d="M12 6 v4"/><path d="M3 7 v2"/>';
    case 'environmental':
      return '<circle cx="8" cy="8" r="3"/><path d="M8 2 a6 6 0 0 1 0 12" fill="none"/>';
    default:
      return '<circle cx="8" cy="8" r="4"/>';
  }
}

function activeRouteUserSvg(color = '#00D4FF'): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">` +
      `<circle cx="13" cy="13" r="12" fill="${color}" opacity="0.2"/>` +
      `<circle cx="13" cy="13" r="8" fill="#000" opacity="0.5"/>` +
      `<circle cx="13" cy="13" r="6.5" fill="${color}"/>` +
      `<circle cx="13" cy="13" r="3" fill="#fff"/>` +
      `</svg>`
  )}`;
}

function activeRouteDestSvg(color = '#00D4FF'): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">` +
      `<circle cx="9" cy="9" r="8" fill="#000" opacity="0.4"/>` +
      `<circle cx="9" cy="9" r="6" fill="none" stroke="${color}" stroke-width="2" opacity="0.9"/>` +
      `<circle cx="9" cy="9" r="3" fill="${color}"/>` +
      `</svg>`
  )}`;
}

function hazardBadgeSvg(): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">` +
      `<rect x="1" y="1" width="20" height="20" rx="5" fill="#FF3B30" opacity="0.15"/>` +
      `<rect x="1" y="1" width="20" height="20" rx="5" fill="none" stroke="#FF3B30" stroke-width="1" opacity="0.5"/>` +
      `<text x="11" y="15.5" text-anchor="middle" font-size="13" font-weight="700" fill="#FF3B30">!</text>` +
      `</svg>`
  )}`;
}

function patrolBadgeSvg(priority: string): string {
  const color = patrolPriorityColor(priority);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">` +
      `<rect x="1" y="1" width="22" height="22" rx="6" fill="#0A0A0A" stroke="${color}" stroke-width="1.2" opacity="0.92"/>` +
      `<path d="M7 12 L10 12 L11.5 8 L13 16 L14.5 12 L17 12" stroke="${color}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>`
  )}`;
}

// ── Color helpers ─────────────────────────────────────────────────────────

function severityColor(severity: string): string {
  const map: Record<string, string> = {
    low: '#2ECC71',
    medium: '#FFD60A',
    high: '#FF6B35',
    critical: '#E10600',
  };
  return map[severity] ?? 'rgba(255,255,255,0.5)';
}

function sensorHealthColor(health: string): string {
  const map: Record<string, string> = {
    online: '#FF6B35',
    degraded: '#FFD60A',
    offline: '#E10600',
  };
  return map[health] ?? '#FF6B35';
}

function patrolPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    critical: '#E10600',
    high: '#A78BFA',
    medium: '#60A5FA',
    low: '#6EE7B7',
  };
  return map[priority] ?? '#A78BFA';
}

function polygonCenter(polygon: { lat: number; lng: number }[]): { lat: number; lng: number } {
  let lat = 0;
  let lng = 0;
  for (const p of polygon) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / polygon.length, lng: lng / polygon.length };
}

