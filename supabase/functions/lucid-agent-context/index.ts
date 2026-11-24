import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

async function getLearnerOverview(sb: any, user: any) {
  const userId = user.id;
  const [profile, resources, catalogues, catalogueLinks, journeys, mastery, attempts, xp, earnedBadges] = await Promise.all([
    sb.from("profiles").select("display_name,bio,level,xp,weekly_goal").eq("id", userId).maybeSingle(),
    sb.from("lucid_resources").select("id,title,type,processing_status,created_at").eq("owner_id", userId).order("created_at", { ascending: false }).limit(500),
    sb.from("catalogues").select("id,title,description,created_at").eq("owner_id", userId).order("created_at", { ascending: false }).limit(200),
    Promise.resolve({ data: [], error: null }),
    sb.from("learning_journeys").select("completion,exposure,understanding,recall,application,last_activity_at,resource_id,catalogue_id,lucid_resources(title,type)").eq("owner_id", userId).order("last_activity_at", { ascending: false }).limit(100),
    sb.from("concept_mastery").select("mastery,exposure,understanding,recall,application,updated_at,concepts(title,normalized_key)").eq("user_id", userId).order("mastery", { ascending: true }).limit(50),
    sb.from("quiz_attempts").select("score,max_score,completed_at,skipped,quizzes(title,quiz_type)").eq("user_id", userId).order("completed_at", { ascending: false }).limit(20),
    sb.from("user_xp").select("xp,level,streak_days").eq("user_id", userId).maybeSingle(),
    sb.from("user_badges").select("awarded_at,metadata,badges(name,description,family)").eq("user_id", userId).order("awarded_at", { ascending: false }).limit(100),
  ]);
  for (const result of [profile, resources, catalogues, catalogueLinks, journeys, mastery, attempts, xp, earnedBadges]) if (result.error) throw result.error;
  const resourceRows = resources.data || [];
  const catalogueIds = (catalogues.data || []).map((x: any) => x.id);
  const catalogueLinks = catalogueIds.length
    ? await sb.from("catalogue_resources").select("catalogue_id,resource_id,status").in("catalogue_id", catalogueIds).eq("status", "active").limit(2000)
    : { data: [], error: null };
  if (catalogueLinks.error) throw catalogueLinks.error;
  const journeyRows = journeys.data || [];
  const valid = (attempts.data || []).filter((x: any) => !x.skipped && Number(x.max_score) > 0);
  const earned = valid.reduce((sum: number, x: any) => sum + Number(x.score || 0), 0);
  const possible = valid.reduce((sum: number, x: any) => sum + Number(x.max_score || 0), 0);
  const displayName = profile.data?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || null;
  const completedResourceIds = new Set(journeyRows.filter((x: any) => Number(x.completion) >= 100 && x.resource_id).map((x: any) => x.resource_id));
  const linkedResourceIds = new Set((catalogueLinks.data || []).map((x: any) => x.resource_id));
  return {
    learner_profile: { display_name: displayName, bio: profile.data?.bio || null, level: xp.data?.level ?? profile.data?.level ?? null, xp: xp.data?.xp ?? profile.data?.xp ?? null, streak_days: xp.data?.streak_days ?? null, weekly_goal: profile.data?.weekly_goal ?? null },
    resource_library: {
      total_resources: resourceRows.length,
      by_type: resourceRows.reduce((counts: Record<string, number>, row: any) => { const type = String(row.type || "other"); counts[type] = (counts[type] || 0) + 1; return counts; }, {}),
      linked_to_catalogue: linkedResourceIds.size,
      not_linked_to_catalogue: resourceRows.filter((x: any) => !linkedResourceIds.has(x.id)).length,
      completed_resources: completedResourceIds.size,
      resources: resourceRows.slice(0, 30).map((x: any) => ({ id: x.id, title: x.title, type: x.type, processing_status: x.processing_status })),
    },
    catalogues: { total: (catalogues.data || []).length, items: catalogues.data || [] },
    achievements: (earnedBadges.data || []).map((x: any) => ({ name: x.badges?.name || null, description: x.badges?.description || null, family: x.badges?.family || null, awarded_at: x.awarded_at })),
    progress_summary: {
      tracked_learning_items: journeyRows.length,
      completed_items: journeyRows.filter((x: any) => Number(x.completion) >= 100).length,
      average_completion: journeyRows.length ? Math.round(journeyRows.reduce((sum: number, x: any) => sum + Number(x.completion || 0), 0) / journeyRows.length) : null,
    },
    learning_journeys: journeyRows, concept_mastery: mastery.data || [],
    quiz_summary: { completed_attempts: valid.length, overall_accuracy: possible ? Math.round(earned / possible * 100) : null, recent_attempts: valid.slice(0, 10) },
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

    const overview = await getLearnerOverview(sb, me.data.user);
    const history = Array.isArray(body.history) ? body.history.slice(-4).map((m: any) => ({
      role: m.role === "assistant" || m.role === "bot" ? "assistant" : "user",
      content: String(m.content || m.text || "").slice(0, 1200),
    })) : [];

    const prompt = [
      "You are Lucid Agent, the signed-in learner's personal learning assistant. Answer in the learner's language and be concise, specific, and supportive.",
      "Use learner_profile.display_name for identity questions whenever available; never say the name is unknown when it is supplied.",
      "Use resource_library totals, type breakdown, completed resources, catalogues, and achievements for library and achievement questions. Distinguish total resources from catalogue-linked and completed resources.",
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