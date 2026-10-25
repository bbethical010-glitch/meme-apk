# MEME CAPSULE — ANDROID APK (`v2.8` → `v3.4`) CHANGELOG & WEBSITE (`memecapsule.wtf`) UPDATE GUIDE

> **Current Android Production Build:** `v3.4` (`versionCode 25` / Build 25)  
> **Android Package ID:** `com.meme.capsule`  
> **Official Website:** [https://memecapsule.wtf](https://memecapsule.wtf)  
> **Official Privacy Policy URL:** [https://memecapsule.wtf/privacy](https://memecapsule.wtf/privacy)  
> **Official Support & Privacy Email:** `support@memecapsule.wtf` *(replaces `memecapsule.app@gmail.com`)*  

---

## 1. Executive Summary of All Recent Android App Changes

Between `v2.7` (`versionCode 18`) and **`v3.4` (`versionCode 25`)**, the Meme Capsule Android application underwent a major series of UX, performance, lifecycle, privacy, and Neo-Brutalist interface upgrades:

| Version | Build (`versionCode`) | Key Milestone / Feature Update |
| :--- | :--- | :--- |
| **`v2.8`** | `versionCode 19` | Removed cluttered Privacy Policy links from the face of Home/Vault/Mood Boards; introduced the dedicated **App Settings & History Erasure Page** with granular data deletion and feed controls. |
| **`v2.9`** | `versionCode 20` | Full **Neo-Brutalist UI & Interaction Overhaul**: unobstructed Meme Box, 4-column CTA Row (`LIKE`, `VAULT`, `PIN`, `MORE ⋮`), `#moreMenu` (`SHARE`, `DOWNLOAD`, `REPORT`), top-left Settings button (replacing `🌱 1`), and flush **Instagram-style draggable Share Sheet Ribbon**. |
| **`v3.0`** | `versionCode 21` | **Active Session & Share Handoff Retention**: sharing a meme to external apps (WhatsApp, Instagram, etc.) or switching apps retains the exact loaded meme and queue without reloading. |
| **`v3.1`** | `versionCode 22` | **12-Meme Rolling FIFO Stack Prefetch Engine**: upgraded buffer to 12 memes with a **60%–70% stack consumption trigger** (`FIFO_REFILL_TRIGGER_SIZE = 4`) and streaming per-meme enqueueing for zero loading screens between stacks. |
| **`v3.2`** | `versionCode 23` | **Smart Session Lifecycle**: preserves the active meme when switching between running apps or sharing, while **resetting cleanly to the Homepage (`HIT ME`)** when the app is swiped away/closed from Android Recents. |
| **`v3.3`** | `versionCode 24` | Replaced all occurrences of `memecapsule.app@gmail.com` with **`support@memecapsule.wtf`** across the app and Privacy Policy; removed social handles from the APK. |
| **`v3.4`** | `versionCode 25` | **Settings Page Streamlining**: removed `Frontend & Concept: Pratham Pandey` and developer name credits from the app UI, removed the feedback email row from Settings, and consolidated Privacy & Website links into a **single CTA button** redirecting to `https://memecapsule.wtf/privacy`. |

---

## 2. Detailed Breakdown of Every Feature & Architectural Change

### 2.1 Unobstructed Meme Card & 4-Column Neo-Brutalist CTA Bar (`v2.9`)
- **Zero Floating Overlay Clutter:** Removed floating action buttons from on top of the Meme Card so 100% of the meme image/caption is visible without obstruction.
- **4-Column Horizontal CTA Row (`nav#ctaRow`, `max-w-[356px]`):** Positioned directly below the 4-card 3D perspective spring deck:
  1. **`LIKE` (`#FF2A85` Hot Pink)** — Casts a like vote with radial shockwave burst (`@keyframes burstSparks`) and icon pop (`@keyframes neoBurst`).
  2. **`VAULT` (`#A855F7` High-Voltage Purple)** — Saves the meme to the local offline Meme Vault.
  3. **`PIN` (`#FACC15` Arcade Gold)** — Opens the Mood Board selector to pin the meme to a themed board.
  4. **`MORE (⋮)` (`#00E5FF` Cyber Cyan)** — Opens the Neo-Brutalist `#moreMenu` popover (`w-48 bg-white border-4 border-black`) containing:
     - **`SHARE` (`#A855F7`)**
     - **`DOWNLOAD` (`#FACC15`)**
     - **`REPORT` (`#FF2A85`)**

### 2.2 Persistent Share Sheet Ribbon & Instagram-Style Draggable Physics (`v2.9`)
- **0px Flush Dock Alignment:** The collapsed Share Sheet Ribbon sits 100% flush (`0px` gap) along the top border line of the 3-tab bottom navigation dock (`Home`, `Vault`, `Mood Boards`).
- **Smooth 320ms Spring Slide-Up:** Expands smoothly (`320ms cubic-bezier(0.16, 1, 0.3, 1)`) from behind the navigation dock.
- **Instagram-Style 0-Latency 1:1 Finger Drag-to-Dismiss:** Users can drag down anywhere on the Share Sheet handle/drawer to dismiss it smoothly (snaps closed at `26%` drawer height or `0.5px/ms` flick velocity) with full touch isolation so background meme cards never swipe accidentally.
- **Clean Frontend Drawer:** Removed the 5 internal technical/debug labels and hid the dark promotional text preview box from the UI while keeping 100% of the promotional message + Google Play Store link attached to clipboard copies and social share intents (`WhatsApp`, `Instagram`, `Facebook`, `X`, `Telegram`, `Discord`, `More Options`).

### 2.3 Top-Left Header Settings Button & Dedicated Settings Page (`v2.8`, `v2.9`, `v3.3`, `v3.4`)
- **Header Redesign:** Removed the green leaf/seed badge (`🌱 1`) from the top-left header and replaced it with a tactile Neo-Brutalist **Settings gear button** (`#1c1c1e` / `#A855F7`, `2px solid #000`, `2.5px 2.5px 0px #000`).
- **Instant Dismissal:** Added a Neo-Brutalist `[X]` Close button in the top-right header of `APP SETTINGS`, plus support for top-left button re-tap toggle, backdrop tap dismissal, and Android hardware Back button dismissal.
- **Local Device Footprint & Granular History Erasure:**
  - Live counters for **Memes Viewed**, **Vault Saved**, **Mood Boards**, and **Blocked IDs**.
  - **Clear Past Viewing History & Stats** (resets viewed count, streaks, and seen buffer while keeping Vault & Mood Boards intact).
  - **Empty Vault & Mood Boards** (clears saved favorites and custom boards).
  - **Unblock Reported Memes** (restores locally hidden/reported memes).
  - **Delete All App History & Data** (2-step confirmation full local storage wipe).
- **Capsule Feed Controls:**
  - **Hybrid Reddit Relay (`ON`/`OFF`)**: Toggles mixing SFW Reddit memes every 3rd drop alongside the curated Cloudflare D1/R2 repository.
  - **Turbo Prefetch Buffer (`ON`/`OFF`)**: Toggles background preloading of memes.
  - **Card Recoil & Shake Effects (`ON`/`OFF`)**: Toggles physical arcade card recoil animations on double-tap.
- **Streamlined Privacy, Legal & About Section (`v3.3` → `v3.4`):**
  - Replaced all references to `memecapsule.app@gmail.com` with **`support@memecapsule.wtf`**.
  - Removed the `Frontend & Concept: Pratham Pandey` / developer credits block and removed the feedback email / social handles from the Settings card.
  - Consolidated the section into a **single Neo-Brutalist CTA link (`PRIVACY POLICY & TERMS`)** that redirects directly to **`https://memecapsule.wtf/privacy`**.

### 2.4 12-Meme Rolling FIFO Stack Prefetch Engine (`v3.1`)
- **Upgraded Queue Capacity:** Increased the in-memory prefetch queue to a **12-meme rolling FIFO buffer** (`STACK_BATCH_SIZE = 10`, `PIPELINE_TARGET_SIZE = 12`).
- **60%–70% Consumption Prefetch Trigger (`STACK_PREFETCH_CONSUMPTION_RATIO = 0.6` / `FIFO_REFILL_TRIGGER_SIZE = 4`):** As soon as the user has viewed **60%–70%** of the currently loaded stack (6 out of 10 memes viewed, leaving 4 in the queue), the app silently triggers a background refill batch.
- **Streaming Per-Meme Enqueueing (`enqueueMemeToFifo`):** Each fetched meme is preloaded (`decodeImageElement`) and appended to the live FIFO queue immediately as it arrives, eliminating full-screen loading pauses between stacks.

### 2.5 Smart Session Lifecycle: App-Switch Retention vs. Cold-Start Reset (`v3.0` & `v3.2`)
- **Background App-Switch & External Share Retention (`v3.0`):** When a user shares a meme to WhatsApp, Instagram, Telegram, Discord, etc., or switches between running apps, the app preserves the exact loaded meme and the 12-meme FIFO buffer (`sessionStorage` + 2-minute share handoff token `meme_capsule_share_handoff_v1` + native Android bridge).
- **Cold-Start / Recents Swipe-Away Homepage Reset (`v3.2`):** Added native Android task/process lifecycle detection (`window.MemeCapsuleAndroid.shouldRestoreRunningSession()` and `meme-capsule-reset-to-home` event in `MainActivity.java`). When the user closes/swipes away Meme Capsule from running background apps in Android Recents and opens the app again, it starts fresh on the **Homepage (`HIT ME`)** rather than reopening on an old meme.

---

## 3. Actionable Checklist for Updating `memecapsule.wtf`

Use the checklist below to update the website repository (`memecapsule.wtf`):

### A. Global Contact & Privacy Email Replacement
- **Find:** `memecapsule.app@gmail.com`
- **Replace with:** `support@memecapsule.wtf`
- **Files to check on `memecapsule.wtf`:**
  - `src/pages/Privacy.tsx` and `public/privacy.html` (Header metadata, Section 10 Deletion Requests, Section 13 Grievance Contact, Section 17 Contact Info)
  - `src/pages/About.tsx` (Press Kit contact email)
  - `src/components/Footer.tsx` / `src/components/ContactForm.tsx`
  - `index.html` (Schema.org `Organization` `email` / `contactPoint` JSON-LD)
  - `public/llms.txt` and `public/llms-full.txt`

### B. Privacy Policy Page (`https://memecapsule.wtf/privacy` & `public/privacy.html`)
Because the Android APK Settings page (`v3.4`) now links directly to **`https://memecapsule.wtf/privacy`** as the single canonical Privacy Policy & Terms destination:
1. Ensure `/privacy` (both `src/pages/Privacy.tsx` and static `public/privacy.html`) displays **`support@memecapsule.wtf`** as the official Privacy / Support email.
2. Remove personal developer names (`Grievance Officer: Pratham Pandey`) if you also want your name removed from the public privacy policy page, leaving `Designation: Grievance Officer` and `Email: support@memecapsule.wtf`.
3. Mention the in-app **Settings → Data & History Erasure** controls (`Delete All App History & Data`, `Clear Past Viewing History & Stats`, `Empty Vault & Mood Boards`) under Section 10 (*Deletion and Privacy Requests*) so Google Play reviewers and users visiting `memecapsule.wtf/privacy` see that full self-serve data erasure is built directly into the app.

### C. App Version & Technical Specs (`src/pages/About.tsx`, `HowItWorksDetail.tsx`, `llms.txt`, `index.html`)
- **Current App Version:** Update `v2.7 (versionCode 18)` → **`v3.4 (versionCode 25)`**.
- **FIFO Buffer Specification:** Update references from `"7-Meme FIFO Prefetch Buffer"` → **`"12-Meme Rolling FIFO Prefetch Engine (with 60%–70% stack consumption auto-refill)"`**.
- **Card CTA Bar & Share Sheet Specification:**
  - Update descriptions of floating card buttons to the **unobstructed Meme Card + 4-column Neo-Brutalist CTA Bar (`LIKE`, `VAULT`, `PIN`, `MORE ⋮`)** and **flush Instagram-style draggable Share Sheet Ribbon**.
- **Team / Credits Section on Website (`src/pages/About.tsx` & `index.html` JSON-LD):**
  - If you also wish to hide personal developer names on `memecapsule.wtf/about` to match the APK Settings screen, remove or anonymize the personal names block in `src/pages/About.tsx` and `index.html`.
