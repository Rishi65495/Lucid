/* Lucid: Supabase Auth + server-side AI routing. No provider API keys belong in this file. */
const LUCID_SUPABASE_URL = 'https://hnrxozghykcmfoozbeii.supabase.co';
const LUCID_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iJ_-Do2rNTaJf1bDL2y2DQ_7rEH4juU';
const lucidSupabase = window.supabase.createClient(LUCID_SUPABASE_URL, LUCID_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
let lucidSession = null;
let lucidAuthMode = 'signin';
function lucidAuthMessage(message, type) { const el=document.getElementById('authMessage'); if(!el)return; el.textContent=message||''; el.className='auth-message'+(type?' '+type:''); }
window.toggleAuthMode = function(){ lucidAuthMode=lucidAuthMode==='signin'?'signup':'signin'; const signup=lucidAuthMode==='signup'; document.getElementById('authTitle').textContent=signup?'Create your account.':'Welcome back.'; document.getElementById('authDescription').textContent=signup?'Create a secure account to start learning with Lucid.':'Sign in to securely access your learning workspace and AI agents.'; document.getElementById('authSubmit').textContent=signup?'Create account':'Sign in'; document.getElementById('authModeSwitch').textContent=signup?'Already have an account? Sign in':'New to Lucid? Create an account'; document.getElementById('authPassword').autocomplete=signup?'new-password':'current-password'; lucidAuthMessage(''); };
window.updateLucidAuthUI = async function(session){
  lucidSession=session||null;
  const gate=document.getElementById('authGate'); if(gate)gate.style.display=lucidSession?'none':'flex';
  const out=document.getElementById('signOutButton'); if(out)out.style.display=lucidSession?'':'none';
  const status=document.getElementById('aiConnectionStatus'); if(status)status.textContent=lucidSession?'Authenticated · AI requests are routed through Supabase.':'Sign in to activate AI services.';
  if(lucidSession&&lucidSession.user){try{await window.loadLucidProfile();}catch(error){console.warn('Could not load learner profile:',error.message);}try{await window.loadLucidCatalogues();}catch(error){console.warn('Could not load catalogues:',error.message);}try{await window.loadLucidVideoLibrary();}catch(error){console.warn('Could not load video library:',error.message);}try{await window.loadLucidGoals();}catch(error){console.warn('Could not load goals:',error.message);}try{await window.loadLucidAchievements();}catch(error){console.warn('Could not load achievements:',error.message);}try{await window.loadLucidLearningProfile();}catch(error){console.warn('Could not load learning evidence:',error.message);}try{await window.loadLucidLeaderboard();}catch(error){console.warn('Could not load leaderboard:',error.message);}}
};
window.handleAuthSubmit = async function(event){ event.preventDefault(); const email=document.getElementById('authEmail').value.trim(); const password=document.getElementById('authPassword').value; const button=document.getElementById('authSubmit'); button.disabled=true; button.textContent=lucidAuthMode==='signup'?'Creating account…':'Signing in…'; lucidAuthMessage(''); try { if(lucidAuthMode==='signup'){ const {data,error}=await lucidSupabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}}); if(error)throw error; if(data.session){window.updateLucidAuthUI(data.session);lucidAuthMessage('Account created. You are signed in.','success');}else{lucidAuthMessage('Account created. Check your email to confirm it, then return here and sign in.','success');} } else { const {data,error}=await lucidSupabase.auth.signInWithPassword({email,password}); if(error)throw error; window.updateLucidAuthUI(data.session); if(typeof showToast==='function')showToast('Signed in securely.','✓'); } } catch(error){lucidAuthMessage(error?.message||'Authentication failed. Please try again.','error');} finally {button.disabled=false;button.textContent=lucidAuthMode==='signup'?'Create account':'Sign in';} };
window.signOutLucid = async function(){const {error}=await lucidSupabase.auth.signOut();if(error){showToast('Sign out failed: '+error.message,'⚠');return;}window.updateLucidAuthUI(null);showToast('You have signed out.','✓');};
window.invokeLucidFunction = async function(name,body){
  let {data:{session},error:sessionError}=await lucidSupabase.auth.getSession();
  if(sessionError)throw new Error('Could not read your sign-in session: '+sessionError.message);
  const needsRefresh=!session?.access_token||!session.expires_at||session.expires_at*1000<Date.now()+30000;
  if(needsRefresh){
    const refreshed=await lucidSupabase.auth.refreshSession();
    if(refreshed.error||!refreshed.data?.session?.access_token)throw new Error('Your sign-in session expired. Please sign in again.');
    session=refreshed.data.session;lucidSession=session;
    if(window.updateLucidAuthUI)await window.updateLucidAuthUI(session);
  }
  async function send(accessToken){
    const response=await fetch(LUCID_SUPABASE_URL+'/functions/v1/'+encodeURIComponent(name),{
      method:'POST',headers:{'Authorization':'Bearer '+accessToken,'apikey':LUCID_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify(body||{})
    });
    const raw=await response.text();let payload={};try{payload=raw?JSON.parse(raw):{};}catch(_){payload={error:raw||'The server returned an unreadable response.'};}
    return {response,payload,raw};
  }
  let result=await send(session.access_token);
  if(result.response.status===401){
    const refreshed=await lucidSupabase.auth.refreshSession();
    if(!refreshed.error&&refreshed.data?.session?.access_token){
      session=refreshed.data.session;lucidSession=session;
      if(window.updateLucidAuthUI)await window.updateLucidAuthUI(session);
      result=await send(session.access_token);
    }
  }
  if(!result.response.ok)throw new Error('HTTP '+result.response.status+' · '+(result.payload.error||result.payload.message||result.payload.msg||result.raw||'Edge Function request failed'));
  if(result.payload?.error)throw new Error(result.payload.error);
  return result.payload;
};
window.callAIGuide = async function(prompt,style){
  if(typeof state!=='undefined'&&state.currentVideoContext&&!String(state.currentVideoContext.transcript||'').trim())return 'This video has no saved transcript. Paste its captions in the Video Classroom transcript panel before asking video-specific questions.';
  try{
    const history=(typeof state!=='undefined'?state.chatMessages:[]).slice(-8).map(m=>({role:m.role,content:m.text}));
    // Do not download PDF pages in the browser. The Edge Function routes the
    // request first and retrieves only the relevant, user-owned resource pages.
    const data=await window.invokeLucidFunction('ai-guide',{
      question:prompt,
      style:style||'',
      history,
      resource_id:typeof state!=='undefined'&&state.currentVideoContext?null:(typeof state!=='undefined'?state.currentResourceId:null),
      video_context:typeof state!=='undefined'&&state.currentVideoContext?{title:state.currentVideoContext.title,transcript:state.currentVideoContext.transcript}:null,
      current_page:typeof state!=='undefined'?Number(state.currentResourcePage)||1:1,
      context:typeof state!=='undefined'?(state.currentVideoContext
        ? 'Selected YouTube video: '+(state.currentVideoContext.title||'')+'\\nTranscript length: '+String(state.currentVideoContext.transcript||'').length+' characters.'
        : [
          'Current resource: '+(state.currentResourceTitle||''),
          'Current page: '+(state.currentResourcePage||1),
          'Page text: '+((state.resourcePages||[]).find(p=>Number(p.page_number)===Number(state.currentResourcePage))?.text_content||'').slice(0,7000),
          'Selected passage: '+(state.selectedText||''),
          'Annotations: '+(state.annotations||[]).slice(-8).map(x=>typeof x==='string'?x:x.text||x.note||'').join('; ')
        ].join('\\n')): ''
    });
    return data.text||'The AI Guide returned an empty response.';
  }catch(error){return 'AI Guide error: '+(error&&error.message||'Unknown error');}
};
window.callLearningEngine = async function(action,request,context){return await window.invokeLucidFunction('ai-learning',{action,request,context:context||{}});};
window.formatLearningResult = function(result){if(!result)return 'No learning result was returned.';if(result.feedback)return 'Score: '+(result.score??'—')+'\nCoverage: '+(result.coverage??'—')+'\nAccuracy: '+(result.accuracy??'—')+'\nClarity: '+(result.clarity??'—')+'\nFeedback: '+result.feedback+(result.missing?.length?'\nReview: '+result.missing.join(', '):'');if(result.questions?.length)return result.questions.map((q,i)=>(i+1)+'. '+q.prompt+'\n'+(q.options||[]).map((o,j)=>String.fromCharCode(65+j)+'. '+o).join('\n')+'\nAnswer: '+(q.options?.[q.answer_index]||'Not provided')+'\n'+(q.explanation||'')).join('\n\n');if(result.cards?.length)return result.cards.map((c,i)=>(i+1)+'. '+c.front+'\n'+c.back).join('\n\n');return result.lesson||result.text||JSON.stringify(result,null,2);};
window.callLucidAgent = async function(prompt){
  if(typeof state!=='undefined'&&state.currentVideoContext){if(!String(state.currentVideoContext.transcript||'').trim())return 'This video has no saved transcript. Paste its captions in the Video Classroom transcript panel before asking video-specific questions.';return await window.callAIGuide(prompt,state.coachMode||'Gentle');}
  const data=await window.invokeLucidFunction('lucid-agent',{action:'chat',request:prompt,resource_id:typeof state!=='undefined'?state.currentResourceId:null});
  return data.text||data.result&&data.result.text||(typeof data.result==='string'?data.result:JSON.stringify(data.result||data,null,2));
};
// Source-first practice: every generated activity must start with an explicit learner-selected source.
window.openLucidPracticeSourcePicker = function(){
  const resources=(state.uploadedBooks||[]).filter(r=>r.type==='pdf'&&r.status!=='processing'&&r.status!=='failed');
  if(!resources.length){showToast('Add a text-readable PDF to your Library before generating practice.','⚠');return Promise.resolve(null);}
  const catalogues=state.catalogues||[];
  return new Promise(resolve=>{
    const modal=document.createElement('div');modal.id='lucidPracticeSourcePicker';modal.className='modal-backdrop open';
    modal.innerHTML='<div class="modal"><div class="modal-header"><h2>Choose learning sources</h2><button class="close-button" type="button" id="practiceSourceClose">×</button></div><div class="form-stack"><p class="muted small-text">Select one or more PDFs, or choose a catalogue to include all its PDFs. AI will use only the selected source text.</p><label class="form-label">Use an entire catalogue<select id="practiceCatalogue"><option value="">Choose catalogue (optional)</option></select></label><div class="kicker">PDF resources</div><div id="practiceSourceList" style="display:grid;gap:8px;max-height:260px;overflow:auto;"></div><div style="display:flex;gap:8px;"><button class="secondary-button full-width" type="button" id="practiceSourceCancel">Cancel</button><button class="primary-button full-width" type="button" id="practiceSourceContinue">Use selected sources →</button></div><p class="muted small-text" id="practiceSourceStatus" aria-live="polite"></p></div></div>';
    document.body.appendChild(modal);
    const select=modal.querySelector('#practiceCatalogue'),list=modal.querySelector('#practiceSourceList');
    catalogues.forEach(cat=>select.add(new Option(cat.title,cat.id)));
    resources.forEach(resource=>{
      const label=document.createElement('label');label.style.cssText='display:flex;gap:10px;align-items:flex-start;padding:9px;border:1px solid var(--line);border-radius:10px;cursor:pointer;';
      const check=document.createElement('input');check.type='checkbox';check.value=resource.resourceId||resource.id;check.className='practice-source-check';check.style.marginTop='3px';
      const text=document.createElement('span');text.textContent=resource.name+' · '+(Number(resource.pages)||'—')+' pages';
      label.append(check,text);list.appendChild(label);
    });
    select.addEventListener('change',()=>{
      const catId=select.value;
      list.querySelectorAll('.practice-source-check').forEach(check=>{
        const resource=resources.find(r=>(r.resourceId||r.id)===check.value);
        check.checked=!!catId&&(resource.catalogueIds||[]).includes(catId);
      });
    });
    let settled=false;
    const finish=value=>{if(settled)return;settled=true;modal.remove();resolve(value);};
    modal.querySelector('#practiceSourceClose').onclick=()=>finish(null);
    modal.querySelector('#practiceSourceCancel').onclick=()=>finish(null);
    modal.addEventListener('click',e=>{if(e.target===modal)finish(null);});
    modal.querySelector('#practiceSourceContinue').onclick=()=>{
      const ids=Array.from(list.querySelectorAll('.practice-source-check:checked')).map(x=>x.value);
      if(!ids.length){modal.querySelector('#practiceSourceStatus').textContent='Select at least one PDF or choose a catalogue containing PDFs.';return;}
      finish({resourceIds:ids,catalogueId:select.value||null,resources:resources.filter(r=>ids.includes(r.resourceId||r.id))});
    };
  });
};
window.collectLucidPracticeContext = async function(selection){
  if(!selection?.resourceIds?.length)throw new Error('Choose at least one source.');
  const sources=[];
  for(const id of selection.resourceIds){
    const resource=(state.uploadedBooks||[]).find(r=>(r.resourceId||r.id)===id);
    if(!resource)continue;
    const pages=await window.getLucidResourcePages(id,{});
    if(!pages.length)continue;
    const stride=Math.max(1,Math.ceil(pages.length/12));
    const sampled=pages.filter((_,i)=>i%stride===0).slice(0,12);
    sources.push({id,title:resource.name,pages:sampled.map(p=>({page_number:p.page_number,text_content:String(p.text_content||'').slice(0,2200)}))});
  }
  const pageContent=sources.map(source=>'SOURCE: '+source.title+'\n'+source.pages.map(page=>'PAGE '+page.page_number+':\n'+page.text_content).join('\n\n')).join('\n\n---\n\n').slice(0,50000);
  if(!pageContent.trim())throw new Error('The selected PDFs have no extracted text. Reprocess the PDFs or run OCR before generating practice.');
  return {source_resource_ids:sources.map(x=>x.id),source_titles:sources.map(x=>x.title),catalogue_id:selection.catalogueId||null,page_content:pageContent,sources};
};
window.generateAIQuiz = async function(){
  const selection=await window.openLucidPracticeSourcePicker();if(!selection)return;
  const modal=document.createElement('div');modal.id='lucidQuizSettings';modal.className='modal-backdrop open';
  modal.innerHTML='<div class="modal"><div class="modal-header"><h2>Configure your source-based quiz</h2><button class="close-button" type="button" id="quizSettingsClose">×</button></div><div class="form-stack"><p class="muted small-text" id="quizSelectedSources"></p><div class="form-row"><label class="form-label">Question count<select id="lucidQuizCount"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></label><label class="form-label">Difficulty<select id="lucidQuizDifficulty"><option>Balanced</option><option>Easy</option><option>Moderate</option><option>Hard</option><option>Exam level</option></select></label></div><label class="form-label">Focus instructions<textarea id="lucidQuizInstructions" placeholder="e.g. Focus on definitions, comparisons, applications or exam-style problems"></textarea></label><button class="primary-button full-width" id="lucidBuildQuiz">Generate from selected sources →</button><p class="muted small-text" id="lucidQuizStatus" aria-live="polite"></p></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('#quizSelectedSources').textContent='Sources: '+selection.resources.map(x=>x.name).join(', ');
  const close=()=>modal.remove();modal.querySelector('#quizSettingsClose').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.querySelector('#lucidBuildQuiz').onclick=async()=>{
    const btn=modal.querySelector('#lucidBuildQuiz'),status=modal.querySelector('#lucidQuizStatus');
    btn.disabled=true;btn.textContent='Preparing source material…';
    try{
      const context=await window.collectLucidPracticeContext(selection);
      status.textContent='Generating questions from '+context.source_titles.length+' selected source(s)…';
      const count=Number(modal.querySelector('#lucidQuizCount').value)||10,difficulty=modal.querySelector('#lucidQuizDifficulty').value,instructions=modal.querySelector('#lucidQuizInstructions').value.trim();
      const request='Create '+count+' multiple-choice questions using only the supplied source material. Difficulty: '+difficulty+'. Focus: '+(instructions||'Test conceptual understanding, comparison and application. Avoid repeated questions.');
      const data=await window.callLearningEngine('quiz',request,{...context,question_count:count,difficulty,question_format:'mcq'});
      const questions=(data.result?.questions||data.questions||[]).filter(q=>q.prompt&&Array.isArray(q.options)&&q.options.length>=2).map(q=>({q:q.prompt,opts:q.options,ans:Math.max(0,Math.min(q.options.length-1,Number(q.answer_index)||0)),explanation:q.explanation||'',type:q.type||'mcq'}));
      if(!questions.length)throw new Error('The AI did not return valid questions. Try a smaller question count or a more text-readable source.');
      let quizId=null;window.currentGeneratedQuestionIds=[];
      try{quizId=await window.saveLucidQuiz({resourceId:context.source_resource_ids.length===1?context.source_resource_ids[0]:null,resourceIds:context.source_resource_ids,catalogueId:context.catalogue_id,sourceTitle:context.source_titles.join(', '),format:'mcq',difficulty,coverage:'selected_sources',instructions,questions:questions.map(q=>({prompt:q.q,options:q.opts,answer_index:q.ans,explanation:q.explanation,type:q.type}))});}
      catch(saveError){console.warn('Quiz generated but could not be saved:',saveError.message);}
      quizBank.length=0;quizBank.push(...questions);currentQuizIdx=0;state.quizCorrect=0;state.quizTotal=0;
      window.currentQuizAttemptId=null;window.currentGeneratedQuizId=quizId;window.currentQuizSourceId=context.source_resource_ids[0]||null;window.currentQuizSourceIds=context.source_resource_ids;window.currentQuizCatalogueId=context.catalogue_id;
      const label=document.getElementById('quizSourceLabel');if(label)label.textContent='Sources: '+context.source_titles.join(', ');
      const diff=document.getElementById('quizDifficultyTag');if(diff)diff.textContent='Difficulty: '+difficulty;
      loadQuiz(0);close();openPage('practice');showToast(questions.length+' questions generated from your selected sources.','✦');
    }catch(error){status.textContent='Generation failed: '+error.message;btn.disabled=false;btn.textContent='Try again →';}
  };
};
window.generateFlashcards = async function(){
  const selection=await window.openLucidPracticeSourcePicker();if(!selection)return;
  showToast('Preparing flashcards from selected PDFs…','✦');
  try{
    const context=await window.collectLucidPracticeContext(selection);
    const data=await window.callLearningEngine('flashcards','Create concise active-recall flashcards from the supplied sources only. Avoid duplicate cards. Return clear fronts and accurate backs.',{...context,card_count:15});
    const cards=(data.result?.cards||[]).filter(x=>x.front&&x.back);
    if(!cards.length)throw new Error('No valid flashcards were returned.');
    const now=new Date().toISOString();
    const rows=cards.map(x=>({user_id:lucidSession.user.id,resource_id:context.source_resource_ids.length===1?context.source_resource_ids[0]:null,catalogue_id:context.catalogue_id,front:String(x.front).slice(0,2000),back:String(x.back).slice(0,5000),concept_key:x.concept_key|| (context.source_resource_ids.length>1?'source_set:'+context.source_resource_ids.join(','):null),due_at:now,stability:1,repetitions:0,updated_at:now}));
    const saved=await lucidSupabase.from('practice_cards').insert(rows).select('id,front,back,resource_id,catalogue_id,due_at,stability,repetitions');
    if(saved.error)throw saved.error;
    state.flashcardRecords=saved.data||[];state.flashcards=state.flashcardRecords.map(x=>({id:x.id,q:x.front,a:x.back,repetitions:x.repetitions,stability:x.stability}));state.flashcardIndex=0;
    document.getElementById('flashFront').textContent=state.flashcards[0].q;document.getElementById('flashBack').textContent=state.flashcards[0].a;document.getElementById('cardProgress').textContent='Card 1 of '+state.flashcards.length+' · Click to flip';
    document.getElementById('flashcard').classList.remove('flipped');showToast(state.flashcards.length+' flashcards generated and saved.','✦');
  }catch(error){showToast('Flashcard generation failed: '+error.message,'⚠');}
};
window.rateCard = async function(rating){
  const card=state.flashcards?.[state.flashcardIndex];if(!card){showToast('Generate flashcards from a source first.','⚠');return;}
  try{
    const days=rating==='hard'?0.25:rating==='okay'?1:4,repetitions=(Number(card.repetitions)||0)+(rating==='hard'?0:1),stability=Math.max(1,Number(card.stability)||1)*(rating==='hard'?1.1:rating==='okay'?1.6:2.4),dueAt=new Date(Date.now()+days*86400000).toISOString();
    const {error}=await lucidSupabase.from('practice_cards').update({repetitions,stability,due_at:dueAt,updated_at:new Date().toISOString()}).eq('id',card.id).eq('user_id',lucidSession.user.id);
    if(error)throw error;
    if(rating==='easy'){state.xp+=5;updateXP();}
    showToast('Card scheduled for review in '+(days<1?'6 hours':days+' days')+'.','✓');
    state.flashcardIndex=(state.flashcardIndex+1)%state.flashcards.length;
    document.getElementById('flashcard').classList.remove('flipped');
    const next=state.flashcards[state.flashcardIndex];document.getElementById('flashFront').textContent=next.q;document.getElementById('flashBack').textContent=next.a;document.getElementById('cardProgress').textContent='Card '+(state.flashcardIndex+1)+' of '+state.flashcards.length+' · Click to flip';
  }catch(error){showToast('Could not save card rating: '+error.message,'⚠');}
};
window.newOralQuestion = async function(){
  const selection=await window.openLucidPracticeSourcePicker();if(!selection)return;
  const el=document.getElementById('oralQuestion');el.textContent='Generating a question from your sources…';
  try{
    const context=await window.collectLucidPracticeContext(selection);
    const data=await window.callLearningEngine('teach','Generate one challenging but fair open-ended oral-recall question from the supplied source material. Put the question in checkpoints[0].question. Do not use outside facts.',context);
    const question=data.result?.checkpoints?.[0]?.question;
    if(!question)throw new Error('No source-grounded question was returned.');
    state.currentOralContext=context;state.currentOralQuestion=question;el.textContent=question;document.getElementById('oralAnswer').value='';document.getElementById('oralResult').style.display='none';
  }catch(error){el.textContent='Could not generate a question: '+error.message;}
};
window.evaluateOral = async function(){
  const question=state.currentOralQuestion||document.getElementById('oralQuestion').textContent,answer=document.getElementById('oralAnswer').value.trim(),resultEl=document.getElementById('oralResult');
  if(!state.currentOralContext){showToast('Generate a question from selected sources first.','⚠');return;}
  if(!answer){showToast('Write your explanation first.','⚠');return;}
  resultEl.style.display='block';resultEl.textContent='Evaluating your answer against the selected source…';
  try{
    const data=await window.callLearningEngine('evaluate_recall','Evaluate the learner response strictly against the supplied source. Identify missing concepts and unsupported claims. Question: '+question+' Learner response: '+answer,{...state.currentOralContext,question,answer});
    const result=data.result||{};resultEl.textContent=window.formatLearningResult(result);
    await lucidSupabase.rpc('track_learning_event',{p_event_type:'oral_recall_evaluated',p_catalogue_id:state.currentOralContext.catalogue_id||null,p_resource_id:state.currentOralContext.source_resource_ids?.[0]||null,p_session_id:null,p_payload:{question,answer,score:result.score,coverage:result.coverage,accuracy:result.accuracy,clarity:result.clarity,missing:result.missing||[]}});
    showToast('Oral recall evaluated and recorded.','🎙');
    try{await window.loadLucidLearningProfile();}catch(_){}
  }catch(error){resultEl.textContent='Evaluation failed: '+error.message;showToast('Oral recall evaluation failed: '+error.message,'⚠');}
};
window.practiceWeak = async function(topic){
  const selection=await window.openLucidPracticeSourcePicker();if(!selection)return;
  try{
    const context=await window.collectLucidPracticeContext(selection),profile=await window.loadLucidLearningProfile();
    const data=await window.callLearningEngine('quiz','Create five remedial multiple-choice questions about the learner weak area "'+topic+'". Use only the selected source material and explain each answer.',{...context,learner_evidence:profile,topic,question_count:5,question_format:'mcq'});
    const questions=(data.result?.questions||[]).filter(q=>q.prompt&&Array.isArray(q.options)&&q.options.length>=2).map(q=>({q:q.prompt,opts:q.options,ans:Number(q.answer_index)||0,explanation:q.explanation||''}));
    if(!questions.length)throw new Error('No source-grounded remedial questions were returned.');
    let quizId=null;window.currentGeneratedQuestionIds=[];
    try{quizId=await window.saveLucidQuiz({resourceId:context.source_resource_ids.length===1?context.source_resource_ids[0]:null,resourceIds:context.source_resource_ids,catalogueId:context.catalogue_id,sourceTitle:context.source_titles.join(', '),format:'mcq',difficulty:'Balanced',coverage:'weak_area',instructions:'Remedial practice for '+topic,questions:questions.map(q=>({prompt:q.q,options:q.opts,answer_index:q.ans,explanation:q.explanation}))});}catch(saveError){console.warn('Remedial quiz history could not be saved:',saveError.message);}
    quizBank.length=0;quizBank.push(...questions);currentQuizIdx=0;state.quizCorrect=0;state.quizTotal=0;window.currentQuizAttemptId=null;window.currentGeneratedQuizId=quizId;window.currentQuizSourceId=context.source_resource_ids[0]||null;window.currentQuizCatalogueId=context.catalogue_id;window.currentGeneratedQuestionIds=window.currentGeneratedQuestionIds||[];const sourceLabel=document.getElementById('quizSourceLabel');if(sourceLabel)sourceLabel.textContent='Weak area: '+topic+' · '+context.source_titles.join(', ');loadQuiz(0);openPage('practice');showToast('Remedial practice generated from selected sources for '+topic+'.','✦');
  }catch(error){showToast('Weak-area practice failed: '+error.message,'⚠');}
};
window.renderLucidWeakAreas = function(profile){
  const list=document.getElementById('weakAreaList');if(!list)return;
  const items=(profile?.weakConcepts||[]).filter(x=>Number.isFinite(Number(x.mastery))).sort((a,b)=>a.mastery-b.mastery);
  list.innerHTML='';
  if(!items.length){list.innerHTML='<p class="muted small-text">No measured concept mastery is available yet. Complete a source-based quiz or oral recall to build this list.</p>';return;}
  items.slice(0,10).forEach(item=>{
    const row=document.createElement('div');row.className='goal-item';
    const body=document.createElement('div');body.style.flex='1';
    const title=document.createElement('strong');title.textContent=item.name;
    const meta=document.createElement('div');meta.className='muted small-text';meta.textContent='Recorded mastery: '+Math.round(item.mastery)+'% · Recall '+Math.round(item.recall||0)+'% · Application '+Math.round(item.application||0)+'%';
    const track=document.createElement('div');track.className='progress-track';track.style.marginTop='6px';
    const fill=document.createElement('span');fill.className='progress-fill rose';fill.style.width=Math.max(0,Math.min(100,item.mastery))+'%';track.appendChild(fill);body.append(title,meta,track);
    const button=document.createElement('button');button.className='secondary-button btn-sm';button.textContent='Practice';button.onclick=()=>window.practiceWeak(item.name);
    row.append(body,button);list.appendChild(row);
  });
};

window.askGuide = async function(){const q=document.getElementById('aiQuestion').value.trim();const el=document.getElementById('aiAnswer');if(!q){el.style.display='block';el.textContent='Ask a question first.';return;}el.style.display='block';el.textContent='Thinking…';const selected=(state.selectedText||'').trim();const context=state.currentVideoContext?'Current video: '+state.currentVideoContext.title+'. Use only the saved transcript provided as video context.':'Current resource: '+(state.currentResourceTitle||'Reading Room document')+'. '+(selected?'SELECTED PASSAGE (answer specifically about this text):\n'+selected:'No passage is currently selected. Use the current resource and notes only.')+'\nSaved annotations: '+state.annotations.slice(-5).join('; ');const answer=await window.callAIGuide('Learning context:\n'+context+'\n\nStudent question: '+q,systemInstructions[state.coachMode]||systemInstructions.Gentle);el.innerHTML='<strong>Guide ('+escapeHTML(state.coachMode)+'):</strong><br>'+escapeHTML(answer).replace(/\n/g,'<br>');};
window.quickAIModal = async function(prompt){const el=document.getElementById('aiAnswer');document.getElementById('aiQuestion').value=prompt;el.style.display='block';el.textContent='Thinking…';const selected=(state.selectedText||'').trim();const context=state.currentVideoContext?'Current video: '+state.currentVideoContext.title+'. Use only its saved transcript.':(selected?'Selected passage (use this exact text as the subject):\n'+selected+'\n\n':'Current resource and saved annotations: '+(state.currentResourceTitle||'Reading Room document')+'; '+state.annotations.slice(-5).join('; ')+'\n\n');const answer=await window.callAIGuide(context+'Student request: '+prompt,systemInstructions[state.coachMode]||systemInstructions.Gentle);el.innerHTML='<strong>Guide:</strong><br>'+escapeHTML(answer).replace(/\n/g,'<br>');};
window.sendAIChatWithPrompt = async function(prompt){const chat=document.getElementById('aiChat');const empty=document.getElementById('aiChatEmpty');if(empty)empty.style.display='none';state.chatMessages.push({role:'user',text:prompt});const userEl=document.createElement('div');userEl.className='ai-msg user';userEl.textContent=prompt;chat.appendChild(userEl);const thinking=document.createElement('div');thinking.className='ai-msg bot thinking';thinking.textContent='✦ Thinking…';chat.appendChild(thinking);chat.scrollTop=chat.scrollHeight;document.getElementById('chatCount').textContent=state.chatMessages.length;const selected=(state.selectedText||'').trim();const context=state.currentVideoContext?'Current video: '+state.currentVideoContext.title+'. Use only the selected video transcript; do not substitute PDF content.':'Learner: '+state.preferences.name+'. Current study: '+(state.currentResourceTitle||'Reading Room document')+'. '+(selected?'SELECTED PASSAGE — answer the request specifically about this exact text:\\n'+selected:'No passage is selected.')+'\\nRecent annotations: '+state.annotations.slice(-5).join('; ')+'. Coach mode: '+state.coachMode+'.';let answer;try{answer=await window.callLucidAgent('Learning context:\\n'+context+'\\n\\nCoaching style: '+(systemInstructions[state.coachMode]||systemInstructions.Gentle)+'\\n\\nStudent: '+prompt);}catch(error){answer='Lucid Agent error: '+error.message;}thinking.className='ai-msg bot';thinking.style.whiteSpace='pre-wrap';thinking.textContent=answer;state.chatMessages.push({role:'bot',text:answer});chat.scrollTop=chat.scrollHeight;document.getElementById('chatCount').textContent=state.chatMessages.length;saveState();};
// Video classroom: persist imports, select the exact video, save transcript context and record playback per resource.
window.currentLucidPlaylistResourceId=null;
window.currentLucidVideoResourceId=null;
window.currentLucidVideoSessionId=null;
window.currentLucidVideoContext=null;
window.currentLucidVideoMetadata={};
window.currentLucidVideoNotes=[];
window.lucidVideoPlayer=null;
window.lucidVideoPersistTimer=null;
window.lucidVideoLastTick=null;
window.lucidVideoActiveSeconds=0;
window.lucidVideoDuration=0;
window.lucidVideoPlaylistItems=[];
window.lucidYTApiPromise=null;
window.formatLucidDuration=function(seconds){
  const s=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;
  return h?h+'h '+m+'m':m+'m '+r+'s';
};
window.loadLucidYouTubeApi=function(){
  if(window.YT&&window.YT.Player)return Promise.resolve();
  if(window.lucidYTApiPromise)return window.lucidYTApiPromise;
  window.lucidYTApiPromise=new Promise(resolve=>{
    const previous=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=function(){if(typeof previous==='function')previous();resolve();};
    if(!document.querySelector('script[data-lucid-youtube-api]')){
      const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.dataset.lucidYoutubeApi='true';document.head.appendChild(script);
    }
  });
  return window.lucidYTApiPromise;
};
window.persistLucidYouTubeImport=async function(imported,url){
  if(!lucidSession?.user)throw new Error('Sign in before importing videos.');
  if(imported.type==='playlist'&&!imported.api_key_configured)throw new Error('Playlist import needs a configured YouTube Data API key. No placeholder playlist was saved.');
  const owner=lucidSession.user.id,catalogueId=state.selectedCatalogueId||document.getElementById('uploadCatalogue')?.value||null;
  const saveResource=async(row)=>{
    const existing=await lucidSupabase.from('lucid_resources').select('id').eq('owner_id',owner).eq('source_url',row.source_url).limit(1).maybeSingle();
    if(existing.error&&existing.error.code!=='PGRST116')throw existing.error;
    if(existing.data?.id){
      const updated=await lucidSupabase.from('lucid_resources').update({...row,updated_at:new Date().toISOString()}).eq('id',existing.data.id).eq('owner_id',owner).select('id').single();
      if(updated.error)throw updated.error;return updated.data.id;
    }
    const inserted=await lucidSupabase.from('lucid_resources').insert(row).select('id').single();
    if(inserted.error)throw inserted.error;return inserted.data.id;
  };
  const saveVideoRecord=async(row)=>{
    const existing=await lucidSupabase.from('resource_videos').select('id,transcript,metadata').eq('resource_id',row.resource_id).limit(1).maybeSingle();
    if(existing.error)throw existing.error;
    if(existing.data?.id){
      const updated=await lucidSupabase.from('resource_videos').update({...row,transcript:row.transcript||existing.data.transcript||null,metadata:{...(existing.data.metadata||{}),...(row.metadata||{})}}).eq('id',existing.data.id);
      if(updated.error)throw updated.error;
    }else{
      const inserted=await lucidSupabase.from('resource_videos').insert(row);
      if(inserted.error)throw inserted.error;
    }
  };
  let playlistId=null,items=[];
  if(imported.type==='playlist'){
    const playlist=imported.playlist||{},playlistUrl=url;
    playlistId=await saveResource({owner_id:owner,type:'playlist',title:playlist.title||'YouTube Playlist',source_url:playlistUrl,mime_type:'text/html',metadata:{youtube_playlist_id:imported.playlist_id,channel_title:playlist.channel_title||null,thumbnail:playlist.thumbnail||null,item_count:Number(playlist.item_count||imported.items?.length||0),items:[]}});
    for(const item of imported.items||[]){
      const videoUrl='https://www.youtube.com/watch?v='+encodeURIComponent(item.video_id);
      const resourceId=await saveResource({owner_id:owner,type:'video',title:item.title||'YouTube video',source_url:videoUrl,mime_type:'text/html',metadata:{youtube_video_id:item.video_id,youtube_playlist_id:imported.playlist_id,channel_title:item.channel_title||null,thumbnail:item.thumbnail||null,duration_seconds:Number(item.duration_seconds)||0,playlist_index:Number(item.playlist_index)||0}});
      await saveVideoRecord({resource_id:resourceId,youtube_video_id:item.video_id,youtube_playlist_id:imported.playlist_id,duration_seconds:Number(item.duration_seconds)||0,transcript:'',metadata:{source_url:videoUrl,playlist_resource_id:playlistId,thumbnail:item.thumbnail||null,channel_title:item.channel_title||null,playlist_index:Number(item.playlist_index)||0}});
      items.push({...item,resource_id:resourceId});
    }
    const parentUpdate=await lucidSupabase.from('lucid_resources').update({metadata:{youtube_playlist_id:imported.playlist_id,channel_title:playlist.channel_title||null,thumbnail:playlist.thumbnail||null,item_count:Number(playlist.item_count||items.length),items}}).eq('id',playlistId).eq('owner_id',owner);
    if(parentUpdate.error)throw parentUpdate.error;
    if(catalogueId){
      const ids=[playlistId,...items.map(x=>x.resource_id)];
      const existing=await lucidSupabase.from('catalogue_resources').select('resource_id').eq('catalogue_id',catalogueId).in('resource_id',ids);
      if(existing.error)throw existing.error;
      const have=new Set((existing.data||[]).map(x=>x.resource_id));
      const missing=ids.filter(id=>!have.has(id));
      if(missing.length){const linked=await lucidSupabase.from('catalogue_resources').insert(missing.map((id,index)=>({catalogue_id:catalogueId,resource_id:id,order_index:index,status:'active'})));if(linked.error)throw linked.error;}
    }
  }else if(imported.type==='video'&&imported.item?.video_id){
    const item=imported.item,videoUrl='https://www.youtube.com/watch?v='+encodeURIComponent(item.video_id);
    const resourceId=await saveResource({owner_id:owner,type:'video',title:item.title||'YouTube video',source_url:videoUrl,mime_type:'text/html',metadata:{youtube_video_id:item.video_id,channel_title:item.channel_title||null,thumbnail:item.thumbnail||null,duration_seconds:Number(item.duration_seconds)||0}});
    await saveVideoRecord({resource_id:resourceId,youtube_video_id:item.video_id,youtube_playlist_id:null,duration_seconds:Number(item.duration_seconds)||0,transcript:'',metadata:{source_url:videoUrl,thumbnail:item.thumbnail||null,channel_title:item.channel_title||null}});
    if(catalogueId){
      const existing=await lucidSupabase.from('catalogue_resources').select('resource_id').eq('catalogue_id',catalogueId).eq('resource_id',resourceId).maybeSingle();
      if(!existing.data){const linked=await lucidSupabase.from('catalogue_resources').insert({catalogue_id:catalogueId,resource_id:resourceId,order_index:0,status:'active'});if(linked.error)throw linked.error;}
    }
    items=[{...item,resource_id:resourceId}];
  }else throw new Error('The YouTube import did not return a supported video or playlist.');
  await window.loadLucidCatalogues();
  return {playlistResourceId:playlistId,items};
};
window.loadLucidVideoLibrary=async function(preferredPlaylistId){
  if(!lucidSession?.user)return [];
  const owner=lucidSession.user.id;
  const {data:resources,error}=await lucidSupabase.from('lucid_resources').select('id,title,type,source_url,metadata,created_at').eq('owner_id',owner).in('type',['video','playlist']).order('created_at',{ascending:false});
  if(error)throw error;
  const videos=(resources||[]).filter(x=>x.type==='video'),playlists=(resources||[]).filter(x=>x.type==='playlist'),videoIds=videos.map(x=>x.id);
  let videoRows=[],sessions=[];
  if(videoIds.length){
    const vr=await lucidSupabase.from('resource_videos').select('resource_id,youtube_video_id,youtube_playlist_id,duration_seconds,transcript,metadata').in('resource_id',videoIds);
    if(vr.error)throw vr.error;videoRows=vr.data||[];
    const sr=await lucidSupabase.from('video_sessions').select('id,resource_id,active_seconds,last_timestamp_seconds,completed,started_at').eq('user_id',owner).in('resource_id',videoIds);
    if(sr.error)throw sr.error;sessions=sr.data||[];
  }
  const videoById=new Map(videos.map(x=>[x.id,x])),videoMeta=new Map(videoRows.map(x=>[x.resource_id,x]));
  const sessionById=new Map();
  sessions.forEach(s=>{const item=sessionById.get(s.resource_id)||{active:0,completed:false,last:0};item.active+=Number(s.active_seconds)||0;item.completed=item.completed||!!s.completed;item.last=Math.max(item.last,Number(s.last_timestamp_seconds)||0);sessionById.set(s.resource_id,item);});
  const chosen=preferredPlaylistId==='__standalone__'?null:(playlists.find(x=>x.id===preferredPlaylistId)||playlists[0]||null);
  let items=[];
  if(chosen){
    items=(chosen.metadata?.items||[]).map(item=>({...item,resource:videoById.get(item.resource_id),video:videoMeta.get(item.resource_id),progress:sessionById.get(item.resource_id)||{active:0,completed:false,last:0}})).filter(item=>item.resource);
  }else{
    items=videos.map(resource=>({resource_id:resource.id,title:resource.title,video_id:videoMeta.get(resource.id)?.youtube_video_id||resource.metadata?.youtube_video_id,duration_seconds:videoMeta.get(resource.id)?.duration_seconds||resource.metadata?.duration_seconds||0,resource,video:videoMeta.get(resource.id),progress:sessionById.get(resource.id)||{active:0,completed:false,last:0}}));
  }
  window.currentLucidPlaylistResourceId=chosen?.id||null;window.lucidVideoPlaylistItems=items;
  const title=document.getElementById('videoPlaylistTitle');if(title)title.textContent=chosen?chosen.title:'Your imported videos';
  const count=document.getElementById('videoPlaylistCount');if(count)count.textContent=items.length;
  const list=document.getElementById('videoPlaylistList');
  if(list){
    list.innerHTML='';
    if(!items.length)list.innerHTML='<p class="muted small-text">No videos found. Import a video or playlist above.</p>';
    items.forEach((item,index)=>{
      const button=document.createElement('button');button.type='button';button.className='secondary-button btn-sm';button.style.cssText='text-align:left;display:flex;justify-content:space-between;gap:8px;align-items:center;';
      const titleText=document.createElement('span');titleText.textContent=(index+1)+'. '+(item.title||item.resource?.title||'Video');
      const meta=document.createElement('span');meta.className='muted';meta.textContent=item.progress.completed?'✓':window.formatLucidDuration(item.progress.active);
      button.append(titleText,meta);button.onclick=()=>window.selectLucidVideo(item.resource_id);list.appendChild(button);
    });
  }
  const completed=items.filter(x=>x.progress.completed).length,watched=items.reduce((s,x)=>s+(Number(x.progress.active)||0),0),pct=items.length?Math.round(completed/items.length*100):0;
  const watchedEl=document.getElementById('videoWatchedTime');if(watchedEl)watchedEl.textContent=window.formatLucidDuration(watched);
  const label=document.getElementById('videoProgressLabel');if(label)label.textContent=completed+' of '+items.length+' completed';
  const percent=document.getElementById('videoProgressPercent');if(percent)percent.textContent=pct+'%';
  const bar=document.getElementById('videoProgressBar');if(bar)bar.style.width=pct+'%';
  return items;
};
window.selectLucidVideo=async function(resourceId){
  if(!lucidSession?.user||!resourceId)throw new Error('Choose a saved video first.');
  await window.persistLucidVideoProgress(true);
  const [resourceResult,videoResult]=await Promise.all([
    lucidSupabase.from('lucid_resources').select('id,title,source_url,metadata').eq('id',resourceId).eq('owner_id',lucidSession.user.id).single(),
    lucidSupabase.from('resource_videos').select('youtube_video_id,youtube_playlist_id,duration_seconds,transcript,metadata').eq('resource_id',resourceId).single()
  ]);
  if(resourceResult.error)throw resourceResult.error;if(videoResult.error)throw videoResult.error;
  const resource=resourceResult.data,video=videoResult.data;
  window.currentLucidVideoResourceId=resourceId;state.currentVideoResourceId=resourceId;
  window.currentLucidVideoMetadata=video.metadata||{};window.currentLucidVideoNotes=Array.isArray(video.metadata?.notes)?video.metadata.notes:[];
  state.currentVideoContext={resource_id:resourceId,title:resource.title,transcript:video.transcript||''};
  const title=document.getElementById('videoCurrentTitle');if(title)title.textContent=resource.title;
  const meta=document.getElementById('videoCurrentMeta');if(meta)meta.textContent=(resource.metadata?.channel_title||video.metadata?.channel_title||'YouTube')+' · '+window.formatLucidDuration(video.duration_seconds||0);
  const transcript=document.getElementById('videoTranscriptInput');if(transcript)transcript.value=video.transcript||'';
  const status=document.getElementById('videoTranscriptStatus');if(status)status.textContent=video.transcript?'Transcript saved':'Transcript unavailable';
  const saveStatus=document.getElementById('videoTranscriptSaveStatus');if(saveStatus)saveStatus.textContent=video.transcript?'Saved transcript · '+video.transcript.length.toLocaleString()+' characters':'No transcript saved for this video.';
  window.renderLucidVideoNotes();
  const videoId=video.youtube_video_id||resource.metadata?.youtube_video_id;
  if(!videoId)throw new Error('This saved resource has no YouTube video ID.');
  await window.startLucidVideoPlayer(videoId);
  const response=document.getElementById('videoAiResponse');if(response){response.style.display='block';response.textContent=video.transcript?'This AI assistant is grounded in the selected video transcript.':'No transcript is saved for this video. Paste its captions below before asking video-specific questions.';}
  return resource;
};
window.startLucidVideoPlayer=async function(videoId){
  await window.loadLucidYouTubeApi();
  const wrapper=document.getElementById('youtubePlayerWrapper'),host=document.getElementById('videoPlayerHost'),mount=document.getElementById('ytPlayerMount');
  if(wrapper)wrapper.style.display='none';if(host)host.style.display='block';
  if(window.lucidVideoPlayer){try{window.lucidVideoPlayer.destroy();}catch(_){}window.lucidVideoPlayer=null;}
  if(mount)mount.innerHTML='';
  const parent=document.getElementById('videoPlayerHost');if(parent)parent.innerHTML='<div id="ytPlayerMount" style="width:100%;height:100%;"></div>';
  window.lucidVideoPlayer=new YT.Player('ytPlayerMount',{height:'100%',width:'100%',videoId,playerVars:{rel:0,modestbranding:1,playsinline:1},events:{
    onReady:event=>{window.lucidVideoDuration=event.target.getDuration()||0;},
    onStateChange:event=>{
      if(event.data===YT.PlayerState.PLAYING){window.startLucidVideoSession();if(window.lucidVideoPersistTimer)clearInterval(window.lucidVideoPersistTimer);window.lucidVideoPersistTimer=setInterval(()=>window.persistLucidVideoProgress(false),15000);}
      else if(event.data===YT.PlayerState.PAUSED||event.data===YT.PlayerState.ENDED){if(window.lucidVideoPersistTimer)clearInterval(window.lucidVideoPersistTimer);window.lucidVideoPersistTimer=null;window.persistLucidVideoProgress(event.data===YT.PlayerState.ENDED);}
    }
  }});
};
window.startLucidVideoSession=async function(){
  if(!lucidSession?.user||!window.currentLucidVideoResourceId||window.currentLucidVideoSessionId)return;
  const current=window.lucidVideoPlayer?.getCurrentTime?.()||0;
  const {data,error}=await lucidSupabase.from('video_sessions').insert({user_id:lucidSession.user.id,resource_id:window.currentLucidVideoResourceId,catalogue_id:state.selectedCatalogueId||null,active_seconds:0,last_timestamp_seconds:current,playback_speed:window.lucidVideoPlayer?.getPlaybackRate?.()||1,completed:false,result:{source:'youtube_iframe_player'}}).select('id').single();
  if(error){console.warn('Could not start video session:',error.message);return;}
  window.currentLucidVideoSessionId=data.id;window.lucidVideoActiveSeconds=0;window.lucidVideoLastTick=Date.now();
};
window.persistLucidVideoProgress=async function(endSession){
  if(!lucidSession?.user||!window.currentLucidVideoSessionId||!window.lucidVideoPlayer)return;
  const now=Date.now(),current=Number(window.lucidVideoPlayer.getCurrentTime?.()||0),duration=Number(window.lucidVideoPlayer.getDuration?.()||window.lucidVideoDuration||0),playing=window.lucidVideoPlayer.getPlayerState?.()===1;
  const elapsed=playing&&window.lucidVideoLastTick?Math.max(0,Math.min(20,Math.round((now-window.lucidVideoLastTick)/1000))):0;
  window.lucidVideoActiveSeconds+=elapsed;window.lucidVideoLastTick=now;
  const completed=duration>0&&current>=duration*.9;
  const patch={active_seconds:window.lucidVideoActiveSeconds,last_timestamp_seconds:current,playback_speed:window.lucidVideoPlayer.getPlaybackRate?.()||1,completed,ended_at:endSession||completed?new Date().toISOString():null};
  const {error}=await lucidSupabase.from('video_sessions').update(patch).eq('id',window.currentLucidVideoSessionId).eq('user_id',lucidSession.user.id);
  if(error)console.warn('Could not persist video progress:',error.message);
  if(endSession||completed){window.currentLucidVideoSessionId=null;window.lucidVideoLastTick=null;try{await window.loadLucidVideoLibrary(window.currentLucidPlaylistResourceId);}catch(_){}}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)window.persistLucidVideoProgress(false);});
window.saveCurrentVideoTranscript=async function(){
  const transcript=document.getElementById('videoTranscriptInput').value.trim();
  if(!window.currentLucidVideoResourceId){showToast('Select a saved video first.','⚠');return;}
  if(!transcript){showToast('Paste the transcript before saving.','⚠');return;}
  const {error}=await lucidSupabase.from('resource_videos').update({transcript}).eq('resource_id',window.currentLucidVideoResourceId);
  if(error){showToast('Transcript save failed: '+error.message,'⚠');return;}
  state.currentVideoContext={...state.currentVideoContext,transcript};
  document.getElementById('videoTranscriptStatus').textContent='Transcript saved';
  document.getElementById('videoTranscriptSaveStatus').textContent='Saved transcript · '+transcript.length.toLocaleString()+' characters';
  showToast('Transcript saved to this video.','✓');
};
window.askAboutCurrentVideo=async function(prompt){
  const output=document.getElementById('videoAiResponse');if(output){output.style.display='block';output.textContent='Preparing video-specific answer…';}
  if(!state.currentVideoContext?.resource_id){if(output)output.textContent='Select a video first.';return;}
  if(!String(state.currentVideoContext.transcript||'').trim()){if(output)output.textContent='This video has no saved transcript. Paste its captions in the Transcript panel and save them first. Lucid will not invent what the video says.';return;}
  try{
    const answer=await window.callAIGuide(prompt,state.coachMode||'Gentle');
    if(output)output.textContent=answer;
  }catch(error){if(output)output.textContent='Video AI failed: '+error.message;}
};
window.generateVideoQuiz=async function(){
  if(!state.currentVideoContext?.resource_id){showToast('Select a video first.','⚠');return;}
  if(!String(state.currentVideoContext.transcript||'').trim()){showToast('Save the selected video transcript before generating a quiz.','⚠');return;}
  try{
    const data=await window.callLearningEngine('quiz','Create five multiple-choice questions using only this video transcript. Include explanations.',{video_title:state.currentVideoContext.title,video_transcript:state.currentVideoContext.transcript,question_count:5,question_format:'mcq'});
    const qs=(data.result?.questions||[]).filter(q=>q.prompt&&Array.isArray(q.options)&&q.options.length>=2).map(q=>({q:q.prompt,opts:q.options,ans:Number(q.answer_index)||0,explanation:q.explanation||''}));
    if(!qs.length)throw new Error('No valid questions were returned from the transcript.');
    let quizId=null;window.currentGeneratedQuestionIds=[];try{quizId=await window.saveLucidQuiz({resourceId:state.currentVideoContext.resource_id,sourceTitle:state.currentVideoContext.title,format:'mcq',difficulty:'Balanced',coverage:'video_transcript',questions:qs.map(q=>({prompt:q.q,options:q.opts,answer_index:q.ans,explanation:q.explanation}))});}catch(e){console.warn('Video quiz history save failed:',e.message);}
    quizBank.length=0;quizBank.push(...qs);currentQuizIdx=0;state.quizCorrect=0;state.quizTotal=0;window.currentGeneratedQuizId=quizId;window.currentQuizSourceId=state.currentVideoContext.resource_id;window.currentQuizSourceIds=[state.currentVideoContext.resource_id];window.currentQuizCatalogueId=null;loadQuiz(0);openPage('practice');showToast('Quiz generated from the selected video transcript.','✦');
  }catch(error){showToast('Video quiz failed: '+error.message,'⚠');}
};
window.renderLucidVideoNotes=function(){
  const list=document.getElementById('videoNoteList'),count=document.getElementById('videoNoteCount');if(!list)return;
  list.innerHTML='';if(count)count.textContent=window.currentLucidVideoNotes.length;
  if(!window.currentLucidVideoNotes.length){list.innerHTML='<p class="muted small-text">No notes saved for this video yet.</p>';return;}
  window.currentLucidVideoNotes.forEach(note=>{const row=document.createElement('div');row.className='note blue';const time=document.createElement('strong');time.textContent=window.formatLucidDuration(note.timestamp);const text=document.createElement('span');text.textContent=' — '+note.text;row.append(time,text);list.appendChild(row);});
};
window.addTimestampNote=async function(){
  if(!window.currentLucidVideoResourceId||!window.lucidVideoPlayer){showToast('Select a video before adding a timestamp note.','⚠');return;}
  const input=document.getElementById('videoNoteInput'),text=input.value.trim();if(!text){showToast('Enter a note first.','⚠');return;}
  const note={timestamp:Math.floor(window.lucidVideoPlayer.getCurrentTime?.()||0),text,created_at:new Date().toISOString()};
  window.currentLucidVideoNotes.push(note);
  const metadata={...(window.currentLucidVideoMetadata||{}),notes:window.currentLucidVideoNotes};
  const {error}=await lucidSupabase.from('resource_videos').update({metadata}).eq('resource_id',window.currentLucidVideoResourceId);
  if(error){window.currentLucidVideoNotes.pop();showToast('Could not save timestamp note: '+error.message,'⚠');return;}
  window.currentLucidVideoMetadata=metadata;input.value='';window.renderLucidVideoNotes();showToast('Timestamp note saved.','✓');
};
window.videoSpeed=function(rate){if(!window.lucidVideoPlayer){showToast('Load a video first.','⚠');return;}window.lucidVideoPlayer.setPlaybackRate(Number(rate)||1);showToast('Playback speed set to '+rate+'×.','⚡');};
window.loadYoutubeURL=async function(url){
  const input=String(url||'').trim();if(!input){showToast('Paste a YouTube URL first.','⚠');return;}
  const status=document.getElementById('videoImportStatus');if(status)status.textContent='Checking the selected YouTube video or playlist…';
  try{
    const imported=await window.invokeLucidFunction('youtube-import',{url:input});
    const saved=await window.persistLucidYouTubeImport(imported,input);
    if(status)status.textContent='Imported and saved to your Library.';
    openPage('video');
    const items=await window.loadLucidVideoLibrary(saved.playlistResourceId||'__standalone__');
    const first=saved.items?.[0]?.resource_id||items[0]?.resource_id;
    if(first)await window.selectLucidVideo(first);
    const urlInput=document.getElementById('videoUrlInput');if(urlInput)urlInput.value='';
    showToast('YouTube content imported and saved.','▶');
  }catch(error){if(status)status.textContent='Import failed: '+error.message;showToast('YouTube import failed: '+error.message,'⚠');}
};
window.quickAI=async function(prompt){await window.askAboutCurrentVideo(prompt);};


window.recordLucidQuizAnswer = async function(answer){
  if(!lucidSession?.user||typeof lucidSupabase==='undefined')return false;
  const payload={question:String(answer.question||'').slice(0,2000),selected_option:String(answer.selectedOption||'').slice(0,1000),correct_option:String(answer.correctOption||'').slice(0,1000),is_correct:Boolean(answer.correct),quiz_index:Number(answer.quizIndex)||0,source:'practice_center'};
  if(answer.quizId){
    if(!window.currentQuizAttemptId){
      const {data,error}=await lucidSupabase.from('quiz_attempts').insert({quiz_id:answer.quizId,user_id:lucidSession.user.id,score:0,max_score:Number(answer.totalQuestions)||1,result:{source:'practice_center'}}).select('id').single();
      if(error)throw error;window.currentQuizAttemptId=data.id;
    }
    const questionId=window.currentGeneratedQuestionIds?.[Number(answer.quizIndex)];
    if(questionId){
      const {error}=await lucidSupabase.from('quiz_answers').insert({attempt_id:window.currentQuizAttemptId,question_id:questionId,answer:{selected_option:payload.selected_option},is_correct:payload.is_correct,feedback:String(answer.explanation||'')});
      if(error)throw error;
    }
    const completed=Number(answer.quizIndex)+1>=Number(answer.totalQuestions);
    const {error:updateError}=await lucidSupabase.from('quiz_attempts').update({score:Number(state.quizCorrect)||0,max_score:Number(answer.totalQuestions)||1,completed_at:completed?new Date().toISOString():null,result:{source:'practice_center',answered:Number(answer.quizIndex)+1}}).eq('id',window.currentQuizAttemptId).eq('user_id',lucidSession.user.id);
    if(updateError)throw updateError;
  }
  const sourceIds=Array.from(new Set((window.currentQuizSourceIds||[window.currentQuizSourceId||state.currentResourceId]).filter(Boolean)));
  const events=await Promise.all((sourceIds.length?sourceIds:[null]).map(resourceId=>lucidSupabase.rpc('track_learning_event',{p_event_type:'quiz_answered',p_catalogue_id:window.currentQuizCatalogueId||state.selectedCatalogueId||null,p_resource_id:resourceId,p_session_id:null,p_payload:payload})));
  const eventError=events.find(x=>x.error)?.error;if(eventError)throw eventError;
  if(answer.quizId&&Number(answer.quizIndex)+1>=Number(answer.totalQuestions)){
    try{await window.loadLucidAchievements();await window.loadLucidLearningProfile();}catch(refreshError){console.warn('Could not refresh quiz learning evidence:',refreshError.message);}
  }
  return true;
};

window.startLucidReadingSession = async function(){
  if(!lucidSession?.user)return null;
  const {data,error}=await lucidSupabase.from('reading_sessions').insert({
    user_id:lucidSession.user.id,resource_id:state.currentResourceId||null,
    planned_seconds:(Number(state.preferences.focusLength)||25)*60,
    pages_started:Math.max(0,Number(state.sessionPagesCompleted)||0),
    pages_completed:0,objective:state.currentResourceTitle||'Focused study session'
  }).select('id').single();
  if(error)throw error;return data.id;
};
window.finishLucidReadingSession = async function(input){
  if(!lucidSession?.user||!input?.id)return false;
  const {error}=await lucidSupabase.from('reading_sessions').update({
    ended_at:new Date().toISOString(),active_seconds:Math.max(0,Number(input.activeSeconds)||0),
    pages_completed:Math.max(0,Number(input.pagesCompleted)||0),
    result:{completed:Boolean(input.completed),source:'reader_focus_timer'}
  }).eq('id',input.id).eq('user_id',lucidSession.user.id);
  if(error)throw error;
  await lucidSupabase.rpc('track_learning_event',{p_event_type:input.completed?'focus_session_completed':'focus_session_stopped',p_catalogue_id:state.selectedCatalogueId||null,p_resource_id:state.currentResourceId||null,p_session_id:input.id,p_payload:{active_seconds:Math.max(0,Number(input.activeSeconds)||0),pages_completed:Math.max(0,Number(input.pagesCompleted)||0)}});
  window.currentLucidReadingSessionId=null;
  try{await window.loadLucidAchievements();await window.loadLucidLearningProfile();}catch(error){console.warn('Could not refresh learning achievements:',error.message);}
  return true;
};
window.syncLucidXP = async function(xp,level){
  if(!lucidSession?.user)return false;
  const {error}=await lucidSupabase.from('profiles').update({xp:Math.max(0,Math.floor(Number(xp)||0)),level:Math.max(1,Math.floor(Number(level)||1)),updated_at:new Date().toISOString()}).eq('id',lucidSession.user.id);
  if(error)throw error;return true;
};
window.loadLucidLeaderboard = async function(){
  const list=document.getElementById('lbList');if(!list||!lucidSession)return;
  list.innerHTML='<div class="muted small-text">Loading learner standings…</div>';
  const {data,error}=await lucidSupabase.from('profiles').select('id,display_name,avatar_url,level,xp').order('xp',{ascending:false}).limit(20);
  if(error){list.textContent='Leaderboard unavailable: '+error.message;return;}
  if(!data?.length){list.textContent='No learner profiles yet. Complete a learning activity to appear here.';return;}
  list.innerHTML='';
  data.forEach((p,index)=>{
    const row=document.createElement('div');row.className='leaderboard-row'+(p.id===lucidSession.user.id?' gold-row':'');
    const rank=document.createElement('div');rank.className='rank-num';rank.textContent=['🥇','🥈','🥉'][index]||String(index+1);
    const avatar=document.createElement('div');avatar.className='mini-avatar';
    if(p.avatar_url){const img=document.createElement('img');img.src=p.avatar_url;img.alt='';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';avatar.appendChild(img);}
    else avatar.textContent=(p.display_name||'L').trim().charAt(0).toUpperCase();
    const info=document.createElement('div');info.className='lb-info';
    const name=document.createElement('div');name.className='lb-name';name.textContent=(p.display_name||'Learner')+(p.id===lucidSession.user.id?' (You)':'');
    const sub=document.createElement('div');sub.className='lb-sub';sub.textContent='Level '+(p.level||1)+' · View learner profile';
    info.append(name,sub);
    const xp=document.createElement('div');xp.className='lb-xp';xp.textContent=(p.xp||0).toLocaleString()+' XP';
    row.append(rank,avatar,info,xp);row.style.cursor='pointer';row.title='Open learner profile';
    row.addEventListener('click',()=>window.showPublicLearnerProfile(p.id));list.appendChild(row);
  });
};
window.showPublicLearnerProfile = async function(id){
  const modal=document.getElementById('publicLearnerProfileModal');if(!modal)return;
  const {data,error}=await lucidSupabase.from('profiles').select('display_name,avatar_url,bio,level,xp').eq('id',id).maybeSingle();
  if(error||!data){showToast('Could not load this learner profile.','⚠');return;}
  const name=data.display_name||'Learner',photo=document.getElementById('publicLearnerAvatar'),fallback=document.getElementById('publicLearnerFallback');
  document.getElementById('publicLearnerName').textContent=name;
  document.getElementById('publicLearnerBio').textContent=data.bio||'This learner has not added a bio yet.';
  document.getElementById('publicLearnerLevel').textContent=data.level||1;
  document.getElementById('publicLearnerXP').textContent=(data.xp||0).toLocaleString();
  if(data.avatar_url){photo.src=data.avatar_url;photo.style.display='block';fallback.style.display='none';}
  else{photo.style.display='none';fallback.style.display='grid';fallback.textContent=name.trim().charAt(0).toUpperCase();}
  modal.style.display='flex';
};

window.initLucidAuth = async function(){try{const {data,error}=await lucidSupabase.auth.getSession();if(error)throw error;window.updateLucidAuthUI(data.session);lucidSupabase.auth.onAuthStateChange((_event,session)=>window.updateLucidAuthUI(session));}catch(error){lucidAuthMessage('Supabase connection error: '+(error?.message||'Unknown error'),'error');}};

/* Learner profile, administrator authorization and PDF-to-resource pipeline */
window.loadLucidProfile = async function(){
  if(!lucidSession||!lucidSession.user)return;
  const user=lucidSession.user;
  let result=await lucidSupabase.from('profiles').select('id,display_name,avatar_url,bio,level,xp,weekly_goal').eq('id',user.id).maybeSingle();
  if(result.error)throw result.error;
  let profile=result.data;
  const fallback=(user.user_metadata&&user.user_metadata.display_name)||(user.email&&user.email.split('@')[0])||'Learner';
  if(!profile){
    const ins=await lucidSupabase.from('profiles').insert({id:user.id,display_name:fallback});
    if(ins.error)throw ins.error;
    result=await lucidSupabase.from('profiles').select('id,display_name,avatar_url,bio,level,xp,weekly_goal').eq('id',user.id).single();
    if(result.error)throw result.error;profile=result.data;
  }else if(!profile.display_name){
    const upd=await lucidSupabase.from('profiles').update({display_name:fallback}).eq('id',user.id).select().single();
    if(upd.error)throw upd.error;profile=Object.assign({},profile,upd.data);
  }
  const name=profile.display_name||fallback;
  if(typeof state!=='undefined'){
    state.xp=Math.max(Number(state.xp)||0,Number(profile.xp)||0);
    state.level=Math.max(Number(state.level)||1,Number(profile.level)||1);
    if(typeof updateXP==='function')updateXP();
    if(window.syncLucidXP)await window.syncLucidXP(state.xp,state.level);
  }
  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  setText('profileDisplayHeading',name);setText('profileEmail',user.email||'');setText('sideProfileName',name);
  const ni=document.getElementById('profileNameInput');if(ni)ni.value=name;
  const bi=document.getElementById('profileBioInput');if(bi)bi.value=profile.bio||'';
  setText('profileLevel',profile.level==null?1:profile.level);setText('profileXP',profile.xp==null?0:profile.xp);setText('profileWeeklyGoal',profile.weekly_goal==null?200:profile.weekly_goal);
  const preview=document.getElementById('profilePhotoPreview'),fallbackEl=document.getElementById('profilePhotoFallback'),side=document.getElementById('sideAvatar');
  if(profile.avatar_url){
    if(preview){preview.src=profile.avatar_url;preview.style.display='block';}
    if(fallbackEl)fallbackEl.style.display='none';
    if(side){side.innerHTML='';const img=document.createElement('img');img.className='avatar-image';img.src=profile.avatar_url;img.alt='';side.appendChild(img);}
  }else{
    if(preview)preview.style.display='none';
    if(fallbackEl){fallbackEl.style.display='grid';fallbackEl.textContent=name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();}
    if(side)side.textContent=name.charAt(0).toUpperCase();
  }
  const check=await lucidSupabase.rpc('is_lucid_admin'),isAdmin=!check.error&&check.data===true;
  const badge=document.getElementById('profileRoleBadge');if(badge)badge.textContent=isAdmin?'Administrator':'Learner';
  setText('profileRoleText',isAdmin?'Administrator access enabled':'Learner account');
  setText('sideProfileRole',isAdmin?'Administrator · Lucid':'Learner · Lucid');
  const panel=document.getElementById('adminConsole');if(panel)panel.style.display=isAdmin?'block':'none';
  if(isAdmin)await window.loadLucidAdminStats();
  await window.loadLucidLeaderboard();
};
window.saveLearnerProfile = async function(){
  if(!lucidSession||!lucidSession.user)throw new Error('Sign in first.');
  const status=document.getElementById('profileSaveStatus');if(status)status.textContent='Saving…';
  const user=lucidSession.user,name=document.getElementById('profileNameInput').value.trim(),bio=document.getElementById('profileBioInput').value.trim();
  if(!name){if(status)status.textContent='Display name is required.';return;}
  try{
    const file=document.getElementById('profilePhotoInput').files[0],update={display_name:name,bio:bio,updated_at:new Date().toISOString()};
    if(file){
      if(['image/jpeg','image/png','image/webp'].indexOf(file.type)<0||file.size>5*1024*1024)throw new Error('Choose JPG, PNG or WebP under 5 MB.');
      const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg',path=user.id+'/'+crypto.randomUUID()+'.'+ext;
      const up=await lucidSupabase.storage.from('learner-avatars').upload(path,file,{contentType:file.type,upsert:false});
      if(up.error)throw up.error;
      update.avatar_url=lucidSupabase.storage.from('learner-avatars').getPublicUrl(path).data.publicUrl;
    }
    const saved=await lucidSupabase.from('profiles').update(update).eq('id',user.id);if(saved.error)throw saved.error;
    if(status)status.textContent='Profile saved.';
    await window.loadLucidProfile();showToast('Learner profile updated.','✓');
  }catch(error){if(status)status.textContent='Could not save: '+error.message;showToast('Profile update failed: '+error.message,'⚠');}
};
window.loadLucidAdminStats = async function(){
  const status=document.getElementById('adminStatsStatus');if(status)status.textContent='Loading administrator metrics…';
  const {data,error}=await lucidSupabase.rpc('get_lucid_admin_stats');
  if(error){if(status)status.textContent='Admin metrics unavailable: '+error.message;return;}
  const pairs={adminLearners:'learners',adminResources:'resources',adminQuizzes:'quizzes',adminAttempts:'quiz_attempts'};
  Object.keys(pairs).forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=Number(data[pairs[id]]||0).toLocaleString();});
  if(status)status.textContent='Server-verified administrator access.';
};
window.uploadLucidPdf = async function(file,catalogueId){
  if(!lucidSession||!lucidSession.user)throw new Error('Please sign in before uploading.');
  if(!file||file.type!=='application/pdf')throw new Error('Only PDF files are supported.');
  if(file.size>25*1024*1024)throw new Error('PDF must be 25 MB or smaller.');
  if(!window.pdfjsLib)throw new Error('PDF text reader failed to load. Refresh and try again.');
  const user=lucidSession.user,arrayBuffer=await file.arrayBuffer(),pdf=await window.pdfjsLib.getDocument({data:arrayBuffer}).promise;
  if(pdf.numPages>500)throw new Error('This PDF has more than 500 pages. Split it into smaller files.');
  const pages=[];let totalChars=0;
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n),content=await page.getTextContent();
    const pageText=content.items.map(x=>(x.str||'')+(x.hasEOL?'\n':' ')).join('').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
    totalChars+=pageText.length;if(totalChars>1800000)throw new Error('Extracted text exceeds 1.8 million characters. Split this PDF into smaller files.');
    pages.push({page_number:n,text_content:pageText,metadata:{source:'pdfjs-client-extraction'}});
  }
  const safe=file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-100)||'document.pdf';
  const path=user.id+'/'+crypto.randomUUID()+'-'+safe,title=file.name.replace(/\.pdf$/i,'');
  let resourceId=null,uploaded=false;
  try{
    const created=await lucidSupabase.from('lucid_resources').insert({
      owner_id:user.id,type:'pdf',title:title,mime_type:'application/pdf',
      metadata:{original_name:file.name,page_count:pdf.numPages,extracted_text_chars:totalChars,extraction_method:'pdfjs'},
      processing_status:totalChars?'indexed':'needs_ocr'
    }).select().single();
    if(created.error)throw created.error;resourceId=created.data.id;
    const up=await lucidSupabase.storage.from('learning-assets').upload(path,file,{contentType:'application/pdf',upsert:false});
    if(up.error)throw up.error;uploaded=true;
    const fileRow=await lucidSupabase.from('resource_files').insert({resource_id:resourceId,storage_bucket:'learning-assets',storage_path:path,byte_size:file.size,original_name:file.name,mime_type:'application/pdf'});
    if(fileRow.error)throw fileRow.error;
    if(catalogueId){const linked=await lucidSupabase.from('catalogue_resources').insert({catalogue_id:catalogueId,resource_id:resourceId,order_index:0,status:'active'});if(linked.error)throw linked.error;}
    for(let i=0;i<pages.length;i+=40){
      const batch=pages.slice(i,i+40).map(row=>Object.assign({resource_id:resourceId},row));
      const inserted=await lucidSupabase.from('resource_pages').insert(batch);if(inserted.error)throw inserted.error;
    }
    const journey=await lucidSupabase.from('learning_journeys').insert({owner_id:user.id,catalogue_id:catalogueId||null,resource_id:resourceId,position:{page:1},last_activity_at:new Date().toISOString()});
    if(journey.error)console.warn('Resource saved, but learning journey initialization failed:',journey.error.message);
    return {resource:{id:resourceId,title:title},pageCount:pdf.numPages,extractedPages:pages.filter(p=>p.text_content).length,extractedChars:totalChars};
  }catch(error){
    if(resourceId){
      await lucidSupabase.from('resource_pages').delete().eq('resource_id',resourceId);
      await lucidSupabase.from('resource_files').delete().eq('resource_id',resourceId);
      await lucidSupabase.from('lucid_resources').delete().eq('id',resourceId);
    }
    if(uploaded)await lucidSupabase.storage.from('learning-assets').remove([path]);
    throw error;
  }
};
window.getLucidResourcePages = async function(resourceId,options={}){
  if(!lucidSession?.user||!resourceId)throw new Error('Sign in and choose a source PDF.');
  let query=lucidSupabase.from('resource_pages').select('page_number,text_content').eq('resource_id',resourceId).order('page_number',{ascending:true});
  if(options.page)query=query.eq('page_number',Number(options.page));
  else query=query.range(0,499);
  const {data,error}=await query;if(error)throw error;return data||[];
};
window.loadLucidGoals = async function(){
  if(!lucidSession?.user)return [];
  const uid=lucidSession.user.id;
  const {data,error}=await lucidSupabase.from('learning_goals').select('id,title,description,target_type,target_value,deadline,status,created_at,completed_at').eq('owner_id',uid).order('created_at',{ascending:false});
  if(error)throw error;
  const goals=data||[],list=document.getElementById('goalList');
  const [resourceProgress,mastery,sessions,attempts]=await Promise.all([
    lucidSupabase.from('resource_item_progress').select('resource_id').eq('user_id',uid).eq('completed',true).limit(2000),
    lucidSupabase.from('concept_mastery').select('mastery').eq('user_id',uid).limit(1000),
    lucidSupabase.from('reading_sessions').select('active_seconds').eq('user_id',uid).limit(1000),
    lucidSupabase.from('quiz_attempts').select('score,max_score').eq('user_id',uid).not('completed_at','is',null).limit(500)
  ]);
  const completedResources=new Set((resourceProgress.data||[]).map(x=>x.resource_id)).size;
  const masteryRows=mastery.data||[],avgMastery=masteryRows.length?masteryRows.reduce((s,x)=>s+(Number(x.mastery)||0),0)/masteryRows.length:0;
  const focusHours=(sessions.data||[]).reduce((s,x)=>s+(Number(x.active_seconds)||0),0)/3600;
  const attemptRows=attempts.data||[],quizAccuracy=attemptRows.length?attemptRows.reduce((s,x)=>s+(Number(x.max_score)>0?Number(x.score)/Number(x.max_score)*100:0),0)/attemptRows.length:0;
  const currentByType={resource_completion:completedResources,mastery_target:avgMastery,focus_hours:focusHours,quiz_accuracy:quizAccuracy};
  const unitByType={resource_completion:'resources',mastery_target:'%',focus_hours:'hours',quiz_accuracy:'%'};
  if(list){
    list.innerHTML='';
    if(!goals.length){list.innerHTML='<p class="muted small-text">No goals yet. Add a target to give your learning a measurable direction.</p>';}
    goals.forEach(goal=>{
      const item=document.createElement('div');item.className='goal-item'+(goal.status==='completed'?' done':'');
      const check=document.createElement('button');check.type='button';check.className='goal-check'+(goal.status==='completed'?' checked':'');check.textContent=goal.status==='completed'?'✓':'';check.disabled=goal.status==='completed';check.title=goal.status==='completed'?'Completed':'Mark goal complete';check.onclick=()=>window.completeLucidGoal(goal.id);
      const body=document.createElement('div');body.style.flex='1';
      const title=document.createElement('strong');title.textContent=goal.title;
      const meta=document.createElement('div');meta.className='muted small-text';
      const current=Number(currentByType[goal.target_type]||0),target=Number(goal.target_value||0),unit=unitByType[goal.target_type]||'';
      const currentLabel=goal.target_value?('Progress: '+(goal.target_type==='focus_hours'?current.toFixed(1):Math.round(current))+' / '+target+' '+unit):goal.target_type?.replaceAll('_',' ');
      meta.textContent=[currentLabel,goal.deadline?'Due '+new Date(goal.deadline).toLocaleDateString():null].filter(Boolean).join(' · ')||'Personal learning goal';
      body.append(title,meta);
      if(target>0&&unitByType[goal.target_type]){
        const pct=Math.max(0,Math.min(100,current/target*100)),track=document.createElement('div');track.className='progress-track';track.style.marginTop='6px';
        const fill=document.createElement('span');fill.className='progress-fill';fill.style.width=pct+'%';track.appendChild(fill);body.appendChild(track);
      }
      const tag=document.createElement('span');tag.className='tag';tag.textContent=goal.status==='completed'?'Completed':'Active';
      item.append(check,body,tag);list.appendChild(item);
    });
  }
  return goals;
};
window.createLucidGoal = async function(input){
  if(!lucidSession?.user)throw new Error('Sign in to save a goal.');
  const row={owner_id:lucidSession.user.id,title:String(input.title||'').trim(),description:input.description||null,target_type:input.target_type||'milestone',target_value:input.target_value||null,deadline:input.deadline?new Date(input.deadline+'T23:59:59').toISOString():null,status:'active'};
  if(!row.title)throw new Error('Enter a goal title.');
  const {data,error}=await lucidSupabase.from('learning_goals').insert(row).select('id,title,description,target_type,target_value,deadline,status,created_at,completed_at').single();
  if(error)throw error;await window.loadLucidGoals();return data;
};
window.completeLucidGoal = async function(id){
  if(!lucidSession?.user)throw new Error('Sign in to update a goal.');
  const {error}=await lucidSupabase.from('learning_goals').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',id).eq('owner_id',lucidSession.user.id);
  if(error)throw error;await window.loadLucidGoals();
};
window.loadLucidAchievements = async function(){
  if(!lucidSession?.user)return [];
  const uid=lucidSession.user.id;
  const {data:badges,error:badgeError}=await lucidSupabase.from('badges').select('id,slug,name,family,description,rule').order('family').order('name');
  if(badgeError)throw badgeError;
  const [xp,sessions,resourceProgress,answerCount]=await Promise.all([
    lucidSupabase.from('user_xp').select('streak_days').eq('user_id',uid).maybeSingle(),
    lucidSupabase.from('reading_sessions').select('id,active_seconds,pages_completed').eq('user_id',uid).limit(1000),
    lucidSupabase.from('resource_item_progress').select('resource_id').eq('user_id',uid).eq('completed',true).limit(2000),
    lucidSupabase.from('quiz_answers').select('id',{count:'exact',head:true})
  ]);
  const sessionsRows=sessions.error?[]:(sessions.data||[]);
  const resourcesRows=resourceProgress.error?[]:(resourceProgress.data||[]);
  const evidence={
    collaboration:0,
    completion:new Set(resourcesRows.map(x=>x.resource_id)).size,
    consistency:Number(xp.data?.streak_days||0),
    deep_work:sessionsRows.filter(x=>Number(x.active_seconds)>0).length,
    practice:answerCount.error?0:Number(answerCount.count||0),
    reading:sessionsRows.reduce((sum,x)=>sum+(Number(x.pages_completed)||0),0)
  };
  const {data:earnedBefore,error:earnedError}=await lucidSupabase.from('user_badges').select('badge_id,awarded_at,metadata').eq('user_id',uid).order('awarded_at',{ascending:false});
  if(earnedError)throw earnedError;
  const already=new Set((earnedBefore||[]).map(x=>x.badge_id));
  const newAwards=(badges||[]).filter(b=>!already.has(b.id)).filter(b=>{
    const rule=b.rule||{},entry=Object.entries(rule)[0];if(!entry)return false;
    const threshold=Number(entry[1])||0;return threshold>0&&Number(evidence[b.family]||0)>=threshold;
  }).map(b=>({user_id:uid,badge_id:b.id,metadata:{evidence:Number(evidence[b.family]||0),rule:b.rule||{},source:'learning_activity'}}));
  if(newAwards.length){
    const awardResult=await lucidSupabase.from('user_badges').upsert(newAwards,{onConflict:'user_id,badge_id',ignoreDuplicates:true});
    if(awardResult.error)console.warn('Could not award achievement badges:',awardResult.error.message);
  }
  const {data:earned,error}=await lucidSupabase.from('user_badges').select('badge_id,awarded_at,metadata').eq('user_id',uid).order('awarded_at',{ascending:false});
  if(error)throw error;
  const earnedMap=new Map((earned||[]).map(x=>[x.badge_id,x]));
  const icon={collaboration:'🤝',completion:'📚',consistency:'🔥',deep_work:'⚡',practice:'🧠',reading:'📖'};
  const grid=document.getElementById('rewardGrid'),dash=document.getElementById('dashBadges');
  const render=(target,compact)=>{
    if(!target)return;target.innerHTML='';
    (badges||[]).forEach(badge=>{
      const record=earnedMap.get(badge.id),card=document.createElement(compact?'div':'article');
      card.className=compact?'reward-badge'+(record?'':' locked'):'card card-padding';
      if(compact){card.textContent=icon[badge.family]||'✦';card.title=badge.name+(record?' · Earned':' · Not earned yet');}
      else{
        const emblem=document.createElement('div');emblem.className='reward-badge'+(record?'':' locked');emblem.textContent=icon[badge.family]||'✦';
        const title=document.createElement('h3');title.style.marginTop='13px';title.textContent=badge.name;
        const desc=document.createElement('p');desc.className='muted small-text';desc.textContent=badge.description;
        const tag=document.createElement('span');tag.className='tag';tag.style.marginTop='8px';tag.textContent=record?'Earned '+new Date(record.awarded_at).toLocaleDateString():'Not earned yet';
        card.append(emblem,title,desc,tag);
      }
      target.appendChild(card);
    });
  };
  render(grid,false);render(dash,true);
  const earnedCount=document.getElementById('earnedBadgeCount');if(earnedCount)earnedCount.textContent=(earned||[]).length+' earned · '+(badges||[]).length+' available';
  const dashSummary=document.getElementById('dashBadgeSummary');if(dashSummary)dashSummary.textContent=(earned||[]).length+' badges earned. Badges unlock when your recorded learning activity meets their criteria.';
  return {earned:earned||[],badges:badges||[],evidence};
};
window.saveLucidQuiz = async function(input){
  if(!lucidSession?.user)throw new Error('Sign in to save quiz history.');
  const {data:quiz,error}=await lucidSupabase.from('quizzes').insert({
    owner_id:lucidSession.user.id,resource_id:input.resourceId||null,quiz_type:input.format||'mcq',
    title:input.title||'Practice quiz',difficulty:input.difficulty||'Balanced',
    catalogue_id:input.catalogueId||null,
    source_context:{coverage:input.coverage||'whole',instructions:input.instructions||'',source_title:input.sourceTitle||'',source_resource_ids:input.resourceIds||[input.resourceId].filter(Boolean),question_count:(input.questions||[]).length}
  }).select('id').single();
  if(error)throw error;
  const rows=(input.questions||[]).map((q,index)=>({quiz_id:quiz.id,question_type:q.type||input.format||'mcq',prompt:q.prompt||q.q,options:q.options||q.opts||[],answer:{answer_index:Number(q.answer_index??q.ans)||0},explanation:q.explanation||'',difficulty:({Easy:1,Balanced:3,Moderate:3,Hard:4,'Exam level':5}[input.difficulty]||3),order_index:index}));
  const saved=await lucidSupabase.from('questions').insert(rows).select('id,order_index');
  if(saved.error){await lucidSupabase.from('quizzes').delete().eq('id',quiz.id).eq('owner_id',lucidSession.user.id);throw saved.error;}
  window.currentGeneratedQuestionIds=(saved.data||[]).sort((a,b)=>a.order_index-b.order_index).map(x=>x.id);
  return quiz.id;
};
window.loadLucidLearningProfile = async function(){
  if(!lucidSession?.user)return null;
  const uid=lucidSession.user.id;
  const [mastery,attempts,sessions]=await Promise.all([
    lucidSupabase.from('concept_mastery').select('concept_id,mastery,recall,application,updated_at').eq('user_id',uid).order('mastery',{ascending:true}).limit(12),
    lucidSupabase.from('quiz_attempts').select('score,max_score,completed_at').eq('user_id',uid).not('completed_at','is',null).order('completed_at',{ascending:false}).limit(20),
    lucidSupabase.from('reading_sessions').select('active_seconds,started_at,ended_at').eq('user_id',uid).order('started_at',{ascending:false}).limit(30)
  ]);
  for(const x of [mastery,attempts,sessions])if(x.error)throw x.error;
  const conceptIds=(mastery.data||[]).map(x=>x.concept_id);
  let concepts=[];
  if(conceptIds.length){const result=await lucidSupabase.from('concepts').select('id,title,normalized_key').in('id',conceptIds);if(!result.error)concepts=result.data||[];}
  const names=new Map(concepts.map(x=>[x.id,x.title||x.name||'Concept']));
  const toPct=value=>{const n=Number(value)||0;return Math.max(0,Math.min(100,n<=1?n*100:n));};
  const weak=(mastery.data||[]).map(x=>({name:names.get(x.concept_id)||'Concept',mastery:toPct(x.mastery),recall:toPct(x.recall),application:toPct(x.application),updated_at:x.updated_at}));
  const completedAttempts=attempts.data||[],avgAccuracy=completedAttempts.length?Math.round(completedAttempts.reduce((sum,x)=>sum+(Number(x.max_score)>0?Number(x.score)/Number(x.max_score)*100:0),0)/completedAttempts.length):null;
  const totalFocusSeconds=(sessions.data||[]).reduce((sum,x)=>sum+(Number(x.active_seconds)||0),0);
  const profile={weakConcepts:weak,averageQuizAccuracy:avgAccuracy,completedQuizzes:completedAttempts.length,recentSessions:(sessions.data||[]).length,totalFocusMinutes:Math.round(totalFocusSeconds/60)};
  const focusSummary=document.getElementById('lbFocusSummary');if(focusSummary)focusSummary.textContent='You recorded '+Math.round(totalFocusSeconds/60)+' minutes across your last '+(sessions.data||[]).length+' reading sessions. This is your personal focus record, not a group ranking.';
  const resourceTag=document.getElementById('aiCurrentResource');if(resourceTag)resourceTag.textContent=state.currentResourceTitle||'No resource selected';
  const pageTag=document.getElementById('aiCurrentPage');if(pageTag)pageTag.textContent=state.currentResourceId?'PDF page '+(state.currentResourcePage||1):'No page context';
  const recallTag=document.getElementById('aiRecallEvidence');if(recallTag)recallTag.textContent=weak.length?'Avg recall: '+Math.round(weak.reduce((sum,x)=>sum+x.recall,0)/weak.length)+'%':'Recall: not measured';
  const weakTag=document.getElementById('aiWeakArea');if(weakTag)weakTag.textContent=weak[0]?'Weak: '+weak[0].name:'Weak area: not measured';
  const panel=document.getElementById('aiImprovementPanel');
  if(panel){
    panel.innerHTML='';
    const p=document.createElement('p');p.className='muted small-text';p.textContent=weak.length?'Lowest measured mastery areas from your saved concept evidence:':'No concept mastery evidence has been recorded yet. Complete a source-based quiz or recall check to build your learning profile.';
    panel.appendChild(p);
    weak.slice(0,4).forEach(x=>{const line=document.createElement('div');line.className='mastery-bar-row';const label=document.createElement('span');label.className='label';label.textContent=x.name;const track=document.createElement('div');track.className='progress-track';const fill=document.createElement('span');fill.className='progress-fill gold';fill.style.width=Math.max(0,Math.min(100,x.mastery))+'%';track.appendChild(fill);const value=document.createElement('span');value.className='mastery-pct';value.textContent=Math.round(x.mastery)+'%';line.append(label,track,value);panel.appendChild(line);});
  }
  if(window.renderLucidWeakAreas)window.renderLucidWeakAreas(profile);
  return profile;
};
window.generateLucidImprovementPlan = async function(){
  const status=document.getElementById('aiImprovementStatus');if(status)status.textContent='Analysing your saved learning evidence…';
  try{
    const profile=await window.loadLucidLearningProfile();
    const data=await window.callLearningEngine('analyze_pattern','Identify the highest-impact improvements for this learner. Give specific actions based only on the evidence.',profile||{});
    const patterns=data.result?.patterns||[];
    const panel=document.getElementById('aiImprovementPlan');if(panel){panel.innerHTML='';if(!patterns.length)throw new Error('The model did not return an improvement plan.');patterns.forEach(item=>{const card=document.createElement('div');card.className='note';const title=document.createElement('strong');title.textContent=item.pattern_key||item.dimension||'Suggested improvement';const desc=document.createElement('p');desc.className='muted small-text';desc.textContent=item.adaptive_response||item.reason||'Review the related learning evidence.';card.append(title,desc);panel.appendChild(card);});}
    if(status)status.textContent='Recommendations generated from your saved progress.';
    return patterns;
  }catch(error){if(status)status.textContent='Could not generate recommendations: '+error.message;throw error;}
};
window.loadLucidAnnotations = async function(resourceId){
  if(!lucidSession?.user||!resourceId)return [];
  const {data,error}=await lucidSupabase.from('annotations').select('id,text,note,color,page,created_at').eq('user_id',lucidSession.user.id).eq('book_id',String(resourceId)).order('created_at',{ascending:true});
  if(error)throw error;return data||[];
};
window.saveLucidAnnotation = async function(input){
  if(!lucidSession?.user)throw new Error('Sign in to save annotations.');
  if(!input?.resourceId)throw new Error('Open a PDF before saving a page annotation.');
  const row={id:crypto.randomUUID(),user_id:lucidSession.user.id,book_id:String(input.resourceId),text:String(input.text||''),note:String(input.text||''),color:String(input.color||'yellow'),page:Math.max(1,Number(input.page)||1)};
  const {data,error}=await lucidSupabase.from('annotations').insert(row).select('id,text,note,color,page,created_at').single();
  if(error)throw error;return data;
};
window.deleteLucidAnnotation = async function(id){
  if(!lucidSession?.user||!id)return;
  const {error}=await lucidSupabase.from('annotations').delete().eq('id',id).eq('user_id',lucidSession.user.id);
  if(error)throw error;
};
window.createLucidCatalogue = async function(input){
  if(!lucidSession?.user)throw new Error('Sign in first.');
  const {data,error}=await lucidSupabase.from('catalogues').insert({owner_id:lucidSession.user.id,title:input.title,description:input.description||null,icon:input.icon||'📁'}).select('id,title,description,icon').single();
  if(error)throw error;return data;
};
window.loadLucidCatalogues = async function(){
  if(!lucidSession?.user)return [];
  const {data:cats,error:catError}=await lucidSupabase.from('catalogues').select('id,title,description,icon,created_at').order('created_at',{ascending:false});
  if(catError)throw catError;
  const {data:resources,error:resourceError}=await lucidSupabase.from('lucid_resources').select('id,title,type,processing_status,metadata,created_at').eq('owner_id',lucidSession.user.id).order('created_at',{ascending:false});
  if(resourceError)throw resourceError;
  const {data:links,error:linkError}=await lucidSupabase.from('catalogue_resources').select('catalogue_id,resource_id,status').eq('status','active');
  if(linkError)throw linkError;
  const catalogueIdsByResource=new Map();
  (links||[]).forEach(link=>{
    if(!catalogueIdsByResource.has(link.resource_id))catalogueIdsByResource.set(link.resource_id,[]);
    const ids=catalogueIdsByResource.get(link.resource_id);
    if(!ids.includes(link.catalogue_id))ids.push(link.catalogue_id);
  });
  const ownedResourceIds=new Set((resources||[]).map(resource=>resource.id));
  state.uploadedBooks=(resources||[]).map(r=>{
    const catalogueIds=catalogueIdsByResource.get(r.id)||[];
    return {id:r.id,resourceId:r.id,name:r.title,type:r.type,pages:Number(r.metadata?.page_count||0),
      status:r.processing_status,catalogueId:catalogueIds[0]||null,catalogueIds};
  });
  if(typeof renderUploadedBooks==='function')renderUploadedBooks();
  const countByCatalogue=new Map();
  (links||[]).forEach(link=>{
    if(!ownedResourceIds.has(link.resource_id))return;
    if(!countByCatalogue.has(link.catalogue_id))countByCatalogue.set(link.catalogue_id,new Set());
    countByCatalogue.get(link.catalogue_id).add(link.resource_id);
  });
  const grid=document.getElementById('catalogueGrid');
  if(grid){
    grid.innerHTML='';
    if(!(cats||[]).length){grid.innerHTML='<div class="card card-padding muted">No catalogues yet. Create a folder to organize your resources.</div>';}
    (cats||[]).forEach(cat=>{
      const card=document.createElement('article');card.className='catalogue-card card';
      const icon=document.createElement('div');icon.className='cat-icon';icon.textContent=cat.icon||'📁';
      const title=document.createElement('h3');title.style.cssText="font-family:'DM Serif Display',serif;font-size:20px;font-weight:400;";title.textContent=cat.title;
      const desc=document.createElement('p');desc.className='muted small-text';desc.style.marginTop='6px';desc.textContent=cat.description||'A folder for your study resources.';
      const resourceCount=(countByCatalogue.get(cat.id)||new Set()).size;
      const count=document.createElement('p');count.className='cat-meta';count.textContent=resourceCount+' '+(resourceCount===1?'resource':'resources');
      const preview=document.createElement('div');preview.className='cat-resource-preview';
      const previewNames=(links||[]).filter(link=>link.catalogue_id===cat.id&&ownedResourceIds.has(link.resource_id)).map(link=>(resources||[]).find(resource=>resource.id===link.resource_id)?.title).filter(Boolean).slice(0,3);
      if(previewNames.length){preview.textContent=previewNames.join(' · ')+(resourceCount>previewNames.length?' · +'+(resourceCount-previewNames.length)+' more':'');}
      else{preview.textContent='No resources added yet.';}
      const actions=document.createElement('div');actions.style.cssText='display:flex;gap:7px;margin-top:14px;';
      const open=document.createElement('button');open.className='secondary-button btn-sm';open.textContent='View resources';open.onclick=()=>window.openLucidCatalogue(cat.id);
      const add=document.createElement('button');add.className='ghost-button btn-sm';add.textContent='＋ Add PDF';add.onclick=()=>{const sel=document.getElementById('uploadCatalogue');if(sel)sel.value=cat.id;openModal('uploadModal');};
      actions.append(open,add);card.append(icon,title,desc,count,preview,actions);grid.appendChild(card);
    });
  }
  const select=document.getElementById('uploadCatalogue');
  if(select){
    const chosen=state.selectedCatalogueId||select.value;
    select.innerHTML='';
    if(!(cats||[]).length){select.add(new Option('Create a catalogue first',''));select.disabled=true;}
    else{select.disabled=false;(cats||[]).forEach(cat=>select.add(new Option(cat.title,cat.id)));if(cats.some(c=>c.id===chosen))select.value=chosen;else select.value=cats[0].id;}
  }
  state.catalogues=cats||[];
  return cats||[];
};
window.moveLucidResourceToCatalogue = async function(resourceId,catalogueId){
  if(!lucidSession?.user)throw new Error('Sign in first.');
  if(!resourceId)throw new Error('Missing resource ID.');
  const {data:resource,error:resourceError}=await lucidSupabase.from('lucid_resources').select('id').eq('id',resourceId).eq('owner_id',lucidSession.user.id).single();
  if(resourceError)throw resourceError;
  const removed=await lucidSupabase.from('catalogue_resources').delete().eq('resource_id',resourceId);
  if(removed.error)throw removed.error;
  if(catalogueId){
    const inserted=await lucidSupabase.from('catalogue_resources').insert({catalogue_id:catalogueId,resource_id:resourceId,order_index:0,status:'active'});
    if(inserted.error)throw inserted.error;
  }
  await window.loadLucidCatalogues();
  return true;
};
window.openLucidCatalogue = async function(id){
  if(!lucidSession?.user)throw new Error('Sign in first.');
  const {data:cat,error:catError}=await lucidSupabase.from('catalogues').select('id,title,description').eq('id',id).single();
  if(catError)throw catError;
  state.selectedCatalogueId=id;saveState();
  const panel=document.getElementById('catalogueResourcesPanel'),heading=document.getElementById('catalogueResourcesTitle'),list=document.getElementById('catalogueResourcesList'),empty=document.getElementById('catalogueResourcesEmpty');
  if(panel)panel.style.display='block';if(heading)heading.textContent=cat.title;if(list)list.innerHTML='<div class="muted small-text">Loading resources…</div>';
  const {data:links,error:linkError}=await lucidSupabase.from('catalogue_resources').select('resource_id,order_index,status').eq('catalogue_id',id).eq('status','active').order('order_index',{ascending:true});
  if(linkError)throw linkError;
  const resourceIds=(links||[]).map(link=>link.resource_id);
  let resources=[];
  if(resourceIds.length){
    const fetched=await lucidSupabase.from('lucid_resources').select('id,title,type,processing_status,metadata').eq('owner_id',lucidSession.user.id).in('id',resourceIds);
    if(fetched.error)throw fetched.error;
    resources=fetched.data||[];
  }
  const resourceById=new Map(resources.map(resource=>[resource.id,resource]));
  const rows=(links||[]).map(link=>({...link,lucid_resources:resourceById.get(link.resource_id)})).filter(row=>row.lucid_resources);
  if(list)list.innerHTML='';
  if(empty)empty.style.display=rows.length?'none':'block';
  rows.forEach(row=>{
    const resource=row.lucid_resources;
    const card=document.createElement('article');card.className='book-card card';
    const main=document.createElement('div');main.className='book-main';
    const cover=document.createElement('div');cover.className='book-cover cover-purple';cover.textContent=resource.type==='pdf'?'PDF':String(resource.type||'FILE').toUpperCase();
    const info=document.createElement('div');const title=document.createElement('div');title.className='book-title';title.textContent=resource.title||'Untitled resource';
    const status=document.createElement('div');status.className='book-author';status.textContent=(resource.metadata?.page_count?resource.metadata.page_count+' pages · ':'')+(resource.processing_status||'saved');
    info.append(title,status);main.append(cover,info);
    const footer=document.createElement('div');footer.className='book-footer';const tag=document.createElement('span');tag.className='tag';tag.textContent=resource.type||'resource';
    const open=document.createElement('button');open.className='primary-button btn-sm';open.textContent='Open →';open.onclick=()=>window.openLucidResource(resource.id);
    footer.append(tag,open);card.append(main,footer);list?.appendChild(card);
  });
  if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
  return rows.length;
};
window.renderLucidReaderPage = async function(){
  const title=state.currentResourceTitle||'Selected resource';
  const pageNumber=Math.max(1,Number(state.currentResourcePage)||1);
  const meta=document.getElementById('docMeta'),heading=document.getElementById('docTitle'),content=document.getElementById('readerPageContent'),empty=document.getElementById('readerEmptyState'),footer=document.getElementById('readerDocumentFooter'),tag=document.getElementById('pageTag'),kicker=document.getElementById('readerKicker'),status=document.getElementById('readerPageStatus'),panel=document.getElementById('pdfViewerPanel'),label=document.getElementById('pdfViewerTitle'),pageInput=document.getElementById('pdfPageInput'),pageTotal=document.getElementById('pdfPageTotal');
  const hasPdf=Boolean(window.currentPdfUrl);
  if(meta)meta.textContent=title+' · Original PDF';if(heading)heading.textContent=title;if(kicker)kicker.textContent=title;if(label)label.textContent=title;
  if(content){content.innerHTML='';content.style.display='none';}if(empty)empty.style.display=hasPdf?'none':'block';if(panel)panel.style.display=hasPdf?'block':'none';
  if(tag)tag.textContent=hasPdf?'Original PDF':'No page';
  if(status)status.textContent=hasPdf?'Loading PDF page '+pageNumber+'…':'No PDF selected';if(footer)footer.style.display=hasPdf?'flex':'none';
  if(pageInput)pageInput.value=String(pageNumber);
  const stage=document.getElementById('pdfCanvasStage'),canvas=document.getElementById('pdfPageCanvas'),textLayer=document.getElementById('pdfTextLayer'),viewport=document.getElementById('pdfCanvasViewport');
  if(!hasPdf||!stage||!canvas||!viewport)return;
  const renderId=(window.lucidPdfRenderId||0)+1;window.lucidPdfRenderId=renderId;
  try{
    if(!window.pdfjsLib)throw new Error('PDF.js failed to load. Reload the page and try again.');
    if(!window.currentPdfDocument||window.currentPdfDocumentUrl!==window.currentPdfUrl){
      if(window.currentPdfLoadingUrl!==window.currentPdfUrl){
        window.currentPdfLoadingUrl=window.currentPdfUrl;
        window.currentPdfLoading=window.pdfjsLib.getDocument({url:window.currentPdfUrl}).promise;
      }
      window.currentPdfDocument=await window.currentPdfLoading;
      window.currentPdfDocumentUrl=window.currentPdfUrl;window.currentPdfLoadingUrl=null;window.currentPdfLoading=null;
      state.currentResourcePageCount=window.currentPdfDocument.numPages;
    }
    const total=window.currentPdfDocument.numPages,page=Math.max(1,Math.min(total,pageNumber));
    state.currentResourcePage=page;
    if(pageInput)pageInput.value=String(page);if(pageTotal)pageTotal.textContent='/ '+total;
    if(tag)tag.textContent='PDF · '+total+' pages';
    const pdfPage=await window.currentPdfDocument.getPage(page);
    if(renderId!==window.lucidPdfRenderId)return;
    const base=pdfPage.getViewport({scale:1}),available=Math.max(240,viewport.clientWidth-24);
    const fitScale=Math.max(.15,Math.min(1.5,available/base.width));
    const scale=fitScale*(Number(state.pdfZoom)||1),pdfViewport=pdfPage.getViewport({scale});
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.ceil(pdfViewport.width*dpr);canvas.height=Math.ceil(pdfViewport.height*dpr);
    canvas.style.width=pdfViewport.width+'px';canvas.style.height=pdfViewport.height+'px';
    stage.style.width=pdfViewport.width+'px';stage.style.height=pdfViewport.height+'px';
    textLayer.innerHTML='';textLayer.style.width=pdfViewport.width+'px';textLayer.style.height=pdfViewport.height+'px';
    const context=canvas.getContext('2d');context.setTransform(dpr,0,0,dpr,0,0);
    if(window.lucidPdfRenderTask){try{window.lucidPdfRenderTask.cancel();}catch(_){}}
    const task=pdfPage.render({canvasContext:context,viewport:pdfViewport});window.lucidPdfRenderTask=task;
    await task.promise;
    if(renderId!==window.lucidPdfRenderId)return;
    stage.querySelector('.pdf-render-error')?.remove();
    const textContent=await pdfPage.getTextContent();
    if(window.pdfjsLib.renderTextLayer){
      const textTask=window.pdfjsLib.renderTextLayer({textContent,container:textLayer,viewport:pdfViewport,textDivs:[]});
      if(textTask?.promise)await textTask.promise;
    }
    if(status)status.textContent='PDF page '+page+' of '+total;
    const zoomLabel=document.getElementById('pdfZoomLabel');if(zoomLabel)zoomLabel.textContent=Math.round((Number(state.pdfZoom)||1)*100)+'%';
    if(!window.lucidPdfResizeObserver&&window.ResizeObserver){
      window.lucidPdfResizeObserver=new ResizeObserver(entries=>{
        const width=entries[0]?.contentRect?.width||0;
        if(width>0&&Math.abs(width-(window.lucidPdfLastWidth||0))>8){
          window.lucidPdfLastWidth=width;
          if(window.currentPdfUrl&&document.getElementById('reader')?.classList.contains('active'))window.renderLucidReaderPage();
        }
      });
      window.lucidPdfResizeObserver.observe(viewport);
    }
  }catch(error){
    if(error?.name==='RenderingCancelledException')return;
    if(renderId!==window.lucidPdfRenderId)return;
    if(status)status.textContent='PDF could not be rendered';
    window.currentPdfLoading=null;window.currentPdfLoadingUrl=null;
    let errorNode=stage.querySelector('.pdf-render-error');
    if(!errorNode){errorNode=document.createElement('div');errorNode.className='pdf-render-error';errorNode.style.cssText='padding:22px;color:#9b3d38;background:#fff;border-radius:8px;';stage.appendChild(errorNode);}
    errorNode.textContent='Could not render this PDF page: '+String(error.message||error);
  }
};
window.goLucidPdfPage=function(value){
  const max=Number(state.currentResourcePageCount||state.resourcePages?.length||1);state.currentResourcePage=Math.max(1,Math.min(max,Number(value)||1));
  saveState();window.renderLucidReaderPage();if(typeof renderAnnotations==='function')renderAnnotations();
};
window.changeLucidPdfZoom=function(delta){state.pdfZoom=Math.max(.5,Math.min(2.5,(Number(state.pdfZoom)||1)+delta));window.renderLucidReaderPage();};
window.resetLucidPdfZoom=function(){state.pdfZoom=1;window.renderLucidReaderPage();};
window.openLucidResource = async function(id){
  if(!lucidSession?.user)throw new Error('Sign in first.');
  const {data:resource,error}=await lucidSupabase.from('lucid_resources').select('id,title,type,processing_status,metadata').eq('id',id).eq('owner_id',lucidSession.user.id).single();
  if(error)throw error;
  if(resource.type==='video'){
    try{window.lucidVideoPlayer?.pauseVideo?.();}catch(_){}await window.persistLucidVideoProgress(true);openPage('video');await window.loadLucidVideoLibrary('__standalone__');await window.selectLucidVideo(id);return resource;
  }
  if(resource.type==='playlist'){
    try{window.lucidVideoPlayer?.pauseVideo?.();}catch(_){}await window.persistLucidVideoProgress(true);openPage('video');const items=await window.loadLucidVideoLibrary(id);if(items.length)await window.selectLucidVideo(items[0].resource_id);return resource;
  }
  if(resource.type!=='pdf')throw new Error('This resource type cannot be opened in the PDF reader.');
  try{window.lucidVideoPlayer?.pauseVideo?.();}catch(_){}await window.persistLucidVideoProgress(true);state.currentVideoContext=null;state.currentVideoResourceId=null;window.currentLucidVideoResourceId=null;
  const {data:fileRow,error:fileError}=await lucidSupabase.from('resource_files').select('storage_bucket,storage_path,original_name').eq('resource_id',id).maybeSingle();
  if(fileError)throw fileError;
  if(!fileRow?.storage_path)throw new Error('The original PDF file link is missing. Re-upload this PDF to restore the document viewer.');
  const bucket=fileRow.storage_bucket||'learning-assets';
  const {data:signed,error:signedError}=await lucidSupabase.storage.from(bucket).createSignedUrl(fileRow.storage_path,3600);
  if(signedError)throw signedError;
  if(!signed?.signedUrl)throw new Error('Could not create a secure link for this PDF.');
  const {data:pages,error:pageError}=await lucidSupabase.from('resource_pages').select('page_number,text_content').eq('resource_id',id).order('page_number',{ascending:true});
  if(pageError)throw pageError;
  state.currentResourceId=id;
  state.selectedText='';
  state.currentResourceTitle=resource.title;
  state.currentResourcePage=1;
  state.currentResourcePageCount=Number(resource.metadata?.page_count||pages?.length||0);
  window.currentPdfUrl=signed.signedUrl;
  state.resourcePages=pages||[];
  try{
    const saved=await window.loadLucidAnnotations(id);
    state.highlights=(state.highlights||[]).filter(row=>row.resourceId!==id);
    state.annotations=saved.map(row=>({id:row.id,text:row.note||row.text||'',page:row.page||1,color:row.color||'yellow',resourceId:id}));
    renderAnnotations();
  }catch(annotationError){console.warn('Could not load page annotations:',annotationError.message);}
  saveState();
  const openLink=document.getElementById('pdfOpenNewTab');if(openLink)openLink.href=signed.signedUrl;
  openPage('reader');requestAnimationFrame(()=>window.renderLucidReaderPage());
  if(resource.processing_status==='needs_ocr'||!pages?.some(page=>page.text_content))showToast('Original PDF opened. Text extraction is unavailable for some or all pages; AI may need OCR for those pages.','⚠');
  else showToast('Opened original PDF: '+resource.title,'📖');
};
window.changeLucidReaderPage = function(delta){
  const pageCount=Number(state.currentResourcePageCount||state.resourcePages?.length||0);
  if(!window.currentPdfUrl||!pageCount)return;
  state.currentResourcePage=Math.max(1,Math.min(pageCount,(state.currentResourcePage||1)+delta));
  saveState();window.renderLucidReaderPage();if(typeof renderAnnotations==='function')renderAnnotations();
};
window.selectLucidResource = function(id){
  state.currentResourceId=id;
  const item=state.uploadedBooks.find(x=>(x.resourceId||x.id)===id);
  state.currentResourceTitle=item&&item.name||'Selected PDF';
  saveState();showToast('Selected resource for AI context.','📄');openPage('aiGuide');
};

window.initLucidAuth();
