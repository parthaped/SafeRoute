# SafeRoute: Real Maps, Map Types & ML Crime-Risk (Rutgers NB)

This document summarizes the APIs and approaches needed for:

1. **Real map display** with satellite/standard view  
2. **Routing** that can avoid high-risk areas  
3. **ML-based crime-risk** trained on Rutgers University New Brunswick

---

## 1. Real Map Display APIs

### Primary: `react-native-maps` (Expo-compatible)

- **Install:** `npx expo install react-native-maps`
- **Expo Go:** Works out of the box; uses Apple Maps on iOS and Google Maps on Android.
- **Production:** For Google Maps on both platforms you need API keys and a dev/build binary (not Expo Go).

**Map types (toggle satellite vs standard):**

| `mapType` value   | Description                          |
|-------------------|--------------------------------------|
| `standard`        | Default road map                     |
| `satellite`       | Satellite imagery only               |
| `hybrid`          | Satellite + roads and POI overlay    |
| `terrain`         | Topographic (Android only)           |
| `mutedStandard`   | Subtle base map (iOS 11+)            |

**Example toggle:**

```tsx
const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');

<MapView
  mapType={mapType}
  style={{ flex: 1 }}
  initialRegion={{
    latitude: 40.5008,
    longitude: -74.4474,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  }}
/>
// Toggle: setMapType(prev => prev === 'satellite' ? 'standard' : 'satellite')
```

**Google Maps API keys (when you ship with Google Maps):**

- **Android:** [Google Cloud Console](https://console.cloud.google.com/apis) → enable **Maps SDK for Android** → create API key → restrict to Android app (package + SHA-1).  
  In `app.json`: `"android": { "config": { "googleMaps": { "apiKey": "YOUR_KEY" } } }`
- **iOS:** Enable **Maps SDK for iOS** → create API key → restrict to iOS app (bundle ID).  
  In `app.json`: `"ios": { "config": { "googleMapsApiKey": "YOUR_KEY" } }`
- In code use `provider={PROVIDER_GOOGLE}` on `MapView` when you want Google Maps on both platforms.

**Docs:** [Expo MapView](https://docs.expo.dev/versions/latest/sdk/map-view/), [react-native-maps](https://github.com/react-native-maps/react-native-maps).

---

## 2. Routing APIs (Including “Avoid High-Risk Areas”)

You need a router that can **exclude polygons** so SafeRoute can avoid ML-predicted high-risk zones.

### Option A: Valhalla (supports `exclude_polygons`)

- **API:** Valhalla Turn-by-Turn (e.g. hosted by [Stadia Maps](https://stadiamaps.com/), [Mapbox](https://docs.mapbox.com/api/navigation/directions/), or self-hosted).
- **Parameter:** `exclude_polygons`: array of polygons, each as `[[lon, lat], [lon, lat], ...]`.
- **Caveat:** If both origin and destination lie *inside* an excluded polygon, Valhalla may still return a route that crosses it. Validate the route (e.g. check if polyline intersects your risk polygons) and fall back or warn.

**Example request shape (Valhalla-style):**

```json
{
  "locations": [
    { "lat": 40.5008, "lon": -74.4474 },
    { "lat": 40.5030, "lon": -74.4520 }
  ],
  "costing": "pedestrian",
  "exclude_polygons": [
    [[-74.451, 40.502], [-74.450, 40.502], [-74.450, 40.501], [-74.451, 40.501]]
  ]
}
```

### Option B: Google Routes API

- **Avoid options:** `avoidTolls`, `avoidHighways`, `avoidFerries`, `avoidIndoor` only.
- **No custom polygons.** You cannot pass “avoid this crime-risk polygon.”
- **Workaround:**  
  - Use your ML model to get high-risk polygons.  
  - Call Directions/Routes API for A→B.  
  - If the route goes through a risk polygon, either: (1) add intermediate waypoints that skirt the polygon and call the API again, or (2) use Valhalla/GraphHopper for that request.

### Option C: GraphHopper

- **Custom areas:** GraphHopper supports **custom_model.areas** (GeoJSON polygons) in custom profiles to change weights or exclude areas.
- **Use case:** Define “risk” polygons and give edges inside them very high cost or exclude them in the custom profile, then route with that profile.

### Option D: Custom avoidance on top of Google

- Get a route from Google Directions/Routes API.
- In your backend or app:  
  - Decode the route polyline.  
  - Check for intersection with your risk polygons.  
  - If it crosses, try alternative waypoints or call Valhalla/GraphHopper with `exclude_polygons` (or GraphHopper’s area restrictions) for the same A→B.

**Practical suggestion for SafeRoute:** Use **Google Directions API** (or Routes API) for “normal” routes and UI; use **Valhalla** (or similar) when you have risk polygons and want a route that avoids them. Valhalla’s `exclude_polygons` is the closest fit to “avoid these zones.”

---

## 3. Rutgers New Brunswick Crime Data for ML

### Official sources (Clery)

- **Safety Matters (Annual Security Report):**  
  [https://go.rutgers.edu/safety-matters-2025](https://go.rutgers.edu/safety-matters-2025)  
  Contains 3 years of New Brunswick crime by category and *location type* (On-Campus, Residence Hall, Non-Campus, Public Property), not lat/lon.
- **New Brunswick Clery stats (tables):**  
  [https://ipo.rutgers.edu/rupd/crime-stats-nb](https://ipo.rutgers.edu/rupd/crime-stats-nb)  
  Same: counts by offense and location category (Residence Hall, On-Campus, Non-Campus, Public Property). No coordinates.
- **Daily Crime & Fire Log:**  
  [https://ipo.rutgers.edu/publicsafety/crime-log](https://ipo.rutgers.edu/publicsafety/crime-log)  
  Recent incidents; may include date, time, general location. Check the log’s structure for address or building; if only “On-Campus” etc., you still need to approximate or use a separate geo dataset.
- **Records / FOIA-style request:**  
  For incident-level data (ideally with location or address), contact **RUPD Records Bureau** – [recordscentral@ipo.rutgers.edu](mailto:recordscentral@ipo.rutgers.edu), (848) 932-6512. Ask whether they can provide historical incident data (e.g. date, time, location/address or zone) in a format suitable for research/modeling, subject to their policies.

### What you need for ML

- **Ideal:** One row per incident with at least **date, time, location** (address or lat/lon).  
  Then you can:
  - Geocode addresses to (lat, lon).
  - Build spatial features (e.g. grid cell, distance to POIs, density).
  - Build temporal features (hour, day of week, semester, etc.).
- **If you only have aggregate tables:** You can still train a **spatial** model by:
  - Defining a grid over the Rutgers NB area.
  - Using **location type** (Residence Hall, On-Campus, Non-Campus, Public Property) as a proxy for “region” and mapping each type to approximate areas (e.g. from campus maps or open data). This is weaker than real coordinates but can bootstrap a first version.

### Supplemental data (to enrich or approximate location)

- **OpenStreetMap:** Buildings, land use, paths, lighting (if tagged) for Rutgers NB.
- **NJ open data / crime data:** If any statewide or city-level dataset includes New Brunswick or Middlesex County with coordinates or addresses, you can filter to the campus area and use it for spatial features or labels.
- **Campus maps / GeoJSON:** Official or OSM polygons for “On-Campus,” “Residence Hall,” “Non-Campus,” “Public Property” to turn Clery categories into approximate zones for a coarse risk model.

---

## 4. ML Model for “Probable Crime Risk” and Avoidance

### Goal

- **Output:** For each small area (e.g. 100–500 m grid cell or polygon), a **risk score** (or probability) that a crime will occur there in a given time window.
- **Use in SafeRoute:**  
  - Call your ML service (or on-device model) to get risk scores for cells along candidate routes or for the whole campus.  
  - Mark cells above a threshold as “high-risk” and pass their polygons to Valhalla as `exclude_polygons` (or GraphHopper’s area rules) so the chosen route avoids them.

### Data you need

- **Labels:** Count of incidents (or binary “any incident”) per (cell, time_window).  
  From Clery tables + location-type → zone mapping, or from RUPD incident-level data if you get it.
- **Features (examples):**
  - **Spatial:**  
    - Cell id or (lat, lon), distance to dorms, distance to late-night facilities, land use, lighting proxies (from OSM or manual mapping).
  - **Temporal:**  
    - Hour, day of week, semester, “late night” flag, academic calendar (finals, break).
  - **Historical:**  
    - Past incident counts in that cell (or neighborhood), lagged features.

### Model choices (well supported in literature)

- **XGBoost / Gradient Boosting:**  
  - Good for tabular (grid + time + features).  
  - Used in many “crime hotspot” papers; easy to add spatial and temporal features.  
  - Train in **Python** (e.g. `xgboost`, `scikit-learn`), then either:  
    - Export to **ONNX** or **TensorFlow Lite** and run in the app, or  
    - Call a **small backend** that runs the model and returns risk scores or polygons.
- **Geographical XGBoost (G-XGBoost):**  
  - Handles spatial heterogeneity (different relationships in different areas).  
  - Fits “one campus” well.  
  - [https://geoxgboost.readthedocs.io/](https://geoxgboost.readthedocs.io/)
- **Grid-based packages:**  
  - e.g. `quickGrid` for place-based crime prediction and spatial risk factors.
- **Deep learning (optional):**  
  - ST-ResNet + LSTM, etc., for fine-grained spatio-temporal risk.  
  - Higher complexity; consider only after you have enough incident-level data.

### Training pipeline (conceptual)

1. **Define grid:** Over Rutgers NB (e.g. 40.48–40.52 N, -74.46–74.43 W), cells ~200–500 m.
2. **Build labels:**  
   - From RUPD incident data (if obtained): (lat, lon, datetime) → assign to cell and time window, aggregate counts.  
   - From Clery only: map “Residence Hall / On-Campus / Non-Campus / Public” to predefined zones, then assign counts to cells in those zones (e.g. uniformly or by area).
3. **Build features:**  
   - Cell centroid, hour, day of week, distance to dorms/transit, historical counts in cell and neighbors.
4. **Train:**  
   - XGBoost (or G-XGBoost) regressor/classifier: predict count or risk score per (cell, time_bin).  
   - Validate with temporal split (e.g. train on 2022–2023, test on 2024).
5. **Export for production:**  
   - **Option A (recommended for v1):** Backend service that loads the trained model (e.g. Python + XGBoost or ONNX), accepts (lat, lon, time) or list of cells, returns risk scores or “high-risk” polygons. App calls this when computing “safe” routes.  
   - **Option B:** Convert to **ONNX** or **TFLite** and run in the app via e.g. `react-native-fast-tflite` or `@tensorflow/tfjs-react-native` (with a TF.js-compatible export).  
   - **Option C:** Precompute risk grids per (hour, day_of_week) and serve static GeoJSON or tiles; app only does lookups.

### Using the model output in the app

- **Risk polygons:** From “cells above threshold” → convert to polygons (e.g. cell boundaries) → send as `exclude_polygons` to Valhalla.
- **Map overlay:** Same polygons, style as “High Risk Area” (e.g. semi-transparent red) on `react-native-maps`.
- **Route:**  
  - Origin = user, destination = user’s goal.  
  - Request route from Valhalla with `exclude_polygons` = those polygons.  
  - Draw the returned polyline on the map as the “safe route.”

---

## 5. End-to-End Stack Summary

| Layer            | Technology / API                                      |
|------------------|--------------------------------------------------------|
| Map display      | `react-native-maps` (Expo)                             |
| Map types        | `mapType`: `standard` \| `satellite` \| `hybrid`       |
| Routing (avoid)  | Valhalla (e.g. Stadia/Mapbox/self-hosted) + `exclude_polygons` |
| Routing (simple) | Google Directions/Routes API (optional, for non-avoid routes) |
| Crime data       | RUPD Records + Clery stats + Safety Matters PDF        |
| ML training      | Python + XGBoost (or G-XGBoost), grid over Rutgers NB   |
| ML inference     | Backend API (recommended) or ONNX/TFLite in app        |
| Risk → polygons  | Threshold risk grid cells → polygonize → Valhalla      |

---

## 6. APIs and Keys You’ll Need

- **Google Cloud (optional but useful):**  
  - Maps SDK for Android + Maps SDK for iOS (for map display).  
  - Directions API or Routes API (for default/simple routes).  
  - One or more API keys, restricted by app and (for Directions/Routes) by IP or referrer if called from backend.
- **Valhalla:**  
  - Stadia Maps, Mapbox, or your own Valhalla server.  
  - Stadia/Mapbox give you an API key and base URL for routing requests that support `exclude_polygons`.
- **Rutgers:**  
  - No public REST API for crime data. Use PDFs, web tables, and RUPD Records request.

---

## 7. Next Steps in Code

1. **Maps:** Add `react-native-maps` to the existing SafeRoute app, replace the fake map with `<MapView>`, and add a control to switch `mapType` between `standard` and `satellite` (and optionally `hybrid`).
2. **Routing:** Implement a small client for your chosen Valhalla endpoint; add a function that takes origin, destination, and `exclude_polygons` and returns the route geometry.
3. **Data:** Request incident-level data from RUPD; meanwhile, parse Safety Matters / Clery tables and define a coarse zone→grid mapping for a first model.
4. **ML:** In Python, build the grid, labels, and features; train XGBoost (or G-XGBoost); export risk scores or polygons; add a backend (or in-app) step that turns “current time + map area” into polygons and passes them to Valhalla and to the map overlay.

If you tell me whether you prefer to start with “real map + satellite toggle” in the app or with the “ML + avoidance routing” design, I can outline or implement that part next (e.g. exact `MapView` integration and Valhalla request shape in your repo).
