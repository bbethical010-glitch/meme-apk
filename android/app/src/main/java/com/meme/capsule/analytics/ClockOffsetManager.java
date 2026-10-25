package com.meme.capsule.analytics;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class ClockOffsetManager {
    private static final String PREF_NAME = "meme_capsule_clock_offset";
    private static final String KEY_OFFSET_MS = "server_clock_offset_ms";

    private final SharedPreferences preferences;
    private long memoryOffsetMs = 0L;

    public ClockOffsetManager(Context context) {
        if (context != null) {
            this.preferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            this.memoryOffsetMs = preferences.getLong(KEY_OFFSET_MS, 0L);
        } else {
            this.preferences = null;
        }
    }

    public ClockOffsetManager(SharedPreferences preferences) {
        this.preferences = preferences;
        if (preferences != null) {
            this.memoryOffsetMs = preferences.getLong(KEY_OFFSET_MS, 0L);
        }
    }

    public synchronized long getOffsetMs() {
        if (preferences != null) {
            return preferences.getLong(KEY_OFFSET_MS, memoryOffsetMs);
        }
        return memoryOffsetMs;
    }

    public synchronized void recordServerTime(long serverTimeMs, long deviceTimeMs) {
        long offset = serverTimeMs - deviceTimeMs;
        if (Math.abs(offset) > AnalyticsConstants.CLOCK_OFFSET_THRESHOLD_MS) {
            this.memoryOffsetMs = offset;
            if (preferences != null) {
                preferences.edit().putLong(KEY_OFFSET_MS, offset).apply();
            }
        }
    }

    public synchronized void clear() {
        this.memoryOffsetMs = 0L;
        if (preferences != null) {
            preferences.edit().remove(KEY_OFFSET_MS).apply();
        }
    }

    public long getCorrectedNow() {
        return System.currentTimeMillis() + getOffsetMs();
    }

    public synchronized void handleServerDateHeader(String dateHeader, long deviceNowMs) {
        if (dateHeader == null || dateHeader.trim().isEmpty()) return;
        try {
            Date serverDate = parseHttpDate(dateHeader);
            recordServerTime(serverDate.getTime(), deviceNowMs);
        } catch (Exception ignored) {}
    }

    public synchronized String clampTimestampIfAhead(String timestampUtc, long deviceNowMs) {
        if (timestampUtc == null) return null;
        try {
            Date eventDate = parseIsoUtc(timestampUtc);
            long correctedNow = deviceNowMs + getOffsetMs();
            if (eventDate.getTime() > correctedNow + AnalyticsConstants.TIMESTAMP_MAX_FUTURE_CLAMP_MS) {
                return formatIsoUtc(correctedNow);
            }
        } catch (Exception ignored) {}
        return timestampUtc;
    }

    public static String formatIsoUtc(Date date) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(date);
    }

    public static String formatIsoUtc(long timestampMs) {
        return formatIsoUtc(new Date(timestampMs));
    }

    public static Date parseIsoUtc(String isoString) throws ParseException {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.parse(isoString);
    }

    public static Date parseHttpDate(String httpDateStr) throws ParseException {
        SimpleDateFormat rfc1123 = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss z", Locale.US);
        return rfc1123.parse(httpDateStr.trim());
    }
}
