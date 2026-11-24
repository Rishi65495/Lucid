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
  if(lucidSession&&lucidSession.user){try{await window.loadLucidProfile();}catch(error){console.warn('Could not load learner profile:',error.message);}try{await window.loadLucidCatalogues();}catch(error){console.warn('Could not load catalogues:',error.message);}}
};
window.handleAuthSubmit = async function(event){ event.preventDefault(); const email=document.getElementById('authEmail').value.trim(); const password=document.getElementById('authPassword').value; const button=document.getElementById('authSubmit'); button.disabled=true; button.textContent=lucidAuthMode==='signup'?'Creating account…':'Signing in…'; lucidAuthMessage(''); try { if(lucidAuthMode==='signup'){ const {data,error}=await lucidSupabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}}); if(error)throw error; if(data.session){window.updateLucidAuthUI(data.session);lucidAuthMessage('Account created. You are signed in.','success');}else{lucidAuthMessage('Account created. Check your email to confirm it, then return here and sign in.','success');} } else { const {data,error}=await lucidSupabase.auth.signInWithPassword({email,password}); if(error)throw error; window.updateLucidAuthUI(data.session); if(typeof showToast==='function')showToast('Signed in securely.','✓'); } } catch(error){lucidAuthMessage(error?.message||'Authentication failed. Please try again.','error');} finally {button.disabled=false;button.textContent=lucidAuthMode==='signup'?'Create account':'Sign in';} };
window.signOutLucid = async function(){const {error}=await lucidSupabase.auth.signOut();if(error){showToast('Sign out failed: '+error.message,'⚠');return;}window.updateLucidAuthUI(null);showToast('You have signed out.','✓');};
window.invokeLucidFunction = async function(name,body){
  if(!lucidSession)throw new Error('Please sign in before using Lucid AI.');
  const {data:{session},error:sessionError}=await lucidSupabase.auth.getSession();
  if(sessionError)throw new Error('Could not refresh your sign-in session: '+sessionError.message);
  if(!session?.access_token)throw new Error('Your sign-in session expired. Sign in again.');
  const response=await fetch(LUCID_SUPABASE_URL+'/functions/v1/'+encodeURIComponent(name),{
    method:'POST',
    headers:{'Authorization':'Bearer '+session.access_token,'apikey':LUCID_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify(body||{})
  });
  const raw=await response.text();
  let payload={};try{payload=raw?JSON.parse(raw):{};}catch(_){payload={error:raw||'The server returned an unreadable response.'};}
  if(!response.ok)throw new Error('HTTP '+response.status+' · '+(payload.error||payload.message||payload.msg||raw||'Edge Function request failed'));
  if(payload&&payload.error)throw new Error(payload.error);
  return payload;
};
window.callAIGuide = async function(prompt,style){
  try{
    const history=(typeof state!=='undefined'?state.chatMessages:[]).slice(-8).map(m=>({role:m.role,content:m.text}));
    // Do not download PDF pages in the browser. The Edge Function routes the
    // request first and retrieves only the relevant, user-owned resource pages.
    const data=await window.invokeLucidFunction('ai-guide',{
      question:prompt,
      style:style||'',
      history,
      resource_id:typeof state!=='undefined'?state.currentResourceId:null
    });
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
window.askGuide = async function(){const q=document.getElementById('aiQuestion').value.trim();const el=document.getElementById('aiAnswer');if(!q){el.style.display='block';el.textContent='Ask a question first.';return;}el.style.display='block';el.textContent='Thinking…';const selected=(state.selectedText||'').trim();const context='Current resource: '+(state.currentResourceTitle||'Reading Room document')+'. '+(selected?'SELECTED PASSAGE (answer specifically about this text):\n'+selected:'No passage is currently selected. Use the current resource and notes only.')+'\nSaved annotations: '+state.annotations.slice(-5).join('; ');const answer=await window.callAIGuide('Learning context:\n'+context+'\n\nStudent question: '+q,systemInstructions[state.coachMode]||systemInstructions.Gentle);el.innerHTML='<strong>Guide ('+escapeHTML(state.coachMode)+'):</strong><br>'+escapeHTML(answer).replace(/\n/g,'<br>');};
window.quickAIModal = async function(prompt){const el=document.getElementById('aiAnswer');document.getElementById('aiQuestion').value=prompt;el.style.display='block';el.textContent='Thinking…';const selected=(state.selectedText||'').trim();const context=selected?'Selected passage (use this exact text as the subject):\n'+selected+'\n\n':'Current resource and saved annotations: '+(state.currentResourceTitle||'Reading Room document')+'; '+state.annotations.slice(-5).join('; ')+'\n\n';const answer=await window.callAIGuide(context+'Student request: '+prompt,systemInstructions[state.coachMode]||systemInstructions.Gentle);el.innerHTML='<strong>Guide:</strong><br>'+escapeHTML(answer).replace(/\n/g,'<br>');};
window.sendAIChatWithPrompt = async function(prompt){const chat=document.getElementById('aiChat');const empty=document.getElementById('aiChatEmpty');if(empty)empty.style.display='none';state.chatMessages.push({role:'user',text:prompt});const userEl=document.createElement('div');userEl.className='ai-msg user';userEl.textContent=prompt;chat.appendChild(userEl);const thinking=document.createElement('div');thinking.className='ai-msg bot thinking';thinking.textContent='✦ Thinking…';chat.appendChild(thinking);chat.scrollTop=chat.scrollHeight;document.getElementById('chatCount').textContent=state.chatMessages.length;const selected=(state.selectedText||'').trim();const context='Learner: '+state.preferences.name+'. Current study: '+(state.currentResourceTitle||'Reading Room document')+'. '+(selected?'SELECTED PASSAGE — answer the request specifically about this exact text:\\n'+selected:'No passage is selected.')+'\\nRecent annotations: '+state.annotations.slice(-5).join('; ')+'. Coach mode: '+state.coachMode+'.';let answer;try{answer=await window.callLucidAgent('Learning context:\\n'+context+'\\n\\nCoaching style: '+(systemInstructions[state.coachMode]||systemInstructions.Gentle)+'\\n\\nStudent: '+prompt);}catch(error){answer='Lucid Agent error: '+error.message;}thinking.className='ai-msg bot';thinking.style.whiteSpace='pre-wrap';thinking.textContent=answer;state.chatMessages.push({role:'bot',text:answer});chat.scrollTop=chat.scrollHeight;document.getElementById('chatCount').textContent=state.chatMessages.length;saveState();};
window.loadYoutubeURL = async function(url){if(!url){showToast('Paste a YouTube URL first.','⚠');return;}showToast('Importing YouTube content securely…','▶');try{const imported=await window.invokeLucidFunction('youtube-import',{url});openPage('video');const wrapper=document.getElementById('youtubePlayerWrapper'),player=document.getElementById('youtubePlayer'),frame=document.getElementById('ytFrame');if(imported.type==='playlist'&&imported.playlist_id){frame.src='https://www.youtube.com/embed/videoseries?list='+encodeURIComponent(imported.playlist_id);showToast('Playlist imported: '+(imported.playlist?.title||'YouTube playlist'),'▶');}else if(imported.type==='video'&&imported.item?.video_id){frame.src='https://www.youtube.com/embed/'+encodeURIComponent(imported.item.video_id)+'?rel=0&modestbranding=1&enablejsapi=1';showToast('Loaded: '+(imported.item.title||'YouTube video'),'▶');}else{throw new Error('Unsupported YouTube import response.');}if(wrapper)wrapper.style.display='none';if(player)player.style.display='block';}catch(error){showToast('YouTube import failed: '+error.message,'⚠');}};

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
    if(catalogueId){const linked=await lucidSupabase.from('catalogue_resources').insert({catalogue_id:catalogueId,resource_id:resourceId,order_index:0,status:'active'});if(linked.error)throw linked.error;}
    for(let i=0;i<pages.length;i+=40){
      const batch=pages.slice(i,i+40).map(row=>Object.assign({resource_id:resourceId},row));
      const inserted=await lucidSupabase.from('resource_pages').insert(batch);if(inserted.error)throw inserted.error;
    }
    const journey=await lucidSupabase.from('learning_journeys').insert({owner_id:user.id,catalogue_id:catalogueId||null,resource_id:resourceId,position:{page:1},last_activity_at:new Date().toISOString()});
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
window.createLucidCatalogue = async function(input){
  if(!lucidSession?.user)throw new Error('Sign in first.');
  const {data,error}=await lucidSupabase.from('catalogues').insert({owner_id:lucidSession.user.id,title:input.title,description:input.description||null,icon:input.icon||'📁'}).select('id,title,description,icon').single();
  if(error)throw error;return data;
};
window.loadLucidCatalogues = async function(){
  if(!lucidSession?.user)return [];
  const userId=lucidSession.user.id;
  const {data:cats,error:catError}=await lucidSupabase.from('catalogues')
    .select('id,title,description,icon,created_at')
    .eq('owner_id',userId).order('created_at',{ascending:false});
  if(catError)throw catError;
  const {data:resources,error:resourceError}=await lucidSupabase.from('lucid_resources')
    .select('id,title,type,processing_status,metadata,created_at')
    .eq('owner_id',userId).order('created_at',{ascending:false});
  if(resourceError)throw resourceError;
  const ownedResources=resources||[];
  const ownedIds=ownedResources.map(resource=>resource.id);
  let links=[];
  if(ownedIds.length){
    const result=await lucidSupabase.from('catalogue_resources')
      .select('catalogue_id,resource_id,status,order_index')
      .eq('status','active').in('resource_id',ownedIds);
    if(result.error)throw result.error;
    links=result.data||[];
  }
  const linkByResource=new Map();
  links.forEach(link=>{
    if(!linkByResource.has(link.resource_id))linkByResource.set(link.resource_id,link.catalogue_id);
  });
  state.uploadedBooks=ownedResources.map(resource=>({
    id:resource.id,resourceId:resource.id,name:resource.title,type:resource.type,
    pages:Number(resource.metadata?.page_count||0),status:resource.processing_status,
    catalogueId:linkByResource.get(resource.id)||null
  }));
  if(state.currentResourceId&&!ownedIds.includes(state.currentResourceId)){
    state.currentResourceId=null;state.currentResourceTitle=null;state.currentResourcePage=1;state.resourcePages=[];
    saveState();
  }
  if(typeof renderUploadedBooks==='function')renderUploadedBooks();
  const countByCatalogue=new Map();
  links.forEach(link=>{
    if(!countByCatalogue.has(link.catalogue_id))countByCatalogue.set(link.catalogue_id,new Set());
    countByCatalogue.get(link.catalogue_id).add(link.resource_id);
  });
  const grid=document.getElementById('catalogueGrid');
  if(grid){
    grid.innerHTML='';
    if(!(cats||[]).length)grid.innerHTML='<div class="card card-padding muted">No catalogues yet. Create a folder to organize your resources.</div>';
    (cats||[]).forEach(cat=>{
      const card=document.createElement('article');card.className='catalogue-card card';
      const icon=document.createElement('div');icon.className='cat-icon';icon.textContent=cat.icon||'📁';
      const title=document.createElement('h3');title.style.cssText="font-family:'DM Serif Display',serif;font-size:20px;font-weight:400;";title.textContent=cat.title;
      const desc=document.createElement('p');desc.className='muted small-text';desc.style.marginTop='6px';desc.textContent=cat.description||'A folder for your study resources.';
      const count=document.createElement('p');count.className='cat-meta';count.textContent=(countByCatalogue.get(cat.id)?.size||0)+' resources';
      const actions=document.createElement('div');actions.style.cssText='display:flex;gap:7px;margin-top:14px;';
      const open=document.createElement('button');open.className='secondary-button btn-sm';open.textContent='View resources';
      open.onclick=()=>window.openLucidCatalogue(cat.id).catch(error=>showToast('Could not open catalogue: '+error.message,'⚠'));
      const add=document.createElement('button');add.className='ghost-button btn-sm';add.textContent='＋ Add PDF';
      add.onclick=()=>{const sel=document.getElementById('uploadCatalogue');if(sel)sel.value=cat.id;openModal('uploadModal');};
      actions.append(open,add);card.append(icon,title,desc,count,actions);grid.appendChild(card);
    });
  }
  const select=document.getElementById('uploadCatalogue');
  if(select){
    const chosen=state.selectedCatalogueId||select.value;
    select.innerHTML='';
    if(!(cats||[]).length){select.add(new Option('Create a catalogue first',''));select.disabled=true;}
    else{
      select.disabled=false;
      (cats||[]).forEach(cat=>select.add(new Option(cat.title,cat.id)));
      select.value=cats.some(cat=>cat.id===chosen)?chosen:cats[0].id;
    }
  }
  if(window.renderLucidAIContext)window.renderLucidAIContext();
  return cats||[];
};
window.moveLucidResourceToCatalogue = async function(resourceId,catalogueId){
  if(!lucidSession?.user)throw new Error('Sign in first.');
  if(!resourceId)throw new Error('Missing resource ID.');
  const {data:resource,error:resourceError}=await lucidSupabase.from('lucid_resources').select('id').eq('id',resourceId).eq('owner_id',lucidSession.user.id).single();
  if(resourceError)throw resourceError;
  if(catalogueId){
    const {data:catalogue,error:catalogueError}=await lucidSupabase.from('catalogues')
      .select('id').eq('id',catalogueId).eq('owner_id',lucidSession.user.id).maybeSingle();
    if(catalogueError)throw catalogueError;
    if(!catalogue)throw new Error('The selected catalogue is not available in your account.');
  }
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
  if(!id)throw new Error('Choose a catalogue first.');
  const userId=lucidSession.user.id;
  const {data:cat,error:catError}=await lucidSupabase.from('catalogues')
    .select('id,title,description').eq('id',id).eq('owner_id',userId).maybeSingle();
  if(catError)throw catError;
  if(!cat)throw new Error('Catalogue not found or you do not have access to it.');
  state.selectedCatalogueId=id;saveState();
  const panel=document.getElementById('catalogueResourcesPanel');
  const heading=document.getElementById('catalogueResourcesTitle');
  const list=document.getElementById('catalogueResourcesList');
  const empty=document.getElementById('catalogueResourcesEmpty');
  if(panel)panel.style.display='block';
  if(heading)heading.textContent=cat.title;
  if(list)list.innerHTML='<div class="muted small-text">Loading resources…</div>';
  const {data:links,error:linkError}=await lucidSupabase.from('catalogue_resources')
    .select('resource_id,order_index,status').eq('catalogue_id',id).eq('status','active')
    .order('order_index',{ascending:true});
  if(linkError)throw linkError;
  const resourceIds=[...new Set((links||[]).map(link=>link.resource_id).filter(Boolean))];
  let resources=[];
  if(resourceIds.length){
    const result=await lucidSupabase.from('lucid_resources')
      .select('id,title,type,processing_status,metadata')
      .eq('owner_id',userId).in('id',resourceIds);
    if(result.error)throw result.error;
    resources=result.data||[];
  }
  const resourceById=new Map(resources.map(resource=>[resource.id,resource]));
  const seenResourceIds=new Set();
  const rows=(links||[]).map(link=>({link,resource:resourceById.get(link.resource_id)}))
    .filter(row=>{
      if(!row.resource||seenResourceIds.has(row.link.resource_id))return false;
      seenResourceIds.add(row.link.resource_id);
      return true;
    });
  if(list)list.innerHTML='';
  if(empty)empty.style.display=rows.length?'none':'block';
  rows.forEach(({link,resource})=>{
    const card=document.createElement('article');card.className='book-card card';
    const main=document.createElement('div');main.className='book-main';
    const cover=document.createElement('div');cover.className='book-cover cover-purple';
    cover.textContent=resource.type==='pdf'?'PDF':String(resource.type||'FILE').toUpperCase();
    const info=document.createElement('div');
    const title=document.createElement('div');title.className='book-title';title.textContent=resource.title||'Untitled resource';
    const status=document.createElement('div');status.className='book-author';
    status.textContent=(resource.metadata?.page_count?resource.metadata.page_count+' pages · ':'')+(resource.processing_status||'saved');
    info.append(title,status);main.append(cover,info);
    const footer=document.createElement('div');footer.className='book-footer';
    const tag=document.createElement('span');tag.className='tag';tag.textContent=resource.type||'resource';
    const open=document.createElement('button');open.className='primary-button btn-sm';
    open.textContent=resource.type==='pdf'?'Open PDF →':'Open resource →';
    open.onclick=()=>window.openLucidResource(resource.id)
      .catch(error=>showToast('Could not open '+(resource.title||'resource')+': '+error.message,'⚠'));
    footer.append(tag,open);card.append(main,footer);list?.appendChild(card);
  });
  if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
  return rows.length;
};
window.renderLucidReaderPage = function(){
  const pages=state.resourcePages||[];
  const index=Math.max(0,Math.min(pages.length-1,(state.currentResourcePage||1)-1));
  const row=pages[index];
  const title=state.currentResourceTitle||'Selected resource';
  const meta=document.getElementById('docMeta'),heading=document.getElementById('docTitle');
  const content=document.getElementById('readerPageContent'),empty=document.getElementById('readerEmptyState');
  const footer=document.getElementById('readerDocumentFooter'),tag=document.getElementById('pageTag');
  const kicker=document.getElementById('readerKicker'),status=document.getElementById('readerPageStatus');
  if(meta)meta.textContent=title+(row?' · Page '+row.page_number:'');
  if(heading)heading.textContent=row?title:'No readable text found';
  if(kicker)kicker.textContent=title;
  if(tag)tag.textContent=row?'Page '+row.page_number+' of '+pages.length:'No readable pages';
  if(status)status.textContent=row?'Page '+row.page_number+' of '+pages.length:'No readable pages';
  if(content)content.innerHTML='';
  if(!row){
    if(empty)empty.style.display='block';
    if(footer)footer.style.display='none';
    return;
  }
  if(empty)empty.style.display='none';
  if(footer)footer.style.display='flex';
  if(content){
    const p=document.createElement('p');
    p.textContent=row.text_content||'No extractable text on this page. This may be a scanned page and need OCR.';
    content.appendChild(p);
  }
};
window.openLucidResource = async function(id){
  if(!lucidSession?.user)throw new Error('Sign in first.');
  if(typeof id!=='string'||!id.trim())throw new Error('The selected resource has no valid ID.');
  const resourceId=id.trim(),userId=lucidSession.user.id;
  // Clear the previous document immediately so a failed or slow request can
  // never leave an unrelated PDF visible as if it were the selected resource.
  state.currentResourceId=null;state.currentResourceTitle=null;
  state.currentResourcePage=1;state.resourcePages=[];
  saveState();if(window.renderLucidAIContext)window.renderLucidAIContext();openPage('reader');
  const meta=document.getElementById('docMeta'),heading=document.getElementById('docTitle');
  const content=document.getElementById('readerPageContent'),empty=document.getElementById('readerEmptyState');
  const footer=document.getElementById('readerDocumentFooter'),tag=document.getElementById('pageTag');
  const kicker=document.getElementById('readerKicker');
  if(meta)meta.textContent='Loading selected resource…';
  if(heading)heading.textContent='Loading PDF…';
  if(kicker)kicker.textContent='Loading';
  if(tag)tag.textContent='Loading…';
  if(content)content.innerHTML='';
  if(empty)empty.style.display='none';
  if(footer)footer.style.display='none';
  try{
    const {data:resource,error:resourceError}=await lucidSupabase.from('lucid_resources')
      .select('id,title,type,processing_status,metadata')
      .eq('id',resourceId).eq('owner_id',userId).maybeSingle();
    if(resourceError)throw resourceError;
    if(!resource)throw new Error('This resource was not found in your library or you do not have access to it.');
    if(resource.type!=='pdf')throw new Error('This reader currently opens PDF resources. Use the matching classroom for videos.');
    const {data:pages,error:pageError}=await lucidSupabase.from('resource_pages')
      .select('page_number,text_content').eq('resource_id',resourceId)
      .order('page_number',{ascending:true});
    if(pageError)throw pageError;
    state.currentResourceId=resource.id;state.currentResourceTitle=resource.title;
    state.currentResourcePage=1;state.resourcePages=pages||[];
    saveState();if(window.renderLucidAIContext)window.renderLucidAIContext();window.renderLucidReaderPage();
    if(!pages?.length)showToast('This PDF has no extracted text yet; OCR may be needed.','⚠');
    else showToast('Opened '+resource.title+' in Reading Room.','📖');
    return true;
  }catch(error){
    state.currentResourceId=null;state.currentResourceTitle=null;
    state.currentResourcePage=1;state.resourcePages=[];
    saveState();if(window.renderLucidAIContext)window.renderLucidAIContext();
    if(meta)meta.textContent='No document selected';
    if(heading)heading.textContent='Could not open this PDF';
    if(kicker)kicker.textContent='Open failed';
    if(tag)tag.textContent='No page';
    if(content)content.innerHTML='';
    if(empty)empty.style.display='block';
    if(footer)footer.style.display='none';
    throw error;
  }
};
window.changeLucidReaderPage = function(delta){
  const pages=state.resourcePages||[];if(!pages.length)return;
  state.currentResourcePage=Math.max(1,Math.min(pages.length,(state.currentResourcePage||1)+delta));
  saveState();window.renderLucidReaderPage();
};
window.selectLucidResource = function(id){
  state.currentResourceId=id;
  const item=state.uploadedBooks.find(x=>(x.resourceId||x.id)===id);
  state.currentResourceTitle=item&&item.name||'Selected PDF';
  saveState();
  if(window.renderLucidAIContext)window.renderLucidAIContext();
  showToast('Selected resource for AI context.','📄');
  openPage('aiGuide');
};

window.renderLucidAIContext = function(){
  const resource=document.getElementById('aiCurrentResourceTag');
  const page=document.getElementById('aiCurrentPageTag');
  const selected=document.getElementById('aiSelectedTextTag');
  if(resource)resource.textContent=state.currentResourceTitle?'📄 '+state.currentResourceTitle:'No PDF selected';
  if(page)page.textContent=state.currentResourcePage?'Page '+state.currentResourcePage:'No page selected';
  if(selected)selected.textContent=state.selectedText?'Selected passage ready':'No passage selected';
};
window.continueLucidReading = async function(){
  const books=state.uploadedBooks||[];
  const current=books.find(book=>(book.resourceId||book.id)===state.currentResourceId&&book.type==='pdf');
  const target=current||books.find(book=>book.type==='pdf');
  if(!target){
    openPage('library');
    showToast('Import a PDF to start reading.','📄');
    return false;
  }
  try{return await window.openLucidResource(target.resourceId||target.id);}
  catch(error){
    openPage('library');
    showToast('Could not continue reading: '+error.message,'⚠');
    return false;
  }
};
window.renderLucidAIContext();

window.initLucidAuth();
