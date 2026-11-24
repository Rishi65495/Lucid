import http from "node:http";

const PORT = Number(process.env.PORT || 3210);
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || "https://rishi65495.github.io").split(",").map(x => x.trim()).filter(Boolean));

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}
function applyCors(req, res) {
  const origin = req.headers.origin || "";
  // Allow a direct loopback health check in the address bar/PowerShell; never allow origin-less chat POSTs.
  if (!origin && req.method === "GET" && (req.url || "").startsWith("/health")) return true;
  if (!ALLOWED_ORIGINS.has(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, apikey");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}
async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error("Request too large.");
  }
  return raw ? JSON.parse(raw) : {};
}
async function validateUser(token) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error("Bridge is not configured. Copy .env.example to .env and set the Supabase URL and publishable key.");
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { Authorization: "Bearer " + token, apikey: SUPABASE_PUBLISHABLE_KEY },
  });
  if (!response.ok) throw new Error("Supabase session validation failed.");
  return response.json();
}
const server = http.createServer(async (req, res) => {
  if (!applyCors(req, res)) return send(res, 403, { error: "Origin not allowed." });
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  const url = new URL(req.url || "/", "http://127.0.0.1:" + PORT);
  if (req.method === "GET" && url.pathname === "/health") {
    try {
      const r = await fetch(OLLAMA_URL + "/api/tags", { signal: AbortSignal.timeout(2500) });
      if (!r.ok) throw new Error("Ollama is not responding.");
      const data = await r.json();
      return send(res, 200, { ok: true, ollama: true, configured_model: OLLAMA_MODEL, installed_models: (data.models || []).map(x => x.name) });
    } catch {
      return send(res, 503, { ok: false, error: "Ollama is not reachable. Start Ollama on this PC." });
    }
  }
  if (req.method !== "POST" || url.pathname !== "/chat") return send(res, 404, { error: "Not found." });
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\\s+/i, "");
    if (!token) return send(res, 401, { error: "Sign in to Lucid first." });
    await validateUser(token);
    const body = await readBody(req);
    const prompt = String(body.prompt || "").trim();
    if (!prompt || prompt.length > 60_000) return send(res, 400, { error: "A valid context prompt is required." });
    const response = await fetch(OLLAMA_URL + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, messages: [{ role: "user", content: prompt }], options: { temperature: 0.25, num_ctx: 4096 } }),
      signal: AbortSignal.timeout(120_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Ollama inference failed.");
    const answer = data.message?.content?.trim();
    if (!answer) throw new Error("Ollama returned an empty answer.");
    return send(res, 200, { ok: true, text: answer, model: data.model || OLLAMA_MODEL, provider: "ollama" });
  } catch (error) {
    return send(res, 502, { error: error instanceof Error ? error.message : "Local AI request failed." });
  }
});
server.listen(PORT, "127.0.0.1", () => console.log("Lucid Local AI bridge listening on http://127.0.0.1:" + PORT));
