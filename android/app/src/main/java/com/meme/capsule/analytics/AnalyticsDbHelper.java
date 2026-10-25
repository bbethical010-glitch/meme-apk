package com.meme.capsule.analytics;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AnalyticsDbHelper extends SQLiteOpenHelper {
    private static final String DATABASE_NAME = "meme_capsule_analytics.db";
    private static final int DATABASE_VERSION = 1;

    public static final String TABLE_EVENTS = "events";
    public static final String COL_ID = "id";
    public static final String COL_EVENT_ID = "event_id";
    public static final String COL_EVENT_NAME = "event_name";
    public static final String COL_PAYLOAD = "payload";
    public static final String COL_CREATED_AT = "created_at";
    public static final String COL_RETRY_COUNT = "retry_count";

    private static final String CREATE_TABLE =
            "CREATE TABLE " + TABLE_EVENTS + " (" +
                    COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    COL_EVENT_ID + " TEXT UNIQUE NOT NULL, " +
                    COL_EVENT_NAME + " TEXT NOT NULL, " +
                    COL_PAYLOAD + " TEXT NOT NULL, " +
                    COL_CREATED_AT + " INTEGER NOT NULL, " +
                    COL_RETRY_COUNT + " INTEGER DEFAULT 0" +
                    ");";

    public AnalyticsDbHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    public AnalyticsDbHelper(Context context, String dbName) {
        super(context, dbName, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(CREATE_TABLE);
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_events_created_at ON " + TABLE_EVENTS + " (" + COL_CREATED_AT + ");");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_EVENTS);
        onCreate(db);
    }

    /**
     * Drops events older than 23 hours (the server rejects events older than 24h).
     * Returns the count of dropped expired events.
     */
    public synchronized int dropExpiredEvents(long nowMs) {
        long cutoff = nowMs - AnalyticsConstants.EVENT_MAX_AGE_MS;
        SQLiteDatabase db = getWritableDatabase();
        int dropped = 0;
        Cursor cursor = null;
        try {
            cursor = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_EVENTS + " WHERE " + COL_CREATED_AT + " < ?",
                    new String[]{String.valueOf(cutoff)});
            if (cursor != null && cursor.moveToFirst()) {
                dropped = cursor.getInt(0);
            }
            if (dropped > 0) {
                db.delete(TABLE_EVENTS, COL_CREATED_AT + " < ?", new String[]{String.valueOf(cutoff)});
            }
        } finally {
            if (cursor != null) cursor.close();
        }
        return dropped;
    }

    /**
     * Enqueues an event. If maximum queue size (5,000) is exceeded, drops the oldest events via FIFO.
     * Also evicts any events older than 23h before checking capacity.
     * Returns total count of dropped events (expired + FIFO overflow).
     */
    public synchronized int enqueue(AnalyticsEvent event, int maxQueueSize) {
        int droppedCount = 0;
        long now = System.currentTimeMillis();
        SQLiteDatabase db = getWritableDatabase();
        try {
            // First drop any events older than 23h
            droppedCount += dropExpiredEvents(now);

            ContentValues values = new ContentValues();
            values.put(COL_EVENT_ID, event.getEventId());
            values.put(COL_EVENT_NAME, event.getEventName());
            values.put(COL_PAYLOAD, event.toJson().toString());
            values.put(COL_CREATED_AT, now);
            values.put(COL_RETRY_COUNT, 0);

            db.insertWithOnConflict(TABLE_EVENTS, null, values, SQLiteDatabase.CONFLICT_REPLACE);

            int targetCap = maxQueueSize > 0 ? maxQueueSize : AnalyticsConstants.MAX_QUEUE_SIZE;
            int currentCount = getQueueCount(db);
            if (currentCount > targetCap) {
                int excess = currentCount - targetCap;
                db.execSQL("DELETE FROM " + TABLE_EVENTS + " WHERE " + COL_ID + " IN (SELECT " + COL_ID +
                        " FROM " + TABLE_EVENTS + " ORDER BY " + COL_CREATED_AT + " ASC LIMIT " + excess + ")");
                droppedCount += excess;
            }
        } catch (JSONException e) {
            // Invalid JSON serialization, cannot enqueue
        }
        return droppedCount;
    }

    public synchronized int enqueue(AnalyticsEvent event) {
        return enqueue(event, AnalyticsConstants.MAX_QUEUE_SIZE);
    }

    public synchronized List<AnalyticsEvent> peekBatch(int limit) {
        // Drop any events older than 23h before returning batch
        dropExpiredEvents(System.currentTimeMillis());

        int safeLimit = Math.min(limit, AnalyticsConstants.MAX_CHUNK_SIZE);
        if (safeLimit <= 0) safeLimit = AnalyticsConstants.MAX_CHUNK_SIZE;

        List<AnalyticsEvent> batch = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        Cursor cursor = null;
        try {
            cursor = db.query(
                    TABLE_EVENTS,
                    new String[]{COL_PAYLOAD},
                    null, null, null, null,
                    COL_CREATED_AT + " ASC",
                    String.valueOf(safeLimit)
            );

            while (cursor != null && cursor.moveToNext()) {
                String payload = cursor.getString(0);
                try {
                    batch.add(AnalyticsEvent.fromJson(payload));
                } catch (JSONException ignored) {}
            }
        } finally {
            if (cursor != null) cursor.close();
        }
        return batch;
    }

    public synchronized void removeEvents(List<String> eventIds) {
        if (eventIds == null || eventIds.isEmpty()) return;
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            for (String eventId : eventIds) {
                db.delete(TABLE_EVENTS, COL_EVENT_ID + " = ?", new String[]{eventId});
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    public synchronized int getQueueCount() {
        return getQueueCount(getReadableDatabase());
    }

    private int getQueueCount(SQLiteDatabase db) {
        Cursor cursor = null;
        try {
            cursor = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_EVENTS, null);
            if (cursor != null && cursor.moveToFirst()) {
                return cursor.getInt(0);
            }
        } finally {
            if (cursor != null) cursor.close();
        }
        return 0;
    }

    public synchronized void clear() {
        SQLiteDatabase db = getWritableDatabase();
        db.delete(TABLE_EVENTS, null, null);
    }
}
