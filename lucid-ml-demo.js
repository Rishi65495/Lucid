/* Lucid Machine Learning demo pack — MCA556 syllabus-aligned.
 * Practice attempts and preview badges are stored locally in this browser.
 * Preview badges are clearly separated from server-earned achievements.
 */
(() => {
  const packs = [
    {id:"ml-unit-1",unit:"Unit 1",title:"Foundations & Learning Systems",topics:"Learning types, inductive bias, evaluation, regression, decision trees",questions:[
      {q:"A model is trained using labeled input-output examples. Which learning paradigm is being used?",o:["Unsupervised learning","Supervised learning","Reinforcement learning","Self-supervised clustering"],a:1,e:"Supervised learning uses examples where the target output or label is supplied."},
      {q:"What does inductive bias describe in a learning algorithm?",o:["The assumptions that guide generalization beyond training data","The number of rows in the training set","The hardware used during training","The exact labels assigned to test examples"],a:0,e:"Inductive bias is the set of assumptions a learner uses to prefer some hypotheses over others."},
      {q:"Why is cross-validation used during model evaluation?",o:["To increase the number of model parameters","To estimate performance across different train-validation splits","To guarantee zero training error","To replace the need for test data in every setting"],a:1,e:"Cross-validation evaluates a model across multiple data partitions, giving a more robust estimate of generalization."},
      {q:"In simple linear regression, what is the model trying to estimate?",o:["A linear relationship between a predictor and a numeric response","A set of cluster labels without targets","A probability distribution over actions","A decision boundary that must be nonlinear"],a:0,e:"Linear regression models a numeric response as a linear function of predictor variables."},
      {q:"A decision tree becomes very deep and performs extremely well on training data but poorly on unseen data. What is the likely issue?",o:["Underfitting","Overfitting","Feature scaling","Data normalization"],a:1,e:"A tree that captures noise in training examples may have high variance and generalize poorly: overfitting."}
    ]},
    {id:"ml-unit-2",unit:"Unit 2",title:"Evaluation & Unsupervised Learning",topics:"Precision, recall, F1, MSE, K-means, SOM, Bayes and GMM",questions:[
      {q:"A classifier identifies 40 positive cases correctly and predicts 10 additional cases as positive when they are actually negative. What is its precision?",o:["40/50 = 0.80","40/60 ≈ 0.67","10/50 = 0.20","40/90 ≈ 0.44"],a:0,e:"Precision = TP/(TP+FP) = 40/(40+10) = 0.80."},
      {q:"Which metric is especially useful when the goal is to measure how many actual positive cases were found?",o:["Specificity","Recall","Mean squared error","R-squared"],a:1,e:"Recall = TP/(TP+FN), so it measures the fraction of actual positives retrieved."},
      {q:"What is the main objective of K-means clustering?",o:["Minimize within-cluster sum of squared distances to centroids","Maximize classification accuracy using labels","Find a separating hyperplane","Estimate regression coefficients"],a:0,e:"K-means assigns observations to K centroids to minimize within-cluster squared distance."},
      {q:"In a Gaussian mixture model, what does each mixture component represent?",o:["A deterministic decision-tree branch","A probability distribution contributing to the overall data density","A fixed class label supplied for every point","A nearest-neighbour distance threshold"],a:1,e:"A GMM models data as a weighted combination of component probability distributions, commonly Gaussians."},
      {q:"Which statement best describes a Self-Organizing Map (SOM)?",o:["A supervised method that predicts numeric targets only","A neural, topology-preserving mapping used to organize high-dimensional data","A rule-based method for pruning decision trees","A metric for measuring regression error"],a:1,e:"A SOM maps high-dimensional observations to a usually low-dimensional grid while approximately preserving neighbourhood relationships."}
    ]},
    {id:"ml-unit-3",unit:"Unit 3",title:"Supervised Models & Neural Networks",topics:"Logistic regression, SVM, kernels, perceptron and backpropagation",questions:[
      {q:"What is the usual output of logistic regression for binary classification before applying a decision threshold?",o:["A probability between 0 and 1","An unrestricted integer cluster ID","A principal component vector","A set of tree split rules"],a:0,e:"The logistic (sigmoid) function maps the linear score to a value between 0 and 1, interpreted as a class probability."},
      {q:"What does the margin represent in a maximum-margin Support Vector Machine?",o:["The distance between the separating boundary and the nearest training points","The number of classes in the dataset","The total number of gradient updates","The mean squared prediction error"],a:0,e:"An SVM seeks a separating boundary with a large margin to the closest training examples, the support vectors."},
      {q:"Why is a kernel function used in a kernel SVM?",o:["To compute inner products corresponding to an implicit feature space without explicitly constructing that mapping","To remove all support vectors","To convert labels into continuous targets","To replace optimization with random guessing"],a:0,e:"The kernel trick allows an SVM to operate as if data were mapped into a feature space, often enabling nonlinear boundaries."},
      {q:"What is the output of a single-layer perceptron for a binary task based on?",o:["A thresholded weighted sum of input features","A random forest vote","The average of all training labels","A K-means centroid assignment"],a:0,e:"A perceptron computes a weighted sum (plus bias) and applies an activation/threshold function."},
      {q:"During backpropagation, how are gradients for earlier network layers obtained?",o:["By applying the chain rule to propagate error derivatives backward","By sorting training examples by label","By replacing weights with cluster centroids","By computing only the final layer's predictions"],a:0,e:"Backpropagation applies the chain rule from output toward earlier layers to compute derivatives of the loss with respect to weights."}
    ]}
  ];
  const key="lucid-ml-demo-progress-v1";
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{"attempts":[]}')}catch(_){return {attempts:[]}}};
  const write=x=>localStorage.setItem(key,JSON.stringify(x));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let current=null;
  function style(){
    if(document.getElementById("lucidMlDemoStyle"))return;
    const s=document.createElement("style");s.id="lucidMlDemoStyle";s.textContent=`
      .ml-demo-shell{margin:0 0 22px;padding:20px;border:1px solid var(--line);border-radius:18px;background:rgba(255,254,249,.9);box-shadow:var(--shadow-sm)}
      .ml-demo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:15px}
      .ml-demo-pack{padding:15px;border:1px solid var(--line);border-radius:14px;background:#fff}
      .ml-demo-pack h3{margin:7px 0}.ml-demo-pack p{min-height:50px}
      .ml-demo-runner{margin-top:15px}.ml-demo-option{display:block;width:100%;padding:11px 13px;margin:8px 0;text-align:left;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);font-size:12px}
      .ml-demo-option:disabled{cursor:default;opacity:1}.ml-demo-option.is-right{border-color:#3b7957;background:#edf5e9}.ml-demo-option.is-wrong{border-color:#bd625b;background:#fff1ef}
      .ml-demo-feedback{padding:11px 13px;margin-top:10px;border-radius:10px;background:var(--sage-2);font-size:12px}
      .ml-demo-badge-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}
      .ml-demo-badge{padding:15px;border:1px solid var(--line);border-radius:14px;background:#fff}
      .ml-demo-badge.locked{opacity:.58}.ml-demo-badge .symbol{font-size:25px}
      @media(max-width:850px){.ml-demo-grid{grid-template-columns:1fr}.ml-demo-badge-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;document.head.appendChild(s);
  }
  function ensurePractice(){
    const page=document.getElementById("practice");if(!page||document.getElementById("lucidMlPractice"))return;
    const root=document.createElement("section");root.id="lucidMlPractice";root.className="ml-demo-shell";
    root.innerHTML='<div class="kicker">Preloaded practice · MCA556</div><h2 style="margin:7px 0">Machine Learning quizzes</h2><p class="muted small-text">Ready-to-attempt sample quizzes based on your MCA Machine Learning syllabus. They work without PDF uploads or AI generation. Attempts are saved in this browser for the demo.</p><div id="lucidMlQuizPacks" class="ml-demo-grid"></div><div id="lucidMlQuizRunner" class="ml-demo-runner" aria-live="polite"></div>';
    const heading=page.querySelector(".page-heading");heading.insertAdjacentElement("afterend",root);renderPacks();
  }
  function renderPacks(){
    const host=document.getElementById("lucidMlQuizPacks");if(!host)return;
    const data=read();
    host.innerHTML=packs.map(p=>{const done=(data.attempts||[]).filter(a=>a.id===p.id).length;const latest=(data.attempts||[]).filter(a=>a.id===p.id).slice(-1)[0];return '<article class="ml-demo-pack"><div class="kicker">'+esc(p.unit)+' · '+p.questions.length+' questions</div><h3>'+esc(p.title)+'</h3><p class="muted small-text">'+esc(p.topics)+'</p><div class="muted small-text">'+done+' completed attempt'+(done===1?'':'s')+(latest?' · Latest '+latest.score+'/'+latest.total:'')+'</div><button class="primary-button btn-sm" style="margin-top:12px" data-start-ml="'+p.id+'">Start quiz →</button></article>';}).join("");
    host.querySelectorAll("[data-start-ml]").forEach(b=>b.addEventListener("click",()=>startQuiz(b.dataset.startMl)));
  }
  function startQuiz(id){
    const pack=packs.find(p=>p.id===id);if(!pack)return;
    current={pack,index:0,score:0,locked:false,answers:[]};drawQuestion();
  }
  function drawQuestion(){
    const host=document.getElementById("lucidMlQuizRunner"),c=current;if(!host||!c)return;
    const q=c.pack.questions[c.index];c.locked=false;
    host.innerHTML='<div class="ml-demo-pack"><div class="kicker">'+esc(c.pack.unit)+' · Question '+(c.index+1)+' of '+c.pack.questions.length+'</div><div class="progress-track" style="margin:12px 0"><span class="progress-fill" style="width:'+Math.round(c.index/c.pack.questions.length*100)+'%"></span></div><h3 style="font-size:17px;margin:12px 0">'+esc(q.q)+'</h3><div id="lucidMlOptions">'+q.o.map((o,i)=>'<button class="ml-demo-option" data-answer="'+i+'">'+esc(o)+'</button>').join("")+'</div><div id="lucidMlFeedback" class="ml-demo-feedback" hidden></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:13px"><span class="muted small-text">Score so far: '+c.score+'/'+c.index+'</span><button id="lucidMlNext" class="primary-button btn-sm" disabled>'+(c.index===c.pack.questions.length-1?'Finish quiz':'Next question →')+'</button></div></div>';
    host.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>chooseAnswer(Number(b.dataset.answer))));
    document.getElementById("lucidMlNext").addEventListener("click",()=>{if(c.index<c.pack.questions.length-1){c.index++;drawQuestion()}else finishQuiz()});
  }
  function chooseAnswer(index){
    const c=current;if(!c||c.locked)return;c.locked=true;
    const q=c.pack.questions[c.index],correct=index===q.a;if(correct)c.score++;
    c.answers.push({question:q.q,selected:q.o[index],correct,unit:c.pack.unit});
    document.querySelectorAll("#lucidMlOptions [data-answer]").forEach(b=>{b.disabled=true;const n=Number(b.dataset.answer);if(n===q.a)b.classList.add("is-right");if(n===index&&!correct)b.classList.add("is-wrong")});
    const feedback=document.getElementById("lucidMlFeedback");feedback.hidden=false;feedback.textContent=(correct?"Correct. ":"Not quite. ")+q.e;
    const next=document.getElementById("lucidMlNext");next.disabled=false;next.textContent=c.index===c.pack.questions.length-1?"Finish quiz":"Next question →";
    const scoreLabel=document.querySelector("#lucidMlQuizRunner .muted.small-text");if(scoreLabel)scoreLabel.textContent="Score so far: "+c.score+"/"+(c.index+1);
  }
  function finishQuiz(){
    const c=current;if(!c)return;
    const data=read();data.attempts=data.attempts||[];
    const attempt={id:c.pack.id,unit:c.pack.unit,title:c.pack.title,score:c.score,total:c.pack.questions.length,accuracy:Math.round(c.score/c.pack.questions.length*100),at:new Date().toISOString(),answers:c.answers};
    data.attempts.push(attempt);write(data);
    const host=document.getElementById("lucidMlQuizRunner");
    host.innerHTML='<div class="ml-demo-pack"><div class="kicker">Quiz completed · '+esc(c.pack.unit)+'</div><h3 style="font-size:20px;margin:8px 0">'+c.score+' / '+c.pack.questions.length+' correct</h3><p class="muted small-text">Accuracy: '+attempt.accuracy+'%. This practice result has been saved locally in this browser.</p><div class="progress-track" style="margin:13px 0"><span class="progress-fill" style="width:'+attempt.accuracy+'%"></span></div><button class="primary-button btn-sm" id="lucidMlRetry">Retry quiz</button> <button class="secondary-button btn-sm" id="lucidMlOther">Back to quizzes</button></div>';
    document.getElementById("lucidMlRetry").onclick=()=>startQuiz(c.pack.id);
    document.getElementById("lucidMlOther").onclick=()=>{host.innerHTML="";renderPacks()};
    renderPacks();renderAchievementPreview();
  }
  function renderAchievementPreview(){
    const page=document.getElementById("rewards");if(!page)return;
    let box=document.getElementById("lucidMlAchievementPreview");
    if(!box){box=document.createElement("section");box.id="lucidMlAchievementPreview";box.className="ml-demo-shell";const grid=page.querySelector("#rewardGrid");grid?.insertAdjacentElement("beforebegin",box)}
    const attempts=read().attempts||[],completed=attempts.length,unique=new Set(attempts.map(a=>a.id)).size,total=attempts.reduce((s,a)=>s+a.score,0),answered=attempts.reduce((s,a)=>s+a.total,0),accuracy=answered?Math.round(total/answered*100):0;
    const badges=[
      {icon:"🌱",name:"First Attempt",desc:"Complete your first Machine Learning quiz",earned:completed>=1},
      {icon:"🧠",name:"Unit Explorer",desc:"Attempt quizzes from all three units",earned:unique>=3},
      {icon:"🎯",name:"Sharp Recall",desc:"Maintain at least 80% overall accuracy after 2 attempts",earned:completed>=2&&accuracy>=80},
      {icon:"🏅",name:"Practice Streak",desc:"Complete 5 Machine Learning quiz attempts",earned:completed>=5}
    ];
    box.innerHTML='<div class="kicker">Demo data · Machine Learning</div><h2 style="margin:7px 0">Achievement preview</h2><p class="muted small-text">This is a clearly labelled demo showcase, separate from server-awarded achievements. Badges unlock from your actual attempts in these preloaded local quizzes.</p><div class="grid four-col" style="margin-top:14px"><div><div class="analytics-number">'+completed+'</div><div class="muted small-text">Quiz attempts</div></div><div><div class="analytics-number">'+unique+'/3</div><div class="muted small-text">Units attempted</div></div><div><div class="analytics-number">'+(answered?accuracy+'%':'—')+'</div><div class="muted small-text">Overall accuracy</div></div><div><div class="analytics-number">'+badges.filter(b=>b.earned).length+'/4</div><div class="muted small-text">Demo badges unlocked</div></div></div><div class="ml-demo-badge-grid">'+badges.map(b=>'<article class="ml-demo-badge '+(b.earned?'':'locked')+'"><div class="symbol">'+b.icon+'</div><strong>'+b.name+'</strong><p class="muted small-text" style="margin-top:5px">'+b.desc+'</p><span class="tag '+(b.earned?'':'muted')+'">'+(b.earned?'Unlocked · demo':'Locked · demo')+'</span></article>').join("")+'</div><div style="margin-top:14px"><strong class="small-text">Recent attempts</strong><div style="display:grid;gap:7px;margin-top:8px">'+(attempts.length?attempts.slice(-5).reverse().map(a=>'<div class="ml-demo-pack" style="padding:10px 12px"><strong class="small-text">'+esc(a.title)+'</strong><span class="muted small-text"> · '+a.score+'/'+a.total+' ('+a.accuracy+'%) · '+new Date(a.at).toLocaleString()+'</span></div>').join(""):'<p class="muted small-text">No demo attempts yet. Complete a preloaded quiz in Practice Center to populate this section.</p>')+'</div></div>';
  }
  function init(){style();ensurePractice();renderAchievementPreview()}
  document.addEventListener("DOMContentLoaded",init);setTimeout(init,0);
  document.addEventListener("click",e=>{if(e.target.closest('[data-page="practice"]'))setTimeout(ensurePractice,0);if(e.target.closest('[data-page="rewards"]'))setTimeout(renderAchievementPreview,0)});
  window.LucidMLDemo={packs,refresh:()=>{renderPacks();renderAchievementPreview()}};
})();