-- Migration: 003_analytics_events_v1.sql
-- Table: analytics_events (Phase 1 Android & Web Analytics Event Contract)

CREATE TABLE IF NOT EXISTS analytics_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id        TEXT NOT NULL UNIQUE,
  schema_version  INTEGER NOT NULL DEFAULT 1,
  event_name      TEXT NOT NULL,
  user_hash       TEXT NOT NULL,
  session_id      TEXT,
  timestamp_utc   TEXT NOT NULL,
  platform        TEXT NOT NULL DEFAULT 'android',
  app_version     TEXT,
  os_version      TEXT,
  country         TEXT,
  meme_id         TEXT,
  category        TEXT,
  source_channel  TEXT,
  screen_name     TEXT,
  properties      TEXT DEFAULT '{}',
  consent_status  TEXT NOT NULL DEFAULT 'granted',
  created_at      INTEGER NOT NULL
);

-- Performance Indexes for Analytics Ingestion & Reporting
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_hash ON analytics_events(user_hash);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp_utc ON analytics_events(timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_analytics_events_meme_id ON analytics_events(meme_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
