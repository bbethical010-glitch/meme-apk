export type AllowedEventName =
  | 'app_open'
  | 'app_background'
  | 'session_start'
  | 'session_end'
  | 'meme_view'
  | 'meme_like'
  | 'meme_share'
  | 'meme_save'
  | 'meme_scroll'
  | 'category_click'
  | 'onboarding_complete'
  | 'profile_open'
  | 'subscription_click'
  | 'screen_view'
  | 'feed_refresh'
  | 'meme_reported'
  | 'ad_impression'
  | 'ad_reward_viewed'
  | 'retention_checkin';

export const ALLOWED_EVENT_NAMES: ReadonlySet<AllowedEventName> = new Set<AllowedEventName>([
  'app_open',
  'app_background',
  'session_start',
  'session_end',
  'meme_view',
  'meme_like',
  'meme_share',
  'meme_save',
  'meme_scroll',
  'category_click',
  'onboarding_complete',
  'profile_open',
  'subscription_click',
  'screen_view',
  'feed_refresh',
  'meme_reported',
  'ad_impression',
  'ad_reward_viewed',
  'retention_checkin',
]);

// ONE Local Allowlist Constant for property keys (Step 5)
export const ALLOWED_PROPERTY_KEYS: ReadonlySet<string> = new Set<string>([
  'action',
  'reaction',
  'duration_ms',
  'destination',
  'direction',
  'category',
  'screen_name',
  'sku',
  'reason',
  'ad_type',
  'reward_type',
  'streak',
  'meme_id',
  'test',
  'clean_metric',
  'padding',
  'legitimate_ui_flag',
]);

export const PROHIBITED_PII_KEYS: ReadonlySet<string> = new Set<string>([
  'email',
  'phone',
  'phone_number',
  'contacts',
  'imei',
  'mac',
  'mac_address',
  'gps',
  'lat',
  'latitude',
  'lng',
  'longitude',
  'location',
  'gallery',
  'file',
  'files',
  'name',
  'first_name',
  'last_name',
  'address',
  'token',
  'auth',
  'authorization',
  'secret',
  'password',
  'api_key',
  'app_token',
  'raw_name',
  'raw_payload',
  'device_id',
  'bearer',
]);

// Specification Constants
export const MAX_BATCH_SIZE = 200; // Server batch limit
export const MAX_CHUNK_SIZE = 100; // Client chunk limit (Step 2)
export const MAX_CHUNK_BYTES = 1024 * 1024; // 1 MiB (Step 2)
export const MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024; // 2 MiB server limit
export const MAX_QUEUE_SIZE = 5000; // Cap queue at 5,000 events (Step 3)
export const HOURLY_EVENT_LIMIT = 600; // Client hourly cap (Step 3)
export const EVENT_MAX_AGE_MS = 23 * 3600 * 1000; // 23h drop (Step 3)
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min background session continuity (Step 6)
export const CHUNK_SPACING_MS = 1000; // At least 1s between chunks (Step 2)
export const DEBOUNCE_THRESHOLD = 10; // Flush when 10+ queued (Step 2)
export const DEBOUNCE_DELAY_MS = 2000; // Debounce 2s (Step 2)
export const FOREGROUND_FLUSH_BASE_SECONDS = 20; // 20s (Step 2)
export const FOREGROUND_FLUSH_JITTER_SECONDS = 5; // +0 to 5s jitter (Step 2)
export const CLOCK_OFFSET_THRESHOLD_MS = 60000; // |offset| > 60s (Step 4)
export const TIMESTAMP_MAX_FUTURE_CLAMP_MS = 60000; // 60s future clamp (Step 4)

export interface AnalyticsEvent {
  schema_version: 1;
  event_id: string; // unique UUID
  event_name: AllowedEventName;
  user_hash: string; // 64 lowercase hex SHA-256
  session_id: string; // UUID
  timestamp_utc: string; // UTC ISO-8601
  platform: 'android';
  app_version: string;
  os_version: string;
  country?: string | null;
  meme_id?: string | null;
  category?: string | null;
  source_channel?: string | null;
  screen_name?: string | null;
  properties: Record<string, any>;
  consent_status: 'granted';
  consent_version: string; // string e.g. "v1", "v2"
}

export interface ConsentState {
  analytics_consent: 'granted' | 'denied';
  advertising_consent: 'granted' | 'denied';
  consent_version: string;
  consent_timestamp_utc: string;
}

export interface DiagnosticStats {
  queueCount: number;
  lastFlushTimeUtc: string | null;
  acceptedCount: number;
  rejectedCount: number;
  droppedCount: number;
  lastError: string | null;
}

export interface EventBatchRequest {
  events: AnalyticsEvent[];
}
