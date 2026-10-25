package com.meme.capsule;

import android.Manifest;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.meme.capsule.analytics.AnalyticsManager;
import com.meme.capsule.analytics.MemeCapsuleAnalyticsBridge;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static boolean sSessionActiveInProcess = false;
    private static long sLastShareIntentTimestamp = 0L;
    private boolean mShouldRestoreRunningSession = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        boolean isWarmProcess = sSessionActiveInProcess;
        boolean isSavedTaskState = (savedInstanceState != null);
        boolean isRecentShareReturn = (System.currentTimeMillis() - sLastShareIntentTimestamp) < 120_000L;
        mShouldRestoreRunningSession = isWarmProcess || isSavedTaskState || isRecentShareReturn;
        sSessionActiveInProcess = true;

        super.onCreate(savedInstanceState);

        int darkBg = Color.parseColor("#131313");
        Window window = getWindow();
        window.setBackgroundDrawable(new ColorDrawable(darkBg));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(darkBg);
            window.setNavigationBarColor(darkBg);
        }

        View decorView = window.getDecorView();
        decorView.setBackgroundColor(darkBg);

        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, decorView);
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);

        View rootView = findViewById(android.R.id.content);
        if (rootView != null) {
            rootView.setBackgroundColor(darkBg);
            rootView.setPadding(0, 0, 0, 0);
        }

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setBackgroundColor(darkBg);
            try {
                android.webkit.WebSettings webSettings = bridge.getWebView().getSettings();
                if (webSettings != null) {
                    webSettings.setDomStorageEnabled(true);
                    webSettings.setDatabaseEnabled(true);
                    webSettings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
                }
            } catch (Throwable t) {
                Log.w(TAG, "WebSettings setup warning: " + t.getMessage());
            }
            try {
                bridge.getWebView().addJavascriptInterface(new MemeCapsuleDownloads(this), "MemeCapsuleAndroid");
            } catch (Throwable t) {
                Log.e(TAG, "Failed to attach MemeCapsuleAndroid JS interface", t);
            }
            try {
                AnalyticsManager analyticsManager = AnalyticsManager.getInstance(this);
                bridge.getWebView().addJavascriptInterface(new MemeCapsuleAnalyticsBridge(this, analyticsManager), "MemeCapsuleAnalytics");
                analyticsManager.trackAppOpen();
            } catch (Throwable t) {
                Log.e(TAG, "Failed to attach MemeCapsuleAnalytics JS interface", t);
            }
        }

        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 1001);
        }
    }

    @Override
    public void onPause() {
        if (isFinishing()) {
            sSessionActiveInProcess = false;
            sLastShareIntentTimestamp = 0L;
            AnalyticsManager.getInstance(this).endSession();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new Event('meme-capsule-reset-to-home'));",
                        null
                );
            }
        } else {
            AnalyticsManager.getInstance(this).trackAppBackground();
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new Event('meme-capsule-persist-session'));",
                        null
                );
            }
        }
        super.onPause();
    }

    @Override
    public void onDestroy() {
        if (isFinishing()) {
            sSessionActiveInProcess = false;
            sLastShareIntentTimestamp = 0L;
            AnalyticsManager.getInstance(this).endSession();
        }
        super.onDestroy();
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            AnalyticsManager.getInstance(this).onAppForeground();
        } catch (Throwable ignored) {}
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().onResume();
            bridge.getWebView().resumeTimers();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }

    public static class MemeCapsuleDownloads {
        private static final String TAG = "MemeCapsuleDownloads";
        private static final String PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.meme.capsule";
        private final MainActivity activity;

        MemeCapsuleDownloads(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public boolean shouldRestoreRunningSession() {
            if (activity == null) return false;
            boolean shouldRestore = activity.mShouldRestoreRunningSession;
            activity.mShouldRestoreRunningSession = true;
            return shouldRestore;
        }

        @JavascriptInterface
        public void downloadImage(String url, String fileName) {
            if (url == null || url.trim().isEmpty()) {
                showToast("Download failed: invalid URL");
                return;
            }

            runInBackground(() -> {
                HttpURLConnection connection = null;
                Uri pendingUri = null;

                try {
                    connection = openImageConnection(url);
                    String mimeType = resolveMimeType(connection, fileName);
                    String safeName = ensureExtension(fileName, mimeType);

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        if (activity == null) return;
                        ContentResolver resolver = activity.getContentResolver();
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.Images.Media.DISPLAY_NAME, safeName);
                        values.put(MediaStore.Images.Media.MIME_TYPE, mimeType);
                        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Meme Capsule/");
                        values.put(MediaStore.Images.Media.IS_PENDING, 1);

                        pendingUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                        if (pendingUri == null) {
                            throw new IllegalStateException("Could not create gallery entry in MediaStore");
                        }

                        try (InputStream input = connection.getInputStream();
                             OutputStream output = resolver.openOutputStream(pendingUri)) {
                            if (output == null) {
                                throw new IllegalStateException("Could not open output stream for gallery item");
                            }
                            copy(input, output);
                        }

                        values.clear();
                        values.put(MediaStore.Images.Media.IS_PENDING, 0);
                        try {
                            resolver.update(pendingUri, values, null, null);
                        } catch (Throwable updateErr) {
                            Log.w(TAG, "Non-fatal: failed to clear IS_PENDING on saved item", updateErr);
                        }
                    } else {
                        if (activity == null) return;
                        File picturesDir = new File(
                                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                                "Meme Capsule"
                        );
                        if (!picturesDir.exists() && !picturesDir.mkdirs()) {
                            throw new IllegalStateException("Could not create Pictures/Meme Capsule directory");
                        }

                        File imageFile = uniqueFile(picturesDir, safeName);
                        try (InputStream input = connection.getInputStream();
                             FileOutputStream output = new FileOutputStream(imageFile)) {
                            copy(input, output);
                        }

                        try {
                            activity.sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(imageFile)));
                        } catch (Throwable scanErr) {
                            Log.w(TAG, "Non-fatal: failed to notify media scanner", scanErr);
                        }
                    }

                    showToast("Saved to Gallery");
                } catch (Throwable e) {
                    Log.e(TAG, "Download error", e);
                    if (pendingUri != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && activity != null) {
                        try {
                            activity.getContentResolver().delete(pendingUri, null, null);
                        } catch (Throwable deleteEx) {
                            Log.w(TAG, "Non-fatal: failed to clean up incomplete URI", deleteEx);
                        }
                    }
                    showToast("Download failed");
                } finally {
                    if (connection != null) {
                        try {
                            connection.disconnect();
                        } catch (Throwable ignored) {}
                    }
                }
            });
        }

        @JavascriptInterface
        public void openPlayStoreListing() {
            if (activity == null) return;
            activity.runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.meme.capsule"));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    activity.startActivity(intent);
                } catch (Throwable e) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(PLAY_STORE_URL));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(intent);
                    } catch (Throwable ex) {
                        Log.w(TAG, "Failed to open Play Store fallback", ex);
                    }
                }
            });
        }

        private static String buildShareMessage(String titleOrMessage) {
            String base = (titleOrMessage == null || titleOrMessage.trim().isEmpty())
                    ? "Meme Capsule Drop"
                    : titleOrMessage.trim();
            if (base.contains("play.google.com/store/apps/details")) {
                return base;
            }
            return "💊 Caught this wild drop on MEME CAPSULE! 🔥\n\"" + base + "\"\n\n📲 Download Meme Capsule on Google Play:\n" + PLAY_STORE_URL;
        }

        @JavascriptInterface
        public void shareImage(String url, String fileName, String title) {
            shareImageToApp(url, fileName, buildShareMessage(title), "");
        }

        @JavascriptInterface
        public void shareImageToApp(String url, String fileName, String shareText, String targetPackage) {
            sLastShareIntentTimestamp = System.currentTimeMillis();
            final String finalShareMessage = buildShareMessage(shareText);
            showToast("Preparing meme drop...");
            runInBackground(() -> {
                HttpURLConnection connection = null;

                try {
                    if (activity == null) return;
                    connection = openImageConnection(url);
                    String mimeType = resolveMimeType(connection, fileName);
                    String safeName = ensureExtension(fileName, mimeType);

                    File shareDir = new File(activity.getCacheDir(), "shared_images");
                    if (!shareDir.exists() && !shareDir.mkdirs()) {
                        throw new IllegalStateException("Could not create share cache");
                    }

                    File imageFile = uniqueFile(shareDir, safeName);
                    try (InputStream input = connection.getInputStream();
                         FileOutputStream output = new FileOutputStream(imageFile)) {
                        copy(input, output);
                    }

                    Uri contentUri = FileProvider.getUriForFile(
                            activity,
                            activity.getPackageName() + ".fileprovider",
                            imageFile
                    );

                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType(mimeType);
                    shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Meme Capsule Drop");
                    shareIntent.putExtra(Intent.EXTRA_TEXT, finalShareMessage);
                    shareIntent.putExtra("sms_body", finalShareMessage);
                    shareIntent.setClipData(android.content.ClipData.newRawUri("Meme Capsule", contentUri));
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    activity.runOnUiThread(() -> {
                        if (activity == null) return;
                        try {
                            if (targetPackage != null && !targetPackage.trim().isEmpty()) {
                                try {
                                    Intent targetedIntent = new Intent(shareIntent);
                                    targetedIntent.setPackage(targetPackage.trim());
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                        targetedIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_DOCUMENT);
                                    }
                                    activity.startActivity(targetedIntent);
                                    return;
                                } catch (Throwable ignored) {
                                    // Target app not installed; fall back to native chooser
                                }
                            }
                            Intent chooser = Intent.createChooser(shareIntent, "Share Meme Capsule Drop");
                            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_DOCUMENT);
                            }
                            activity.startActivity(chooser);
                        } catch (Throwable launchEx) {
                            Log.e(TAG, "Failed to launch share chooser", launchEx);
                            showToast("Could not open share chooser");
                        }
                    });
                } catch (Throwable e) {
                    Log.e(TAG, "Image share failed", e);
                    showToast("Image share failed");
                } finally {
                    if (connection != null) {
                        try {
                            connection.disconnect();
                        } catch (Throwable ignored) {}
                    }
                }
            });
        }

        private static HttpURLConnection openImageConnection(String urlString) throws Exception {
            String currentUrl = urlString;
            HttpURLConnection connection = null;
            int redirects = 0;

            while (redirects < 5) {
                URL url = new URL(currentUrl);
                connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(true);
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(25000);
                connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 MemeCapsule/1.1");
                connection.setRequestProperty("Accept", "image/*,*/*;q=0.8");
                connection.connect();

                int status = connection.getResponseCode();
                if (status == HttpURLConnection.HTTP_MOVED_PERM
                        || status == HttpURLConnection.HTTP_MOVED_TEMP
                        || status == 307
                        || status == 308) {
                    String newUrl = connection.getHeaderField("Location");
                    connection.disconnect();
                    if (newUrl != null && !newUrl.isEmpty()) {
                        if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                            newUrl = new URL(url, newUrl).toString();
                        }
                        currentUrl = newUrl;
                        redirects++;
                        continue;
                    }
                }

                if (status < 200 || status >= 300) {
                    throw new IllegalStateException("Image request failed with status: " + status);
                }

                return connection;
            }

            throw new IllegalStateException("Too many redirects: " + urlString);
        }

        private static String resolveMimeType(HttpURLConnection connection, String fileName) {
            String contentType = connection.getContentType();
            if (contentType != null) {
                String mime = contentType.split(";")[0].trim().toLowerCase(Locale.US);
                if (mime.startsWith("image/")) return mime;
            }

            String extension = MimeTypeMap.getFileExtensionFromUrl(fileName);
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            return mime != null && mime.startsWith("image/") ? mime : "image/jpeg";
        }

        private static String ensureExtension(String fileName, String mimeType) {
            String fallback = "meme-capsule";
            String cleaned = fileName == null ? fallback : fileName.replaceAll("[^A-Za-z0-9._-]", "-");
            if (cleaned.isEmpty() || cleaned.equals(".")) cleaned = fallback;

            String extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
            if (extension == null || extension.isEmpty()) extension = "jpg";

            int dot = cleaned.lastIndexOf('.');
            String base = cleaned;
            if (dot > 0) {
                String existingExt = cleaned.substring(dot + 1).toLowerCase(Locale.US);
                if (existingExt.equals("jpg") || existingExt.equals("jpeg") || existingExt.equals("png") || existingExt.equals("webp") || existingExt.equals("gif")) {
                    base = cleaned.substring(0, dot);
                    extension = existingExt;
                }
            }

            return base + "-" + System.currentTimeMillis() + "." + extension;
        }

        private static File uniqueFile(File directory, String fileName) {
            File candidate = new File(directory, fileName);
            if (!candidate.exists()) return candidate;

            int dot = fileName.lastIndexOf('.');
            String base = dot > 0 ? fileName.substring(0, dot) : fileName;
            String extension = dot > 0 ? fileName.substring(dot) : "";
            int counter = 1;
            do {
                candidate = new File(directory, base + "-" + counter + extension);
                counter++;
            } while (candidate.exists());
            return candidate;
        }

        private static void copy(InputStream input, OutputStream output) throws Exception {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = input.read(buffer)) != -1) {
                output.write(buffer, 0, bytesRead);
            }
            output.flush();
        }

        private void runInBackground(Runnable runnable) {
            new Thread(() -> {
                try {
                    runnable.run();
                } catch (Throwable t) {
                    Log.e(TAG, "Uncaught error in background worker thread", t);
                }
            }).start();
        }

        private void showToast(String message) {
            if (activity == null) return;
            activity.runOnUiThread(() -> {
                try {
                    android.content.Context ctx = activity.getApplicationContext();
                    if (ctx != null) {
                        Toast.makeText(ctx, message, Toast.LENGTH_SHORT).show();
                    }
                } catch (Throwable ignored) {}
            });
        }
    }
}
