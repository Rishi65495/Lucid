import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json" };
const MODEL=Deno.env.get("GEMINI_MODEL")||"gemini-2.5-flash";
// Continue to fallback models when a configured model name is no longer available.
const MODEL_FALLBACKS=[...new Set([MODEL,"gemini-2.5-flash","gemini-2.5-flash-lite"])];
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

async function gemini(prompt:string,maxOutputTokens=2500){
 let lastError="Gemini API error",lastStatus=503;
 for(const model of MODEL_FALLBACKS){
  for(let attempt=0;attempt<2;attempt++){
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),22000);
   try{
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
     method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":KEY},
     body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:.2,maxOutputTokens}}),signal:controller.signal
    });
    const d=await r.json().catch(()=>({}));
    if(r.ok){const text=d?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("").trim()||"";if(text)return {text,model};lastStatus=502;lastError="Gemini returned an empty response.";}
    else{lastStatus=r.status;lastError=d?.error?.message||"Gemini request failed";}
    if(![400,404,429,500,502,503,504].includes(lastStatus))break;
   }catch(e){lastStatus=504;lastError=e instanceof Error&&e.name==="AbortError"?"Gemini request timed out after 22 seconds.":(e instanceof Error?e.message:"Network error");}
   finally{clearTimeout(timeout);}
   if(attempt===0&&[429,500,502,503,504].includes(lastStatus))await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(![400,404,429,500,502,503,504].includes(lastStatus))break;
 }
 const error=new Error(lastError);(error as any).status=lastStatus;throw error;
}
function cleanJson(s:string){
 const t=s.trim().replace(/^\`\`\`(?:json)?/i,"").replace(/\`\`\`$/,"").trim();
 try{return JSON.parse(t)}catch{const first=t.indexOf("{"),last=t.lastIndexOf("}");if(first>=0&&last>first){try{return JSON.parse(t.slice(first,last+1))}catch{}}return {text:s};}
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
    const requestedCount=Math.max(1,Math.min(20,Number(body.context?.question_count)||5));
    const quizFormat=String(body.context?.question_format||"mcq");
    const quizDifficulty=String(body.context?.difficulty||"Balanced");
    const quizOptions=quizFormat==="true_false"?["True","False"]:["","","",""];
    const quizShape={questions:Array.from({length:requestedCount},()=>({prompt:"",type:quizFormat==="mixed"?"mcq":quizFormat,options:quizOptions,answer_index:0,explanation:"",concept_key:""}))};
    const shape=JSON.stringify(action==="quiz"?quizShape:(shapes[action]||shapes.summarize));
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
Return ONLY valid JSON matching this structure:
${shape}
For quiz generation, create exactly ${requestedCount} distinct questions. Requested format: ${quizFormat}. Difficulty: ${quizDifficulty}. Every question must be grounded in the supplied source context and include a concise non-empty concept_key naming the exact topic being tested. Reuse the same concept_key for questions testing the same topic. For true_false, options must be exactly True and False. For mixed, include an appropriate mix of multiple-choice, true/false and application questions, with a type field for each. For case_based, use a short scenario and ask the learner to apply the source concept. Ensure answer_index is a zero-based integer that points to one of the options. Do not return markdown fences or commentary.
`;
    const generated=await gemini(prompt,action==='quiz'?Math.min(6500,1200+requestedCount*260):2500);
    const result=cleanJson(generated.text);
    if(action==="quiz"&&(!Array.isArray(result?.questions)||!result.questions.length))throw new Error("Gemini returned invalid quiz JSON. Please retry generation.");
    return new Response(JSON.stringify({action,result,model:generated.model}),{headers:cors});
  }catch(e){const status=Number((e as any)?.status)||500;return new Response(JSON.stringify({error:e instanceof Error?e.message:"AI learning error"}),{status:status===429?429:(status===504?504:status===503?503:500),headers:cors});}
});