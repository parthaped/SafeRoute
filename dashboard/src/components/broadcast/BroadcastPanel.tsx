import { useState } from 'react';
import { useBroadcastStore } from '../../stores/useBroadcastStore';
import { BroadcastPreview } from './BroadcastPreview';
import { Button } from '../primitives/Button';
import { useMockBroadcastData } from '../../hooks/useMockData';

export function BroadcastPanel() {
  useMockBroadcastData();
  const broadcasts = useBroadcastStore((s) => s.broadcasts);
  const [showForm, setShowForm] = useState(false);

  const activeBroadcasts = broadcasts.filter((b) => b.status === 'active');
  const pastBroadcasts = broadcasts.filter((b) => b.status !== 'active');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-raised px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-text-primary">Broadcast Control Center</h3>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              Issue geofenced hazard notifications synced to all SafeRoute users in real time
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setShowForm(!showForm)}>
            New Broadcast
          </Button>
        </div>
      </div>

      {showForm && <BroadcastForm onClose={() => setShowForm(false)} />}

      {activeBroadcasts.length > 0 && (
        <div className="space-y-3">
          <p className="label-caps px-1">Active</p>
          {activeBroadcasts.map((b) => (
            <BroadcastPreview key={b.id} broadcast={b} />
          ))}
        </div>
      )}

      {pastBroadcasts.length > 0 && (
        <div className="space-y-3">
          <p className="label-caps px-1">Past</p>
          {pastBroadcasts.map((b) => (
            <BroadcastPreview key={b.id} broadcast={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BroadcastForm({ onClose }: { onClose: () => void }) {
  const publishBroadcast = useBroadcastStore((s) => s.publishBroadcast);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(30);
  const [publishing, setPublishing] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim() || publishing) return;

    setPublishing(true);
    await publishBroadcast({
      title,
      message,
      zone: { id: crypto.randomUUID(), polygon: [], label: 'Manual Zone' },
      status: 'active',
      createdAt: Date.now(),
      expiresAt: Date.now() + duration * 60_000,
      durationMinutes: duration,
      affectedRouteCount: 0,
      createdBy: 'Operator',
    });
    setPublishing(false);
    onClose();
  };

  const inputClass =
    'w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-[13px] text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent-red/40 focus:ring-1 focus:ring-accent-red/20 transition-colors';

  return (
    <div className="glass-raised animate-slide-up overflow-hidden">
      <div className="glass-header">
        <h3 className="text-[13px] font-semibold text-text-primary">New Broadcast</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
      <div className="glass-body space-y-4">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hazard alert title"
            className={inputClass}
          />
        </Field>
        <Field label="Message">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Description visible to all affected users"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </Field>
        <Field label="Duration">
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={inputClass}
          >
            {[15, 30, 60, 120, 240].map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </Field>
        <div className="pt-2 flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={publishing}>
            {publishing ? 'Publishing…' : 'Activate Broadcast'}
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
