"""
Fetch crime/safety data from a public source and convert to pipeline format.

Output CSV has columns: date, time, location, crime_type, latitude, longitude
so you can run analyze_and_clean_crimes.py / build_training_data.py / train_model.py.

Usage:
  python fetch_external_crime.py [source]

Sources:
  nyc  - NYC Open Data NYPD Complaint Data (current year to date). Default.
  (Add more sources by extending SOURCES below.)
"""

import os
import sys
import urllib.request
from typing import Optional

import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_CSV = os.path.join(SCRIPT_DIR, 'crime_geocoded.csv')

# NYC Open Data – NYPD Complaint Data Current (Year To Date)
# https://data.cityofnewyork.us/Public-Safety/NYPD-Complaint-Data-Current-Year-To-Date-/5uac-w243
NYC_CSV_URL = (
    'https://data.cityofnewyork.us/api/views/5uac-w243/rows.csv?accessType=DOWNLOAD'
)

# Column mapping: source column name -> our column name
# NYC uses various spellings; we try the most common.
NYC_COLUMN_MAP = {
    'date': ['CMPLNT_FR_DT', 'cmplnt_fr_dt', 'Date'],
    'time': ['CMPLNT_FR_TM', 'cmplnt_fr_tm', 'Time'],
    'crime_type': ['OFNS_DESC', 'ofns_desc', 'LAW_CAT_CD', 'law_cat_cd', 'Offense'],
    'latitude': ['Latitude', 'latitude', 'Lat_Lon'],  # Lat_Lon is "lat, lon" in one field
    'longitude': ['Longitude', 'longitude'],
}

SOURCES = {
    'nyc': {
        'url': NYC_CSV_URL,
        'column_map': NYC_COLUMN_MAP,
        'max_rows': 50000,  # Limit for a quick run; set None for all
    },
}


def find_column(df: pd.DataFrame, candidates: list) -> Optional[str]:
    """Return first column name that exists in df (case-sensitive then case-insensitive)."""
    for c in candidates:
        if c in df.columns:
            return c
    lower = {k.lower(): k for k in df.columns}
    for c in candidates:
        if c.lower() in lower:
            return lower[c.lower()]
    return None


def parse_nyc_date(s: str) -> str:
    """NYC often uses MM/DD/YYYY."""
    if pd.isna(s) or not str(s).strip():
        return ''
    try:
        dt = pd.to_datetime(s)
        return dt.strftime('%Y-%m-%d')
    except Exception:
        return str(s).strip()


def parse_nyc_time(s: str) -> str:
    """NYC time often HH:MM:SS or HH:MM."""
    if pd.isna(s) or not str(s).strip():
        return '12:00:00'
    s = str(s).strip()
    if len(s) <= 5 and ':' in s:
        return s + ':00' if s.count(':') == 1 else s
    return s if ':' in s else '12:00:00'


def fetch_nyc() -> pd.DataFrame:
    """Download NYC NYPD data and return a dataframe in our column names."""
    print('Downloading NYC NYPD Complaint Data...')
    req = urllib.request.Request(
        NYC_CSV_URL,
        headers={'User-Agent': 'SafeRoute/1.0 (Data pipeline)'}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        df = pd.read_csv(resp, nrows=SOURCES['nyc']['max_rows'], low_memory=False)
    print(f"Downloaded {len(df)} rows. Mapping columns...")

    col_map = SOURCES['nyc']['column_map']
    date_col = find_column(df, col_map['date'])
    time_col = find_column(df, col_map['time'])
    crime_col = find_column(df, col_map['crime_type'])
    lat_col = find_column(df, col_map['latitude'])
    lon_col = find_column(df, col_map['longitude'])

    if not date_col or not crime_col:
        raise ValueError(
            "Could not find date and crime_type columns. "
            f"Available: {list(df.columns)}"
        )

    out = pd.DataFrame()
    out['date'] = df[date_col].astype(str).apply(parse_nyc_date)
    out['time'] = df[time_col].astype(str).apply(parse_nyc_time) if time_col else '12:00:00'
    out['location'] = ''
    out['crime_type'] = df[crime_col].astype(str).str.strip().str[:100]

    if lat_col and lon_col and lat_col != lon_col:
        out['latitude'] = pd.to_numeric(df[lat_col], errors='coerce')
        out['longitude'] = pd.to_numeric(df[lon_col], errors='coerce')
    elif lat_col and (lat_col == 'Lat_Lon' or 'lat_lon' in (lat_col or '').lower()):
        # Single "lat, lon" column if present
        def split_lat_lon(v):
            if pd.isna(v):
                return (None, None)
            parts = str(v).replace('(', '').replace(')', '').split(',')
            if len(parts) >= 2:
                try:
                    return (float(parts[0].strip()), float(parts[1].strip()))
                except ValueError:
                    pass
            return (None, None)
        lat_lon = df[lat_col].apply(split_lat_lon)
        out['latitude'] = [x[0] for x in lat_lon]
        out['longitude'] = [x[1] for x in lat_lon]
    else:
        out['latitude'] = pd.NA
        out['longitude'] = pd.NA

    # Drop rows with no date or no crime type
    out = out[out['date'].str.len() > 0].copy()
    out = out[out['crime_type'].str.len() > 0].copy()
    return out


def main():
    source = (sys.argv[1] if len(sys.argv) > 1 else 'nyc').lower()
    if source not in SOURCES:
        print(f"Unknown source: {source}. Choose from: {list(SOURCES)}")
        sys.exit(1)

    if source == 'nyc':
        df = fetch_nyc()
    else:
        print(f"Source {source} not implemented.")
        sys.exit(1)

    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Wrote {len(df)} rows to {OUTPUT_CSV}")
    print("Next: run analyze_and_clean_crimes.py (optional) then build_training_data.py and train_model.py")
    print("Note: NYC data is outside the 20-mile Rutgers radius; use for pipeline testing or add NJ/NB data.")


if __name__ == '__main__':
    main()
