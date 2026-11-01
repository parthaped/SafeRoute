import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';
import { useReportStore } from '../../stores/useReportStore';
import { CRIME_TYPES, type CrimeType, type ReportPriority } from '../../types/report';
import { getLoader, DEFAULT_CENTER, DARK_MAP_STYLES, LIGHT_MAP_STYLES } from '../../lib/mapbox';
import { useThemeStore } from '../../stores/useThemeStore';

type ReportFormProps = {
  onClose: () => void;
};

const PRIORITIES: { value: ReportPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const PIN_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
  <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="#E10600"/>
  <circle cx="14" cy="14" r="6" fill="#000"/>
</svg>
`)}`;

export function ReportForm({ onClose }: ReportFormProps) {
  const fileReport = useReportStore((s) => s.fileReport);

  const [crimeType, setCrimeType] = useState<CrimeType>('Suspicious Activity');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [priority, setPriority] = useState<ReportPriority>('medium');
  const [broadcastToUsers, setBroadcastToUsers] = useState(false);
  const [addToHeatmap, setAddToHeatmap] = useState(true);
  const [officerName, setOfficerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const placeMarker = useCallback((map: google.maps.Map, pos: { lat: number; lng: number }) => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new google.maps.Marker({
      map,
      position: pos,
      icon: {
        url: PIN_SVG,
        scaledSize: new google.maps.Size(28, 40),
        anchor: new google.maps.Point(14, 40),
      },
      animation: google.maps.Animation.DROP,
    });
  }, []);

  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const loader = getLoader();
      const { Map } = await loader.importLibrary('maps');

      const currentTheme = useThemeStore.getState().theme;
      const map = new Map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 16,
        styles: currentTheme === 'light' ? LIGHT_MAP_STYLES : DARK_MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        backgroundColor: currentTheme === 'light' ? '#f5f5f7' : '#000000',
        gestureHandling: 'greedy',
        clickableIcons: false,
      });

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setPinLocation({ lat, lng });
        placeMarker(map, { lat, lng });
      });

      mapRef.current = map;
    } catch (err) {
      console.error('[ReportForm] Map init failed:', err);
      setMapError(
        'Could not load Google Maps. Ensure the Maps JavaScript API is enabled for your API key ' +
        'and that localhost is allowed in HTTP referrer restrictions.'
      );
    }
  }, [placeMarker]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  useEffect(() => {
    if (!title || title === autoTitle(crimeType, '')) {
      setTitle(autoTitle(crimeType, locationName));
    }
  }, [crimeType, locationName]);

  const handleSubmit = async () => {
    if (!pinLocation || !description.trim() || submitting) return;

    setSubmitting(true);
    await fileReport({
      crimeType,
      title: title || autoTitle(crimeType, locationName),
      description,
      location: pinLocation,
      locationName: locationName || 'Unmarked location',
      priority,
      status: 'active',
      source: 'officer',
      officerId: 'dashboard-operator',
      officerName: officerName || 'Officer',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      broadcastToUsers,
      addToHeatmap,
    });
    setSubmitting(false);
    onClose();
  };

  const inputClass =
    'w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-[13px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent-red/40 focus:ring-1 focus:ring-accent-red/20 transition-colors';

  return (
    <div className="glass-raised animate-slide-up overflow-hidden">
      <div className="glass-header">
        <div>
          <h3 className="text-[15px] font-semibold text-text-primary">File Officer Report</h3>
          <p className="text-[11px] text-text-quaternary mt-0.5">Click the map to mark the exact location</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>

      <div className="glass-body space-y-5">
        {/* Map — pin placement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="label-caps">Location</label>
            {pinLocation && (
              <span className="text-[10px] font-mono text-text-quaternary tabular-nums">
                {pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}
              </span>
            )}
          </div>
          {mapError ? (
            <div className="w-full h-52 rounded-xl border border-risk-high/30 bg-risk-high-bg flex items-center justify-center p-4">
              <p className="text-[12px] text-risk-high text-center leading-relaxed">{mapError}</p>
            </div>
          ) : (
            <div
              ref={mapContainerRef}
              className="w-full h-52 rounded-xl overflow-hidden border border-surface-border bg-surface-base"
            />
          )}
          {!pinLocation && !mapError && (
            <p className="text-[11px] text-accent-red">Click on the map to place the incident pin</p>
          )}
        </div>

        {/* Location name */}
        <Field label="Location Name">
          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Scott Hall Parking Lot, College Ave"
            className={inputClass}
          />
        </Field>

        {/* Crime type — grid selector */}
        <div className="space-y-2">
          <label className="label-caps">Crime Type</label>
          <div className="flex flex-wrap gap-1.5">
            {CRIME_TYPES.map((ct) => (
              <button
                key={ct}
                onClick={() => setCrimeType(ct)}
                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all cursor-pointer ${
                  crimeType === ct
                    ? 'bg-accent-red-subtle border-accent-red/40 text-accent-red'
                    : 'bg-surface-card border-surface-border text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="label-caps">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                  priority === p.value
                    ? priorityActiveStyle(p.value)
                    : 'bg-surface-card border-surface-border text-text-tertiary hover:bg-surface-hover'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <Field label="Report Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Auto-generated from crime type + location"
            className={inputClass}
          />
        </Field>

        {/* Description */}
        <Field label="What happened?">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the incident, suspect description, direction of travel, etc."
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </Field>

        {/* Officer name */}
        <Field label="Officer / Operator Name">
          <input
            value={officerName}
            onChange={(e) => setOfficerName(e.target.value)}
            placeholder="Badge # or name"
            className={inputClass}
          />
        </Field>

        {/* Options */}
        <div className="space-y-3 p-4 bg-surface-card rounded-xl border border-surface-border">
          <p className="label-caps">Options</p>
          <CheckOption
            checked={broadcastToUsers}
            onChange={setBroadcastToUsers}
            label="Broadcast alert to SafeRoute users"
            sublabel="Users near this area will be notified and routes rerouted"
          />
          <CheckOption
            checked={addToHeatmap}
            onChange={setAddToHeatmap}
            label="Add to crime heatmap"
            sublabel="This incident will appear on the risk heatmap for all users"
          />
        </div>

        {/* Summary preview */}
        {pinLocation && description.trim() && (
          <div className="p-4 bg-surface-card rounded-xl border border-surface-border space-y-2">
            <p className="label-caps">Preview</p>
            <div className="flex items-center gap-2">
              <Badge variant={priority} dot>{priority}</Badge>
              <Badge variant="neutral">{crimeType}</Badge>
              {broadcastToUsers && <Badge variant="high" dot>Broadcasting</Badge>}
            </div>
            <p className="text-[13px] font-medium text-text-primary">{title || autoTitle(crimeType, locationName)}</p>
            <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-2">{description}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={!pinLocation || !description.trim() || submitting}
          >
            {submitting ? 'Filing Report…' : 'File Report'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="label-caps">{label}</label>
      {children}
    </div>
  );
}

function CheckOption({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left cursor-pointer group"
    >
      <span
        className={`mt-0.5 h-4 w-4 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-accent-red border-accent-red'
            : 'border-surface-border-light group-hover:border-text-tertiary'
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <div>
        <p className="text-[12px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">{label}</p>
        <p className="text-[10px] text-text-quaternary">{sublabel}</p>
      </div>
    </button>
  );
}

function autoTitle(crimeType: string, locationName: string): string {
  if (locationName) return `${crimeType} — ${locationName}`;
  return crimeType;
}

function priorityActiveStyle(p: ReportPriority): string {
  switch (p) {
    case 'low': return 'bg-risk-low-bg border-risk-low/30 text-risk-low';
    case 'medium': return 'bg-risk-medium-bg border-risk-medium/30 text-risk-medium';
    case 'high': return 'bg-risk-high-bg border-risk-high/30 text-risk-high';
    case 'critical': return 'bg-risk-critical-bg border-risk-critical/30 text-risk-critical';
  }
}
