/**
 * Shared demo data — same incidents, officer reports, and community posts
 * as the admin dashboard's demoData.json. Remove once live database is connected.
 */

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60_000);
}

// ── Official police reports (visible to community users) ─────────────────

export type OfficerAlert = {
  id: string;
  crimeType: string;
  title: string;
  description: string;
  location: { latitude: number; longitude: number };
  locationName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  officerName: string;
  timestamp: Date;
};

export const OFFICER_REPORTS: OfficerAlert[] = [
  {
    id: 'rpt-001',
    crimeType: 'Assault',
    title: 'Assault — College Ave & George St',
    description: 'Victim reported being pushed and struck near the College Ave & George St intersection. Suspect fled eastbound on George St. EMS dispatched. Area is being canvassed.',
    location: { latitude: 40.4990, longitude: -74.4482 },
    locationName: 'College Ave & George St',
    priority: 'high',
    status: 'active',
    officerName: 'Ofc. Ramirez',
    timestamp: minutesAgo(12),
  },
  {
    id: 'rpt-002',
    crimeType: 'Vehicle Break-in',
    title: 'Vehicle Break-in — Busch Lot 26',
    description: 'Broken passenger window on silver Honda Civic. Items stolen from glovebox. Forensics dusted for prints. Lot 26 camera footage requested from Facilities.',
    location: { latitude: 40.5228, longitude: -74.4585 },
    locationName: 'Busch Campus Lot 26',
    priority: 'medium',
    status: 'under_investigation',
    officerName: 'Det. Kowalski',
    timestamp: minutesAgo(45),
  },
  {
    id: 'rpt-003',
    crimeType: 'Drug Activity',
    title: 'Drug Activity — Cook/Douglass Lot 102',
    description: 'Anonymous tip about possible drug transaction in northeast corner of Lot 102. Patrol dispatched. Nothing found on arrival; area flagged for increased nightly presence.',
    location: { latitude: 40.4835, longitude: -74.4340 },
    locationName: 'Cook/Douglass Lot 102',
    priority: 'medium',
    status: 'resolved',
    officerName: 'Ofc. Chen',
    timestamp: minutesAgo(90),
  },
  {
    id: 'rpt-004',
    crimeType: 'Suspicious Activity',
    title: 'Suspicious Individual — Seminary Pl',
    description: 'White male, mid-30s, dark hoodie, checking vehicle door handles on Seminary Pl near academic buildings. Unit 14 responding.',
    location: { latitude: 40.5015, longitude: -74.4492 },
    locationName: 'Seminary Pl',
    priority: 'medium',
    status: 'active',
    officerName: 'Sgt. Vasquez',
    timestamp: minutesAgo(6),
  },
  {
    id: 'rpt-005',
    crimeType: 'Theft',
    title: 'Laptop Theft — Alexander Library',
    description: 'Student reports unattended laptop stolen from 2nd floor study area. Last seen around 21:45. Investigating security footage.',
    location: { latitude: 40.5048, longitude: -74.4522 },
    locationName: 'Alexander Library',
    priority: 'low',
    status: 'under_investigation',
    officerName: 'Ofc. Nguyen',
    timestamp: minutesAgo(120),
  },
  {
    id: 'rpt-006',
    crimeType: 'Public Disturbance',
    title: 'Noise Complaint — Easton Ave',
    description: 'Multiple noise complaints from residents. Loud gathering at outdoor area near Easton & Somerset. Officers responded and dispersed group without incident.',
    location: { latitude: 40.5022, longitude: -74.4470 },
    locationName: 'Easton Ave & Somerset St',
    priority: 'low',
    status: 'resolved',
    officerName: 'Ofc. Park',
    timestamp: minutesAgo(35),
  },
  {
    id: 'rpt-007',
    crimeType: 'Harassment',
    title: 'Verbal Harassment — Livingston Plaza',
    description: 'Student reports being followed and verbally harassed by unknown individual near Livingston dining hall. Suspect left before officers arrived. Description logged.',
    location: { latitude: 40.5225, longitude: -74.4378 },
    locationName: 'Livingston Student Center',
    priority: 'medium',
    status: 'active',
    officerName: 'Ofc. Ramirez',
    timestamp: minutesAgo(20),
  },
];

// ── Demo community posts (same as dashboard) ─────────────────────────────

export type DemoCommunityPost = {
  id: string;
  content: string;
  type: 'positive' | 'negative';
  timestamp: Date;
  verified: boolean;
  location?: { latitude: number; longitude: number };
  authorId: string;
};

export const DEMO_COMMUNITY_POSTS: DemoCommunityPost[] = [
  {
    id: 'cp-001',
    content: 'Heads up — the George St underpass near the train station is really dark right now. At least two overhead lights are out. Walked through at 11pm and it was uncomfortable. Stick to College Ave instead.',
    type: 'negative',
    timestamp: minutesAgo(5),
    verified: true,
    location: { latitude: 40.4975, longitude: -74.4458 },
    authorId: 'user-3387',
  },
  {
    id: 'cp-002',
    content: 'Loud argument outside Brower Commons around midnight. Two people yelling at each other, one threw a bottle. Cleared out when someone called campus police. Stay alert if walking by.',
    type: 'negative',
    timestamp: minutesAgo(18),
    verified: false,
    location: { latitude: 40.5035, longitude: -74.4516 },
    authorId: 'user-1120',
  },
  {
    id: 'cp-003',
    content: 'Just a positive note — walked from Livingston Student Center to the bus stop at 1am and the whole path was well-lit and the blue-light phone stations are working. Felt completely safe.',
    type: 'positive',
    timestamp: minutesAgo(25),
    verified: false,
    location: { latitude: 40.5230, longitude: -74.4375 },
    authorId: 'user-4498',
  },
  {
    id: 'cp-004',
    content: 'Someone tried to open my car door in Lot 26 on Busch while I was sitting inside. Drove off before I could get a plate. Be careful parking here at night — badly lit.',
    type: 'negative',
    timestamp: minutesAgo(40),
    verified: true,
    location: { latitude: 40.5230, longitude: -74.4585 },
    authorId: 'user-7091',
  },
  {
    id: 'cp-005',
    content: 'Werblin parking lot feels very isolated after 10pm. Barely any foot traffic and the lighting on the south end is basically non-existent. Would avoid solo.',
    type: 'negative',
    timestamp: minutesAgo(60),
    verified: false,
    location: { latitude: 40.5196, longitude: -74.4612 },
    authorId: 'user-2250',
  },
  {
    id: 'cp-006',
    content: 'Guy on a bike keeps circling the Easton Ave area near the apartments. Not doing anything specific but it is giving a lot of people anxiety. Been going on for about 30 minutes.',
    type: 'negative',
    timestamp: minutesAgo(10),
    verified: false,
    location: { latitude: 40.5020, longitude: -74.4468 },
    authorId: 'user-6612',
  },
  {
    id: 'cp-007',
    content: 'Construction fence behind the Engineering building on Busch is knocked over. Could easily trip over it at night — it\'s right across the walkway.',
    type: 'negative',
    timestamp: minutesAgo(450),
    verified: true,
    location: { latitude: 40.5218, longitude: -74.4615 },
    authorId: 'user-4401',
  },
  {
    id: 'cp-008',
    content: 'Shoutout to the SafeRoute team — used the app to walk home from Alexander Library at midnight and it routed me away from that dark stretch on College Ave. Felt much safer taking Seminary instead.',
    type: 'positive',
    timestamp: minutesAgo(55),
    verified: false,
    location: { latitude: 40.5048, longitude: -74.4522 },
    authorId: 'user-9027',
  },
];

// ── Safety overlay data (user-safe, no sensor internals) ─────────────────

export type LightingArea = {
  id: string;
  location: { latitude: number; longitude: number };
  label: string;
  condition: 'well_lit' | 'dim' | 'dark';
};

export const LIGHTING_CONDITIONS: LightingArea[] = [
  { id: 'light-1', location: { latitude: 40.5032, longitude: -74.4518 }, label: 'College Ave Pole 7', condition: 'dark' },
  { id: 'light-2', location: { latitude: 40.5035, longitude: -74.4516 }, label: 'College Ave Pole 8', condition: 'dark' },
  { id: 'light-3', location: { latitude: 40.5038, longitude: -74.4514 }, label: 'College Ave Pole 9', condition: 'dark' },
  { id: 'light-4', location: { latitude: 40.4975, longitude: -74.4455 }, label: 'George St Underpass', condition: 'dim' },
  { id: 'light-5', location: { latitude: 40.5018, longitude: -74.4495 }, label: 'Seminary Pl Lamppost', condition: 'well_lit' },
  { id: 'light-6', location: { latitude: 40.5230, longitude: -74.4380 }, label: 'Livingston Plaza', condition: 'well_lit' },
  { id: 'light-7', location: { latitude: 40.5192, longitude: -74.4615 }, label: 'Werblin Parking', condition: 'dim' },
];

export type AcousticAnomaly = {
  id: string;
  location: { latitude: number; longitude: number };
  label: string;
  description: string;
};

export const ACOUSTIC_ANOMALIES: AcousticAnomaly[] = [
  {
    id: 'acoustic-1',
    location: { latitude: 40.5022, longitude: -74.4470 },
    label: 'Easton Ave — Noise spike',
    description: 'Elevated noise levels detected. Multiple complaints in this area.',
  },
  {
    id: 'acoustic-2',
    location: { latitude: 40.5020, longitude: -74.4466 },
    label: 'Easton Ave — Noise spike',
    description: 'Elevated noise levels detected near residential area.',
  },
];

// ── Active hazard zones (from broadcasts, user-safe) ─────────────────────

export type HazardZone = {
  id: string;
  title: string;
  message: string;
  polygon: { latitude: number; longitude: number }[];
  label: string;
};

export const ACTIVE_HAZARD_ZONES: HazardZone[] = [
  {
    id: 'zone-george-st',
    title: 'Active Incident — George St Underpass',
    message: 'RUPD is responding to a reported altercation near the George St underpass. Avoid the area. Use Hamilton St or Easton Ave as alternates.',
    polygon: [
      { latitude: 40.4968, longitude: -74.4440 },
      { latitude: 40.4968, longitude: -74.4470 },
      { latitude: 40.4985, longitude: -74.4470 },
      { latitude: 40.4985, longitude: -74.4440 },
    ],
    label: 'George St Underpass Zone',
  },
  {
    id: 'zone-college-south',
    title: 'Lighting Outage — College Ave South',
    message: 'Street lighting is down on College Ave between Brower Commons and the Student Center. Use caution or take alternate well-lit routes.',
    polygon: [
      { latitude: 40.5025, longitude: -74.4530 },
      { latitude: 40.5025, longitude: -74.4505 },
      { latitude: 40.5045, longitude: -74.4505 },
      { latitude: 40.5045, longitude: -74.4530 },
    ],
    label: 'College Ave South Corridor',
  },
];
