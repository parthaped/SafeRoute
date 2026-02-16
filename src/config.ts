/**
 * API keys from environment only — never hardcode. .env is gitignored.
 * - Directions API (JS fetch): uses EXPO_PUBLIC_GOOGLE_MAPS_API_KEY from .env
 * - Native map tiles (react-native-maps): use key in app.json (custom dev build only; Expo Go ignores it)
 */
function getEnv(key: string): string {
  const value = process.env[key] ?? '';
  return typeof value === 'string' ? value.trim() : '';
}

/** Google Maps API key for Directions API (fetch). Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env. */
export const GOOGLE_MAPS_API_KEY = getEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');

if (typeof __DEV__ !== 'undefined' && __DEV__ && !GOOGLE_MAPS_API_KEY) {
  console.warn(
    '[SafeRoute] Google Maps API key not set. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to .env for directions. Native map tiles use the key in app.json (custom dev build only).'
  );
}

/**
 * Firebase config for Community (shared posts). Set in .env (EXPO_PUBLIC_FIREBASE_*).
 * Never commit real keys; .env is gitignored. Leave unset to show "Configure Firebase" state.
 */
export const FIREBASE_CONFIG = {
  apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
} as const;

export const isFirebaseConfigured = (): boolean =>
  !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

/**
 * FBI Crime Data Explorer (CDE) API key for UCR/NIBRS data.
 * Set EXPO_PUBLIC_FBI_CDE_API_KEY in .env for the app; or FBI_CDE_API_KEY for scripts.
 * Get a key at https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi
 */
export const FBI_CDE_API_KEY =
  getEnv('EXPO_PUBLIC_FBI_CDE_API_KEY') || getEnv('FBI_CDE_API_KEY');
