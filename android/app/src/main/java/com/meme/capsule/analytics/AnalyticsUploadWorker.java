package com.meme.capsule.analytics;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class AnalyticsUploadWorker extends Worker {

    public AnalyticsUploadWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        AnalyticsManager manager = AnalyticsManager.getInstance(context);

        // Step 2 & Step 8: The job checks consent at execution time
        if (manager == null || !manager.getConsentManager().isAnalyticsGranted()) {
            return Result.success();
        }

        try {
            manager.flushSync();
        } catch (Throwable ignored) {}

        return Result.success();
    }
}
