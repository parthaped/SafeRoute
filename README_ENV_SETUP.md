# Environment Variables Setup

## Google Maps API Key

### Quick Setup

1. **Create `.env` file** in the project root:
```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

2. **Restart Expo dev server**:
```bash
npx expo start --clear
```

### How It Works

- The app checks `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` first
- Falls back to hardcoded key in `src/config.ts` if env var is not set
- The `.env` file is gitignored (won't be committed)

### Note on app.json

The `app.json` file still needs the API key hardcoded for `react-native-maps` to display Google Maps tiles. This is a limitation of react-native-maps configuration.

For the Directions API calls, the environment variable will be used.

---

## Debugging

Check your console/terminal for these logs when testing directions:
- `[Directions API] Request URL:` - Shows the request (key hidden)
- `[Directions API] Raw response:` - Shows the full API response
- `[Directions API] Parsed response status:` - Shows the status (OK, REQUEST_DENIED, etc.)

If you see errors, check `docs/API_KEY_TROUBLESHOOTING.md` for solutions.
