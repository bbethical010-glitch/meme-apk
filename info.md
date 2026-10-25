# MEME CAPSULE — MASTER PROJECT & TECHNICAL INFORMATION (`info.md`)

> **Application Name:** Meme Capsule  
> **Package ID:** `com.meme.capsule`  
> **Current Version:** `v3.2` (`versionCode 23`)  
> **Last Updated:** September 27, 2026  
> **Official Website:** [https://memecapsule.wtf](https://memecapsule.wtf)  
> **Serverless Edge API Base:** `https://meme-capsule-eww.pages.dev`  
> **Play Store URL:** `https://play.google.com/store/apps/details?id=com.meme.capsule`  

---

## 1. Executive Summary & Core Vision

**Meme Capsule** is an anti-algorithm, mobile-first meme dispenser built with **React 19, TypeScript, Vite 6, Tailwind CSS v4, and Capacitor 8 (Android)**. Instead of trapping users in infinite vertical feeds and algorithmic doomscrolling, Meme Capsule delivers a tactile, arcade-style experience: **One Tap (`HIT ME`) → Hacker Decryption → One Curated Meme Drop → React, Pin, Vault, or Share.**

### Design Philosophy
- **Neo-Brutalist Arcade / Cyberpunk Aesthetic:** Pitch-dark `#131313` canvas, thick solid borders (`2px–4px`), sharp `0px` corners, hard offset shadows, high-voltage neon accents (`#9b30ff` purple, `#f4c300` yellow, `#dd0061` hot pink, `#00f0ff` cyan, `#adff2f` lime), and punchy typography (`Anton`, `Oswald`, `Chivo`).
- **Content Drives the Container:** The meme card dynamically adapts its aspect ratio and canvas dimensions (`computeCanvasDimensions`) to match each meme's natural dimensions without cropping punchlines.
- **Zero-Login Privacy:** No user accounts, emails, or personal profiling. User collections (Vault, Mood Boards, Reactions, Streaks) live locally on the device, paired with anonymous batched telemetry.

---

## 2. Complete Feature Inventory (v3.2 / VersionCode 23)

| Category | Feature | Component / File | Description & Behavior |
| :--- | :--- | :--- | :--- |
| **Core Dispenser** | **Hero Landing (`HIT ME`)** | `src/App.tsx` | Dominant Neo-Brutalist `HIT ME` button with pulsing glow aura, compact secondary actions (`BONUS DROP` & `TRIPLE DROP`), and redesigned top-left Neo-Brutalist Settings button (leaf badge removed). |
| **Feed Pipeline** | **Rolling 12-Meme FIFO Stack (60%–70% Trigger) & Smart Session Lifecycle** | `src/App.tsx`, `src/components/MemeCard.tsx`, `MainActivity.java` | Maintains a rolling 12-meme FIFO buffer (`STACK_BATCH_SIZE = 10`, `PIPELINE_TARGET_SIZE = 12`) that immediately triggers parallel background fetching of the next stack at **60%–70%** stack consumption (`STACK_PREFETCH_CONSUMPTION_RATIO = 0.6`). Preserves the active meme & queue in `sessionStorage` when switching between running apps or sharing, while resetting cleanly to the **Homepage (`screen = 'waiting'`)** whenever the app is closed/removed from running background apps (`window.MemeCapsuleAndroid.shouldRestoreRunningSession()`). |
| **Feed Sourcing** | **Hybrid D1/R2 + SFW Reddit** | `src/App.tsx` | Fetches curated memes from Cloudflare D1/R2 (`/api/random-meme`) and alternates every 3rd fetch (`totalMemesViewed % 3 === 0`) with Reddit (`meme-api.com/gimme`), strictly filtering out `nsfw` and `spoiler` posts. |
| **Card Deck** | **4-Card 3D Perspective Stack** | `src/components/MemeStack.tsx` & `src/components/MemeCard.tsx` | Interactive 4-card stack powered by `@react-spring/web` and `@use-gesture/react`. Supports Swipe Right (`keep`), Swipe Left (`skip`), Swipe Up (`save`), Double-Tap (`DANK!` shake + reaction), and 600ms Long-Press (gallery download). Zero floating action buttons over the meme card. |
| **Card Actions** | **4-Button CTA Row (`nav#ctaRow`: `LIKE → VAULT → PIN → MORE`)** | `src/App.tsx` & `src/index.css` | Horizontal 4-column grid (`max-w-[356px] w-full mt-3.5`) directly below the Meme Box with tactile `translate(3px, 3px)` active press, ink-spread ripple (`@keyframes inkSpread`), 6-tick radial burst shockwaves (`@keyframes burstSparks`), and pop icon animation (`@keyframes neoBurst`): **`LIKE`** (`#FF2A85`), **`VAULT`** (`#A855F7`), **`PIN`** (`#FACC15`), and **`MORE` (`⋮`)** (`#00E5FF`). Tapping `MORE` opens `#moreMenu` (`w-48 bg-white border-4 border-black`) containing **`SHARE`** (`#A855F7`), **`DOWNLOAD`** (`#FACC15`), and **`REPORT`** (`#FF2A85`). |
| **Viral Sharing** | **Flush Share Ribbon, 320ms Rise & 0-Latency Drag-to-Dismiss** | `src/ShareModal.tsx` & `MainActivity.java` | Collapsed Share Sheet Ribbon sits **100% flush (`0px` breathing space)** on the top border of the 3-tab bottom dock. Expands smoothly over `320ms cubic-bezier(0.16, 1, 0.3, 1)` from behind the dock, supports Instagram-style 0-latency 1:1 finger drag-to-dismiss (26% height / `0.5px/ms` velocity threshold), and removes the visible dark promotional text preview box from the frontend while preserving 100% of the promotional message + Play Store link payload on clipboard and share intents. |
| **Collections** | **Meme Vault (Favorites)** | `src/App.tsx` | Searchable local gallery of saved memes with viewed/fetched/liked counters. Free tier supports up to 100 memes (`FREE_VAULT_LIMIT = 100`); Pro tier unlocks unlimited storage. |
| **Curation** | **Mood Boards & Pinboard** | `src/App.tsx`, `src/CreateBoardModal.tsx`, `src/UnpinModal.tsx` | Create custom color-coded mood boards (`primary`, `secondary`, `tertiary`), choose target boards via an inline popover picker, and manage pins with synchronized `meme_pinboard` + `meme_favorites` storage so pinned thumbnails always render reliably. |
| **Safety & UGC** | **Content Reporting & Local Blocklist** | `src/ReportModal.tsx` & `src/App.tsx` | Google Play UGC-compliant reporting modal (`POST /api/report`). Reported memes are immediately added to `localStorage('reported_memes')`, permanently filtered out of `fetchValidMeme()`, and skipped automatically. |
| **Settings & Data** | **Dedicated Settings Screen with `[X]` Close, Re-Tap Toggle & Backdrop Dismiss** | `src/App.tsx`, `src/components/PrivacyConsentModal.tsx`, `src/components/PrivacyPolicyModal.tsx` | Accessible from the redesigned top-left header Settings icon (`#1c1c1e` / `#A855F7`, `2px solid #000`, `2.5px 2.5px 0px #000`). Includes an integrated Neo-Brutalist **`[X]` Close Button** on the top right of the panel, top-left header re-tap toggle, dimmed backdrop tap-to-dismiss, and Android hardware back navigation. |
| **Monetization** | **AdMob + Google Play Billing (PRO)** | `src/ProUpgradeModal.tsx` & `src/App.tsx` | Interstitial ads every 4th meme + Rewarded ads for bonus drops (`@capacitor-community/admob`). One-time Pro upgrade (`remove_ads_forever`) via `@capgo/native-purchases` unlocks Zero Ads, Unlimited Vault, and Triple Drop Mode. |

---

## 3. Neo-Brutalist Share System & Native Android Bridge (`v2.6–v2.7`)

### 3.1 Share Sheet Architecture (`src/ShareModal.tsx`)
When a user taps the **Share** button (either on the top-right corner of the active `MemeCard`, on the main bottom CTA bar, in the **Meme Vault**, or inside **Mood Boards**), the app opens `ShareModal.tsx`:
1. **Payload & Auto-Attached Message Preview:**
   - Displays the meme thumbnail, `1 Image + Invite Link` tag, `HD` stamp, and a dedicated preview box showing the exact promotional message and Play Store link that will accompany the meme:
     ```text
     💊 Caught this wild drop on MEME CAPSULE! 🔥
     "<Meme Title>"

     📲 Download Meme Capsule on Google Play:
     https://play.google.com/store/apps/details?id=com.meme.capsule
     ```
2. **6 Animated Social Media Dispatch Buttons (`QUICK DISPATCH`):**
   - **WhatsApp** (`com.whatsapp`) — Animated ringing/pulsing SVG logo (`mc-anim-whatsapp`).
   - **Instagram** (`com.instagram.android`) — Animated rotating/glowing camera SVG logo (`mc-anim-insta`).
   - **Facebook** (`com.facebook.katana`) — Animated floating emblem SVG logo (`mc-anim-fb`).
   - **X (Twitter)** (`com.twitter.android`) — Animated kinetic slash SVG logo (`mc-anim-x`).
   - **Telegram** (`org.telegram.messenger`) — Animated soaring paper-plane SVG logo (`mc-anim-tg`).
   - **Discord** (`com.discord`) — Animated wobbling Clyde controller SVG logo (`mc-anim-discord`).
3. **QuickShare & More Options (`MORE OPTIONS`):**
   - Replaced the static QR Code action with **`MORE OPTIONS`** (`#FF8C00` tangerine button with animated dots icon), which immediately opens the native Android system share sheet (`Intent.createChooser`).
4. **Copy to Clipboard:**
   - Copies the promotional message, Play Store link, and meme URL to the system clipboard with tactile visual feedback (`COPIED TO CLIPBOARD! ⚡`).

### 3.2 Native Java Bridge (`MainActivity.java`)
Registered on `WebView` as `window.MemeCapsuleAndroid`:
- **`downloadImage(String url, String fileName)`**:
  - Streams the image on a background thread into `Pictures/Meme Capsule` via Android 10+ `MediaStore.Images.Media` (`IS_PENDING` atomic write) without requiring runtime storage permissions on modern Android.
- **`shareImage(String url, String fileName, String title)`**:
  - Preserved for backward compatibility; automatically formats `title` using `buildShareMessage(title)` so the Play Store download link is always included, caches the image in `getCacheDir()/shared_images/` via `FileProvider`, and opens the native share chooser.
- **`shareImageToApp(String url, String fileName, String shareText, String targetPackage)`**:
  - Downloads the meme image into `FileProvider` cache (`content://com.meme.capsule.fileprovider/...`), attaches both `Intent.EXTRA_STREAM` (the meme image URI + `ClipData`) and `Intent.EXTRA_TEXT` (the promotional message + Play Store link).
  - If `targetPackage` is specified (e.g., `com.whatsapp`, `com.instagram.android`, `com.facebook.katana`, `com.twitter.android`, `org.telegram.messenger`, `com.discord`), it attempts to launch that app directly via `targetedIntent.setPackage(targetPackage)`. If the target app is not installed on the device, it seamlessly falls back to `Intent.createChooser` so sharing never fails.

---

## 4. Repository Structure

```text
/Users/prathampandey/Desktop/zip/
├── info.md                         <-- Master Project & Technical Information (this file)
├── AI_APP_CONTEXT.md               <-- AI Agent Context & Guardrails
├── AGENTS.md                       <-- Quick Reference Rules for AI Agents
├── app_info.md                     <-- Extended Product & Marketing Knowledge Base
├── neo brutalism share.html        <-- Reference Design Spec for Neo-Brutalist Share Sheet
├── package.json                    <-- Dependencies & build scripts
├── index.html                      <-- Entry HTML (#131313 dark background, viewport-fit=cover)
│
├── src/
│   ├── main.tsx                    <-- React DOM root mount
│   ├── App.tsx                     <-- Main application state, FIFO queue, tabs, CTA bar, native bridges
│   ├── index.css                   <-- Tailwind CSS v4 @theme tokens & custom animations
│   ├── types.ts                    <-- TypeScript interfaces (Meme, MoodBoard, DismissDecision)
│   ├── ShareModal.tsx              <-- Neo-Brutalist Share Bottom Sheet with animated social SVGs
│   ├── ReportModal.tsx             <-- UGC content reporting modal + local blocklist trigger
│   ├── CreateBoardModal.tsx        <-- Modal for creating custom color-coded Mood Boards
│   ├── UnpinModal.tsx              <-- Confirmation modal for unpinning memes from boards
│   ├── ProUpgradeModal.tsx         <-- Google Play IAP upgrade modal (remove_ads_forever)
│   ├── OnboardingModal.tsx         <-- 3-slide interactive onboarding tour
│   ├── components/
│   │   ├── MemeStack.tsx           <-- 4-card 3D spring deck & swipe gesture controller
│   │   ├── MemeCard.tsx            <-- Individual meme card with instant-tap 38x38 overlay buttons
│   │   ├── PrivacyConsentModal.tsx <-- First-launch privacy consent modal
│   │   └── PrivacyPolicyModal.tsx  <-- In-app Privacy Policy (v1.1) modal
│   ├── utils/
│   │   └── dimensions.ts           <-- Dynamic aspect-ratio canvas calculator & dimension cache
│   └── analytics/
│       └── ...                     <-- Silent telemetry batch queue & flush to /api/events
│
├── android/
│   └── app/
│       ├── build.gradle            <-- Android build config (versionCode 23, versionName "3.2")
│       └── src/main/
│           ├── AndroidManifest.xml <-- App permissions, FileProvider, & <queries> for social apps
│           └── java/com/meme/capsule/
│               └── MainActivity.java <-- Immersive #131313 system bars, cold-start vs app-switch session bridge & MemeCapsuleAndroid
│
└── builds/
    ├── meme-capsule-v3.2.apk       <-- Latest Debug APK (v3.2 / versionCode 23)
    ├── meme-capsule-latest.apk     <-- Mirror of the latest APK build
    ├── meme-capsule-v3.2.aab       <-- Google Play Console Release App Bundle (v3.2)
    └── app-release.aab             <-- Mirror of the latest Release App Bundle
```

---

## 5. Critical Engineering Guardrails & Styling Notes

1. **Tailwind CSS v4 `@theme` Spacing Token Note (`src/index.css`):**
   - `src/index.css` defines custom spacing tokens (`--spacing-xs: 8px`, `--spacing-sm: 16px`, `--spacing-md: 24px`, `--spacing-lg: 40px`, `--spacing-xl: 64px`).
   - In Tailwind v4, utility classes like `max-w-md` or `max-w-sm` resolve to `var(--spacing-md)` (`24px`) and `var(--spacing-sm)` (`16px`).
   - **Rule:** Always use explicit pixel values (e.g., `max-w-[356px]`, `max-w-[460px]`, `max-w-[500px]`) for modal and container widths rather than `max-w-md` or `max-w-sm`.
2. **Preserve Native Java Bridge (`window.MemeCapsuleAndroid`):**
   - Always maintain `downloadImage`, `shareImage`, and `shareImageToApp` in `MainActivity.java`.
3. **Build & Verification Workflow:**
   - Always run `npm run lint` (`tsc --noEmit`) before building.
   - Build and sync Android assets with `npm run build:android` (`npm run build && npx cap sync`) followed by `cd android && ./gradlew assembleDebug`.

---

## 6. Official Contact, Social Handles & Engineering Attribution

- **Lead Backend Developer:** Anmol Verma (`editorav010-dev` / `anmolverma.env@gmail.com`)
- **Lead Frontend Developer & Original Ideator:** Pratham Pandey (`bbethical010-glitch` / `bbethical010@gmail.com`)
- **Social Media & Marketing Lead:** Faraz Ahmed (`thesplashsnize@gmail.com`)
- **Official App Support Email:** `memecapsule.app@gmail.com`
- **Official Social Media:**
  - Instagram: [https://www.instagram.com/capsule.meme/](https://www.instagram.com/capsule.meme/)
  - X: [https://x.com/memecapsule_](https://x.com/memecapsule_)
  - Threads: [https://www.threads.com/@capsule.meme](https://www.threads.com/@capsule.meme)

