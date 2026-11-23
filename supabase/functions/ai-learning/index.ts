import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json" };
const MODEL=Deno.env.get("GEMINI_MODEL")||"gemini-2.5-flash";
const KEY=Deno.env.get("GEMINI_API_KEY")||"";
const shapes:any={
 quiz:{questions:[{prompt:"",type:"mcq",options:["","","",""],answer_index:0,explanation:"",concept_key:""}]},
 flashcards:{cards:[{front:"",back:"",concept_key:""}]},
 concepts:{concepts:[{title:"",description:"",normalized_key:""}]},
 plan:{actions:[{action_type:"",reason:"",minutes:0,resource_hint:""}]},
 evaluate_recall:{score:0,coverage:0,accuracy:0,clarity:0,missing:[],feedback:""},
 analyze_pattern:{patterns:[{pattern_key:"",dimension:"",evidence:{},confidence:0,adaptive_response:""}]},
 teach:{lesson:"",checkpoints:[{question:"",expected_points:[]}]},
 summarize:{text:""}
};

async function gemini(prompt:string){
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:.2,maxOutputTokens:5000}})
  });
  const d=await r.json(); if(!r.ok) throw new Error(d?.error?.message||"Gemini request failed");
  return d?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||"";
}
function cleanJson(s:string){
  const t=s.trim().replace(/^\`\`\`(?:json)?/i,"").replace(/\`\`\`$/,"").trim();
  try{return JSON.parse(t)}catch{return {text:s}}
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return new Response(JSON.stringify({error:"POST only"}),{status:405,headers:cors});
  try{
    if(!KEY)return new Response(JSON.stringify({error:"GEMINI_API_KEY is not configured"}),{status:503,headers:cors});
    const auth=req.headers.get("Authorization")||"", token=auth.replace(/^Bearer\s+/i,"");
    const supabase=createClient(Deno.env.get("SUPABASE_URL")||"",Deno.env.get("SUPABASE_ANON_KEY")||"",{global:{headers:{Authorization:auth}}});
    const {data:{user},error}=await supabase.auth.getUser(token);
    if(error||!user)return new Response(JSON.stringify({error:"Not authenticated"}),{status:401,headers:cors});
    const body=await req.json(); const action=String(body.action||"summarize");
    const context=JSON.stringify(body.context||{}).slice(0,90000), history=JSON.stringify(body.history||[]).slice(0,15000), request=String(body.request||"");
    const shape=JSON.stringify(shapes[action]||shapes.summarize);
    const prompt=`You are Lucid, a context-aware learning engine.
Source-grounding rule: use only facts supported by the supplied learning context. Never fabricate citations, source claims, pages, questions or answers.
Learning philosophy: completion is not mastery; active recall, application, improvement and consistency are evidence.
Learner controls pace. Optional checks may be skipped unless the request explicitly marks a milestone requirement.
ACTION: ${action}
REQUEST: ${request}
CONTEXT:
${context}
HISTORY:
${history}
Return ONLY JSON matching:
${shape}
`;
    const result=cleanJson(await gemini(prompt));
    return new Response(JSON.stringify({action,result,model:MODEL}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"AI learning error"}),{status:500,headers:cors});}
});