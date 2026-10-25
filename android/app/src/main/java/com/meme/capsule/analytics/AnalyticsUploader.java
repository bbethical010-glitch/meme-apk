package com.meme.capsule.analytics;

import android.util.Log;

import com.meme.capsule.BuildConfig;
import com.meme.capsule.analytics.auth.AnalyticsAuthProvider;
import com.meme.capsule.analytics.auth.StaticTokenAuthProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

public class AnalyticsUploader {
    private static final String TAG = "AnalyticsUploader";

    private final String endpointUrl;
    private final AnalyticsAuthProvider authProvider;
    private final AnalyticsDbHelper dbHelper;
    private final AnalyticsDiagnostics diagnostics;
    private final ConsentManager consentManager;
    private final ClockOffsetManager clockOffsetManager;

    private final AtomicBoolean isFlushInFlight = new AtomicBoolean(false);
    private boolean isAuthDisabled = false;
    private int authFailureCount = 0;
    private int consecutiveErrors = 0;
    private long nextAllowedFlushTimeMs = 0L;
    private int currentBatchSize = AnalyticsConstants.MAX_CHUNK_SIZE;

    public AnalyticsUploader(String endpointUrl, AnalyticsAuthProvider authProvider, AnalyticsDbHelper dbHelper,
                             AnalyticsDiagnostics diagnostics, ConsentManager consentManager,
                             ClockOffsetManager clockOffsetManager) {
        this.endpointUrl = (endpointUrl != null && !endpointUrl.trim().isEmpty())
                ? endpointUrl.trim()
                : AnalyticsConstants.DEFAULT_ENDPOINT;
        this.authProvider = authProvider != null ? authProvider : new StaticTokenAuthProvider("");
        this.dbHelper = dbHelper;
        this.diagnostics = diagnostics;
        this.consentManager = consentManager;
        this.clockOffsetManager = clockOffsetManager != null ? clockOffsetManager : new ClockOffsetManager((android.content.Context) null);
    }

    public AnalyticsUploader(String endpointUrl, AnalyticsAuthProvider authProvider, AnalyticsDbHelper dbHelper,
                             AnalyticsDiagnostics diagnostics, ConsentManager consentManager) {
        this(endpointUrl, authProvider, dbHelper, diagnostics, consentManager, null);
    }

    public AnalyticsUploader(String endpointUrl, AnalyticsAuthProvider authProvider, AnalyticsDbHelper dbHelper,
                             AnalyticsDiagnostics diagnostics) {
        this(endpointUrl, authProvider, dbHelper, diagnostics, null, null);
    }

    public AnalyticsUploader(String endpointUrl, String appToken, AnalyticsDbHelper dbHelper,
                             AnalyticsDiagnostics diagnostics) {
        this(endpointUrl, new StaticTokenAuthProvider(appToken), dbHelper, diagnostics, null, null);
    }

    public AnalyticsAuthProvider getAuthProvider() {
        return authProvider;
    }

    public ClockOffsetManager getClockOffsetManager() {
        return clockOffsetManager;
    }

    public synchronized boolean isAuthDisabled() {
        return isAuthDisabled;
    }

    public synchronized int getCurrentBatchSize() {
        return currentBatchSize;
    }

    public synchronized void resetAuthDisabled() {
        this.isAuthDisabled = false;
        this.authFailureCount = 0;
        if (authProvider instanceof StaticTokenAuthProvider) {
            ((StaticTokenAuthProvider) authProvider).resetAuthDisabled();
        }
        this.consecutiveErrors = 0;
        this.nextAllowedFlushTimeMs = 0L;
    }

    public synchronized boolean canSendNow() {
        if (isAuthDisabled) {
            if (nextAllowedFlushTimeMs > 0 && System.currentTimeMillis() >= nextAllowedFlushTimeMs) {
                isAuthDisabled = false;
                nextAllowedFlushTimeMs = 0L;
            } else {
                return false;
            }
        }
        return System.currentTimeMillis() >= nextAllowedFlushTimeMs;
    }

    public synchronized long getNextAllowedFlushTimeMs() {
        return nextAllowedFlushTimeMs;
    }

    public synchronized int getConsecutiveErrors() {
        return consecutiveErrors;
    }

    /**
     * Exponential backoff for 5xx/network errors: 5s, 10s, 20s, 40s ... capped at 15 min with jitter.
     */
    public static long calculateServerBackoff(int errors) {
        if (errors <= 0) return 0L;
        int shift = Math.min(errors - 1, 8);
        long base = AnalyticsConstants.INITIAL_SERVER_BACKOFF_MS * (1L << shift);
        long capped = Math.min(base, AnalyticsConstants.MAX_SERVER_BACKOFF_MS);
        long jitter = (long) (Math.random() * 5000); // 0 to 5s jitter
        return Math.min(capped + jitter, AnalyticsConstants.MAX_SERVER_BACKOFF_MS);
    }

    // Legacy method signature maintained for test backwards-compatibility
    public static long calculateBackoff(int attempts) {
        if (attempts <= 0) return 0L;
        int shift = Math.min(attempts - 1, 6);
        long delay = 2000L * (1L << shift);
        return Math.min(delay, 120000L);
    }

    /**
     * Parses the HTTP Retry-After header. Supports both integer seconds and RFC 1123 HTTP-date format.
     * Returns delay in milliseconds. If absent or invalid, defaults to 60s.
     */
    public static long parseRetryAfter(String retryAfterHeader, long nowMs) {
        if (retryAfterHeader == null || retryAfterHeader.trim().isEmpty()) {
            return AnalyticsConstants.DEFAULT_RETRY_AFTER_MS;
        }
        String trimmed = retryAfterHeader.trim();
        try {
            long seconds = Long.parseLong(trimmed);
            return Math.max(seconds * 1000L, 1000L);
        } catch (NumberFormatException ignored) {}

        try {
            Date date = ClockOffsetManager.parseHttpDate(trimmed);
            long delay = date.getTime() - nowMs;
            return delay > 0 ? delay : AnalyticsConstants.DEFAULT_RETRY_AFTER_MS;
        } catch (Exception ignored) {}

        return AnalyticsConstants.DEFAULT_RETRY_AFTER_MS;
    }

    /**
     * Main entry point to flush queued events.
     * Enforces single-flight concurrency, 23h expiry drop, and chunking (<= 100 events, <= 1 MiB, >= 1s spacing).
     */
    public boolean flushBatch() {
        if (!isFlushInFlight.compareAndSet(false, true)) {
            // Already a flush in flight; at most one flush in flight
            return false;
        }

        try {
            return executeFlushSequence();
        } finally {
            isFlushInFlight.set(false);
        }
    }

    private boolean executeFlushSequence() {
        if (consentManager != null && !consentManager.isAnalyticsGranted()) {
            if (dbHelper != null) {
                dbHelper.clear();
            }
            return false;
        }

        long now = System.currentTimeMillis();
        if (!canSendNow()) {
            return false;
        }

        if (dbHelper == null) {
            return true;
        }

        // Before sending, drop events older than 23h and count them
        int expired = dbHelper.dropExpiredEvents(now);
        if (expired > 0) {
            diagnostics.incrementDropped(expired);
        }

        boolean anySent = false;
        while (dbHelper.getQueueCount() > 0 && canSendNow()) {
            if (consentManager != null && !consentManager.isAnalyticsGranted()) {
                dbHelper.clear();
                return false;
            }

            // Peek chunk of at most currentBatchSize (<= 100) events
            List<AnalyticsEvent> chunk = dbHelper.peekBatch(currentBatchSize);
            if (chunk == null || chunk.isEmpty()) {
                break;
            }

            // Build request chunk respecting 1 MiB limit
            List<AnalyticsEvent> validChunk = new ArrayList<>();
            List<String> eventIds = new ArrayList<>();
            JSONArray eventsArray = new JSONArray();
            int accumulatedBytes = 30; // Overhead for {"events":[]}
            long maxAllowedTimestampMs = System.currentTimeMillis() + clockOffsetManager.getOffsetMs() + AnalyticsConstants.TIMESTAMP_MAX_FUTURE_CLAMP_MS;

            for (AnalyticsEvent event : chunk) {
                try {
                    // Clamp timestamp if stamped more than 60s ahead of (device now + offset)
                    event.clampTimestampIfAhead(maxAllowedTimestampMs);

                    JSONObject eventJson = event.toJson();
                    byte[] eventBytes = eventJson.toString().getBytes(StandardCharsets.UTF_8);

                    if (accumulatedBytes + eventBytes.length + 2 > AnalyticsConstants.MAX_CHUNK_BYTES) {
                        if (!validChunk.isEmpty()) {
                            break; // Respect 1 MiB chunk limit
                        }
                    }

                    validChunk.add(event);
                    eventIds.add(event.getEventId());
                    eventsArray.put(eventJson);
                    accumulatedBytes += eventBytes.length + 1;
                } catch (Exception ignored) {}
            }

            if (validChunk.isEmpty()) {
                break;
            }

            // Send chunk
            SendResult result = sendEventsHttp(eventsArray);
            if (result.isSuccess()) {
                // 2xx: delete the sent events
                dbHelper.removeEvents(eventIds);
                diagnostics.incrementAccepted(eventIds.size());
                diagnostics.setLastFlushTimeUtc(ClockOffsetManager.formatIsoUtc(System.currentTimeMillis()));
                diagnostics.setLastError(null);
                consecutiveErrors = 0;
                nextAllowedFlushTimeMs = 0L;
                anySent = true;

                // Handle Date header for clock correction
                processDateHeader(result.dateHeader);

                // If more events remain in queue, wait at least 1s between chunks
                if (dbHelper.getQueueCount() > 0) {
                    try {
                        Thread.sleep(AnalyticsConstants.CHUNK_SPACING_MS);
                    } catch (InterruptedException ignored) {}
                }
            } else {
                handleChunkFailure(result.responseCode, result.retryAfterHeader, result.dateHeader, validChunk);
                break; // Stop chunk processing on failure
            }
        }

        return anySent;
    }

    /**
     * Executes HTTP POST of events array.
     */
    protected SendResult sendEventsHttp(JSONArray eventsArray) {
        HttpURLConnection connection = null;
        try {
            JSONObject root = new JSONObject();
            root.put("events", eventsArray);
            byte[] bodyBytes = root.toString().getBytes(StandardCharsets.UTF_8);

            URL url = new URL(endpointUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(20000);
            connection.setDoOutput(true);
            connection.setRequestProperty(AnalyticsConstants.HEADER_CONTENT_TYPE, AnalyticsConstants.VALUE_APPLICATION_JSON);

            // Step 4: Add X-Client-Sent-At header (corrected UTC now)
            String clientSentAt = ClockOffsetManager.formatIsoUtc(clockOffsetManager.getCorrectedNow());
            connection.setRequestProperty(AnalyticsConstants.HEADER_CLIENT_SENT_AT, clientSentAt);

            Map<String, String> authHeaders = authProvider.getAuthHeaders();
            if (authHeaders != null) {
                for (Map.Entry<String, String> entry : authHeaders.entrySet()) {
                    if (entry.getKey() != null && entry.getValue() != null) {
                        connection.setRequestProperty(entry.getKey(), entry.getValue());
                    }
                }
            }

            try (OutputStream os = connection.getOutputStream()) {
                os.write(bodyBytes);
                os.flush();
            }

            int code = connection.getResponseCode();
            String dateHeader = connection.getHeaderField(AnalyticsConstants.HEADER_DATE);
            String retryAfter = connection.getHeaderField(AnalyticsConstants.HEADER_RETRY_AFTER);
            return new SendResult(code, dateHeader, retryAfter);

        } catch (Exception e) {
            return new SendResult(-1, null, null);
        } finally {
            if (connection != null) {
                try {
                    connection.disconnect();
                } catch (Throwable ignored) {}
            }
        }
    }

    private void processDateHeader(String dateHeader) {
        if (dateHeader != null && !dateHeader.trim().isEmpty()) {
            try {
                Date serverDate = ClockOffsetManager.parseHttpDate(dateHeader);
                long serverTime = serverDate.getTime();
                long deviceTime = System.currentTimeMillis();
                clockOffsetManager.recordServerTime(serverTime, deviceTime);
            } catch (Exception ignored) {}
        }
    }

    private void handleChunkFailure(int responseCode, String retryAfterHeader, String dateHeader, List<AnalyticsEvent> chunk) {
        processDateHeader(dateHeader);

        if (responseCode == 400 || responseCode == 422) {
            // Step 3: Poison-batch bisection!
            // Never retry the same batch as-is. Bisect to isolate offending event(s), confirm, and drop only those.
            bisectAndIsolate(chunk);

        } else if (responseCode == 401 || responseCode == 403) {
            // Step 3: Stop uploading for 6h (growing to 24h), keep events, never loop hot.
            authFailureCount++;
            long waitMs = (authFailureCount == 1)
                    ? AnalyticsConstants.AUTH_STOP_INITIAL_MS
                    : AnalyticsConstants.AUTH_STOP_MAX_MS;
            nextAllowedFlushTimeMs = System.currentTimeMillis() + waitMs;
            isAuthDisabled = true;
            authProvider.onAuthFailure();
            diagnostics.setLastError("HTTP " + responseCode + " Auth failure. Sending paused for " + (waitMs / 3600000L) + "h.");
            if (BuildConfig.DEBUG) {
                Log.e(TAG, "Analytics authentication paused for " + (waitMs / 3600000L) + " hours due to HTTP " + responseCode);
            }

        } else if (responseCode == 413) {
            // Step 3: Halve the batch size
            currentBatchSize = Math.max(1, currentBatchSize / 2);
            diagnostics.setLastError("HTTP 413 Payload Too Large. Halved batch size to " + currentBatchSize);
            if (BuildConfig.DEBUG) {
                Log.w(TAG, "Halved analytics batch size to " + currentBatchSize);
            }

        } else if (responseCode == 429) {
            // Step 3: Honour Retry-After (seconds or HTTP-date); if absent wait 60s. Never retry sooner.
            long delayMs = parseRetryAfter(retryAfterHeader, System.currentTimeMillis());
            nextAllowedFlushTimeMs = System.currentTimeMillis() + delayMs;
            diagnostics.setLastError("HTTP 429 Rate limited. Retrying after " + (delayMs / 1000) + "s.");
            if (BuildConfig.DEBUG) {
                Log.w(TAG, "Analytics rate limited (HTTP 429). Retry-After: " + (delayMs / 1000) + "s.");
            }

        } else {
            // Step 3: 5xx or network failure: exponential backoff 5s, 10, 20, 40 ... capped at 15m with jitter.
            consecutiveErrors++;
            long backoff = calculateServerBackoff(consecutiveErrors);
            nextAllowedFlushTimeMs = System.currentTimeMillis() + backoff;
            diagnostics.setLastError("HTTP " + responseCode + " error (backoff: " + (backoff / 1000) + "s). Events retained.");
            if (BuildConfig.DEBUG) {
                Log.w(TAG, "Analytics error HTTP " + responseCode + ". Backing off " + (backoff / 1000) + "s.");
            }
        }
    }

    /**
     * Poison-batch bisection algorithm (Step 3):
     * Recursively splits batch in half. Single-event sends confirm offending poison events.
     * Offending events are dropped and counted locally. Valid events are safely accepted.
     */
    public void bisectAndIsolate(List<AnalyticsEvent> batch) {
        if (batch == null || batch.isEmpty()) return;

        if (batch.size() == 1) {
            AnalyticsEvent single = batch.get(0);
            JSONArray arr = new JSONArray();
            try {
                arr.put(single.toJson());
            } catch (Exception ignored) {}

            SendResult res = sendEventsHttp(arr);
            if (res.responseCode == 400 || res.responseCode == 422) {
                // Confirmed bad poison event: drop only this event and count locally
                if (dbHelper != null) {
                    dbHelper.removeEvents(Collections.singletonList(single.getEventId()));
                }
                diagnostics.incrementRejected(1);
                diagnostics.setLastError("HTTP " + res.responseCode + ": Poison event dropped.");
                if (BuildConfig.DEBUG) {
                    Log.w(TAG, "Poison event isolated and dropped (HTTP " + res.responseCode + ")");
                }
            } else if (res.isSuccess()) {
                // Accepted singly
                if (dbHelper != null) {
                    dbHelper.removeEvents(Collections.singletonList(single.getEventId()));
                }
                diagnostics.incrementAccepted(1);
            }
            return;
        }

        int mid = batch.size() / 2;
        List<AnalyticsEvent> left = batch.subList(0, mid);
        List<AnalyticsEvent> right = batch.subList(mid, batch.size());

        // Process left half
        testSubBatch(left);
        // Process right half
        testSubBatch(right);
    }

    private void testSubBatch(List<AnalyticsEvent> subBatch) {
        if (subBatch.isEmpty()) return;

        JSONArray arr = new JSONArray();
        List<String> ids = new ArrayList<>();
        for (AnalyticsEvent ev : subBatch) {
            try {
                arr.put(ev.toJson());
                ids.add(ev.getEventId());
            } catch (Exception ignored) {}
        }

        SendResult res = sendEventsHttp(arr);
        if (res.isSuccess()) {
            if (dbHelper != null) {
                dbHelper.removeEvents(ids);
            }
            diagnostics.incrementAccepted(ids.size());
        } else if (res.responseCode == 400 || res.responseCode == 422) {
            bisectAndIsolate(subBatch);
        } else {
            // Other server error during bisection: stop and back off
            consecutiveErrors++;
            nextAllowedFlushTimeMs = System.currentTimeMillis() + calculateServerBackoff(consecutiveErrors);
        }
    }

    // Maintained for backwards-compatibility with tests
    public synchronized void handleResponse(int responseCode, List<String> eventIds) {
        if (consentManager != null && !consentManager.isAnalyticsGranted()) {
            if (dbHelper != null) {
                dbHelper.clear();
            }
            return;
        }

        if (responseCode >= 200 && responseCode < 300) {
            if (dbHelper != null) {
                dbHelper.removeEvents(eventIds);
            }
            diagnostics.incrementAccepted(eventIds.size());
            diagnostics.setLastFlushTimeUtc(ClockOffsetManager.formatIsoUtc(System.currentTimeMillis()));
            diagnostics.setLastError(null);
            consecutiveErrors = 0;
            nextAllowedFlushTimeMs = 0L;
        } else if (responseCode == 400 || responseCode == 422) {
            if (dbHelper != null) {
                dbHelper.removeEvents(eventIds);
            }
            diagnostics.incrementRejected(eventIds.size());
            diagnostics.setLastError("HTTP " + responseCode + ": Validation failure. Dropped invalid batch.");
        } else if (responseCode == 401 || responseCode == 403) {
            authFailureCount++;
            long waitMs = (authFailureCount == 1)
                    ? AnalyticsConstants.AUTH_STOP_INITIAL_MS
                    : AnalyticsConstants.AUTH_STOP_MAX_MS;
            nextAllowedFlushTimeMs = System.currentTimeMillis() + waitMs;
            isAuthDisabled = true;
            authProvider.onAuthFailure();
            diagnostics.setLastError("HTTP " + responseCode + " Auth failure. Sending paused for " + (waitMs / 3600000L) + "h.");
        } else if (responseCode == 404 || responseCode == 405) {
            isAuthDisabled = true;
            diagnostics.setLastError("HTTP " + responseCode + ": Endpoint configuration failure. Sending disabled.");
        } else if (responseCode == 413) {
            currentBatchSize = Math.max(1, currentBatchSize / 2);
            diagnostics.setLastError("HTTP 413 Payload Too Large. Halved batch size to " + currentBatchSize);
        } else if (responseCode == 429) {
            long delayMs = AnalyticsConstants.DEFAULT_RETRY_AFTER_MS;
            nextAllowedFlushTimeMs = System.currentTimeMillis() + delayMs;
            diagnostics.setLastError("HTTP 429 Rate limited. Retrying after " + (delayMs / 1000) + "s.");
        } else {
            consecutiveErrors++;
            long backoff = calculateServerBackoff(consecutiveErrors);
            nextAllowedFlushTimeMs = System.currentTimeMillis() + backoff;
            diagnostics.setLastError("HTTP " + responseCode + " error (backoff: " + (backoff / 1000) + "s). Events retained.");
        }
    }

    public static class SendResult {
        public final int responseCode;
        public final String dateHeader;
        public final String retryAfterHeader;

        public SendResult(int responseCode, String dateHeader, String retryAfterHeader) {
            this.responseCode = responseCode;
            this.dateHeader = dateHeader;
            this.retryAfterHeader = retryAfterHeader;
        }

        public boolean isSuccess() {
            return responseCode >= 200 && responseCode < 300;
        }
    }
}
