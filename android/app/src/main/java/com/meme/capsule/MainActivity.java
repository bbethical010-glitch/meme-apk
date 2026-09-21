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
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Enable edge-to-edge for Android 15+ (SDK 35) backward compatibility
        EdgeToEdge.enable(this);

        super.onCreate(savedInstanceState);

        // Handle display cutout mode for notch/hole-punch displays
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;
            getWindow().setAttributes(params);
        }

        // Apply window insets to the root view for proper edge-to-edge padding
        View rootView = findViewById(android.R.id.content);
        if (rootView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, windowInsets) -> {
                Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
                v.setPadding(insets.left, insets.top, insets.right, insets.bottom);
                return WindowInsetsCompat.CONSUMED;
            });
        }

        bridge.getWebView().addJavascriptInterface(new MemeCapsuleDownloads(this), "MemeCapsuleAndroid");
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 1001);
        }
    }

    public static class MemeCapsuleDownloads {
        private final MainActivity activity;

        MemeCapsuleDownloads(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void downloadImage(String url, String fileName) {
            runInBackground(() -> {
                HttpURLConnection connection = null;
                Uri pendingUri = null;

                try {
                    connection = openImageConnection(url);
                    String mimeType = resolveMimeType(connection, fileName);
                    String safeName = ensureExtension(fileName, mimeType);

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentResolver resolver = activity.getContentResolver();
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.Images.Media.DISPLAY_NAME, safeName);
                        values.put(MediaStore.Images.Media.MIME_TYPE, mimeType);
                        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Meme Capsule");
                        values.put(MediaStore.Images.Media.IS_PENDING, 1);

                        pendingUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                        if (pendingUri == null) throw new IllegalStateException("Could not create gallery entry");

                        try (InputStream input = connection.getInputStream(); OutputStream output = resolver.openOutputStream(pendingUri)) {
                            if (output == null) throw new IllegalStateException("Could not open gallery entry");
                            copy(input, output);
                        }

                        values.clear();
                        values.put(MediaStore.Images.Media.IS_PENDING, 0);
                        resolver.update(pendingUri, values, null, null);
                    } else {
                        File picturesDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Meme Capsule");
                        if (!picturesDir.exists() && !picturesDir.mkdirs()) {
                            throw new IllegalStateException("Could not create Pictures directory");
                        }

                        File imageFile = uniqueFile(picturesDir, safeName);
                        try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(imageFile)) {
                            copy(input, output);
                        }

                        activity.sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(imageFile)));
                    }

                    showToast("Saved to Gallery");
                } catch (Exception e) {
                    if (pendingUri != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        activity.getContentResolver().delete(pendingUri, null, null);
                    }
                    showToast("Download failed");
                } finally {
                    if (connection != null) connection.disconnect();
                }
            });
        }

        @JavascriptInterface
        public void shareImage(String url, String fileName, String title) {
            showToast("Preparing image share");
            runInBackground(() -> {
                HttpURLConnection connection = null;

                try {
                    connection = openImageConnection(url);
                    String mimeType = resolveMimeType(connection, fileName);
                    String safeName = ensureExtension(fileName, mimeType);

                    File shareDir = new File(activity.getCacheDir(), "shared_images");
                    if (!shareDir.exists() && !shareDir.mkdirs()) {
                        throw new IllegalStateException("Could not create share cache");
                    }

                    File imageFile = uniqueFile(shareDir, safeName);
                    try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(imageFile)) {
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
                    shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                    shareIntent.putExtra(Intent.EXTRA_TEXT, title);
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    Intent chooser = Intent.createChooser(shareIntent, "Share Meme Capsule image");
                    chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    activity.runOnUiThread(() -> activity.startActivity(chooser));
                } catch (Exception e) {
                    showToast("Image share failed");
                } finally {
                    if (connection != null) connection.disconnect();
                }
            });
        }

        private static HttpURLConnection openImageConnection(String url) throws Exception {
            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(25000);
            connection.setRequestProperty("User-Agent", "MemeCapsule/1.1");
            connection.connect();

            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IllegalStateException("Image request failed: " + status);
            }

            String contentType = connection.getContentType();
            if (contentType == null || !contentType.toLowerCase(Locale.US).startsWith("image/")) {
                throw new IllegalStateException("URL is not an image");
            }

            return connection;
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

            String lower = cleaned.toLowerCase(Locale.US);
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif")) {
                return cleaned;
            }

            String extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
            return cleaned + "." + (extension == null ? "jpg" : extension);
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
            new Thread(runnable).start();
        }

        private void showToast(String message) {
            activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_SHORT).show());
        }
    }
}
