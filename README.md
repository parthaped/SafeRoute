# SafeRoute

UI-only React Native (Expo) app that visually replicates the SafeRoute iOS safety app.

## Run

```bash
npm install
npx expo start
```

Then press `i` for iOS simulator or scan the QR code with Expo Go.

## Structure

```
/src
  /screens      — HomeScreen, MapScreen, ProfileScreen
  /components   — Card, Button, IconButton, SafeRouteLogo, icons
  /navigation   — AppNavigator, TabNavigator (Native Stack + Bottom Tabs)
  /theme        — colors, spacing, typography
  /assets       — placeholder for images
```

## Tech Stack

- Expo, React Native, TypeScript
- @react-navigation/native, bottom-tabs, native-stack
- expo-blur, expo-linear-gradient
- react-native-safe-area-context, react-native-svg

## Design

- Dark mode only (#0B0B0F)
- Primary red #E10600, secondary green #2ECC71
- iOS-style spacing, 14–18px radius, SF-style type scale

No backend, no maps API, no auth — UI only.
