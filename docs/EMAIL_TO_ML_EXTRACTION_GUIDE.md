# Exactly How to Extract Crime Data from Your Email for the ML Model

This guide tells you **exactly** how to get crime data from your email, extract **the place where the crime happened** (all in New Brunswick / Rutgers), and use it so the model can **find areas with higher risk of crime**.

---

## What You Need

- **Emails** that describe crimes (e.g. RUPD crime alerts, campus safety bulletins, crime log emails).
- All incidents are assumed to be **in New Brunswick / Rutgers**; the pipeline geocodes and filters to that area.

---

## Step 1: Put Your `emails.csv` File in the Project Root

**Where to put the file:** In the **root of the SafeRoute project** (same folder as `package.json`), **not** inside `scripts/`.

- Full path example: `c:\Users\Parth\SafeRoute\emails.csv`

**Format:** CSV with three columns: `subject`, `body`, `date`.

| Column   | What to put |
|----------|-------------|
| `subject`| The email subject line. |
| `body`   | The full email body (where the crime location and type are described). |
| `date`   | Optional. Send date of the email, e.g. `2024-01-15`. |

**Example `emails.csv`:**

```csv
subject,body,date
"Crime Alert - Theft","On January 15, 2024 at 10:30 PM, a theft occurred at 126 College Ave near the Student Center. A wallet was reported stolen.",2024-01-15
"Incident Report","Vandalism reported on 01/20/2024 around 1:15 AM at Alexander Library. Property damage to building exterior.",2024-01-20
"Safety Bulletin","Robbery at College Ave and Easton Ave. Suspect fled. 11:45 PM. Contact RUPD with info.",2024-02-01
```

**What the email body should contain (so we can extract the place):**

- A **location** – e.g. “126 College Ave”, “College Ave and George St”, “Alexander Library”, “near the Student Center”, “Easton Ave”, “Busch campus”, “Livingston”.
- Ideally also **crime type** (theft, assault, vandalism, etc.) and **date/time**.

---

## Step 2: Run the Extractor (Gets the **Place** + Crime Type + Date/Time)

**Command (run from project root):**

```bash
cd c:\Users\Parth\SafeRoute
python scripts/easy_email_extractor.py
```

**What it does:**

- Reads **`emails.csv`** from the project root.
- For each email, extracts:
  - **Place/location** – e.g. “126 College Ave”, “Alexander Library”, “College Ave and Easton Ave” (using regex + Rutgers/NB location keywords like college ave, george st, library, busch, livingston, easton ave, etc.).
  - **Crime type** – e.g. theft, vandalism, assault, burglary, robbery (from words in the email).
  - **Date and time** – if present in the text or in the `date` column.
- Writes **`extracted_crimes.csv`** in the project root with columns: `date`, `time`, `location`, `crime_type`, `raw_text`.

**Output example:** `extracted_crimes.csv`

| date       | time   | location           | crime_type |
|-----------|--------|--------------------|------------|
| 2024-01-15| 10:30 PM | 126 College Ave    | theft      |
| 2024-01-20| 1:15 AM  | Alexander Library  | vandalism  |

If no rows have both a location and a crime type, the script will say so; add more location/crime wording to your emails or adjust patterns in `scripts/extract_from_emails.py`.

---

## Step 3: Geocode Places to Coordinates (New Brunswick / Rutgers Only)

**Command:**

```bash
python scripts/geocode_locations.py
```

**What it does:**

- Reads **`extracted_crimes.csv`**.
- For each **location** (place), calls a geocoder with **“, New Brunswick, NJ”** appended so results are in the Rutgers/New Brunswick area.
- Adds **`latitude`** and **`longitude`**.
- **Keeps only points inside the Rutgers NB bounding box** (approx. 40.48–40.52°N, 74.46–74.43°W).
- Saves **`crimes_geocoded.csv`** (place → lat/lon, all in New Brunswick/Rutgers).

So: **the “place” from the email becomes a (lat, lon) in New Brunswick/Rutgers** for the model.

---

## Step 4: Build Training Data (Grid Over Rutgers NB)

**Command:**

```bash
python scripts/build_training_data.py crimes_geocoded.csv
```

**What it does:**

- Overlays a **grid** on the Rutgers New Brunswick area.
- Assigns each geocoded crime (lat/lon) to a **grid cell**.
- Builds **features** per cell (e.g. distance to campus POIs, time of day, day of week).
- Produces **training data** where each row is a cell (or cell + time slice) and the **label** is incident count or risk level.

So “place” is now **which grid cell** the crime fell into; the model will learn which cells have more incidents.

---

## Step 5: Train the Model (Finds Higher-Risk Areas)

**Command:**

```bash
python scripts/train_model.py training_data.csv
```

**What it does:**

- Trains a model (e.g. XGBoost) to predict **risk** (or incident count) per grid cell (and optionally per time window).
- Outputs a **trained model** and, in effect, a **risk score per cell**.
- **Higher-risk areas** = cells with higher predicted risk.

So the model uses **all the places (cells) where crimes happened** and learns which areas are higher risk; you then use those high-risk cells in the app (e.g. to avoid or warn).

---

## End-to-End Summary

| Step | What you do | What you get |
|------|-------------|--------------|
| 1 | Put your **`emails.csv`** file (subject, body, date) in **project root**. | One CSV of raw emails. |
| 2 | Run **`python scripts/easy_email_extractor.py`** | **Place** (location) + crime type + date/time in **`extracted_crimes.csv`**. |
| 3 | Run **`python scripts/geocode_locations.py`** | **Places** → lat/lon in New Brunswick/Rutgers → **`crimes_geocoded.csv`**. |
| 4 | Run **`python scripts/build_training_data.py crimes_geocoded.csv`** | Grid + features + labels → **training data**. |
| 5 | Run **`python scripts/train_model.py training_data.csv`** | **Model that finds higher-risk areas** (risk per grid cell). |

**Place extraction:** The script pulls “place” from the email body using:

- Street-style addresses (e.g. “126 College Ave”, “College Ave and George St”).
- Building/area names (e.g. “Alexander Library”, “near Student Center”) using a list of Rutgers/NB keywords: college ave, george st, somerset st, student center, library, dorm, busch, livingston, cook, douglass, easton ave, etc.

All geocoded results are restricted to **New Brunswick / Rutgers**, and the model uses those locations to identify **higher-risk areas** for the app.
