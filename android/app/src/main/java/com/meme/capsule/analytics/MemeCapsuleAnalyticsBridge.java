package com.meme.capsule.analytics;

import android.content.Context;
import android.util.Log;
import android.webkit.JavascriptInterface;

import org.json.JSONObject;

public class MemeCapsuleAnalyticsBridge {
    private static final String TAG = "AnalyticsBridge";
    private final Context context;
    private final AnalyticsManager analyticsManager;

    public MemeCapsuleAnalyticsBridge(Context context, AnalyticsManager analyticsManager) {
        this.context = context;
        this.analyticsManager = analyticsManager;
    }

    @JavascriptInterface
    public void trackEvent(String eventName, String memeId, String category, String screenName, String sourceChannel, String propertiesJson) {
        try {
            JSONObject props = null;
            if (propertiesJson != null && !propertiesJson.trim().isEmpty()) {
                props = new JSONObject(propertiesJson);
            }
            analyticsManager.trackEvent(eventName, memeId, category, screenName, sourceChannel, props);
        } catch (Throwable t) {
            if (com.meme.capsule.BuildConfig.DEBUG) {
                Log.w(TAG, "Bridge trackEvent error: " + t.getClass().getSimpleName());
            }
        }
    }

    @JavascriptInterface
    public void setConsent(boolean analyticsGranted, boolean advertisingGranted, String version, String timestampUtc) {
        try {
            analyticsManager.setConsent(analyticsGranted, advertisingGranted, version, timestampUtc);
        } catch (Throwable t) {
            if (com.meme.capsule.BuildConfig.DEBUG) {
                Log.w(TAG, "Bridge setConsent error: " + t.getClass().getSimpleName());
            }
        }
    }

    @JavascriptInterface
    public void setConsent(boolean analyticsGranted, boolean advertisingGranted, int version, String timestampUtc) {
        try {
            analyticsManager.setConsent(analyticsGranted, advertisingGranted, version, timestampUtc);
        } catch (Throwable t) {
            if (com.meme.capsule.BuildConfig.DEBUG) {
                Log.w(TAG, "Bridge setConsent error: " + t.getClass().getSimpleName());
            }
        }
    }

    @JavascriptInterface
    public String getConsentState() {
        try {
            return analyticsManager.getConsentManager().toJsonObject().toString();
        } catch (Throwable t) {
            return "{}";
        }
    }

    @JavascriptInterface
    public String getDiagnosticStats() {
        try {
            return analyticsManager.getDiagnosticStatsJson().toString();
        } catch (Throwable t) {
            return "{}";
        }
    }

    @JavascriptInterface
    public void flushQueue() {
        try {
            analyticsManager.flush();
        } catch (Throwable t) {
            if (com.meme.capsule.BuildConfig.DEBUG) {
                Log.w(TAG, "Bridge flushQueue error: " + t.getClass().getSimpleName());
            }
        }
    }

    @JavascriptInterface
    public void clearQueue() {
        try {
            analyticsManager.clearQueue();
        } catch (Throwable t) {
            if (com.meme.capsule.BuildConfig.DEBUG) {
                Log.w(TAG, "Bridge clearQueue error: " + t.getClass().getSimpleName());
            }
        }
    }
}
