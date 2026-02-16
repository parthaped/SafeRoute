/**
 * One-time script: reads Rutgers crime mock CSV and writes src/data/rutgersCrimeData.json
 * Run: node scripts/csvToCrimeJson.js "path/to/rutgers_crime_mock_data (1).csv"
 */

const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2] || path.join(__dirname, '../src/data/rutgers_crime_mock_data.csv');
const outPath = path.join(__dirname, '../src/data/rutgersCrimeData.json');

const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.trim().split(/\r?\n/);
if (lines.length < 2) {
  console.error('CSV has no data rows');
  process.exit(1);
}

const headerCols = lines[0].split(',').map((h) => h.trim().toLowerCase());
const dateCol = headerCols.indexOf('reported_date');
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  if (parts.length < 10) continue;
  const latitude = parseFloat(parts[8]);
  const longitude = parseFloat(parts[9]);
  const severity = parseInt(parts[5], 10);
  if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(severity)) continue;
  const row = {
    incident_id: parts[0],
    crime_type: parts[4],
    severity_score: severity,
    location_name: parts[6],
    latitude,
    longitude,
    campus: parts[11] || '',
  };
  if (dateCol >= 0 && parts[dateCol]) row.reported_date = parts[dateCol].trim();
  rows.push(row);
}

const dir = path.dirname(outPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(rows, null, 0), 'utf8');
console.log('Wrote', rows.length, 'rows to', outPath);
