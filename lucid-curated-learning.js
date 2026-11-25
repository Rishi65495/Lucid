/* Lucid curated practice packs and honest goal progress.
 * Source: University MCA Syllabus 2022-23, JavaScript Elective MCA557 B/C
 * and Machine Learning Techniques MCA556. Curated content is labelled
 * syllabus-based; learner progress is computed only from recorded attempts.
 */
(() => {
  const packs = [
    {id:'js-unit-1', subject:'JavaScript', unit:'Unit 1 · Language foundations', type:'quiz', questions:[
      {q:'Which declaration creates a block-scoped variable that cannot be reassigned?',opts:['var','let','const','static'],ans:2,why:'const is block-scoped and prevents reassignment of the binding.'},
      {q:'Which construct is used to handle runtime exceptions in JavaScript?',opts:['if…else','try…catch','for…of','switch'],ans:1,why:'try…catch handles exceptions thrown while executing code.'},
      {q:'Which method adds one or more elements to the end of an array?',opts:['shift()','unshift()','push()','pop()'],ans:2,why:'push() appends elements to the end of an array.'},
      {q:'Which statement best describes a JavaScript function declaration?',opts:['A reusable block of code','A database table','An HTML attribute','A CSS selector'],ans:0,why:'Functions package reusable behaviour and can accept parameters.'},
      {q:'Which operator checks value and type equality?',opts:['==','=','===','!='],ans:2,why:'=== performs strict equality without type coercion.'}
    ]},
    {id:'js-unit-2',subject:'JavaScript',unit:'Unit 2 · DOM, forms and objects',type:'quiz',questions:[
      {q:'What does DOM stand for?',opts:['Data Object Model','Document Object Model','Display-Oriented Mode','Document Output Method'],ans:1,why:'The DOM represents an HTML document as a tree of objects.'},
      {q:'Which browser API selects the first element matching a CSS selector?',opts:['getElementById()','querySelector()','createElement()','append()'],ans:1,why:'querySelector() returns the first matching element.'},
      {q:'What is a prototype used for in JavaScript?',opts:['Styling elements','Delegating property and method lookup','Compiling HTML','Storing cookies only'],ans:1,why:'Objects can inherit behaviour through the prototype chain.'},
      {q:'Which event commonly fires when a form is submitted?',opts:['submit','hover','resize','scroll'],ans:0,why:'The submit event is dispatched when a form is submitted.'}
    ]},
    {id:'js-unit-3',subject:'JavaScript',unit:'Unit 3 · Node.js and asynchronous code',type:'quiz',questions:[
      {q:'What is npm primarily used for in Node.js projects?',opts:['Managing packages','Rendering CSS','Creating SQL tables','Editing images'],ans:0,why:'npm installs and manages JavaScript packages and project scripts.'},
      {q:'What does a callback represent?',opts:['A function passed to be called later','A CSS class','A database index','A browser tab'],ans:0,why:'Callbacks are functions supplied to another function for later execution.'},
      {q:'In HTTP, which object represents the incoming request in an Express handler?',opts:['res','req','app','nextPage'],ans:1,why:'Express route handlers receive req and res objects.'}
    ]},
    {id:'js-unit-4',subject:'JavaScript',unit:'Unit 4 · ES6+, APIs and testing',type:'quiz',questions:[
      {q:'What does Promise represent?',opts:['A future completion or failure of an asynchronous operation','A loop counter','A DOM node','A module filename'],ans:0,why:'A Promise represents the eventual state and value of an asynchronous operation.'},
      {q:'Which syntax pauses an async function until a Promise settles?',opts:['defer','await','yieldNow','pause'],ans:1,why:'await suspends execution of the async function until the Promise settles.'},
      {q:'Which format is commonly used to exchange structured data with REST APIs?',opts:['JSON','BMP','WAV','DOCX'],ans:0,why:'JSON is a widely used lightweight data-interchange format.'}
    ]},
    {id:'js-unit-5',subject:'JavaScript',unit:'Unit 5 · MongoDB and SPA frameworks',type:'quiz',questions:[
      {q:'MongoDB stores records primarily as which structure?',opts:['Rows in fixed tables','BSON documents in collections','CSV sheets','HTML elements'],ans:1,why:'MongoDB stores BSON documents grouped into collections.'},
      {q:'Which operation reads matching documents from a MongoDB collection?',opts:['insertOne()','find()','deleteOne()','updateOne()'],ans:1,why:'find() queries documents in a collection.'},
      {q:'What is a single-page application (SPA)?',opts:['An app that updates views without full-page reloads for each navigation','A PDF with one page','A server with one route','A static image'],ans:0,why:'SPAs update the client-side view while maintaining an application shell.'}
    ]},
    {id:'js-flashcards',subject:'JavaScript',unit:'JavaScript · Core flashcards',type:'flashcards',cards:[
      ['What is lexical scope?','Variable accessibility is determined by where code is written in the source.'],
      ['What is the DOM?','A programming interface representing an HTML document as a tree of nodes and objects.'],
      ['What is a Promise?','An object representing the eventual completion or failure of an asynchronous operation.'],
      ['What is a prototype chain?','The linked sequence of prototypes used for inherited property and method lookup.'],
      ['What is npm?','The package manager commonly used to install and manage Node.js project dependencies.'],
      ['What is JSON?','A text-based data-interchange format using objects, arrays, strings, numbers, booleans and null.'],
      ['What is MongoDB?','A document-oriented NoSQL database that stores BSON documents in collections.']
    ]},
    {id:'js-oral-recall',subject:'JavaScript',unit:'JavaScript · Oral recall prompts',type:'oral',prompts:[
      'Explain the difference between var, let and const, including scope and reassignment.',
      'Describe how the DOM represents an HTML page and how an event handler changes it.',
      'Explain prototypes and how JavaScript resolves an inherited method.',
      'Walk through the lifecycle of a Promise and explain async/await.',
      'Describe how an Express route receives a request and sends a response.',
      'Explain the difference between a MongoDB database, collection and document.'
    ]}
  ];
  const mlTopics = [
    ['Unit 1','Learning types, hypothesis space, inductive bias, evaluation and cross-validation'],
    ['Unit 1','Linear regression, decision trees and overfitting'],
    ['Unit 2','Precision, recall, F1-score, MSE and model flexibility'],
    ['Unit 2','K-means, vector quantization and self-organizing feature maps'],
    ['Unit 2','Bayes learning, hierarchical clustering and Gaussian mixtures'],
    ['Unit 3','Logistic regression, SVM and kernel SVM'],
    ['Unit 3','Perceptron, multilayer networks and backpropagation'],
    ['Unit 4','Decision trees, CART, bagging and boosting'],
    ['Unit 4','Combining classifiers, probability and nearest neighbours'],
    ['Unit 5','PCA, LDA, factor analysis, ICA, LLE and Isomap'],
    ['Unit 5','Genetic algorithms and evolutionary learning'],
    ['Unit 5','Reinforcement learning and Markov decision processes']
  ];
  const key='lucid-curated-practice-v1';
  const load=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(_){return {}}};
  const save=v=>localStorage.setItem(key,JSON.stringify(v));
  let data=load(); if(!Array.isArray(data.hidden))data.hidden=[];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const style=document.createElement('style');style.textContent='.curated-pack{border:1px solid var(--line);border-radius:15px;padding:15px;background:#fffdf8}.curated-pack h3{margin-bottom:5px}.curated-meta{font-size:11px;color:var(--muted)}.curated-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.curated-actions button{font-size:11px}.curated-q{font-weight:800;margin:13px 0}.curated-answer{display:block;width:100%;text-align:left;margin:7px 0;padding:11px;border:1px solid var(--line);border-radius:10px;background:white;color:var(--ink)}.curated-answer:disabled{opacity:.8}.curated-insight{margin-top:14px;padding:15px;border:1px solid var(--line);border-radius:14px;background:#fff}.curated-meter{height:8px;background:#e8eee7;border-radius:9px;overflow:hidden}.curated-meter span{display:block;height:100%;background:var(--forest-2)}';
  document.head.appendChild(style);
  function ensurePractice(){
    const page=document.getElementById('practice');if(!page||document.getElementById('curatedPractice'))return;
    const root=document.createElement('section');root.id='curatedPractice';root.className='card card-padding';root.style.marginBottom='18px';
    root.innerHTML='<div class="kicker">Offline-ready · MCA syllabus based</div><h2 style="margin:7px 0">JavaScript practice library</h2><p class="muted small-text">Curated from MCA557 B/C Units 1–5. These activities work without an AI request. Your attempts are saved in this browser; cloud mastery is not claimed.</p><div id="curatedPacks" class="grid three-col" style="margin-top:15px"></div><div id="curatedRunner" style="margin-top:15px"></div>';
    const heading=page.querySelector('.page-heading');heading.insertAdjacentElement('afterend',root);renderPacks();
  }
  function renderPacks(){
    const host=document.getElementById('curatedPacks');if(!host)return;
    host.innerHTML=packs.filter(p=>!data.hidden.includes(p.id)).map(p=>'<article class="curated-pack"><h3>'+esc(p.unit)+'</h3><div class="curated-meta">'+esc(p.subject)+' · '+(p.questions?.length||p.cards?.length||p.prompts?.length)+' items · '+p.type+'</div><div class="curated-actions"><button class="primary-button btn-sm" onclick="window.startCuratedPack(\''+p.id+'\')">Start</button><button class="danger-button btn-sm" onclick="window.removeCuratedPack(\''+p.id+'\')">Remove</button></div></article>').join('');
    if(!host.innerHTML)host.innerHTML='<p class="muted small-text">All curated activities removed. Reload to restore the original pack.</p>';
  }
  window.removeCuratedPack=id=>{if(!confirm('Remove this preloaded activity from this browser?'))return;data.hidden.push(id);save(data);renderPacks();document.getElementById('curatedRunner').innerHTML='';};
  window.startCuratedPack=id=>{
    const p=packs.find(x=>x.id===id);if(!p)return;const host=document.getElementById('curatedRunner');let index=0,score=0;
    if(p.type==='quiz'){
      const draw=()=>{const q=p.questions[index];host.innerHTML='<div class="curated-pack"><div class="curated-meta">'+esc(p.unit)+' · Question '+(index+1)+'/'+p.questions.length+'</div><div class="curated-q">'+esc(q.q)+'</div><div id="curatedOptions">'+q.opts.map((o,i)=>'<button class="curated-answer" data-i="'+i+'">'+esc(o)+'</button>').join('')+'</div><p id="curatedFeedback" class="small-text"></p><div class="curated-actions"><button class="secondary-button btn-sm" id="curatedNext" disabled>Next</button></div></div>';
      host.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{host.querySelectorAll('[data-i]').forEach(x=>x.disabled=true);const correct=Number(b.dataset.i)===q.ans;if(correct)score++;b.style.borderColor=correct?'#3b7957':'#bd625b';document.getElementById('curatedFeedback').textContent=(correct?'Correct. ':'Not quite. ')+q.why;const next=document.getElementById('curatedNext');next.disabled=false;next.onclick=()=>{index++;if(index<p.questions.length)draw();else{data.attempts=data.attempts||{};data.attempts[id]=(data.attempts[id]||0)+1;data.scores=data.scores||{};data.scores[id]={correct:score,total:p.questions.length,at:new Date().toISOString()};save(data);host.innerHTML='<div class="curated-pack"><h3>Quiz complete</h3><p>Score: '+score+'/'+p.questions.length+' ('+Math.round(score/p.questions.length*100)+'%). This is a locally saved practice result.</p><button class="secondary-button btn-sm" onclick="window.startCuratedPack(\''+id+'\')">Retry</button></div>';}};});};draw();
    }else if(p.type==='flashcards'){drawCard();}
    else {host.innerHTML='<div class="curated-pack"><div class="curated-meta">Speak your answer aloud, then reveal the checklist.</div><h3 id="oralPrompt" style="margin:12px 0">'+esc(p.prompts[0])+'</h3><button class="secondary-button btn-sm" id="oralReveal">Reveal self-check</button><p id="oralCheck" class="small-text" style="margin-top:12px" hidden>Check whether your explanation includes: definition, mechanism, a relevant example, and a limitation or comparison where applicable.</p><div class="curated-actions"><button class="primary-button btn-sm" id="oralNext">Next prompt</button></div></div>';document.getElementById('oralReveal').onclick=()=>document.getElementById('oralCheck').hidden=false;document.getElementById('oralNext').onclick=()=>{index=(index+1)%p.prompts.length;document.getElementById('oralPrompt').textContent=p.prompts[index];document.getElementById('oralCheck').hidden=true;};}
    function drawCard(){const card=p.cards[index];host.innerHTML='<div class="curated-pack"><div class="curated-meta">Flashcard '+(index+1)+'/'+p.cards.length+' · Click reveal to check your recall</div><h3 style="margin:14px 0">'+esc(card[0])+'</h3><p id="flashAnswer" hidden>'+esc(card[1])+'</p><div class="curated-actions"><button class="primary-button btn-sm" id="revealCurated">Reveal</button><button class="secondary-button btn-sm" id="nextCurated">Next card</button></div></div>';document.getElementById('revealCurated').onclick=()=>document.getElementById('flashAnswer').hidden=false;document.getElementById('nextCurated').onclick=()=>{index=(index+1)%p.cards.length;drawCard();};}
  };
  function ensureGoal(){
    const page=document.getElementById('goals');if(!page||document.getElementById('mlGoalCard'))return;
    const card=document.createElement('article');card.id='mlGoalCard';card.className='card card-padding';card.style.marginBottom='18px';
    card.innerHTML='<div class="kicker">MCA556 · Machine Learning Techniques</div><h2 style="margin:7px 0">Complete Machine Learning</h2><p class="muted small-text">Syllabus roadmap · Progress is based on verified activity only. No attempts are recorded yet.</p><div class="grid four-col" style="margin:17px 0"><div><div class="analytics-number">0%</div><div class="muted small-text">Verified completion</div></div><div><div class="analytics-number">0/'+mlTopics.length+'</div><div class="muted small-text">Topics verified</div></div><div><div class="analytics-number">—</div><div class="muted small-text">Quiz accuracy</div></div><div><div class="analytics-number">—</div><div class="muted small-text">Recall retention</div></div></div><div class="curated-meter"><span style="width:0%"></span></div><div id="mlTopicRoadmap" style="display:grid;gap:9px;margin-top:15px"></div><p class="muted small-text" style="margin-top:13px">Syllabus coverage is a roadmap, not evidence of mastery. Topic completion will update only after linked study and assessment events are persisted.</p>';
    page.querySelector('.page-heading').insertAdjacentElement('afterend',card);
    document.getElementById('mlTopicRoadmap').innerHTML=mlTopics.map((t,i)=>'<div class="curated-pack"><div class="curated-meta">'+esc(t[0])+' · Not yet verified</div><strong>'+esc(t[1])+'</strong></div>').join('');
  }
  function ensureReaderInsight(){
    const page=document.getElementById('reader');if(!page||document.getElementById('readerLearningInsight'))return;
    const box=document.createElement('div');box.id='readerLearningInsight';box.className='curated-insight';box.innerHTML='<div class="kicker">Reading insights</div><h3 style="margin:6px 0">Study evidence</h3><p id="readerInsightText" class="muted small-text">Open a PDF to see its reading context. Extracted text remains separate from the original PDF display.</p>';
    const toolbar=page.querySelector('.reader-toolbar');toolbar.insertAdjacentElement('afterend',box);
    // Keep this panel static. Observing the entire Reader subtree while
    // mutating text inside the observer caused a self-triggering mutation loop.
    const insight=document.getElementById('readerInsightText');
    const refreshInsight=()=>{
      const title=document.getElementById('docTitle')?.textContent||'';
      const pageNo=document.getElementById('pdfPageInput')?.value||'—';
      if(insight) insight.textContent=title&&title!=='Choose a resource to begin reading'
        ? 'Currently reading: '+title+'. PDF page '+pageNo+'. Use Ask AI for explanations; quiz and mastery metrics appear only after recorded attempts.'
        : 'Open a PDF to see its reading context.';
    };
    page.querySelector('#pdfPageInput')?.addEventListener('change',refreshInsight);
    page.querySelector('#pdfPageInput')?.addEventListener('input',refreshInsight);
    refreshInsight();
  }
  function init(){ensureGoal();ensureReaderInsight();}
  document.addEventListener('DOMContentLoaded',init);setTimeout(init,0);
  document.addEventListener('click',e=>{if(e.target.closest('[data-page="goals"]'))setTimeout(ensureGoal,0);if(e.target.closest('[data-page="reader"]'))setTimeout(ensureReaderInsight,0);});
})();