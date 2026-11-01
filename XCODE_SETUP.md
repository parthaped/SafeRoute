# Running SafeRoute in Xcode (Standalone iOS App)

SafeRoute is an Expo (React Native) app. You can open it in **Xcode**, build it, and run it on a simulator or device **without needing to start Metro or any server on your computer**—as long as you use a **Release** build or an archived app. This guide walks you through it step by step.

---

## What you need

- **Mac** with Xcode installed (from the App Store or developer.apple.com)
- **Node.js** (v18 or v20 recommended) and **npm**
- **CocoaPods** — see [Installing CocoaPods](#installing-cocoapods) below if you don’t have it
- **.env** file with at least `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (copy from `.env.example`; see [README_ENV_SETUP.md](./README_ENV_SETUP.md))

---

## Installing CocoaPods

Expo prebuild and the iOS project need CocoaPods. If you see **“Failed to install CocoaPods CLI”** or **“spawn brew ENOENT”**, use one of these:

### Option A: Homebrew (recommended)

1. **Install Homebrew** if you don’t have it (check with `which brew`):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   After install, follow the “Next steps” it prints (add Homebrew to your PATH).

2. **Install CocoaPods**:
   ```bash
   brew install cocoapods
   ```

### Option B: RubyGems (system Ruby)

```bash
sudo gem install cocoapods
```

If that fails (e.g. permission or Ruby version), try installing for your user only:

```bash
gem install cocoapods --user-install
```

Then ensure the gem bin directory is on your PATH. Ruby 3.x often puts it in `~/.gem/ruby/3.x.0/bin` — add that to your shell config (e.g. `~/.zshrc`):

```bash
export PATH="$HOME/.gem/ruby/$(ruby -e 'puts RUBY_VERSION')/bin:$PATH"
```

### Verify

```bash
pod --version
```

---

## Step 1: Install dependencies

In Terminal, from the **SafeRoute project root** (the folder that contains `package.json` and `app.json`):

```bash
cd /Users/parthapediredla/SafeRoute/SafeRoute
npm install
```

---

## Step 2: Create your `.env` file (if you haven’t already)

```bash
cp .env.example .env
```

Then edit `.env` and set your real Google Maps API key:

- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_key`

This key is used both for **directions** (in the app) and for **native map tiles** when we generate the iOS project. Optional: add Firebase and FBI CDE keys if you use those features.

---

## Step 3: Generate the native iOS project

Expo can generate the Xcode project and native code from your JS/TS app. Run:

```bash
npx expo prebuild --platform ios
```

- This creates an **`ios`** folder with an Xcode workspace and project.
- Your `.env` is read at this step; the Google Maps API key is written into the native iOS config (via `app.config.js`).
- If you change the Maps key later, run `npx expo prebuild --platform ios` again (or use `--clean` to regenerate from scratch).

---

## Step 4: Install iOS native dependencies (CocoaPods)

```bash
cd ios
pod install
cd ..
```

---

## Step 5: Open the project in Xcode

1. Open the **workspace** (not the `.xcodeproj`). The workspace name matches the app slug, e.g. **`saferoute.xcworkspace`**:

   ```bash
   open ios/saferoute.xcworkspace
   ```

   If that file doesn’t exist, list the folder (`ls ios`) and open the `.xcworkspace` file you see. In Finder you can go to the `ios` folder and double‑click that workspace.

2. In Xcode:
   - Select the **saferoute** (or SafeRoute) scheme in the scheme dropdown.
   - Choose a **simulator** (e.g. iPhone 16) or a **connected device** as the run destination.

---

## Step 6: Run the app (no server required)

You have two ways to run:

### Option A: Run as Release (standalone, no Metro)

So the app runs **without** needing `expo start` or a computer:

1. In Xcode menu: **Product → Scheme → Edit Scheme…**
2. Select **Run** on the left.
3. Set **Build Configuration** to **Release**.
4. Close the scheme editor.
5. Press **Run** (▶) or **Cmd + R**.

The first build may take a few minutes. The app will launch with the JavaScript bundle **embedded** in the app—no Metro or server needed.

### Option B: Run as Debug (with Metro, for development)

If you want fast refresh and debugging:

1. In a terminal, from the project root, start Metro:

   ```bash
   npx expo start
   ```

2. In Xcode, keep the run scheme as **Debug** and press **Run**.

The app will load the bundle from Metro. You need the terminal running while you use the app.

---

## Step 7: Build a standalone IPA (optional)

To get an installable app (e.g. for TestFlight or ad‑hoc distribution):

1. In Xcode: **Product → Archive**.
2. When the archive is done, the **Organizer** window opens. Select the archive and choose **Distribute App**.
3. Follow the wizard (e.g. **App Store Connect** or **Ad Hoc**). The resulting app runs on device **without** a computer or Metro.

---

## Summary

| Goal                         | What to do                                                                 |
|-----------------------------|----------------------------------------------------------------------------|
| Open in Xcode               | Run `npx expo prebuild --platform ios`, then `open ios/saferoute.xcworkspace` |
| Run without any server      | Use **Release** scheme in Xcode (Step 6, Option A)                         |
| Run with live reload        | Use **Debug** scheme and run `npx expo start` in a terminal                |
| Install on device / TestFlight | **Product → Archive**, then **Distribute App**                            |

---

## Troubleshooting

- **“No bundle URL present”**  
  You’re in Debug and Metro isn’t running. Either start Metro (`npx expo start`) or switch the Run scheme to **Release** (Step 6, Option A).

- **Maps are blank or directions don’t work**  
  Ensure `.env` has `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and that you’ve enabled the **Maps SDK for iOS** and **Directions API** in Google Cloud Console. Then run `npx expo prebuild --platform ios --clean` and `pod install` again in `ios/`.

- **“Failed to install CocoaPods CLI” or “spawn brew ENOENT”**  
  Install CocoaPods yourself: see [Installing CocoaPods](#installing-cocoapods) above. Use **Option A (Homebrew)** if you don’t have Homebrew yet.

- **“Unexpected XCode version string ''”** (during `pod install`)  
  CocoaPods can’t see your Xcode version. Point the active developer dir to the full Xcode app (not only Command Line Tools):
  ```bash
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  ```
  If Xcode is in a different location, use that path. Then run `pod install` again in `ios/`.

- **Prebuild fails or CocoaPods errors**  
  Update Xcode and command line tools, then run:

  ```bash
  cd ios
  pod install --repo-update
  cd ..
  ```

- **You change app.json / app.config.js or add a new Expo native module**  
  Regenerate the iOS project:

  ```bash
  npx expo prebuild --platform ios --clean
  cd ios && pod install && cd ..
  ```

You do **not** need to switch to Swift: the app stays in React Native/TypeScript; Xcode is used to build and run the native iOS app.
