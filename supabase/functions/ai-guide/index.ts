import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { routeIntent } from "../_shared/context-engine/intent-router.ts";
import { composeContext } from "../_shared/context-engine/context-composer.ts";
import { enforceContextBudget } from "../_shared/context-engine/token-controller.ts";
import { retrieveResourceContext } from "../_shared/context-engine/resource-retriever.ts";

const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function extractPageNumber(question: string): number | undefined {
  const match = question.match(/\\bpage\\s*(\\d+)\\b|\\bपेज\\s*(\\d+)\\b/i);
  const value = Number(match?.[1] || match?.[2]);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: CORS });
  if (!API_KEY) return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured in Supabase Edge Function secrets." }), { status: 503, headers: CORS });

  try {
    const body = await req.json();
    const question = String(body?.question || "").trim();
    const style = String(body?.style || "").trim().slice(0, 300);
    const history = Array.isArray(body?.history) ? body.history.slice(-8).map((m: any) => ({
      role: String(m?.role || "user").slice(0, 20),
      content: String(m?.content || "").slice(0, 2000),
    })) : [];
    const resourceId = String(body?.resource_id || "").trim();
    if (!question) return new Response(JSON.stringify({ error: "Question is required" }), { status: 400, headers: CORS });

    const decision = routeIntent(question);
    let resourceChunks: Array<{ page: number; text: string; score?: number }> = [];

    // Fetch resource text only when the router says the question needs it.
    if (decision.retrieve.resource && resourceId) {
      const authorization = req.headers.get("Authorization") || "";
      const token = authorization.replace(/^Bearer\\s+/i, "");
      if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return new Response(JSON.stringify({ error: "Sign in is required to retrieve your learning resource." }), { status: 401, headers: CORS });
      }
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: "Your session is invalid. Please sign in again." }), { status: 401, headers: CORS });
      }

      const pageNumber = extractPageNumber(question);
      const retrieved = await retrieveResourceContext(supabase, {
        userId: authData.user.id,
        resourceId,
        pageNumber,
        query: pageNumber ? undefined : question.replace(/[?!.]/g, " ").trim(),
        limit: pageNumber ? 1 : 4,
        maxCharactersPerPage: 3500,
      });
      resourceChunks = retrieved.chunks.map((chunk) => ({
        page: chunk.page,
        text: chunk.text,
      }));
    }

    const composed = composeContext({
      intent: decision.intent,
      userMessage: question,
      conversation: history,
      resourceChunks,
    }, decision.level);
    const checked = enforceContextBudget(composed.context, decision.level);
    const selectedContext = checked.withinBudget && checked.value ? checked.value : {
      intent: decision.intent,
      userMessage: question,
      resourceChunks: resourceChunks.slice(0, 1).map((chunk) => ({ page: chunk.page, text: chunk.text.slice(0, 1200) })),
    };

    const prompt = `You are Leafline AI Guide, a precise study companion.
Intent: ${decision.intent}
Answer using retrieved resource excerpts when relevant. Do not invent facts or page details. If excerpts are insufficient, say so and clearly label any general explanation.
Preferred coaching style: ${style || "clear and supportive"}
SELECTED CONTEXT (only the data selected for this request):
${JSON.stringify(selectedContext)}
USER QUESTION:
${question}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: decision.level === 0 ? 300 : 1200 },
    });
    let response: Response | null = null;
    let data: any = {};
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": API_KEY },
        body: requestBody,
      });
      data = await response.json().catch(() => ({}));
      if (response.ok) break;
      const message = data?.error?.message || "Gemini request failed";
      const quotaExhausted = response.status === 429 && /per.day|per day|daily|requests_per_day|quota exceeded/i.test(message);
      const retryable = [500, 502, 503, 504].includes(response.status) ||
        (response.status === 429 && !quotaExhausted);
      if (!retryable || attempt === 3) {
        console.error("AI Guide provider error", JSON.stringify({ status: response.status, quotaExhausted, intent: decision.intent }));
        return new Response(JSON.stringify({ error: message, provider: "Gemini", providerStatus: response.status }), {
          status: response.status === 503 ? 503 : 502,
          headers: CORS,
        });
      }
      const retryAfter = Number(response.headers.get("retry-after") || 0);
      const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, 10000) : 800 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (!response?.ok) {
      return new Response(JSON.stringify({ error: "Gemini is temporarily unavailable. Please try again shortly.", provider: "Gemini", providerStatus: response?.status || 503 }), { status: 503, headers: CORS });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("").trim() || "I could not generate an answer.";
    return new Response(JSON.stringify({
      text,
      model: MODEL,
      routing: { intent: decision.intent, contextLevel: decision.level, estimatedInputTokens: checked.estimatedTokens, budget: checked.budget.maxInputTokens, resourcePages: resourceChunks.length },
    }), { headers: { ...CORS, "cache-control": "no-store" } });
  } catch (error) {
    console.error("AI Guide function error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), { status: 500, headers: CORS });
  }
});
