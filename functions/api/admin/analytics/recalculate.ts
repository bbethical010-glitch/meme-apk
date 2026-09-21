export interface Env {
  DB: D1Database;
  ANALYTICS_KV_NAMESPACE?: KVNamespace;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  
  try {
    // Basic aggregation: Sum events up into meme_analytics
    await db.exec(`
      INSERT INTO meme_analytics (meme_id, view_count, like_count, skip_count, share_count)
      SELECT 
        meme_id,
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END),
        SUM(CASE WHEN event_type = 'like' THEN 1 ELSE 0 END),
        SUM(CASE WHEN event_type = 'skip' THEN 1 ELSE 0 END),
        SUM(CASE WHEN event_type = 'share' THEN 1 ELSE 0 END)
      FROM meme_events
      GROUP BY meme_id
      ON CONFLICT(meme_id) DO UPDATE SET
        view_count = excluded.view_count,
        like_count = excluded.like_count,
        skip_count = excluded.skip_count,
        share_count = excluded.share_count;
    `);

    // Invalidate Cache
    if (context.env.ANALYTICS_KV_NAMESPACE) {
      await context.env.ANALYTICS_KV_NAMESPACE.delete("cache:analytics_overview");
    }

    // Update global stats
    await db.exec(`
      INSERT INTO app_global_stats (stat_key, stat_value, updated_at) 
      VALUES ('last_aggregation_run', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000)
      ON CONFLICT(stat_key) DO UPDATE SET 
        stat_value = excluded.stat_value,
        updated_at = excluded.updated_at;
    `);

    return new Response(JSON.stringify({ success: true, message: "Recalculation complete" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
