# Easy Email Extraction & ML Training Guide

This guide explains the **easiest ways** to extract emails and train the ML model for crime risk prediction.

---

## Part 1: Extracting Emails (Easiest Methods)

### Method 1: Export from Gmail (Easiest for Most Users)

**Step 1: Export emails from Gmail**

1. **Using Gmail Search:**
   - Go to Gmail
   - Search for: `subject:(crime OR alert OR incident) from:rupd@rutgers.edu`
   - This finds all RUPD crime alert emails

2. **Export to CSV (Manual but Simple):**
   - Select all emails (checkbox at top)
   - Use Gmail's "Download" feature or a browser extension
   - Or manually copy-paste into a spreadsheet

3. **Save as CSV file** (`emails.csv`):
   ```csv
   subject,body,date
   "Crime Alert - Theft","On January 15, 2024 at 10:30 PM, a theft occurred at 126 College Ave near the Student Center. A wallet was reported stolen.","2024-01-15"
   "Incident Report","Vandalism reported on 01/20/2024 around 1:15 AM at Alexander Library. Property damage to building exterior.","2024-01-20"
   ```

### Method 2: Gmail API (Automated - Best for Many Emails)

**Step 1: Set up Gmail API**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Gmail API"
4. Create OAuth 2.0 credentials (Desktop app)
5. Download credentials as `credentials.json`

**Step 2: Install dependencies**
```bash
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

**Step 3: Use the provided script**

Create `scripts/get_gmail_emails.py`:

```python
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
import pickle
import json
from typing import List, Dict

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_gmail_service():
    """Authenticate and return Gmail service."""
    creds = None
    # Check if we have saved credentials
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    
    # If no valid credentials, get them
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save credentials for next time
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    
    return build('gmail', 'v1', credentials=creds)

def extract_email_body(payload) -> str:
    """Extract email body from Gmail API payload."""
    body = ""
    if 'parts' in payload:
        for part in payload['parts']:
            if part['mimeType'] == 'text/plain':
                data = part['body']['data']
                import base64
                body += base64.urlsafe_b64decode(data).decode('utf-8')
    elif 'body' in payload and 'data' in payload['body']:
        import base64
        body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
    return body

def get_crime_alert_emails(service, max_results: int = 500) -> List[Dict[str, str]]:
    """Fetch crime alert emails from Gmail."""
    # Search for RUPD crime alerts
    query = 'from:rupd@rutgers.edu subject:(crime OR alert OR incident)'
    
    results = service.users().messages().list(
        userId='me',
        q=query,
        maxResults=max_results
    ).execute()
    
    messages = results.get('messages', [])
    emails = []
    
    for msg in messages:
        message = service.users().messages().get(
            userId='me',
            id=msg['id'],
            format='full'
        ).execute()
        
        payload = message['payload']
        headers = payload.get('headers', [])
        
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
        date_header = next((h['value'] for h in headers if h['name'] == 'Date'), '')
        
        # Extract date (parse from email header)
        from email.utils import parsedate_to_datetime
        try:
            date_obj = parsedate_to_datetime(date_header)
            date = date_obj.strftime('%Y-%m-%d')
        except:
            date = None
        
        body = extract_email_body(payload)
        
        emails.append({
            'subject': subject,
            'body': body,
            'date': date
        })
    
    return emails

if __name__ == '__main__':
    service = get_gmail_service()
    emails = get_crime_alert_emails(service)
    
    # Save to JSON
    with open('emails.json', 'w', encoding='utf-8') as f:
        json.dump(emails, f, indent=2, ensure_ascii=False)
    
    print(f"Extracted {len(emails)} emails")
    print(f"Saved to emails.json")
```

**Step 4: Run the script**
```bash
cd scripts
python get_gmail_emails.py
# This will open a browser for OAuth, then save emails.json
```

### Method 3: Manual CSV Creation (Simplest - No Code)

If you only have a few emails or want full control:

1. **Open Excel or Google Sheets**
2. **Create columns:** `subject`, `body`, `date`
3. **Copy-paste email content** into rows
4. **Save as CSV** (`emails.csv`)

Example:
```
subject,body,date
"Crime Alert","Theft at 126 College Ave on Jan 15, 2024 at 10:30 PM","2024-01-15"
"Alert","Vandalism at Alexander Library on 01/20/2024 at 1:15 AM","2024-01-20"
```

---

## Part 2: Extract Crime Data from Emails

Once you have emails (from any method above), use the extraction script:

**Step 1: Install Python dependencies**
```bash
pip install pandas numpy python-dateutil
```

**Step 2: Run extraction script**

```bash
cd scripts
python extract_from_emails.py
```

**What it does:**
- Reads emails from your CSV/JSON
- Extracts:
  - **Date/Time** (e.g., "Jan 15, 2024", "10:30 PM")
  - **Location** (e.g., "126 College Ave", "Alexander Library")
  - **Crime Type** (e.g., "theft", "vandalism", "assault")
- Outputs: `extracted_crimes.csv`

**Example output:**
```csv
date,time,location,crime_type,raw_text
2024-01-15,10:30 PM,126 College Ave,theft,"On January 15, 2024 at 10:30 PM..."
2024-01-20,1:15 AM,Alexander Library,vandalism,"Vandalism reported on 01/20/2024..."
```

---

## Part 3: Geocode Locations

Convert addresses to coordinates:

**Step 1: Install geocoding library**
```bash
pip install geopy
```

**Step 2: Run geocoding script**
```bash
python scripts/geocode_locations.py
```

**What it does:**
- Reads `extracted_crimes.csv`
- Converts each location to latitude/longitude
- Uses free OpenStreetMap Nominatim (no API key needed)
- Outputs: `crimes_geocoded.csv`

**Note:** Geocoding is slow (1 request/second limit). For faster results, use Google Geocoding API (requires API key).

---

## Part 4: Build Training Data

Create grid cells and features:

**Step 1: Run training data builder**
```bash
python scripts/build_training_data.py
```

**What it does:**
- Creates a grid over Rutgers NB (200m x 200m cells)
- Assigns each crime to a grid cell
- Builds features:
  - Distance to key POIs (Student Center, libraries, etc.)
  - Time features (hour, day of week, weekend, late night)
  - Historical incident counts
- Outputs: `training_data.csv`, `grid_cells.csv`

---

## Part 5: Train ML Model

**Step 1: Install ML libraries**
```bash
pip install xgboost scikit-learn
```

**Step 2: Train model**
```bash
python scripts/train_model.py
```

**What it does:**
- Trains XGBoost model to predict crime risk per cell/time
- Evaluates on test set
- Saves model: `models/crime_risk_model.pkl`
- Outputs feature importance

**Model predicts:** How many incidents are likely in a grid cell at a specific time

---

## Part 6: Generate Risk Polygons

Convert high-risk cells to polygons for route avoidance:

**Step 1: Run polygon converter**
```bash
python scripts/cells_to_polygons.py
```

**What it does:**
- Loads high-risk cells (e.g., Friday 11 PM)
- Converts each cell to a polygon
- Outputs: `risk_polygons.json` (for use in routing)

---

## Quick Start (All Steps)

```bash
# 1. Extract emails (choose one method above)
#    - Manual CSV export from Gmail
#    - Gmail API script
#    - Manual entry

# 2. Extract crime data
python scripts/extract_from_emails.py
# Output: extracted_crimes.csv

# 3. Geocode locations
python scripts/geocode_locations.py
# Output: crimes_geocoded.csv

# 4. Build training data
python scripts/build_training_data.py
# Output: training_data.csv, grid_cells.csv

# 5. Train model
python scripts/train_model.py
# Output: models/crime_risk_model.pkl

# 6. Generate polygons
python scripts/cells_to_polygons.py
# Output: risk_polygons.json
```

---

## Tips for Easy Email Extraction

### For Rutgers Students/Faculty:

1. **RUPD Email Alerts:**
   - RUPD sends crime alerts to `@rutgers.edu` emails
   - Search Gmail: `from:rupd@rutgers.edu`
   - These emails are already formatted with location and crime type

2. **Email Format:**
   - RUPD emails usually have:
     - Subject: "Crime Alert - [Type]"
     - Body: Date, time, location, description
   - Perfect for automated extraction!

3. **Bulk Export:**
   - If you have many emails, use Gmail API (Method 2)
   - Or use Gmail's "Takeout" feature to download all emails

### Common Issues & Solutions:

**Problem:** Extraction script doesn't find location
- **Solution:** Add more location keywords to `LOCATION_KEYWORDS` in `extract_from_emails.py`
- Or manually edit `extracted_crimes.csv` to add missing locations

**Problem:** Geocoding fails for some addresses
- **Solution:** Manually fix addresses in CSV, or add "New Brunswick, NJ" context
- Or use Google Geocoding API for better accuracy

**Problem:** Not enough training data
- **Solution:** You need at least 50-100 incidents for a decent model
- Collect emails over several months
- Or supplement with public crime data (if available)

---

## Example: Complete Workflow

```python
# 1. Load emails (from CSV, JSON, or Gmail API)
from scripts.load_emails_example import load_emails_from_csv
emails = load_emails_from_csv('emails.csv')

# 2. Extract crime data
from scripts.extract_from_emails import process_emails
df = process_emails(emails)
df.to_csv('extracted_crimes.csv', index=False)

# 3. Geocode
from scripts.geocode_locations import geocode_dataframe
df_geo = geocode_dataframe(df)
df_geo.to_csv('crimes_geocoded.csv', index=False)

# 4. Build training data
from scripts.build_training_data import *
df_incidents = pd.read_csv('crimes_geocoded.csv')
grid = create_grid()
labels = build_labels(df_incidents, grid)
training_data = build_training_dataset(df_incidents, grid, labels)
training_data.to_csv('training_data.csv', index=False)

# 5. Train model
from scripts.train_model import train_risk_model
model, features = train_risk_model(training_data)

# 6. Generate polygons
from scripts.cells_to_polygons import *
df_risk = predict_risk(model, features, grid, hour=23, day_of_week=4)
polygons = risk_cells_to_polygons(df_risk, grid)
```

---

## Next Steps

1. **Start with Method 1** (Manual CSV) to test the pipeline
2. **Once working, use Method 2** (Gmail API) for automation
3. **Review extracted data** before geocoding (fix any errors)
4. **Train model** and check feature importance
5. **Integrate** risk polygons into SafeRoute routing

---

## Files You'll Create

- `emails.csv` or `emails.json` - Raw emails
- `extracted_crimes.csv` - Parsed crime data
- `crimes_geocoded.csv` - With lat/lon coordinates
- `training_data.csv` - Final training dataset
- `grid_cells.csv` - Grid cell definitions
- `models/crime_risk_model.pkl` - Trained model
- `risk_polygons.json` - High-risk areas for routing
