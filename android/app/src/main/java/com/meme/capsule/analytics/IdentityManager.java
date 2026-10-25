package com.meme.capsule.analytics;

import android.content.Context;
import android.content.SharedPreferences;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import java.util.UUID;

public class IdentityManager {
    private static final String PREF_NAME = "meme_capsule_analytics_identity";
    private static final String KEY_INSTALL_ID = "anonymous_install_id";
    private static final String KEY_USER_HASH = "anonymous_user_hash";

    private final SharedPreferences prefs;
    private String installId;
    private String userHash;

    public IdentityManager(Context context) {
        this.prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        loadOrGenerate();
    }

    public IdentityManager(SharedPreferences prefs) {
        this.prefs = prefs;
        loadOrGenerate();
    }

    private synchronized void loadOrGenerate() {
        if (prefs != null) {
            installId = prefs.getString(KEY_INSTALL_ID, null);
            userHash = prefs.getString(KEY_USER_HASH, null);
        }

        if (installId == null || userHash == null || userHash.length() != 64) {
            installId = UUID.randomUUID().toString();
            userHash = computeSha256(installId);

            if (prefs != null) {
                prefs.edit()
                        .putString(KEY_INSTALL_ID, installId)
                        .putString(KEY_USER_HASH, userHash)
                        .apply();
            }
        }
    }

    public synchronized String getInstallId() {
        if (installId == null) loadOrGenerate();
        return installId;
    }

    public synchronized String getUserHash() {
        if (userHash == null) loadOrGenerate();
        return userHash;
    }

    public static String computeSha256(String input) {
        if (input == null) return "";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString().toLowerCase(Locale.ROOT);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
