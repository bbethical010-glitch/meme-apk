package com.meme.capsule.analytics;

import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.WorkManager;

import com.meme.capsule.BuildConfig;
import com.meme.capsule.analytics.auth.AnalyticsAuthProvider;
import com.meme.capsule.analytics.auth.StaticTokenAuthProvider;

import org.json.JSONObject;

import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class AnalyticsManager {
    private static final String TAG = "AnalyticsManager";
    public static final String UNIQUE_WORK_NAME = "analytics_background_flush";

    private static volatile AnalyticsManager sInstance;

    private final Context context;
    private final IdentityManager identityManager;
    private final ConsentManager consentManager;
    private final AnalyticsDbHelper dbHelper;
    private final AnalyticsDiagnostics diagnostics;
    private final AnalyticsAuthProvider authProvider;
    private final AnalyticsUploader uploader;
    private final ClockOffsetManager clockOffsetManager;
    private final HourlyRateLimiter hourlyRateLimiter;
    private final ScheduledExecutorService executor;

    private String currentSessionId;
    private boolean isSessionActive = false;
    private volatile boolean isForeground = true;
    private volatile long lastBackgroundTimestampMs = 0L;

    private ScheduledFuture<?> foregroundFlushFuture = null;
    private ScheduledFuture<?> debounceFlushFuture = null;
    private final AtomicBoolean isDebounceScheduled = new AtomicBoolean(false);

    public static AnalyticsManager getInstance(Context context) {
        if (sInstance == null) {
            synchronized (AnalyticsManager.class) {
                if (sInstance == null) {
                    sInstance = new AnalyticsManager(context.getApplicationContext());
                }
            }
        }
        return sInstance;
    }

    private AnalyticsManager(Context context) {
        this.context = context;
        this.identityManager = new IdentityManager(context);
        this.consentManager = new ConsentManager(context);
        this.dbHelper = new AnalyticsDbHelper(context);
        this.diagnostics = new AnalyticsDiagnostics();
        this.clockOffsetManager = new ClockOffsetManager(context);
        this.hourlyRateLimiter = new HourlyRateLimiter();

        String endpoint = BuildConfig.ANALYTICS_ENDPOINT;
        String token = BuildConfig.ANALYTICS_APP_TOKEN;
        this.authProvider = new StaticTokenAuthProvider(token);
        this.uploader = new AnalyticsUploader(endpoint, authProvider, dbHelper, diagnostics, consentManager, clockOffsetManager);

        this.executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "AnalyticsWorker");
            t.setDaemon(true);
            return t;
        });

        // Initialize foreground schedule
        scheduleForegroundPeriodicFlush();
    }

    // Constructor for testing with dependency injection
    public AnalyticsManager(Context context, IdentityManager identityManager, ConsentManager consentManager,
                            AnalyticsDbHelper dbHelper, AnalyticsDiagnostics diagnostics, AnalyticsUploader uploader,
                            ScheduledExecutorService executor) {
        this.context = context;
        this.identityManager = identityManager;
        this.consentManager = consentManager;
        this.dbHelper = dbHelper;
        this.diagnostics = diagnostics;
        this.uploader = uploader;
        this.clockOffsetManager = (uploader != null && uploader.getClockOffsetManager() != null)
                ? uploader.getClockOffsetManager()
                : new ClockOffsetManager((Context) null);
        this.hourlyRateLimiter = new HourlyRateLimiter();
        this.authProvider = (uploader != null && uploader.getAuthProvider() != null)
                ? uploader.getAuthProvider()
                : new StaticTokenAuthProvider("");
        this.executor = executor;
    }

    public synchronized String getSessionId() {
        if (currentSessionId == null) {
            currentSessionId = UUID.randomUUID().toString();
        }
        return currentSessionId;
    }

    public synchronized void startSession() {
        currentSessionId = UUID.randomUUID().toString();
        isSessionActive = true;
        trackEventInternal("session_start", null, null, "app", null, null);
    }

    public synchronized void endSession() {
        if (!isSessionActive) return;
        trackEventInternal("session_end", null, null, "app", null, null);
        isSessionActive = false;
        flush();
        scheduleBackgroundWork();
    }

    public synchronized void onAppForeground() {
        isForeground = true;
        long now = System.currentTimeMillis();

        // Step 6: A new session starts only after 30 min in the background;
        // short background (e.g. share handoff) continues the same session.
        if (lastBackgroundTimestampMs > 0 && (now - lastBackgroundTimestampMs) > AnalyticsConstants.SESSION_TIMEOUT_MS) {
            startSession();
        } else if (!isSessionActive) {
            startSession();
        }

        lastBackgroundTimestampMs = 0L;
        scheduleForegroundPeriodicFlush();
    }

    public synchronized void onAppBackground() {
        isForeground = false;
        lastBackgroundTimestampMs = System.currentTimeMillis();

        // Cancel foreground timers
        cancelForegroundTimers();

        // Track app_background, flush, and schedule WorkManager
        trackEventInternal("app_background", null, null, "app", null, null);
        flush();
        scheduleBackgroundWork();
    }

    public void trackAppOpen() {
        onAppForeground();
        trackEventInternal("app_open", null, null, "app", null, null);
        flush();
    }

    public void trackAppBackground() {
        onAppBackground();
    }

    public void trackEvent(String eventName, String memeId, String category, String screenName, String sourceChannel, JSONObject properties) {
        trackEventInternal(eventName, memeId, category, screenName, sourceChannel, properties);
    }

    private void trackEventInternal(String eventName, String memeId, String category, String screenName, String sourceChannel, JSONObject properties) {
        // Enforce Consent: Do not create or transmit behavioral analytics events unless analytics_consent is granted.
        if (!consentManager.isAnalyticsGranted()) {
            return;
        }

        // Step 5: Validate event name against ONE local allowlist constant
        if (!AnalyticsConstants.ALLOWED_EVENTS.contains(eventName)) {
            diagnostics.incrementDropped(1);
            if (BuildConfig.DEBUG) {
                Log.w(TAG, "Ignoring non-allowlisted event: " + eventName);
            }
            return;
        }

        // Step 3: Client-side hourly limit of 600 events per hour
        if (!hourlyRateLimiter.tryAcquire()) {
            diagnostics.incrementDropped(1);
            if (BuildConfig.DEBUG) {
                Log.w(TAG, "Hourly event quota (600/hr) exceeded. Dropped event: " + eventName);
            }
            return;
        }

        if (executor == null) return;

        executor.execute(() -> {
            try {
                String userHash = identityManager.getUserHash();
                String sessionId = getSessionId();
                String appVersion = AnalyticsEvent.sanitizeAppVersion(BuildConfig.VERSION_NAME);
                String osVersion = Build.VERSION.RELEASE != null ? Build.VERSION.RELEASE : "Android";
                String country = Locale.getDefault().getCountry();
                String consentVersion = consentManager.getConsentVersion();
                long correctedTime = clockOffsetManager.getCorrectedNow();
                String timestampUtc = ClockOffsetManager.formatIsoUtc(correctedTime);

                JSONObject cleanProps = validateAndSanitizePropertiesBeforeEnqueue(properties);

                AnalyticsEvent event = new AnalyticsEvent.Builder(eventName, userHash)
                        .sessionId(sessionId)
                        .timestampUtc(timestampUtc)
                        .appVersion(appVersion)
                        .osVersion(osVersion)
                        .country(country)
                        .memeId(memeId)
                        .category(category)
                        .screenName(screenName)
                        .sourceChannel(sourceChannel)
                        .properties(cleanProps)
                        .consentVersion(consentVersion)
                        .build();

                int dropped = dbHelper.enqueue(event, AnalyticsConstants.MAX_QUEUE_SIZE);
                if (dropped > 0) {
                    diagnostics.incrementDropped(dropped);
                }

                // Step 2: Flush right after the first event of a session (session_start)
                if ("session_start".equals(eventName)) {
                    flushSync();
                    return;
                }

                // Step 2: While in foreground, flush when 10 or more events queued (debounce 2s)
                if (isForeground && dbHelper.getQueueCount() >= AnalyticsConstants.DEBOUNCE_THRESHOLD) {
                    triggerDebouncedFlush();
                }
            } catch (Throwable t) {
                if (BuildConfig.DEBUG) {
                    Log.w(TAG, "Failed to enqueue event: " + t.getClass().getSimpleName());
                }
            }
        });
    }

    public JSONObject validateAndSanitizePropertiesBeforeEnqueue(JSONObject input) {
        JSONObject validProps = new JSONObject();
        if (input == null) return validProps;

        java.util.Iterator<String> keys = input.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (key == null) continue;
            String lower = key.trim().toLowerCase(Locale.ROOT);

            // Step 5: Validate property keys against ONE local allowlist constant before enqueueing
            if (!AnalyticsConstants.ALLOWED_PROPERTY_KEYS.contains(lower)) {
                diagnostics.incrementDropped(1);
                if (BuildConfig.DEBUG) {
                    Log.w(TAG, "Dropping non-allowlisted property key: " + key);
                }
                continue;
            }

            try {
                Object val = input.get(key);
                if (val instanceof String) {
                    String strVal = (String) val;
                    if (strVal.length() > 256) {
                        strVal = strVal.substring(0, 256);
                    }
                    validProps.put(key, strVal);
                } else if (val instanceof Number || val instanceof Boolean) {
                    validProps.put(key, val);
                } else {
                    // Non-scalar (JSONObject, JSONArray, etc.) dropped
                    diagnostics.incrementDropped(1);
                    if (BuildConfig.DEBUG) {
                        Log.w(TAG, "Dropping non-scalar property value for key: " + key);
                    }
                }
            } catch (Exception ignored) {}
        }
        return validProps;
    }

    private synchronized void triggerDebouncedFlush() {
        if (isDebounceScheduled.compareAndSet(false, true)) {
            debounceFlushFuture = executor.schedule(() -> {
                isDebounceScheduled.set(false);
                if (isForeground && consentManager.isAnalyticsGranted()) {
                    flushSync();
                }
            }, AnalyticsConstants.DEBOUNCE_DELAY_MS, TimeUnit.MILLISECONDS);
        }
    }

    private synchronized void scheduleForegroundPeriodicFlush() {
        if (!isForeground || executor == null || executor.isShutdown()) return;

        // Step 2: Flush every 20s (+0 to 5s jitter) if queue is non-empty
        long jitterMs = (long) (Math.random() * (AnalyticsConstants.FOREGROUND_FLUSH_JITTER_SECONDS * 1000L));
        long delayMs = (AnalyticsConstants.FOREGROUND_FLUSH_BASE_SECONDS * 1000L) + jitterMs;

        foregroundFlushFuture = executor.schedule(() -> {
            try {
                // Step 2: No timers or wake-ups when queue is empty or app is in background
                if (isForeground && consentManager.isAnalyticsGranted() && dbHelper.getQueueCount() > 0) {
                    flushSync();
                }
            } finally {
                if (isForeground) {
                    scheduleForegroundPeriodicFlush();
                }
            }
        }, delayMs, TimeUnit.MILLISECONDS);
    }

    private synchronized void cancelForegroundTimers() {
        if (foregroundFlushFuture != null) {
            foregroundFlushFuture.cancel(false);
            foregroundFlushFuture = null;
        }
        if (debounceFlushFuture != null) {
            debounceFlushFuture.cancel(false);
            debounceFlushFuture = null;
        }
        isDebounceScheduled.set(false);
    }

    public void scheduleBackgroundWork() {
        if (context == null) return;
        try {
            Constraints constraints = new Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build();

            OneTimeWorkRequest.Builder workBuilder =
                    new OneTimeWorkRequest.Builder(AnalyticsUploadWorker.class)
                            .setConstraints(constraints);

            try {
                workBuilder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
            } catch (Throwable ignored) {}

            WorkManager.getInstance(context).enqueueUniqueWork(
                    UNIQUE_WORK_NAME,
                    ExistingWorkPolicy.REPLACE,
                    workBuilder.build()
            );
        } catch (Throwable t) {
            if (BuildConfig.DEBUG) {
                Log.w(TAG, "WorkManager background schedule warning: " + t.getMessage());
            }
        }
    }

    public void cancelScheduledWork() {
        if (context == null) return;
        try {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK_NAME);
        } catch (Throwable ignored) {}
    }

    public void flush() {
        if (executor != null && !executor.isShutdown()) {
            executor.execute(this::flushSync);
        }
    }

    public synchronized void flushSync() {
        if (!consentManager.isAnalyticsGranted()) {
            return;
        }
        try {
            uploader.flushBatch();
        } catch (Throwable t) {
            if (BuildConfig.DEBUG) {
                Log.w(TAG, "Flush error: " + t.getClass().getSimpleName());
            }
        }
    }

    public void setConsent(boolean analyticsGranted, boolean advertisingGranted, String version, String timestampUtc) {
        boolean wasGranted = consentManager.isAnalyticsGranted();
        consentManager.updateConsent(analyticsGranted, advertisingGranted, version, timestampUtc);

        if (!analyticsGranted) {
            // Step 8: Revocation purges SQLite queue, in-memory queue, cancels scheduled jobs & timers
            cancelForegroundTimers();
            cancelScheduledWork();
            hourlyRateLimiter.reset();
            clockOffsetManager.clear();
            dbHelper.clear();
            diagnostics.reset();
            if (executor != null && !executor.isShutdown()) {
                executor.execute(() -> {
                    dbHelper.clear();
                    diagnostics.reset();
                });
            }
        } else if (!wasGranted) {
            // Just granted consent: reset auth and resume periodic checks
            uploader.resetAuthDisabled();
            scheduleForegroundPeriodicFlush();
        }
    }

    public void setConsent(boolean analyticsGranted, boolean advertisingGranted, int version, String timestampUtc) {
        setConsent(analyticsGranted, advertisingGranted, ConsentManager.normalizeConsentVersion(version), timestampUtc);
    }

    public ConsentManager getConsentManager() {
        return consentManager;
    }

    public IdentityManager getIdentityManager() {
        return identityManager;
    }

    public AnalyticsDiagnostics getDiagnostics() {
        return diagnostics;
    }

    public JSONObject getDiagnosticStatsJson() {
        int currentCount = dbHelper.getQueueCount();
        return diagnostics.toJsonObject(currentCount);
    }

    public AnalyticsAuthProvider getAuthProvider() {
        return authProvider;
    }

    public AnalyticsUploader getUploader() {
        return uploader;
    }

    public HourlyRateLimiter getHourlyRateLimiter() {
        return hourlyRateLimiter;
    }

    public ClockOffsetManager getClockOffsetManager() {
        return clockOffsetManager;
    }

    public boolean isForeground() {
        return isForeground;
    }

    public void clearQueue() {
        dbHelper.clear();
        diagnostics.reset();
        hourlyRateLimiter.reset();
        if (executor != null && !executor.isShutdown()) {
            executor.execute(() -> {
                dbHelper.clear();
                diagnostics.reset();
            });
        }
    }
}
