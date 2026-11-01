import { useState, useRef, useEffect } from 'react';
import { useMapStore, type MarkerDetail } from '../../stores/useMapStore';
import { sendMessageToUser } from '../../lib/routeMessaging';

export function MapDetailPanel() {
  const detail = useMapStore((s) => s.markerDetail);
  const close = useMapStore((s) => s.closeMarkerDetail);

  return (
    <div
      className={`absolute top-0 right-0 h-full z-20 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        detail ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
      style={{ width: 380 }}
    >
      {detail && (
        <div className="h-full bg-surface-raised backdrop-blur-[60px] border-l border-surface-border flex flex-col">
          <Header detail={detail} onClose={close} />
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <DetailBody detail={detail} />
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ detail, onClose }: { detail: MarkerDetail; onClose: () => void }) {
  const { icon, accent, label } = kindMeta(detail.kind);

  return (
    <div className="px-5 pt-5 pb-4 border-b border-surface-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px]"
            style={{ backgroundColor: accent + '18', color: accent }}
          >
            {icon}
          </div>
          <span className="text-[10px] font-semibold tracking-[1.2px] uppercase" style={{ color: accent }}>
            {label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-surface-hover hover:bg-surface-card flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" className="text-text-quaternary" strokeWidth="1.5" strokeLinecap="round">
            <line x1="2" y1="2" x2="10" y2="10" />
            <line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>
      <h2 className="text-[16px] font-semibold text-text-primary leading-tight tracking-[-0.3px]">
        {detailTitle(detail)}
      </h2>
      <p className="text-[11px] text-text-quaternary mt-1.5 font-mono">
        {detail.location.lat.toFixed(5)}, {detail.location.lng.toFixed(5)}
      </p>
    </div>
  );
}

function DetailBody({ detail }: { detail: MarkerDetail }) {
  switch (detail.kind) {
    case 'incident':
      return <IncidentDetail d={detail} />;
    case 'sensor':
      return <SensorDetail d={detail} />;
    case 'broadcast':
      return <BroadcastDetail d={detail} />;
    case 'patrol':
      return <PatrolDetail d={detail} />;
    case 'route':
      return <RouteDetail d={detail} />;
  }
}

/* ── Incident ────────────────────────────────────────────────────────────── */

function IncidentDetail({ d }: { d: Extract<MarkerDetail, { kind: 'incident' }> }) {
  const ago = timeAgo(d.reportedAt);
  const color = severityColor(d.severity);

  return (
    <div className="mt-5 flex flex-col gap-5">
      <div className="flex gap-2">
        <StatusPill label={d.severity} color={color} />
        <StatusPill label={d.status} color={d.status === 'escalated' ? '#FF3B30' : '#888'} />
      </div>

      <Field label="Description">
        <p className="text-[13px] text-text-secondary leading-[1.7]">{d.description}</p>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Reported" value={ago} />
        <MetricCard label="Severity" value={d.severity.charAt(0).toUpperCase() + d.severity.slice(1)} accent={color} />
      </div>

      {d.sensorId && (
        <Field label="Associated Sensor">
          <span className="text-[12px] text-text-tertiary font-mono">{d.sensorId}</span>
        </Field>
      )}

      <ActionRow actions={['Verify', 'Escalate', 'Dismiss']} />
    </div>
  );
}

/* ── Sensor ──────────────────────────────────────────────────────────────── */

function SensorDetail({ d }: { d: Extract<MarkerDetail, { kind: 'sensor' }> }) {
  const healthColor = d.health === 'online' ? '#FF6B35' : d.health === 'degraded' ? '#FFD60A' : '#E10600';

  return (
    <div className="mt-5 flex flex-col gap-5">
      <div className="flex gap-2">
        <StatusPill label={d.type} color="#A78BFA" />
        <StatusPill label={d.health} color={healthColor} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Health" value={d.health.charAt(0).toUpperCase() + d.health.slice(1)} accent={healthColor} />
        {d.battery != null && <MetricCard label="Battery" value={`${d.battery}%`} accent={d.battery > 30 ? '#2ECC71' : '#FF3B30'} />}
      </div>

      <Field label="Firmware">
        <span className="text-[12px] text-text-tertiary font-mono">{d.firmware}</span>
      </Field>

      <Field label="Sensor ID">
        <span className="text-[12px] text-text-tertiary font-mono">{d.id}</span>
      </Field>

      <ActionRow actions={['Acknowledge', 'Dispatch']} />
    </div>
  );
}

/* ── Broadcast ───────────────────────────────────────────────────────────── */

function BroadcastDetail({ d }: { d: Extract<MarkerDetail, { kind: 'broadcast' }> }) {
  const ago = timeAgo(d.createdAt);

  return (
    <div className="mt-5 flex flex-col gap-5">
      <Field label="Message">
        <p className="text-[13px] text-text-secondary leading-[1.7]">{d.message}</p>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Zone" value={d.zoneLabel} />
        <MetricCard label="Created" value={ago} />
        <MetricCard label="Affected Routes" value={String(d.affectedRouteCount)} accent="#FF3B30" />
        <MetricCard label="Created By" value={d.createdBy} />
      </div>

      <ActionRow actions={['Extend', 'Cancel Broadcast']} />
    </div>
  );
}

/* ── Patrol Suggestion ───────────────────────────────────────────────────── */

function PatrolDetail({ d }: { d: Extract<MarkerDetail, { kind: 'patrol' }> }) {
  const color = patrolColor(d.priority);

  return (
    <div className="mt-5 flex flex-col gap-5">
      <StatusPill label={`${d.priority} priority`} color={color} />

      <Field label="Reason">
        <p className="text-[13px] text-text-secondary leading-[1.7]">{d.reason}</p>
      </Field>

      <MetricCard label="Priority" value={d.priority.charAt(0).toUpperCase() + d.priority.slice(1)} accent={color} />

      <ActionRow actions={['Assign Officer', 'Dismiss']} />
    </div>
  );
}

/* ── Active Route ────────────────────────────────────────────────────────── */

type DashboardMessage = {
  id: string;
  sender: 'officer' | 'user';
  senderName: string;
  text: string;
  timestamp: Date;
};

function RouteDetail({ d }: { d: Extract<MarkerDetail, { kind: 'route' }> }) {
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');

    const msg: DashboardMessage = {
      id: `ofc-${Date.now()}`,
      sender: 'officer',
      senderName: 'RUPD Dispatch',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);

    await sendMessageToUser(d.id, d.userId, text, 'RUPD Dispatch');
  };

  if (showChat) {
    return (
      <div className="mt-3 flex flex-col h-full" style={{ minHeight: 380 }}>
        <button
          onClick={() => setShowChat(false)}
          className="text-[11px] text-text-quaternary hover:text-text-secondary transition-colors mb-3 text-left cursor-pointer"
        >
          ← Back to route info
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#007AFF]/20 flex items-center justify-center text-[11px]" style={{ color: '#007AFF' }}>
            💬
          </div>
          <div>
            <p className="text-[12px] font-semibold text-text-primary/80">Message {d.userId}</p>
            <p className="text-[10px] text-text-quaternary">Route: {d.label}</p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1"
          style={{ maxHeight: 240 }}
        >
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[11px] text-text-quaternary">No messages yet</p>
              <p className="text-[10px] text-text-quaternary mt-1">Send a safety alert to the user</p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'officer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                  m.sender === 'officer'
                    ? 'bg-[#007AFF] rounded-br-sm text-white'
                    : 'bg-surface-card rounded-bl-sm text-text-primary'
                }`}
              >
                <p className="text-[12px] leading-[1.6]">{m.text}</p>
                <p className={`text-[9px] mt-0.5 ${m.sender === 'officer' ? 'text-white/40 text-right' : 'text-text-quaternary'}`}>
                  {m.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick messages */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {['Stay on route', 'Officer nearby', 'Avoid area ahead', 'Check in'].map((q) => (
            <button
              key={q}
              onClick={() => setDraft(q)}
              className="px-2.5 py-1 rounded-md bg-surface-card border border-surface-card-border text-[10px] text-text-quaternary hover:bg-surface-hover hover:text-text-tertiary transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 items-end">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message…"
            className="flex-1 bg-surface-card border border-surface-card-border rounded-xl px-3 py-2 text-[12px] text-text-primary placeholder:text-text-quaternary outline-none focus:border-[#007AFF]/40 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              draft.trim() ? 'bg-[#007AFF] hover:bg-[#0066DD]' : 'bg-surface-card'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={draft.trim() ? 'text-white' : 'text-text-quaternary'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-5">
      <Field label="Route">
        <p className="text-[13px] text-text-secondary leading-[1.7]">{d.label}</p>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Status" value="Navigating" accent="#00D4FF" />
        <MetricCard label="User" value={d.userId} />
      </div>

      <div className="p-3.5 rounded-lg bg-[#00D4FF]/[0.06] border border-[#00D4FF]/[0.12]">
        <p className="text-[11px] text-[#00D4FF]/70 leading-relaxed">
          User is currently navigating this route in real time. Location updates every few seconds.
        </p>
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={() => setShowChat(true)}
          className="flex-1 py-2 rounded-lg text-[11px] font-semibold tracking-wide bg-[#007AFF] text-white hover:bg-[#0066DD] transition-colors cursor-pointer"
        >
          Message User
        </button>
        <button className="flex-1 py-2 rounded-lg text-[11px] font-semibold tracking-wide bg-surface-card text-text-tertiary border border-surface-card-border hover:bg-surface-hover hover:text-text-secondary transition-colors cursor-pointer">
          Flag Route
        </button>
      </div>
    </div>
  );
}

/* ── Shared Primitives ───────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-semibold tracking-[1px] uppercase text-text-quaternary block mb-1.5">{label}</span>
      {children}
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-3 rounded-lg bg-surface-card border border-surface-card-border">
      <span className="text-[10px] text-text-quaternary block mb-1 tracking-wide uppercase">{label}</span>
      <span className="text-[14px] font-semibold tracking-[-0.2px] text-text-primary" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide uppercase"
      style={{ backgroundColor: color + '15', color }}
    >
      {label}
    </span>
  );
}

function ActionRow({ actions }: { actions: string[] }) {
  return (
    <div className="flex gap-2 mt-1">
      {actions.map((a, i) => (
        <button
          key={a}
          className={`flex-1 py-2 rounded-lg text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
            i === 0
              ? 'bg-[#E10600] text-white hover:bg-[#c50500]'
              : 'bg-surface-card text-text-tertiary border border-surface-card-border hover:bg-surface-hover hover:text-text-secondary'
          }`}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function kindMeta(kind: MarkerDetail['kind']) {
  const map: Record<MarkerDetail['kind'], { icon: string; accent: string; label: string }> = {
    incident: { icon: '!', accent: '#FF6B35', label: 'Incident Report' },
    sensor: { icon: '◈', accent: '#A78BFA', label: 'Sensor Anomaly' },
    broadcast: { icon: '⚠', accent: '#FF3B30', label: 'Hazard Broadcast' },
    patrol: { icon: '◆', accent: '#60A5FA', label: 'Patrol Suggestion' },
    route: { icon: '→', accent: '#00D4FF', label: 'Active User Route' },
  };
  return map[kind];
}

function detailTitle(d: MarkerDetail): string {
  switch (d.kind) {
    case 'incident': return d.title;
    case 'sensor': return d.label;
    case 'broadcast': return d.title;
    case 'patrol': return d.label;
    case 'route': return d.label;
  }
}

function severityColor(severity: string): string {
  const map: Record<string, string> = { low: '#2ECC71', medium: '#FFD60A', high: '#FF6B35', critical: '#E10600' };
  return map[severity] ?? '#888';
}

function patrolColor(priority: string): string {
  const map: Record<string, string> = { critical: '#E10600', high: '#A78BFA', medium: '#60A5FA', low: '#6EE7B7' };
  return map[priority] ?? '#A78BFA';
}

function timeAgo(epoch: number): string {
  const mins = Math.round((Date.now() - epoch) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
