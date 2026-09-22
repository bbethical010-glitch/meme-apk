import type { Env } from "./d1r2";

export interface AiJudgeUser {
  id: string;
  username: string;
  display_name: string;
}

export async function hashPassword(password: string): Promise<string> {
  const buf = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function validateAiJudgeSession(request: Request, env: Env): Promise<AiJudgeUser | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`
    SELECT u.id, u.username, u.display_name
    FROM ai_judge_sessions s
    JOIN ai_judge_users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
  `).bind(token, now).first<AiJudgeUser>();
  return result ?? null;
}

export async function requireAiJudgeAuth(request: Request, env: Env): Promise<AiJudgeUser> {
  const user = await validateAiJudgeSession(request, env);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  return user;
}
