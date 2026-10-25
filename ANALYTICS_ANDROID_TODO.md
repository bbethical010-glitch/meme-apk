# Android Analytics Modernization & Hardening TODO

## Progress Checklist

- [x] **STEP 0 - READ AND RECORD** [DONE]
- [x] **STEP 1 - COMPATIBILITY REPORT** [DONE]
- [x] **STEP 2 - FLUSH CADENCE** [DONE]
- [x] **STEP 3 - RESILIENT UPLOAD** [DONE]
- [x] **STEP 4 - TIMESTAMPS AND CLOCK** [DONE]
- [x] **STEP 5 - INPUT HYGIENE** [DONE]
- [x] **STEP 6 - EVENT COVERAGE AND SESSIONS** [DONE]
- [x] **STEP 7 - TOKEN AND ENVIRONMENTS** [DONE]
- [x] **STEP 8 - PRIVACY REGRESSION TESTS** [DONE]
- [x] **STEP 9 - TESTS** [DONE]
- [x] **STEP 10 - DEVICE TEST PLAN** [DONE]
- [x] **STEP 11 - RELEASE PREP** [DONE]

---

## Step 0: Baseline Analytics Architecture & Specifications

### 1. Current Flush Triggers and Intervals
- **Android Native Layer (`AnalyticsManager.java` & `MainActivity.java`):**
  - **Periodic Timer:** Scheduled executor (`ScheduledExecutorService`) running `flushSync()` every `30` seconds (`AnalyticsConstants.FLUSH_INTERVAL_SECONDS = 30L`) with fixed delay.
  - **Batch Threshold Trigger:** Evaluated on every `trackEventInternal()` call; triggers `flushSync()` when queue size reaches 50 events (`AnalyticsConstants.FLUSH_THRESHOLD = 50`).
  - **Lifecycle Triggers:**
    - `trackAppOpen()` triggers an immediate `flush()`.
    - `MainActivity.onPause()` invokes `trackAppBackground()` followed by `flush()`.
    - `MainActivity.onDestroy()` or `onPause(isFinishing == true)` invokes `endSession()` followed by `flush()`.
  - **Bridge Trigger:** JavaScript calls `window.MemeCapsuleAnalytics.flushQueue()` which delegates to `analyticsManager.flush()`.
- **TypeScript / Web Fallback (`useAnalytics.ts` & `analyticsFlush.ts`):**
  - **Periodic Timer:** `setInterval` running every 30,000 ms (30 s).
  - **Queue Threshold Trigger:** Evaluated in `trackEvent()`; triggers `flush()` when `queue.size() >= 50`.
  - **Visibility Change:** `document.addEventListener('visibilitychange')` on `hidden` tracks `app_background` and calls `flush()`.
  - **Window Lifecycle:** `beforeunload` calls `endSession()` and flushes.

### 2. Batch Size and Byte Limits
- **Batch Count Cap:** `MAX_BATCH_SIZE = 200` events per request (`AnalyticsConstants.MAX_BATCH_SIZE` and `analyticsQueue.ts: MAX_BATCH_SIZE`).
- **Batch Byte Cap:** `MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024` (2 MiB) enforced during batch serialization before HTTP dispatch (`AnalyticsUploader.java` and `analyticsFlush.ts`).

### 3. Retry/Backoff and HTTP Status Code Handling
- **Backoff Formula:**
  - `INITIAL_BACKOFF_MS = 2000L` (2 seconds).
  - `delay = INITIAL_BACKOFF_MS * (1L << Math.min(consecutiveErrors - 1, 6))`
  - Step progression: 2s, 4s, 8s, 16s, 32s, 64s, capped at `MAX_BACKOFF_MS = 120000L` (120 s / 2 minutes).
- **HTTP Status Code Mapping:**
  - **2xx (Success):** Atomic removal of accepted `eventIds` from SQLite/memory queue; increments `acceptedCount` diagnostics; resets `consecutiveErrors = 0` and `nextAllowedFlushTimeMs = 0`.
  - **400 Bad Request:** Treated as permanent schema/validation failure; batch is discarded via `removeEvents()` to prevent infinite blocking; increments `rejectedCount` diagnostics; sets `lastError`.
  - **401 Unauthorized / 403 Forbidden:** Treated as authentication or token invalidation; calls `authProvider.onAuthFailure()`; sets `isAuthDisabled = true`; prevents further upload attempts while retaining events in the queue.
  - **413 Payload Too Large:** Not handled separately; falls into general server error handler (retains events and applies exponential backoff).
  - **429 Too Many Requests:** Retains events in queue; increments `consecutiveErrors`; applies exponential backoff (up to 120 s).
  - **5xx / Network Failures:** Retains events in queue; increments `consecutiveErrors`; applies exponential backoff (up to 120 s); sets `lastError`.

### 4. Queue Bounds & Eviction Policy
- **Maximum Queue Size:** `MAX_QUEUE_SIZE = 1000` events in both Android SQLite (`AnalyticsDbHelper.java`) and TypeScript (`analyticsQueue.ts`).
- **Eviction Strategy:** First-In, First-Out (FIFO). When enqueued events exceed capacity, the oldest events ordered by `created_at ASC` are deleted (`DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY created_at ASC LIMIT excess)`), and `droppedCount` diagnostics is incremented.

### 5. Timestamp Production
- **Format:** UTC ISO-8601 with millisecond precision: `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`.
- **Generation:** Stamped immediately at event object creation time:
  - Java: `SimpleDateFormat` with `Locale.US` and `TimeZone.getTimeZone("UTC")` applied to `new Date()`.
  - TypeScript: `new Date().toISOString()`.
- Stored as string in event model and SQLite database.

### 6. App Version Production
- **Native Android:** Injected from `BuildConfig.VERSION_NAME` in `AnalyticsManager.java` (defined in `android/app/build.gradle`).
- **TypeScript Layer:** Managed in event builder interface.

### 7. Token and Endpoint Build Injection
- Configured in `android/app/build.gradle`:
  - `debug`: points to staging endpoint `https://meme-capsule-eww.pages.dev/api/analytics/events` with staging token `mc_staging_token_v1`.
  - `release`: points to production endpoint `https://memecapsule.wtf/api/analytics/events` with injected production token.
  - **Release Task Guard:** `gradle.taskGraph.whenReady` checks if any task contains `"release"`. If token is empty, blank, or contains `"placeholder"`, Gradle throws a `GradleException`. Furthermore, endpoint cannot point to `localhost` or `http://`.

### 8. Emitted Events and Associated Properties
The contract allowlist defines 19 events (`AnalyticsConstants.ALLOWED_EVENTS` and `ALLOWED_EVENT_NAMES`):
1. `app_open`: `sourceChannel: "app"`, `screenName: "app"`, properties `{}`
2. `app_background`: `sourceChannel: "app"`, `screenName: "app"`, properties `{}`
3. `session_start`: `screenName: "app"`, properties `{}`
4. `session_end`: `screenName: "app"`, properties `{}`
5. `meme_view`: `memeId`, `category`, `screenName: "deck"`; legacy calls may include `{ duration_ms: number }`
6. `meme_like`: `memeId`, properties `{ action: "like" | "unlike" }` or `{ reaction: true }`
7. `meme_share`: `memeId`, `sourceChannel: string`
8. `meme_save`: `memeId`, properties `{ destination: "vault" | "download" }` or `{ action: "download" }`
9. `meme_scroll`: `memeId`, properties `{ direction: "next" | "keep" | "skip" }`
10. `category_click`: `category: string`
11. `onboarding_complete`: `screenName: "onboarding"`
12. `profile_open`: `screenName: "profile"`
13. `subscription_click`: `screenName: "store"`, properties `{ sku: string }`
14. `screen_view`: `screenName: string` (`'home'`, `'vault'`, `'boards'`, `'store'`, `'settings'`)
15. `feed_refresh`: `screenName: "home"`
16. `meme_reported`: `memeId`, properties `{ reason: string }`
17. `ad_impression`: properties `{ ad_type: "rewarded" | "banner" | "interstitial" }`
18. `ad_reward_viewed`: properties `{ reward_type: string }`
19. `retention_checkin`: properties `{ streak: number }`

### 9. Session Definition & Lifecycle
- **Native Android (`AnalyticsManager.java` & `MainActivity.java`):**
  - Session is tracked by a unique UUID string (`currentSessionId`).
  - `startSession()` creates a new UUID and logs `session_start`.
  - In `MainActivity.java`, warm process detection, saved instance bundle, and recent external share returns (`sLastShareIntentTimestamp` < 120s) restore session continuity (`mShouldRestoreRunningSession`).
  - 30-minute background timeout: If app is backgrounded for > 30 minutes, a new session is started upon returning to foreground. Shorter pauses continue the existing session.
  - In `onPause()`: if activity `isFinishing()` the session ends via `endSession()`; otherwise `app_background` is recorded and session remains intact.
  - In `onDestroy()`: if `isFinishing()`, `endSession()` logs `session_end` and flushes.
- **TypeScript (`useAnalytics.ts`):**
  - Generates a UUID for `sessionId` on `AnalyticsService` initialization.
  - 30-minute background threshold tracked via `lastBackgroundTimestampMs`.
  - `beforeunload` or visibility exit triggers `endSession()`.

---

## Token Rotation Procedure (Step 7 Reference)

1. **Dual-Token Backend Acceptance:** The Cloudflare Pages ingestion endpoint validates `X-Analytics-App-Token` against both `ANALYTICS_APP_TOKEN_CURRENT` and `ANALYTICS_APP_TOKEN_PREVIOUS`.
2. **Client Token Update:** The new token is configured in release build parameters for the new APK release (e.g. `v3.8`).
3. **Staged Deployment:** The new build is rolled out to production users while older installs continue transmitting using the previous token.
4. **Backend Deprecation:** After rollout reaches saturation and older version traffic falls below threshold, the previous token is removed from backend environment configuration.

---

## Release Prep Summary (Step 11 Reference)

- **Version Increment:**
  - `versionCode`: Bumped from `28` to **`29`**
  - `versionName`: Bumped from `"3.7"` to **`"3.8"`**
- **Release Bundle Artifact:** Built successfully via `./gradlew bundleRelease -PANALYTICS_APP_TOKEN=...`:
  - Path: `android/app/build/outputs/bundle/release/app-release.aab` (7.68 MB)
- **Deployment Strategy Recommendation:**
  - **Initial Rollout:** 10% to 20% staged rollout on Google Play Console.
  - **Health Monitoring:** Watch the dashboard's pipeline health card for `rejected-by-reason` metrics:
    - `rejected_future_timestamp`: Must remain 0 (clamping & clock offset active).
    - `rejected_stale_timestamp`: Must remain 0 (23h drop active).
    - `rejected_unknown_event`: Must remain 0 (strict local allowlist active).
    - `rejected_invalid_property`: Must remain 0 (strict property allowlist and scalar truncation active).
    - `rejected_rate_limit`: Must remain 0 (client-side 600/hr rate limiter active).
  - **Expansion:** If reject rates remain 0% over 24 hours, expand staged rollout to 50%, then 100%.
