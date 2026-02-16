# Google Maps API Key Troubleshooting Guide

## Current Setup

The app uses Google Directions API for routing. The API key can be configured in two ways:

### Option 1: Environment Variable (Recommended)
1. Create a `.env` file in the project root
2. Add: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here`
3. Restart Expo dev server: `npx expo start --clear`

### Option 2: Hardcoded (Fallback)
The key is hardcoded in `src/config.ts` as a fallback.

---

## Common API Key Issues

### Issue: "REQUEST_DENIED" Error

**Causes:**
- API key restrictions are too strict
- Directions API is not enabled
- API key doesn't have correct permissions

**Solutions:**
1. **Check API Restrictions:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Click on your API key
   - Under "API restrictions", ensure "Directions API" is allowed
   - Or temporarily set to "Don't restrict key" for testing

2. **Enable Directions API:**
   - Go to [APIs & Services Library](https://console.cloud.google.com/apis/library)
   - Search for "Directions API"
   - Click "Enable"

3. **Check Billing:**
   - Google Maps APIs require billing (even with free tier)
   - Go to [Billing](https://console.cloud.google.com/billing)
   - Ensure billing account is linked

### Issue: "INVALID_REQUEST" Error

**Causes:**
- Malformed request URL
- Invalid coordinates
- Missing required parameters

**Solutions:**
- Check console logs for the raw response
- Verify coordinates are valid (latitude: -90 to 90, longitude: -180 to 180)
- Ensure origin and destination are different

### Issue: "OVER_QUERY_LIMIT" Error

**Causes:**
- API quota exceeded
- Too many requests

**Solutions:**
- Check usage in [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
- Wait for quota reset or increase quota limits
- Consider implementing request caching

---

## Debugging Steps

### 1. Check Raw API Response

The app now logs the raw response. Check your console/terminal for:
```
[Directions API] Raw response: {...}
[Directions API] Parsed response status: OK
```

### 2. Verify API Key

Check if the key is being loaded:
```typescript
import { GOOGLE_MAPS_API_KEY } from './config';
console.log('API Key loaded:', GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');
console.log('API Key (first 10 chars):', GOOGLE_MAPS_API_KEY?.substring(0, 10));
```

### 3. Test API Key Directly

Test the API key in a browser:
```
https://maps.googleapis.com/maps/api/directions/json?origin=40.5008,-74.4474&destination=40.7580,-73.9855&mode=walking&key=YOUR_API_KEY
```

Replace `YOUR_API_KEY` with your actual key. You should see a JSON response.

---

## Using a Backend Proxy (Recommended for Production)

For production apps, **never expose your API key in client-side code**. Instead:

### Option A: Expo API Routes (Serverless Functions)

Create `api/directions.ts`:
```typescript
import { GOOGLE_MAPS_API_KEY } from '../src/config';

export default async function handler(req: any, res: any) {
  const { origin, destination, mode } = req.query;
  
  const url = `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${origin}&destination=${destination}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  res.json(data);
}
```

Then call from the app:
```typescript
const response = await fetch(`/api/directions?origin=${lat1},${lng1}&destination=${lat2},${lng2}&mode=walking`);
```

### Option B: Separate Backend Server

Use a Node.js/Express server or serverless function (Vercel, Netlify, AWS Lambda) to proxy requests.

---

## Current Implementation

The app currently calls the Directions API **directly from the client**. This works but exposes your API key.

**For development:** This is acceptable if you use API key restrictions.

**For production:** Implement a backend proxy to protect your API key.

---

## Environment Variables Setup

1. Create `.env` file:
```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCfEEK6Zsm9_sc0YHeU4NSj0lMIHpHn-WI
```

2. Add to `.gitignore`:
```
.env
.env.local
```

3. Restart Expo:
```bash
npx expo start --clear
```

4. Verify it's loaded:
```typescript
console.log('API Key from env:', process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
```

---

## Next Steps

If the API key is still failing after checking the above:

1. **Check console logs** for the raw response
2. **Verify API key restrictions** in Google Cloud Console
3. **Test the key directly** in a browser
4. **Consider implementing a backend proxy** for production
