(()=>{
if(window.__v73AppDesignInstalled)return;
window.__v73AppDesignInstalled=true;
window.__acceleratorBuild='V52.1-reference-ui-v73';

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const appState=()=>{try{return typeof state!=='undefined'?state:null}catch{return null}};
const pageRoot=()=>document.querySelector('.content')||document.querySelector('main')||document.body;

const pageDefinitions={
  overview:{eyebrow:'Creator workspace',purpose:'See what needs attention, run the next coaching step, and leave with one clear commitment.',guideTitle:'Using Creator Home',guideSubtitle:'Orient yourself first, then open only the work that needs attention.'},
  creators:{eyebrow:'Creator management',purpose:'Scan every creator, address due work, and open the right workspace without hunting across the app.',guideTitle:'Managing creator attention',guideSubtitle:'Use due work and coaching cadence to decide where your attention belongs.'},
  setup:{eyebrow:'Foundation',purpose:'Define the audience, message, offer, and operating constraints once, then update them only when strategy changes.',guideTitle:'Building the creator foundation',guideSubtitle:'Create the strategic source of truth that every plan and video should inherit.'},
  plan:{eyebrow:'Monthly planning',purpose:'Choose the month’s priorities and Reach, Trust, and Convert mix before planning individual videos.',guideTitle:'Planning the month',guideSubtitle:'Make a few strategic decisions that reduce choices later in the video workflow.'},
  video:{eyebrow:'Video workflow',purpose:'Work one phase at a time. Use the pop-out guides only when you need teaching or examples.',guideTitle:'Planning a video',guideSubtitle:'Move from viewer and evidence to packaging, story, publishing, and learning.'},
  calendar:{eyebrow:'Operating calendar',purpose:'See planning, publishing, review, and coaching commitments in one place.',guideTitle:'Using the calendar',guideSubtitle:'Schedule only the milestones that change what the coach or creator must do.'},
  results:{eyebrow:'Review and learn',purpose:'Open this when a review is due, then turn performance evidence into one future decision.',guideTitle:'Reviewing a video',guideSubtitle:'Describe what happened, interpret why, and route one lesson forward.'},
  session:{eyebrow:'Live coaching call',purpose:'Capture decisions while the call is happening. Save permanent history only when the session is complete.',guideTitle:'Running the coaching call',guideSubtitle:'Keep the conversation focused on evidence, decisions, ownership, and the next commitment.'}
};

const guideContent={
  overview:{
    intro:'Creator Home is the orientation screen. It should answer what needs attention, why it matters now, and where to go next without making you inspect every page.',
    sections:[
      ['Start with due work','Use the visible attention state to choose the next coaching action. Do not reopen completed strategy work unless new evidence requires it.'],
      ['Use the journey as orientation','Foundation, diagnosis, the 90-day plan, monthly planning, videos, and reviews are a sequence. They are not six competing dashboards.'],
      ['End with one commitment','A useful coaching session should finish with one owner, one next action, and one date.']
    ],
    tip:'When nothing is due, use the next scheduled coaching call or review as the default next action.'
  },
  creators:{
    intro:'This page is for scanning the whole roster. It should help you find exceptions, not force you to reopen every creator.',
    sections:[
      ['Look for attention states','Prioritize overdue diagnosis, planning, review, or coaching work. Healthy creators should stay visually quiet.'],
      ['Open one creator at a time','Use Creator Home as the detailed workspace after choosing who needs attention.'],
      ['Protect coaching capacity','Due work should reflect the agreed cadence, not create artificial urgency for every creator.']
    ],
    warning:'Do not turn every incomplete optional field into a warning. Attention should mean the coach must make or facilitate a decision.'
  },
  setup:{
    intro:'Foundation is the creator’s strategic source of truth. Complete it during onboarding, confirm it, and revise it only when the business or audience actually changes.',
    sections:[
      ['Audience','Define the specific person, situation, problem, desired change, and language the viewer already uses.'],
      ['Message and brand','Clarify the creator’s point of view, promise, proof, tone, and the ideas they want to become known for.'],
      ['Business and funnel','Connect content to the offer, lead path, conversion mechanism, and the next useful viewer action.'],
      ['Capacity and cadence','Record what the creator and team can realistically publish, produce, review, and sustain.']
    ],
    tip:'If a future video decision conflicts with Foundation, either the video is wrong or Foundation needs an explicit strategic update.'
  },
  plan:{
    intro:'Monthly planning converts the 90-day direction into a realistic set of video jobs and priorities. It should reduce decisions inside each individual video plan.',
    table:[
      ['Reach','Bring the right new viewers in.','Demand, repeated problems, outliers, search language, and click patterns.'],
      ['Trust','Change a belief and build preference.','Doubts, objections, misconceptions, stories, and proof.'],
      ['Convert','Help a ready viewer decide or act.','Fit, alternatives, risk, buyer questions, and decision criteria.']
    ],
    sections:[
      ['Choose the month’s outcome','Name the business or audience movement the month is meant to create.'],
      ['Choose the mix','Set a Reach, Trust, and Convert mix that fits the current bottleneck, rather than defaulting to the same content every month.'],
      ['Respect capacity','Plan the number of videos the creator can execute well, not the number that looks ambitious in a dashboard.']
    ],
    warning:'Video job is not video format. A how-to, story, comparison, or case study can serve any job.'
  },
  calendar:{
    intro:'The calendar is the operating layer. It should show when decisions, production, publishing, reviews, and coaching commitments happen.',
    sections:[
      ['Put the calendar first','The month view should orient you before the upcoming-work list.'],
      ['Schedule meaningful reviews','Use 24-hour, 7-day, and 28-day checkpoints when they will produce a useful decision.'],
      ['Keep ownership visible','Every milestone should make clear who owns the next action and whether it is complete.']
    ],
    tip:'If a calendar item does not change someone’s next action, it probably does not need to be on the operating calendar.'
  },
  results:{
    intro:'Review and Learn is not an analytics archive. It is where evidence becomes one practical change to future planning, packaging, structure, or conversion.',
    sections:[
      ['Observe','Record what happened without explaining it away. Use the metrics, retention shape, traffic sources, comments, and relevant context.'],
      ['Interpret','Choose the most plausible explanation supported by the evidence. Separate signal from assumptions.'],
      ['Route','End with one sentence: Because of this video, next time we will…']
    ],
    tip:'A review is complete when a future decision changes, not when every metric has been described.'
  },
  session:{
    intro:'The live call workspace is temporary working space. It helps the coach capture evidence, decisions, ownership, and commitments while the conversation is happening.',
    sections:[
      ['Before the call','Open the creator’s due work and recent evidence. Do not prepare by rereading every page.'],
      ['During the call','Capture the decision, why it was made, who owns the next step, and the due date.'],
      ['After the call','Save the final session record. Unfinished drafts should remain drafts and should not become permanent history.']
    ],
    warning:'Do not use the call form as a second strategy dashboard. Link or route decisions back to the page where they belong.'
  }
};

function currentView(){
  const app=appState();
  if(app?.currentView==='overview'&&app?.v67DiagnosisReview)return 'diagnosis';
  return app?.currentView||'overview';
}

function pageDefinition(){
  const view=currentView();
  if(view==='diagnosis')return{eyebrow:'90-day diagnosis',purpose:'Review the creator’s current signals, identify the real bottleneck, and decide what the next 90 days must change.',guideTitle:'Running the 90-day diagnosis',guideSubtitle:'Use evidence to choose the bottleneck before choosing tactics.'};
  return pageDefinitions[view]||{eyebrow:'Creator workspace',purpose:'Complete the work on this page, then return to Creator Home for the next decision.',guideTitle:'Using this workspace',guideSubtitle:'Keep the working page focused and open guidance only when needed.'};
}

function diagnosisGuide(){
  return{
    intro:'The diagnosis is a periodic strategic review. It should explain where the creator is now, what is preventing progress, and which bottleneck deserves the next 90 days of attention.',
    sections:[
      ['Read the evidence','Use recent videos, channel movement, audience response, execution capacity, and business signals.'],
      ['Name the bottleneck','Choose the constraint that most limits progress now. Avoid solving five secondary symptoms at once.'],
      ['Route the decision','Update the 90-day direction, monthly plan, or creator strategy only where the diagnosis requires a change.']
    ],
    warning:'A diagnosis is not a list of everything that could improve. It is a decision about what matters most next.'
  };
}

function renderGuide(key){
  const guide=key==='diagnosis'?diagnosisGuide():guideContent[key]||guideContent.overview;
  let html=`<div class="v72-guide-intro"><p>${escapeHtml(guide.intro||'')}</p></div>`;
  if(guide.table){
    html+=`<table class="v72-guide-table"><thead><tr><th>Video job</th><th>Purpose</th><th>Research</th></tr></thead><tbody>${guide.table.map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  for(const section of guide.sections||[]){html+=`<section class="v72-guide-section"><h3>${escapeHtml(section[0])}</h3><p>${escapeHtml(section[1])}</p></section>`}
  if(guide.tip)html+=`<div class="v72-guide-tip"><strong>Useful check:</strong> ${escapeHtml(guide.tip)}</div>`;
  if(guide.warning)html+=`<div class="v72-guide-warning"><strong>Watch for this:</strong> ${escapeHtml(guide.warning)}</div>`;
  return html;
}

function openPageGuide(){
  const view=currentView();
  const key=view==='diagnosis'?'diagnosis':view;
  const definition=pageDefinition();
  const backdrop=document.querySelector('#v72-guide-backdrop');
  if(!backdrop)return;
  const eyebrow=document.querySelector('#v72-guide-eyebrow');
  const title=document.querySelector('#v72-guide-title');
  const subtitle=document.querySelector('#v72-guide-subtitle');
  const content=document.querySelector('#v72-guide-content');
  if(eyebrow)eyebrow.textContent='Workspace guide';
  if(title)title.textContent=definition.guideTitle;
  if(subtitle)subtitle.textContent=definition.guideSubtitle;
  if(content)content.innerHTML=renderGuide(key);
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden','false');
}

function clearViewClasses(){
  [...document.body.classList].filter(name=>name.startsWith('v73-view-')).forEach(name=>document.body.classList.remove(name));
  document.body.classList.add(`v73-view-${currentView()}`);
}

function findPageHead(){
  const root=pageRoot();
  return root.querySelector(':scope > .page-head,:scope > .v49-page-head,.page-head,.v49-page-head')||root.querySelector('h1,h2')?.parentElement||null;
}

function decoratePageHead(){
  const view=currentView();
  if(view==='video')return;
  const root=pageRoot();
  const head=findPageHead();
  if(!head||head.closest('[role="dialog"],.modal,.v72-guide-drawer'))return;
  head.classList.add('v73-page-head');
  const title=head.querySelector('h1,h2');
  if(!title)return;
  let copy=head.querySelector(':scope > .v73-page-copy');
  if(!copy){
    copy=document.createElement('div');
    copy.className='v73-page-copy';
    title.parentNode.insertBefore(copy,title);
    copy.appendChild(title);
  }
  const definition=pageDefinition();
  let eyebrow=copy.querySelector('.v73-page-eyebrow');
  if(!eyebrow){eyebrow=document.createElement('span');eyebrow.className='v73-page-eyebrow';copy.insertBefore(eyebrow,copy.firstChild)}
  eyebrow.textContent=definition.eyebrow;
  let purpose=copy.querySelector('.v73-page-purpose');
  if(!purpose){purpose=document.createElement('p');purpose.className='v73-page-purpose';copy.appendChild(purpose)}
  purpose.textContent=definition.purpose;

  let actions=head.querySelector(':scope > .v73-page-actions');
  if(!actions){actions=document.createElement('div');actions.className='v73-page-actions';head.appendChild(actions)}
  const directActions=[...head.children].filter(node=>node!==copy&&node!==actions&&(node.matches?.('button,.button,a.button')||node.classList?.contains('actions')));
  directActions.forEach(node=>actions.appendChild(node));
  if(!actions.querySelector('[data-v73-page-guide]')){
    const button=document.createElement('button');
    button.type='button';button.className='v73-page-guide';button.dataset.v73PageGuide='1';button.textContent='View Guide';
    actions.appendChild(button);
  }
  root.dataset.v73Page=view;
}

function ensureSaveState(){
  const topbar=document.querySelector('.topbar');
  if(!topbar||topbar.querySelector('.v73-save-state'))return;
  const stateNode=document.createElement('span');
  stateNode.className='v73-save-state';
  stateNode.textContent='Auto-saved';
  stateNode.setAttribute('aria-live','polite');
  const actions=topbar.querySelector('.topbar-actions,.actions,[class*="topbar-right"]');
  (actions||topbar).appendChild(stateNode);
}

let saveTimer=0;
function showSaving(){
  const node=document.querySelector('.v73-save-state');
  if(!node)return;
  node.classList.add('saving');node.textContent='Saving';
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{node.classList.remove('saving');node.textContent='Auto-saved'},650);
}

function ownHeading(card){
  return[...card.querySelectorAll('h2,h3,h4')].find(heading=>heading.closest('.card')===card)||null;
}

function decorateCards(){
  const root=pageRoot();
  const cards=[...root.querySelectorAll('.card')].filter(card=>!card.closest('.v72-guide-drawer')&&!card.closest('.card .card'));
  for(const card of cards){
    const heading=ownHeading(card);
    if(!heading)continue;
    const label=clean(heading.textContent).toLowerCase();
    card.classList.add('v73-work-card');
    heading.classList.add('v73-card-heading');
    card.classList.remove('v73-coach-note','v73-approved-card','v73-warning-card','v73-danger-card');
    if(/coach note|coach feedback|coach recommendation|coaching note/.test(label))card.classList.add('v73-coach-note');
    else if(/approved|final selection|confirmed|complete handoff|ready to execute/.test(label))card.classList.add('v73-approved-card');
    else if(/needs attention|changes requested|due|review needed|watch/.test(label))card.classList.add('v73-warning-card');
    else if(/blocked|error|missing|required before/.test(label))card.classList.add('v73-danger-card');
  }
}

function statusTone(label){
  if(/approved|complete|completed|confirmed|saved|healthy|on track|ready to execute/.test(label))return'green';
  if(/changes requested|needs attention|attention|due|overdue|review needed|not reviewed|warning|waiting/.test(label))return'amber';
  if(/blocked|error|failed|missing|critical|cannot|incomplete required/.test(label))return'red';
  if(/ready|active|in progress|current|review|draft|scheduled|planned/.test(label))return'blue';
  return'';
}

function decorateStatuses(){
  const root=pageRoot();
  const nodes=[...root.querySelectorAll('span,small,em,button')].filter(node=>{
    if(node.closest('.v72-guide-drawer,.v72-phase-tabs,.sidebar,.v73-page-actions'))return false;
    if(node.matches('.button')||node.querySelector('input,textarea,select'))return false;
    const label=clean(node.textContent).toLowerCase();
    if(!label||label.length>42)return false;
    const className=String(node.className||'').toLowerCase();
    return/(badge|chip|pill|status|attention|due)/.test(className)||/^(approved|complete|completed|confirmed|saved|ready|active|in progress|draft|scheduled|planned|changes requested|needs attention|due|overdue|blocked|error|missing|not started|not reviewed)$/i.test(label);
  });
  for(const node of nodes){
    node.classList.remove('v73-status-blue','v73-status-green','v73-status-amber','v73-status-red');
    node.classList.add('v73-status');
    const tone=statusTone(clean(node.textContent).toLowerCase());
    if(tone)node.classList.add(`v73-status-${tone}`);
  }
}

function decorateCreatorRows(){
  for(const row of document.querySelectorAll('.creator-row-v14,.creator-row-v13,.creator-row')){
    if(row.querySelector('.v73-creator-avatar'))continue;
    const name=row.querySelector('h2,h3,h4,strong,b,[class*="name"]');
    const label=clean(name?.textContent||row.textContent);
    if(!label)return;
    const avatar=document.createElement('span');
    avatar.className='v73-creator-avatar';
    avatar.textContent=label.split(/\s+/).slice(0,2).map(word=>word[0]||'').join('').toUpperCase();
    row.insertBefore(avatar,row.firstChild);
  }
}

function decorateEmptyStates(){
  const root=pageRoot();
  for(const node of root.querySelectorAll('p,div')){
    if(node.children.length>1||node.closest('.v72-guide-drawer,.sidebar,.topbar'))continue;
    const label=clean(node.textContent).toLowerCase();
    if(label.length<5||label.length>110)continue;
    if(/^(no .* yet|nothing scheduled|no upcoming|no videos|no reviews|no events|nothing here)/.test(label))node.classList.add('v73-empty-state');
  }
}

function decorateCallWorkspace(){
  const field=document.querySelector('[data-session-bind]');
  if(!field)return;
  const workspace=field.closest('[role="dialog"],.modal,.card,form,section');
  workspace?.classList.add('v73-call-workspace');
}

function decorateVideoPage(){
  if(currentView()!=='video')return;
  const head=findPageHead();
  head?.classList.add('v73-page-head');
}

let enhancing=false;
function enhance(){
  if(enhancing)return;
  enhancing=true;
  try{
    document.body.classList.add('v73-app-design');
    clearViewClasses();
    ensureSaveState();
    decoratePageHead();
    decorateVideoPage();
    decorateCards();
    decorateStatuses();
    decorateCreatorRows();
    decorateEmptyStates();
    decorateCallWorkspace();
    document.title='Accelerator OS V52.1 App Design V73';
  }catch(error){console.error('V73 app design failed',error)}finally{enhancing=false}
}

function scheduleEnhance(){requestAnimationFrame(enhance)}

document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-v73-page-guide]')){event.preventDefault();event.stopPropagation();openPageGuide();return}
  setTimeout(scheduleEnhance,0);
});
document.addEventListener('input',showSaving,true);
document.addEventListener('change',showSaving,true);

const observer=new MutationObserver(()=>scheduleEnhance());
observer.observe(document.documentElement,{subtree:true,childList:true});

const previousRender=window.render;
if(typeof previousRender==='function'){
  window.render=function(...args){const result=previousRender.apply(this,args);enhance();setTimeout(enhance,0);setTimeout(enhance,120);return result};
}
enhance();
})();
