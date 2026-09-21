export interface Env {
  DB: D1Database;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  
  try {
    const payload = await context.request.json() as any;
    const { device_id, session_id, app_version, events } = payload;
    
    if (!device_id || !session_id || !Array.isArray(events)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    const now = Date.now();
    const stmts = events.map(ev => {
      return db.prepare(
        `INSERT INTO meme_events (meme_id, event_type, session_id, device_id, time_on_meme_ms, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        ev.meme_id, 
        ev.event_type, 
        session_id, 
        device_id, 
        ev.time_on_meme_ms || 0, 
        ev.timestamp || now
      );
    });
    
    if (stmts.length > 0) {
      await db.batch(stmts);
    }
    
    return new Response(JSON.stringify({ success: true, count: stmts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("Failed to insert events", err);
    return new Response(JSON.stringify({ error: "Server error", details: err.message }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
