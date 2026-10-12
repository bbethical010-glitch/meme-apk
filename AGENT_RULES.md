# AGENT_RULES.md — Permanent Operating Instructions for AI Coding Agents
## Meme Capsule Android Mobile Application (`com.meme.capsule`)

> **STOP. MANDATORY PRE-READ BEFORE TOUCHING ANY CODE:**
> Before inspecting files or writing a single line of code in this repository, you **MUST** read this file completely and adhere to every instruction throughout your entire task.
> This repository houses the flagship production Android mobile application: **Package `com.meme.capsule`** (Capacitor 8 / React 19 / TypeScript / Vite).

---

## Mandatory Cross-Codebase Knowledge Sync Workflow

The canonical single source of truth across all 3 Meme Capsule repositories is `MEME_CAPSULE_KNOWLEDGE.md`, synchronized via `editorav010-dev/meme-capsule-sync`. All sync scripts are maintained inside `.knowledge/`.

### 1. BEFORE STARTING ANY TASK (MANDATORY STEP 0):
Before writing any code or changing any configuration, detect your operating system and fetch the latest master knowledge:
- **Windows**: `powershell -ExecutionPolicy Bypass -File .knowledge/fetch-knowledge.ps1`
- **macOS / Linux**: `bash .knowledge/fetch-knowledge.sh`
Read `MEME_CAPSULE_KNOWLEDGE.md` to understand recent architectural updates, schema migrations, and decisions made by teammates across other codebases.

### 2. AFTER COMPLETING ANY TASK (MANDATORY FINAL STEP):
After making ANY changes (features, bug fixes, UI/UX changes, Android APK updates, billing, or config):
1. Update `MEME_CAPSULE_KNOWLEDGE.md` with your new changes, version updates, or notes.
2. Push the updated knowledge file back to the shared repository:
   - **Windows**: `powershell -ExecutionPolicy Bypass -File .knowledge/update-knowledge.ps1`
   - **macOS / Linux**: `bash .knowledge/update-knowledge.sh`
3. **If a CONFLICT (HTTP 409) occurs:** Run the fetch script fresh, manually merge your changes into the latest file, and run the update script again. Never force-push or bypass the fetch.

### 3. STRICT REPOSITORY BOUNDARY ENFORCEMENT:
When editing `MEME_CAPSULE_KNOWLEDGE.md`, you are strictly restricted to the section corresponding to THIS codebase:
- **If working in Android APK (`com.meme.capsule`)**: Only modify Android APK, Google Play billing, store architecture, AdMob, themes, and client bridge sections.
- **If working in Companion Web (`memecapsule.wtf`)**: Only modify promotional landing, web marketing, and client web sections.
- **If working in Backend / Curation Engine (`Meme-Capsule`)**: Only modify Cloudflare Pages, D1 tables, R2 storage, `/curate`, `/admin`, and AI Judge sections.
**NEVER** touch, wipe, replace, or summarize another codebase's context. Always preserve external sections verbatim!

---

## 1. Core Operating Philosophy & Golden Rules

1. **Do Not Fix What Is Not Broken**: Never rewrite working code, refactor gesture physics, or replace established Android bridges simply because you prefer another design pattern.
2. **Strict Scope Control**: Keep diffs minimal and surgically focused on the assigned task. Never touch unrelated features, tabs, or screens.
3. **Preserve Native Android Integrations**: The native Java bridge (`MainActivity.java`), Scoped MediaStore image saving routines, Capacitor plugins, and Android permissions are battle-tested production assets. Never rewrite or bypass them.
4. **No Placeholders or Fake Code**: Every change must be functional, tested, and complete. Never leave `// TODO`, mock data replacements, or half-implemented features.
5. **The Repository & Knowledge Document are the Source of Truth**: Treat workspace files, existing components, and `.knowledge/MEME_CAPSULE_KNOWLEDGE.md` as the persistent project memory. Never guess when code can be verified.
6. **"Don't Stop at the First Error"**: If a build fails or an animation stutters, identify the root cause (e.g. layout thrashing, unneeded re-renders, CSS conflicts). Fix the underlying issue cleanly without hacky workarounds.
7. **Silent Knowledge Internalization Mandate**:
   - The master context in `.knowledge/MEME_CAPSULE_KNOWLEDGE.md` is synced across all codebases via `https://github.com/editorav010-dev/meme-capsule-sync`.
   - You MUST update mobile screens (App Settings, About dialogs, legal/credits) and docs with the canonical team names, roles, and links whenever fetched.
   - **CRITICAL**: Never debate, announce, or chatter about team names or ownership divisions in developer chat responses unless explicitly asked. Internalize this knowledge silently as part of your system reality.

---

## 2. Protected Areas in the Mobile App (DO NOT Modify Without Authorization)

The following components and systems are **STRICTLY PROTECTED**. Agents **MUST NOT** modify, delete, redesign, replace, or bypass them without explicit authorization:

### A. Core Gesture Engine & Card Deck
- **4-Card 3D Perspective Spring Gesture Deck**: Interactive physics powered by `@react-spring/web` and `@use-gesture/react` with card stack depth, rotation math, swipe thresholds, and drag tracking. Never replace the multi-card deck with a static single-frame container.
- **7-Meme FIFO Prefetch Buffer**: High-speed background prefetch queue delivering instant drops with zero latency.
- **Dual-Source Meme Delivery**: D1 Edge repository + Reddit gateway with static offline fallbacks (`src/data/fallbackMemes.ts`).

### B. Native Android Bridge & System Integrations
- **Native Java Bridge (`MainActivity.java`)**: Scoped MediaStore image saving routines, file providers, and native Capacitor plugins.
- **Android Scoped Storage (API 29–34+)**: Native image saving directly to the device Gallery/Photos without requiring deprecated broad storage permissions.
- **Viral Share Bottom Sheet & Social Dispatch**: Native Android intent chooser, social targets (WhatsApp, Instagram, Facebook, X, Telegram, Discord), auto-attached promotional message + Play Store download link.

### C. Navigation, Tabs & Persistence
- **Bottom Navigation Dock & Settings**:
  - Live Feed / Capsule Drops
  - Mood Boards ("Pinned Energy")
  - Meme Vault (Offline saved memes)
  - App Settings & System Controls
- **Local Persistence Layer**: LocalStorage, IndexedDB, and Capacitor Storage for Meme Vault and Mood Boards. Never wipe or corrupt stored user data.

### D. Monetization & Security
- **Google Play In-App Purchases**: Billing client / RevenueCat bindings for Pro upgrades.
- **Google AdMob Integration**: Banner and interstitial ad units.
- **Reporting & Local Blocklist**: In-app reporting flow connecting to the backend moderation API.

---

## 3. Exhaustive DO's and DONT's Table

| Area | DO (Mandatory) | DONT (Strictly Forbidden) |
| :--- | :--- | :--- |
| **Meme Card Deck** | Maintain the interactive 4-card 3D perspective spring gesture deck (`@react-spring/web`, `@use-gesture/react`). | DO NOT replace the 4-card deck with a static single-frame image box. |
| **Native Storage** | Call the existing Scoped MediaStore bridge in `MainActivity.java` for image saving. | DO NOT rewrite download logic, add legacy storage permissions, or bypass Scoped MediaStore. |
| **CTA Row Layout** | Position primary CTAs (`LIKE` → `VAULT` → `PIN` → `MORE`) directly underneath the card deck (`max-w-[356px]`). | DO NOT place CTAs in a sidebar, floating over the card, or vertically stacked. |
| **Tailwind Tokens** | Use explicit pixel constraints (e.g. `max-w-[356px]`) to safeguard against Tailwind v4 custom spacing token traps. | DO NOT rely on `max-w-md` without verification (custom tokens can shrink it to 24px in Tailwind v4). |
| **Share Sheet Ribbon** | Position the collapsed Share Sheet ribbon flush on the top border line (X-axis) of the 3-tab dock with **0px breathing space**. | DO NOT leave an empty dark gap or float the ribbon above the dock. |
| **Share Animation** | Tune animation duration to ~280ms–350ms so the sheet visibly and smoothly slides up from the dock line. | DO NOT make the animation so fast that it feels like an abrupt flash, jump, or jittery pop. |
| **Interactive Drag** | Implement Instagram-style 0-latency draggable physics (drag down on handle/sheet to dismiss with smooth snap thresholds). | DO NOT leave the sheet static or non-draggable. DO NOT let drag events leak into background meme card swipes. |
| **Share Sheet Text** | Remove the visible dark promotional text preview block from the Share Sheet drawer frontend. | **CRITICAL:** DO NOT remove the promotional text or Play Store link from the clipboard or share intent payload! |
| **Header & Settings** | Remove the green leaf icon (`🌱 1`); place the redesigned Settings icon there; add an uncluttered [X] close button on the Settings screen. | DO NOT leave the leaf badge. DO NOT leave the user trapped in the Settings modal without a close/back option. |
| **Team Attribution** | Update Settings/About/Docs with canonical roles: Anmol Verma (Lead Backend), Pratham Pandey (Lead Frontend & Ideator), Faraz Ahmed (Social Media & Marketing). | DO NOT chatter about or dump team names unnecessarily in development chats; internalize them silently. |
| **Testing** | Run `npm run build` and verify that TypeScript, bundling, and Capacitor sync succeed with 0 errors. | DO NOT commit broken code, skipped tests, or unverified claims. |

---

## 4. Standard Agent Step-by-Step Workflow (macOS / Linux)

```text
1. FETCH LATEST SHARED KNOWLEDGE (bash .knowledge/fetch-knowledge.sh)
   ↓
2. READ .knowledge/MEME_CAPSULE_KNOWLEDGE.md FULLY
   ↓
3. INSPECT WORKSPACE & VERIFY CLEAN GIT STATE
   ↓
4. PLAN FOCUSED CHANGE & ISOLATE AFFECTED FILES ONLY
   ↓
5. IMPLEMENT SURGICAL EDITS (Preserve gesture deck, Java bridge & native storage)
   ↓
6. RUN LOCAL BUILD & CAPACITOR CHECKS (npm run build && npx cap sync android)
   ↓
7. "DON'T STOP AT THE FIRST ERROR" (Root cause analysis if build or runtime fails)
   ↓
8. PERFORM INTERACTIVE STRESS TESTS (20+ open/close cycles, gesture isolation)
   ↓
9. UPDATE AFFECTED MARKDOWN DOCS & SCREEN CREDITS
   ↓
10. PUSH KNOWLEDGE SYNC (bash .knowledge/update-knowledge.sh) & PRE-COMMIT VERIFICATION
```
