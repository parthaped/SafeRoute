# Google Maps API Setup Guide

## Two places for your API key (after rotating)

1. **Directions API (JS)** — `.env` in project root  
   - Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_new_key`  
   - Restart Expo after changing: `npx expo start --clear`  
   - Used for route fetching; works in **Expo Go**.

2. **Native map tiles (react-native-maps)** — `app.json`  
   - Replace `YOUR_GOOGLE_MAPS_API_KEY` in `app.json` (under `ios.config.googleMapsApiKey` and `android.config.googleMaps.apiKey`) with your new key.  
   - Used only in a **custom dev build** (`npx expo prebuild` then `npx expo run:ios` / `npx expo run:android`).  
   - **Expo Go does not use your key** for map rendering; it uses Expo’s credentials. So “API is not enabled” for the map in Expo Go is an Expo limitation, not your config.

## Where the key is used in code
- **Directions (fetch):** `src/config.ts` reads `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` from `.env`. No hardcoded fallback.
- **Map display:** Key in `app.json` is baked into the native app at build time. Put your key there only when using a custom dev build.

## Required APIs

To use SafeRoute's navigation features, you need to enable the following APIs in Google Cloud Console:

### 1. Directions API (Required)
- **Purpose**: Provides turn-by-turn directions and route calculation
- **Status**: ⚠️ **MUST BE ENABLED** for navigation to work

### 2. Maps SDK for Android (Required for Android)
- **Purpose**: Displays Google Maps tiles on Android devices

### 3. Maps SDK for iOS (Required for iOS)
- **Purpose**: Displays Google Maps tiles on iOS devices

## How to Enable APIs

### Step 1: Open Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)

### Step 2: Navigate to APIs & Services
1. Click the hamburger menu (☰) in the top left
2. Navigate to **APIs & Services** → **Library**

### Step 3: Enable Directions API
1. Search for **"Directions API"**
2. Click on **"Directions API"** from the results
3. Click the **"ENABLE"** button
4. Wait for the API to be enabled (usually takes a few seconds)

### Step 4: Enable Maps SDKs (if needed)
1. Search for **"Maps SDK for Android"** and enable it
2. Search for **"Maps SDK for iOS"** and enable it

### Step 5: Verify API Key Permissions
1. Go to **APIs & Services** → **Credentials**
2. Find your API key (the same key you set in `.env` as `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`)
3. Click on the key to edit it
4. Under **"API restrictions"**, ensure:
   - Either **"Don't restrict key"** is selected (for development)
   - OR **"Restrict key"** includes at least:
     - Directions API
     - Maps SDK for Android
     - Maps SDK for iOS

### Step 6: Check Billing
- Google Maps APIs require a billing account (even with free tier)
- Go to **Billing** → **Link a billing account**
- The free tier includes $200/month credit, which covers most development usage

## Testing

After enabling the APIs:
1. Restart your Expo development server
2. Try searching for a destination in the map screen
3. Select a location and request directions
4. If you see an error, check the console logs for the specific API error message

## Common Errors

### "Google Maps API key not set"
- **Cause**: `.env` is missing or doesn’t define `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, or Expo wasn’t restarted after adding it.
- **Fix**: Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_key` to `.env` in the project root, then run `npx expo start --clear`.

### "REQUEST_DENIED" / "Directions API denied"
- **Cause**: Directions API not enabled, or key restrictions block the request (e.g. HTTP referrers only).
- **Fix**: Enable [Directions API](https://console.cloud.google.com/apis/library/directions-backend.googleapis.com). In Credentials → your key, ensure the key is either unrestricted or explicitly allows Directions API and is not restricted to HTTP referrers only (mobile has no referrer).

### "INVALID_REQUEST"
- **Cause**: Missing or malformed API parameters
- **Fix**: Check that origin and destination coordinates are valid

### "OVER_QUERY_LIMIT"
- **Cause**: API quota exceeded or billing not enabled
- **Fix**: Enable billing for the project (free tier still requires a billing account). Check usage in Cloud Console → APIs & Services → Dashboard

### "API key not valid"
- **Cause**: API key is incorrect or restricted
- **Fix**: Verify the key in `src/config.ts` matches your Cloud Console key

## API Key Security

### For Development
- You can use an unrestricted key (not recommended for production)
- Keep your key in `src/config.ts` (already in `.gitignore`)

### For Production
1. Restrict your API key by:
   - **Application restrictions**: Restrict to your app's bundle ID/package name
   - **API restrictions**: Only allow Directions API and Maps SDKs
2. Consider using environment variables instead of hardcoding
3. Never commit your API key to public repositories

## Additional Resources

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Directions API Guide](https://developers.google.com/maps/documentation/directions)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
