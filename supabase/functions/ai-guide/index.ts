import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash';
const API_KEY = Deno.env.get('GEMINI_API_KEY');
const CORS = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Content-Type':'application/json' };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({error:'POST required'}), {status:405,headers:CORS});
  if (!API_KEY) return new Response(JSON.stringify({error:'GEMINI_API_KEY is not configured in Supabase Edge Function secrets.'}), {status:503,headers:CORS});
  try {
    const body = await req.json();
    const question = String(body?.question || '').trim();
    const context = String(body?.context || '').trim();
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    if (!question) return new Response(JSON.stringify({error:'Question is required'}), {status:400,headers:CORS});
    const prompt = `You are Leafline AI Guide, a precise study companion. Answer using the supplied book/PDF context when relevant. Do not invent facts that are not supported by the context. If the context is insufficient, say so and then give a clearly labeled general explanation. Prefer concise, useful explanations with examples.\n\nBOOK/PDF CONTEXT:\n${context.slice(0,90000)}\n\nCONVERSATION:\n${history.map((m:any)=>`${m.role}: ${String(m.content||'').slice(0,4000)}`).join('\n')}\n\nUSER QUESTION:\n${question}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const requestBody = JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:1200}});
    let r: Response | null = null;
    let data: any = {};
    for (let attempt=0; attempt<4; attempt++) {
      r = await fetch(endpoint, {method:'POST',headers:{'content-type':'application/json','x-goog-api-key':API_KEY},body:requestBody});
      data = await r.json().catch(()=>({}));
      if (r.ok) break;
      const message = data?.error?.message || 'Gemini request failed';
      if (![429,500,502,503,504].includes(r.status) || attempt===3) {
        console.error('AI Guide provider error',JSON.stringify({status:r.status,message}));
        return new Response(JSON.stringify({error:message,provider:'Gemini',providerStatus:r.status}), {status:r.status===503?503:502,headers:CORS});
      }
      const retryAfter = Number(r.headers.get('retry-after') || 0);
      const delay = retryAfter>0 ? Math.min(retryAfter*1000,10000) : 800*Math.pow(2,attempt);
      await new Promise(resolve=>setTimeout(resolve,delay));
    }
    if (!r?.ok) return new Response(JSON.stringify({error:'Gemini is temporarily unavailable. Please try again shortly.',provider:'Gemini',providerStatus:r?.status||503}), {status:503,headers:CORS});
    const text = data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('').trim() || 'I could not generate an answer.';
    return new Response(JSON.stringify({text,model:MODEL}), {headers:{...CORS,'cache-control':'no-store'}});
  } catch (e) {
    console.error('AI Guide function error',e);
    return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unexpected error'}), {status:500,headers:CORS});
  }
});