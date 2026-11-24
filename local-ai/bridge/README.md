# Lucid Local AI Bridge (Windows 10)

This local bridge runs on the same PC as the Lucid browser and Ollama. It binds only to `127.0.0.1`; do not expose port 3210 or Ollama's 11434 port to the LAN or internet.

## Setup

1. Install Node.js 18.18 or newer.
2. Ensure Ollama is installed and the model exists. In PowerShell run: `ollama pull llama3.2:1b`.
3. Copy `.env.example` to `.env`. The example contains Lucid's public Supabase publishable key; it is not a service-role key. Never put a Supabase secret/service-role key here.
4. In PowerShell, from this folder run: `npm start`.
5. Keep Ollama and this bridge running while using Lucid.
6. Check the bridge from the same browser: `http://127.0.0.1:3210/health`.

The bridge validates the signed-in Supabase access token against Supabase Auth before forwarding the prompt to Ollama. Browser access is restricted to the configured Lucid origin.

## Routing

For Home Agent progress questions, Lucid first invokes the authenticated `lucid-agent-context` Edge Function to retrieve the signed-in learner's progress, concept mastery, and quiz history. The resulting prompt is sent to local Ollama. If context preparation, the bridge, or Ollama fails, Lucid automatically calls the existing `lucid-agent` Edge Function. That existing function uses Gemini first and Mistral as its configured backup.

Resource/PDF/video questions and agent actions requiring model tools remain on the existing cloud route; the local progress mode is intentionally read-only.

## Important

- Your PC must be awake, Ollama must be running, and this bridge must be running.
- This first version is same-PC only.
- Do not expose the bridge or Ollama to the public internet.
- The bridge requires Node.js 18.18+ (built-in fetch and AbortSignal.timeout).
