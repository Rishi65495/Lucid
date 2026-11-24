import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

async function getLearnerOverview(sb: any, userId: string) {
  const [journeys, mastery, attempts] = await Promise.all([
    sb.from("learning_journeys").select("completion,exposure,understanding,recall,application,last_activity_at,lucid_resources(title,type)").eq("owner_id", userId).order("last_activity_at", { ascending: false }).limit(25),
    sb.from("concept_mastery").select("mastery,exposure,understanding,recall,application,concepts(title,normalized_key)").eq("user_id", userId).order("mastery", { ascending: true }).limit(30),
    sb.from("quiz_attempts").select("score,max_score,completed_at,skipped,quizzes(title,quiz_type)").eq("user_id", userId).order("completed_at", { ascending: false }).limit(10),
  ]);
  for (const result of [journeys, mastery, attempts]) if (result.error) throw result.error;
  const valid = (attempts.data || []).filter((x: any) => !x.skipped && Number(x.max_score) > 0);
  const earned = valid.reduce((sum: number, x: any) => sum + Number(x.score || 0), 0);
  const possible = valid.reduce((sum: number, x: any) => sum + Number(x.max_score || 0), 0);
  const rows = journeys.data || [];
  return {
    progress_summary: {
      tracked_learning_items: rows.length,
      completed_items: rows.filter((x: any) => Number(x.completion) >= 100).length,
      average_completion: rows.length ? Math.round(rows.reduce((sum: number, x: any) => sum + Number(x.completion || 0), 0) / rows.length) : null,
    },
    learning_journeys: rows,
    concept_mastery: mastery.data || [],
    quiz_summary: {
      completed_attempts: valid.length,
      overall_accuracy: possible ? Math.round(earned / possible * 100) : null,
      recent_attempts: valid.slice(0, 5),
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: CORS });
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: CORS });
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const me = await sb.auth.getUser(token);
    if (me.error || !me.data.user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: CORS });

    const body = await req.json();
    const request = String(body.request || "").trim().slice(0, 4000);
    if (!request) return new Response(JSON.stringify({ error: "A question is required." }), { status: 400, headers: CORS });

    const overview = await getLearnerOverview(sb, me.data.user.id);
    const history = Array.isArray(body.history) ? body.history.slice(-4).map((m: any) => ({
      role: m.role === "assistant" || m.role === "bot" ? "assistant" : "user",
      content: String(m.content || m.text || "").slice(0, 1200),
    })) : [];

    const prompt = [
      "You are Lucid Agent, a learning progress assistant. Answer in the learner's language and be concise, specific, and supportive.",
      "Use ONLY the supplied learner data for claims about progress, strengths, weaknesses, completions, quiz performance, and resources. Never invent missing measurements. If evidence is absent, say it has not been measured.",
      "Distinguish completion, exposure, understanding, recall, and application. Do not claim an action was saved or progress changed.",
      "If the question requires reading the contents of a PDF/video or changing goals/recommendations, explain that this local progress mode currently handles progress analytics only; do not guess.",
      "LEARNER DATA (JSON):",
      JSON.stringify(overview),
      history.length ? "RECENT CONVERSATION (JSON):\n" + JSON.stringify(history) : "",
      "LEARNER QUESTION:\n" + request,
    ].filter(Boolean).join("\n\n");

    return new Response(JSON.stringify({ ok: true, prompt, context_version: 1, model_task: "progress_readonly" }), { status: 200, headers: CORS });
  } catch (error) {
    console.error("lucid-agent-context error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Could not prepare learner context." }), { status: 500, headers: CORS });
  }
});