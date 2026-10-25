package com.meme.capsule.analytics.auth;

import com.meme.capsule.analytics.AnalyticsConstants;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Authentication provider using the static X-Analytics-App-Token header.
 *
 * SECURITY NOTE:
 * Any static token compiled into an Android APK or frontend bundle is recoverable
 * by client-side inspection and reverse engineering. This token acts strictly as
 * temporary coarse abuse throttling and must NOT be treated as a secret or durable
 * proof of client integrity.
 */
public class StaticTokenAuthProvider implements AnalyticsAuthProvider {
    private final String appToken;
    private boolean authDisabled = false;

    public StaticTokenAuthProvider(String appToken) {
        this.appToken = (appToken != null) ? appToken.trim() : "";
    }

    @Override
    public Map<String, String> getAuthHeaders() {
        if (appToken.isEmpty() || authDisabled) {
            return Collections.emptyMap();
        }
        Map<String, String> headers = new HashMap<>();
        headers.put(AnalyticsConstants.HEADER_TOKEN, appToken);
        return headers;
    }

    @Override
    public void onAuthFailure() {
        this.authDisabled = true;
    }

    @Override
    public boolean isConfigured() {
        return !appToken.isEmpty();
    }

    @Override
    public String getAuthMode() {
        return "static_token";
    }

    public boolean isAuthDisabled() {
        return authDisabled;
    }

    public void resetAuthDisabled() {
        this.authDisabled = false;
    }

    public static boolean isPlaceholderToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return true;
        }
        String lower = token.trim().toLowerCase();
        return lower.contains("placeholder") || lower.contains("your_app_token");
    }
}
