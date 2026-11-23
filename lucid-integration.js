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
  if(lucidSession&&lucidSession.user){try{await window.loadLucidProfile();}catch(error){console.warn('Could not load learner profile:',error.message);}}
};
window.handleAuthSubmit = async function(event){ event.preventDefault(); const email=document.getElementById('authEmail').value.trim(); const password=document.getElementById('authPassword').value; const button=document.getElementById('authSubmit'); button.disabled=true; button.textContent=lucidAuthMode==='signup'?'Creating account…':'Signing in…'; lucidAuthMessage(''); try { if(lucidAuthMode==='signup'){ const {data,error}=await lucidSupabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}}); if(error)throw error; if(data.session){window.updateLucidAuthUI(data.session);lucidAuthMessage('Account created. You are signed in.','success');}else{lucidAuthMessage('Account created. Check your email to confirm it, then return here and sign in.','success');} } else { const {data,error}=await lucidSupabase.auth.signInWithPassword({email,password}); if(error)throw error; window.updateLucidAuthUI(data.session); if(typeof showToast==='function')showToast('Signed in securely.','✓'); } } catch(error){lucidAuthMessage(error?.message||'Authentication failed. Please try again.','error');} finally {button.disabled=false;button.textContent=lucidAuthMode==='signup'?'Create account':'Sign in';} };
window.signOutLucid = async function(){const {error}=await lucidSupabase.auth.signOut();if(error){showToast('Sign out failed: '+error.message,'⚠');return;}window.updateLucidAuthUI(null);showToast('You have signed out.','✓');};
window.invokeLucidFunction = async function(name,body){
  if(!lucidSession)throw new Error('Please sign in before using Lucid AI.');
  const {data,error}=await lucidSupabase.functions.invoke(name,{body});
  if(error){
    let detail=error.message||'Function request failed',status='';
    try{
      status=error.context&&error.context.status?String(error.context.status):'';
      const response=error.context&&error.context.clone?error.context.clone():error.context;
      if(response&&typeof response.json==='function'){const payload=await response.json();detail=payload.error||payload.message||payload.msg||detail;}
    }catch(_){}
    throw new Error((status?'HTTP '+status+' · ':'')+detail);
  }
  if(data&&data.error)throw new Error(data.error);
  return data;
};
window.callAIGuide = async function(prompt,style){
  try{
    const history=(typeof state!=='undefined'?state.chatMessages:[]).slice(-8).map(m=>({role:m.role,content:m.text}));
    let context=style?'Preferred coaching style: '+style:'';
    if(typeof state!=='undefined'&&state.currentResourceId){
      const {data,error}=await lucidSupabase.from('resource_pages').select('page_number,text_content').eq('resource_id',state.currentResourceId).order('page_number').limit(20);
      if(error)throw error;
      context+='\nActive PDF: '+(state.currentResourceTitle||'Selected resource')+'\n'+(data||[]).map(p=>'Page '+p.page_number+': '+(p.text_content||'')).join('\n').slice(0,85000);
    }
    const data=await window.invokeLucidFunction('ai-guide',{question:prompt,context,history});
    return data.text||'The AI Guide returned an empty response.';
  }catch(error){return 'AI Guide error: '+(error&&error.message||'Unknown error');}
};
window.callLearningEngine = async function(action,request,context){return await window.invokeLucidFunction('ai-learning',{action,request,context:context||{}});};
window.formatLearningResult = function(result){if(!result)return 'No learning result was returned.';if(result.feedback)return 'Score: '+(result.score??'—')+'\nCoverage: '+(result.coverage??'—')+'\nAccuracy: '+(result.accuracy??'—')+'\nClarity: '+(result.clarity??'—')+'\nFeedback: '+result.feedback+(result.missing?.length?'\nReview: '+result.missing.join(', '):'');if(result.questions?.length)return result.questions.map((q,i)=>(i+1)+'. '+q.prompt+'\n'+(q.options||[]).map((o,j)=>String.fromCharCode(65+j)+'. '+o).join('\n')+'\nAnswer: '+(q.options?.[q.answer_index]||'Not provided')+'\n'+(q.explanation||'')).join('\n\n');if(result.cards?.length)return result.cards.map((c,i)=>(i+1)+'. '+c.front+'\n'+c.back).join('\n\n');return result.lesson||result.text||JSON.stringify(result,null,2);};
window.callLucidAgent = async function(prompt){
  const data=await window.invokeLucidFunction('lucid-agent',{action:'chat',request:prompt,resource_id:typeof state!=='undefined'?state.currentResourceId:null});
  return data.text||data.result&&data.result.text||(typeof data.result==='string'?data.result:JSON.stringify(data.result||data,null,2));
};
window.generateAIQuiz = async function(){showToast('Generating an AI quiz…','✦');const prompt='Create one multiple-choice question about Machine Learning and overfitting.';try{const data=await window.callLearningEngine('quiz',prompt,{subject:'Machine Learning',topic:'overfitting'});const qs=(data.result?.questions||[]).filter(q=>q.prompt&&Array.isArray(q.options)&&q.options.length>=2).map(q=>({q:q.prompt,opts:q.options,ans:Number(q.answer_index)||0}));if(qs.length){quizBank.unshift(...qs);currentQuizIdx=0;loadQuiz(0);openPage('practice');showToast(qs.length+' AI question(s) added to Practice Center.','✦');}else{showToast('AI returned no valid quiz questions.','⚠');}}catch(error){showToast('AI quiz failed: '+error.message,'⚠');}};
window.generateFlashcards = async function(){showToast('Generating flashcards from your notes…','✦');const notes=state.annotations.slice(0,3);const prompt='Create three concise flashcards from these notes: '+(notes.join('. ')||'Machine Learning fundamentals, overfitting, bias-variance tradeoff');try{const data=await window.callLearningEngine('flashcards',prompt,{annotations:notes});const cards=data.result?.cards||[];if(cards.length){state.flashcards=cards.map(c=>({q:c.front,a:c.back}));state.flashcardIndex=0;document.getElementById('flashFront').textContent=state.flashcards[0].q;document.getElementById('flashBack').textContent=state.flashcards[0].a;document.getElementById('cardProgress').textContent='Card 1 of '+cards.length+' · Click to flip';}console.log('Lucid flashcards:',data.result);showToast(cards.length?cards.length+' flashcards generated.':'No flashcards returned.','✦');}catch(error){showToast('Flashcard generation failed: '+error.message,'⚠');}};
window.evaluateOral = async function(){const q=document.getElementById('oralQuestion').textContent;const a=document.getElementById('oralAnswer').value.trim();if(!a){showToast('Write your explanation first.','⚠');return;}const resultEl=document.getElementById('oralResult');resultEl.style.display='block';resultEl.textContent='Evaluating your answer…';try{const data=await window.callLearningEngine('evaluate_recall','Evaluate coverage, accuracy and clarity. Question: '+q+' Student answer: '+a,{question:q,answer:a});const text=window.formatLearningResult(data.result);resultEl.innerHTML='<div class="note green"><strong>AI evaluation:</strong><br>'+escapeHTML(text).replace(/\n/g,'<br>')+'</div>';state.xp+=15;updateXP();showToast('Oral recall evaluated! +15 XP','🎙');}catch(error){resultEl.textContent='Evaluation failed: '+error.message;showToast('Evaluation failed.','⚠');}};
window.practiceWeak = async function(topic){openPage('practice');showToast('Preparing targeted practice for '+topic+'…','📝');try{const data=await window.callLearningEngine('quiz','Create one remedial MCQ about '+topic+' with four options, answer and explanation.',{weak_topic:topic,practice_mode:'remedial'});const qs=(data.result?.questions||[]).filter(q=>q.prompt&&Array.isArray(q.options)&&q.options.length>=2).map(q=>({q:q.prompt,opts:q.options,ans:Number(q.answer_index)||0}));if(qs.length){quizBank.unshift(...qs);currentQuizIdx=0;loadQuiz(0);showToast('Targeted AI practice ready for '+topic+'.','✦');}else{showToast('AI returned no valid practice question.','⚠');}}catch(error){showToast('Practice generation failed: '+error.message,'⚠');}};
window.askGuide = async function(){const q=document.getElementById('aiQuestion').value.trim();const el=document.getElementById('aiAnswer');if(!q){el.style.display='block';el.textContent='Ask a question first.';return;}el.style.display='block';el.textContent='Thinking…';const context='Current resource and annotations: '+state.annotations.slice(0,3).join('; ');const answer=await window.callAIGuide('Context: '+context+'\n\nStudent question: '+q,systemInstructions[state.coachMode]||systemInstructions.Gentle);el.innerHTML='<strong>Guide ('+escapeHTML(state.coachMode)+'):</strong><br>'+escapeHTML(answer).replace(/\n/g,'<br>');};
window.quickAIModal = async function(prompt){const el=document.getElementById('aiAnswer');document.getElementById('aiQuestion').value=prompt;el.style.display='block';el.textContent='Thinking…';const answer=await window.callAIGuide(prompt,systemInstructions[state.coachMode]||systemInstructions.Gentle);el.innerHTML='<strong>Guide:</strong><br>'+escapeHTML(answer).replace(/\n/g,'<br>');};
window.sendAIChatWithPrompt = async function(prompt){const chat=document.getElementById('aiChat');const empty=document.getElementById('aiChatEmpty');if(empty)empty.style.display='none';state.chatMessages.push({role:'user',text:prompt});const userEl=document.createElement('div');userEl.className='ai-msg user';userEl.textContent=prompt;chat.appendChild(userEl);const thinking=document.createElement('div');thinking.className='ai-msg bot thinking';thinking.textContent='✦ Thinking…';chat.appendChild(thinking);chat.scrollTop=chat.scrollHeight;document.getElementById('chatCount').textContent=state.chatMessages.length;const context='Learner: '+state.preferences.name+'. Current study: MCA learning. Recent annotations: '+state.annotations.slice(0,2).join('; ')+'. Coach mode: '+state.coachMode+'.';let answer;try{answer=await window.callLucidAgent('Learning context: '+context+'\n\nCoaching style: '+(systemInstructions[state.coachMode]||systemInstructions.Gentle)+'\n\nStudent: '+prompt);}catch(error){answer='Lucid Agent error: '+error.message;}thinking.className='ai-msg bot';thinking.style.whiteSpace='pre-wrap';thinking.textContent=answer;state.chatMessages.push({role:'bot',text:answer});chat.scrollTop=chat.scrollHeight;document.getElementById('chatCount').textContent=state.chatMessages.length;saveState();};
window.loadYoutubeURL = async function(url){if(!url){showToast('Paste a YouTube URL first.','⚠');return;}showToast('Importing YouTube content securely…','▶');try{const imported=await window.invokeLucidFunction('youtube-import',{url});openPage('video');const wrapper=document.getElementById('youtubePlayerWrapper'),player=document.getElementById('youtubePlayer'),frame=document.getElementById('ytFrame');if(imported.type==='playlist'&&imported.playlist_id){frame.src='https://www.youtube.com/embed/videoseries?list='+encodeURIComponent(imported.playlist_id);showToast('Playlist imported: '+(imported.playlist?.title||'YouTube playlist'),'▶');}else if(imported.type==='video'&&imported.item?.video_id){frame.src='https://www.youtube.com/embed/'+encodeURIComponent(imported.item.video_id)+'?rel=0&modestbranding=1&enablejsapi=1';showToast('Loaded: '+(imported.item.title||'YouTube video'),'▶');}else{throw new Error('Unsupported YouTube import response.');}if(wrapper)wrapper.style.display='none';if(player)player.style.display='block';}catch(error){showToast('YouTube import failed: '+error.message,'⚠');}};
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
window.uploadLucidPdf = async function(file){
  if(!lucidSession||!lucidSession.user)throw new Error('Please sign in before uploading.');
  if(!file||file.type!=='application/pdf')throw new Error('Only PDF files are supported.');
  if(file.size>25*1024*1024)throw new Error('PDF must be 25 MB or smaller.');
  if(!window.pdfjsLib)throw new Error('PDF text reader failed to load. Refresh and try again.');
  const user=lucidSession.user,arrayBuffer=await file.arrayBuffer(),pdf=await window.pdfjsLib.getDocument({data:arrayBuffer}).promise;
  if(pdf.numPages>500)throw new Error('This PDF has more than 500 pages. Split it into smaller files.');
  const pages=[];let totalChars=0;
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n),content=await page.getTextContent();
    const pageText=content.items.map(x=>x.str||'').join(' ').replace(/\s+/g,' ').trim();
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
    for(let i=0;i<pages.length;i+=40){
      const batch=pages.slice(i,i+40).map(row=>Object.assign({resource_id:resourceId},row));
      const inserted=await lucidSupabase.from('resource_pages').insert(batch);if(inserted.error)throw inserted.error;
    }
    const journey=await lucidSupabase.from('learning_journeys').insert({owner_id:user.id,resource_id:resourceId,position:{page:1},last_activity_at:new Date().toISOString()});
    if(journey.error)console.warn('Resource saved, but learning journey initialization failed:',journey.error.message);
    return {resource:{id:resourceId,title:title},pageCount:totalChars?pdf.numPages:0,extractedChars:totalChars};
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
window.selectLucidResource = function(id){
  state.currentResourceId=id;
  const item=state.uploadedBooks.find(x=>(x.resourceId||x.id)===id);
  state.currentResourceTitle=item&&item.name||'Selected PDF';
  saveState();showToast('Selected resource for AI context.','📄');openPage('aiGuide');
};

window.initLucidAuth();
