(()=>{
if(window.__v75ReferenceSystemInstalled)return;
window.__v75ReferenceSystemInstalled=true;
window.__acceleratorBuild='V52.1-reference-ui-v75';

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const appState=()=>{try{return typeof state!=='undefined'?state:null}catch{return null}};
const creator=()=>{const s=appState();return(s?.creators||[]).find(item=>item.id===s.currentCreatorId)||(s?.creators||[])[0]||null};
const video=()=>{const s=appState(),c=creator(),items=c?.videos||[];return items.find(item=>item.id===s?.currentVideoId)||items[0]||null};
const root=()=>document.querySelector('.content')||document.querySelector('main')||document.body;
const pageContainer=()=>root().querySelector(':scope > .v75-page-frame')||root();
const guides=()=>window.V74_SOURCE_GUIDES||{};
const getStore=(key,fallback='')=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}};
const setStore=(key,value)=>{try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key)}catch{}};

const pages={
  overview:{eyebrow:'Creator workspace',title:'Creator Home',purpose:'See what needs attention, open the correct workspace, and leave with one clear next commitment.',note:'Start with the item that changes the creator’s next action. Completed strategy stays quiet until new evidence requires a decision.',guides:['research','titles','thumbtips','thumbstrategies','hooks','story','retention','cta']},
  creators:{eyebrow:'Creator management',title:'All Creators',purpose:'Scan the roster for exceptions, then open one creator without hunting across every page.',note:'This page is for triage. Healthy creators should remain visually quiet while due work and blockers stand out.',guides:['research']},
  setup:{eyebrow:'Strategic foundation',title:'Foundation',purpose:'Define the audience, message, offer, proof, and realistic operating constraints that every future plan should inherit.',note:'Complete Foundation during onboarding, confirm it, and only reopen it when the audience, business, or strategy genuinely changes.',guides:['research','story','cta']},
  plan:{eyebrow:'Monthly operating plan',title:'Monthly Plan',purpose:'Translate the 90-day direction into a realistic Reach, Trust, and Convert mix before planning individual videos.',note:'Choose the month’s outcome and content mix first. This should reduce decisions later, not create another dashboard to maintain.',guides:['research','titles','thumbtips','thumbstrategies']},
  calendar:{eyebrow:'Operating calendar',title:'Calendar',purpose:'See coaching, planning, production, publishing, and review commitments in one color-coded operating view.',note:'The calendar should show milestones that change someone’s next action. Keep ownership and due dates visible.',guides:['research']},
  results:{eyebrow:'Evidence to decision',title:'Review & Learn',purpose:'Turn performance evidence into one practical change to future planning, packaging, structure, or conversion.',note:'A review is complete when it changes a future decision, not when every metric has been described.',guides:['retention','cta']},
  session:{eyebrow:'Live coaching workspace',title:'Coaching Call',purpose:'Capture evidence, decisions, ownership, and the next commitment while the call is happening.',note:'Use this as temporary working space. Save permanent history only after the decisions and commitments are clear.',guides:['hooks','story','retention','cta']},
  video:{eyebrow:'Video workflow',title:'Video Planner',purpose:'Work one phase at a time, keep sections closed until needed, and use the complete source guides for teaching and examples.',note:'Complete each phase, get feedback, make adjustments, and get approval before moving to the next phase.',guides:['research','titles','thumbtips','thumbstrategies','hooks','story','retention','cta']},
  diagnosis:{eyebrow:'Strategic diagnosis',title:'90-Day Diagnosis',purpose:'Use evidence to identify the real bottleneck and decide what the next 90 days must change.',note:'A diagnosis is not a list of everything that could improve. Choose the constraint that matters most now.',guides:['research','retention','cta']}
};

const phaseDefs=[
  {id:'plan',label:'Plan',number:'1',sections:['video-purpose','video-strategy','video-package']},
  {id:'script',label:'Script',number:'2',sections:['video-experience']},
  {id:'produce',label:'Produce & Publish',number:'3',sections:['video-publish','video-handoff']},
  {id:'review',label:'Review & Learn',number:'4',sections:[]}
];
const sectionGuides={
  'video-purpose':['research'],
  'video-strategy':['research'],
  'video-package':['titles','thumbtips','thumbstrategies'],
  'video-experience':['hooks','story','retention'],
  'video-publish':['cta'],
  'video-handoff':['cta']
};
const calendarTypes=[
  ['coaching-call','Coaching call','#49347A'],['assignment','Assignment','#5A451F'],['research','Research','#174956'],['title-and-thumbnail','Title & thumbnail','#57346E'],['outline','Outline','#294B62'],['record','Record','#6A3038'],['edit','Edit','#604521'],['publish','Publish','#205B3E'],['review','Reviews','#24536F'],['other','Other','#37434C']
];

function currentView(){
  const s=appState();
  if(s?.currentView==='overview'&&s?.v67DiagnosisReview)return'diagnosis';
  return s?.currentView||'overview';
}
function meta(){return pages[currentView()]||pages.overview}
function phaseKey(){return`accelerator-v75-phase-${creator()?.id||'creator'}-${video()?.id||'video'}`}
function pageRootDirectHead(){
  const page=pageContainer();
  return [...page.children].find(node=>node.matches?.('.page-head,.v49-page-head,.v49-video-top,.v73-page-head')||node.querySelector?.(':scope > h1,:scope > h2,h1,h2'))||null;
}

function ensureGuideDrawer(){
  if(document.querySelector('#v75-guide-backdrop'))return;
  document.body.insertAdjacentHTML('beforeend',`<div class="v75-guide-backdrop" id="v75-guide-backdrop" aria-hidden="true"><aside class="v75-guide-drawer" role="dialog" aria-modal="true" aria-labelledby="v75-guide-title"><header class="v75-guide-head"><div><span id="v75-guide-eyebrow">Source guide</span><h2 id="v75-guide-title">Guide</h2><p id="v75-guide-subtitle"></p></div><button type="button" class="v75-guide-close" data-v75-close-guide aria-label="Close guide">×</button></header><nav class="v75-guide-tabs" id="v75-guide-tabs" aria-label="Guide topics"></nav><div class="v75-guide-content" id="v75-guide-content"></div></aside></div>`);
}
function renderGuideTab(key){
  const guide=guides()[key];if(!guide)return;
  document.querySelectorAll('.v75-guide-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.v75GuideTab===key));
  const title=document.querySelector('#v75-guide-title'),content=document.querySelector('#v75-guide-content');
  if(title)title.textContent=guide.title;
  if(content){content.innerHTML=guide.content;content.scrollTop=0}
}
async function openGuides(keys,heading='Complete source guides',subtitle='Full teaching copied from the supplied vidIQ Video Planner HTML.'){
  if(window.V74_GUIDES_READY)await window.V74_GUIDES_READY;
  ensureGuideDrawer();
  const available=(keys||[]).filter(key=>guides()[key]);
  if(!available.length)return;
  const tabs=document.querySelector('#v75-guide-tabs');
  tabs.innerHTML=available.map(key=>`<button type="button" class="v75-guide-tab" data-v75-guide-tab="${key}">${escapeHtml(guides()[key].title)}</button>`).join('');
  document.querySelector('#v75-guide-eyebrow').textContent=heading;
  document.querySelector('#v75-guide-subtitle').textContent=subtitle;
  renderGuideTab(available[0]);
  const backdrop=document.querySelector('#v75-guide-backdrop');backdrop.classList.add('open');backdrop.setAttribute('aria-hidden','false');
}
function closeGuide(){const backdrop=document.querySelector('#v75-guide-backdrop');backdrop?.classList.remove('open');backdrop?.setAttribute('aria-hidden','true')}

function normalizeTopbar(){
  const bar=document.querySelector('.topbar');if(!bar)return;
  bar.classList.add('v75-topbar');
  let actions=bar.querySelector('.top-actions');
  if(!actions){actions=document.createElement('div');actions.className='top-actions';bar.appendChild(actions)}
  actions.classList.add('v75-top-actions');
  document.querySelectorAll('.v73-save-state').forEach(node=>node.remove());
  const candidates=[...bar.children].filter(node=>node!==actions&&node.querySelector?.('select,button,a.button,.cloud-tools'));
  candidates.forEach(node=>{if(node!==bar.firstElementChild)actions.appendChild(node)});
  const cloud=actions.querySelector('.cloud-tools');const youtube=[...actions.querySelectorAll('a')].find(link=>link.classList.contains('v58-youtube')||/youtu(?:be\.com|\.be)/i.test(link.href));const select=actions.querySelector('.creator-select');const menu=[...actions.children].filter(node=>node.matches?.('.icon-button,[data-action="more"],[data-action="data-menu"]'));
  if(cloud)actions.appendChild(cloud);if(youtube)actions.appendChild(youtube);if(select)actions.appendChild(select);menu.forEach(node=>actions.appendChild(node));
}
function normalizeSidebar(){
  const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
  sidebar.classList.add('v75-sidebar');
  sidebar.querySelectorAll('a,button').forEach(node=>{if(node.classList.contains('active')||node.getAttribute('aria-current')==='page')node.classList.add('active')});
}

function decoratePageHead(){
  const page=pageContainer();let head=pageRootDirectHead();
  if(!head){head=document.createElement('header');page.prepend(head)}
  head.classList.add('v75-page-head');
  let copy=head.querySelector(':scope > .v75-page-copy');
  if(!copy){
    copy=document.createElement('div');copy.className='v75-page-copy';head.insertBefore(copy,head.firstChild);
    const heading=head.querySelector('h1,h2,.v49-video-title,.page-title');
    if(heading)copy.appendChild(heading);else{const h=document.createElement('h1');h.textContent=meta().title;copy.appendChild(h)}
    const subtitle=[...head.querySelectorAll('p,small')].find(node=>!node.closest('button')&&!copy.contains(node));if(subtitle)copy.appendChild(subtitle);
  }
  let eyebrow=copy.querySelector('.v75-page-eyebrow');if(!eyebrow){eyebrow=document.createElement('span');eyebrow.className='v75-page-eyebrow';copy.insertBefore(eyebrow,copy.firstChild)}eyebrow.textContent=meta().eyebrow;
  const heading=copy.querySelector('h1,h2,.v49-video-title,.page-title');if(heading&&!clean(heading.textContent))heading.textContent=meta().title;
  let purpose=copy.querySelector('.v75-page-purpose');if(!purpose){purpose=document.createElement('p');purpose.className='v75-page-purpose';copy.appendChild(purpose)}purpose.textContent=meta().purpose;
  let actions=head.querySelector(':scope > .v75-page-actions');if(!actions){actions=document.createElement('div');actions.className='v75-page-actions';head.appendChild(actions)}
  [...head.children].filter(node=>node!==copy&&node!==actions).forEach(node=>{
    if(node.matches?.('button,a.button,.actions,.page-actions')||node.querySelector?.('button,a.button,select'))actions.appendChild(node);else copy.appendChild(node);
  });
  if(!actions.querySelector('[data-v75-page-guide]')){const button=document.createElement('button');button.type='button';button.className='v75-page-guide secondary';button.dataset.v75PageGuide=currentView();button.textContent='View Guide';actions.appendChild(button)}
  return head;
}
function ensurePageBody(head){
  const page=head.parentElement;let body=head.nextElementSibling;
  if(body?.classList.contains('v75-page-body'))return body;
  body=document.createElement('div');body.className='v75-page-body';head.insertAdjacentElement('afterend',body);
  let node=body.nextSibling;while(node){const next=node.nextSibling;if(node.nodeType===1&&!node.matches('#v75-guide-backdrop'))body.appendChild(node);node=next}
  return body;
}
function ensureSourceNote(body){
  if(body.querySelector(':scope > .v75-source-note'))return;
  const note=document.createElement('div');note.className='v75-source-note';note.innerHTML=`<span class="v75-source-note-icon">i</span><div><strong>${escapeHtml(meta().title)}:</strong> ${escapeHtml(meta().note)}</div>`;body.prepend(note);
}

function ownHeading(panel){return[...panel.querySelectorAll('h2,h3,h4')].find(heading=>{let node=heading.parentElement;while(node&&node!==panel){if(node.matches?.('.card,.calendar-card,.upcoming-panel,.video-card,.creator-card,[class*="creator-row"]'))return false;node=node.parentElement}return node===panel})||null}
function panelTone(text){text=text.toLowerCase();if(/approved|confirmed|complete|ready|on track|healthy/.test(text))return'approved';if(/blocked|error|missing|required/.test(text))return'blocked';if(/due|attention|warning|changes requested|review needed|overdue/.test(text))return'attention';return''}
function decoratePanel(panel){
  if(panel.dataset.v75Decorated)return;panel.dataset.v75Decorated='1';panel.classList.add('v75-panel');
  const heading=ownHeading(panel);if(!heading)return;
  const tone=panelTone(clean(heading.textContent));if(tone)panel.dataset.v75Tone=tone;
  let header=heading.parentElement;
  if(header!==panel&&header.parentElement===panel&&!header.querySelector('input,textarea,select'))header.classList.add('v75-panel-head');
  else{
    header=document.createElement('div');header.className='v75-panel-head';const copy=document.createElement('div');header.appendChild(copy);copy.appendChild(heading);
    const next=heading.nextElementSibling;if(next&&next.matches('p,small'))copy.appendChild(next);
    panel.insertBefore(header,panel.firstChild);
  }
  if(!panel.querySelector(':scope > .v75-panel-body')){
    const body=document.createElement('div');body.className='v75-panel-body';[...panel.children].filter(child=>child!==header).forEach(child=>body.appendChild(child));panel.appendChild(body);
  }
}
function decoratePanels(body){
  const selector='.card,.calendar-card,.upcoming-panel,.video-card,.creator-card,[class*="creator-row"]';
  body.querySelectorAll(selector).forEach(panel=>{if(!panel.closest('#v75-guide-backdrop')&&!panel.matches('details')&&!panel.closest('details>summary'))decoratePanel(panel)});
  body.querySelectorAll('.coach-note,[class*="coach-note"]').forEach(node=>{node.classList.add('v75-panel');node.dataset.v75Tone='attention'});
}

function addStatusClasses(body){
  body.querySelectorAll('.pill,.badge,.status,[class*="status"],[class*="badge"]').forEach(node=>{
    const text=clean(node.textContent).toLowerCase();if(!text)return;
    if(/approved|complete|confirmed|saved|healthy|ready/.test(text))node.dataset.v75Status='success';
    else if(/blocked|error|failed|missing/.test(text))node.dataset.v75Status='danger';
    else if(/due|overdue|attention|review|waiting|changes/.test(text))node.dataset.v75Status='warning';
  });
}

function createWorkspace(body){
  if(body.querySelector(':scope > .v75-workspace'))return body.querySelector(':scope > .v75-workspace');
  const excluded=new Set([...body.querySelectorAll(':scope > .v75-source-note,:scope > .v75-home-summary,:scope > .v75-journey-strip,:scope > .v75-roster-summary,:scope > .v75-calendar-legend,:scope > .v75-phase-shell')]);
  const items=[...body.children].filter(node=>!excluded.has(node));
  const workspace=document.createElement('div');workspace.className='v75-workspace';const main=document.createElement('div');main.className='v75-main-column';const rail=document.createElement('aside');rail.className='v75-rail-column';workspace.append(main,rail);body.appendChild(workspace);
  const railPattern=/upcoming|next coaching|recent|due|attention|quick action|schedule|commitment|status|summary|history/i;
  items.forEach(item=>{const text=clean(item.textContent).slice(0,500);(railPattern.test(text)&&rail.children.length<5?rail:main).appendChild(item)});
  if(!rail.children.length){workspace.classList.add('v75-full-width');rail.remove()}
  return workspace;
}

function creatorJourney(c){
  const videos=c?.videos||[];const foundation=Boolean(c?.foundationConfirmedAt||c?.onboardingCompletedAt);const diagnosis=Boolean(c?.diagnosis?.reviewedAt||c?.v67DiagnosisReviewAt||c?.diagnosisReviewedAt);const plan=Boolean(c?.plan?.approvedAt||c?.ninetyDayPlan?.approvedAt||c?.strategyConfirmedAt);const month=Boolean(c?.month?.reviewedAt||c?.month?.approvedAt);const videoReady=videos.length>0;
  return[['Foundation',foundation],['Diagnosis',diagnosis],['90-Day Plan',plan],['Monthly Plan',month],['Videos',videoReady]];
}
function adaptOverview(body){
  const c=creator(),videos=c?.videos||[];if(!body.querySelector(':scope > .v75-home-summary')){
    const dueText=clean(body.textContent).match(/\b\d+\s+(?:due|overdue|item)/i)?.[0]||'Review next action';
    const summary=document.createElement('div');summary.className='v75-home-summary';summary.innerHTML=`<div class="v75-summary-tile"><span>Creator</span><strong>${escapeHtml(c?.name||'Current creator')}</strong></div><div class="v75-summary-tile"><span>Videos tracked</span><strong>${videos.length}</strong></div><div class="v75-summary-tile"><span>Attention</span><strong>${escapeHtml(dueText)}</strong></div>`;body.querySelector('.v75-source-note')?.insertAdjacentElement('afterend',summary)||body.prepend(summary)
  }
  if(!body.querySelector(':scope > .v75-journey-strip')){
    const steps=document.createElement('div');steps.className='v75-journey-strip';const journey=creatorJourney(c);const firstIncomplete=journey.findIndex(([,done])=>!done);steps.innerHTML=journey.map(([label,done],index)=>`<div class="v75-journey-step ${done?'complete':index===firstIncomplete?'current':''}">${done?'✓ ':''}${escapeHtml(label)}</div>`).join('');body.querySelector('.v75-home-summary')?.insertAdjacentElement('afterend',steps)
  }
  createWorkspace(body);
}
function creatorRows(body){return[...body.querySelectorAll('.creator-row-v14,.creator-row-v13,.creator-row,.v303-creator-row,.v16-creator-row,.creator-card,[data-creator-item]')].filter((node,index,array)=>!array.some(other=>other!==node&&other.contains(node)))}
function adaptCreators(body){
  const rows=creatorRows(body);if(!body.querySelector(':scope > .v75-roster-summary')){
    const attention=rows.filter(row=>/due|overdue|attention|blocked|review/i.test(clean(row.textContent))).length;const summary=document.createElement('div');summary.className='v75-roster-summary';summary.innerHTML=`<div><strong>Creator roster</strong><p>Open only the creator who needs a decision or follow-up.</p></div><div class="v75-roster-metrics"><div class="v75-roster-metric"><span>Total</span><strong>${rows.length}</strong></div><div class="v75-roster-metric"><span>Needs attention</span><strong>${attention}</strong></div></div>`;body.querySelector('.v75-source-note')?.insertAdjacentElement('afterend',summary)||body.prepend(summary)
  }
  const parent=rows[0]?.parentElement;if(parent)parent.classList.add('v75-roster');
}
function accordionDetails(body){return[...body.querySelectorAll('details')].filter(detail=>!detail.closest('#v75-guide-backdrop'))}
function adaptAccordions(body){
  const details=accordionDetails(body);details.forEach(detail=>{detail.classList.add('v75-accordion');detail.open=false});
  const parents=[...new Set(details.map(detail=>detail.parentElement))];parents.forEach(parent=>parent?.classList.add('v75-accordion-stack'));
}
function adaptSetup(body){adaptAccordions(body);createWorkspace(body)}
function adaptPlan(body){adaptAccordions(body);createWorkspace(body)}
function eventClass(node){const text=`${node.className} ${node.dataset.type||''} ${node.textContent||''}`.toLowerCase();if(/coaching/.test(text))return'coaching-call';if(/assignment/.test(text))return'assignment';if(/research/.test(text))return'research';if(/title.*thumbnail|thumbnail.*title/.test(text))return'title-and-thumbnail';if(/outline/.test(text))return'outline';if(/record/.test(text))return'record';if(/edit/.test(text))return'edit';if(/publish/.test(text))return'publish';if(/24-hour|7-day|28-day|analytics check|review/.test(text))return'review';return'other'}
function adaptCalendar(body){
  body.querySelectorAll('.event-chip').forEach(node=>{[...node.classList].filter(name=>name.startsWith('type-')).forEach(name=>node.classList.remove(name));node.classList.add(`type-${eventClass(node)}`)});
  if(!body.querySelector(':scope > .v75-calendar-legend')){const legend=document.createElement('div');legend.className='v75-calendar-legend';legend.innerHTML=calendarTypes.map(([,label,color])=>`<span class="v75-calendar-key" style="--key:${color}">${label}</span>`).join('');body.querySelector('.v75-source-note')?.insertAdjacentElement('afterend',legend)||body.prepend(legend)}
  const calendar=body.querySelector('.calendar-card,.calendar-grid')?.closest('.calendar-card,.card')||body.querySelector('.calendar-grid');const upcoming=body.querySelector('.upcoming-panel,[class*="upcoming"]');
  if(calendar&&upcoming&&!calendar.closest('.v75-workspace')){const workspace=document.createElement('div');workspace.className='v75-workspace';const main=document.createElement('div');main.className='v75-main-column';const rail=document.createElement('aside');rail.className='v75-rail-column';calendar.parentNode.insertBefore(workspace,calendar);workspace.append(main,rail);main.appendChild(calendar);rail.appendChild(upcoming)}else createWorkspace(body);
}
function makeSplitLayout(body,className,railPattern){
  if(body.querySelector(`:scope > .${className}`))return;
  const layout=document.createElement('div');layout.className=className;const main=document.createElement('div');main.className=className.includes('session')?'v75-session-main':'v75-review-main';const rail=document.createElement('aside');rail.className=className.includes('session')?'v75-session-rail':'v75-review-rail';layout.append(main,rail);
  const items=[...body.children].filter(node=>!node.matches('.v75-source-note'));
  body.appendChild(layout);items.forEach(item=>(railPattern.test(clean(item.textContent).slice(0,600))&&rail.children.length<5?rail:main).appendChild(item));if(!rail.children.length){rail.remove();layout.style.gridTemplateColumns='1fr'}
}
function adaptResults(body){makeSplitLayout(body,'v75-review-layout',/next|learning|decision|status|due|summary|history|route/i)}
function adaptSession(body){makeSplitLayout(body,'v75-session-layout',/agenda|commitment|owner|due|history|summary|next/i)}

function phaseComplete(def){return def.sections.length>0&&def.sections.every(id=>document.querySelector(`details[data-v49-section="${id}"]`)?.classList.contains('complete'))}
function ensureReviewPhase(body){
  let panel=body.querySelector('.v75-review-phase');if(panel)return panel;
  panel=document.createElement('section');panel.className='v75-review-phase';panel.innerHTML=`<header class="v75-review-head"><h3>Review and learn from the video</h3><p>Use this after publishing when a review checkpoint is due.</p></header><div class="v75-review-body"><div class="v75-review-grid"><article class="v75-review-card"><span>24 hours</span><strong>Packaging and opening</strong><p>Check click response, first-minute behavior, and launch problems.</p></article><article class="v75-review-card"><span>7 days</span><strong>Viewer journey</strong><p>Review retention, traffic sources, comments, and promise delivery.</p></article><article class="v75-review-card"><span>28 days</span><strong>Strategic learning</strong><p>Choose what changes in future planning, packaging, structure, or CTA.</p></article></div><div class="v75-review-actions"><button type="button" class="v75-button" data-v75-open-review>Open Review & Learn</button><button type="button" class="v75-button secondary" data-v75-open-calendar>Open calendar</button><button type="button" class="v75-button secondary" data-v75-review-guide>View Full Guides</button></div></div>`;body.appendChild(panel);return panel;
}
function activePhase(){const stored=getStore(phaseKey(),'plan');return phaseDefs.some(def=>def.id===stored)?stored:'plan'}
function applyPhase(id){
  const def=phaseDefs.find(item=>item.id===id)||phaseDefs[0];setStore(phaseKey(),def.id);
  document.querySelectorAll('.v75-phase-tab').forEach(button=>{const target=phaseDefs.find(item=>item.id===button.dataset.v75PhaseButton);button.classList.toggle('active',button.dataset.v75PhaseButton===def.id);button.classList.toggle('complete',Boolean(target&&phaseComplete(target)))});
  document.querySelectorAll('details[data-v49-section]').forEach(detail=>{const visible=def.sections.includes(detail.dataset.v49Section);detail.classList.toggle('v75-phase-hidden',!visible);detail.hidden=!visible;detail.open=false});
  const review=document.querySelector('.v75-review-phase');if(review){review.classList.toggle('active',def.id==='review');review.hidden=def.id!=='review'}
}
function adaptVideo(body){
  body.classList.add('v75-video-body');
  document.querySelectorAll('.v72-video-shell,.v72-phase-tabs,.v72-review-phase,.v74-video-flow,.v74-review-phase').forEach(node=>node.remove());
  let shell=body.querySelector(':scope > .v75-phase-shell');if(!shell){shell=document.createElement('section');shell.className='v75-phase-shell';shell.innerHTML=`<div class="v75-source-note"><span class="v75-source-note-icon">i</span><div><strong>Work one phase at a time.</strong> Every section starts closed. Open only the section you are actively working in, and use View Guide for the complete source teaching.</div></div><nav class="v75-phase-tabs" aria-label="Video workflow phases">${phaseDefs.map(def=>`<button type="button" class="v75-phase-tab" data-v75-phase-button="${def.id}"><span>${def.number}.</span> ${escapeHtml(def.label)}</button>`).join('')}</nav>`;body.prepend(shell)}
  const details=[...body.querySelectorAll('details[data-v49-section]')];details.forEach(detail=>{
    detail.classList.add('v75-accordion');detail.open=false;const id=detail.dataset.v49Section;const def=phaseDefs.find(item=>item.sections.includes(id));if(def)detail.dataset.v75PhaseSection=def.id;
    const summary=detail.querySelector(':scope > summary');if(summary&&!summary.querySelector('[data-v75-section-guide]')){summary.querySelectorAll('[data-v72-guide],.v72-guide-button,.v74-section-guide').forEach(node=>node.remove());const button=document.createElement('button');button.type='button';button.className='v75-section-guide';button.dataset.v75SectionGuide=id;button.textContent='View Guide';const stateNode=summary.querySelector('.v71-step-state');stateNode?.insertAdjacentElement('afterend',button)||summary.appendChild(button)}
  });
  [...new Set(details.map(detail=>detail.parentElement))].forEach(parent=>parent?.classList.add('v75-accordion-stack'));
  ensureReviewPhase(body);applyPhase(activePhase());
}

function moveTopbarAttention(body){
  const bar=document.querySelector('.topbar');if(!bar)return;
  bar.querySelectorAll('.v63-attention,.v70-reminder,[data-v70-reminder]').forEach(node=>{node.classList.add('v75-attention-banner');body.insertBefore(node,body.firstChild)});
}
function adaptView(body){
  switch(currentView()){
    case'overview':case'diagnosis':adaptOverview(body);break;
    case'creators':adaptCreators(body);break;
    case'setup':adaptSetup(body);break;
    case'plan':adaptPlan(body);break;
    case'calendar':adaptCalendar(body);break;
    case'results':adaptResults(body);break;
    case'session':adaptSession(body);break;
    case'video':adaptVideo(body);break;
  }
}

function bodyClasses(){
  document.body.classList.add('v75-reference-ui');
  [...document.body.classList].filter(name=>/^(v72-reference-ui|v73-app-design|v74-reference-ui|v73-view-|v74-video-page)/.test(name)).forEach(name=>document.body.classList.remove(name));
  [...document.body.classList].filter(name=>name.startsWith('v75-view-')).forEach(name=>document.body.classList.remove(name));document.body.classList.add(`v75-view-${currentView()}`);
}
let enhancing=false;
function enhance(){
  if(enhancing)return;enhancing=true;
  try{
    bodyClasses();normalizeTopbar();normalizeSidebar();ensureGuideDrawer();
    const page=root();if(!page)return;
    const existing=page.querySelector(':scope > .v75-page-frame');if(existing)return;
    const frame=document.createElement('div');frame.className='v75-page-frame';[...page.children].filter(node=>node.id!=='v75-guide-backdrop').forEach(node=>frame.appendChild(node));page.appendChild(frame);
    const head=decoratePageHead();const body=ensurePageBody(head);if(currentView()!=='video')ensureSourceNote(body);moveTopbarAttention(body);decoratePanels(body);addStatusClasses(body);adaptView(body);decoratePanels(body);addStatusClasses(body);
    frame.dataset.v75View=currentView();document.title='Accelerator OS V52.1 Reference UI V75';
  }catch(error){console.error('V75 reference rebuild failed',error)}finally{enhancing=false}
}

function anchorIdentity(node){
  if(!node)return null;const target=node.closest?.('details[data-v49-section],details.v67-foundation-section,[data-creator-item],.card,.calendar-card,.upcoming-panel,.v75-panel')||node;
  return{section:target.dataset?.v49Section||'',id:target.id||'',text:clean(target.querySelector?.('h1,h2,h3,h4,summary')?.textContent||target.textContent).slice(0,90),offset:target.getBoundingClientRect().top};
}
function captureViewport(){
  const focus=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;const point=document.elementFromPoint(Math.min(window.innerWidth-1,Math.max(1,window.innerWidth*.42)),Math.min(window.innerHeight-1,Math.max(1,window.innerHeight*.38)));
  return{view:currentView(),scrollY:window.scrollY,anchor:anchorIdentity(focus||point),at:Date.now()};
}
function findAnchor(identity){
  if(!identity)return null;if(identity.section){const node=document.querySelector(`details[data-v49-section="${CSS.escape(identity.section)}"]`);if(node)return node}if(identity.id){const node=document.getElementById(identity.id);if(node)return node}
  const candidates=[...document.querySelectorAll('details,.card,.calendar-card,.upcoming-panel,.v75-panel,[data-creator-item]')];return candidates.find(node=>clean(node.querySelector('h1,h2,h3,h4,summary')?.textContent||node.textContent).slice(0,90)===identity.text)||null;
}
function restoreViewport(snapshot){
  if(!snapshot||snapshot.view!==currentView()||Date.now()-snapshot.at>2500)return;
  const restore=()=>{if(snapshot.view!==currentView())return;const anchor=findAnchor(snapshot.anchor);if(anchor)window.scrollTo(0,Math.max(0,window.scrollY+anchor.getBoundingClientRect().top-snapshot.anchor.offset));else window.scrollTo(0,snapshot.scrollY)};
  requestAnimationFrame(restore);setTimeout(restore,50);setTimeout(restore,160);setTimeout(restore,420);
}

const originalRender=typeof window.render==='function'?window.render:null;
if(originalRender)window.render=function(...args){const snapshot=captureViewport();const result=originalRender.apply(this,args);enhance();restoreViewport(snapshot);return result};

function accordionClick(detail){
  const willOpen=!detail.open;const group=detail.parentElement?.querySelectorAll(':scope > details.v75-accordion,:scope > details[data-v49-section],:scope > details.v67-foundation-section')||[];group.forEach(item=>{if(item!==detail)item.open=false});detail.open=willOpen;
}
document.addEventListener('click',event=>{
  const phase=event.target.closest?.('[data-v75-phase-button]');if(phase){event.preventDefault();event.stopImmediatePropagation();const y=window.scrollY;applyPhase(phase.dataset.v75PhaseButton);window.scrollTo(0,y);return}
  const sectionGuide=event.target.closest?.('[data-v75-section-guide]');if(sectionGuide){event.preventDefault();event.stopImmediatePropagation();const id=sectionGuide.dataset.v75SectionGuide;void openGuides(sectionGuides[id]||['research'],'Video planning guide','Complete teaching copied directly from the supplied planner HTML.');return}
  const pageGuide=event.target.closest?.('[data-v75-page-guide]');if(pageGuide){event.preventDefault();event.stopImmediatePropagation();void openGuides(meta().guides,`${meta().title} guides`,'Full source material, including the original tables, tips, warnings, examples, and methods.');return}
  const guideTab=event.target.closest?.('[data-v75-guide-tab]');if(guideTab){event.preventDefault();renderGuideTab(guideTab.dataset.v75GuideTab);return}
  if(event.target.closest?.('[data-v75-close-guide]')||event.target.id==='v75-guide-backdrop'){event.preventDefault();closeGuide();return}
  if(event.target.closest?.('[data-v75-review-guide]')){event.preventDefault();void openGuides(['retention','cta'],'Review and learning guides','Complete retention and CTA teaching from the supplied planner HTML.');return}
  if(event.target.closest?.('[data-v75-open-review]')){event.preventDefault();const s=appState();if(s){s.currentView='results';window.render?.()}return}
  if(event.target.closest?.('[data-v75-open-calendar]')){event.preventDefault();const s=appState();if(s){s.currentView='calendar';window.render?.()}return}
  const summary=event.target.closest?.('details.v75-accordion > summary,details[data-v49-section] > summary,details.v67-foundation-section > summary');if(summary&&!event.target.closest('button,a,input,select,textarea')){event.preventDefault();event.stopImmediatePropagation();accordionClick(summary.parentElement)}
},true);

document.addEventListener('keydown',event=>{if(event.key==='Escape')closeGuide()});

let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;const page=root();if(!page?.querySelector(':scope > .v75-page-frame')||!document.body.classList.contains(`v75-view-${currentView()}`))enhance()})}
const observer=new MutationObserver(schedule);const observed=root();if(observed)observer.observe(observed,{childList:true,subtree:false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
