/**
 * Google Directions API client.
 * Decodes the overview polyline and returns coordinates + steps for turn-by-turn.
 */

export type LatLng = { latitude: number; longitude: number };

export type RouteStep = {
  instruction: string;
  distance: string; // e.g. "200 ft"
  duration: string; // e.g. "1 min"
};

export type RouteOption = {
  coordinates: LatLng[];
  steps: RouteStep[];
  durationMinutes: number;
  distanceMiles: number;
  durationText: string;  // e.g. "7 mins"
  distanceText: string;  // e.g. "0.3 mi"
  summary?: string; // Route summary from Google
  trafficLevel?: 'light' | 'moderate' | 'heavy' | 'severe'; // For driving mode (Google/Apple severity)
};

export type DirectionsResult = {
  routes: RouteOption[]; // All route options
  selectedRouteIndex: number; // Index of currently selected route (default 0)
};

/**
 * Decode Google's encoded polyline format.
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }
  return points;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export type TravelMode = 'walking' | 'driving';

/**
 * Fetch directions from origin to destination using Google Directions API.
 * Optionally pass waypoints to route around areas (e.g. high-crime zones).
 * Returns route geometry, steps, duration, and distance.
 */
function isValidLatLng(p: LatLng): boolean {
  return (
    typeof p?.latitude === 'number' &&
    typeof p?.longitude === 'number' &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}

export async function fetchDirections(
  origin: LatLng,
  destination: LatLng,
  apiKey: string,
  mode: TravelMode = 'walking',
  waypoints?: LatLng[]
): Promise<DirectionsResult> {
  if (!apiKey) {
    throw new Error(
      'Google Maps API key not set. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file (see .env.example) and restart Expo.'
    );
  }
  if (!isValidLatLng(origin) || !isValidLatLng(destination)) {
    throw new Error('Invalid origin or destination coordinates.');
  }
  if (waypoints?.some((w) => !isValidLatLng(w))) {
    throw new Error('Invalid waypoint coordinates.');
  }

  // Request alternate routes; for driving, request traffic so we get duration_in_traffic
  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode,
    alternatives: waypoints?.length ? 'false' : 'true', // Single route when using waypoints
    key: apiKey,
  });
  if (waypoints?.length) {
    params.set('waypoints', waypoints.map((w) => `${w.latitude},${w.longitude}`).join('|'));
  }
  if (mode === 'driving') {
    params.set('departure_time', 'now'); // Required for duration_in_traffic (traffic colors)
  }
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  console.log('[Directions API] Request URL:', url.replace(apiKey, '***HIDDEN***'));
  
  let res: Response;
  let text: string;
  try {
    res = await fetch(url);
    text = await res.text();
  } catch (networkError) {
    const err = networkError instanceof Error ? networkError.message : String(networkError);
    console.error('[Directions API] Network error:', err);
    throw new Error(`Directions request failed: ${err}. Check your network connection.`);
  }
  
  console.log('[Directions API] HTTP status:', res.status, 'Response length:', text?.length ?? 0);
  if (text && text.length < 500) {
    console.log('[Directions API] Raw response:', text);
  }
  
  if (!res.ok) {
    throw new Error(
      `Directions API returned HTTP ${res.status}. ${text?.substring(0, 200) ?? ''}`
    );
  }
  
  let data: { status?: string; error_message?: string; routes?: unknown[] };
  try {
    data = JSON.parse(text);
  } catch (parseError) {
    console.error('[Directions API] Failed to parse JSON response:', parseError);
    console.error('[Directions API] Response text:', text);
    throw new Error(`Invalid JSON response from Directions API: ${text.substring(0, 200)}`);
  }
  
  console.log('[Directions API] Parsed response status:', data.status);

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    const errorMsg = data.error_message || data.status || 'Directions request failed';
    
    // Include Google's error_message so the user sees the real reason (e.g. API not enabled, invalid key)
    if (data.status === 'REQUEST_DENIED') {
      throw new Error(
        `Directions API denied: ${errorMsg}\n\n` +
        'Fix: 1) Enable "Directions API" at https://console.cloud.google.com/apis/library/directions-backend.googleapis.com\n' +
        '2) Ensure .env has EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key and restart Expo (npx expo start --clear)\n' +
        '3) If the key is restricted, allow "Directions API" or use an unrestricted key for development.'
      );
    }
    if (data.status === 'INVALID_REQUEST') {
      throw new Error(`Invalid request: ${errorMsg}`);
    }
    if (data.status === 'OVER_QUERY_LIMIT') {
      throw new Error(`Directions API quota exceeded: ${errorMsg}`);
    }
    
    throw new Error(errorMsg);
  }

  if (!data.routes?.length) {
    throw new Error('No route found');
  }

  // Process all routes (including alternates). With waypoints, a route has multiple legs — merge them so navigation goes to the real destination.
  const routeOptions: RouteOption[] = (data.routes || []).map((route: Record<string, unknown>) => {
    const legs = (route.legs || []) as Array<Record<string, unknown>>;
    if (legs.length === 0) return null;

    const overviewPolyline = route.overview_polyline as { points?: string } | undefined;
    const encoded = overviewPolyline?.points;
    if (!encoded || typeof encoded !== 'string') {
      return null;
    }

    let coordinates: LatLng[];
    try {
      coordinates = decodePolyline(encoded);
    } catch {
      return null;
    }
    if (coordinates.length === 0) return null;

    // Merge steps and totals from all legs (origin → waypoint1 → … → destination)
    const steps: RouteStep[] = [];
    let durationValue = 0;
    let distanceValue = 0;
    for (const leg of legs) {
      const legSteps = (leg.steps || []) as Array<{ html_instructions?: string; distance?: { text?: string }; duration?: { text?: string } }>;
      for (const s of legSteps) {
        steps.push({
          instruction: s.html_instructions ? stripHtml(s.html_instructions) : 'Continue',
          distance: s.distance?.text ?? '',
          duration: s.duration?.text ?? '',
        });
      }
      durationValue += (leg.duration as { value?: number } | undefined)?.value ?? 0;
      distanceValue += (leg.distance as { value?: number } | undefined)?.value ?? 0;
    }

    const durationMinutes = Math.round(durationValue / 60);
    const distanceMiles = distanceValue / 1609.34;

    // Determine traffic level from first leg when driving (Google only gives duration_in_traffic per leg when applicable)
    let trafficLevel: 'light' | 'moderate' | 'heavy' | 'severe' | undefined;
    if (mode === 'driving' && legs[0]) {
      const leg0 = legs[0];
      const leg0Duration = (leg0.duration as { value?: number } | undefined)?.value ?? 0;
      const durationInTraffic = leg0.duration_in_traffic as { value?: number } | undefined;
      const trafficValue = durationInTraffic?.value;
      if (typeof trafficValue === 'number' && leg0Duration > 0) {
        const trafficDelayMinutes = (trafficValue - leg0Duration) / 60;
        if (trafficDelayMinutes > 15) {
          trafficLevel = 'severe';
        } else if (trafficDelayMinutes > 7) {
          trafficLevel = 'heavy';
        } else if (trafficDelayMinutes > 3) {
          trafficLevel = 'moderate';
        } else {
          trafficLevel = 'light';
        }
      }
    }

    return {
      coordinates,
      steps,
      durationMinutes,
      distanceMiles,
      durationText: `${durationMinutes} min`,
      distanceText: `${distanceMiles.toFixed(1)} mi`,
      summary: (route.summary as string) || '',
      trafficLevel,
    };
  }).filter((r): r is RouteOption => r !== null);

  if (routeOptions.length === 0) {
    throw new Error('No valid routes found');
  }

  return {
    routes: routeOptions,
    selectedRouteIndex: 0, // Default to first route
  };
}
