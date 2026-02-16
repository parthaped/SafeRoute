# Crime CSV Verdict: Is Your Data Good Enough for the ML Model?

## What We Checked

Your file **`scripts/crime_geocoded.csv`** was analyzed and cleaned by **`scripts/analyze_and_clean_crimes.py`**.

### Findings

1. **No latitude/longitude**  
   Every row had missing or zero coordinates. The file is named "crime_geocoded" but geocoding was either not run or failed for all rows. The ML pipeline needs **latitude and longitude** to assign each incident to a grid cell.

2. **Irrelevant rows removed**  
   - Non-incident emails (e.g. "Virtual Training", "Workplace Violence" training notices)  
   - Rows with `crime_type` = `unknown` or empty  

3. **Useful data kept**  
   - **79** original rows → **60** rows after cleaning (valid crime_type and a non-empty location string from `location_ai`)  
   - Crime types: burglary (20), assault (15), robbery (11), theft (10), vandalism (2), harassment (1), drug (1)  
   - Many `location_ai` values are generic (e.g. "The Rutgers University Police Department", "Community Advisory Attention Rutgers") and will geocode to the same or similar points. Only a few are specific (e.g. "Easton Ave", "SHI Stadium", "Bishop Place").

---

## Is the CSV Good Enough?

**Not yet, but it can be.**

- **Good:** You have 60 incidents with crime type and a location string; irrelevant rows were removed.  
- **Problem:** There are no coordinates. The model needs **lat/lon** (or a geocodable address) for each incident.  
- **Next:** Run **geocoding** on the cleaned file to add latitude/longitude. Only rows that resolve to a point **inside Rutgers NB** will be kept for training. Many generic locations will either fail to geocode or resolve to the same building, so you may end up with fewer than 60 **distinct** locations.  
- **For a stronger model:** Aim for **100+ incidents with varied locations**. Improve your pipeline so that:
  - Each incident has **latitude/longitude**, or  
  - Location extraction yields **specific addresses/places** (e.g. "126 College Ave", "Bishop Place and George St") instead of "The Rutgers University Police Department".

---

## What Was Done

1. **Cleaned file created:** `scripts/crime_geocoded_cleaned.csv`  
   - Columns: `date`, `time`, `location`, `crime_type`, `latitude`, `longitude`  
   - Irrelevant rows removed; `location` set from `location_ai` where available; dates parsed.

2. **Next steps for you**  
   - Geocode the cleaned file to add coordinates, then run the training pipeline:

   ```bash
   cd c:\Users\Parth\SafeRoute\scripts
   python scripts/geocode_locations.py crime_geocoded_cleaned.csv crimes_geocoded_for_ml.csv
   python scripts/build_training_data.py crimes_geocoded_for_ml.csv
   python scripts/train_model.py training_data.csv
   ```

   After geocoding, only incidents with valid lat/lon inside Rutgers NB will be in `crimes_geocoded_for_ml.csv`. That file is what you use for **build_training_data** and the ML model.

---

## Summary

| Question | Answer |
|----------|--------|
| Does the CSV have enough to train the ML model? | Not yet; it has **no coordinates**. |
| Was irrelevant data removed? | Yes; non-incidents and unknown crime types were dropped. |
| What do you need to do? | Run **geocoding** on `crime_geocoded_cleaned.csv`, then **build_training_data** and **train_model** on the geocoded file. |
| How to improve data quality? | Add lat/lon in your pipeline or extract **specific addresses/place names** (e.g. "Easton Ave", "Bishop Place") instead of generic text (e.g. "RUPD"). |
