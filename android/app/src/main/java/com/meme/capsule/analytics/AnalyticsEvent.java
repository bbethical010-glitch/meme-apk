package com.meme.capsule.analytics;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Date;
import java.util.Iterator;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

public class AnalyticsEvent {
    private static final Pattern USER_HASH_PATTERN = Pattern.compile("^[0-9a-f]{64}$");

    private final int schemaVersion;
    private final String eventId;
    private final String eventName;
    private final String userHash;
    private final String sessionId;
    private String timestampUtc;
    private final String platform;
    private final String appVersion;
    private final String osVersion;
    private final String country;
    private final String memeId;
    private final String category;
    private final String sourceChannel;
    private final String screenName;
    private final JSONObject properties;
    private final String consentStatus;
    private final String consentVersion;

    public AnalyticsEvent(Builder builder) {
        if (!AnalyticsConstants.ALLOWED_EVENTS.contains(builder.eventName)) {
            throw new IllegalArgumentException("Disallowed event_name: " + builder.eventName);
        }
        if (builder.userHash == null || !USER_HASH_PATTERN.matcher(builder.userHash).matches()) {
            throw new IllegalArgumentException("user_hash must be a 64-character lowercase SHA-256 hex string");
        }

        this.schemaVersion = AnalyticsConstants.SCHEMA_VERSION;
        this.eventId = builder.eventId != null ? builder.eventId : UUID.randomUUID().toString();
        this.eventName = builder.eventName;
        this.userHash = builder.userHash.toLowerCase(Locale.ROOT);
        this.sessionId = builder.sessionId != null ? builder.sessionId : UUID.randomUUID().toString();
        this.timestampUtc = builder.timestampUtc != null ? builder.timestampUtc : ClockOffsetManager.formatIsoUtc(new Date());
        this.platform = AnalyticsConstants.PLATFORM;
        this.appVersion = sanitizeAppVersion(builder.appVersion);
        this.osVersion = builder.osVersion != null ? builder.osVersion : "Android";
        this.country = builder.country;
        this.memeId = builder.memeId;
        this.category = builder.category;
        this.sourceChannel = builder.sourceChannel;
        this.screenName = builder.screenName;
        this.properties = sanitizeProperties(builder.properties);
        this.consentStatus = "granted";
        this.consentVersion = builder.consentVersion != null && !builder.consentVersion.trim().isEmpty()
                ? ConsentManager.normalizeConsentVersion(builder.consentVersion)
                : ConsentManager.DEFAULT_CONSENT_VERSION;
    }

    /**
     * Sanitizes app_version to strictly conform to ^[0-9A-Za-z.+_-]{1,32}$
     * Non-matching characters are replaced with "-", truncated to 32 characters.
     */
    public static String sanitizeAppVersion(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return "1.0";
        }
        String replaced = raw.replaceAll("[^0-9A-Za-z.+_-]", "-");
        if (replaced.length() > 32) {
            replaced = replaced.substring(0, 32);
        }
        return replaced.isEmpty() ? "1.0" : replaced;
    }

    public static JSONObject sanitizeProperties(JSONObject input) {
        JSONObject sanitized = new JSONObject();
        if (input == null) return sanitized;

        Iterator<String> keys = input.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (key == null) continue;
            String lower = key.trim().toLowerCase(Locale.ROOT);
            if (AnalyticsConstants.PROHIBITED_PII_KEYS.contains(lower) ||
                lower.contains("token") || lower.contains("secret") || lower.contains("password") ||
                (lower.contains("key") && (lower.contains("api") || lower.contains("app")))) {
                continue; // drop PII and secret keys
            }
            try {
                Object val = input.get(key);
                if (val instanceof String) {
                    String strVal = (String) val;
                    if (strVal.toLowerCase(Locale.ROOT).contains("@") && strVal.contains(".")) {
                        continue; // potential email address
                    }
                    sanitized.put(key, strVal);
                } else if (val instanceof JSONObject) {
                    sanitized.put(key, sanitizeProperties((JSONObject) val));
                } else if (val instanceof org.json.JSONArray) {
                    sanitized.put(key, sanitizeJsonArray((org.json.JSONArray) val));
                } else {
                    sanitized.put(key, val);
                }
            } catch (JSONException ignored) {}
        }
        return sanitized;
    }

    private static org.json.JSONArray sanitizeJsonArray(org.json.JSONArray array) {
        org.json.JSONArray sanitized = new org.json.JSONArray();
        if (array == null) return sanitized;
        for (int i = 0; i < array.length(); i++) {
            try {
                Object item = array.get(i);
                if (item instanceof JSONObject) {
                    sanitized.put(sanitizeProperties((JSONObject) item));
                } else if (item instanceof org.json.JSONArray) {
                    sanitized.put(sanitizeJsonArray((org.json.JSONArray) item));
                } else if (item instanceof String) {
                    String strVal = (String) item;
                    if (!(strVal.toLowerCase(Locale.ROOT).contains("@") && strVal.contains("."))) {
                        if (strVal.length() > 256) {
                            strVal = strVal.substring(0, 256);
                        }
                        sanitized.put(strVal);
                    }
                } else {
                    sanitized.put(item);
                }
            } catch (JSONException ignored) {}
        }
        return sanitized;
    }

    public void clampTimestampIfAhead(long maxAllowedMs) {
        try {
            Date parsed = ClockOffsetManager.parseIsoUtc(this.timestampUtc);
            if (parsed.getTime() > maxAllowedMs) {
                this.timestampUtc = ClockOffsetManager.formatIsoUtc(maxAllowedMs);
            }
        } catch (Exception ignored) {}
    }

    public int getSchemaVersion() { return schemaVersion; }
    public String getEventId() { return eventId; }
    public String getEventName() { return eventName; }
    public String getUserHash() { return userHash; }
    public String getSessionId() { return sessionId; }
    public String getTimestampUtc() { return timestampUtc; }
    public String getPlatform() { return platform; }
    public String getAppVersion() { return appVersion; }
    public String getOsVersion() { return osVersion; }
    public String getCountry() { return country; }
    public String getMemeId() { return memeId; }
    public String getCategory() { return category; }
    public String getSourceChannel() { return sourceChannel; }
    public String getScreenName() { return screenName; }
    public JSONObject getProperties() { return properties; }
    public String getConsentStatus() { return consentStatus; }
    public String getConsentVersion() { return consentVersion; }

    public JSONObject toJson() throws JSONException {
        JSONObject json = new JSONObject();
        json.put("schema_version", schemaVersion);
        json.put("event_id", eventId);
        json.put("event_name", eventName);
        json.put("user_hash", userHash);
        json.put("session_id", sessionId);
        json.put("timestamp_utc", timestampUtc);
        json.put("platform", platform);
        json.put("app_version", appVersion);
        json.put("os_version", osVersion);

        if (country != null && !country.trim().isEmpty()) {
            json.put("country", country);
        }
        if (memeId != null && !memeId.trim().isEmpty()) {
            json.put("meme_id", memeId);
        }
        if (category != null && !category.trim().isEmpty()) {
            json.put("category", category);
        }
        if (sourceChannel != null && !sourceChannel.trim().isEmpty()) {
            json.put("source_channel", sourceChannel);
        }
        if (screenName != null && !screenName.trim().isEmpty()) {
            json.put("screen_name", screenName);
        }

        json.put("properties", properties != null ? properties : new JSONObject());
        json.put("consent_status", consentStatus);
        json.put("consent_version", consentVersion);
        return json;
    }

    public static AnalyticsEvent fromJson(String jsonString) throws JSONException {
        JSONObject json = new JSONObject(jsonString);
        Builder b = new Builder(json.getString("event_name"), json.getString("user_hash"))
                .eventId(json.optString("event_id", null))
                .sessionId(json.optString("session_id", null))
                .timestampUtc(json.optString("timestamp_utc", null))
                .appVersion(json.optString("app_version", null))
                .osVersion(json.optString("os_version", null))
                .country(json.has("country") ? json.optString("country") : null)
                .memeId(json.has("meme_id") ? json.optString("meme_id") : null)
                .category(json.has("category") ? json.optString("category") : null)
                .sourceChannel(json.has("source_channel") ? json.optString("source_channel") : null)
                .screenName(json.has("screen_name") ? json.optString("screen_name") : null)
                .consentVersion(json.optString("consent_version", ConsentManager.DEFAULT_CONSENT_VERSION));

        if (json.has("properties")) {
            b.properties(json.getJSONObject("properties"));
        }
        return b.build();
    }

    public static class Builder {
        private String eventId;
        private final String eventName;
        private final String userHash;
        private String sessionId;
        private String timestampUtc;
        private String appVersion;
        private String osVersion;
        private String country;
        private String memeId;
        private String category;
        private String sourceChannel;
        private String screenName;
        private JSONObject properties;
        private String consentVersion = ConsentManager.DEFAULT_CONSENT_VERSION;

        public Builder(String eventName, String userHash) {
            this.eventName = eventName;
            this.userHash = userHash;
        }

        public Builder eventId(String eventId) { this.eventId = eventId; return this; }
        public Builder sessionId(String sessionId) { this.sessionId = sessionId; return this; }
        public Builder timestampUtc(String timestampUtc) { this.timestampUtc = timestampUtc; return this; }
        public Builder appVersion(String appVersion) { this.appVersion = appVersion; return this; }
        public Builder osVersion(String osVersion) { this.osVersion = osVersion; return this; }
        public Builder country(String country) { this.country = country; return this; }
        public Builder memeId(String memeId) { this.memeId = memeId; return this; }
        public Builder category(String category) { this.category = category; return this; }
        public Builder sourceChannel(String sourceChannel) { this.sourceChannel = sourceChannel; return this; }
        public Builder screenName(String screenName) { this.screenName = screenName; return this; }
        public Builder properties(JSONObject properties) { this.properties = properties; return this; }
        public Builder consentVersion(String consentVersion) {
            this.consentVersion = consentVersion;
            return this;
        }
        public Builder consentVersion(int consentVersion) {
            this.consentVersion = ConsentManager.normalizeConsentVersion(consentVersion);
            return this;
        }

        public AnalyticsEvent build() {
            return new AnalyticsEvent(this);
        }
    }
}
