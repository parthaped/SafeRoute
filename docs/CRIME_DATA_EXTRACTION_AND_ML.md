# Crime Data Extraction from Emails & ML Training Guide

This guide walks you through extracting crime data from emails and training an ML model to predict high-risk areas around Rutgers NB.

---

## Overview

**Goal:** Extract structured crime data (location + crime type) from emails, geocode locations, and train a model that predicts crime risk per grid cell.

**Pipeline:**
1. **Extract** location/area and crime type from emails (NLP + regex)
2. **Geocode** addresses/locations to lat/lon
3. **Build training dataset** (grid cells + features + labels)
4. **Train XGBoost** model to predict risk scores
5. **Export** model for use in SafeRoute backend/app

---

## Step 1: Extract Data from Emails

### Option A: Manual extraction (small dataset)

If you have a small number of emails, manually extract:
- **Date/time** of incident
- **Location/address** (e.g., "College Ave near Student Center", "126 College Ave", "Alexander Library")
- **Crime type** (e.g., "theft", "assault", "vandalism", "burglary")

Save to CSV:
```csv
date,time,location,crime_type,description
2024-01-15,22:30,"126 College Ave","theft","Wallet stolen"
2024-01-20,01:15,"Alexander Library","vandalism","Property damage"
```

### Option B: Automated extraction with Python (larger dataset)

Use NLP and regex to parse emails automatically.

**Install dependencies:**
```bash
pip install pandas numpy python-dateutil geopy openpyxl
# Optional for better NLP:
pip install spacy nltk
python -m spacy download en_core_web_sm
```

**Example email parser script:**

```python
# scripts/extract_from_emails.py
import re
import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional

# Common crime types at Rutgers
CRIME_TYPES = [
    'theft', 'burglary', 'assault', 'vandalism', 'robbery',
    'drug', 'disorderly', 'trespass', 'harassment', 'stalking'
]

# Common location keywords
LOCATION_KEYWORDS = [
    'college ave', 'george st', 'somerset st', 'student center',
    'library', 'dorm', 'residence', 'hall', 'building', 'parking',
    'rutgers', 'campus', 'busch', 'livingston', 'cook', 'douglass'
]

def extract_date_time(text: str) -> Optional[Dict[str, str]]:
    """Extract date and time from email text."""
    # Patterns: "Jan 15, 2024", "01/15/2024", "2024-01-15", "10:30 PM"
    date_patterns = [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'([A-Z][a-z]+ \d{1,2},? \d{4})',
        r'(\d{4}-\d{2}-\d{2})',
    ]
    time_patterns = [
        r'(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))',
        r'(\d{1,2}:\d{2})',
    ]
    
    date_match = None
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            date_match = match.group(1)
            break
    
    time_match = None
    for pattern in time_patterns:
        match = re.search(pattern, text)
        if match:
            time_match = match.group(1)
            break
    
    return {'date': date_match, 'time': time_match} if date_match else None

def extract_location(text: str) -> Optional[str]:
    """Extract location/address from email text."""
    # Look for street addresses: "126 College Ave", "College Ave and George St"
    address_patterns = [
        r'(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Ave|St|Rd|Blvd|Ln|Dr))',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Ave|St|Rd|Blvd|Ln|Dr))',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:and|&|near|at)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
    ]
    
    for pattern in address_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    # Look for building names
    for keyword in LOCATION_KEYWORDS:
        if keyword.lower() in text.lower():
            # Try to get context: "near Alexander Library" -> "Alexander Library"
            context_pattern = rf'((?:near|at|on|in)\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*{keyword})'
            match = re.search(context_pattern, text, re.IGNORECASE)
            if match:
                return match.group(2).strip()
    
    return None

def extract_crime_type(text: str) -> Optional[str]:
    """Extract crime type from email text."""
    text_lower = text.lower()
    
    for crime in CRIME_TYPES:
        if crime in text_lower:
            return crime
    
    # Check for variations
    crime_variations = {
        'theft': ['stolen', 'taken', 'missing item'],
        'assault': ['attacked', 'physical', 'battery'],
        'vandalism': ['damage', 'graffiti', 'destruction'],
        'burglary': ['break-in', 'entered', 'unauthorized entry'],
    }
    
    for crime_type, keywords in crime_variations.items():
        if any(kw in text_lower for kw in keywords):
            return crime_type
    
    return None

def parse_email(email_text: str, email_date: Optional[str] = None) -> Dict:
    """Parse a single email and extract crime data."""
    result = {
        'date': None,
        'time': None,
        'location': None,
        'crime_type': None,
        'raw_text': email_text[:200],  # First 200 chars for reference
    }
    
    # Extract date/time
    dt = extract_date_time(email_text)
    if dt:
        result['date'] = dt['date']
        result['time'] = dt['time']
    elif email_date:
        result['date'] = email_date
    
    # Extract location
    location = extract_location(email_text)
    if location:
        result['location'] = location
    
    # Extract crime type
    crime_type = extract_crime_type(email_text)
    if crime_type:
        result['crime_type'] = crime_type
    
    return result

def process_emails(email_list: List[Dict[str, str]]) -> pd.DataFrame:
    """
    Process a list of emails.
    Each email dict should have: {'subject': str, 'body': str, 'date': str (optional)}
    """
    results = []
    
    for email in email_list:
        full_text = f"{email.get('subject', '')} {email.get('body', '')}"
        parsed = parse_email(full_text, email.get('date'))
        results.append(parsed)
    
    df = pd.DataFrame(results)
    # Filter out rows with no location or crime_type
    df = df[df['location'].notna() & df['crime_type'].notna()].copy()
    
    return df

# Example usage:
if __name__ == '__main__':
    # Example: Load emails from a file or API
    sample_emails = [
        {
            'subject': 'Crime Alert - Theft',
            'body': 'On January 15, 2024 at 10:30 PM, a theft occurred at 126 College Ave near the Student Center. A wallet was reported stolen.',
            'date': '2024-01-15'
        },
        {
            'subject': 'Incident Report',
            'body': 'Vandalism reported on 01/20/2024 around 1:15 AM at Alexander Library. Property damage to building exterior.',
            'date': '2024-01-20'
        },
    ]
    
    df = process_emails(sample_emails)
    df.to_csv('extracted_crimes.csv', index=False)
    print(f"Extracted {len(df)} incidents")
    print(df)
```

---

## Step 2: Geocode Locations to Coordinates

Convert addresses/locations to lat/lon using Google Geocoding API or OpenStreetMap Nominatim.

**Geocoding script:**

```python
# scripts/geocode_locations.py
import pandas as pd
import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import json

# For Google Geocoding (more accurate, requires API key):
# from geopy.geocoders import GoogleV3
# geocoder = GoogleV3(api_key='YOUR_GOOGLE_GEOCODING_API_KEY')

def geocode_with_nominatim(address: str, retries: int = 3) -> tuple:
    """
    Geocode an address using OpenStreetMap Nominatim (free, no API key).
    Returns (latitude, longitude) or (None, None) if failed.
    """
    geolocator = Nominatim(user_agent="SafeRoute_CrimeData")
    
    # Add "New Brunswick, NJ" or "Rutgers University" context for better results
    query = f"{address}, New Brunswick, NJ"
    
    for attempt in range(retries):
        try:
            location = geolocator.geocode(query, timeout=10)
            if location:
                return (location.latitude, location.longitude)
            time.sleep(1)  # Rate limiting
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                print(f"Geocoding failed for {address}: {e}")
                return (None, None)
    
    return (None, None)

def geocode_dataframe(df: pd.DataFrame, location_col: str = 'location') -> pd.DataFrame:
    """Add latitude and longitude columns to dataframe."""
    df = df.copy()
    df['latitude'] = None
    df['longitude'] = None
    
    for idx, row in df.iterrows():
        location = row[location_col]
        if pd.notna(location):
            lat, lon = geocode_with_nominatim(location)
            df.at[idx, 'latitude'] = lat
            df.at[idx, 'longitude'] = lon
            print(f"Geocoded {location}: ({lat}, {lon})")
            time.sleep(1)  # Rate limit: Nominatim allows 1 request/second
    
    return df

if __name__ == '__main__':
    # Load extracted crimes
    df = pd.read_csv('extracted_crimes.csv')
    
    # Geocode locations
    df_geocoded = geocode_dataframe(df)
    
    # Filter to Rutgers NB area (rough bounds)
    rutgers_bounds = {
        'lat_min': 40.48,
        'lat_max': 40.52,
        'lon_min': -74.46,
        'lon_max': -74.43
    }
    
    df_filtered = df_geocoded[
        (df_geocoded['latitude'] >= rutgers_bounds['lat_min']) &
        (df_geocoded['latitude'] <= rutgers_bounds['lat_max']) &
        (df_geocoded['longitude'] >= rutgers_bounds['lon_min']) &
        (df_geocoded['longitude'] <= rutgers_bounds['lon_max'])
    ].copy()
    
    df_filtered.to_csv('crimes_geocoded.csv', index=False)
    print(f"Geocoded {len(df_filtered)} incidents within Rutgers NB bounds")
```

---

## Step 3: Build Training Dataset (Grid + Features + Labels)

Create a grid over Rutgers NB, assign incidents to cells, and build features.

**Grid and feature engineering script:**

```python
# scripts/build_training_data.py
import pandas as pd
import numpy as np
from datetime import datetime
import json

# Rutgers NB bounds
RUTGERS_BOUNDS = {
    'lat_min': 40.48,
    'lat_max': 40.52,
    'lon_min': -74.46,
    'lon_max': -74.43
}

# Grid cell size in degrees (approx 200-300m)
CELL_SIZE_LAT = 0.002  # ~220m
CELL_SIZE_LON = 0.0025  # ~200m at this latitude

def create_grid() -> pd.DataFrame:
    """Create a grid of cells over Rutgers NB."""
    cells = []
    cell_id = 0
    
    lat = RUTGERS_BOUNDS['lat_min']
    while lat < RUTGERS_BOUNDS['lat_max']:
        lon = RUTGERS_BOUNDS['lon_min']
        while lon < RUTGERS_BOUNDS['lon_max']:
            cells.append({
                'cell_id': cell_id,
                'lat_min': lat,
                'lat_max': lat + CELL_SIZE_LAT,
                'lon_min': lon,
                'lon_max': lon + CELL_SIZE_LON,
                'lat_center': lat + CELL_SIZE_LAT / 2,
                'lon_center': lon + CELL_SIZE_LON / 2,
            })
            cell_id += 1
            lon += CELL_SIZE_LON
        lat += CELL_SIZE_LAT
    
    return pd.DataFrame(cells)

def assign_to_cell(lat: float, lon: float, grid: pd.DataFrame) -> Optional[int]:
    """Assign a lat/lon point to a grid cell."""
    if pd.isna(lat) or pd.isna(lon):
        return None
    
    cell = grid[
        (grid['lat_min'] <= lat) & (lat < grid['lat_max']) &
        (grid['lon_min'] <= lon) & (lon < grid['lon_max'])
    ]
    
    if len(cell) > 0:
        return cell.iloc[0]['cell_id']
    return None

def build_labels(df_incidents: pd.DataFrame, grid: pd.DataFrame) -> pd.DataFrame:
    """
    Build labels: count of incidents per (cell, time_window).
    Time windows: hour of day, day of week.
    """
    df_incidents = df_incidents.copy()
    
    # Parse dates
    df_incidents['datetime'] = pd.to_datetime(
        df_incidents['date'] + ' ' + df_incidents['time'].fillna('12:00'),
        errors='coerce'
    )
    
    # Assign to cells
    df_incidents['cell_id'] = df_incidents.apply(
        lambda row: assign_to_cell(row['latitude'], row['longitude'], grid),
        axis=1
    )
    
    # Filter valid assignments
    df_valid = df_incidents[df_incidents['cell_id'].notna()].copy()
    
    # Extract temporal features
    df_valid['hour'] = df_valid['datetime'].dt.hour
    df_valid['day_of_week'] = df_valid['datetime'].dt.dayofweek  # 0=Monday
    df_valid['is_weekend'] = df_valid['day_of_week'].isin([5, 6])
    df_valid['is_late_night'] = df_valid['hour'].between(22, 6)  # 10 PM - 6 AM
    
    # Aggregate: count incidents per (cell_id, hour, day_of_week)
    labels = df_valid.groupby(['cell_id', 'hour', 'day_of_week']).size().reset_index(name='incident_count')
    
    return labels

def build_spatial_features(grid: pd.DataFrame) -> pd.DataFrame:
    """
    Build spatial features for each cell:
    - Distance to key POIs (dorms, libraries, transit)
    - Land use proxies (if available from OSM)
    """
    # Key POIs around Rutgers NB (from places.ts)
    pois = [
        {'name': 'Student Center', 'lat': 40.4995, 'lon': -74.4482},
        {'name': 'Alexander Library', 'lat': 40.5003, 'lon': -74.447},
        {'name': 'Werblin Rec', 'lat': 40.5042, 'lon': -74.4515},
        {'name': 'Rutgers Center', 'lat': 40.5008, 'lon': -74.4474},
    ]
    
    def haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate distance between two points in km."""
        from math import radians, sin, cos, sqrt, atan2
        R = 6371  # Earth radius in km
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c
    
    features = grid.copy()
    
    # Distance to nearest POI
    for poi in pois:
        features[f'dist_to_{poi["name"].lower().replace(" ", "_")}'] = features.apply(
            lambda row: haversine_distance(
                row['lat_center'], row['lon_center'],
                poi['lat'], poi['lon']
            ),
            axis=1
        )
    
    # Distance to campus center
    features['dist_to_center'] = features.apply(
        lambda row: haversine_distance(
            row['lat_center'], row['lon_center'],
            RUTGERS_BOUNDS['lat_min'] + (RUTGERS_BOUNDS['lat_max'] - RUTGERS_BOUNDS['lat_min']) / 2,
            RUTGERS_BOUNDS['lon_min'] + (RUTGERS_BOUNDS['lon_max'] - RUTGERS_BOUNDS['lon_min']) / 2
        ),
        axis=1
    )
    
    return features

def build_training_dataset(
    df_incidents: pd.DataFrame,
    grid: pd.DataFrame,
    labels: pd.DataFrame
) -> pd.DataFrame:
    """
    Combine grid features, temporal features, and labels into training dataset.
    One row per (cell_id, hour, day_of_week).
    """
    # Build spatial features
    spatial_features = build_spatial_features(grid)
    
    # Merge labels with spatial features
    training_data = labels.merge(
        spatial_features,
        on='cell_id',
        how='left'
    )
    
    # Add temporal features (already in labels: hour, day_of_week)
    training_data['is_weekend'] = training_data['day_of_week'].isin([5, 6])
    training_data['is_late_night'] = training_data['hour'].between(22, 6)
    training_data['hour_sin'] = np.sin(2 * np.pi * training_data['hour'] / 24)
    training_data['hour_cos'] = np.cos(2 * np.pi * training_data['hour'] / 24)
    training_data['dow_sin'] = np.sin(2 * np.pi * training_data['day_of_week'] / 7)
    training_data['dow_cos'] = np.cos(2 * np.pi * training_data['day_of_week'] / 7)
    
    # Historical features: past incident counts in same cell (if we have temporal data)
    # For now, use cell-level aggregate
    cell_counts = labels.groupby('cell_id')['incident_count'].sum().reset_index(name='total_cell_incidents')
    training_data = training_data.merge(cell_counts, on='cell_id', how='left')
    training_data['total_cell_incidents'] = training_data['total_cell_incidents'].fillna(0)
    
    return training_data

if __name__ == '__main__':
    # Load geocoded incidents
    df_incidents = pd.read_csv('crimes_geocoded.csv')
    
    # Create grid
    grid = create_grid()
    grid.to_csv('grid_cells.csv', index=False)
    print(f"Created {len(grid)} grid cells")
    
    # Build labels
    labels = build_labels(df_incidents, grid)
    print(f"Built labels for {len(labels)} (cell, hour, dow) combinations")
    
    # Build training dataset
    training_data = build_training_dataset(df_incidents, grid, labels)
    training_data.to_csv('training_data.csv', index=False)
    print(f"Training dataset: {len(training_data)} rows")
    print(training_data.head())
```

---

## Step 4: Train XGBoost Model

Train a model to predict incident count (or risk score) per cell/time.

**Training script:**

```python
# scripts/train_model.py
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import pickle
import json

def train_risk_model(df_training: pd.DataFrame, output_dir: str = 'models'):
    """
    Train XGBoost model to predict incident count per (cell, hour, day_of_week).
    """
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    # Feature columns (exclude labels and IDs)
    exclude_cols = ['cell_id', 'incident_count', 'lat_min', 'lat_max', 'lon_min', 'lon_max']
    feature_cols = [col for col in df_training.columns if col not in exclude_cols]
    
    X = df_training[feature_cols]
    y = df_training['incident_count']  # Target: count of incidents
    
    # Handle missing values
    X = X.fillna(0)
    
    # Split: temporal split (train on older data, test on newer)
    # For now, use random split (adjust if you have date ordering)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train XGBoost regressor
    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        objective='reg:squarederror'
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        early_stopping_rounds=10,
        verbose=False
    )
    
    # Evaluate
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    mae_train = mean_absolute_error(y_train, y_pred_train)
    mae_test = mean_absolute_error(y_test, y_pred_test)
    rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))
    
    print(f"Training MAE: {mae_train:.3f}")
    print(f"Test MAE: {mae_test:.3f}")
    print(f"Test RMSE: {rmse_test:.3f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 features:")
    print(feature_importance.head(10))
    
    # Save model
    model_path = f'{output_dir}/crime_risk_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    # Save feature columns for inference
    with open(f'{output_dir}/feature_columns.json', 'w') as f:
        json.dump(feature_cols, f)
    
    # Save grid for mapping predictions back to cells
    grid = df_training[['cell_id', 'lat_center', 'lon_center', 'lat_min', 'lat_max', 'lon_min', 'lon_max']].drop_duplicates()
    grid.to_csv(f'{output_dir}/grid_cells.csv', index=False)
    
    print(f"\nModel saved to {model_path}")
    
    return model, feature_cols

def predict_risk(model, feature_cols, grid, hour: int, day_of_week: int) -> pd.DataFrame:
    """
    Predict risk scores for all cells at a given hour/day_of_week.
    Returns dataframe with cell_id, lat_center, lon_center, risk_score.
    """
    # Build features for all cells at this time
    features = grid.copy()
    features['hour'] = hour
    features['day_of_week'] = day_of_week
    features['is_weekend'] = day_of_week in [5, 6]
    features['is_late_night'] = hour >= 22 or hour < 6
    features['hour_sin'] = np.sin(2 * np.pi * hour / 24)
    features['hour_cos'] = np.cos(2 * np.pi * hour / 24)
    features['dow_sin'] = np.sin(2 * np.pi * day_of_week / 7)
    features['dow_cos'] = np.cos(2 * np.pi * day_of_week / 7)
    
    # Ensure all feature columns exist
    for col in feature_cols:
        if col not in features.columns:
            features[col] = 0
    
    X = features[feature_cols].fillna(0)
    predictions = model.predict(X)
    
    result = features[['cell_id', 'lat_center', 'lon_center']].copy()
    result['risk_score'] = predictions
    
    return result

if __name__ == '__main__':
    # Load training data
    df_training = pd.read_csv('training_data.csv')
    
    # Train model
    model, feature_cols = train_risk_model(df_training)
    
    # Example: Predict risk for Friday 11 PM
    grid = pd.read_csv('models/grid_cells.csv')
    risk_map = predict_risk(model, feature_cols, grid, hour=23, day_of_week=4)  # Friday = 4
    
    # Filter high-risk cells (above threshold)
    threshold = risk_map['risk_score'].quantile(0.75)  # Top 25% risk
    high_risk = risk_map[risk_map['risk_score'] >= threshold]
    
    print(f"\nHigh-risk cells (Friday 11 PM, threshold={threshold:.2f}): {len(high_risk)}")
    high_risk.to_csv('high_risk_cells_friday_11pm.csv', index=False)
```

---

## Step 5: Convert Risk Scores to Polygons for Valhalla

Convert high-risk grid cells to polygons for `exclude_polygons` in routing.

**Polygon conversion script:**

```python
# scripts/cells_to_polygons.py
import pandas as pd
import json

def cell_to_polygon(cell_row: pd.Series) -> list:
    """
    Convert a grid cell to a polygon in Valhalla format.
    Valhalla expects: [[lon, lat], [lon, lat], ...]
    """
    return [
        [cell_row['lon_min'], cell_row['lat_min']],
        [cell_row['lon_max'], cell_row['lat_min']],
        [cell_row['lon_max'], cell_row['lat_max']],
        [cell_row['lon_min'], cell_row['lat_max']],
        [cell_row['lon_min'], cell_row['lat_min']],  # Close polygon
    ]

def risk_cells_to_polygons(df_risk: pd.DataFrame, grid: pd.DataFrame) -> list:
    """
    Convert high-risk cells to list of polygons for Valhalla exclude_polygons.
    """
    # Merge risk scores with grid bounds
    df_with_bounds = df_risk.merge(
        grid[['cell_id', 'lat_min', 'lat_max', 'lon_min', 'lon_max']],
        on='cell_id',
        how='left'
    )
    
    polygons = []
    for _, row in df_with_bounds.iterrows():
        polygon = cell_to_polygon(row)
        polygons.append(polygon)
    
    return polygons

if __name__ == '__main__':
    # Load high-risk cells and grid
    df_risk = pd.read_csv('high_risk_cells_friday_11pm.csv')
    grid = pd.read_csv('models/grid_cells.csv')
    
    # Convert to polygons
    polygons = risk_cells_to_polygons(df_risk, grid)
    
    # Save as JSON for use in backend/API
    with open('risk_polygons.json', 'w') as f:
        json.dump(polygons, f, indent=2)
    
    print(f"Converted {len(polygons)} high-risk cells to polygons")
    print(f"Saved to risk_polygons.json")
```

---

## Step 6: Integration with SafeRoute Backend

Create a simple backend service that loads the model and returns risk polygons.

**Backend API example (Flask/FastAPI):**

```python
# backend/risk_api.py (example)
from flask import Flask, jsonify, request
import pandas as pd
import pickle
import json
from datetime import datetime

app = Flask(__name__)

# Load model and grid on startup
with open('models/crime_risk_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('models/feature_columns.json', 'r') as f:
    feature_cols = json.load(f)

grid = pd.read_csv('models/grid_cells.csv')

@app.route('/api/risk-polygons', methods=['GET'])
def get_risk_polygons():
    """
    Get high-risk polygons for current time or specified time.
    Query params: ?hour=23&day_of_week=4&threshold=0.75
    """
    hour = int(request.args.get('hour', datetime.now().hour))
    day_of_week = int(request.args.get('day_of_week', datetime.now().weekday()))
    threshold_percentile = float(request.args.get('threshold', 0.75))
    
    # Predict risk for all cells
    risk_map = predict_risk(model, feature_cols, grid, hour, day_of_week)
    
    # Filter high-risk
    threshold = risk_map['risk_score'].quantile(threshold_percentile)
    high_risk = risk_map[risk_map['risk_score'] >= threshold]
    
    # Convert to polygons
    polygons = risk_cells_to_polygons(high_risk, grid)
    
    return jsonify({
        'polygons': polygons,
        'threshold': float(threshold),
        'high_risk_cell_count': len(high_risk),
        'total_cells': len(risk_map)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

---

## Quick Start Checklist

1. **Extract data:**
   ```bash
   python scripts/extract_from_emails.py
   # Output: extracted_crimes.csv
   ```

2. **Geocode locations:**
   ```bash
   python scripts/geocode_locations.py
   # Output: crimes_geocoded.csv
   ```

3. **Build training data:**
   ```bash
   python scripts/build_training_data.py
   # Output: training_data.csv, grid_cells.csv
   ```

4. **Train model:**
   ```bash
   python scripts/train_model.py
   # Output: models/crime_risk_model.pkl
   ```

5. **Generate risk polygons:**
   ```bash
   python scripts/cells_to_polygons.py
   # Output: risk_polygons.json
   ```

6. **Use in SafeRoute:**
   - Call backend API to get risk polygons for current time
   - Pass polygons to Valhalla routing as `exclude_polygons`
   - Display polygons on map as "High Risk Area" overlay

---

## Tips & Best Practices

- **Data quality:** Manually review extracted locations and crime types; geocoding may need correction
- **Temporal features:** Include hour, day of week, semester calendar (finals, breaks)
- **Spatial features:** Add distance to transit stops, lighting data (if available), building density
- **Validation:** Use temporal split (train on 2022-2023, test on 2024) to avoid data leakage
- **Threshold tuning:** Adjust risk threshold based on false positive/negative trade-offs
- **Model updates:** Retrain periodically as new crime data arrives

---

## Next Steps

1. Run extraction on your email dataset
2. Review and clean geocoded data
3. Train initial model and evaluate on test set
4. Integrate backend API with SafeRoute app
5. Test routing with risk polygons in development
