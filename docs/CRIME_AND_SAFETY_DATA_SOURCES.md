# Where to Find Crime & Safety Data for the ML Model

Your previous CSV was messy. Use **official, structured** sources instead. Below are **exact places** to get data about things that endanger safety (crime, incidents) and how to feed them into the SafeRoute pipeline.

---

## What the Pipeline Needs

Our scripts expect a CSV with these columns:

| Column      | Description                    |
|------------|--------------------------------|
| `date`     | Incident date, e.g. `2024-01-15` |
| `time`     | Time, e.g. `14:30:00` or `12:00` |
| `location` | Address or place (optional if lat/lon present) |
| `crime_type` | Type of offense (e.g. theft, assault, robbery) |
| `latitude` | Latitude (required for training) |
| `longitude` | Longitude (required for training) |

Data should be **within about 20 miles of Rutgers (New Brunswick)** for the current model; the scripts filter to that area.

---

## 1. Rutgers / New Brunswick (Most Relevant)

### Rutgers Daily Crime & Fire Safety Log

- **URL:** https://ipo.rutgers.edu/publicsafety/crime-log  
- **What it is:** Clery Act crime and fire log, updated within two business days.  
- **Data:** Individual incidents; viewable on the web or in person.  
- **Bulk download:** There is **no public CSV/API**. You can:
  - Manually copy incidents into a spreadsheet and save as CSV, or
  - Ask RUPD or Institutional Planning & Operations (ipo.rutgers.edu) if they can provide a bulk export for research.

### Rutgers Crime Statistics (Annual)

- **URL:** https://ipo.rutgers.edu/publicsafety/crime-statistics  
- **What it is:** “Safety Matters” annual security report (Clery).  
- **Data:** Aggregated statistics, not incident-level. Good for context, not for training the grid-based model.

### New Brunswick Police – Crime Mapping

- **URL:** https://newbrunswicknj.wthgis.com/  
- **Link from city:** https://www.cityofnewbrunswick.org/residents/public_safety/crime_mapping.php  
- **What it is:** Interactive map of reported crimes (some types excluded, e.g. domestic violence, sexual assault, juvenile).  
- **Bulk download:** The map is the main interface; there is **no obvious CSV/API**. You can contact the **New Brunswick Police Department** or the city’s IT/Open Data contact and ask for incident-level data (with lat/lon or address and date/time) for research.

---

## 2. New Jersey State – Open Data

### data.nj.gov (Law & Public Safety)

- **URL:** https://data.nj.gov/  
- **How to find crime data:**
  1. Go to **Browse** or search for “crime” or “law”.
  2. Filter by category **“Law & Public Safety”** (or similar).
  3. Open a dataset that has **incident-level** records (date, location or lat/lon, offense type).
- **Export:** Each dataset page usually has **Export** or **API**; you can download CSV or use the Socrata API (see below).
- **Note:** NJ State Police UCR (Uniform Crime Reporting) is at https://www.nj.gov/njsp/ucr/current-crime-data.shtml — often summary statistics; for incident-level data, prefer data.nj.gov datasets that list individual incidents.

### Jersey City Police (NJ, Socrata API)

- **URL:** https://data.jerseycitynj.gov/explore/dataset/jcpd-calls-for-service/  
- **API:** Same portal has an “API” or “Export” section; Socrata-style endpoints (e.g. JSON/CSV).  
- **Note:** Jersey City is in Hudson County (north NJ), not in the 20-mile Rutgers radius. You can still use it to test the pipeline or to train a model for a different geography; for Rutgers-centric risk, prefer data closer to New Brunswick.

---

## 3. Other Cities – Ready-to-Use Structured Data

These are **incident-level** and easy to download. They are outside the 20-mile Rutgers area but are good for (a) testing the pipeline and (b) training a model if you later expand the geography or use them as a format reference.

### NYC Open Data – NYPD Complaint Data

- **Dataset page:** https://data.cityofnewyork.us/Public-Safety/NYPD-Complaint-Data-Current-Year-To-Date-/5uac-w243  
- **CSV download:** On the dataset page, use **Export** → **Download** → **CSV**, or use the Socrata API:
  - `https://data.cityofnewyork.us/api/views/5uac-w243/rows.csv?accessType=DOWNLOAD`
- **Typical columns:** Complaint date, time, offense description, latitude, longitude (or X/Y coordinates).  
- **Use:** Download CSV, then run the provided script (see below) to convert to our `date`, `time`, `crime_type`, `latitude`, `longitude` format. NYC is not within 20 miles of Rutgers, so use for pipeline testing or for a NYC-area model.

### Philadelphia – Crime Incidents

- **URL:** https://opendataphilly.org/datasets/crime-incidents/  
- **Data:** Yearly CSV files (e.g. 2015–2025).  
- **Content:** Part I and Part II crimes; location often at block level (you may need to geocode or use provided coordinates if available).  
- **Use:** Download a year CSV, then map columns to our format (date, time, crime_type, latitude, longitude) in a small script or Excel.

### data.gov – Other Cities

- **URL:** https://catalog.data.gov/dataset?q=crime+incidents  
- **Use:** Search for “crime incidents” or “police incidents”; pick a city dataset that has date, location or coordinates, and offense type. Download CSV/API and map to our columns.

---

## 4. FBI Crime Data Explorer (CDE) API

The [FBI Crime Data Explorer](https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi) (CDE) provides a **read-only REST API** for Uniform Crime Reporting (UCR) and NIBRS data. SafeRoute uses this for crime data and map visualizations.

### Docs and API Key

- **Documentation:** [https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi](https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi)
- **API key:** Get a key at the doc URL above. Pass it as query param: `?api_key=YOUR_KEY`.
- **Base URL:** `https://api.usa.gov/crime/fbi/ucr` (all requests require `api_key` in query).

### Important: No incident-level lat/lon

The FBI CDE API returns **aggregated data** (counts by agency, state, year, offense). It does **not** return individual incident latitudes/longitudes. You cannot build a point-by-point incident heatmap from CDE alone.

### How to generate a map from FBI CDE data

1. **Agency-point map:** Use `/agencies` — each agency can have `icpsr_lat` and `icpsr_lng`. Fetch agencies for a state (e.g. `state_abbr=nj`), then plot each agency as a point. Optionally size or color points by crime counts.
2. **State/county choropleth:** Use `/estimates/states/{state_abbr}` and `/geo/states/{state_abbr}` — state-level estimates and county list. Color state or county polygons by rate (e.g. crimes per 100k population).
3. **National view:** Use `/estimates/national`; combine with state estimates to color a US state map.

### Using in SafeRoute

1. **Set the API key** in `.env`:
   - For the app: `EXPO_PUBLIC_FBI_CDE_API_KEY=your_key`
   - For scripts: `FBI_CDE_API_KEY=your_key`

2. **Service** `src/services/fbiCde.ts` exposes:
   - `fetchAgencies({ state_abbr })` — agencies (with `icpsr_lat`, `icpsr_lng` for mapping).
   - `fetchAgenciesWithLocation(stateAbbr)` — agencies that have lat/lng in a state.
   - `fetchStateEstimates(stateAbbr)` — state-level crime estimates (for choropleth).
   - `fetchNationalEstimates()` — national estimates.
   - `fetchCounts({ state, year, explorer_offense })` — counts by state, year, offense type.
   - `fetchStateGeo(stateAbbr)` — state metadata and counties (for choropleth).
   - `isFbiCdeConfigured()` — whether the key is set.

3. **Example — agency map for NJ:** Call `fetchAgenciesWithLocation('nj')`, then plot each result's `icpsr_lat`, `icpsr_lng` on your map (e.g. MapView markers). Optionally join with agency-level counts to size/color markers. 
---

## 5. National – FBI / BJS

### FBI Crime Data Explorer (NIBRS)

- **URL:** https://cde.ucr.cjis.gov/  
- **What it is:** National Incident-Based Reporting System (NIBRS) data.  
- **Use:** You can filter by state (e.g. New Jersey) and download data. Good for incident-level detail; you may need to filter by county (e.g. Middlesex) and map their columns to ours.

### BJS NIBRS National Estimates API

- **URL:** https://bjs.ojp.gov/national-incident-based-reporting-system-nibrs-national-estimates-api  
- **Use:** More for national/subnational estimates; for incident-level training data, the FBI CDE download or state/city open data is usually simpler.

---

## How to Use This Data in the Pipeline

1. **Choose a source** (Rutgers log, data.nj.gov, NYC, Philly, etc.).
2. **Get the data** (download CSV or use API).
3. **Convert to our format:**
   - Columns: `date`, `time`, `location` (optional), `crime_type`, `latitude`, `longitude`.
   - Save as e.g. `scripts/crime_geocoded.csv`.
4. **Run the existing scripts:**
   - `python scripts/analyze_and_clean_crimes.py` (if you still want cleaning; expects `crime_geocoded.csv` or similar).
   - If your file is already clean and has lat/lon, you can skip cleaning and filter to the 20-mile Rutgers area in the next step.
   - `python scripts/geocode_locations.py` only if you have addresses and no coordinates (it filters to 20-mile radius).
   - `python scripts/build_training_data.py` (reads geocoded incidents, builds grid and labels).
   - `python scripts/train_model.py` (trains the risk model).

We also provide a helper script that **fetches NYC NYPD data** and **converts it** to our CSV format so you can run the pipeline end-to-end without your old CSV. See the next section.

---

## Helper Script: Fetch NYC Crime Data

In the repo you have a script that:

1. Downloads NYPD Complaint Data (current year to date) from NYC Open Data.
2. Maps their columns to `date`, `time`, `crime_type`, `latitude`, `longitude`.
3. Writes `scripts/crime_geocoded.csv` in the format expected by the pipeline.

**Run it:**

```bash
cd c:\Users\Parth\SafeRoute\scripts
python fetch_external_crime.py
```

Then run the rest of the pipeline (from the `scripts` folder):

```bash
python build_training_data.py crime_geocoded.csv
python train_model.py
```

**Note:** NYC points will not fall in the 20-mile Rutgers radius, so the current grid will have few or no incidents in the Rutgers area. Use this to **verify the pipeline**; for real Rutgers-area risk, use **Rutgers log**, **New Brunswick PD**, or **data.nj.gov** incident-level data when you can get it.

---

## Summary Table

| Source | URL | Has lat/lon? | Bulk CSV/API? | In 20 mi of Rutgers? |
|--------|-----|--------------|----------------|----------------------|
| Rutgers crime log | ipo.rutgers.edu/publicsafety/crime-log | No (manual) | No | Yes |
| New Brunswick crime map | newbrunswicknj.wthgis.com | Map only | Ask city/NBPD | Yes |
| data.nj.gov | data.nj.gov (browse Law & Public Safety) | Depends on dataset | Yes (Socrata) | Yes (if NJ dataset) |
| Jersey City PD | data.jerseycitynj.gov | Yes | Yes (API) | No (north NJ) |
| NYC NYPD | data.cityofnewyork.us (5uac-w243) | Yes | Yes (CSV/API) | No |
| Philadelphia | opendataphilly.org/datasets/crime-incidents | Block/address | Yes (CSV) | No |
| FBI CDE | cde.ucr.cjis.gov (API) | Agency lat/lng (icpsr); no incident lat/lon | Yes (API, key in query) | US (agency/state/county) |

Use **Rutgers + New Brunswick + data.nj.gov** for real SafeRoute coverage around campus; use **NYC/Philly** for a clean, ready-to-use dataset to train and test the pipeline. Use **FBI CDE API** for agency- and state-level crime stats and to build agency-point or choropleth maps (see §4).
