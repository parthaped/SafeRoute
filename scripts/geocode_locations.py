"""
Geocode crime locations to lat/lon coordinates.
Usage: python scripts/geocode_locations.py
Requires: geopy (pip install geopy)
"""
import pandas as pd
import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

def geocode_with_nominatim(address: str, retries: int = 3) -> tuple:
    """
    Geocode an address using OpenStreetMap Nominatim (free, no API key).
    Returns (latitude, longitude) or (None, None) if failed.
    """
    geolocator = Nominatim(user_agent="SafeRoute_CrimeData")
    
    query = f"{address}, New Brunswick, NJ"
    
    for attempt in range(retries):
        try:
            location = geolocator.geocode(query, timeout=10)
            if location:
                return (location.latitude, location.longitude)
            time.sleep(1)
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
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
            time.sleep(1)  # Rate limit: 1 request/second
    
    return df

if __name__ == '__main__':
    import sys
    
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'extracted_crimes.csv'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'crimes_geocoded.csv'
    
    df = pd.read_csv(input_file)
    
    df_geocoded = geocode_dataframe(df)
    
    # Filter to 20-mile radius around Rutgers NB (campus + surrounding area)
    import math
    center_lat, center_lon = 40.5008, -74.4474
    radius_miles = 20
    deg_per_mi_lat = 1 / 69.0
    deg_per_mi_lon = 1 / (69.0 * math.cos(math.radians(center_lat)))
    rutgers_bounds = {
        'lat_min': center_lat - radius_miles * deg_per_mi_lat,
        'lat_max': center_lat + radius_miles * deg_per_mi_lat,
        'lon_min': center_lon - radius_miles * deg_per_mi_lon,
        'lon_max': center_lon + radius_miles * deg_per_mi_lon,
    }
    
    df_filtered = df_geocoded[
        (df_geocoded['latitude'] >= rutgers_bounds['lat_min']) &
        (df_geocoded['latitude'] <= rutgers_bounds['lat_max']) &
        (df_geocoded['longitude'] >= rutgers_bounds['lon_min']) &
        (df_geocoded['longitude'] <= rutgers_bounds['lon_max'])
    ].copy()
    
    df_filtered.to_csv(output_file, index=False)
    print(f"\nGeocoded {len(df_filtered)} incidents within 20-mile radius of Rutgers")
    print(f"Saved to {output_file}")
