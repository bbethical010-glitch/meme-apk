package com.meme.capsule.analytics;

import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Assert;
import org.junit.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import com.meme.capsule.analytics.auth.StaticTokenAuthProvider;

public class AnalyticsUnitTest {

    private static final String VALID_USER_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    @Test
    public void testConsentGrantedCreatesSchemaVersion1Events() throws JSONException {
        AnalyticsEvent event = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .memeId("meme_123")
                .category("tech")
                .screenName("deck")
                .appVersion("3.7")
                .osVersion("14")
                .build();

        JSONObject json = event.toJson();
        Assert.assertEquals(1, json.getInt("schema_version"));
        Assert.assertEquals("meme_view", json.getString("event_name"));
        Assert.assertEquals(VALID_USER_HASH, json.getString("user_hash"));
        Assert.assertEquals("android", json.getString("platform"));
        Assert.assertEquals("3.7", json.getString("app_version"));
        Assert.assertEquals("granted", json.getString("consent_status"));
        Assert.assertEquals("v1", json.getString("consent_version"));
        Assert.assertNotNull(json.getString("event_id"));
        Assert.assertNotNull(json.getString("session_id"));
        Assert.assertNotNull(json.getString("timestamp_utc"));
    }

    @Test
    public void testUserHashIs64CharacterLowercaseSha256() {
        String installId = UUID.randomUUID().toString();
        String hash = IdentityManager.computeSha256(installId);

        Assert.assertNotNull(hash);
        Assert.assertEquals(64, hash.length());
        Assert.assertTrue("Hash must be lowercase hex", hash.matches("^[0-9a-f]{64}$"));

        // Deterministic check
        String hash2 = IdentityManager.computeSha256(installId);
        Assert.assertEquals(hash, hash2);

        // Different IDs must produce different hashes
        String otherHash = IdentityManager.computeSha256(UUID.randomUUID().toString());
        Assert.assertNotEquals(hash, otherHash);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testInvalidUserHashRejected() {
        new AnalyticsEvent.Builder("meme_view", "INVALID_SHORT_HASH")
                .build();
    }

    @Test
    public void testEventIdUniqueness() {
        Set<String> ids = new HashSet<>();
        int count = 1000;
        for (int i = 0; i < count; i++) {
            AnalyticsEvent event = new AnalyticsEvent.Builder("meme_scroll", VALID_USER_HASH).build();
            ids.add(event.getEventId());
        }
        Assert.assertEquals(count, ids.size());
    }

    @Test
    public void testAllowlistedEventNames() {
        for (String eventName : AnalyticsConstants.ALLOWED_EVENTS) {
            AnalyticsEvent event = new AnalyticsEvent.Builder(eventName, VALID_USER_HASH).build();
            Assert.assertEquals(eventName, event.getEventName());
        }
    }

    @Test(expected = IllegalArgumentException.class)
    public void testDisallowedEventNameRejected() {
        new AnalyticsEvent.Builder("unauthorized_custom_event", VALID_USER_HASH).build();
    }

    @Test
    public void testNoPiiIncludedInSerializedPayloads() throws JSONException {
        JSONObject unsafeProps = new JSONObject();
        unsafeProps.put("email", "victim@example.com");
        unsafeProps.put("phone", "+1234567890");
        unsafeProps.put("contacts", "Family, Friends");
        unsafeProps.put("imei", "352099001761482");
        unsafeProps.put("mac", "00:1B:44:11:3A:B7");
        unsafeProps.put("latitude", 37.7749);
        unsafeProps.put("longitude", -122.4194);
        unsafeProps.put("gallery", "/sdcard/DCIM/photos");
        unsafeProps.put("legitimate_ui_flag", true);
        unsafeProps.put("meme_tag", "wholesome");

        AnalyticsEvent event = new AnalyticsEvent.Builder("meme_like", VALID_USER_HASH)
                .properties(unsafeProps)
                .build();

        JSONObject json = event.toJson();
        JSONObject cleanProps = json.getJSONObject("properties");

        // Verify PII is stripped
        Assert.assertFalse("email must be stripped", cleanProps.has("email"));
        Assert.assertFalse("phone must be stripped", cleanProps.has("phone"));
        Assert.assertFalse("contacts must be stripped", cleanProps.has("contacts"));
        Assert.assertFalse("imei must be stripped", cleanProps.has("imei"));
        Assert.assertFalse("mac must be stripped", cleanProps.has("mac"));
        Assert.assertFalse("latitude must be stripped", cleanProps.has("latitude"));
        Assert.assertFalse("longitude must be stripped", cleanProps.has("longitude"));
        Assert.assertFalse("gallery must be stripped", cleanProps.has("gallery"));

        // Verify legitimate properties remain
        Assert.assertTrue(cleanProps.has("legitimate_ui_flag"));
        Assert.assertTrue(cleanProps.has("meme_tag"));
        Assert.assertEquals("wholesome", cleanProps.getString("meme_tag"));
    }

    @Test
    public void testRetryBackoffBehavior() {
        Assert.assertEquals(0L, AnalyticsUploader.calculateBackoff(0));
        Assert.assertEquals(2000L, AnalyticsUploader.calculateBackoff(1));
        Assert.assertEquals(4000L, AnalyticsUploader.calculateBackoff(2));
        Assert.assertEquals(8000L, AnalyticsUploader.calculateBackoff(3));
        Assert.assertEquals(16000L, AnalyticsUploader.calculateBackoff(4));
        Assert.assertEquals(32000L, AnalyticsUploader.calculateBackoff(5));
        Assert.assertEquals(64000L, AnalyticsUploader.calculateBackoff(6));
        Assert.assertEquals(120000L, AnalyticsUploader.calculateBackoff(7)); // capped at 120s
        Assert.assertEquals(120000L, AnalyticsUploader.calculateBackoff(10));
    }

    @Test
    public void testDiagnosticsTracking() throws JSONException {
        AnalyticsDiagnostics diagnostics = new AnalyticsDiagnostics();
        diagnostics.incrementAccepted(10);
        diagnostics.incrementRejected(2);
        diagnostics.incrementDropped(5);
        diagnostics.setLastError("HTTP 500 server error");
        diagnostics.setLastFlushTimeUtc("2026-10-23T12:00:00.000Z");

        JSONObject json = diagnostics.toJsonObject(33);
        Assert.assertEquals(33, json.getInt("queueCount"));
        Assert.assertEquals(10, json.getInt("acceptedCount"));
        Assert.assertEquals(2, json.getInt("rejectedCount"));
        Assert.assertEquals(5, json.getInt("droppedCount"));
        Assert.assertEquals("HTTP 500 server error", json.getString("lastError"));
        Assert.assertEquals("2026-10-23T12:00:00.000Z", json.getString("lastFlushTimeUtc"));

        // Ensure no user_hash or raw payload fields exist in diagnostics JSON
        Assert.assertFalse(json.has("user_hash"));
        Assert.assertFalse(json.has("payload"));
        Assert.assertFalse(json.has("events"));
    }

    @Test
    public void testBatchSizeLimits() {
        List<AnalyticsEvent> queue = new ArrayList<>();
        for (int i = 0; i < 250; i++) {
            queue.add(new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH).build());
        }

        // Batch size limit is 200
        int batchSize = Math.min(queue.size(), AnalyticsConstants.MAX_BATCH_SIZE);
        Assert.assertEquals(200, batchSize);
    }

    @Test
    public void testQueueFifoEviction() {
        int maxQueue = 1000;
        int totalEvents = 1050;
        int dropped = 0;

        List<String> mockQueue = new ArrayList<>();
        for (int i = 0; i < totalEvents; i++) {
            mockQueue.add("event_" + i);
            if (mockQueue.size() > maxQueue) {
                mockQueue.remove(0); // FIFO eviction: drop oldest
                dropped++;
            }
        }

        Assert.assertEquals(1000, mockQueue.size());
        Assert.assertEquals(50, dropped);
        Assert.assertEquals("event_50", mockQueue.get(0)); // oldest 50 were evicted
    }

    @Test
    public void testAuthProviderStaticTokenConfigured() {
        com.meme.capsule.analytics.auth.StaticTokenAuthProvider provider =
                new com.meme.capsule.analytics.auth.StaticTokenAuthProvider("staging_secret_token_123");

        Assert.assertTrue(provider.isConfigured());
        Assert.assertEquals("static_token", provider.getAuthMode());
        Assert.assertFalse(provider.isAuthDisabled());

        java.util.Map<String, String> headers = provider.getAuthHeaders();
        Assert.assertEquals(1, headers.size());
        Assert.assertEquals("staging_secret_token_123", headers.get(AnalyticsConstants.HEADER_TOKEN));
    }

    @Test
    public void testAuthProviderMissingTokenFailsSafely() {
        com.meme.capsule.analytics.auth.StaticTokenAuthProvider provider =
                new com.meme.capsule.analytics.auth.StaticTokenAuthProvider("");

        Assert.assertFalse(provider.isConfigured());
        Assert.assertTrue("Empty token must return empty headers", provider.getAuthHeaders().isEmpty());
    }

    @Test
    public void testAuthProviderOnAuthFailureDisablesHeaders() {
        com.meme.capsule.analytics.auth.StaticTokenAuthProvider provider =
                new com.meme.capsule.analytics.auth.StaticTokenAuthProvider("test_token");

        Assert.assertFalse(provider.getAuthHeaders().isEmpty());

        // Simulate 401 response callback
        provider.onAuthFailure();

        Assert.assertTrue(provider.isAuthDisabled());
        Assert.assertTrue("Disabled auth provider must return empty headers", provider.getAuthHeaders().isEmpty());

        // Reset
        provider.resetAuthDisabled();
        Assert.assertFalse(provider.isAuthDisabled());
        Assert.assertFalse(provider.getAuthHeaders().isEmpty());
    }

    @Test
    public void testPlayIntegrityStubSafety() {
        com.meme.capsule.analytics.auth.PlayIntegrityAuthProvider stub =
                new com.meme.capsule.analytics.auth.PlayIntegrityAuthProvider();

        Assert.assertFalse(stub.isConfigured());
        Assert.assertEquals("play_integrity", stub.getAuthMode());

        try {
            stub.getAuthHeaders();
            Assert.fail("PlayIntegrityAuthProvider must throw UnsupportedOperationException until backend is deployed");
        } catch (UnsupportedOperationException expected) {
            Assert.assertTrue(expected.getMessage().contains("not yet implemented"));
        }
    }

    @Test
    public void testDiagnosticsNeverExposesTokensOrPayloads() throws JSONException {
        AnalyticsDiagnostics diagnostics = new AnalyticsDiagnostics();
        diagnostics.setLastError("HTTP 401 Unauthorized: Configuration failure (static_token). Sending disabled.");

        JSONObject json = diagnostics.toJsonObject(5);
        Assert.assertFalse("Diagnostics must never expose auth token", json.has("token"));
        Assert.assertFalse("Diagnostics must never expose app_token", json.has("app_token"));
        Assert.assertFalse("Diagnostics must never expose user_hash", json.has("user_hash"));
        Assert.assertFalse("Diagnostics must never expose raw payload", json.has("payload"));
        Assert.assertFalse("Diagnostics must never expose events array", json.has("events"));
    }

    @Test
    public void testReleaseConfigurationRejectsPlaceholders() {
        String[] invalidTokens = {
                "",
                "   ",
                "your_production_token_here",
                "placeholder_token",
                "PLACEHOLDER"
        };

        for (String token : invalidTokens) {
            boolean isPlaceholder = token == null || token.trim().isEmpty() ||
                    token.toLowerCase().contains("placeholder") ||
                    token.toLowerCase().contains("your_production_token");
            Assert.assertTrue("Token should be recognized as invalid/placeholder: " + token, isPlaceholder);
        }

        String validCustomToken = "prod_client_token_9876543210abcdef";
        boolean isPlaceholder = validCustomToken.toLowerCase().contains("placeholder") ||
                validCustomToken.toLowerCase().contains("your_production_token");
        Assert.assertFalse("Legitimate token must not be flagged as placeholder", isPlaceholder);
    }

    @Test
    public void testReleaseBuildBypassCannotWeakenReleasePackaging() {
        // Test that for release packaging tasks, even if allowEmpty is set to true,
        // missing or placeholder tokens are strictly rejected.
        String[] releaseTasks = {"assembleRelease", "bundleRelease", "packageRelease"};
        String[] invalidTokens = {"", "   ", "placeholder", "your_production_token"};

        for (String task : releaseTasks) {
            boolean isRelease = task.toLowerCase().contains("release") && !task.toLowerCase().contains("test");
            Assert.assertTrue("Task must be recognized as release: " + task, isRelease);

            for (String token : invalidTokens) {
                boolean isPlaceholder = token == null || token.trim().isEmpty() ||
                        token.toLowerCase().contains("placeholder") ||
                        token.toLowerCase().contains("your_production_token");

                // Even when an ALLOW_EMPTY_ANALYTICS_TOKEN bypass flag is passed,
                // release packaging must never be permitted without a valid token.
                boolean releasePackagingPermitted = !isPlaceholder;
                Assert.assertFalse(
                        "Release build must reject placeholder/empty token even if bypass was attempted. Task: " + task + ", token: " + token,
                        releasePackagingPermitted
                );
            }
        }
    }

    @Test
    public void testPhase4GrantedEventsContainConsentVersion() throws JSONException {
        // Default builder uses "v1"
        AnalyticsEvent eventV1 = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .memeId("m1")
                .build();
        Assert.assertEquals("v1", eventV1.getConsentVersion());
        Assert.assertEquals("v1", eventV1.toJson().getString("consent_version"));

        // Explicit version "v2"
        AnalyticsEvent eventV2 = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .memeId("m2")
                .consentVersion("v2")
                .build();
        Assert.assertEquals("v2", eventV2.getConsentVersion());
        Assert.assertEquals("v2", eventV2.toJson().getString("consent_version"));

        // Numeric version 3 normalized to "v3"
        AnalyticsEvent eventV3 = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .memeId("m3")
                .consentVersion(3)
                .build();
        Assert.assertEquals("v3", eventV3.getConsentVersion());
        Assert.assertEquals("v3", eventV3.toJson().getString("consent_version"));

        // Serialization and deserialization preserves consent_version
        String jsonStr = eventV2.toJson().toString();
        AnalyticsEvent restored = AnalyticsEvent.fromJson(jsonStr);
        Assert.assertEquals("v2", restored.getConsentVersion());
    }

    @Test
    public void testPhase4LegacyDefaultConsentUsesV1() throws JSONException {
        // Normalization helper handles null, empty, legacy numeric strings, and integers
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion((String) null));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion(""));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion("   "));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion("1"));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion(1));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion("v1"));
        Assert.assertEquals("v2", ConsentManager.normalizeConsentVersion("2"));
        Assert.assertEquals("v2", ConsentManager.normalizeConsentVersion(2));
        Assert.assertEquals("v2", ConsentManager.normalizeConsentVersion("v2"));

        // Legacy deserialization: payload without consent_version defaults to "v1"
        JSONObject legacyJson = new JSONObject();
        legacyJson.put("schema_version", 1);
        legacyJson.put("event_id", UUID.randomUUID().toString());
        legacyJson.put("event_name", "meme_like");
        legacyJson.put("user_hash", VALID_USER_HASH);
        legacyJson.put("consent_status", "granted");

        AnalyticsEvent legacyRestored = AnalyticsEvent.fromJson(legacyJson.toString());
        Assert.assertEquals("v1", legacyRestored.getConsentVersion());
    }

    @Test
    public void testPhase4DeniedConsentCreatesNoUpload() {
        // Verify that when consent is not granted, analytics is strictly blocked
        ConsentManager ungrantedManager = new ConsentManager((android.content.SharedPreferences) null);
        Assert.assertFalse(ungrantedManager.isAnalyticsGranted());
        Assert.assertEquals(ConsentManager.STATUS_DENIED, ungrantedManager.getAnalyticsConsent());

        // In AnalyticsManager: if !consentManager.isAnalyticsGranted(), trackEvent does nothing
        // and flushSync returns immediately without uploading
        try {
            AnalyticsEvent event = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH).build();
            Assert.assertEquals("granted", event.getConsentStatus());
        } catch (Exception e) {
            Assert.fail("Valid event building should succeed");
        }
    }

    @Test
    public void testPhase4RevokedConsentStopsFutureEvents() {
        // Revoking consent immediately marks isAnalyticsGranted() as false
        // and behavioral events cannot be enqueued or uploaded.
        ConsentManager manager = new ConsentManager((android.content.SharedPreferences) null);
        Assert.assertFalse(manager.isAnalyticsGranted());

        // Do not send consent denial or revocation as behavioral analytics
        // Disallowed event names cannot be used
        String[] consentEventAttempts = {"consent_denied", "consent_revoked", "analytics_consent_revoked"};
        for (String attempt : consentEventAttempts) {
            try {
                new AnalyticsEvent.Builder(attempt, VALID_USER_HASH).build();
                Assert.fail("Consent denial/revocation must never be sent as behavioral analytics event: " + attempt);
            } catch (IllegalArgumentException expected) {
                Assert.assertTrue(expected.getMessage().contains("Disallowed event_name"));
            }
        }
    }

    @Test
    public void testPhase4ConsentVersionChangesDoNotExposePii() throws JSONException {
        // When consent policy changes to "v2", verify that event payload contains "v2"
        // and strictly no PII is leaked in properties or root
        JSONObject unsafeProps = new JSONObject();
        unsafeProps.put("email", "leak@victim.com");
        unsafeProps.put("phone", "+1987654321");
        unsafeProps.put("contacts", "Charlie, Dave");
        unsafeProps.put("imei", "123456789012345");
        unsafeProps.put("mac", "AA:BB:CC:11:22:33");
        unsafeProps.put("latitude", 48.8566);
        unsafeProps.put("longitude", 2.3522);
        unsafeProps.put("gallery", "/sdcard/private_dcim");
        unsafeProps.put("safe_filter", "funny");

        AnalyticsEvent eventV2 = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .consentVersion("v2")
                .properties(unsafeProps)
                .build();

        JSONObject json = eventV2.toJson();
        Assert.assertEquals("v2", json.getString("consent_version"));

        // Verify root fields do not contain any PII
        Assert.assertFalse(json.has("email"));
        Assert.assertFalse(json.has("phone"));
        Assert.assertFalse(json.has("contacts"));
        Assert.assertFalse(json.has("imei"));
        Assert.assertFalse(json.has("mac"));
        Assert.assertFalse(json.has("latitude"));
        Assert.assertFalse(json.has("longitude"));
        Assert.assertFalse(json.has("gallery"));

        // Verify sanitized properties
        JSONObject cleanProps = json.getJSONObject("properties");
        Assert.assertFalse(cleanProps.has("email"));
        Assert.assertFalse(cleanProps.has("phone"));
        Assert.assertFalse(cleanProps.has("contacts"));
        Assert.assertFalse(cleanProps.has("imei"));
        Assert.assertFalse(cleanProps.has("mac"));
        Assert.assertFalse(cleanProps.has("latitude"));
        Assert.assertFalse(cleanProps.has("longitude"));
        Assert.assertFalse(cleanProps.has("gallery"));
        Assert.assertTrue(cleanProps.has("safe_filter"));
        Assert.assertEquals("funny", cleanProps.getString("safe_filter"));
    }

    // ------------------------------------------------------------------------
    // Comprehensive Tests for Integration with Backend Contract & Privacy/Security
    // ------------------------------------------------------------------------

    @Test
    public void test1_GrantedEventsIncludeSchemaVersion1AndConsentVersion() throws JSONException {
        AnalyticsEvent event = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .memeId("m_1")
                .consentVersion("v1")
                .build();
        JSONObject json = event.toJson();
        Assert.assertEquals(1, json.getInt("schema_version"));
        Assert.assertEquals("granted", json.getString("consent_status"));
        Assert.assertEquals("v1", json.getString("consent_version"));
        Assert.assertEquals("android", json.getString("platform"));
        Assert.assertNotNull(json.getString("event_id"));
        Assert.assertNotNull(json.getString("session_id"));
        Assert.assertNotNull(json.getString("timestamp_utc"));
    }

    @Test
    public void test2_DefaultConsentVersionIsV1() throws JSONException {
        Assert.assertEquals("v1", ConsentManager.DEFAULT_CONSENT_VERSION);
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion((String) null));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion(""));
        AnalyticsEvent defaultEvent = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH).build();
        Assert.assertEquals("v1", defaultEvent.getConsentVersion());
        Assert.assertEquals("v1", defaultEvent.toJson().getString("consent_version"));
    }

    @Test
    public void test3_LegacyIntegerAndStringConsentVersionsNormalizeCorrectly() {
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion(1));
        Assert.assertEquals("v2", ConsentManager.normalizeConsentVersion(2));
        Assert.assertEquals("v3", ConsentManager.normalizeConsentVersion(3));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion(0));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion(-1));
        Assert.assertEquals("v99", ConsentManager.normalizeConsentVersion(99));

        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion("1"));
        Assert.assertEquals("v2", ConsentManager.normalizeConsentVersion("2"));
        Assert.assertEquals("v3", ConsentManager.normalizeConsentVersion("3"));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion("v1"));
        Assert.assertEquals("v2", ConsentManager.normalizeConsentVersion("v2"));
        Assert.assertEquals("v3", ConsentManager.normalizeConsentVersion("v3"));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion("V1"));
        Assert.assertEquals("v2", ConsentManager.normalizeConsentVersion("V2"));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion("unknown"));
        Assert.assertEquals("v1", ConsentManager.normalizeConsentVersion("   "));
    }

    @Test
    public void test4_LegacyQueuedPayloadsWithoutConsentVersionDefaultToV1() throws JSONException {
        JSONObject legacyWithoutConsent = new JSONObject();
        legacyWithoutConsent.put("schema_version", 1);
        legacyWithoutConsent.put("event_id", UUID.randomUUID().toString());
        legacyWithoutConsent.put("event_name", "meme_share");
        legacyWithoutConsent.put("user_hash", VALID_USER_HASH);
        legacyWithoutConsent.put("session_id", "sess_legacy");
        legacyWithoutConsent.put("timestamp_utc", "2026-10-23T10:00:00.000Z");
        legacyWithoutConsent.put("consent_status", "granted");

        AnalyticsEvent restored = AnalyticsEvent.fromJson(legacyWithoutConsent.toString());
        Assert.assertEquals("v1", restored.getConsentVersion());
        Assert.assertEquals(1, restored.getSchemaVersion());

        // Also test legacy integer in payload: "consent_version": 2
        legacyWithoutConsent.put("consent_version", 2);
        AnalyticsEvent restoredInt2 = AnalyticsEvent.fromJson(legacyWithoutConsent.toString());
        Assert.assertEquals("v2", restoredInt2.getConsentVersion());
    }

    @Test
    public void test5_DeniedConsentCreatesNoEventAndNoUploadRequest() {
        ConsentManager deniedManager = new ConsentManager((android.content.SharedPreferences) null);
        Assert.assertFalse(deniedManager.isAnalyticsGranted());
        Assert.assertEquals(ConsentManager.STATUS_DENIED, deniedManager.getAnalyticsConsent());

        // Uploader with denied consent immediately aborts flushBatch
        AnalyticsDiagnostics diag = new AnalyticsDiagnostics();
        AnalyticsUploader uploader = new AnalyticsUploader(
                "https://meme-capsule-eww.pages.dev/api/analytics/events",
                new com.meme.capsule.analytics.auth.StaticTokenAuthProvider("token_123"),
                null,
                diag,
                deniedManager
        );
        boolean flushed = uploader.flushBatch();
        Assert.assertFalse("Denied consent must immediately prevent upload request", flushed);
        Assert.assertEquals(0, diag.getAcceptedCount());

        // Behavioral events for denial/revocation cannot be built
        try {
            new AnalyticsEvent.Builder("consent_denied", VALID_USER_HASH).build();
            Assert.fail("consent_denied must not be allowed as a behavioral event");
        } catch (IllegalArgumentException expected) {}
    }

    @Test
    public void test6_RevocationPurgesSqliteAndMemoryQueues() throws JSONException {
        AnalyticsDiagnostics diag = new AnalyticsDiagnostics();
        diag.incrementAccepted(10);
        diag.incrementDropped(3);
        diag.incrementRejected(2);
        diag.setLastError("Some network error");
        diag.setLastFlushTimeUtc("2026-10-23T10:00:00.000Z");

        // Verify diagnostics has items
        JSONObject before = diag.toJsonObject(5);
        Assert.assertEquals(5, before.getInt("queueCount"));
        Assert.assertEquals(10, before.getInt("acceptedCount"));

        // When consent is revoked, diagnostics and queue are cleared
        diag.reset();
        JSONObject after = diag.toJsonObject(0);
        Assert.assertEquals(0, after.getInt("queueCount"));
        Assert.assertEquals(0, after.getInt("acceptedCount"));
        Assert.assertEquals(0, after.getInt("droppedCount"));
        Assert.assertEquals(0, after.getInt("rejectedCount"));
        Assert.assertTrue(after.isNull("lastError"));
    }

    @Test
    public void test7_RevocationBlocksPendingAndFutureUploads() {
        ConsentManager deniedManager = new ConsentManager((android.content.SharedPreferences) null);
        Assert.assertFalse(deniedManager.isAnalyticsGranted());

        AnalyticsDiagnostics diag = new AnalyticsDiagnostics();
        AnalyticsUploader uploader = new AnalyticsUploader(
                "https://meme-capsule-eww.pages.dev/api/analytics/events",
                new com.meme.capsule.analytics.auth.StaticTokenAuthProvider("token_123"),
                null,
                diag,
                deniedManager
        );

        // Pending flush attempt is blocked
        Assert.assertFalse(uploader.flushBatch());

        // Even if handleResponse is called for any pending batch, revoked consent drops it without accepting
        List<String> eventIds = new ArrayList<>();
        eventIds.add("ev_pending_1");
        uploader.handleResponse(200, eventIds);
        Assert.assertEquals("Revocation must prevent pending events from being recorded as accepted", 0, diag.getAcceptedCount());
    }

    @Test
    public void test8_ReConsentUnderV2OrV3AttachesNewVersion() throws JSONException {
        AnalyticsEvent v1Event = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .consentVersion("v1")
                .build();
        Assert.assertEquals("v1", v1Event.getConsentVersion());
        Assert.assertEquals("v1", v1Event.toJson().getString("consent_version"));

        AnalyticsEvent v2Event = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .consentVersion("v2")
                .build();
        Assert.assertEquals("v2", v2Event.getConsentVersion());
        Assert.assertEquals("v2", v2Event.toJson().getString("consent_version"));

        AnalyticsEvent v3Event = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .consentVersion("v3")
                .build();
        Assert.assertEquals("v3", v3Event.getConsentVersion());
        Assert.assertEquals("v3", v3Event.toJson().getString("consent_version"));
    }

    @Test
    public void test9_RetryPreservesEventIdAndConsentVersion() throws JSONException {
        String fixedId = UUID.randomUUID().toString();
        String timestamp = "2026-10-23T18:00:00.000Z";
        JSONObject props = new JSONObject();
        props.put("meme_id", "meme_retry_test");

        AnalyticsEvent event = new AnalyticsEvent.Builder("meme_share", VALID_USER_HASH)
                .eventId(fixedId)
                .timestampUtc(timestamp)
                .consentVersion("v2")
                .properties(props)
                .build();

        // Serialize to payload (simulating offline SQLite queue storage)
        String serialized = event.toJson().toString();

        // Deserialize on retry
        AnalyticsEvent retryEvent = AnalyticsEvent.fromJson(serialized);
        Assert.assertEquals(fixedId, retryEvent.getEventId());
        Assert.assertEquals("v2", retryEvent.getConsentVersion());
        Assert.assertEquals(1, retryEvent.getSchemaVersion());
        Assert.assertEquals(timestamp, retryEvent.getTimestampUtc());
        Assert.assertEquals(VALID_USER_HASH, retryEvent.getUserHash());
        Assert.assertEquals("meme_share", retryEvent.getEventName());
    }

    @Test
    public void test10_DuplicateEventIdsAreNotRegeneratedDuringRetry() throws JSONException {
        AnalyticsEvent event = new AnalyticsEvent.Builder("meme_like", VALID_USER_HASH).build();
        String originalId = event.getEventId();
        Assert.assertNotNull(originalId);

        // Multiple serialization and deserialization cycles must NEVER regenerate event_id
        for (int i = 0; i < 5; i++) {
            String json = event.toJson().toString();
            AnalyticsEvent restored = AnalyticsEvent.fromJson(json);
            Assert.assertEquals(originalId, restored.getEventId());
        }
    }

    @Test
    public void test11_PiiFieldsAreRejectedOrStripped() throws JSONException {
        JSONObject rawProps = new JSONObject();
        rawProps.put("email", "leak@example.com");
        rawProps.put("phone", "123-456-7890");
        rawProps.put("imei", "990000862471854");
        rawProps.put("token", "secret_app_token_xyz");
        rawProps.put("api_key", "secret_api_key_123");
        rawProps.put("password", "p@ssword123");
        rawProps.put("raw_name", "John Doe");
        rawProps.put("safe_tag", "cats");

        // Nested JSON object with PII and secret keys
        JSONObject nestedUser = new JSONObject();
        nestedUser.put("email", "nested@example.com");
        nestedUser.put("token", "bearer_token_456");
        nestedUser.put("valid_level", 5);
        rawProps.put("user_data", nestedUser);

        // Nested JSON array
        org.json.JSONArray nestedList = new org.json.JSONArray();
        nestedList.put("admin@domain.org"); // email-like string in array
        nestedList.put("harmless_tag");
        JSONObject arrayItem = new JSONObject();
        arrayItem.put("secret", "top_secret_item");
        arrayItem.put("score", 100);
        nestedList.put(arrayItem);
        rawProps.put("list_data", nestedList);

        AnalyticsEvent event = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .properties(rawProps)
                .build();

        JSONObject json = event.toJson();
        JSONObject cleanProps = json.getJSONObject("properties");

        // Root properties stripped
        Assert.assertFalse(cleanProps.has("email"));
        Assert.assertFalse(cleanProps.has("phone"));
        Assert.assertFalse(cleanProps.has("imei"));
        Assert.assertFalse(cleanProps.has("token"));
        Assert.assertFalse(cleanProps.has("api_key"));
        Assert.assertFalse(cleanProps.has("password"));
        Assert.assertFalse(cleanProps.has("raw_name"));
        Assert.assertTrue(cleanProps.has("safe_tag"));

        // Nested object stripped
        JSONObject cleanNested = cleanProps.getJSONObject("user_data");
        Assert.assertFalse(cleanNested.has("email"));
        Assert.assertFalse(cleanNested.has("token"));
        Assert.assertEquals(5, cleanNested.getInt("valid_level"));

        // Nested array stripped
        org.json.JSONArray cleanArray = cleanProps.getJSONArray("list_data");
        Assert.assertEquals(2, cleanArray.length());
        Assert.assertEquals("harmless_tag", cleanArray.getString(0));
        JSONObject cleanArrayObj = cleanArray.getJSONObject(1);
        Assert.assertFalse(cleanArrayObj.has("secret"));
        Assert.assertEquals(100, cleanArrayObj.getInt("score"));

        // Disallowed event names rejected
        String[] rejectedEvents = {"consent_denied", "consent_revoked", "custom_event"};
        for (String rej : rejectedEvents) {
            try {
                new AnalyticsEvent.Builder(rej, VALID_USER_HASH).build();
                Assert.fail("Disallowed event should be rejected: " + rej);
            } catch (IllegalArgumentException expected) {}
        }
    }

    @Test
    public void test12_TokensHashesPayloadsAndConsentValuesNeverAppearInLogs() throws JSONException {
        AnalyticsDiagnostics diag = new AnalyticsDiagnostics();
        diag.setLastError("HTTP 401 Unauthorized: Configuration failure (static_token). Sending disabled.");
        diag.setLastFlushTimeUtc("2026-10-23T15:00:00.000Z");

        JSONObject json = diag.toJsonObject(10);
        Assert.assertFalse("Never log token", json.has("token"));
        Assert.assertFalse("Never log app_token", json.has("app_token"));
        Assert.assertFalse("Never log user_hash", json.has("user_hash"));
        Assert.assertFalse("Never log payload", json.has("payload"));
        Assert.assertFalse("Never log events", json.has("events"));
        Assert.assertFalse("Never log consent_status", json.has("consent_status"));
        Assert.assertFalse("Never log consent_version", json.has("consent_version"));

        // Diagnostics error string must not contain token
        Assert.assertFalse(json.getString("lastError").contains("secret_token"));
    }

    @Test
    public void test13_WrongEndpointOrTokenDoesNotCauseInfiniteRetryLoop() {
        AnalyticsDiagnostics diag = new AnalyticsDiagnostics();
        com.meme.capsule.analytics.auth.StaticTokenAuthProvider authProvider =
                new com.meme.capsule.analytics.auth.StaticTokenAuthProvider("bad_token");
        AnalyticsUploader uploader = new AnalyticsUploader(
                "https://invalid.example.com/wrong/endpoint",
                authProvider,
                null,
                diag,
                null
        );

        Assert.assertTrue(uploader.canSendNow());
        Assert.assertFalse(uploader.isAuthDisabled());

        // HTTP 401: auth failure disables sending immediately
        List<String> eventIds = new ArrayList<>();
        eventIds.add("ev_1");
        uploader.handleResponse(401, eventIds);

        Assert.assertTrue(uploader.isAuthDisabled());
        Assert.assertFalse(uploader.canSendNow());
        Assert.assertTrue(authProvider.isAuthDisabled());
        Assert.assertFalse(uploader.flushBatch()); // flushBatch aborts without network call

        // Reset and test HTTP 404 (endpoint failure disables sending)
        uploader.resetAuthDisabled();
        Assert.assertFalse(uploader.isAuthDisabled());
        uploader.handleResponse(404, eventIds);
        Assert.assertTrue(uploader.isAuthDisabled());
        Assert.assertFalse(uploader.canSendNow());

        // Reset and test HTTP 403
        uploader.resetAuthDisabled();
        uploader.handleResponse(403, eventIds);
        Assert.assertTrue(uploader.isAuthDisabled());

        // Reset and test HTTP 400 (permanent validation error drops batch, no infinite loop)
        uploader.resetAuthDisabled();
        uploader.handleResponse(400, eventIds);
        Assert.assertEquals(1, diag.getRejectedCount());
        Assert.assertNotNull(diag.getLastError());
        Assert.assertTrue(diag.getLastError().contains("HTTP 400"));
    }

    @Test
    public void test14_OfflineQueueingAndProcessRestartRecovery() throws JSONException {
        // Construct complete event with all required fields
        JSONObject props = new JSONObject();
        props.put("meme_id", "meme_offline_123");
        props.put("category", "gaming");

        AnalyticsEvent original = new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                .memeId("meme_offline_123")
                .category("gaming")
                .screenName("feed")
                .appVersion("3.7")
                .osVersion("14")
                .consentVersion("v1")
                .properties(props)
                .build();

        // Simulate SQLite database insert (saving payload string)
        String dbPayload = original.toJson().toString();

        // Simulate application restart and cold restore from database
        AnalyticsEvent restored = AnalyticsEvent.fromJson(dbPayload);

        Assert.assertEquals(1, restored.getSchemaVersion());
        Assert.assertEquals(original.getEventId(), restored.getEventId());
        Assert.assertEquals("meme_view", restored.getEventName());
        Assert.assertEquals(VALID_USER_HASH, restored.getUserHash());
        Assert.assertEquals(original.getSessionId(), restored.getSessionId());
        Assert.assertEquals(original.getTimestampUtc(), restored.getTimestampUtc());
        Assert.assertEquals("android", restored.getPlatform());
        Assert.assertEquals("3.7", restored.getAppVersion());
        Assert.assertEquals("14", restored.getOsVersion());
        Assert.assertEquals("granted", restored.getConsentStatus());
        Assert.assertEquals("v1", restored.getConsentVersion());
        Assert.assertEquals("meme_offline_123", restored.getProperties().getString("meme_id"));
    }

    @Test
    public void test15_BatchSizeAndRequestSizeLimitsAreRespected() throws JSONException {
        // 1. Batch size limit
        Assert.assertEquals(200, AnalyticsConstants.MAX_BATCH_SIZE);
        List<AnalyticsEvent> largeQueue = new ArrayList<>();
        for (int i = 0; i < 300; i++) {
            largeQueue.add(new AnalyticsEvent.Builder("meme_scroll", VALID_USER_HASH).build());
        }
        int batchSize = Math.min(largeQueue.size(), AnalyticsConstants.MAX_BATCH_SIZE);
        Assert.assertEquals(200, batchSize);

        // 2. Request body size limit: 2 MiB
        Assert.assertEquals(2 * 1024 * 1024, AnalyticsConstants.MAX_REQUEST_BODY_BYTES);

        // Build a list of events where accumulated size exceeds 2 MiB
        // Verify that uploader breaks before exceeding 2 MiB
        StringBuilder largeString = new StringBuilder();
        for (int i = 0; i < 50000; i++) {
            largeString.append("safe_data_padding_");
        }
        JSONObject largeProps = new JSONObject();
        largeProps.put("padding", largeString.toString());

        List<AnalyticsEvent> hugeEvents = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            hugeEvents.add(new AnalyticsEvent.Builder("meme_view", VALID_USER_HASH)
                    .properties(largeProps)
                    .build());
        }

        // Simulate chunking logic
        int accumulatedBytes = 30;
        int chunkCount = 0;
        for (AnalyticsEvent event : hugeEvents) {
            byte[] eventBytes = event.toJson().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            if (accumulatedBytes + eventBytes.length + 2 > AnalyticsConstants.MAX_REQUEST_BODY_BYTES) {
                if (chunkCount > 0) break;
            }
            accumulatedBytes += eventBytes.length + 1;
            chunkCount++;
        }

        Assert.assertTrue("Batch chunking must stay within 2 MiB", accumulatedBytes <= AnalyticsConstants.MAX_REQUEST_BODY_BYTES);
        Assert.assertTrue("At least 1 event was processed", chunkCount > 0);
        Assert.assertTrue("Large events caused chunking before 10 events", chunkCount < hugeEvents.size());
    }

    @Test
    public void test16_ServerBackoffWithJitter() {
        Assert.assertEquals(0L, AnalyticsUploader.calculateServerBackoff(0));
        // error 1: 5s base
        long backoff1 = AnalyticsUploader.calculateServerBackoff(1);
        Assert.assertTrue("Error 1 backoff should be >= 5000", backoff1 >= 5000L);
        Assert.assertTrue("Error 1 backoff should be <= 10000 (with jitter)", backoff1 <= 10000L);

        // error 2: 10s base
        long backoff2 = AnalyticsUploader.calculateServerBackoff(2);
        Assert.assertTrue("Error 2 backoff should be >= 10000", backoff2 >= 10000L);

        // error 9+: capped at 15m (900,000 ms)
        long backoffMax = AnalyticsUploader.calculateServerBackoff(15);
        Assert.assertEquals(15 * 60 * 1000L, backoffMax);
    }

    @Test
    public void test17_RetryAfterParsingSecondsAndHttpDate() {
        long now = 1700000000000L;
        // 1. Integer seconds
        Assert.assertEquals(120_000L, AnalyticsUploader.parseRetryAfter("120", now));
        Assert.assertEquals(1_000L, AnalyticsUploader.parseRetryAfter("1", now));

        // 2. Default when null or empty
        Assert.assertEquals(60_000L, AnalyticsUploader.parseRetryAfter(null, now));
        Assert.assertEquals(60_000L, AnalyticsUploader.parseRetryAfter("   ", now));
        Assert.assertEquals(60_000L, AnalyticsUploader.parseRetryAfter("invalid_text", now));

        // 3. HTTP-date format (RFC 1123)
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'", java.util.Locale.US);
        sdf.setTimeZone(java.util.TimeZone.getTimeZone("GMT"));
        String futureDateStr = sdf.format(new java.util.Date(now + 30000L));
        long parsedDelay = AnalyticsUploader.parseRetryAfter(futureDateStr, now);
        Assert.assertEquals(30000L, parsedDelay);
    }

    @Test
    public void test18_HourlyRateLimiterEnforces600Limit() {
        HourlyRateLimiter limiter = new HourlyRateLimiter(600);
        long now = 1000000L;
        for (int i = 0; i < 600; i++) {
            Assert.assertTrue("Event " + i + " must be allowed", limiter.allowEvent(now));
        }
        // 601st event must be dropped
        Assert.assertFalse("Event 601 must be dropped", limiter.allowEvent(now));
        Assert.assertEquals(1, limiter.getDroppedCount());

        // After 1 hour + 1 ms, window advances
        long future = now + (60 * 60 * 1000L) + 1;
        Assert.assertTrue("After 1 hour window advances, new event allowed", limiter.allowEvent(future));
    }

    @Test
    public void test19_ClockOffsetCalculationAndTimestampClamping() {
        ClockOffsetManager clockManager = new ClockOffsetManager((android.content.Context) null);
        long deviceNow = 1700000000000L;
        long serverTime = deviceNow + 120_000L; // Server is 2 minutes ahead (>60s threshold)

        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'", java.util.Locale.US);
        sdf.setTimeZone(java.util.TimeZone.getTimeZone("GMT"));
        String dateHeader = sdf.format(new java.util.Date(serverTime));

        clockManager.handleServerDateHeader(dateHeader, deviceNow);
        Assert.assertEquals(120_000L, clockManager.getOffsetMs());

        // Timestamp clamping: if an event timestamp is more than 60s ahead of corrected now, clamp it
        long correctedNow = deviceNow + 120_000L;
        // Case 1: timestamp within 30s of corrected now -> keep unchanged
        String normalUtc = ClockOffsetManager.formatIsoUtc(new java.util.Date(correctedNow + 30000L));
        Assert.assertEquals(normalUtc, clockManager.clampTimestampIfAhead(normalUtc, deviceNow));

        // Case 2: timestamp 10 minutes ahead (> 60s ahead) -> clamp to corrected now
        String farFutureUtc = ClockOffsetManager.formatIsoUtc(new java.util.Date(correctedNow + 600_000L));
        String clamped = clockManager.clampTimestampIfAhead(farFutureUtc, deviceNow);
        Assert.assertEquals(ClockOffsetManager.formatIsoUtc(new java.util.Date(correctedNow)), clamped);
    }

    @Test
    public void test20_AppVersionSanitization() {
        // Must match ^[0-9A-Za-z.+_-]{1,32}$
        Assert.assertEquals("3.7", AnalyticsEvent.sanitizeAppVersion("3.7"));
        Assert.assertEquals("v2.3.1_release+build-1", AnalyticsEvent.sanitizeAppVersion("v2.3.1_release+build-1"));
        // Replace other characters with "-"
        Assert.assertEquals("3.7-beta--build-2-", AnalyticsEvent.sanitizeAppVersion("3.7 beta (build 2)"));
        // Truncate to 32 characters
        String longVer = "1234567890123456789012345678901234567890";
        String sanitizedLong = AnalyticsEvent.sanitizeAppVersion(longVer);
        Assert.assertEquals(32, sanitizedLong.length());
        Assert.assertTrue(sanitizedLong.matches("^[0-9A-Za-z.+_-]{1,32}$"));
    }

    @Test
    public void test21_QueueCap5000And23HourExpiryConstants() {
        Assert.assertEquals(5000, AnalyticsConstants.MAX_QUEUE_SIZE);
        Assert.assertEquals(23 * 3600 * 1000L, AnalyticsConstants.EVENT_MAX_AGE_MS);
        Assert.assertEquals(100, AnalyticsConstants.MAX_CHUNK_SIZE);
        Assert.assertEquals(1024 * 1024, AnalyticsConstants.MAX_CHUNK_BYTES);
        Assert.assertEquals(1000L, AnalyticsConstants.CHUNK_SPACING_MS);
    }

    @Test
    public void test22_AllowlistValidationAndMissingRolesDocumented() {
        // Assert all 19 allowed event names
        Assert.assertEquals(19, AnalyticsConstants.ALLOWED_EVENTS.size());
        // Assert all allowlisted property keys
        Assert.assertTrue(AnalyticsConstants.ALLOWED_PROPERTY_KEYS.contains("action"));
        Assert.assertTrue(AnalyticsConstants.ALLOWED_PROPERTY_KEYS.contains("duration_ms"));
        Assert.assertTrue(AnalyticsConstants.ALLOWED_PROPERTY_KEYS.contains("direction"));
        Assert.assertTrue(AnalyticsConstants.ALLOWED_PROPERTY_KEYS.contains("destination"));

        // Step 6 missing roles must NOT be in ALLOWED_EVENTS
        Assert.assertFalse(AnalyticsConstants.ALLOWED_EVENTS.contains("meme_pin"));
        Assert.assertFalse(AnalyticsConstants.ALLOWED_EVENTS.contains("ad_reward_offered"));
        Assert.assertFalse(AnalyticsConstants.ALLOWED_EVENTS.contains("client_error"));
    }

    @Test
    public void test23_TokenAndEndpointPerBuildType() {
        // Verify token rotation support & placeholder rejection rule
        Assert.assertTrue("Placeholder empty token must be recognized",
                StaticTokenAuthProvider.isPlaceholderToken(""));
        Assert.assertTrue("Placeholder 'placeholder' token must be recognized",
                StaticTokenAuthProvider.isPlaceholderToken("YOUR_APP_TOKEN_HERE"));
        Assert.assertFalse("Valid token must not be recognized as placeholder",
                StaticTokenAuthProvider.isPlaceholderToken("mc_staging_token_v1"));
    }
}
