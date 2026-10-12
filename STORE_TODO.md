# STORE TODO & IMPLEMENTATION TRACKER

## Step 0: Audit & Prerequisite Review [DONE]
- [x] Read `src/App.tsx`, `src/index.css`, `capacitor.config.*`, Settings page, Header, AdMob integration, Mood Boards cap, and existing `src/monetization/` files.
- [x] Recorded underlying feature status for all catalog items:
  - `remove_ads_forever`: **WORKING** (`ads.ts` suppresses banners and interstitials; rewarded ads stay optional).
  - `unlimited_mood_boards`: **WORKING UNDERLYING LOGIC** (`canCreateBoard(moodBoards.length, unlimited)` in `rewards.ts`), connected to inline store prompt.
  - `fx_arcade_pack`: **BUILT IN STEP 5d** (3 extra card entry/recoil animation styles: Classic, Retro Slam, Neon Glitch, Cassette Pop).
  - `theme_cyberpunk_cyan`: **WORKING** (CSS variables in `themes.css`).
  - `theme_acid_green`: **WORKING** (CSS variables in `themes.css`).
  - `theme_midnight_gold`: **BUILT IN STEP 5c** (CSS variables in `themes.css` + audit token usage).
  - `theme_blood_orange`: **BUILT IN STEP 5c** (CSS variables in `themes.css` + audit token usage).
  - `pack_dark_humour`: **NEEDS BACKEND SUPPORT** -> `available: false` (COMING SOON), documented in `BACKEND_REQUEST.md`.
  - `pack_wholesome`: **NEEDS BACKEND SUPPORT** -> `available: false` (COMING SOON), documented in `BACKEND_REQUEST.md`.
  - `pack_desi`: **NEEDS BACKEND SUPPORT** -> `available: false` (COMING SOON), documented in `BACKEND_REQUEST.md`.
  - `pack_gaming`: **NEEDS BACKEND SUPPORT** -> `available: false` (COMING SOON), documented in `BACKEND_REQUEST.md`.
  - `bundle_starter`: **AVAILABLE** (both `remove_ads_forever` and `unlimited_mood_boards` are working).
  - `bundle_style`: **AVAILABLE** (all 4 themes and Arcade FX are built and working).
  - `bundle_meme_lovers`: **UNAVAILABLE** (`available: false`, COMING SOON - components need backend).
  - `meme_capsule_pro`: **AVAILABLE** (Starter + Style components available; grants `earlyAccess`).
  - `bundle_ultimate`: **UNAVAILABLE** (`available: false`, COMING SOON - meme packs unavailable).

Billing Plugin in use: `@capgo/native-purchases` v8.8.1 (supports Google Play Billing INAPP purchases, querying product details with live formatted prices, querying purchases, auto-acknowledgement, and restore).

---

## Step 1: Catalog (`src/monetization/catalog.ts`) [DONE]
- [x] Created `src/monetization/catalog.ts` with 11 singles and 5 bundles.
- [x] Defined item fields: `id`, `name`, `shortDescription`, `kind`, `rarity`, `grants`, `includes`, `available`, `basePriceINR`.
- [x] Defined Rarity tiers: COMMON (muted #988ca1), RARE (purple #9b30ff), EPIC (pink #dd0061), LEGENDARY (gold #f4c300).
- [x] Enforced availability rules: singles only available if feature works, bundles only available if all components available.

---

## Step 2: Entitlements (`src/monetization/entitlements.ts`) [DONE]
- [x] Built product -> grants mapping with bundle expansion.
- [x] Computed final owned entitlements as UNION of grants from owned products.
- [x] Derived entitlements from Google Play owned purchases; cached in localStorage for fast startup.
- [x] Handled offline mode (use cached entitlements; only revoke upon verified Play check).
- [x] Handled fallback to default if revoked theme/fx is equipped.
- [x] Exposed Context and React hook `useEntitlements()`.
- [x] Exposed helper functions: `owns(id)`, `hasAdsRemoved()`, `boardLimit()`, `ownedThemes()`, `ownedPacks()`, `ownedFx()`.

---

## Step 3: Billing Layer (`src/monetization/billing.ts`) [DONE]
- [x] Loaded live product details for all catalog IDs (formatted price + micros). Display ONLY live formatted price.
- [x] Implemented `purchase(id)` flow handling purchased, cancelled (silent), pending, and failed states.
- [x] Handled PENDING payments: show "PAYMENT PENDING", grant nothing until finalized, reconcile on app resume.
- [x] Automatically acknowledged every successful one-time purchase.
- [x] Implemented `restorePurchases()` with feedback toasts ("PURCHASES RESTORED" / "NOTHING TO RESTORE").
- [x] Gracefully handled billing unavailable: store opens and shows "STORE UNAVAILABLE" without crashes.
- [x] Computed live savings % for bundles: `1 - (bundlePrice / sum(componentPrices))`. Hide if any price is missing.

---

## Step 4: Store UI (`src/components/store/`) [DONE]
- [x] Built full-screen Neo-Brutalist overlay in `src/components/store/`.
- [x] Implemented openStore({ focus?: productId }) and close handling (X button, Android back, re-tap opener).
- [x] Strict neo-brutalist styling: Anton for headings/prices, Oswald for labels, 0 border radius, solid offset shadows, rarity colors.
- [x] Top-to-bottom layout:
  - Header: "CAPSULE STORE" in Anton, X close button.
  - HERO: CAPSULE MAX card (legendary gold, "BEST VALUE" ribbon, includes chips, live savings badge, price button).
  - BUNDLES: Starter, Drip, Meme Head, PRO (with includes chips and live savings badges).
  - UNLOCKS: No Ads, Board Boss, Arcade FX.
  - THEMES: 2-column grid with mini color swatches and PREVIEW button (8-second temporary preview with countdown & auto-revert).
  - MEME PACKS: 2-column grid with COMING SOON badges.
  - Footer: Restore Purchases button and terms note.
- [x] Card states: Live price, OWNED, COMING SOON, Shimmer Loading, PAYMENT PENDING.
- [x] Partial ownership warning on bundles: "YOU ALREADY OWN N OF M ITEMS".
- [x] Neo-brutalist celebratory slam/burst animation on successful purchase (`PurchaseCelebration.tsx`).

---

## Step 5: Feature Gating Implementation [DONE]
- [x] 5a. No Ads: verified suppression across banners and interstitials; rewarded ads stay optional.
- [x] 5b. Mood Boards: inline prompt on 4th board creation ("BOARD LIMIT REACHED (3/3) - GET BOARD BOSS FOR UNLIMITED BOARDS") opening store with focus on `unlimited_mood_boards`.
- [x] 5c. Themes: Added `theme_midnight_gold` and `theme_blood_orange` tokens to `themes.css`. Audited `ThemePicker.tsx` and container `data-theme`.
- [x] 5d. Arcade FX: Implemented 3 extra card entry/recoil animation styles in `MemeStack.tsx` / `MemeCard.tsx` (Classic, Retro Slam, Neon Glitch, Cassette Pop). Settings shake toggle respected.
- [x] 5e. Meme Packs & Drop Modes: Built `DropModeSelector` next to HIT ME. Marked locked modes as COMING SOON. Documented backend requirements in `BACKEND_REQUEST.md`.

---

## Step 6: Entry Points [DONE]
- [x] Header: if not PRO, show neo-brutalist "GO PRO" button. If PRO, show PRO button; clicking either opens store.
- [x] Settings: "CAPSULE STORE" row with arrow opening store; "RESTORE PURCHASES" button calling `restorePurchases()`.
- [x] Contextual triggers: Mood Board cap, Theme picker locked items, Drop mode picker locked items, Arcade FX picker.
- [x] Closing the store returns user to exactly where they were.

---

## Step 7: Android Build Verification [DONE]
- [x] Ran `npm run lint` (`tsc --noEmit`): 0 errors.
- [x] Ran `npm run test:monetization`: 15 of 15 tests passed.
- [x] Ran `npm run build:android`: Vite production bundle built in 1.3s and synced with Capacitor.
- [x] Ran `./gradlew assembleDebug`: Built debug APK successfully without errors.

---

## Step 8: Commit & Update Knowledge [DONE]
- [x] Updated `STORE_TODO.md` with all completed items.
- [x] Updated `.knowledge/MEME_CAPSULE_KNOWLEDGE.md` with store architecture and billing details.
- [x] Ran `./update-knowledge.sh` to sync knowledge repo (new sha: 378d93d).
- [x] All build verification and automated tests passing.
