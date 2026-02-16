import type { LatLng } from '../services/directions';

/** Rutgers NB default map center */
export const RUTGERS_CENTER: LatLng = {
  latitude: 40.5008,
  longitude: -74.4474,
};

export type Place = {
  id: string;
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  category: string;
};

/** Categories for the hamburger "Common places" menu */
export const PLACE_CATEGORIES = [
  'Gym & rec',
  'Dining',
  'Libraries',
  'Academic buildings',
  'Residence halls',
] as const;

/** Common places people go – gym, dining, buildings, dorms. Shown in the 3-line menu. */
export const COMMON_PLACES: Place[] = [
  { id: 'gym1', name: 'Werblin Recreation Center', subtitle: '656 Bartholomew Rd · Busch · Gym', latitude: 40.5198, longitude: -74.4639, category: 'Gym & rec' },
  { id: 'gym2', name: 'College Ave Gym', subtitle: 'College Ave campus · Fitness', latitude: 40.4992, longitude: -74.4485, category: 'Gym & rec' },
  { id: 'dine1', name: 'Brower Commons', subtitle: '145 College Ave · Dining hall', latitude: 40.4988, longitude: -74.4478, category: 'Dining' },
  { id: 'dine2', name: 'Neilson Dining Hall', subtitle: '200 University Ave · Dining', latitude: 40.5012, longitude: -74.4492, category: 'Dining' },
  { id: 'dine3', name: 'Livingston Dining Commons', subtitle: '84 Joyce Kilmer Ave · Dining', latitude: 40.5234, longitude: -74.4376, category: 'Dining' },
  { id: 'dine4', name: 'Henry Diner', subtitle: '106 Somerset St · Diner', latitude: 40.4978, longitude: -74.4452, category: 'Dining' },
  { id: 'lib1', name: 'Alexander Library', subtitle: '169 College Ave · Main library', latitude: 40.5003, longitude: -74.447, category: 'Libraries' },
  { id: 'lib2', name: 'Archibald S. Alexander Library', subtitle: '169 College Ave', latitude: 40.5003, longitude: -74.447, category: 'Libraries' },
  { id: 'lib3', name: 'Library of Science and Medicine', subtitle: '165 Bevier Rd · Busch', latitude: 40.5222, longitude: -74.4345, category: 'Libraries' },
  { id: 'acad1', name: 'Rutgers Student Center', subtitle: '126 College Ave · Student hub', latitude: 40.4995, longitude: -74.4482, category: 'Academic buildings' },
  { id: 'acad2', name: 'Scott Hall', subtitle: '43 College Ave · Academic', latitude: 40.4982, longitude: -74.4468, category: 'Academic buildings' },
  { id: 'acad3', name: 'Academic Building', subtitle: '15 Seminary Pl · Lecture hall', latitude: 40.5005, longitude: -74.4488, category: 'Academic buildings' },
  { id: 'acad4', name: 'Lucy Stone Hall', subtitle: '54 Joyce Kilmer Ave · Livingston', latitude: 40.5218, longitude: -74.4382, category: 'Academic buildings' },
  { id: 'res1', name: 'Brett Hall', subtitle: 'College Ave · Residence', latitude: 40.4975, longitude: -74.4472, category: 'Residence halls' },
  { id: 'res2', name: 'Tinsley Hall', subtitle: '45 Bunting Ln · Residence', latitude: 40.5028, longitude: -74.4522, category: 'Residence halls' },
  { id: 'res3', name: 'New Gibbons Hall', subtitle: '45 Bunting Ln · Residence', latitude: 40.5032, longitude: -74.4518, category: 'Residence halls' },
];

/** Legacy flat list for "Where to?" suggestions (subset of common places) */
export const SUGGESTIONS = COMMON_PLACES.filter(
  (p) => ['Rutgers Student Center', 'Alexander Library', 'Werblin Recreation Center'].includes(p.name)
).map((p, i) => ({ ...p, id: String(i + 1) }));

export type Suggestion = (typeof SUGGESTIONS)[number];
