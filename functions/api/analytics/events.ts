export interface Env {
  DB: D1Database;
  ANALYTICS_APP_TOKEN?: string;
}

const ALLOWED_EVENT_NAMES = new Set([
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

const USER_HASH_REGEX = /^[0-9a-f]{64}$/;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Analytics-App-Token',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Verify build-time analytics app token
  const expectedToken = env.ANALYTICS_APP_TOKEN;
  const providedToken = request.headers.get('X-Analytics-App-Token');

  // If a token is configured in Cloudflare environment variables, enforce it
  if (expectedToken && providedToken !== expectedToken) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid or missing X-Analytics-App-Token' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 2. Parse payload
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Malformed JSON payload' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const events = payload?.events;
  if (!Array.isArray(events) || events.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Invalid payload: "events" array is required and must not be empty' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (events.length > 200) {
    return new Response(
      JSON.stringify({ error: 'Batch size exceeds maximum limit of 200 events' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 3. Validate events against Schema v1 contract
  const validStatements: D1PreparedStatement[] = [];
  const acceptedIds: string[] = [];
  const rejectedReasons: { event_id?: string; reason: string }[] = [];

  for (const ev of events) {
    if (!ev || typeof ev !== 'object') {
      rejectedReasons.push({ reason: 'Event is not an object' });
      continue;
    }

    if (ev.schema_version !== 1) {
      rejectedReasons.push({ event_id: ev.event_id, reason: 'Unsupported schema_version (expected 1)' });
      continue;
    }

    if (!ev.event_id || typeof ev.event_id !== 'string') {
      rejectedReasons.push({ reason: 'Missing or invalid event_id' });
      continue;
    }

    if (!ev.event_name || !ALLOWED_EVENT_NAMES.has(ev.event_name)) {
      rejectedReasons.push({ event_id: ev.event_id, reason: `Invalid or disallowed event_name: "${ev.event_name}"` });
      continue;
    }

    if (!ev.user_hash || typeof ev.user_hash !== 'string' || !USER_HASH_REGEX.test(ev.user_hash)) {
      rejectedReasons.push({ event_id: ev.event_id, reason: 'user_hash must be a 64-character lowercase SHA-256 hex string' });
      continue;
    }

    if (ev.consent_status !== 'granted') {
      rejectedReasons.push({ event_id: ev.event_id, reason: 'consent_status must be "granted"' });
      continue;
    }

    const propertiesJson = typeof ev.properties === 'object' && ev.properties !== null
      ? JSON.stringify(ev.properties)
      : '{}';

    const timestampUtc = ev.timestamp_utc || new Date().toISOString();
    const consentVersion = typeof ev.consent_version === 'string' && ev.consent_version.trim()
      ? ev.consent_version.trim()
      : 'v1';

    const stmt = env.DB.prepare(`
      INSERT OR IGNORE INTO android_analytics_events (
        event_id, schema_version, event_name, user_hash, session_id,
        timestamp_utc, platform, app_version, os_version, country,
        meme_id, category, source_channel, screen_name, properties_json,
        consent_status, consent_version, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      ev.event_id,
      1,
      ev.event_name,
      ev.user_hash,
      ev.session_id || null,
      timestampUtc,
      ev.platform || 'android',
      ev.app_version || '3.7',
      ev.os_version || null,
      ev.country || null,
      ev.meme_id || null,
      ev.category || null,
      ev.source_channel || null,
      ev.screen_name || null,
      propertiesJson,
      'granted',
      consentVersion
    );

    validStatements.push(stmt);
    acceptedIds.push(ev.event_id);
  }

  // If no events passed validation, return 400 with diagnostics
  if (validStatements.length === 0) {
    return new Response(
      JSON.stringify({
        error: 'Validation failed: No valid events in batch',
        rejected: rejectedReasons,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 4. Batch insert into D1
  try {
    // D1 batch execution
    await env.DB.batch(validStatements);

    return new Response(
      JSON.stringify({
        success: true,
        accepted: acceptedIds.length,
        rejected: rejectedReasons.length,
        event_ids: acceptedIds,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Failed to insert analytics events to D1:', err);
    return new Response(
      JSON.stringify({
        error: 'Database error',
        details: err?.message || 'Failed to persist events',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};
