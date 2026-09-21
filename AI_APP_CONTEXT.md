# AI App Context: Meme Capsule

## App Summary

**Meme Capsule** is a high-performance, mobile-first meme discovery application designed for the Android platform. It is packaged using **Capacitor 8** around a highly styled, modern **React 19 + TypeScript + Vite** frontend. 

The app features a distinct **Neo-Brutalist Arcade / Cyberpunk** visual aesthetic, featuring thick borders, vibrant neon accent colors, offset shadows, custom animations, and retro-futuristic arcade loading flows. The app is currently set up for Google Play Console distribution in the **Internal Testing** phase.

---

## Current Play Store & Distribution Status

- **Distribution Stage:** Internal Testing (Pre-Production)
- **Target Platform:** Android (API level 21+)
- **Play Console App Name:** Meme Capsule
- **Android Package ID:** `com.meme.capsule`
- **Primary App Category:** Entertainment
- **Monetization State:** Pre-production test-only AdMob interstitial ads (frequency controlled).
- **Google Play Compliance:** Ready for internal testing; requires replacement of test ad IDs and content source declarations before production launch.

---

## Core Features & Gameplay Loop

### 1. Mixed Meme Discovery API Strategy
The app fetches memes from two primary sources, utilizing an alternating strategy:
- **Default/Primary Endpoint:** The custom Meme Capsule Serverless backend: `https://meme-capsule-eww.pages.dev/api/random-meme`.
- **Alternating Reddit Feed:** Every 3rd fetch (where `totalMemesViewed % 3 === 0`) queries the Reddit Meme API: `https://meme-api.com/gimme`.
- **NSFW/Spoiler Safety Filter:** When fetching from Reddit, the app automatically inspects the payload and drops any memes flagged as `nsfw` or `spoiler`, triggering an immediate fallback to the custom Meme Capsule API to guarantee a safe-for-work experience.

### 2. Hacker Loading & Arcade Console
Before a meme is presented, the user is wowed with an interactive loading screen:
- **Hacker Logs:** Rotates through mock diagnostic text ("CHECKING REDDIT MEME RELAY...", "HARVESTING CLOUDFLARE D1 SHARDS...", etc.) synchronizing with progress percentages.
- **Erratic Cyber Countdown:** An erratic retro-futuristic counter cycling random string tokens (`03.14`, `99.99`, `42.00`, `ERR`, `69.69`, etc.) to simulate decryption math.
- **Loading Shimmer Bar:** A custom high-velocity CSS gradient shimmer reflecting the neo-brutalist theme.

### 3. Double-Click Meme Reactions & Haptics
- Double-clicking the main meme card triggers visual reactions overlaying the card (`DANK!`, `CRINGE!`, `SO REAL`, `GIGA DANK`, `EPIC!`).
- Triggers a card-shaking CSS animation (`animate-shake`) mimicking physical haptic feedback.

### 4. Dual-Path Image Downloading & Sharing
To ensure optimal performance and standard capability across web browsers and native Android, the app implements a robust split sharing system:
- **On Native Android:** Accesses a custom Java native bridge interface (`window.MemeCapsuleAndroid` injected via WebKit).
  - **Download Method:** Calls `downloadImage` which opens a connection in a background thread, downloads the image, and utilizes **MediaStore (Android 10+)** via `ContentResolver` to save it cleanly inside `Pictures/Meme Capsule` without needing insecure write permissions. It falls back to legacy external storage paths on older APIs.
  - **Share Method:** Calls `shareImage` which saves the image safely into the app cache directory and triggers a native Android `Intent.ACTION_SEND` chooser wrapped with secure `FileProvider` URI grants.
- **On Web / Fallback:** 
  - **Download:** Employs programmatic `Blob` object downloading.
  - **Share:** Tries native `@capacitor/share` or Web Share API, falling back to writing the URL to the user's clipboard.

### 5. "Meme Vault" (Favorites & Stats Dashboard)
A complete personal vault section:
- **Interactive Stats Panel:** Tracks user stats: Viewed Memes count, Fetched Memes count, and Liked Memes count.
- **Search Filtering:** Quick search to instantly filter saved memes by title.
- **Vault Operations:** Download, Share, or securely delete individual memes from the vault.

### 6. Dev Joke Ticker
- Features a dynamic developer humor subtitle ticker (`DEV_JOKES`) that cycles funny tech jokes every 12 seconds in the background.

### 7. Google AdMob Integration
- Fully integrated using `@capacitor-community/admob` with automatic testing initialization.
- Shows an interstitial ad every **4th** meme viewed on native Android platforms, avoiding overwhelming the user.

---

## Technical Stack & Infrastructure

- **UI Library:** React 19 (Hooks: `useState`, `useEffect`)
- **Language Layer:** TypeScript (with strict types for JSON payloads)
- **Bundler & Server:** Vite + Tailwind CSS v4
- **Mobile Container:** Capacitor 8
- **Core Mobile Plugins:**
  - `@capacitor/share` (Web sharing fallback)
  - `@capacitor/core` (`CapacitorHttp` to resolve CORS/SSL issues on Android)
  - `@capacitor-community/admob` (Monetization framework)
- **Icons:** `lucide-react` (Neo-brutalist button outlines)

---

## Styling System & Theme Tokens (`src/index.css`)

The app employs **Tailwind CSS v4** with a highly customized theme configuration (`@theme`) to establish a signature cyber-brutalist experience:

### Theme Colors
- `primary-container` (`#9b30ff`): Neon Purple
- `secondary-container` (`#f4c300`): Arcade Gold/Yellow
- `tertiary-container` (`#dd0061`): Hot Magenta Pink
- `background` (`#131313`): Pitch Cyber Black
- `surface-container-high` (`#2a2a2a`): Charcoal Grey
- `outline` (`#988ca1`): Muted Slate

### Fonts
- **Headlines:** `Anton` (Ultra-heavy, blocky uppercase headers)
- **Labels & Numbers:** `Oswald` (Clean, condensed mechanical text)
- **Body Text:** `Chivo` (Highly readable modern sans-serif)

### Custom Classes & Keyframes
- **`.neo-shadow-pink`:** Solid offset text drop-shadow (`text-shadow: 4px 4px 0px var(--color-tertiary)`).
- **`.glitch-text`:** Creates a retro yellow-pink 3D offset drop-shadow effect.
- **`.loading-shimmer`:** A fast gradient sliding animation shifting across neon purple and hot pink.
- **`@keyframes erratic`:** Cycles custom numbers and text content for the loader in CSS content properties.
- **`.animate-shake`:** Quick CSS translation animation matching custom card reactions.

---

## File Architecture

- **[src/App.tsx](file:///Users/prathampandey/Desktop/zip/src/App.tsx):** Houses all state hooks, API request pipelines, storage serialization, page rendering, layout views, and AdMob events.
- **[src/index.css](file:///Users/prathampandey/Desktop/zip/src/index.css):** Holds Google font imports, Tailwind v4 customizations, custom keyframe animations, and custom styling overrides.
- **[android/app/src/main/java/com/meme/capsule/MainActivity.java](file:///Users/prathampandey/Desktop/zip/android/app/src/main/java/com/meme/capsule/MainActivity.java):** Native Java activity wrapper. Contains the nested `MemeCapsuleDownloads` class and all MediaStore background thread streaming / share Intent caching.
- **[capacitor.config.json](file:///Users/prathampandey/Desktop/zip/capacitor.config.json):** Configuration mapping the bundle target identifier `com.meme.capsule` and output directory `dist`.

---

## Data Preservation & Local Storage

The app maintains state purely client-side with no central backend user database. The following `localStorage` keys are managed by the React frontend:
- `meme_favorites`: JSON array storing normalized `Meme` records favorited by the user.
- `liked_memes`: String array of meme image URLs representing liked entries.
- `total_memes_viewed`: Int tracking total memes displayed.
- `total_memes_fetched`: Int tracking total attempts made to pull memes.

---

## Critical Commands for Development

### 1. Environment Setup & Local Dev
```bash
# Install NPM packages
npm install

# Run Vite dev server (accessible at http://localhost:3000)
npm run dev
```

### 2. Build & Packaging for Android
```bash
# Build React assets & sync to Capacitor Android project wrapper
npm run build:android

# Open native Android Studio context (if needed)
npx cap open android
```

### 3. Verification & Lints
```bash
# Runs TypeScript compiler target checks
npm run lint
```

---

## Guidelines for AI Assistants

1. **Keep the Theme Consistent:** Any UI additions must adhere to the neo-brutalist theme guidelines. Never use default gradients, soft rounded buttons, or subtle shadows. Always use solid borders, bright neon backdrops, thick flat black borders, and heavy `Oswald` or `Anton` fonts.
2. **Respect the Native Bridge:** Do not attempt to refactor native file operations in `App.tsx` without maintaining compatibility with `window.MemeCapsuleAndroid` in `MainActivity.java`.
3. **CORS Prevention:** When fetching images or data from external servers, keep in mind that native apps bypass browser CORS checks, but the browser dev environment does not. Always use CapacitorHttp for native endpoints and include appropriate fallbacks.
4. **Google Play Safety Compliance:** Remember that this app fetches random external web memes (from Reddit and other public repositories). Future features addressing content filters, privacy policies, blocklists, or report buttons should strictly follow Google Play policies regarding User Generated Content (UGC).
