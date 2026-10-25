# Meme Capsule Android — Analytics Device Staging Verification Test Plan

**Scope:** Package `com.meme.capsule` (Capacitor 8 + Native Android SQLite Analytics Queue)  
**Target Environment:** **STAGING ONLY**  
**Staging Endpoint:** `https://meme-capsule-eww.pages.dev/api/analytics/events`  
**Staging Token:** Injected via debug build variant (`mc_staging_token_v1`)  
**Strict Safety Rule:** Never test with production credentials or against the production dashboard. Debug logging displays event names, counters, and HTTP response codes only (zero tokens, user hashes, or session IDs).

---

## 1. Test Environment Setup & Pre-Flight Checks

1. Build & install the debug APK on a physical Android device or virtual device (API 34+):
   ```bash
   npm run build:android
   cd android && ./gradlew installDebug
   ```
2. Confirm device connectivity to the staging endpoint:
   ```bash
   adb logcat -c
   adb logcat -s MemeCapsule:D
   ```
3. Open the Staging Real-Time Dashboard Live Feed in a browser to observe incoming events in real time.

---

## 2. Test Execution Matrix (Tick-Box Table)

| Status | Test Scenario | Step-by-Step Procedure | Expected Result | Pass Criteria |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | **Scenario 1: Live Feed Delivery within 30 s** | 1. Launch app with consent granted.<br>2. Tap on 3 memes in the deck to trigger `meme_view` and `meme_like`.<br>3. Keep app in foreground and observe staging live feed. | Events coalesce via foreground cadence (20 s + 0–5 s jitter or 10+ debounce) and flush to staging. | Events appear in dashboard live feed within $\le 30\text{ s}$ of execution. |
| [ ] | **Scenario 2: Offline Queue & Drain (Airplane Mode)** | 1. Enable Airplane Mode on device.<br>2. Scroll through 5 memes, liking 2 and saving 1.<br>3. Observe that events persist in local SQLite table `analytics_events`.<br>4. Re-enable network connectivity / disable Airplane Mode. | 1. HTTP sends fail safely with network error, initiating exponential backoff (5 s, 10 s, ...).<br>2. When network is restored, queue drains automatically on the next periodic interval or lifecycle event. | Zero lost events; all queued actions successfully upload upon network restoration. |
| [ ] | **Scenario 3: App Kill Persistence (Cold Launch)** | 1. Perform 4 distinct interactions in the app while offline or before the flush timer fires.<br>2. Force-stop the app via Android Settings or `adb shell am force-stop com.meme.capsule`.<br>3. Relaunch the application (`adb shell am start -n com.meme.capsule/.MainActivity`). | On app launch, `AnalyticsManager` and `AnalyticsDbHelper` initialize, peek the cold SQLite queue, track `app_open` and `session_start`, and flush the persisted events immediately. | Cold-persisted events arrive intact with original `timestamp_utc` and `session_id`. |
| [ ] | **Scenario 4: Revoke Consent Purge** | 1. Navigate to App Settings / Consent Modal.<br>2. While non-uploaded events are pending in queue, toggle Analytics Consent to **Denied**.<br>3. Inspect database and attempt new actions. | 1. `setConsent(false)` purges the SQLite `analytics_events` table and in-memory queue immediately.<br>2. Background WorkManager tasks and foreground flush timers are cancelled.<br>3. Subsequent actions return early without creating event records. | Queue size drops to 0; no further HTTP requests or events are emitted. |
| [ ] | **Scenario 5: Wrong Token / Auth Rejection (No Hot Loop)** | 1. Install a test build with an invalid token (e.g. `mc_invalid_test_token`).<br>2. Trigger an action to induce an upload attempt.<br>3. Backend returns `HTTP 401 Unauthorized` or `HTTP 403 Forbidden`. | 1. Client enters auth failure state: upload stops immediately.<br>2. Cooldown timer set to 6 hours (doubling up to 24 hours).<br>3. Events remain safely in SQLite queue (subject to 5,000 cap). | **Zero hot looping**: No repeated requests are sent to the server. |
| [ ] | **Scenario 6: 429 Rate Limit & Retry-After** | 1. Simulate server returning `HTTP 429 Too Many Requests` with header `Retry-After: 30` (or 30s HTTP date).<br>2. Trigger rapid user gestures. | 1. Client parses `Retry-After` header (30 s) and sets `nextAllowedFlushTimeMs = now + 30000`.<br>2. All flush triggers are paused until the 30-second window expires.<br>3. If `Retry-After` is missing, defaults to 60 s. | Zero attempts during the cooldown window; queue drains smoothly after wait expires. |
| [ ] | **Scenario 7: Clock Skew Correction (Device 10 min Ahead)** | 1. In Android Settings, disable automatic time and manually set device clock 10 minutes into the future.<br>2. Trigger a successful upload.<br>3. Inspect HTTP response `Date` header and subsequent events. | 1. Client compares server `Date` header with device clock; computes `offset = serverTime - deviceTime` ($\approx -600\text{ s}$).<br>2. Since $\|offset\| > 60\text{ s}$, offset is persisted in SharedPreferences.<br>3. Subsequent events apply offset; future timestamps are clamped to $\le (\text{device now} + \text{offset} + 60\text{ s})$.<br>4. Header `X-Client-Sent-At` reflects corrected UTC now. | Events accepted by backend without triggering the 5-minute future rejection rule. |
| [ ] | **Scenario 8: 23-Hour Expiry Drop (No Stale Loops)** | 1. Insert an event into SQLite with a timestamp 24 hours in the past (`now - 86,400,000 ms`).<br>2. Insert a fresh event (`now - 1,000 ms`).<br>3. Trigger `flushQueue()`. | 1. `dropExpiredEvents()` executes prior to batching; deletes the 24h event from SQLite and increments the dropped counter.<br>2. Only the fresh event is packaged and sent to the server. | Stale event is discarded locally without blocking the queue or looping forever. |
| [ ] | **Scenario 9: Poison Batch Bisection (400/422 Resilience)** | 1. Queue a batch containing 1 invalid event (e.g. invalid name or oversized payload) along with valid events.<br>2. Server responds with `HTTP 400 Bad Request`. | 1. Client detects 400/422 and immediately halts batch retry.<br>2. Recursively bisects the batch into halves.<br>3. Valid half is sent and accepted (HTTP 200).<br>4. Invalid half isolates the single bad event, confirms rejection, drops only the bad event, and increments `poisonDropCount`. | Good events are delivered; poison event never blocks the queue. |
| [ ] | **Scenario 10: Client-Side Hourly Rate Limit (600/hr)** | 1. Rapidly emit 650 events in a simulated loop within 5 minutes. | 1. `HourlyRateLimiter` permits the first 600 events.<br>2. Events 601–650 are dropped client-side and counted.<br>3. Server 1,500/hr quota is never breached. | Client-side protection prevents runaway client loops from overloading backend quotas. |

---

## 3. Logcat Verification Signatures (Debug Builds Only)

```text
# Normal Flush Success:
D/MemeCapsule: [AnalyticsManager] Flushing queue (size=3)
D/MemeCapsule: [AnalyticsUploader] Sending chunk 1 of 1 (3 events, 1248 bytes)
D/MemeCapsule: [AnalyticsUploader] Upload successful (HTTP 200). Accepted 3 events.

# 429 Rate Limiting:
D/MemeCapsule: [AnalyticsUploader] HTTP 429 Rate Limited. Retry-After parsed: 30000ms. Cooldown active.

# Clock Skew Adjustment:
D/MemeCapsule: [ClockOffsetManager] Detected significant server clock offset: -600120ms. Persisted.

# Poison Event Bisection:
D/MemeCapsule: [AnalyticsUploader] HTTP 400 received. Initiating recursive bisection...
D/MemeCapsule: [AnalyticsUploader] Isolated poison event bad_ev_1. Dropped from SQLite queue.
```
