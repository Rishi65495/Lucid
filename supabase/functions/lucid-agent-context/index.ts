import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

async function getLearnerContext(sb: any, user: any, request: string, preferredName: string | null) {
  const userId = user.id;
  const q = request.toLowerCase();
  const identityOnly = /\b(my name|what'?s my name|who am i|what is my name|my profile name)\b|मेरा नाम|मेरा नाम क्या|मैं कौन हूं|मैं कौन हूँ/.test(q);
  const asksResources = /\b(resource|library|upload|pdf|video|catalogue|catalog)\b/.test(q);
  const asksAchievements = /\b(achievement|badge|xp|level|streak)\b/.test(q);
  const asksProgress = /\b(progress|analyse|analyze|weak|strong|mastery|accuracy|quiz|performance|study|pages|focus|completion|learning|improve|insight)\b/.test(q);
  const scope = identityOnly ? "identity" : asksProgress ? "progress" : asksResources ? "resources" : asksAchievements ? "achievements" : "overview";

  const profileQuery = sb.from("profiles").select("display_name,bio,level,xp,weekly_goal").eq("id", userId).maybeSingle();
  const profile = await profileQuery;
  if (profile.error) throw profile.error;
  const displayName = preferredName || profile.data?.display_name ||
    user.user_metadata?.display_name || user.user_metadata?.full_name ||
    user.user_metadata?.name || (user.email ? String(user.email).split("@")[0] : null);

  const base = { learner_profile: { display_name: displayName } };
  if (scope === "identity") return { ...base, context_scope: scope };

  const empty = { data: [], error: null, count: 0 };
  const jobs: Record<string, Promise<any>> = {};
  if (scope === "progress" || scope === "overview") {
    jobs.journeys = sb.from("learning_journeys").select("completion,exposure,understanding,recall,application,last_activity_at,resource_id,catalogue_id,lucid_resources(title,type)").eq("owner_id", userId).order("last_activity_at", { ascending: false }).limit(12);
    jobs.mastery = sb.from("concept_mastery").select("mastery,exposure,understanding,recall,application,updated_at,concepts(title,normalized_key)").eq("user_id", userId).order("mastery", { ascending: true }).limit(12);
    jobs.attempts = sb.from("quiz_attempts").select("score,max_score,completed_at,skipped,result,quizzes(title,quiz_type)", { count: "exact" }).eq("user_id", userId).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(8);
    jobs.availableQuizzes = sb.from("quizzes").select("id,title,quiz_type,created_at,source_context", { count: "exact" }).eq("owner_id", userId).order("created_at", { ascending: false }).limit(8);
    jobs.sessions = sb.from("reading_sessions").select("active_seconds,started_at,ended_at").eq("user_id", userId).order("started_at", { ascending: false }).limit(14);
  }
  if (scope === "resources" || scope === "overview") {
    jobs.resources = sb.from("lucid_resources").select("id,title,type,processing_status,created_at", { count: "exact" }).eq("owner_id", userId).order("created_at", { ascending: false }).limit(12);
    jobs.catalogues = sb.from("catalogues").select("id,title,description,created_at").eq("owner_id", userId).order("created_at", { ascending: false }).limit(8);
  }
  if (scope === "achievements" || scope === "overview") {
    jobs.xp = sb.from("user_xp").select("xp,level,streak_days").eq("user_id", userId).maybeSingle();
    jobs.earnedBadges = sb.from("user_badges").select("awarded_at,badges(name,description,family)").eq("user_id", userId).order("awarded_at", { ascending: false }).limit(12);
  }

  const keys = Object.keys(jobs);
  const values = await Promise.all(keys.map(key => jobs[key]));
  const data: Record<string, any> = {};
  values.forEach((value, index) => {
    if (value.error) throw value.error;
    data[keys[index]] = value;
  });

  const result: Record<string, any> = { ...base, context_scope: scope };
  if (data.journeys || data.mastery || data.attempts || data.sessions) {
    const journeys = data.journeys?.data || [];
    const mastery = data.mastery?.data || [];
    const attempts = (data.attempts?.data || []).filter((x: any) => !x.skipped && Number(x.max_score) > 0);
    const earned = attempts.reduce((sum: number, x: any) => sum + Number(x.score || 0), 0);
    const possible = attempts.reduce((sum: number, x: any) => sum + Number(x.max_score || 0), 0);
    const sessions = data.sessions?.data || [];
    result.progress_summary = {
      tracked_learning_items: journeys.length,
      completed_items: journeys.filter((x: any) => Number(x.completion) >= 100).length,
      average_completion: journeys.length ? Math.round(journeys.reduce((sum: number, x: any) => sum + Number(x.completion || 0), 0) / journeys.length) : null,
      completed_quiz_attempts: data.attempts?.count ?? attempts.length,
      quiz_accuracy: possible ? Math.round(earned / possible * 100) : null,
      recorded_focus_minutes: Math.round(sessions.reduce((sum: number, x: any) => sum + Number(x.active_seconds || 0), 0) / 60),
    };
    result.learning_journeys = journeys;
    result.concept_mastery = mastery;
    result.recent_quiz_attempts = attempts.slice(0, 6).map((x: any) => ({ score: x.score, max_score: x.max_score, completed_at: x.completed_at, title: x.quizzes?.title || null, quiz_type: x.quizzes?.quiz_type || null }));
    result.available_quizzes = { total: data.availableQuizzes?.count ?? (data.availableQuizzes?.data || []).length, recent: (data.availableQuizzes?.data || []).map((x: any) => ({ title: x.title, type: x.quiz_type, source_title: x.source_context?.source_title || null, created_at: x.created_at })) };
    result.recent_focus_sessions = sessions.slice(0, 7);
  }
  if (data.resources || data.catalogues) {
    const resources = data.resources || empty;
    result.resource_library = {
      total_resources: resources.count ?? (resources.data || []).length,
      resources: (resources.data || []).map((x: any) => ({ title: x.title, type: x.type, processing_status: x.processing_status })),
      catalogues: (data.catalogues?.data || []).map((x: any) => ({ title: x.title, description: x.description })),
    };
  }
  if (data.xp || data.earnedBadges) {
    result.learner_profile = {
      ...result.learner_profile,
      level: data.xp?.data?.level ?? profile.data?.level ?? null,
      xp: data.xp?.data?.xp ?? profile.data?.xp ?? null,
      streak_days: data.xp?.data?.streak_days ?? null,
    };
    result.achievements = (data.earnedBadges?.data || []).map((x: any) => ({
      name: x.badges?.name || null, description: x.badges?.description || null,
      family: x.badges?.family || null, awarded_at: x.awarded_at,
    }));
  }
  return result;
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

    const preferredName = String(body.preferred_name || "").trim().slice(0, 80) || null;
    const overview = await getLearnerContext(sb, me.data.user, request, preferredName);
    const history = Array.isArray(body.history) ? body.history.slice(-4).map((m: any) => ({
      role: m.role === "assistant" || m.role === "bot" ? "assistant" : "user",
      content: String(m.content || m.text || "").slice(0, 1200),
    })) : [];

    const prompt = [
      "You are Lucid Agent, the signed-in learner's personal learning assistant. Answer in the learner's language and be concise, specific, and supportive.",
      "Use learner_profile.display_name for identity questions whenever available; never say the name is unknown when it is supplied.",
      "Only use fields present in the supplied context. Context is intentionally scoped to the question; never assume omitted categories are zero.",
      "Use ONLY the supplied learner data for claims about progress, strengths, weaknesses, completions, quiz performance, and resources. Never invent missing measurements. If evidence is absent, say it has not been measured.",
      "Distinguish completion, exposure, understanding, recall, and application. Do not claim an action was saved or progress changed.",
      "For identity questions, answer directly from learner_profile.display_name. For progress questions, cite only measured values and name missing evidence. Never invent page counts or trends that are not present.",
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