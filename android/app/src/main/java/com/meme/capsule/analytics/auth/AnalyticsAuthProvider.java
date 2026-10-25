package com.meme.capsule.analytics.auth;

import java.util.Map;

/**
 * Pluggable authentication provider abstraction for analytics uploads.
 * Decouples network delivery from specific credential mechanisms
 * (e.g. static token vs Play Integrity attestation).
 */
public interface AnalyticsAuthProvider {
    /**
     * Returns HTTP request headers to attach to outgoing analytics batch delivery.
     * @return Map of header names to values.
     */
    Map<String, String> getAuthHeaders();

    /**
     * Called when the backend responds with HTTP 401 Unauthorized.
     * Allows providers to clear cached tokens, invalidate sessions, or transition to a disabled state.
     */
    void onAuthFailure();

    /**
     * Returns true if the provider has the necessary configuration to authenticate.
     */
    boolean isConfigured();

    /**
     * Identifier for telemetry / diagnostics (e.g. "static_token", "play_integrity").
     */
    String getAuthMode();
}
