"""
Convert high-risk grid cells to polygons for Valhalla exclude_polygons.
Usage: python scripts/cells_to_polygons.py
"""
import pandas as pd
import json

def cell_to_polygon(cell_row: pd.Series) -> list:
    """Convert a grid cell to a polygon in Valhalla format."""
    return [
        [cell_row['lon_min'], cell_row['lat_min']],
        [cell_row['lon_max'], cell_row['lat_min']],
        [cell_row['lon_max'], cell_row['lat_max']],
        [cell_row['lon_min'], cell_row['lat_max']],
        [cell_row['lon_min'], cell_row['lat_min']],
    ]

def risk_cells_to_polygons(df_risk: pd.DataFrame, grid: pd.DataFrame) -> list:
    """Convert high-risk cells to list of polygons for Valhalla."""
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
    import sys
    
    risk_file = sys.argv[1] if len(sys.argv) > 1 else 'high_risk_cells_friday_11pm.csv'
    grid_file = sys.argv[2] if len(sys.argv) > 2 else 'models/grid_cells.csv'
    output_file = sys.argv[3] if len(sys.argv) > 3 else 'risk_polygons.json'
    
    df_risk = pd.read_csv(risk_file)
    grid = pd.read_csv(grid_file)
    
    polygons = risk_cells_to_polygons(df_risk, grid)
    
    with open(output_file, 'w') as f:
        json.dump(polygons, f, indent=2)
    
    print(f"Converted {len(polygons)} high-risk cells to polygons")
    print(f"Saved to {output_file}")
