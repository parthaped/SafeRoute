# How to Make the Map Work as a Real Guiding System

This guide tells you **exactly** how to wire a map API into SafeRoute so the Route tab becomes a real navigation/guiding flow. It builds on the concepts in [MAP_AND_ML_APIS.md](./MAP_AND_ML_APIS.md).

---

## 1. Install the map library

```bash
npx expo install react-native-maps
```

Expo Go works with Apple Maps (iOS) and Google Maps (Android) out of the box. For your own builds with Google Maps on both platforms, add API keys in `app.json` as described in [MAP_AND_ML_APIS.md § 1](./MAP_AND_ML_APIS.md#1-real-map-display-apis).

---

## 2. Replace the mock map in MapScreen

Right now `MapScreen` uses a `LinearGradient` + SVG path as a placeholder. Swap that for a real `MapView` and keep the same layout (header, “Where to?” bar, bottom card).

**Add the import:**

```ts
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
```

**Replace the gradient + SVG block** with something like:

```tsx
<MapView
  provider={PROVIDER_GOOGLE}  // optional; omit to use platform default
  mapType={mapType}          // 'standard' | 'satellite' | 'hybrid'
  style={StyleSheet.absoluteFill}
  initialRegion={{
    latitude: 40.5008,
    longitude: -74.4474,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  }}
  showsUserLocation
  showsMyLocationButton
>
  {routeCoordinates.length > 0 && (
    <Polyline
      coordinates={routeCoordinates}
      strokeColor="#FFD60A"
      strokeWidth={5}
    />
  )}
  {destination && (
    <Marker coordinate={destination} title={destinationName} />
  )}
  {/* Optional: risk polygons as Polygon components */}
</MapView>
```

Introduce state for:

- `routeCoordinates: { latitude, longitude }[]` – from your routing API.
- `destination: { latitude, longitude } | null` – chosen destination.
- `mapType` – for a standard/satellite toggle in the header or menu.

The “You” marker can stay as a custom view, or rely on `showsUserLocation` and remove the mock marker.

---

## 3. Turn “Where to?” into real places (geocoding)

The current suggestions are static labels. To make them guide somewhere:

**Option A – Keep static suggestions but add coordinates**

In `MapScreen` (or a small `places.ts`), define each suggestion with lat/lon:

```ts
export const MOCK_SUGGESTIONS = [
  { id: '1', name: 'Rutgers Student Center', latitude: 40.4995, longitude: -74.4482 },
  { id: '2', name: 'Alexander Library', latitude: 40.5003, longitude: -74.4470 },
  // ...
];
```

When the user picks one, set `destination` and call your routing logic with **origin** (user or a fixed start) and this **destination**.

**Option B – Geocoding API**

Use Google Geocoding, Mapbox Geocoding, or similar to turn “Where to?” text into coordinates:

- User types in the search bar.
- On submit or debounce, call the Geocoding API.
- Use the first result’s `geometry.location` as `destination` and optionally show a short list of results as suggestions.

Then pass that `destination` into your routing step (below).

---

## 4. Get a route (Directions API or Valhalla)

**Simple A→B (no risk avoidance):**

- **Google:** [Directions API](https://developers.google.com/maps/documentation/directions) or [Routes API](https://developers.google.com/maps/documentation/routes).
- Send origin + destination; parse the response polyline (e.g. `overview_polyline.points`) and decode it into `[{ latitude, longitude }, ...]` (use a small `decodePolyline` helper or a package).
- Set `routeCoordinates` and fit the map to the route (e.g. `mapRef.current?.fitToCoordinates(routeCoordinates, { edgePadding: { top, right, bottom, left } })`).

**Avoid high‑risk areas (Rutgers NB):**

- Use **Valhalla** (or a host like Stadia/Mapbox) with `exclude_polygons` as in [MAP_AND_ML_APIS.md § 2](./MAP_AND_ML_APIS.md#2-routing-apis-including-avoid-high-risk-areas).
- Your app or backend must:
  1. Get “risk polygons” from your ML or a predefined list (see MAP_AND_ML_APIS.md § 4).
  2. Call Valhalla with `locations: [origin, destination]` and `exclude_polygons: [/* risk polygons */]`.
  3. Parse the returned shape into `routeCoordinates` and draw with `<Polyline>`.

Implement this in a small module, e.g. `src/services/routing.ts`:

```ts
// Pseudocode
export async function getSafeRoute(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  excludePolygons?: Array<Array<[number, number]>>
): Promise<{ coordinates: Array<{ latitude: number; longitude: number }>; durationMinutes: number; distanceMiles: number }> {
  if (excludePolygons?.length) {
    // call Valhalla with exclude_polygons
  } else {
    // call Google Directions and decode polyline
  }
  // return { coordinates, durationMinutes, distanceMiles }
}
```

`MapScreen` then calls `getSafeRoute(origin, destination, riskPolygons)` when the user picks a destination (and optionally when you have risk polygons). It sets `routeCoordinates` and updates the bottom card (duration, distance, “Avoids High Risk Area” when you used Valhalla + polygons).

---

## 5. Draw the route and keep the guiding UX

You already have:

- **Idle:** “Where to?” bar + optional suggestions.
- **Route ready:** Bottom card with “Avoids High Risk Area”, “7 min · 0.3 mi”, “Start”.
- **Active:** “Guiding — avoids high risk”, “~5 min left”, “End route”.

After wiring the API:

1. **Route ready:**  
   - `routeCoordinates` and `destination` are set from `getSafeRoute` + chosen suggestion/geocode.  
   - Render `<Polyline>` and `<Marker>` for destination.  
   - Card text comes from `durationMinutes` and `distanceMiles` (and “Avoids High Risk Area” when you used Valhalla + polygons).

2. **Start → Active:**  
   - Keep the same route on the map.  
   - Optionally start a timer or use a “remaining distance” from your routing response to update “~X min left” in the card.

3. **Turn‑by‑turn (optional):**  
   - Parse legs/steps from Directions or Valhalla.  
   - Store `currentStepIndex` and show something like “In 200 ft, turn left onto College Ave” in the bottom card or a compact top banner.  
   - Advance `currentStepIndex` when the user’s location passes the step’s end (e.g. using `expo-location` and distance threshold).

---

## 6. Optional: user location as origin

To use the user’s location as the route start:

```bash
npx expo install expo-location
```

- Request foreground location permission.
- Use `Location.getCurrentPositionAsync()` or `Location.watchPositionAsync()`.
- Pass that `{ latitude, longitude }` as `origin` in `getSafeRoute(origin, destination, excludePolygons)`.

You can still offer “Use current location” in the “Where to?” flow so the user explicitly confirms using GPS as the start.

---

## 7. Checklist

| Step | What to do |
|------|------------|
| 1 | `npx expo install react-native-maps` |
| 2 | In `MapScreen`, replace the mock map with `<MapView>`, `<Polyline>`, `<Marker>` and state for `routeCoordinates`, `destination`, `mapType` |
| 3 | Attach real coordinates to suggestions or add geocoding for “Where to?” |
| 4 | Add `getSafeRoute(origin, destination, excludePolygons)` using Google Directions and/or Valhalla |
| 5 | On “Get route” / destination pick, call `getSafeRoute`, set `routeCoordinates` and card summary |
| 6 | (Optional) Use `expo-location` for live origin and turn‑by‑turn |

Once step 5 is done, the map behaves as a real guiding system: user picks destination → you fetch a route → you draw it and show ETA/distance, then “Start” begins the guided run. For avoidance of high‑risk zones around Rutgers NB, use Valhalla + `exclude_polygons` and your ML/risk polygons as in [MAP_AND_ML_APIS.md](./MAP_AND_ML_APIS.md).
