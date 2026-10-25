package com.meme.capsule.analytics;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public final class AnalyticsConstants {
    private AnalyticsConstants() {}

    public static final int SCHEMA_VERSION = 1;
    public static final String PLATFORM = "android";
    public static final String DEFAULT_ENDPOINT = "https://meme-capsule-eww.pages.dev/api/analytics/events";
    public static final String STAGING_ENDPOINT = "https://meme-capsule-eww.pages.dev/api/analytics/events";
    public static final String PRODUCTION_ENDPOINT = "https://meme-capsule-eww.pages.dev/api/analytics/events";

    // Server Batch Limits (retained per spec)
    public static final int MAX_BATCH_SIZE = 200; // Server batch limit: at most 200 events
    public static final int MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024; // Server limit: 2 MiB

    // Client Chunking & Limits (Step 2 & Step 3)
    public static final int MAX_CHUNK_SIZE = 100; // Split large queues into chunks of at most 100 events
    public static final int MAX_CHUNK_BYTES = 1024 * 1024; // at most 1 MiB
    public static final int MAX_QUEUE_SIZE = 5000; // Cap the queue at 5,000 events
    public static final int HOURLY_EVENT_LIMIT = 600; // Client-side limit of 600 events per hour
    public static final long CHUNK_SPACING_MS = 1000L; // at least 1 s between chunks

    // Flush Cadence (Step 2)
    public static final int DEBOUNCE_THRESHOLD = 10; // Flush when 10 or more events queued
    public static final long DEBOUNCE_DELAY_MS = 2000L; // Debounce 2 s to coalesce bursts
    public static final long FOREGROUND_FLUSH_BASE_SECONDS = 20L; // 20 s
    public static final long FOREGROUND_FLUSH_JITTER_SECONDS = 5L; // +0 to 5 s jitter
    public static final long FLUSH_INTERVAL_SECONDS = 30L; // Legacy periodic fallback

    // Expiry, Backoff & Auth Limits (Step 3 & Step 4)
    public static final long EVENT_MAX_AGE_MS = 23 * 3600 * 1000L; // Drop events older than 23 h
    public static final long SESSION_TIMEOUT_MS = 30 * 60 * 1000L; // 30 minutes in background
    public static final long CLOCK_OFFSET_THRESHOLD_MS = 60_000L; // |offset| > 60 s
    public static final long TIMESTAMP_MAX_FUTURE_CLAMP_MS = 60_000L; // 60 s ahead clamp
    public static final long AUTH_STOP_INITIAL_MS = 6 * 3600 * 1000L; // 6 hours
    public static final long AUTH_STOP_MAX_MS = 24 * 3600 * 1000L; // 24 hours
    public static final long DEFAULT_RETRY_AFTER_MS = 60_000L; // Default 60 s if absent
    public static final long INITIAL_SERVER_BACKOFF_MS = 5000L; // 5 s initial server backoff
    public static final long MAX_SERVER_BACKOFF_MS = 15 * 60 * 1000L; // 15 min server backoff cap (900 s)

    // HTTP Headers
    public static final String HEADER_CONTENT_TYPE = "Content-Type";
    public static final String HEADER_TOKEN = "X-Analytics-App-Token";
    public static final String HEADER_CLIENT_SENT_AT = "X-Client-Sent-At";
    public static final String HEADER_DATE = "Date";
    public static final String HEADER_RETRY_AFTER = "Retry-After";
    public static final String VALUE_APPLICATION_JSON = "application/json";

    // ONE Local Allowlist Constant for Event Names (Step 5)
    public static final Set<String> ALLOWED_EVENTS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "app_open",
            "app_background",
            "session_start",
            "session_end",
            "meme_view",
            "meme_like",
            "meme_share",
            "meme_save",
            "meme_scroll",
            "category_click",
            "onboarding_complete",
            "profile_open",
            "subscription_click",
            "screen_view",
            "feed_refresh",
            "meme_reported",
            "ad_impression",
            "ad_reward_viewed",
            "retention_checkin"
    )));

    // ONE Local Allowlist Constant for Property Keys (Step 5)
    public static final Set<String> ALLOWED_PROPERTY_KEYS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "action",
            "reaction",
            "duration_ms",
            "destination",
            "direction",
            "category",
            "screen_name",
            "sku",
            "reason",
            "ad_type",
            "reward_type",
            "streak",
            "meme_id",
            "test",
            "clean_metric",
            "padding",
            "legitimate_ui_flag"
    )));

    public static final Set<String> PROHIBITED_PII_KEYS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "email",
            "phone",
            "phone_number",
            "contacts",
            "imei",
            "mac",
            "mac_address",
            "gps",
            "lat",
            "latitude",
            "lng",
            "longitude",
            "location",
            "gallery",
            "file",
            "files",
            "name",
            "first_name",
            "last_name",
            "address",
            "token",
            "auth",
            "authorization",
            "secret",
            "password",
            "api_key",
            "app_token",
            "raw_name",
            "raw_payload",
            "device_id",
            "bearer"
    )));
}
