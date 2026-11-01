/**
 * Google Places Autocomplete + Place Details service.
 * Provides live search for any location so users aren't limited to hardcoded places.
 */

import { GOOGLE_MAPS_API_KEY } from '../config';

export type PlacePrediction = {
  placeId: string;
  name: string;
  address: string;
};

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

const RUTGERS_CENTER = { lat: 40.5008, lng: -74.4474 };
const BIAS_RADIUS_M = 15000;

let abortController: AbortController | null = null;

/**
 * Fetch autocomplete predictions from Google Places API.
 * Biased toward the Rutgers campus area but returns results for any location.
 */
export async function searchPlaces(query: string): Promise<PlacePrediction[]> {
  if (!query.trim() || !GOOGLE_MAPS_API_KEY) return [];

  if (abortController) abortController.abort();
  abortController = new AbortController();

  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_MAPS_API_KEY,
    location: `${RUTGERS_CENTER.lat},${RUTGERS_CENTER.lng}`,
    radius: String(BIAS_RADIUS_M),
    sessiontoken: getSessionToken(),
  });

  try {
    const res = await fetch(`${AUTOCOMPLETE_URL}?${params}`, {
      signal: abortController.signal,
    });
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      if (data.status === 'REQUEST_DENIED') {
        console.warn(
          '[PlacesSearch] Places API denied:', data.error_message,
          '\nEnable "Places API" at https://console.cloud.google.com/apis/library/places-backend.googleapis.com',
        );
      } else {
        console.warn('[PlacesSearch] Autocomplete status:', data.status, data.error_message);
      }
      return [];
    }

    return (data.predictions ?? []).map((p: AutocompletePrediction) => ({
      placeId: p.place_id,
      name: p.structured_formatting?.main_text ?? p.description,
      address: p.structured_formatting?.secondary_text ?? '',
    }));
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') return [];
    console.error('[PlacesSearch] Autocomplete error:', err);
    return [];
  }
}

/**
 * Fetch full details (lat/lng) for a place by its placeId.
 * Uses the same session token as autocomplete to avoid extra billing.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  if (!placeId || !GOOGLE_MAPS_API_KEY) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,geometry',
    key: GOOGLE_MAPS_API_KEY,
    sessiontoken: consumeSessionToken(),
  });

  try {
    const res = await fetch(`${DETAILS_URL}?${params}`);
    const data = await res.json();

    if (data.status !== 'OK' || !data.result?.geometry?.location) {
      console.warn('[PlacesSearch] Details status:', data.status, data.error_message);
      return null;
    }

    const loc = data.result.geometry.location;
    return {
      placeId,
      name: data.result.name ?? '',
      address: data.result.formatted_address ?? '',
      latitude: loc.lat,
      longitude: loc.lng,
    };
  } catch (err) {
    console.error('[PlacesSearch] Details error:', err);
    return null;
  }
}

// ── Session token management ────────────────────────────────────────────
// Google charges per-session for Autocomplete + Details when a session
// token is used. We generate one per search session and consume it on
// Place Details call.

let _sessionToken: string | null = null;

function uuid4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getSessionToken(): string {
  if (!_sessionToken) _sessionToken = uuid4();
  return _sessionToken;
}

function consumeSessionToken(): string {
  const token = getSessionToken();
  _sessionToken = null;
  return token;
}

// ── Google API response types (minimal) ─────────────────────────────────

type AutocompletePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};
