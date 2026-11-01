/**
 * Dark map styles for react-native-maps MapView.
 * Matches the dashboard's DARK_MAP_STYLES for visual consistency.
 * Uses the same Google Maps JSON styling format.
 */

export const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#000000' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.35)' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1c1c1e' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.50)' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#0f0f0f' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1c1c1e' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.28)' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#141414' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1c1c1e' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#080808' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.15)' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#050505' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#050505' }],
  },
];
