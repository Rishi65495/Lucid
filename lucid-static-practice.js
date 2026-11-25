/* Preloaded JavaScript practice for Lucid. Progress is local and derived from answers. */
(() => {
  const units = {
    u1:{title:'Unit 1 · Language foundations',items:[
      ['Which declaration is block-scoped and cannot be reassigned?',['var','let','const','static'],2,'const prevents reassignment and is block-scoped.'],
      ['Which construct handles runtime exceptions?',['if/else','try/catch','switch','for/of'],1,'try/catch handles exceptions thrown during execution.'],
      ['Which array method appends an item to the end?',['pop()','shift()','push()','slice()'],2,'push() appends one or more items to an array.'],
      ['Which operator checks both value and type?',['=','==','===','!='],2,'=== performs strict equality without type coercion.'],
      ['Which keyword exits a loop immediately?',['skip','break','stop','return'],1,'break terminates the nearest loop or switch.']
    ]},
    u2:{title:'Unit 2 · DOM, forms and objects',items:[
      ['What does DOM stand for?',['Document Object Model','Data Object Map','Display Output Mode','Document Order Method'],0,'The DOM represents a document as a tree of objects.'],
      ['Which method selects the first CSS selector match?',['querySelector()','createElement()','getElements()','appendChild()'],0,'querySelector() returns the first matching element.'],
      ['Which event is normally fired when a form is submitted?',['hover','submit','resize','focus'],1,'The submit event is dispatched when a form is submitted.'],
      ['What does a prototype provide?',['CSS styles','Inherited properties and methods','HTML validation','Database storage'],1,'JavaScript delegates property lookup through the prototype chain.']
    ]},
    u3:{title:'Unit 3 · Node.js and Express',items:[
      ['What is npm mainly used for?',['Managing packages','Drawing interfaces','Querying SQL','Compiling CSS'],0,'npm manages packages and project scripts.'],
      ['In Express, which parameter represents the incoming request?',['res','req','app','next'],1,'Route handlers receive req and res objects.'],
      ['What is a callback?',['A function passed to be called later','A CSS rule','A database','A route'],0,'A callback is a function supplied to another function for later execution.'],
      ['Which module provides file-system operations in Node.js?',['http','fs','pathOnly','eventsOnly'],1,'The built-in fs module provides file-system APIs.']
    ]},
    u4:{title:'Unit 4 · ES6, async and APIs',items:[
      ['What does a Promise represent?',['A future async result','A loop','A DOM node','A file path'],0,'A Promise represents eventual completion or failure of an asynchronous operation.'],
      ['Which keyword waits for a Promise inside an async function?',['defer','await','yield','pause'],1,'await pauses that async function until the Promise settles.'],
      ['Which format is commonly used by REST APIs?',['JSON','BMP','WAV','DOCX'],0,'JSON is a common lightweight data-interchange format.'],
      ['What is a higher-order function?',['A function that takes or returns functions','A function with many lines','A CSS selector','A database trigger'],0,'Higher-order functions accept functions as arguments or return them.']
    ]},
    u5:{title:'Unit 5 · MongoDB and SPAs',items:[
      ['MongoDB stores data as what?',['BSON documents','Fixed spreadsheet rows','HTML pages','Plain text files only'],0,'MongoDB stores BSON documents grouped into collections.'],
      ['Which MongoDB method queries documents?',['insertOne()','find()','deleteOne()','updateOne()'],1,'find() returns documents matching a query.'],
      ['What is an SPA?',['An app that updates views without full page reloads','A one-page PDF','A single server route','A static image'],0,'A single-page application updates client-side views within an app shell.'],
      ['Which library is commonly used to build React interfaces?',['React','MongoDB','Express only','npm itself'],0,'React is a JavaScript library for building user interfaces.']
    ]}
  };
  const cards=[
    ['What is lexical scope?','Variable accessibility is determined by where code is written in the source.'],
    ['What is the DOM?','A programming interface that represents an HTML document as a tree of nodes and objects.'],
    ['What is a prototype chain?','The sequence of linked prototypes used for inherited property and method lookup.'],
    ['What is a Promise?','An object representing the eventual completion or failure of an asynchronous operation.'],
    ['What is npm?','The package manager commonly used to install and manage Node.js dependencies.'],
    ['What is JSON?','A text-based data-interchange format built from objects, arrays and primitive values.'],
    ['What is MongoDB?','A document-oriented NoSQL database that stores BSON documents in collections.'],
    ['What is a REST API?','An HTTP interface that exposes resources through standard methods and representations.']
  ];
  const oral=[
    'Explain the difference between var, let and const, including scope and reassignment.',
    'Describe how the DOM represents a page and how an event handler changes it.',
    'Explain prototypes and how JavaScript resolves an inherited method.',
    'Walk through a Promise lifecycle and explain async/await.',
    'Describe how an Express route receives a request and sends a response.',
    'Explain the difference between a MongoDB database, collection and document.'
  ];
  const storeKey='lucid-js-practice-results-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(storeKey)||'{}')}catch(_){return {answers:[]}}};
  const write=x=>localStorage.setItem(storeKey,JSON.stringify(x));
  const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let cardIndex=0,oralIndex=0;
  window.startLucidStaticQuiz=id=>{
    const unit=units[id];if(!unit)return;
    let index=0,correct=0,locked=false;
    const host=document.getElementById('lucidStaticPracticeStage');
    const draw=()=>{
      locked=false;const q=unit.items[index];
      host.innerHTML='<div class="card card-padding"><div class="kicker">'+esc(unit.title)+' · Question '+(index+1)+' of '+unit.items.length+'</div><h3 style="font-size:17px;margin:12px 0">'+esc(q[0])+'</h3><div id="lucidStaticOptions">'+q[1].map((v,i)=>'<button class="secondary-button" data-choice="'+i+'" style="display:block;width:100%;text-align:left;margin:7px 0">'+esc(v)+'</button>').join('')+'</div><p id="lucidStaticFeedback" class="muted small-text" style="margin-top:12px;min-height:22px"></p><div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><span class="muted small-text">Score: '+correct+'/'+index+'</span><button class="primary-button btn-sm" id="lucidStaticNext" disabled>'+(index===unit.items.length-1?'Finish':'Next question')+'</button></div></div>';
      host.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>{
        if(locked)return;locked=true;
        const selected=Number(btn.dataset.choice),right=selected===q[2];
        if(right)correct++;
        const data=read();data.answers=data.answers||[];data.answers.push({unit:unit.title,question:q[0],correct:right,at:new Date().toISOString()});write(data);
        host.querySelectorAll('[data-choice]').forEach(b=>{b.disabled=true;if(Number(b.dataset.choice)===q[2])b.style.borderColor='#39734f';});
        if(!right)btn.style.borderColor='#bd625b';
        document.getElementById('lucidStaticFeedback').textContent=(right?'Correct. ':'Not quite. ')+q[3];
        const next=document.getElementById('lucidStaticNext');next.disabled=false;
        next.onclick=()=>{index++;if(index<unit.items.length)draw();else{host.innerHTML='<div class="card card-padding"><div class="kicker">Practice complete</div><h3 style="font-size:20px;margin:8px 0">'+esc(unit.title)+'</h3><p>You answered '+correct+' of '+unit.items.length+' correctly ('+Math.round(correct/unit.items.length*100)+'%). Your result is saved in this browser.</p><button class="secondary-button btn-sm" style="margin-top:12px" onclick="startLucidStaticQuiz(\''+id+'\')">Try again</button></div>';renderWeak();}};
      }));
    };draw();
  };
  window.startLucidStaticCards=()=>{
    const host=document.getElementById('lucidStaticPracticeStage');
    const draw=()=>{const x=cards[cardIndex];host.innerHTML='<div class="card card-padding"><div class="kicker">Flashcard '+(cardIndex+1)+' of '+cards.length+'</div><h3 style="font-size:20px;margin:14px 0">'+esc(x[0])+'</h3><p id="lucidStaticCardAnswer" hidden style="padding:12px;background:#f5f6f3;border-radius:8px">'+esc(x[1])+'</p><div style="display:flex;gap:8px;margin-top:14px"><button class="primary-button btn-sm" id="lucidStaticReveal">Reveal answer</button><button class="secondary-button btn-sm" id="lucidStaticCardNext">Next card</button></div></div>';document.getElementById('lucidStaticReveal').onclick=()=>document.getElementById('lucidStaticCardAnswer').hidden=false;document.getElementById('lucidStaticCardNext').onclick=()=>{cardIndex=(cardIndex+1)%cards.length;draw();};};draw();
  };
  window.startLucidStaticOral=()=>{
    const host=document.getElementById('lucidStaticPracticeStage');
    const draw=()=>{host.innerHTML='<div class="card card-padding"><div class="kicker">Oral recall · Prompt '+(oralIndex+1)+' of '+oral.length+'</div><h3 style="font-size:18px;margin:12px 0">'+esc(oral[oralIndex])+'</h3><p class="muted small-text">Answer aloud first. Then use the checklist to evaluate your explanation.</p><div id="lucidStaticOralChecklist" hidden style="margin-top:12px;padding:12px;background:#f5f6f3;border-radius:8px"><strong>Self-check</strong><ul style="padding-left:20px;margin-top:8px"><li>Did I define the concept accurately?</li><li>Did I explain how it works?</li><li>Did I include a relevant example?</li><li>Did I mention a limitation or comparison?</li></ul></div><div style="display:flex;gap:8px;margin-top:14px"><button class="primary-button btn-sm" id="lucidStaticOralReveal">Show self-check</button><button class="secondary-button btn-sm" id="lucidStaticOralNext">Next prompt</button></div></div>';document.getElementById('lucidStaticOralReveal').onclick=()=>document.getElementById('lucidStaticOralChecklist').hidden=false;document.getElementById('lucidStaticOralNext').onclick=()=>{oralIndex=(oralIndex+1)%oral.length;draw();};};draw();
  };
  function renderWeak(){
    const list=document.getElementById('weakAreaList');if(!list)return;
    const a=read().answers||[];if(!a.length){list.innerHTML='<p class="muted small-text">No measured weak areas yet. Complete a preloaded quiz to establish evidence; Lucid will not invent a score.</p>';return;}
    const map={};a.forEach(x=>{map[x.unit]=map[x.unit]||{total:0,wrong:0};map[x.unit].total++;if(!x.correct)map[x.unit].wrong++;});
    list.innerHTML=Object.keys(map).map(k=>{const v=map[k],pct=Math.round(v.wrong/v.total*100);return '<div class="card card-padding"><strong>'+esc(k)+'</strong><p class="muted small-text">'+v.wrong+' incorrect out of '+v.total+' answered · '+pct+'% error rate</p></div>';}).join('');
  }
  document.addEventListener('click',e=>{if(e.target.closest('[onclick*="weakareas"]'))setTimeout(renderWeak,0);});
  document.addEventListener('DOMContentLoaded',renderWeak);setTimeout(renderWeak,0);
})();