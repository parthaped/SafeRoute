# How to set up Firebase (exact steps)

Firebase is used so **everyone with the app sees the same Community safety alerts**. Here’s exactly what to do and where to put things.

---

## 1. Create a Firebase project

1. Open **[Firebase Console](https://console.firebase.google.com)** in your browser.
2. Click **“Create a project”** (or **“Add project”** if you already have one).
3. Enter a project name (e.g. `SafeRoute`) → **Continue**.
4. Turn off Google Analytics if you don’t need it → **Create project** → **Continue**.

---

## 2. Turn on Firestore

1. In the left sidebar, click **“Build”** → **“Firestore Database”**.
2. Click **“Create database”**.
3. Choose **“Start in test mode”** (you can tighten rules later) → **Next**.
4. Pick a region (e.g. `us-central1`) → **Enable**.
5. Wait until the database is ready.

---

## 3. Get your web app config

1. In the left sidebar, click the **gear icon** next to “Project overview” → **“Project settings”**.
2. Scroll to **“Your apps”**.
3. Click the **Web** icon **`</>`** (“Add app”).
4. Register a nickname (e.g. `SafeRoute Web`) → leave “Firebase Hosting” unchecked → **Register app**.
5. You’ll see a **`firebaseConfig`** object like:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

6. Leave this tab open; you’ll copy these values in the next step.

---

## 4. Put the config in SafeRoute (where and what)

**Where:** In the **root of your SafeRoute project**, in a file named **`.env`**.

- Full path example: `c:\Users\Parth\SafeRoute\.env`
- If `.env` doesn’t exist, create it (same folder as `package.json` and `app.json`).

**What to put:** Copy from `.env.example` and then fill in the Firebase values. Map Firebase → env like this:

| Firebase config key   | Your `.env` variable                         | Example value (yours will differ)        |
|-----------------------|---------------------------------------------|------------------------------------------|
| `apiKey`              | `EXPO_PUBLIC_FIREBASE_API_KEY`              | `AIzaSyC...`                             |
| `authDomain`          | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`          | `your-project.firebaseapp.com`           |
| `projectId`           | `EXPO_PUBLIC_FIREBASE_PROJECT_ID`           | `your-project`                           |
| `storageBucket`       | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`       | `your-project.appspot.com`               |
| `messagingSenderId`   | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`  | `123456789012`                           |
| `appId`               | `EXPO_PUBLIC_FIREBASE_APP_ID`               | `1:123456789012:web:abcdef123456`        |

**Example `.env`** (replace with your real values):

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_if_you_use_it

EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

- No quotes around values.
- No spaces around `=`.
- `.env` is gitignored; don’t commit it.

**How the app uses it:** `src/config.ts` reads these `EXPO_PUBLIC_*` variables and passes them into the Firebase SDK. You don’t edit `config.ts` for your keys; only `.env`.

---

## 5. Restart Expo

After saving `.env`:

1. Stop the Expo dev server (Ctrl+C in the terminal).
2. Start it again: `npx expo start`.
3. Reload the app (e.g. press `r` in the terminal or shake device and Reload).

Environment variables are loaded at startup, so a restart is required.

---

## 6. Firestore index (if the app logs a link)

When you open the Community tab, the app may log something like:

- “The query requires an index. You can create it here: https://console.firebase.google.com/...”

Do this:

1. Open that URL in your browser.
2. Click **“Create index”**.
3. Wait a few minutes for the index to finish building.
4. Reload the app; the Community feed should load.

---

## 7. Optional: Firestore rules for production

In Firebase Console → **Firestore Database** → **Rules**, you can later replace test mode with something like (adjust if you add Auth):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create: if true;
      allow delete: if true;
      allow update: if false;
    }
  }
}
```

For development, test mode is enough.

---

## Quick checklist

| Step | Where | What |
|------|--------|------|
| 1–2 | [Firebase Console](https://console.firebase.google.com) | Create project, enable Firestore (test mode). |
| 3 | Firebase Console → Project settings → Your apps | Add Web app, copy `firebaseConfig`. |
| 4 | **SafeRoute project root** → **`.env`** | Create/copy `.env`, add the six `EXPO_PUBLIC_FIREBASE_*` variables with your values. |
| 5 | Terminal | Stop Expo, run `npx expo start` again, reload app. |
| 6 | Browser (if app logs a link) | Open index link, create index, wait, reload app. |

That’s the full setup. After this, Community safety alerts will sync for everyone using the app.
