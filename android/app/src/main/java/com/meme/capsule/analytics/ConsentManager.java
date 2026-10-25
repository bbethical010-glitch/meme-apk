package com.meme.capsule.analytics;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class ConsentManager {
    private static final String PREF_NAME = "meme_capsule_consent_prefs";
    public static final String KEY_ANALYTICS_CONSENT = "analytics_consent";
    public static final String KEY_ADVERTISING_CONSENT = "advertising_consent";
    public static final String KEY_CONSENT_VERSION = "consent_version";
    public static final String KEY_CONSENT_TIMESTAMP_UTC = "consent_timestamp_utc";

    public static final String STATUS_GRANTED = "granted";
    public static final String STATUS_DENIED = "denied";
    public static final String DEFAULT_CONSENT_VERSION = "v1";

    private final SharedPreferences prefs;

    public ConsentManager(Context context) {
        this.prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public ConsentManager(SharedPreferences prefs) {
        this.prefs = prefs;
    }

    public synchronized boolean isAnalyticsGranted() {
        if (prefs == null) return false;
        String status = prefs.getString(KEY_ANALYTICS_CONSENT, STATUS_DENIED);
        return STATUS_GRANTED.equalsIgnoreCase(status);
    }

    public synchronized boolean isAdvertisingGranted() {
        if (prefs == null) return false;
        String status = prefs.getString(KEY_ADVERTISING_CONSENT, STATUS_DENIED);
        return STATUS_GRANTED.equalsIgnoreCase(status);
    }

    public synchronized String getAnalyticsConsent() {
        return isAnalyticsGranted() ? STATUS_GRANTED : STATUS_DENIED;
    }

    public synchronized String getAdvertisingConsent() {
        return isAdvertisingGranted() ? STATUS_GRANTED : STATUS_DENIED;
    }

    public synchronized String getConsentVersion() {
        if (prefs == null) return DEFAULT_CONSENT_VERSION;
        try {
            String v = prefs.getString(KEY_CONSENT_VERSION, null);
            if (v != null && !v.trim().isEmpty()) {
                return normalizeConsentVersion(v);
            }
        } catch (ClassCastException cce) {
            // Legacy pref stored as int
            try {
                int legacyInt = prefs.getInt(KEY_CONSENT_VERSION, 1);
                return normalizeConsentVersion(legacyInt);
            } catch (Exception ignored) {}
        }
        return DEFAULT_CONSENT_VERSION;
    }

    public synchronized int getConsentVersionNumber() {
        String ver = getConsentVersion();
        if (ver.startsWith("v") || ver.startsWith("V")) {
            try {
                return Integer.parseInt(ver.substring(1));
            } catch (NumberFormatException ignored) {}
        }
        try {
            return Integer.parseInt(ver);
        } catch (NumberFormatException ignored) {}
        return 1;
    }

    public static String normalizeConsentVersion(String version) {
        if (version == null || version.trim().isEmpty()) {
            return DEFAULT_CONSENT_VERSION;
        }
        String trimmed = version.trim().toLowerCase(Locale.US);
        if (trimmed.matches("^\\d+$")) {
            return "v" + trimmed;
        }
        if (trimmed.matches("^v\\d+$")) {
            return trimmed;
        }
        return DEFAULT_CONSENT_VERSION;
    }

    public static String normalizeConsentVersion(int version) {
        return version > 0 ? "v" + version : DEFAULT_CONSENT_VERSION;
    }

    public synchronized String getConsentTimestampUtc() {
        return prefs != null ? prefs.getString(KEY_CONSENT_TIMESTAMP_UTC, "") : "";
    }

    public synchronized void updateConsent(boolean analyticsGranted, boolean advertisingGranted, String version, String timestampUtc) {
        if (timestampUtc == null || timestampUtc.trim().isEmpty()) {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
            timestampUtc = sdf.format(new Date());
        }

        String normalizedVersion = normalizeConsentVersion(version);

        if (prefs != null) {
            prefs.edit()
                    .putString(KEY_ANALYTICS_CONSENT, analyticsGranted ? STATUS_GRANTED : STATUS_DENIED)
                    .putString(KEY_ADVERTISING_CONSENT, advertisingGranted ? STATUS_GRANTED : STATUS_DENIED)
                    .putString(KEY_CONSENT_VERSION, normalizedVersion)
                    .putString(KEY_CONSENT_TIMESTAMP_UTC, timestampUtc)
                    .apply();
        }
    }

    public synchronized void updateConsent(boolean analyticsGranted, boolean advertisingGranted, int version, String timestampUtc) {
        updateConsent(analyticsGranted, advertisingGranted, normalizeConsentVersion(version), timestampUtc);
    }

    public synchronized JSONObject toJsonObject() {
        JSONObject json = new JSONObject();
        try {
            json.put(KEY_ANALYTICS_CONSENT, getAnalyticsConsent());
            json.put(KEY_ADVERTISING_CONSENT, getAdvertisingConsent());
            json.put(KEY_CONSENT_VERSION, getConsentVersion());
            json.put(KEY_CONSENT_TIMESTAMP_UTC, getConsentTimestampUtc());
        } catch (JSONException ignored) {}
        return json;
    }
}
