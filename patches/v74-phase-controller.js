(()=>{
if(window.__v74PhaseControllerInstalled)return;
window.__v74PhaseControllerInstalled=true;
const sections={plan:['video-purpose','video-strategy','video-package'],script:['video-experience'],produce:['video-publish','video-handoff'],review:[]};
const key=()=>`accelerator-v74-phase-${state?.currentCreatorId||'creator'}-${state?.currentVideoId||'video'}`;
function cleanSectionAttributes(){
 document.querySelectorAll('.content details[data-v49-section]').forEach(detail=>{
  const id=detail.dataset.v49Section;
  const phase=sections.plan.includes(id)?'plan':sections.script.includes(id)?'script':sections.produce.includes(id)?'produce':'';
  detail.removeAttribute('data-v74-phase');
  if(phase)detail.dataset.v74PhaseSection=phase;else delete detail.dataset.v74PhaseSection;
 });
}
function reviewPanel(){
 let panel=document.querySelector('.v74-review-phase');
 if(panel)return panel;
 const anchor=document.querySelector('details[data-v49-section="video-handoff"]');
 if(!anchor)return null;
 panel=document.createElement('section');
 panel.className='v74-review-phase';
 panel.innerHTML='<header class="v74-review-head"><h3>Review and learn from the video</h3><p>Use this after the video is published and a review is due.</p></header><div class="v74-review-body"><div class="v74-review-grid"><article class="v74-review-card"><span>24 hours</span><strong>Packaging and opening</strong><p>Check click response, first-minute behavior, and launch problems.</p></article><article class="v74-review-card"><span>7 days</span><strong>Viewer journey</strong><p>Review retention, traffic sources, comments, and promise delivery.</p></article><article class="v74-review-card"><span>28 days</span><strong>Strategic learning</strong><p>Choose what this changes in future planning, packaging, structure, or CTA.</p></article></div><div class="v74-review-actions"><button type="button" class="button" data-v74-open-review>Open Review & Learn</button><button type="button" class="button secondary" data-v74-open-calendar>Open calendar</button><button type="button" class="button secondary" data-v74-review-guide>View Full Guides</button></div></div>';
 anchor.insertAdjacentElement('afterend',panel);
 return panel;
}
function apply(id='plan'){
 if(!sections[id])id='plan';
 cleanSectionAttributes();
 try{localStorage.setItem(key(),id)}catch{}
 document.querySelectorAll('.v74-phase-tab').forEach(button=>button.classList.toggle('active',button.dataset.v74Phase===id));
 document.querySelectorAll('.content details[data-v49-section]').forEach(detail=>{
  const show=sections[id].includes(detail.dataset.v49Section);
  detail.hidden=!show;
  detail.classList.toggle('v74-phase-hidden',!show);
  detail.open=false;
 });
 const panel=reviewPanel();
 if(panel){panel.hidden=id!=='review';panel.classList.toggle('active',id==='review')}
}
function ensure(){
 if(typeof state==='undefined'||state.currentView!=='video')return;
 if(!document.querySelector('.v74-video-flow'))return;
 cleanSectionAttributes();
 const active=document.querySelector('.v74-phase-tab.active')?.dataset.v74Phase;
 apply(active||localStorage.getItem(key())||'plan');
}
document.addEventListener('click',event=>{
 const button=event.target.closest?.('button.v74-phase-tab[data-v74-phase]');
 if(!button)return;
 event.preventDefault();
 event.stopPropagation();
 event.stopImmediatePropagation();
 apply(button.dataset.v74Phase);
},true);
const previous=window.render;
if(typeof previous==='function')window.render=function(...args){const result=previous.apply(this,args);cleanSectionAttributes();ensure();requestAnimationFrame(()=>{cleanSectionAttributes();ensure()});return result};
cleanSectionAttributes();
ensure();
})();
