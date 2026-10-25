package com.meme.capsule.analytics;

import java.util.ArrayDeque;
import java.util.Deque;

public class HourlyRateLimiter {
    private static final long ONE_HOUR_MS = 3600 * 1000L;
    private final int maxEventsPerHour;
    private final Deque<Long> eventTimestamps = new ArrayDeque<>();

    public HourlyRateLimiter() {
        this(AnalyticsConstants.HOURLY_EVENT_LIMIT);
    }

    public HourlyRateLimiter(int maxEventsPerHour) {
        this.maxEventsPerHour = maxEventsPerHour > 0 ? maxEventsPerHour : AnalyticsConstants.HOURLY_EVENT_LIMIT;
    }

    public synchronized boolean tryAcquire(long nowMs) {
        long cutoff = nowMs - ONE_HOUR_MS;
        while (!eventTimestamps.isEmpty() && eventTimestamps.peekFirst() <= cutoff) {
            eventTimestamps.pollFirst();
        }

        if (eventTimestamps.size() < maxEventsPerHour) {
            eventTimestamps.addLast(nowMs);
            return true;
        }
        return false;
    }

    public synchronized boolean tryAcquire() {
        return tryAcquire(System.currentTimeMillis());
    }

    public synchronized int getCurrentCount(long nowMs) {
        long cutoff = nowMs - ONE_HOUR_MS;
        while (!eventTimestamps.isEmpty() && eventTimestamps.peekFirst() <= cutoff) {
            eventTimestamps.pollFirst();
        }
        return eventTimestamps.size();
    }

    private int droppedCount = 0;

    public synchronized boolean allowEvent(long nowMs) {
        boolean acquired = tryAcquire(nowMs);
        if (!acquired) {
            droppedCount++;
        }
        return acquired;
    }

    public synchronized int getDroppedCount() {
        return droppedCount;
    }

    public synchronized void reset() {
        eventTimestamps.clear();
        droppedCount = 0;
    }
}
