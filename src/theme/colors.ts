export const colors = {
  background: '#000000',
  primaryRed: '#E10600',
  secondaryGreen: '#2ECC71',
  avoidanceOverlay: 'rgba(225, 6, 0, 0.45)',
  cardBackground: 'rgba(15, 15, 15, 0.95)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  tabActive: '#007AFF',
  tabInactive: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  routeYellow: '#FFD60A',
  markerBlue: '#007AFF',
  // Standard traffic colors (Google Maps / Apple Maps protocol)
  // https://support.google.com/maps/answer/3092439 — Green / Orange / Red / darker red
  routePrimary: '#34A853', // Green - free flow (default selected route)
  routeAlternate: '#1A1A1A', // Dim for alternate routes
  routeTrafficFree: '#34A853',   // Green — no traffic delays (Google/Apple)
  routeTrafficModerate: '#FA7B17', // Orange — medium traffic (Google/Apple)
  routeTrafficHeavy: '#EA4335',   // Red — traffic delays (Google red)
  routeTrafficSevere: '#9E1313',  // Dark red — very slow / stop-and-go (Google/Apple)
  // Legacy aliases for compatibility
  routeLight: '#34A853',
  routeModerate: '#FA7B17',
  routeHeavy: '#EA4335',
  userLocationPointer: '#E10600', // Red pointer for user
  directionArrow: '#E10600', // Red arrow for direction
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorKey = keyof typeof colors;
