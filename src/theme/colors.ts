export const colors = {
  background: '#000000',
  primaryRed: '#E10600',
  secondaryGreen: '#2ECC71',
  avoidanceOverlay: 'rgba(225, 6, 0, 0.45)',

  // Surface hierarchy (dark → light)
  surface1: 'rgba(12, 12, 12, 0.95)',
  surface2: 'rgba(18, 18, 18, 0.95)',
  surface3: 'rgba(28, 28, 28, 0.95)',
  cardBackground: 'rgba(15, 15, 15, 0.95)',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textTertiary: 'rgba(255, 255, 255, 0.38)',

  tabActive: '#FFFFFF',
  tabInactive: 'rgba(255, 255, 255, 0.35)',

  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.10)',

  routeYellow: '#FFD60A',
  markerBlue: '#007AFF',

  routePrimary: '#34A853',
  routeAlternate: '#1A1A1A',
  routeTrafficFree: '#34A853',
  routeTrafficModerate: '#FA7B17',
  routeTrafficHeavy: '#EA4335',
  routeTrafficSevere: '#9E1313',
  routeLight: '#34A853',
  routeModerate: '#FA7B17',
  routeHeavy: '#EA4335',

  userLocationPointer: '#E10600',
  directionArrow: '#E10600',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorKey = keyof typeof colors;
