package com.meme.capsule.analytics;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

public class AnalyticsDiagnostics {
    private final AtomicInteger acceptedCount = new AtomicInteger(0);
    private final AtomicInteger rejectedCount = new AtomicInteger(0);
    private final AtomicInteger droppedCount = new AtomicInteger(0);
    private final AtomicReference<String> lastFlushTimeUtc = new AtomicReference<>(null);
    private final AtomicReference<String> lastError = new AtomicReference<>(null);

    public void incrementAccepted(int delta) {
        if (delta > 0) acceptedCount.addAndGet(delta);
    }

    public void incrementRejected(int delta) {
        if (delta > 0) rejectedCount.addAndGet(delta);
    }

    public void incrementDropped(int delta) {
        if (delta > 0) droppedCount.addAndGet(delta);
    }

    public void setLastFlushTimeUtc(String timestampUtc) {
        lastFlushTimeUtc.set(timestampUtc);
    }

    public void setLastError(String error) {
        lastError.set(error);
    }

    public int getAcceptedCount() { return acceptedCount.get(); }
    public int getRejectedCount() { return rejectedCount.get(); }
    public int getDroppedCount() { return droppedCount.get(); }
    public String getLastFlushTimeUtc() { return lastFlushTimeUtc.get(); }
    public String getLastError() { return lastError.get(); }

    public JSONObject toJsonObject(int currentQueueCount) {
        JSONObject json = new JSONObject();
        try {
            json.put("queueCount", currentQueueCount);
            json.put("lastFlushTimeUtc", lastFlushTimeUtc.get() != null ? lastFlushTimeUtc.get() : JSONObject.NULL);
            json.put("acceptedCount", acceptedCount.get());
            json.put("rejectedCount", rejectedCount.get());
            json.put("droppedCount", droppedCount.get());
            json.put("lastError", lastError.get() != null ? lastError.get() : JSONObject.NULL);
        } catch (JSONException ignored) {}
        return json;
    }

    public void reset() {
        acceptedCount.set(0);
        rejectedCount.set(0);
        droppedCount.set(0);
        lastFlushTimeUtc.set(null);
        lastError.set(null);
    }
}
