# Meme Capsule monetization — local v3.5 / build 26

For the ordered console setup, remaining integration work, device QA and release
process, follow [the production launch checklist](PRODUCTION_LAUNCH_CHECKLIST.md).

## Required console setup

**Google Play Console → Monetize → Products → In-app products:** create and
activate these exact **one-time / non-consumable** products for `com.meme.capsule`.
Set prices and countries, and activate the buy purchase option if the console
uses the newer one-time product UI. The app never consumes these purchases.

| Product ID | Entitlement |
| --- | --- |
| `remove_ads_forever` | Permanent ad removal; retains previously promised unlimited Vault / Triple Drop |
| `meme_capsule_pro` | All individual entitlements plus legacy Vault / Triple Drop |
| `unlimited_mood_boards` | Unlimited board creation |
| `theme_cyberpunk_cyan` | Cyberpunk Cyan app accent theme |
| `theme_acid_green` | Acid Green app accent theme |

Prices come from Play's localized `priceString`. A missing/unavailable product
has a disabled GET button and retry action; no invented prices or web purchases.
The BEST VALUE badge assumes the console bundle price is lower than the combined
individual prices; set regional bundle pricing accordingly.

Upload a matching signed build to a Play testing track, add license testers,
and install through that track for real purchase/restore verification. Use the
same Play account after reinstall/device switch. App accounts are not needed.

**AdMob:** create a **Rewarded Video** ad unit and set `VITE_ADMOB_REWARDED_ID` at
build time. The old rewarded-interstitial ID is not suitable for this API.
Interstitial production ID remains in `src/monetization/adsConfig.ts`.
`VITE_ADMOB_BANNER_ID` is optional: the original app had no banner. Setting it
enables a guarded waiting/home placement, hidden behind dialogs, rewards and
ad-free ownership/windows. The local APK leaves banners disabled by default.

Development or `VITE_ADMOB_TEST_MODE=true` uses Google's sample interstitial and
rewarded IDs (and sample banner ID if banner placement is enabled). Test ads do
not simulate billing or confer purchases. Production leaves rewards unavailable
until a real rewarded unit is configured.

Phase 2 mediation groups are configured in the AdMob console with stable
format-specific AdMob units. Meta/AppLovin adapters, if required by a network,
still need a separate native dependency/release; this task adds no network SDKs.

## Runtime design

- `src/monetization/entitlements.ts` is the ownership source. Queries current
  Play INAPP purchases, accepts only state `1` (PURCHASED), and caches product
  IDs for one hour. Concurrent requests are deduplicated. A successful empty
  query removes revoked ownership. Query failure retains the last known UI
  snapshot and suppresses automatic ads until ownership can be reconciled.
- The old `is_pro` flag is not proof of purchase (the previous browser flow
  could set it without payment). Real legacy owners regain the original SKU's
  promised features through Play. No Vault/board contents or storage formats
  are migrated or removed.
- `billing.ts` serializes native BillingClient operations and acknowledges
  completed purchases, including unfinished purchases found on resume/restore.
  `@capgo/native-purchases` 8.8.1 was verified on npm (Capacitor >=8) and installed.
- `purchaseProduct()` filters pending purchases, prevents concurrent flows,
  publishes completed ownership immediately, and reconciles with Play. Cancel
  and failure grant nothing and display no error toast. Already-owned errors
  trigger a real ownership query rather than trusting the error message.
- `restorePurchases()` explicitly queries owned non-consumables; the native
  plugin's `restorePurchases()` returns void. Success emits “Purchases restored ✓”
  or “No purchases found”. A failed query is never called “No purchases found”.
- Startup/foreground and TTL reconciliation handle purchases completed outside
  the active UI. This is client-side Play Billing; server receipt verification
  is not implemented by this task.
- Store is a dedicated full-screen view reached from Settings. Settings has
  one passive GO AD-FREE row and a RESTORE PURCHASES action. Board-limit and
  locked-theme offers are specific inline SKU controls. Old header/intro upsells
  and automatic Vault/Triple Drop purchase modals are no longer entry points.

## Reward semantics

- `meme_capsule_adfree_until`: 30 minutes after a confirmed reward; suppresses
  interstitials and the optional banner. Suppression is rechecked after load.
- `meme_capsule_pack_{packId}_until`: 24 hours. CODE CHAOS and GOOD ENERGY use
  verified themed-subset endpoints `/gimme/ProgrammerHumor` and
  `/gimme/wholesomememes`. Requests enforce the selected subreddit, SFW,
  non-spoiler, displayable media and the local report blocklist. Pack access is
  checked before and after requests and on display. Packs have a separate
  viewer; the random-meme fetch logic and rolling FIFO are unchanged.
- `meme_capsule_bonus_boards`: integer in localStorage, reset once per JS cold
  start and on the native reset-to-home signal. Backgrounding preserves it.
  Creation limit is **3 + session bonus**, or unlimited with the SKU. Existing
  boards are kept even when a bonus expires; they still count toward the limit.
- Rewards require a real earned-reward callback, never merely ad presentation.
  Early dismiss/no-fill grants nothing. Full-screen ads are mutually exclusive.
  Paid ad-free owners can claim these optional perks directly without a video.

## Local verification

```sh
npm run lint
npm run build
npm run test:monetization
npm run test:monetization-ui
```

15 native-boundary/unit tests and 4 Chromium UI tests cover 20 Store
open/close cycles, no unsolicited offers, SKU-specific contextual controls,
one-hour cache/refund handling, time boundaries, session reset, pending/cancel
handling, bundle mapping, and restore after clearing simulated storage.
Native SDK calls are mocked in unit tests; they do not prove a live transaction.

### Required device checks (pending)

No Android device or AVD was available during implementation. Before release:

- [ ] Complete a Google test rewarded video; confirm exactly one reward.
- [ ] Close early, fail a load, and double tap: no accidental/duplicate rewards.
- [ ] Validate 30-minute expiry, 24-hour pack expiry, and cold-start slot reset.
- [ ] Confirm interstitial and configured banner suppress during ad-free access;
      buy Remove Ads with a banner visible and verify it disappears immediately.
- [ ] Complete/cancel each license-test purchase; UI must update without restart.
- [ ] Complete a pending payment outside the app, resume, verify acknowledgement.
- [ ] Clear **test installation** app data/reinstall, reopen, restore with the same
      Play account; verify bundle restores all individual entitlements.
- [ ] Verify refunded ownership is removed on a successful foreground query.

## Local APK build

```sh
VITE_ADMOB_TEST_MODE=true npm run build
npx cap sync android
# macOS: use Android Studio's Java 21 runtime
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ./gradlew --no-daemon assembleRelease  # run with android/ as working directory
```

The resulting `android/app/build/outputs/apk/release/app-release.apk` uses the
repository's existing release signing configuration and **test ads**. This APK
is for local monetization testing, not a production monetization rollout.

### Built artifact — October 4, 2026

- **APK:** `builds/meme-capsule-v3.5-monetization-test.apk`
- **Package:** `com.meme.capsule`, version `3.5`, version code `26`
- **Size:** 6,071,994 bytes (approximately 5.79 MiB)
- **Signature:** `apksigner verify --verbose` passed (APK Signature Scheme v2)
- **Manifest:** checked with `aapt dump badging`; Billing permission present,
  minimum SDK 24, target SDK 36
- **SHA-256:** `3ed103c5f8d4cba0028adbacb24a0d3a9e3a4a51de167852bacc8b208b96aa03`
- Android `assembleRelease` completed successfully with the installed Java 21
  runtime. Source and shared-knowledge changes were kept local as requested.
