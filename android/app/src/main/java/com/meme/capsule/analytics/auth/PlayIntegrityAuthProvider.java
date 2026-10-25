package com.meme.capsule.analytics.auth;

import java.util.Map;

/**
 * Architecture stub for future production attestation using Google Play Integrity API.
 *
 * Production Design:
 * 1. Request integrity token from Google Play Services Play Integrity API.
 * 2. Exchange integrity token with backend /api/analytics/session for a short-lived cryptographically signed token.
 * 3. Attach bearer token in HTTP Authorization header.
 *
 * NOTE: Unimplemented until backend attestation endpoint is deployed. Throws UnsupportedOperationException if invoked.
 */
public class PlayIntegrityAuthProvider implements AnalyticsAuthProvider {

    @Override
    public Map<String, String> getAuthHeaders() {
        throw new UnsupportedOperationException(
                "PlayIntegrityAuthProvider is not yet implemented on the backend. " +
                "Use StaticTokenAuthProvider until Play Integrity backend verification is deployed."
        );
    }

    @Override
    public void onAuthFailure() {
        // Reserved for session token refresh upon backend implementation
    }

    @Override
    public boolean isConfigured() {
        return false;
    }

    @Override
    public String getAuthMode() {
        return "play_integrity";
    }
}
