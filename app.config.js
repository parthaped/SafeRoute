/**
 * Expo config used by prebuild and EAS. Reads API keys from .env so the native
 * iOS/Android projects get the same key as the JS bundle (directions, map tiles).
 * Run from project root; .env is loaded automatically by Expo.
 */
const appJson = require('./app.json');
const googleMapsKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  appJson.expo?.ios?.config?.googleMapsApiKey ||
  '';

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      config: {
        ...appJson.expo.ios?.config,
        googleMapsApiKey: googleMapsKey || 'YOUR_GOOGLE_MAPS_API_KEY',
      },
    },
    android: {
      ...appJson.expo.android,
      config: {
        ...appJson.expo.android?.config,
        googleMaps: {
          apiKey: googleMapsKey || appJson.expo.android?.config?.googleMaps?.apiKey || 'YOUR_GOOGLE_MAPS_API_KEY',
        },
      },
    },
  },
};
