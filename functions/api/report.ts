export interface Env {
  DB: D1Database;
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
  try {
    const payload = await context.request.json() as Record<string, unknown>;
    const {
      meme_id,
      meme_url,
      meme_title,
      author,
      source,
      reason,
      details,
      device_id,
      timestamp
    } = payload || {};

    if (!meme_url || !author || !reason || !device_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const now = Date.now();
    const createdAt = typeof timestamp === "number" ? timestamp : now;

    const stmt = context.env.DB.prepare(`
      INSERT INTO meme_reports
      (meme_id, meme_url, meme_title, author, source, reason, details, device_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `);

    const result = await stmt.bind(
      meme_id || null,
      String(meme_url).slice(0, 500),
      String(meme_title || "UNTITLED").slice(0, 150),
      String(author).slice(0, 100),
      String(source || "Meme Capsule").slice(0, 50),
      String(reason).slice(0, 100),
      details ? String(details).slice(0, 300) : null,
      String(device_id).slice(0, 128),
      createdAt,
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      report_id: result.meta?.last_row_id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("Report ingestion error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
