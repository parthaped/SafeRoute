# Crime Data Extraction & ML Training Scripts

These scripts extract crime data from emails and train an ML model to predict high-risk areas.

## Setup

Install Python dependencies:

```bash
pip install pandas numpy python-dateutil geopy xgboost scikit-learn openpyxl
```

## Workflow

0. **Optional — fetch hundreds of emails from your inbox (no copy/paste):**
   ```bash
   # One-time: copy scripts/email_fetch.env.example to scripts/email_fetch.env, add email + app password
   python scripts/fetch_emails_imap.py
   ```
   - Fetches emails via IMAP and writes `emails.csv` in project root. Then run step 1.

1. **Extract crime data (place + type + date) from emails:**
   ```bash
   python scripts/easy_email_extractor.py
   ```
   - Reads `emails.csv` from project root
   - Output: `extracted_crimes.csv` (place/location + crime type + date/time)

2. **Geocode locations:**
   ```bash
   python scripts/geocode_locations.py extracted_crimes.csv
   ```
   - Output: `crimes_geocoded.csv`
   - Uses OpenStreetMap Nominatim (free, rate-limited to 1 req/sec)

4. **Build training dataset:**
   ```bash
   python scripts/build_training_data.py crimes_geocoded.csv
   ```
   - Output: `training_data.csv`, `grid_cells.csv`

4. **Train model:**
   ```bash
   python scripts/train_model.py training_data.csv
   ```
   - Output: `models/crime_risk_model.pkl`, `models/feature_columns.json`, `models/grid_cells.csv`

6. **Generate risk polygons:**
   ```bash
   python scripts/cells_to_polygons.py high_risk_cells_friday_11pm.csv models/grid_cells.csv
   ```
   - Output: `risk_polygons.json` (for use with Valhalla routing)

## Customization

- **Email format:** Modify regex patterns in `extract_from_emails.py` to match your email format
- **Grid size:** Adjust `CELL_SIZE_LAT` and `CELL_SIZE_LON` in `build_training_data.py`
- **Features:** Add more spatial features (lighting, transit stops) in `build_spatial_features()`
- **Model params:** Tune XGBoost hyperparameters in `train_model.py`

## Integration

See `docs/CRIME_DATA_EXTRACTION_AND_ML.md` for full documentation and backend API examples.
