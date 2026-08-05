(()=>{
if(window.__v72ReferenceUiInstalled)return;
window.__v72ReferenceUiInstalled=true;
window.__acceleratorBuild='V52.1-reference-ui-v72';

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const appState=()=>{try{return typeof state!=='undefined'?state:null}catch{return null}};
const currentCreator=()=>{
  const app=appState();
  return (app?.creators||[]).find(item=>item.id===app.currentCreatorId)||(app?.creators||[])[0]||null;
};
const currentVideo=()=>{
  const app=appState();
  const creator=currentCreator();
  const videos=creator?.videos||[];
  return videos.find(item=>item.id===app?.currentVideoId)||videos[0]||null;
};
const first=(...values)=>values.find(value=>clean(value))||'';

const phases=[
  {id:'plan',number:'1',label:'Plan',sections:['video-purpose','video-strategy','video-package']},
  {id:'script',number:'2',label:'Script',sections:['video-experience']},
  {id:'produce',number:'3',label:'Produce & Publish',sections:['video-publish','video-handoff']},
  {id:'review',number:'4',label:'Review & Learn',sections:[]}
];

const guides={
  'video-purpose':{
    eyebrow:'Phase 1 guide',
    title:'Viewer and goal',
    subtitle:'Decide who the video is for and what must change for them.',
    intro:'This section should leave you with one specific viewer, one immediate problem, one useful promise, and one measurable definition of success.',
    sections:[
      ['Choose the video job','Reach brings the right new people in. Trust changes a belief and builds preference. Convert helps a ready viewer decide or act. The job is not the format.'],
      ['Narrow the viewer','Write for one viewer in one moment. Avoid broad audience descriptions that could fit almost anyone.'],
      ['Define the promise','Describe what the viewer will understand, decide, or be able to do differently after watching.']
    ],
    tip:'You should be able to read the viewer and promise aloud in one breath.'
  },
  'video-strategy':{
    eyebrow:'Phase 1 guide',
    title:'Research and approach',
    subtitle:'Find the evidence first, then choose the format that carries it best.',
    intro:'Research changes by video job. Do not force every video through the same outlier process.',
    table:[
      ['Reach','Demand, repeated problems, outliers, searches and click patterns.','Fast relevance, clear promise and early payoff.'],
      ['Trust','Doubts, misconceptions, objections, proof and stories.','Old belief, evidence, new belief and application.'],
      ['Convert','Fit, buyer questions, risk, alternatives and decision criteria.','Fit, tradeoffs, proof and one clear next step.']
    ],
    sections:[
      ['Choose format after evidence','Use a how-to when the viewer needs a process. Use comparison when they need criteria and tradeoffs. Use a case study when proof is the main asset. Use a story when the belief shift depends on lived experience.'],
      ['What best fit means','Best fit is the strongest starting recommendation from the saved strategy and evidence. It is not a mandatory answer.']
    ],
    warning:'Do not choose a format because it is familiar. Choose it because it makes the evidence easiest to understand.'
  },
  'video-package':{
    eyebrow:'Phase 1 guide',
    title:'Title and thumbnail',
    subtitle:'Make the topic clear and give the right viewer an honest reason to click now.',
    intro:'The topic is what the video is about. The click frame is why this version of the topic feels urgent, useful, surprising, risky, or emotionally relevant.',
    sections:[
      ['Common click frames','Mistake, proof, comparison, warning, tension, result, useful reframe, or a strong unanswered question.'],
      ['Title and thumbnail relationship','They should work together, not repeat each other. The title can carry context while the thumbnail carries proof, emotion, contrast, or the visual question.'],
      ['One-second test','A viewer should understand the main visual and emotional direction before reading every word.']
    ],
    tip:'A click frame guides the title and thumbnail. It does not choose the story structure or pacing.'
  },
  'video-experience':{
    eyebrow:'Phase 2 guide',
    title:'Story and opening',
    subtitle:'Confirm the click immediately, then move the viewer toward the promised payoff.',
    intro:'Choose one viewer flow and one opening move. Keep pacing at the recommended default unless the evidence clearly calls for something different.',
    sections:[
      ['Viewer flow','Use problem to cause to solution when the viewer needs understanding. Use problem to attempt to solution when failed effort matters. Use story to lesson to application when lived experience carries the proof.'],
      ['Opening move','The first seconds should confirm the title and thumbnail, name the stakes, and make the next step feel worth watching.'],
      ['Pacing','Pacing is the timing of proof, tension and payoff. It is not a separate creative concept that needs to be reinvented for every video.']
    ],
    warning:'Do not open with background information that the viewer did not click for.'
  },
  'video-publish':{
    eyebrow:'Phase 3 guide',
    title:'CTA and publishing',
    subtitle:'Connect the video to the next useful action and schedule the review points.',
    intro:'The CTA should feel like the natural next step from the video, not an interruption pasted onto the ending.',
    sections:[
      ['Match CTA to the job','Reach often points to another video or subscription path. Trust can point to a deeper resource. Convert can point to the offer, lead magnet, consultation, or decision step.'],
      ['Set review dates','Use the calendar to schedule the 24-hour, 7-day and 28-day reviews that actually matter for this video.'],
      ['Keep the ending open','Transition into the next action. Avoid dropping energy with a long conclusion.']
    ],
    tip:'One clear CTA is usually stronger than several competing next steps.'
  },
  'video-handoff':{
    eyebrow:'Phase 3 guide',
    title:'Handoff',
    subtitle:'Make the plan usable by the creator, editor and coach without another explanation meeting.',
    intro:'The handoff is complete when the approved title, thumbnail direction, opening, main beats, CTA, owner and dates are clear.',
    sections:[
      ['What must be visible','Final title direction, thumbnail concept, opening, structure, proof assets, CTA, due dates and ownership.'],
      ['What does not belong here','Long strategy teaching, every rejected option, or unresolved brainstorming that will confuse execution.'],
      ['Coach check','Ask whether another person could execute this plan without guessing what you meant.']
    ],
    warning:'Do not mark the plan ready while the title, thumbnail or opening still depend on a future decision.'
  }
};

function guideMarkup(guide){
  let html=`<div class="v72-guide-intro"><p>${escapeHtml(guide.intro||'')}</p></div>`;
  if(guide.table){
    html+=`<table class="v72-guide-table"><thead><tr><th>Video job</th><th>Research</th><th>Structure</th></tr></thead><tbody>${guide.table.map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  for(const section of guide.sections||[]){
    html+=`<section class="v72-guide-section"><h3>${escapeHtml(section[0])}</h3><p>${escapeHtml(section[1])}</p></section>`;
  }
  if(guide.tip)html+=`<div class="v72-guide-tip"><strong>Useful check:</strong> ${escapeHtml(guide.tip)}</div>`;
  if(guide.warning)html+=`<div class="v72-guide-warning"><strong>Watch for this:</strong> ${escapeHtml(guide.warning)}</div>`;
  return html;
}

function ensureGuideDrawer(){
  if(document.querySelector('#v72-guide-backdrop'))return;
  document.body.insertAdjacentHTML('beforeend',`<div class="v72-guide-backdrop" id="v72-guide-backdrop" aria-hidden="true"><aside class="v72-guide-drawer" role="dialog" aria-modal="true"><header class="v72-guide-head"><div><span id="v72-guide-eyebrow">Guide</span><h2 id="v72-guide-title">Guide</h2><p id="v72-guide-subtitle"></p></div><button type="button" class="v72-guide-close" data-v72-close-guide aria-label="Close guide">×</button></header><div class="v72-guide-content" id="v72-guide-content"></div></aside></div>`);
}

function openGuide(key){
  const guide=guides[key];
  if(!guide)return;
  ensureGuideDrawer();
  document.querySelector('#v72-guide-eyebrow').textContent=guide.eyebrow||'Guide';
  document.querySelector('#v72-guide-title').textContent=guide.title||'Guide';
  document.querySelector('#v72-guide-subtitle').textContent=guide.subtitle||'';
  document.querySelector('#v72-guide-content').innerHTML=guideMarkup(guide);
  const backdrop=document.querySelector('#v72-guide-backdrop');
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden','false');
}

function closeGuide(){
  const backdrop=document.querySelector('#v72-guide-backdrop');
  backdrop?.classList.remove('open');
  backdrop?.setAttribute('aria-hidden','true');
}

function phaseStorageKey(){
  const creator=currentCreator();
  const video=currentVideo();
  return `accelerator-v72-phase-${creator?.id||'creator'}-${video?.id||'video'}`;
}

function currentPhase(){
  try{return localStorage.getItem(phaseStorageKey())||'plan'}catch{return 'plan'}
}

function savePhase(id){
  try{localStorage.setItem(phaseStorageKey(),id)}catch{}
}

function phaseIsComplete(phase){
  if(phase.id==='review')return false;
  return phase.sections.length>0&&phase.sections.every(id=>document.querySelector(`details[data-v49-section="${id}"]`)?.classList.contains('complete'));
}

function ensureReviewPanel(){
  if(document.querySelector('.v72-review-phase'))return;
  const anchor=document.querySelector('details[data-v49-section="video-handoff"]');
  if(!anchor)return;
  anchor.insertAdjacentHTML('afterend',`<section class="v72-review-phase"><header class="v72-review-head"><h3>Review and learn from the video</h3><p>Use this phase after the video is published and a scheduled review is due.</p></header><div class="v72-review-body"><div class="v72-review-grid"><article class="v72-review-card"><span>24 hours</span><strong>Packaging and opening</strong><p>Check early click response, first-minute behavior and obvious launch issues.</p></article><article class="v72-review-card"><span>7 days</span><strong>Viewer journey</strong><p>Review retention, traffic sources, comments and whether the promise held.</p></article><article class="v72-review-card"><span>28 days</span><strong>Strategic learning</strong><p>Decide what this video should change in future planning and packaging.</p></article></div><div class="v72-review-actions"><button type="button" class="button" data-v72-open-review>Open Review & Learn</button><button type="button" class="button secondary" data-v72-open-calendar>Open review calendar</button><button type="button" class="v72-guide-button" data-v72-review-guide>View Guide</button></div></div></section>`);
}

function ensureFlowUi(){
  if(appState()?.currentView!=='video')return;
  document.body.classList.add('v72-video-flow');
  const existing=document.querySelector('.v72-phase-tabs');
  if(!existing){
    const focus=document.querySelector('.v71-video-focus');
    const anchor=focus||document.querySelector('.content .page-head');
    if(!anchor)return;
    anchor.insertAdjacentHTML('afterend',`<div class="v72-video-shell"><div class="v72-flow-note"><span class="v72-flow-note-icon">i</span><div><strong>Work one phase at a time.</strong> The page tells you what to complete. Use View Guide only when you need the teaching or examples.</div></div><nav class="v72-phase-tabs" aria-label="Video workflow phases">${phases.map(phase=>`<button type="button" class="v72-phase-tab" data-v72-phase="${phase.id}"><span>${phase.number}.</span>${escapeHtml(phase.label)}</button>`).join('')}</nav></div>`);
  }
  ensureReviewPanel();
  decorateSections();
  applyPhase(currentPhase());
}

function decorateSections(){
  for(const phase of phases){
    for(const id of phase.sections){
      const detail=document.querySelector(`details[data-v49-section="${id}"]`);
      const summary=detail?.querySelector(':scope>summary');
      if(!detail||!summary)continue;
      detail.dataset.v72Phase=phase.id;
      if(!summary.querySelector('[data-v72-guide]')){
        summary.insertAdjacentHTML('beforeend',`<button type="button" class="v72-guide-button" data-v72-guide="${id}">View Guide</button>`);
      }
    }
  }
}

function applyPhase(id){
  const phase=phases.find(item=>item.id===id)||phases[0];
  savePhase(phase.id);
  document.querySelectorAll('.v72-phase-tab').forEach(button=>{
    const target=phases.find(item=>item.id===button.dataset.v72Phase);
    button.classList.toggle('active',button.dataset.v72Phase===phase.id);
    button.classList.toggle('complete',Boolean(target&&phaseIsComplete(target)));
  });
  document.querySelectorAll('details[data-v49-section]').forEach(detail=>{
    const visible=phase.sections.includes(detail.dataset.v49Section);
    detail.classList.toggle('v72-phase-hidden',!visible);
    if(!visible)detail.open=false;
  });
  const review=document.querySelector('.v72-review-phase');
  review?.classList.toggle('active',phase.id==='review');
  if(phase.sections.length){
    const visible=phase.sections.map(sectionId=>document.querySelector(`details[data-v49-section="${sectionId}"]`)).filter(Boolean);
    if(!visible.some(detail=>detail.open))visible[0].open=true;
  }
  document.querySelector('.v72-phase-tabs')?.scrollIntoView({block:'nearest'});
}

function applyGlobalUi(){
  document.body.classList.add('v72-reference-ui');
  if(appState()?.currentView!=='video')document.body.classList.remove('v72-video-flow');
}

function showReviewGuide(){
  openGuide('video-publish');
  document.querySelector('#v72-guide-eyebrow').textContent='Phase 4 guide';
  document.querySelector('#v72-guide-title').textContent='Review and learn';
  document.querySelector('#v72-guide-subtitle').textContent='Turn performance evidence into one future decision.';
  document.querySelector('#v72-guide-content').innerHTML=`<div class="v72-guide-intro"><p>Do not review a video just to describe the numbers. Record what happened, interpret what it probably means, and choose the one future decision this evidence should change.</p></div><section class="v72-guide-section"><h3>24-hour review</h3><p>Look for launch problems, packaging response, first-minute behavior and whether the right viewers arrived.</p></section><section class="v72-guide-section"><h3>7-day review</h3><p>Study the full viewer journey, retention shape, traffic sources, comments and promise delivery.</p></section><section class="v72-guide-section"><h3>28-day review</h3><p>Decide whether the topic, click frame, opening, structure or CTA produced a repeatable learning.</p></section><div class="v72-guide-tip"><strong>Useful check:</strong> End every review with one sentence beginning, “Because of this video, next time we will...”</div>`;
}

function enhance(){
  applyGlobalUi();
  ensureGuideDrawer();
  ensureFlowUi();
  document.title='Accelerator OS V52.1 Reference UI V72';
}

document.addEventListener('click',event=>{
  const guideButton=event.target.closest?.('[data-v72-guide]');
  if(guideButton){
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openGuide(guideButton.dataset.v72Guide);
    return;
  }
  const phaseButton=event.target.closest?.('[data-v72-phase]');
  if(phaseButton){
    event.preventDefault();
    applyPhase(phaseButton.dataset.v72Phase);
    return;
  }
  if(event.target.closest?.('[data-v72-close-guide]')||event.target.id==='v72-guide-backdrop'){
    event.preventDefault();
    closeGuide();
    return;
  }
  if(event.target.closest?.('[data-v72-review-guide]')){
    event.preventDefault();
    showReviewGuide();
    return;
  }
  if(event.target.closest?.('[data-v72-open-review]')){
    event.preventDefault();
    const app=appState();
    if(app){app.currentView='results';render()}
    return;
  }
  if(event.target.closest?.('[data-v72-open-calendar]')){
    event.preventDefault();
    const app=appState();
    if(app){app.currentView='calendar';render()}
  }
},true);

document.addEventListener('keydown',event=>{if(event.key==='Escape')closeGuide()});

const previousRender=window.render;
window.render=function(...args){
  const result=previousRender.apply(this,args);
  const run=()=>{try{enhance()}catch(error){console.error('V72 reference UI failed',error)}};
  run();
  setTimeout(run,0);
  setTimeout(run,120);
  setTimeout(run,320);
  return result;
};

enhance();
})();
