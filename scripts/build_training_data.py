"""
Build training dataset: grid cells + features + labels.
Usage: python scripts/build_training_data.py
"""
import pandas as pd
import numpy as np
from typing import Optional
import math

# Rutgers NB center; 20-mile radius for stronger model (campus + New Brunswick area)
RUTGERS_CENTER_LAT = 40.5008
RUTGERS_CENTER_LON = -74.4474
RADIUS_MILES = 20
DEG_PER_MI_LAT = 1 / 69.0
DEG_PER_MI_LON = 1 / (69.0 * math.cos(math.radians(RUTGERS_CENTER_LAT)))
RUTGERS_BOUNDS = {
    'lat_min': RUTGERS_CENTER_LAT - RADIUS_MILES * DEG_PER_MI_LAT,
    'lat_max': RUTGERS_CENTER_LAT + RADIUS_MILES * DEG_PER_MI_LAT,
    'lon_min': RUTGERS_CENTER_LON - RADIUS_MILES * DEG_PER_MI_LON,
    'lon_max': RUTGERS_CENTER_LON + RADIUS_MILES * DEG_PER_MI_LON,
}

CELL_SIZE_LAT = 0.002
CELL_SIZE_LON = 0.0025

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in km."""
    R = 6371
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

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
    """Build labels: count of incidents per (cell, time_window)."""
    df_incidents = df_incidents.copy()
    
    df_incidents['datetime'] = pd.to_datetime(
        df_incidents['date'] + ' ' + df_incidents['time'].fillna('12:00'),
        errors='coerce'
    )
    
    df_incidents['cell_id'] = df_incidents.apply(
        lambda row: assign_to_cell(row['latitude'], row['longitude'], grid),
        axis=1
    )
    
    df_valid = df_incidents[df_incidents['cell_id'].notna()].copy()
    
    df_valid['hour'] = df_valid['datetime'].dt.hour
    df_valid['day_of_week'] = df_valid['datetime'].dt.dayofweek
    df_valid['is_weekend'] = df_valid['day_of_week'].isin([5, 6])
    df_valid['is_late_night'] = df_valid['hour'].between(22, 6)
    
    labels = df_valid.groupby(['cell_id', 'hour', 'day_of_week']).size().reset_index(name='incident_count')
    
    return labels

def build_spatial_features(grid: pd.DataFrame) -> pd.DataFrame:
    """Build spatial features for each cell."""
    pois = [
        {'name': 'Student Center', 'lat': 40.4995, 'lon': -74.4482},
        {'name': 'Alexander Library', 'lat': 40.5003, 'lon': -74.447},
        {'name': 'Werblin Rec', 'lat': 40.5042, 'lon': -74.4515},
        {'name': 'Rutgers Center', 'lat': 40.5008, 'lon': -74.4474},
    ]
    
    features = grid.copy()
    
    for poi in pois:
        features[f'dist_to_{poi["name"].lower().replace(" ", "_")}'] = features.apply(
            lambda row: haversine_distance(
                row['lat_center'], row['lon_center'],
                poi['lat'], poi['lon']
            ),
            axis=1
        )
    
    center_lat = RUTGERS_BOUNDS['lat_min'] + (RUTGERS_BOUNDS['lat_max'] - RUTGERS_BOUNDS['lat_min']) / 2
    center_lon = RUTGERS_BOUNDS['lon_min'] + (RUTGERS_BOUNDS['lon_max'] - RUTGERS_BOUNDS['lon_min']) / 2
    
    features['dist_to_center'] = features.apply(
        lambda row: haversine_distance(
            row['lat_center'], row['lon_center'],
            center_lat, center_lon
        ),
        axis=1
    )
    
    return features

def build_training_dataset(
    df_incidents: pd.DataFrame,
    grid: pd.DataFrame,
    labels: pd.DataFrame
) -> pd.DataFrame:
    """Combine grid features, temporal features, and labels."""
    spatial_features = build_spatial_features(grid)
    
    training_data = labels.merge(
        spatial_features,
        on='cell_id',
        how='left'
    )
    
    training_data['is_weekend'] = training_data['day_of_week'].isin([5, 6])
    training_data['is_late_night'] = training_data['hour'].between(22, 6)
    training_data['hour_sin'] = np.sin(2 * np.pi * training_data['hour'] / 24)
    training_data['hour_cos'] = np.cos(2 * np.pi * training_data['hour'] / 24)
    training_data['dow_sin'] = np.sin(2 * np.pi * training_data['day_of_week'] / 7)
    training_data['dow_cos'] = np.cos(2 * np.pi * training_data['day_of_week'] / 7)
    
    cell_counts = labels.groupby('cell_id')['incident_count'].sum().reset_index(name='total_cell_incidents')
    training_data = training_data.merge(cell_counts, on='cell_id', how='left')
    training_data['total_cell_incidents'] = training_data['total_cell_incidents'].fillna(0)
    
    return training_data

if __name__ == '__main__':
    import sys
    
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'crimes_geocoded.csv'
    
    df_incidents = pd.read_csv(input_file)
    
    grid = create_grid()
    grid.to_csv('grid_cells.csv', index=False)
    print(f"Created {len(grid)} grid cells")
    
    labels = build_labels(df_incidents, grid)
    print(f"Built labels for {len(labels)} (cell, hour, dow) combinations")
    
    training_data = build_training_dataset(df_incidents, grid, labels)
    training_data.to_csv('training_data.csv', index=False)
    print(f"Training dataset: {len(training_data)} rows")
    print(training_data.head())
