export interface Env {
  DB: D1Database;
  ANALYTICS_KV_NAMESPACE?: KVNamespace; // Bound in wrangler.toml
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  
  // 1. Check High-Performance KV Cache First (15-min TTL)
  const cacheKey = "cache:analytics_overview";
  if (context.env.ANALYTICS_KV_NAMESPACE) {
     const cached = await context.env.ANALYTICS_KV_NAMESPACE.get(cacheKey);
     if (cached) {
         return new Response(cached, { 
             headers: { ...corsHeaders, "Content-Type": "application/json" }
         });
     }
  }

  // 2. Fetch Global Stats from the single-row key-value table
  const globalQuery = await db.prepare("SELECT stat_key, stat_value FROM app_global_stats").all();
  const globalData: Record<string, number> = {};
  let lastAgg = 0;
  
  if (globalQuery.results) {
    globalQuery.results.forEach((row: any) => {
      globalData[row.stat_key] = row.stat_value;
      if (row.stat_key === 'last_aggregation_run') lastAgg = row.stat_value;
    });
  }
  
  // 3. Calculate system-wide distribution metrics
  const distributionQuery = await db.prepare(`
    SELECT 
      AVG(engagement_score) as avg_eng,
      AVG(view_count) as avg_views,
      SUM(CASE WHEN view_count = 0 THEN 1 ELSE 0 END) as zero_views
    FROM meme_analytics
  `).first() || {};
  
  // 4. Fetch the Top 5 Leaderboards
  const topEngagement = await db.prepare("SELECT * FROM meme_analytics ORDER BY engagement_score DESC LIMIT 5").all();
  const topVirality = await db.prepare("SELECT * FROM meme_analytics ORDER BY virality_score DESC LIMIT 5").all();
  const topRetention = await db.prepare("SELECT * FROM meme_analytics ORDER BY retention_score DESC LIMIT 5").all();
  const topTrending = await db.prepare("SELECT * FROM meme_analytics ORDER BY trending_score DESC LIMIT 5").all();
  const mostSkipped = await db.prepare("SELECT * FROM meme_analytics ORDER BY skip_rate DESC, skip_count DESC LIMIT 5").all();

  // 5. Construct the specific JSON format expected by the frontend
  const responseBody = {
    global: {
      total_memes: globalData.total_memes || 0,
      total_views: globalData.total_views || 0,
      total_likes: globalData.total_likes || 0,
      total_shares: globalData.total_shares || 0,
      total_downloads: globalData.total_downloads || 0,
      total_skips: globalData.total_skips || 0,
      total_unique_devices: globalData.total_unique_devices || 0,
      avg_engagement_score: (distributionQuery.avg_eng as number) || 0,
      last_aggregated_at: lastAgg ? new Date(lastAgg).toISOString() : new Date().toISOString()
    },
    top_memes: {
      by_engagement: topEngagement.results || [],
      by_virality: topVirality.results || [],
      by_retention: topRetention.results || [],
      by_trending: topTrending.results || [],
      most_skipped: mostSkipped.results || []
    },
    distribution: {
      avg_view_count: (distributionQuery.avg_views as number) || 0,
      median_engagement_score: (distributionQuery.avg_eng as number) || 0, // Using avg as median proxy for SQLite performance
      memes_with_zero_views: (distributionQuery.zero_views as number) || 0,
      memes_above_avg_engagement: 0 
    }
  };
  
  const jsonResponse = JSON.stringify(responseBody);
  
  // 6. Save response into KV Cache in the background (TTL: 900 seconds / 15 mins)
  if (context.env.ANALYTICS_KV_NAMESPACE) {
    context.waitUntil(
      context.env.ANALYTICS_KV_NAMESPACE.put(cacheKey, jsonResponse, { expirationTtl: 900 })
    );
  }
  
  // 7. Return the data
  return new Response(jsonResponse, {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
};
