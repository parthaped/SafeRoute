"""
Analyze crime_geocoded.csv and produce a cleaned CSV for the ML pipeline.
- Removes irrelevant rows (non-incidents, unknown crime_type, non-geocodable locations).
- Builds a proper 'location' column for geocoding when latitude/longitude are missing.
- Outputs crime_geocoded_cleaned.csv and a short report.

Your current file has no latitude/longitude. The cleaned file will have a 'location'
column where possible so you can run geocode_locations.py to add coordinates.
"""
import math
import os
import re
import pandas as pd
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_CSV = os.path.join(SCRIPT_DIR, 'crime_geocoded.csv')
OUTPUT_CSV = os.path.join(SCRIPT_DIR, 'crime_geocoded_cleaned.csv')

# Rutgers NB center; 20-mile radius for stronger model (campus + surrounding area)
RUTGERS_CENTER_LAT = 40.5008
RUTGERS_CENTER_LON = -74.4474
RADIUS_MILES = 20
# Approx degrees: 1 deg lat ~ 69 mi; 1 deg lon at this lat ~ 69*cos(lat) mi
DEG_PER_MI_LAT = 1 / 69.0
DEG_PER_MI_LON = 1 / (69.0 * math.cos(math.radians(RUTGERS_CENTER_LAT)))
RUTGERS_BOUNDS = {
    'lat_min': RUTGERS_CENTER_LAT - RADIUS_MILES * DEG_PER_MI_LAT,
    'lat_max': RUTGERS_CENTER_LAT + RADIUS_MILES * DEG_PER_MI_LAT,
    'lon_min': RUTGERS_CENTER_LON - RADIUS_MILES * DEG_PER_MI_LON,
    'lon_max': RUTGERS_CENTER_LON + RADIUS_MILES * DEG_PER_MI_LON,
}

# Subject patterns that indicate non-incident emails
NON_INCIDENT_SUBJECT_PATTERNS = [
    r'virtual training',
    r'workplace violence.*training',
    r'important safety message',
    r'active shooter.*preparedness',
]

# location_ai values that are NOT geocodable places (institutions, generic text)
NON_PLACE_LOCATION_AI = [
    'workplace violence',
    'community advisory',
    'attention rutgers',
    'the rutgers university police department',
    'the new jersey transit police department',
    'the new brunswick police department',
    'update attention',
]

# Keywords that suggest a real place/address (Rutgers NB)
PLACE_KEYWORDS = [
    'ave', 'street', 'st ', 'place', 'road', 'blvd', 'campus', 'stadium',
    'library', 'college', 'easton', 'george', 'bishop', 'jones', 'somerset',
    'busch', 'livingston', 'cook', 'douglass', 'comstock', 'hale',
    'student center', 'center for islamic life', 'shi stadium', 'werblin',
]

def is_likely_non_incident(subject: str) -> bool:
    if pd.isna(subject) or not isinstance(subject, str):
        return False
    s = subject.lower().strip()
    for pat in NON_INCIDENT_SUBJECT_PATTERNS:
        if re.search(pat, s):
            return True
    return False

def location_ai_looks_geocodable(loc: str) -> bool:
    """True if location_ai looks like a place we can geocode (not generic advisory text)."""
    if pd.isna(loc) or not isinstance(loc, str):
        return False
    s = loc.lower().strip()
    for bad in NON_PLACE_LOCATION_AI:
        if bad in s:
            return False
    for kw in PLACE_KEYWORDS:
        if kw in s:
            return True
    # Short, specific-looking names (e.g. "Easton Ave")
    if len(s) <= 40 and 'police' not in s and 'advisory' not in s:
        return True
    return False

def main():
    print("Loading", os.path.basename(INPUT_CSV), "...")
    df = pd.read_csv(INPUT_CSV)
    n_orig = len(df)
    print(f"Original rows: {n_orig}")
    print(f"Columns: {list(df.columns)}")
    print()

    # Ensure numeric lat/lon
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')

    has_coord = (
        df['latitude'].notna() & df['longitude'].notna() &
        (df['latitude'] != 0) & (df['longitude'] != 0)
    )
    in_bounds = has_coord & (
        (df['latitude'] >= RUTGERS_BOUNDS['lat_min']) &
        (df['latitude'] <= RUTGERS_BOUNDS['lat_max']) &
        (df['longitude'] >= RUTGERS_BOUNDS['lon_min']) &
        (df['longitude'] <= RUTGERS_BOUNDS['lon_max'])
    )
    n_with_coord = in_bounds.sum()
    print(f"Rows with valid lat/lon within 20-mile radius of Rutgers: {n_with_coord}")

    # 1) Drop non-incident subjects
    non_incident = df['subject'].apply(is_likely_non_incident)
    df = df[~non_incident].copy()
    print(f"After dropping non-incident subjects: {len(df)} rows")

    # 2) Drop crime_type unknown or empty
    if 'crime_type' in df.columns:
        bad_ct = df['crime_type'].isna() | (df['crime_type'].astype(str).str.strip().str.lower() == 'unknown') | (df['crime_type'].astype(str).str.strip() == '')
        df = df[~bad_ct].copy()
    print(f"After dropping crime_type unknown/empty: {len(df)} rows")

    # 3) Build 'location' for geocoding: use location_ai when non-empty; drop only clearly non-place text
    if 'location_ai' in df.columns:
        df['location'] = df['location_ai'].where(
            df['location_ai'].notna() & (df['location_ai'].astype(str).str.strip() != '')
        )
        not_place = df['location_ai'].astype(str).str.lower().str.contains(
            '|'.join(['workplace violence', 'community advisory -- update', 'update attention']),
            na=False
        )
        df = df[~not_place].copy()
    else:
        df['location'] = np.nan

    n_with_location = df['location'].notna().sum()
    n_geocodable_looking = df['location_ai'].apply(location_ai_looks_geocodable).sum() if 'location_ai' in df.columns else 0
    print(f"Rows with non-empty 'location': {n_with_location} (of these, ~{n_geocodable_looking} look like specific places)")

    # 4) Parse date into date + time for build_training_data
    if 'date' in df.columns:
        parsed = pd.to_datetime(df['date'], errors='coerce', utc=True)
        df['date'] = parsed.dt.strftime('%Y-%m-%d')
        df['time'] = parsed.dt.strftime('%H:%M:%S')
    if 'time' not in df.columns or df['time'].isna().all():
        df['time'] = '12:00'

    # 5) Keep rows that have coordinates OR a location string to geocode (don't drop all without "geocodable" - let geocoder try)
    has_latlon = (
        df['latitude'].notna() & df['longitude'].notna() &
        (df['latitude'] != 0) & (df['longitude'] != 0) &
        (df['latitude'] >= RUTGERS_BOUNDS['lat_min']) & (df['latitude'] <= RUTGERS_BOUNDS['lat_max']) &
        (df['longitude'] >= RUTGERS_BOUNDS['lon_min']) & (df['longitude'] <= RUTGERS_BOUNDS['lon_max'])
    )
    has_location = df['location'].notna() & (df['location'].astype(str).str.strip() != '')
    keep = has_latlon | has_location
    df = df[keep].copy()
    print(f"After keeping rows with coordinates OR location string: {len(df)} rows")

    # Output columns for downstream: date, time, location, crime_type, latitude, longitude
    out_cols = ['date', 'time', 'location', 'crime_type', 'latitude', 'longitude']
    for c in out_cols:
        if c not in df.columns:
            df[c] = np.nan
    df_out = df[[c for c in out_cols]].copy()
    df_out.to_csv(OUTPUT_CSV, index=False)

    print()
    print("Summary:")
    print(f"  - Removed {n_orig - len(df_out)} rows")
    print(f"  - Cleaned dataset: {len(df_out)} rows -> {OUTPUT_CSV}")
    print()
    if len(df_out) == 0:
        print("NOT ENOUGH DATA: No rows left. The CSV is not suitable for the ML model.")
        print("  - Ensure incidents have either latitude/longitude or a geocodable location (e.g. 'Easton Ave', 'Bishop Place').")
        return

    n_has_coord = (df_out['latitude'].notna() & (df_out['latitude'] != 0)).sum()
    n_needs_geocode = (df_out['location'].notna() & (df_out['latitude'].isna() | (df_out['latitude'] == 0))).sum()
    print("Crime type distribution (cleaned):")
    print(df_out['crime_type'].value_counts().to_string())
    print()
    print()
    print("--- VERDICT ---")
    if n_has_coord == 0 and n_needs_geocode > 0:
        print("Your original CSV had NO latitude/longitude (geocoding was not applied or failed).")
        print("We removed irrelevant rows (non-incidents, crime_type unknown).")
        print("The cleaned file has a 'location' column so you can run geocoding.")
        print()
        if len(df_out) < 30:
            print("CAUTION: Only", len(df_out), "incidents. For a useful ML model you typically want 100+ geocoded incidents.")
        else:
            print("You have", len(df_out), "incidents to geocode. Run geocoding, then build_training_data.")
        print()
        print("Next steps:")
        print("  1. Geocode: python scripts/geocode_locations.py crime_geocoded_cleaned.csv crimes_geocoded_for_ml.csv")
        print("  2. Train:   python scripts/build_training_data.py crimes_geocoded_for_ml.csv")
        print("  3. Model:  python scripts/train_model.py training_data.csv")
    elif n_has_coord > 0:
        print("Rows with valid coordinates:", n_has_coord)
        if n_needs_geocode > 0:
            print("Rows that still need geocoding:", n_needs_geocode)
        print("Next step: python scripts/build_training_data.py crime_geocoded_cleaned.csv")
    else:
        print("NOT GOOD ENOUGH: No coordinates and no usable 'location' strings.")
        print("The CSV cannot be used for the ML model until incidents have latitude/longitude or geocodable addresses.")

if __name__ == '__main__':
    main()
