(()=>{
if(window.__v75ReferenceSystemInstalled)return;
window.__v75ReferenceSystemInstalled=true;
window.__acceleratorBuild='V52.1-reference-system-v75';
const pageMeta={
 overview:{eyebrow:'Creator workspace',purpose:'See what matters now, what is blocked, and the next useful coaching action without scanning the whole system.',status:'Current cycle'},
 creators:{eyebrow:'Client roster',purpose:'Compare creator status, attention needs, and progress before choosing where to work.',status:'Portfolio view'},
 setup:{eyebrow:'Foundation',purpose:'Define the creator, audience, positioning, and channel direction before monthly planning begins.',status:'Strategic setup'},
 diagnosis:{eyebrow:'Diagnosis',purpose:'Turn evidence into a clear strategic diagnosis before prescribing new work.',status:'Evidence first'},
 plan:{eyebrow:'Monthly planning',purpose:'Choose the smallest set of priorities that can create meaningful progress this cycle.',status:'Active plan'},
 calendar:{eyebrow:'Operating calendar',purpose:'See what is happening, why it matters, and where timing or workload needs attention.',status:'Schedule view'},
 results:{eyebrow:'Review and learn',purpose:'Interpret performance, capture lessons, and decide what changes in the next cycle.',status:'Learning loop'},
 video:{eyebrow:'Video workflow',purpose:'Move one video through planning, scripting, production, publishing, and review without losing the strategic thread.',status:'Active video'},
 session:{eyebrow:'Coaching call',purpose:'Run the conversation from context to decision, then leave with clear ownership and next actions.',status:'Live workspace'}
};
const stateRef=()=>{try{return typeof state!=='undefined'?state:null}catch{return null}};
const view=()=>stateRef()?.currentView||'overview';
const text=node=>(node?.textContent||'').replace(/\s+/g,' ').trim();
function addPageIdentity(){
 const meta=pageMeta[view()]||pageMeta.overview;
 document.body.classList.add('v75-reference-system');
 [...document.body.classList].filter(name=>name.startsWith('v75-view-')).forEach(name=>document.body.classList.remove(name));
 document.body.classList.add(`v75-view-${view()}`);
 const head=document.querySelector('.content .page-head,.content .v49-page-head,.content .v73-page-head,.content .v49-video-top');
 if(head){head.dataset.v75Eyebrow=meta.eyebrow;let purpose=head.querySelector('.v73-page-purpose,[data-v75-purpose]');if(!purpose){purpose=document.createElement('p');purpose.dataset.v75Purpose='1';const title=head.querySelector('h1,h2');title?.insertAdjacentElement('afterend',purpose)}if(purpose&&!text(purpose))purpose.textContent=meta.purpose}
 let orientation=document.querySelector('.content>.v75-orientation');
 if(!orientation&&view()!=='video'){
  orientation=document.createElement('section');orientation.className='v75-orientation';
  orientation.innerHTML=`<div class="v75-orientation-copy"><span class="v75-orientation-icon">i</span><div><strong>${meta.purpose}</strong><p>Work from the highest-signal item first. Supporting details stay available inside the relevant section or guide.</p></div></div><div class="v75-orientation-meta"><span class="v75-chip blue">${meta.status}</span><span class="v75-chip green">Auto-saved</span></div>`;
  const content=document.querySelector('.content');const first=head?.nextElementSibling||content?.firstElementChild;if(content&&first)content.insertBefore(orientation,first);else content?.prepend(orientation)
 }
}
function decorateCards(){
 const selectors=['.card','.video-card','.calendar-card','.upcoming-panel','.v73-generic-work-panel','.metric-card','.score-card'];
 const cards=[...document.querySelectorAll(selectors.join(','))];
 cards.forEach((card,index)=>{
  if(card.closest('.v74-guide-drawer,.modal-content,[role=dialog]'))return;
  card.dataset.v75Card='1';
  if(card.querySelector(':scope>.v75-card-head'))return;
  const heading=card.querySelector(':scope>h2,:scope>h3,:scope>.card-title,:scope>header h2,:scope>header h3');
  if(!heading)return;
  const title=text(heading);if(!title)return;
  const subtitle=card.querySelector(':scope>p,:scope>header p');
  const head=document.createElement('div');head.className='v75-card-head';
  head.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-start"><span class="v75-step">${String(index+1).padStart(2,'0')}</span><div><h3>${title}</h3>${subtitle?`<p>${text(subtitle)}</p>`:''}</div></div>`;
  heading.style.display='none';if(subtitle)subtitle.style.display='none';card.prepend(head);
  const body=document.createElement('div');body.className='v75-card-body';
  while(head.nextSibling)body.appendChild(head.nextSibling);card.appendChild(body)
 })
}
function decorateSections(){
 document.querySelectorAll('.content h3,.content h4').forEach(node=>{
  if(node.closest('.v75-card-head,.v74-guide-drawer,summary,.modal-content'))return;
  const value=text(node);if(!value||value.length>90)return;
  if(/^(what|why|how|goal|priority|viewer|strategy|evidence|decision|next|results|risks|notes|actions|calendar|review|plan|coach)/i.test(value))node.dataset.v75SectionTitle='1'
 });
 document.querySelectorAll('.content details').forEach(detail=>{if(!detail.matches('[data-v49-section],.v67-foundation-section'))detail.dataset.v75WorkSection='1'})
}
function decorateFields(){
 document.querySelectorAll('.content input,.content textarea,.content select').forEach(control=>{
  if(control.closest('.v75-field-group,.topbar,.v74-guide-drawer,.v74-phase-tabs,.modal-content'))return;
  const label=control.closest('label');
  const wrapper=label&&label.children.length<=4?label:control.parentElement;
  if(!wrapper||wrapper.matches('td,th,.button-group,.top-actions'))return;
  wrapper.classList.add('v75-field-group');
  if(!wrapper.querySelector('.v75-field-help')){
   const help=document.createElement('p');help.className='v75-field-help';help.textContent=control.tagName==='TEXTAREA'?'Capture the decision or evidence clearly enough that another coach could understand it later.':'Choose the option that best reflects the current strategic decision.';wrapper.appendChild(help)
  }
 })
}
function decorateStatuses(){
 document.querySelectorAll('.badge,.status,.pill,[class*="status-"]').forEach(node=>{
  if(node.closest('.topbar,.v74-guide-drawer'))return;
  const value=text(node).toLowerCase();
  if(!value)return;
  const host=node.closest('.card,.creator-row,.creator-row-v14,.v303-creator-row')||node;
  if(host.querySelector(':scope>.v75-status'))return;
  let type='';if(/complete|approved|done|ready|published|on track/.test(value))type='complete';else if(/blocked|overdue|error|missing/.test(value))type='blocked';else if(/attention|due|review|pending|needs/.test(value))type='attention';if(!type)return;
  const box=document.createElement('div');box.className=`v75-status ${type}`;box.innerHTML=`<div><strong>${type==='complete'?'Complete':type==='blocked'?'Blocked':'Needs attention'}</strong><p>${text(node)}</p></div>`;
  if(host!==node)host.appendChild(box)
 })
}
function decorateActions(){
 document.querySelectorAll('.content .button-row,.content .actions,.content .form-actions,.content .footer-actions').forEach(row=>row.classList.add('v75-action-row'))
}
function decorateEmptyStates(){
 document.querySelectorAll('.empty-state,.empty,.no-results,[data-empty]').forEach(node=>{
  if(node.classList.contains('v75-empty'))return;node.classList.add('v75-empty');
  if(!node.querySelector('.v75-empty-icon'))node.insertAdjacentHTML('afterbegin','<span class="v75-empty-icon">+</span>')
 })
}
function decorateReviewBlocks(){
 document.querySelectorAll('.coach-review,.approval-panel,.review-panel,[class*="coach-note"],[class*="approval"]').forEach(node=>{
  if(node.classList.contains('v75-review-block')||node.closest('.v74-guide-drawer'))return;node.classList.add('v75-review-block');
  const heading=node.querySelector('h3,h4,strong');if(heading&&!node.querySelector('.v75-review-head')){const head=document.createElement('div');head.className='v75-review-head';head.innerHTML=`<strong>${text(heading)||'Coach review'}</strong><span class="v75-chip purple">Review</span>`;heading.style.display='none';node.prepend(head);const body=document.createElement('div');body.className='v75-review-body';while(head.nextSibling)body.appendChild(head.nextSibling);node.appendChild(body)}
 })
}
let running=false;
function enhance(){if(running)return;running=true;try{addPageIdentity();decorateCards();decorateSections();decorateFields();decorateStatuses();decorateActions();decorateEmptyStates();decorateReviewBlocks();document.title='Accelerator OS V52.1 Reference System V75'}catch(error){console.error('V75 reference system failed',error)}finally{running=false}}
const previous=window.render;if(typeof previous==='function')window.render=function(...args){const result=previous.apply(this,args);enhance();requestAnimationFrame(enhance);return result};
const observer=new MutationObserver(()=>requestAnimationFrame(enhance));observer.observe(document.documentElement,{subtree:true,childList:true});
enhance();
})();
