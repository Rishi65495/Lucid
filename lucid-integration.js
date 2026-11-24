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
  if(lucidSession&&lucidSession.user){try{await window.loadLucidProfile();}catch(error){console.warn('Could not load learner profile:',error.message);}try{await window.loadLucidCatalogues();}catch(error){console.warn('Could not load catalogues:',error.message);}try{await window.loadLucidGoals();}catch(error){console.warn('Could not load goals:',error.message);}try{await window.loadLucidAchievements();}catch(error){console.warn('Could not load achievements:',error.message);}try{await window.loadLucidLearningProfile();}catch(error){console.warn('Could not load learning evidence:',error.message);}}
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
  try{
    const history=(typeof state!=='undefined'?state.chatMessages:[]).slice(-8).map(m=>({role:m.role,content:m.text}));
    // Do not download PDF pages in the browser. The Edge Function routes the
    // request first and retrieves only the relevant, user-owned resource pages.
    const data=await window.invokeLucidFunction('ai-guide',{
      question:prompt,
      style:style||'',
      history,
      resource_id:typeof state!=='undefined'?state.currentResourceId:null,
      context:typeof state!=='undefined'?[
        'Current resource: '+(state.currentResourceTitle||''),
        'Current page: '+(state.currentResourcePage||1),
        'Page text: '+((state.resourcePages||[]).find(p=>Number(p.page_number)===Number(state.currentResourcePage))?.text_content||'').slice(0,7000),
        'Selected passage: '+(state.selectedText||''),
        'Annotations: '+(state.annotations||[]).slice(-8).map(x=>typeof x==='string'?x:x.text||x.note||'').join('; ')
      ].join('\\n'): ''
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
// The source-aware quiz builder is defined in index.html. Do not override it here.
window.generateFlashcards = async function(){showToast('Generating flashcards from your notes…','✦');const notes=state.annotations.slice(0,3).map(x=>typeof x==='string'?x:(x.text||x.note||''));const prompt='Create three concise flashcards from these notes: '+(notes.join('. ')||'Machine Learning fundamentals, overfitting, bias-variance tradeoff');try{const data=await window.callLearningEngine('flashcards',prompt,{annotations:notes});const cards=data.result?.cards||[];if(cards.length){state.flashcards=cards.map(c=>({q:c.front,a:c.back}));state.flashcardIndex=0;document.getElementById('flashFront').textContent=state.flashcards[0].q;document.getElementById('flashBack').textContent=state.flashcards[0].a;document.getElementById('cardProgress').textContent='Card 1 of '+cards.length+' · Click to flip';}console.log('Lucid flashcards:',data.result);showToast(cards.length?cards.length+' flashcards generated.':'No flashcards returned.','✦');}catch(error){showToast('Flashcard generation failed: '+error.message,'⚠');}};
window.evaluateOral = async function(){const q=document.getElementById('oralQuestion').textContent;const a=document.getElementById('oralAnswer').value.trim();if(!a){showToast('Write your explanation first.','⚠');return;}const resultEl=document.getElementById('oralResult');resultEl.style.display='block';resultEl.textContent='Evaluating your answer…';try{const data=await window.callLearningEngine('evaluate_recall','Evaluate coverage, accuracy and clarity. Question: '+q+' Student answer: '+a,{question:q,answer:a});const text=window.formatLearningResult(data.result);resultEl.innerHTML='<div class="note green"><strong>AI evaluation:</strong><br>'+escapeHTML(text).replace(/\n/g,'<br>')+'</div>';state.xp+=15;updateXP();showToast('Oral recall evaluated! +15 XP','🎙');}catch(error){resultEl.textContent='Evaluation failed: '+error.message;showToast('Evaluation failed.','⚠');}};
window.practiceWeak = async function(topic){openPage('practice');showToast('Preparing targeted practice for '+topic+'…','📝');try{const data=await window.callLearningEngine('quiz','Create one remedial MCQ about '+topic+' with four options, answer and explanation.',{weak_topic:topic,practice_mode:'remedial'});const qs=(data.result?.questions||[]).filter(q=>q.prompt&&Array.isArray(q.options)&&q.options.length>=2).map(q=>({q:q.prompt,opts:q.options,ans:Number(q.answer_index)||0}));if(qs.length){quizBank.unshift(...qs);currentQuizIdx=0;loadQuiz(0);showToast('Targeted AI practice ready for '+topic+'.','✦');}else{showToast('AI returned no valid practice question.','⚠');}}catch(error){showToast('Practice generation failed: '+error.message,'⚠');}};
window.askGuide = async function(){const q=document.getElementById('aiQuestion').value.trim();const el=document.getElementById('aiAnswer');if(!q){el.style.display='block';el.textContent='Ask a question first.';return;}el.style.display='block';el.textContent='Thinking…';const selected=(state.selectedText||'').trim();const context='Current resource: '+(state.currentResourceTitle||'Reading Room document')+'. '+(selected?'SELECTED PASSAGE (answer specifically about this text):\n'+selected:'No passage is currently selected. Use the current resource and notes only.')+'\nSaved annotations: '+state.annotations.slice(-5).join('; ');const answer=await window.callAIGuide('Learning context:\n'+context+'\n\nStudent question: '+q,systemInstructions[state.coachMode]||systemInstructions.Gentle);el.innerHTML='<strong>Guide ('+escapeHTML(state.coachMode)+'):</strong><br>'+escapeHTML(answer).replace(/\n/g,'<br>');};
window.quickAIModal = async function(prompt){const el=document.getElementById('aiAnswer');document.getElementById('aiQuestion').value=prompt;el.style.display='block';el.textContent='Thinking…';const selected=(state.selectedText||'').trim();const context=selected?'Selected passage (use this exact text as the subject):\n'+selected+'\n\n':'Current resource and saved annotations: '+(state.currentResourceTitle||'Reading Room document')+'; '+state.annotations.slice(-5).join('; ')+'\n\n';const answer=await window.callAIGuide(context+'Student request: '+prompt,systemInstructions[state.coachMode]||systemInstructions.Gentle);el.innerHTML='<strong>Guide:</strong><br>'+escapeHTML(answer).replace(/\n/g,'<br>');};
window.sendAIChatWithPrompt = async function(prompt){const chat=document.getElementById('aiChat');const empty=document.getElementById('aiChatEmpty');if(empty)empty.style.display='none';state.chatMessages.push({role:'user',text:prompt});const userEl=document.createElement('div');userEl.className='ai-msg user';userEl.textContent=prompt;chat.appendChild(userEl);const thinking=document.createElement('div');thinking.className='ai-msg bot thinking';thinking.textContent='✦ Thinking…';chat.appendChild(thinking);chat.scrollTop=chat.scrollHeight;document.getElementById('chatCount').textContent=state.chatMessages.length;const selected=(state.selectedText||'').trim();const context='Learner: '+state.preferences.name+'. Current study: '+(state.currentResourceTitle||'Reading Room document')+'. '+(selected?'SELECTED PASSAGE — answer the request specifically about this exact text:\\n'+selected:'No passage is selected.')+'\\nRecent annotations: '+state.annotations.slice(-5).join('; ')+'. Coach mode: '+state.coachMode+'.';let answer;try{answer=await window.callLucidAgent('Learning context:\\n'+context+'\\n\\nCoaching style: '+(systemInstructions[state.coachMode]||systemInstructions.Gentle)+'\\n\\nStudent: '+prompt);}catch(error){answer='Lucid Agent error: '+error.message;}thinking.className='ai-msg bot';thinking.style.whiteSpace='pre-wrap';thinking.textContent=answer;state.chatMessages.push({role:'bot',text:answer});chat.scrollTop=chat.scrollHeight;document.getElementById('chatCount').textContent=state.chatMessages.length;saveState();};
window.loadYoutubeURL = async function(url){if(!url){showToast('Paste a YouTube URL first.','⚠');return;}showToast('Importing YouTube content securely…','▶');try{const imported=await window.invokeLucidFunction('youtube-import',{url});openPage('video');const wrapper=document.getElementById('youtubePlayerWrapper'),player=document.getElementById('youtubePlayer'),frame=document.getElementById('ytFrame');if(imported.type==='playlist'&&imported.playlist_id){frame.src='https://www.youtube.com/embed/videoseries?list='+encodeURIComponent(imported.playlist_id);showToast('Playlist imported: '+(imported.playlist?.title||'YouTube playlist'),'▶');}else if(imported.type==='video'&&imported.item?.video_id){frame.src='https://www.youtube.com/embed/'+encodeURIComponent(imported.item.video_id)+'?rel=0&modestbranding=1&enablejsapi=1';showToast('Loaded: '+(imported.item.title||'YouTube video'),'▶');}else{throw new Error('Unsupported YouTube import response.');}if(wrapper)wrapper.style.display='none';if(player)player.style.display='block';}catch(error){showToast('YouTube import failed: '+error.message,'⚠');}};

window.recordLucidQuizAnswer = async function(answer){
  if(!lucidSession?.user||typeof lucidSupabase==='undefined')return false;
  const payload={
    question:String(answer.question||'').slice(0,2000),
    selected_option:String(answer.selectedOption||'').slice(0,1000),
    correct_option:String(answer.correctOption||'').slice(0,1000),
    is_correct:Boolean(answer.correct),
    quiz_index:Number(answer.quizIndex)||0,
    source:'practice_center'
  };
  const {error}=await lucidSupabase.rpc('track_learning_event',{
    p_event_type:'quiz_answered',
    p_catalogue_id:state.selectedCatalogueId||null,
    p_resource_id:state.currentResourceId||null,
    p_session_id:null,
    p_payload:payload
  });
  if(error)throw error;
  return true;
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
  const {data,error}=await lucidSupabase.from('learning_goals').select('id,title,description,target_type,target_value,deadline,status,created_at,completed_at').eq('owner_id',lucidSession.user.id).order('created_at',{ascending:false});
  if(error)throw error;
  const goals=data||[],list=document.getElementById('goalList');
  if(list){
    list.innerHTML='';
    if(!goals.length){list.innerHTML='<p class="muted small-text">No goals yet. Add a goal to define a measurable learning target.</p>';}
    goals.forEach(goal=>{
      const item=document.createElement('div');item.className='goal-item'+(goal.status==='completed'?' done':'');
      const check=document.createElement('button');check.type='button';check.className='goal-check'+(goal.status==='completed'?' checked':'');check.textContent=goal.status==='completed'?'✓':'';check.disabled=goal.status==='completed';check.title=goal.status==='completed'?'Completed':'Mark goal complete';check.onclick=()=>window.completeLucidGoal(goal.id);
      const body=document.createElement('div');body.style.flex='1';
      const title=document.createElement('strong');title.textContent=goal.title;
      const meta=document.createElement('div');meta.className='muted small-text';meta.textContent=[goal.target_type?.replaceAll('_',' '),goal.deadline?'Due '+new Date(goal.deadline).toLocaleDateString():null].filter(Boolean).join(' · ')||'Personal learning goal';
      body.append(title,meta);const tag=document.createElement('span');tag.className='tag';tag.textContent=goal.status==='completed'?'Completed':'Active';
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
  const {data:earned,error}=await lucidSupabase.from('user_badges').select('badge_id,awarded_at,metadata').eq('user_id',lucidSession.user.id).order('awarded_at',{ascending:false});
  if(error)throw error;
  const {data:badges,error:badgeError}=await lucidSupabase.from('badges').select('id,slug,name,family,description,rule').order('family').order('name');
  if(badgeError)throw badgeError;
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
  return {earned:earned||[],badges:badges||[]};
};
window.saveLucidQuiz = async function(input){
  if(!lucidSession?.user)throw new Error('Sign in to save quiz history.');
  const {data:quiz,error}=await lucidSupabase.from('quizzes').insert({
    owner_id:lucidSession.user.id,resource_id:input.resourceId||null,quiz_type:input.format||'mcq',
    title:input.title||'Practice quiz',difficulty:input.difficulty||'Balanced',
    source_context:{coverage:input.coverage||'whole',instructions:input.instructions||'',source_title:input.sourceTitle||'',question_count:(input.questions||[]).length}
  }).select('id').single();
  if(error)throw error;
  const rows=(input.questions||[]).map((q,index)=>({quiz_id:quiz.id,question_type:q.type||input.format||'mcq',prompt:q.prompt||q.q,options:q.options||q.opts||[],answer:{answer_index:Number(q.answer_index??q.ans)||0},explanation:q.explanation||'',difficulty:input.difficulty||'Balanced',order_index:index}));
  const saved=await lucidSupabase.from('questions').insert(rows);
  if(saved.error){await lucidSupabase.from('quizzes').delete().eq('id',quiz.id).eq('owner_id',lucidSession.user.id);throw saved.error;}
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
  if(conceptIds.length){const result=await lucidSupabase.from('concepts').select('id,title,name').in('id',conceptIds);if(!result.error)concepts=result.data||[];}
  const names=new Map(concepts.map(x=>[x.id,x.title||x.name||'Concept']));
  const weak=(mastery.data||[]).map(x=>({name:names.get(x.concept_id)||'Concept',mastery:Number(x.mastery)||0,recall:Number(x.recall)||0,application:Number(x.application)||0,updated_at:x.updated_at}));
  const completedAttempts=attempts.data||[],avgAccuracy=completedAttempts.length?Math.round(completedAttempts.reduce((sum,x)=>sum+(Number(x.max_score)>0?Number(x.score)/Number(x.max_score)*100:0),0)/completedAttempts.length):null;
  const totalFocusSeconds=(sessions.data||[]).reduce((sum,x)=>sum+(Number(x.active_seconds)||0),0);
  const profile={weakConcepts:weak,averageQuizAccuracy:avgAccuracy,completedQuizzes:completedAttempts.length,recentSessions:(sessions.data||[]).length,totalFocusMinutes:Math.round(totalFocusSeconds/60)};
  const panel=document.getElementById('aiImprovementPanel');
  if(panel){
    panel.innerHTML='';
    const p=document.createElement('p');p.className='muted small-text';p.textContent=weak.length?'Lowest measured mastery areas from your saved concept evidence:':'No concept mastery evidence has been recorded yet. Complete a source-based quiz or recall check to build your learning profile.';
    panel.appendChild(p);
    weak.slice(0,4).forEach(x=>{const line=document.createElement('div');line.className='mastery-bar-row';const label=document.createElement('span');label.className='label';label.textContent=x.name;const track=document.createElement('div');track.className='progress-track';const fill=document.createElement('span');fill.className='progress-fill gold';fill.style.width=Math.max(0,Math.min(100,x.mastery))+'%';track.appendChild(fill);const value=document.createElement('span');value.className='mastery-pct';value.textContent=Math.round(x.mastery)+'%';line.append(label,track,value);panel.appendChild(line);});
  }
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
    stage.innerHTML='';
    const errorNode=document.createElement('div');errorNode.className='pdf-render-error';errorNode.style.cssText='padding:22px;color:#9b3d38;background:#fff;border-radius:8px;';errorNode.textContent='Could not render this PDF page: '+String(error.message||error);
    stage.appendChild(errorNode);
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
  if(resource.type!=='pdf')throw new Error('This reader currently opens PDF resources. Use the matching classroom for videos.');
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
