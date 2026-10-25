# Meme Capsule — Step-by-Step Production Launch Checklist

**Package:** `com.meme.capsule`  
**Prepared:** October 4, 2026  
**Starting build:** v3.5 / version code 26, local monetization test APK  
**Goal:** release rewarded ads and non-consumable purchases through Google Play.

Work through the phases in order. Tick an item only after its expected result
has been observed. Console labels can vary: Google now calls in-app products
**one-time products** in parts of Play Console.

## 0. What is complete, and what is still pending?

| Area | Current status |
| --- | --- |
| Rewarded-ad code, three perks, Store, entitlements, restore, themes | Implemented locally |
| TypeScript, Vite build, Capacitor sync | Passed during implementation |
| Automated tests | 15 monetization tests + 4 browser tests passed; native calls are mocked |
| Android release APK and signature | Built and verified: `builds/meme-capsule-v3.5-monetization-test.apk` |
| Production AdMob rewarded unit | Must be created/configured |
| Five Play products, localized prices and active purchase options | Must be verified in the account |
| Real rewarded video, purchases, pending payments and restore | Not device-tested yet |
| Advertising consent flow | Production follow-up: UMP is not wired in the current ad runtime |
| Production AAB and Play-track testing | Pending |
| Public release | Pending |

**The existing APK uses Google test ads. Build a production-configured AAB after
completing this checklist; renaming the test APK does not change its ad settings.**

Suggested ownership:
- **Release owner:** Play Console, payments, product pricing, launch decisions.
- **Android/frontend:** configuration, missing integration work, builds, device QA.
- **Backend/web:** developer website, privacy content, reporting support, any receipt-verification work.
- **QA:** test accounts, recordings and pass/fail evidence.

## 1. Confirm access and freeze the release rules

1. [ ] Sign in to the existing Meme Capsule Play Console app and verify the
   package is `com.meme.capsule`.
2. [ ] Confirm permissions to manage products, test tracks, orders and releases.
3. [ ] Verify the Google Play payments profile, merchant details, payout account,
   tax information and account verification requirements shown in the console.
4. [ ] Confirm access to the matching AdMob app and its account/payment settings.
5. [ ] Confirm access to `memecapsule.wtf` and `support@memecapsule.wtf`.
6. [ ] Record the highest version code already uploaded to **any** Play track.
   The local code is 26. Any new upload must use an unused version code; choose
   one greater than the existing track versions. Promoting an already-uploaded
   AAB between tracks does not require rebuilding it.
7. [ ] Confirm these product rules match what we want to sell:
   - Free Mood Board creation limit: **3**.
   - Reward: **30 minutes** without automatic ads.
   - Reward: **24 hours** of access to one selected themed pack.
   - Reward: **+1 creation slot for the current session**; saved boards remain.
   - Remove Ads owners retain legacy unlimited Vault and Triple Drop benefits.
   - PRO unlocks all five catalog benefits; the four individual SKUs unlock
     their stated benefits.
   - Paid ad-free owners claim optional reward perks without watching videos.
8. [ ] Review upgrade behavior for people who already have more than three
   boards. The current code preserves all boards but counts them toward the new
   creation limit. If grandfathered creation capacity is desired, implement and
   test it before release.
9. [ ] Confirm banners are **off for the first release**, or explicitly enable
   them and complete the banner-specific tests below. Mediation can follow later.

**Exit condition:** account access works, release version is assigned, and the
catalog/limits are written down consistently with the app.

## 2. Create or verify all Google Play products

Open **Play Console → Meme Capsule → Monetize with Play → Products → One-time
products / In-app products**.

| Exact product ID | Suggested title | What ownership must unlock |
| --- | --- | --- |
| `remove_ads_forever` | Remove Ads Forever | Ad removal + existing Vault/Triple Drop benefits |
| `meme_capsule_pro` | Meme Capsule Pro | Ad removal, unlimited boards, both themes, Vault/Triple Drop |
| `unlimited_mood_boards` | Unlimited Mood Boards | Unlimited board creation |
| `theme_cyberpunk_cyan` | Cyberpunk Cyan | Cyan app accent theme |
| `theme_acid_green` | Acid Green | Green app accent theme |

For **each** row:

1. [ ] Search for the exact ID first. Keep an existing `remove_ads_forever`
   product and its ownership history; do not replace it with a new ID.
2. [ ] If missing, select **Create product** and paste the exact ID from the table.
   Product IDs cannot be renamed later.
3. [ ] Enter an accurate title, description and required localized metadata.
4. [ ] Set it up as a permanent one-time **buy** product. Do not use a subscription
   or rental. Non-consumable behavior is implemented by retaining/acknowledging
   the purchase rather than consuming it; a separate “non-consumable” switch may
   not appear in the console.
5. [ ] If purchase options are shown, create/activate one standard **buy** option
   with the desired regional availability. Keep multi-quantity disabled.
6. [ ] Set the base price and check converted prices, taxes and availability in
   every launch country. Start with one buy option per product to simplify QA.
7. [ ] Price PRO below the combined individual products wherever the Store shows
   **BEST VALUE**. Confirm overlap behavior: there is no automatic partial-bundle
   upgrade discount in the current app.
8. [ ] Save and activate the product and any required purchase option.
9. [ ] Record the product ID, status, base price and enabled countries.

| SKU | Active product/option | Base price | Countries checked | Tested in app |
| --- | --- | --- | --- | --- |
| `remove_ads_forever` | [ ] | Fill in | [ ] | [ ] |
| `meme_capsule_pro` | [ ] | Fill in | [ ] | [ ] |
| `unlimited_mood_boards` | [ ] | Fill in | [ ] | [ ] |
| `theme_cyberpunk_cyan` | [ ] | Fill in | [ ] | [ ] |
| `theme_acid_green` | [ ] | Fill in | [ ] | [ ] |

**Exit condition:** all five products are active and available to the intended
test accounts/countries. The app will display Play's localized prices; no code
price needs editing.

## 3. Finish AdMob configuration

### 3.1 Verify the app and existing interstitial

1. [ ] Open **AdMob → Apps → Meme Capsule** and link/verify the existing Play listing.
2. [ ] Check app readiness, account verification and Policy Center notices.
3. [ ] Compare the app ID in AdMob with
   `android/app/src/main/res/values/strings.xml`:
   `ca-app-pub-2093403233028868~8795588038`.
4. [ ] Confirm the production interstitial unit belongs to that app:
   `ca-app-pub-2093403233028868/3926550523`.

The **app ID** contains `~`; an **ad unit ID** contains `/`. They are not
interchangeable.

### 3.2 Create the rewarded-video unit

1. [ ] Select **Ad units → Add ad unit → Rewarded**.
2. [ ] Choose ordinary rewarded video, not **Rewarded interstitial**.
3. [ ] Give it an identifiable name, such as `meme_capsule_rewarded_perks`.
4. [ ] Configure a positive reward amount, such as `1`, and an appropriate reward
   label. The app determines which of the three perks the user selected.
5. [ ] Save and copy the new ad unit ID into the release configuration as
   `VITE_ADMOB_REWARDED_ID`.
6. [ ] Allow console changes to propagate before diagnosing a no-fill as a code bug.

### 3.3 Verify app-ads.txt

1. [ ] Confirm the Play listing's developer website points to `https://memecapsule.wtf`.
2. [ ] In AdMob, open **Apps → View all apps → app-ads.txt → How to set up**.
3. [ ] Copy the exact publisher snippet provided by the account.
4. [ ] Publish or verify it at `https://memecapsule.wtf/app-ads.txt` in the website
   repository. The endpoint must return the actual text file, not the SPA HTML.
5. [ ] Use AdMob's **Check for updates** when available and verify its status.
   Website/listing changes and crawling can each take time; allow the period
   shown in the console (Google documents up to 24 hours for relevant updates).

### 3.4 Optional banner

1. [ ] If shipping banners, create an Android **Banner** unit in the same AdMob app.
2. [ ] Set `VITE_ADMOB_BANNER_ID` and test the waiting/home placement on devices
   with different navigation bars and display sizes.
3. [ ] If not shipping banners, explicitly leave `VITE_ADMOB_BANNER_ID` empty.

**Exit condition:** the app and units are correctly linked, the rewarded unit
exists, and the chosen banner setting is recorded.

## 4. Close the remaining production integration work

### 4.1 Advertising consent and privacy options

**Current finding:** `src/monetization/adRuntime.ts` initializes AdMob, but the
app does not call UMP consent APIs. The existing privacy-policy agreement and
`npa: true` ad requests are not substitutes for the applicable consent flow.

1. [ ] In **AdMob → Privacy & messaging**, configure the messages required for
   the release countries, including the European regulations message where applicable.
2. [ ] Implement the consent flow with the installed plugin's supported methods:
   `requestConsentInfo()`, `showConsentForm()` and `showPrivacyOptionsForm()`.
   Check its `canRequestAds` and `privacyOptionsRequirementStatus` results.
3. [ ] Refresh consent information each launch and show a form only when required.
4. [ ] Gate every ad request on the resulting ad-request permission. Prevent
   duplicate initialization/requests when consent callbacks and startup overlap.
5. [ ] Add a Settings privacy-options action when the SDK requires one. Keep the
   privacy policy link independently accessible.
6. [ ] Test required/not-required geography, acceptance, available rejection
   choices, reopening privacy options, offline errors and returning users.
7. [ ] Keep debug geography/consent-reset controls out of the public build.

**Exit condition:** live ads are requested only when the SDK permits them, and
users can revisit privacy choices where required.

### 4.2 Make the new pack viewer support reporting

**Current finding:** the pack viewer filters SFW flags and existing blocked URLs,
but its UI currently has only OPEN/NEXT/CLOSE controls around the meme.

1. [ ] Add a report/block entry point for the **displayed pack meme**, reusing the
   app's reporting experience and backend endpoint.
2. [ ] Verify that it reports the pack meme rather than a previously loaded main-feed meme.
3. [ ] After a report, remove that meme from the current pack view and retain its
   local blocklist entry across restart.
4. [ ] Verify moderation/support handling for external Reddit-sourced content,
   including source terms, availability and complaints.
5. [ ] If a pack is unavailable, preserve its unexpired access so users can retry
   without watching another ad; test this on poor connectivity.

### 4.3 Confirm the purchase verification approach

The current implementation queries Play on-device and caches entitlements in
localStorage; it has no server receipt-verification or RTDN service.

1. [ ] Record whether this first release will use the current client-side model
   or include server-side verification. Google recommends a secure backend for
   stronger purchase verification; this is an engineering decision, not a new
   account-system requirement.
2. [ ] If adding a backend, validate package, SKU, purchase token and state with
   Google Play, make processing idempotent, and define one acknowledgement owner.
   Never put Play service-account credentials in Vite variables or the APK.
3. [ ] If retaining the current model, document its trust boundary and verify
   revocation/restore behavior on-device. Do not describe local cache checks as
   server verification.

### 4.4 Signing and release configuration

1. [ ] In Play Console's **App integrity / App signing** page, record the registered
   upload certificate and app-signing certificate fingerprints.
2. [ ] Confirm the release keystore matches the expected **upload** certificate.
   A locally valid APK signature alone does not prove Play will accept an upload.
3. [ ] Move inline signing passwords from `android/app/build.gradle` into the
   team's local/CI secret configuration before sharing the release source.
   Keep a secured backup of the existing key; do not replace it casually.
4. [ ] Confirm target SDK and Billing/Ads SDK versions satisfy the requirements
   displayed by Play Console on the actual submission date.

**Exit condition:** production follow-ups have been implemented/tested, the
verification approach is recorded, and release signing is reproducible.

## 5. Set up real testers and a Play test-track build

1. [ ] Prepare a physical Android device with current Google Play Store/Services,
   plus another device or Play-enabled emulator for device-switch testing.
2. [ ] Add the QA Google accounts under Play Console **Settings → License testing**.
3. [ ] Add those accounts to **Testing → Internal testing → Testers** as well.
   Track access and license-testing status are separate settings.
4. [ ] Use several test accounts so each individual SKU and PRO can be tested
   independently. Owning PRO makes the individual rows appear OWNED.
5. [ ] Build a **test-ad AAB** using `VITE_ADMOB_TEST_MODE=true`, sync Capacitor,
   then run `bundleRelease` from `android/` with Java 21.
6. [ ] Upload that AAB to Internal testing with an unused version code, add release
   notes and publish to testers. This test-ad build will not be promoted to production.
7. [ ] Open the opt-in URL with the test account, join the test and install from
   Google Play. Confirm the expected version is installed.
8. [ ] If a sideloaded APK has a different certificate, use a dedicated test
   device/install before uninstalling it; uninstalling removes local collections.
9. [ ] Open Settings → GO AD-FREE. Confirm all five products have localized prices
   and enabled GET buttons on an eligible account.
10. [ ] Before confirming any transaction, verify the Google purchase sheet shows
    the license-test payment method. Internal-track membership alone does not
    guarantee a transaction is free.

**If products are unavailable:** check package, account used to install, license
tester status, product and buy-option activation, country eligibility, Play Store
version and propagation. Do not work around it by granting local ownership.

## 6. Run device acceptance tests

Record for each case: date, device/Android version, app version code, test account
alias, result and screenshot/video evidence. Do not put purchase tokens or full
payment details in shared QA notes.

### 6.1 Rewarded ads

| Done | Test steps | Expected result |
| --- | --- | --- |
| [ ] | Open MORE → WATCH AD → 30 MIN AD-FREE; finish a test video | One reward; `AD-FREE FOR 30 MIN ✓` |
| [ ] | Close a video before earning a reward | No perk; controls become usable again |
| [ ] | Double-tap a reward button; tap another reward while loading | One fullscreen ad and at most one grant |
| [ ] | Trigger a reward with airplane mode/no-fill | No false success, no stuck loading state |
| [ ] | During the ad-free window, advance through several four-view boundaries | No interstitial; optional banner absent |
| [ ] | Background/reopen while the ad-free window is active | Original expiry retained |
| [ ] | Let 30 minutes expire, then reach the next eligible ad trigger | Automatic ads eligible again unless permanently ad-free |
| [ ] | Unlock CODE CHAOS; then GOOD ENERGY separately | Only the rewarded pack unlocks for its own 24 hours |
| [ ] | Open each pack, advance and reopen the app | Correct category, safe displayable content, remaining access retained |
| [ ] | Let pack access expire, including during a pending request | Locked again; expired response not displayed |
| [ ] | With three boards, earn +1 slot and create a fourth | Fourth succeeds; a fifth needs another slot or ownership |
| [ ] | Background then return; separately force-stop/cold-launch | Background keeps bonus; cold start resets bonus; saved boards remain |
| [ ] | Start with four saved boards after bonus reset and earn one slot | Test current `3 + bonus` arithmetic; if it promises a usable fifth slot but cannot create it, resolve the behavior/copy before release |
| [ ] | Trigger a perk as a paid ad-free owner | Perk granted without showing an ad |

Use accelerated expiry only in an isolated debug/test harness. Also perform one
real-duration 30-minute and 24-hour run before release. Do not shorten production
constants or change the device clock during billing validation.

### 6.2 Purchases and entitlements

For each individual SKU, start with an account that does not own PRO or that SKU.

| Done | Test steps | Expected result |
| --- | --- | --- |
| [ ] | Buy Remove Ads with a license-test payment | OWNED immediately; interstitials stop; visible banner disappears if enabled |
| [ ] | Buy Unlimited Boards from the board-limit prompt | Direct SKU checkout; create fourth/fifth board without restart |
| [ ] | Tap locked Cyberpunk Cyan and buy | That theme's price/checkout; theme applies and persists |
| [ ] | Repeat for Acid Green | Exact second SKU; theme applies and persists |
| [ ] | Buy PRO on a clean account | Ads removed, unlimited boards, both themes and legacy perks; all individual rows OWNED |
| [ ] | Cancel checkout; use a declining test payment | No unlock, no cancellation error toast, controls recover |
| [ ] | Use pending/delayed test payment, then approve outside the app | No access while pending; completed ownership appears on return |
| [ ] | Reject a delayed payment | No entitlement granted |
| [ ] | Double-tap GET or trigger restore during checkout | No overlapping billing flows or duplicate charges |
| [ ] | Reopen the Store for an owned item | OWNED; no second purchase offered |
| [ ] | Kill/reopen around payment completion | Ownership reconciles; no paid item permanently lost |
| [ ] | Inspect completed test orders/acknowledgement | Purchases acknowledged; no auto-refund caused by missing acknowledgement |

### 6.3 Restore after app-data loss and device switch

1. [ ] On a disposable test installation, buy one or more SKUs and record the order.
2. [ ] Clear the app's storage in **Android Settings → Apps → Meme Capsule → Storage**,
   or uninstall and reinstall from the Play test track. This removes local Vault
   and board data; use disposable content.
3. [ ] Launch using the same Google Play account. Startup may restore ownership
   automatically; test **Settings → RESTORE PURCHASES** explicitly as well.
4. [ ] Expect **Purchases restored ✓**, correct OWNED rows and immediate access.
5. [ ] Repeat with PRO and confirm all its entitlements.
6. [ ] Install on the second device with the same Play account; repeat restore.
7. [ ] Use a fresh account with no purchases: expect **No purchases found**.
8. [ ] Try restore offline: show an unavailable/retry result, not a false claim
   that no purchases exist.
9. [ ] Explain in support copy that restoring purchases restores paid access,
   **not** on-device meme collections. The app has no cloud collection backup.

### 6.4 Refunds, offline access and account changes

1. [ ] Refund **and revoke** a test order in Play Console when testing revocation;
   a refund without revocation may not test the same ownership outcome.
2. [ ] Allow Play state to update, reopen/foreground the app, and confirm a
   successful ownership query removes the revoked entitlement.
3. [ ] Verify that revocation never deletes existing boards or Vault contents.
4. [ ] Test a paid user offline before and after the one-hour cache TTL. The
   current design retains the last-known UI snapshot and defers automatic ads
   when a required ownership refresh fails.
5. [ ] Test multiple Play accounts deliberately. Confirm the installer/purchasing
   account is the one used for the expected restore; document account-switch guidance.

### 6.5 UX and core-app regression

- [ ] No Store or paid offer appears automatically on launch or random meme viewing.
- [ ] Settings GO AD-FREE is the single passive Store entry.
- [ ] Board purchase prompt appears after a blocked creation attempt.
- [ ] Theme purchase prompt appears only after tapping a locked theme.
- [ ] Store closes with its close button and Android back; repeat 20 times.
- [ ] Text/prices remain readable on small screens and larger system font sizes.
- [ ] Main random delivery, FIFO refill, swipe gestures and card actions still work.
- [ ] Vault saves, board pins/deletes, Share Sheet drag and gallery download still work.
- [ ] Update an existing install with populated collections and a real legacy
  purchase; verify data survives and legacy paid benefits restore.
- [ ] If banners are enabled, verify no overlap with navigation, packs, buttons,
  consent, Store or share UI, and no reappearance for paid/ad-free-window users.

**Exit condition:** all applicable device cases pass. Any observed defect gets
fixed and its affected cases rerun before building the final candidate.

## 7. Update Play disclosures and release information

1. [ ] Review **App content** declarations: contains ads, target audience, content
   rating, Advertising ID, Data safety and app access.
2. [ ] Update Data safety based on actual app/SDK behavior, including AdMob,
   Play Billing, analytics and reporting. “No app accounts” does not mean no SDK data processing.
3. [ ] Verify `https://memecapsule.wtf/privacy` loads publicly and accurately
   describes the selected ad/consent model, purchases and local storage.
4. [ ] Keep the public support address `support@memecapsule.wtf` reachable.
5. [ ] Update screenshots/descriptions if they promise obsolete prices, old PRO
   benefits or different free limits. Explain one-time purchases clearly.
6. [ ] Prepare reviewer notes: no app login; Store via Settings → GO AD-FREE;
   Restore in Settings; rewarded entry points and board/theme contextual offers.
7. [ ] Complete any account-specific testing/production-access requirements shown
   by Play Console. Do not assume a new-developer closed-test rule applies to
   this already-published app without checking its dashboard.
8. [ ] Draft release notes covering optional rewards, one-time unlocks and restore.

## 8. Build and verify the production candidate

### 8.1 Set final build-time values

Configure these in the release environment or an untracked `.env.production.local`:

```dotenv
VITE_ADMOB_TEST_MODE=false
VITE_ADMOB_REWARDED_ID=<actual rewarded-video unit from AdMob>
VITE_ADMOB_BANNER_ID=
```

Replace the angle-bracket value before building. Set a real banner ID only if
that placement passed QA. The interstitial ID is in `adsConfig.ts`; the AdMob
app ID is in Android `strings.xml`.

1. [ ] Confirm no shell/CI variable overrides test mode back to `true`.
2. [ ] Use an unused version code for this production-configured artifact; do
   not reuse the code of a different uploaded test-ad build.
3. [ ] Update the displayed Settings version along with `android/app/build.gradle`.
4. [ ] Confirm no demo ownership flags, shortened reward durations, debug consent
   geography or purchase-bypass code is included.

### 8.2 Run checks sequentially

From the repository root:

```sh
npm ci
npm run lint
npm run test:monetization
npm run test:monetization-ui
npm run build
npx cap sync android
```

On a new QA machine, install the Playwright Chromium browser first with
`npx playwright install chromium`. Use Node compatible with the locked tooling
(the validated environment used Node 22.23.2).

Keep browser tests separate from build/sync: Vite development hot reload can
reload the test page when Capacitor output HTML changes.

From the **`android/` directory**, using Java 21:

```sh
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ./gradlew --no-daemon bundleRelease assembleRelease
```

Use the local Java 21 path on other machines. Outputs:

- **Play upload:** `android/app/build/outputs/bundle/release/app-release.aab`
- **Local install artifact:** `android/app/build/outputs/apk/release/app-release.apk`

### 8.3 Inspect the artifacts

1. [ ] Verify package, version code/name, target SDK and Billing permission.
2. [ ] Verify the APK with Android SDK `apksigner verify --verbose`.
3. [ ] Verify the AAB signature/upload certificate and validate the bundle with
   the team's bundletool tooling or Play's upload validation. `apksigner` is for
   APKs, not AABs.
4. [ ] Confirm the packaged web assets use the production configuration, with a
   nonempty rewarded ID and test mode disabled.
5. [ ] Record hashes, build commands, environment settings, signing fingerprint,
   source revision/snapshot and QA results so this exact release is reproducible.

## 9. Test the exact production-configured AAB in Play

1. [ ] Upload the production-configured AAB to Internal testing first.
2. [ ] Register QA devices as **AdMob test devices** in the AdMob console so the
   app can use real production unit IDs while those devices receive test ads.
   This is separate from Play license testing. Allow registration to propagate.
3. [ ] Install the Play-delivered build, verify its version, and repeat the key
   purchase, reward, restore, consent and update-preservation smoke cases.
4. [ ] Confirm test ad labeling/status before interacting with ads. Do not click
   live ads to test revenue or simulate user traffic.
5. [ ] Review the Play pre-launch report, device compatibility and policy/SDK warnings.
6. [ ] Resolve failures. If code/config changes, produce a new versioned artifact
   and repeat the affected tests.

**Exit condition:** the exact AAB selected for production passed Play-delivered
testing. Google sample-unit test builds are never promoted by mistake.

## 10. Release gradually and monitor

1. [ ] Confirm the final sign-off checklist below and choose release countries.
2. [ ] Select/promote the verified production-configured AAB into the production
   release; add notes and submit for review. Use managed publishing if timing matters.
3. [ ] Start with a staged rollout when available for this update. A practical
   plan is **5% → 20% → 50% → 100%**, increasing only after reviewing results;
   use the options offered by the console rather than assuming every percentage
   is available for every release.
4. [ ] During the first 24–48 hours, check Android vitals, billing/support issues,
   restore failures, AdMob request/fill/impression trends and Policy Center.
5. [ ] Compare ad behavior for free, temporary ad-free and paid users. Test-ad
   impressions will not prove production revenue; reporting also has latency.
6. [ ] Watch for incorrect unlocks, paid users seeing ads, lost collections,
   duplicate transactions or consent problems. Halt expansion if any occurs.
7. [ ] Prepare a hotfix with a higher version code if needed. Halting rollout
   prevents further distribution; it does not downgrade already-updated devices.
8. [ ] Do not remove sold SKUs/restore support or roll customers back to a build
   that cannot honor their new purchases. The app currently has no remote
   monetization kill switch; document which fixes require a new binary.

### Final sign-off

- [ ] All five products are active and priced correctly.
- [ ] Production rewarded ID is set; chosen banner configuration is verified.
- [ ] Applicable consent messages, SDK gating and privacy options work.
- [ ] Pack reporting/blocking works for the actual displayed meme.
- [ ] All three rewards grant/expire correctly on-device.
- [ ] Interstitial/banner suppression works for temporary and paid access.
- [ ] Every SKU, PRO mapping, cancellation and pending-payment path passes.
- [ ] Reinstall and second-device restore pass with real Play test purchases.
- [ ] Existing collections and legacy purchases survive an upgrade.
- [ ] Store entry points remain contextual as specified.
- [ ] Privacy, Data safety, listing and reviewer notes are current.
- [ ] Production AAB uses correct signing, version and production configuration.
- [ ] Exact artifact passed test-track validation; rollout/support owner assigned.

**Release owner:** __________________  **QA owner:** __________________  
**Approved version code:** __________  **Approval date:** ______________

## Later phase: mediation and further hardening

These are follow-up work, unless explicitly brought into this release:

- AdMob mediation groups for additional demand. AdMob stays the mediation
  controller; adding AppLovin demand through it is not a switch to MAX as the
  app's primary controller. Install any required native network adapters/SDKs
  and test them in a separate build before enabling their traffic.
- Server-side receipt verification / RTDN if deferred in step 4.3.
- Reward server-side verification and stronger expiry/account-abuse controls.
- A remote configuration strategy for future ad/offer changes.

## Reference links

- [Implementation notes and current APK](MONETIZATION.md)
- [Create Google Play in-app/one-time products](https://support.google.com/googleplay/android-developer/answer/1153481)
- [Google Play Billing testing guide](https://developer.android.com/google/play/billing/test)
- [Google Play Billing security recommendations](https://developer.android.com/google/play/billing/security)
- [Google AdMob UMP consent integration](https://developers.google.com/admob/android/privacy)
- [Google AdMob test ads and test devices](https://developers.google.com/admob/android/test-ads)
- [Set up app-ads.txt](https://support.google.com/admob/answer/9363762)

Console screens are authoritative for account-specific status. No console
changes, purchases, uploads or public release actions were performed while
preparing this document.
