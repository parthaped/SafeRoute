# Exact Format for `emails.csv`

**File location:** `c:\Users\Parth\SafeRoute\emails.csv` (project root, same folder as `package.json`)

**File format:** CSV (Comma-Separated Values) with UTF-8 encoding

---

## Required Columns

Exactly **3 columns** in this order:

1. **`subject`** — Email subject line (text)
2. **`body`** — Full email body text (where location and crime type are described)
3. **`date`** — Email date (optional but recommended; format: `YYYY-MM-DD`)

---

## CSV Format Rules

- **First row:** Header row with column names: `subject,body,date`
- **Each row:** One email
- **Encoding:** UTF-8
- **Quotes:** Use double quotes `"` around fields that contain commas, newlines, or quotes
- **Escaping:** If a field contains a double quote, escape it as `""` (two quotes)

---

## Example File

```csv
subject,body,date
"Crime Alert - Theft","On January 15, 2024 at 10:30 PM, a theft occurred at 126 College Ave near the Student Center. A wallet was reported stolen.",2024-01-15
"Incident Report","Vandalism reported on 01/20/2024 around 1:15 AM at Alexander Library. Property damage to building exterior.",2024-01-20
"Safety Bulletin","Robbery at College Ave and Easton Ave. Suspect fled. 11:45 PM. Contact RUPD with info.",2024-02-01
```

---

## What the Script Looks For in the `body` Column

### Location/Place (required for extraction)

The script searches for:

1. **Street addresses:**
   - `126 College Ave`
   - `College Ave and George St`
   - `Somerset St`
   - `Easton Ave`

2. **Building/area names** (must contain one of these keywords):
   - `college ave`, `george st`, `somerset st`, `easton ave`
   - `student center`, `library`, `dorm`, `residence`, `hall`, `building`, `parking`
   - `rutgers`, `campus`, `busch`, `livingston`, `cook`, `douglass`

   Examples:
   - "near Alexander Library" → extracts "Alexander Library"
   - "at the Student Center" → extracts "Student Center"
   - "on Busch campus" → extracts "Busch campus"

### Crime Type (required for extraction)

The script searches for these words (case-insensitive):

- `theft`, `burglary`, `assault`, `vandalism`, `robbery`
- `drug`, `disorderly`, `trespass`, `harassment`, `stalking`

Or variations:
- `stolen`, `taken`, `missing item` → `theft`
- `attacked`, `physical`, `battery` → `assault`
- `damage`, `graffiti`, `destruction` → `vandalism`
- `break-in`, `entered`, `unauthorized entry` → `burglary`

### Date/Time (optional but helpful)

The script extracts dates/times from the `body` text or uses the `date` column:

- Date formats: `01/15/2024`, `2024-01-15`, `January 15, 2024`
- Time formats: `10:30 PM`, `22:30`, `1:15 AM`

---

## Important Notes

1. **Both location AND crime type must be found** in the email body for it to be extracted. If either is missing, that row is skipped.

2. **The `date` column is optional** — if empty, the script tries to extract the date from the `body` text. If neither works, the date will be empty in the output.

3. **Multi-line bodies:** If the email body contains line breaks, wrap the entire `body` field in double quotes:
   ```csv
   subject,body,date
   "Alert","This is line one.
   This is line two.
   Location: 126 College Ave",2024-01-15
   ```

4. **Special characters:** If the body contains commas, quotes, or newlines, wrap it in double quotes:
   ```csv
   subject,body,date
   "Alert","The incident occurred at 126 College Ave, near the Student Center. The victim said, ""I was walking when...""",2024-01-15
   ```

---

## How to Create the File

### Option 1: Excel / Google Sheets

1. Open Excel or Google Sheets
2. Create 3 columns: `subject`, `body`, `date`
3. Fill in your data (one row per email)
4. Save as CSV (UTF-8 encoding)
5. Name it `emails.csv` and put it in `c:\Users\Parth\SafeRoute\`

### Option 2: Text Editor

1. Open Notepad or any text editor
2. Copy/paste this header:
   ```csv
   subject,body,date
   ```
3. Add one row per email, comma-separated, with quotes around fields containing commas:
   ```csv
   subject,body,date
   "Subject 1","Body text here with location and crime type",2024-01-15
   "Subject 2","Another body",2024-01-16
   ```
4. Save as `emails.csv` (UTF-8 encoding) in `c:\Users\Parth\SafeRoute\`

### Option 3: Python Script

If you have your emails in another format (JSON, database, etc.), write a small Python script to convert to CSV:

```python
import csv

emails = [
    {'subject': 'Crime Alert', 'body': 'Theft at 126 College Ave...', 'date': '2024-01-15'},
    # ... more emails
]

with open('emails.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['subject', 'body', 'date'])
    writer.writeheader()
    writer.writerows(emails)
```

---

## Testing

After creating `emails.csv`, test it:

```bash
cd c:\Users\Parth\SafeRoute
python scripts/easy_email_extractor.py
```

The script will tell you:
- How many emails were loaded
- How many had both location AND crime type (these are extracted)
- Sample of extracted data

If you see "No crimes extracted", check that your email bodies contain:
- A location (street address or building name with keywords like "library", "college ave", etc.)
- A crime type word (theft, assault, vandalism, etc.)
