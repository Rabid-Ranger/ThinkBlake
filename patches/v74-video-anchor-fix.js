(()=>{
if(window.__v74VideoAnchorFixInstalled)return;
window.__v74VideoAnchorFixInstalled=true;
const phaseMarkup=`<section class="v74-video-flow"><div class="v74-flow-note"><span class="v74-flow-note-icon">i</span><div><strong>Work one phase at a time.</strong> Every section starts closed. Open only the section you are actively working in, and use View Guide for the complete source teaching.</div></div><nav class="v74-phase-tabs" aria-label="Video workflow phases"><button type="button" class="v74-phase-tab" data-v74-phase="plan"><span>1.</span> Plan</button><button type="button" class="v74-phase-tab" data-v74-phase="script"><span>2.</span> Script</button><button type="button" class="v74-phase-tab" data-v74-phase="produce"><span>3.</span> Produce &amp; Publish</button><button type="button" class="v74-phase-tab" data-v74-phase="review"><span>4.</span> Review &amp; Learn</button></nav></section>`;
const guideMap={'video-purpose':'research','video-strategy':'research','video-package':'titles','video-experience':'hooks','video-publish':'cta','video-handoff':'cta'};
function ensure(){
  try{
    if(typeof state==='undefined'||state.currentView!=='video')return;
    document.body.classList.add('v74-reference-ui','v74-video-page');
    let flow=document.querySelector('.v74-video-flow');
    if(!flow){
      const firstSection=document.querySelector('.content details[data-v49-section]');
      const anchor=document.querySelector('.content .v49-video-top,.content .v49-video-head,.content .v49-page-head,.content .page-head')||firstSection?.closest('.v49-accordion-stack')?.previousElementSibling||firstSection?.parentElement?.previousElementSibling;
      if(!anchor)return;
      anchor.insertAdjacentHTML('afterend',phaseMarkup);
      flow=document.querySelector('.v74-video-flow');
    }
    const sections=[...document.querySelectorAll('.content details[data-v49-section]')];
    sections.forEach(detail=>{
      const id=detail.dataset.v49Section;
      const phase=['video-purpose','video-strategy','video-package'].includes(id)?'plan':id==='video-experience'?'script':['video-publish','video-handoff'].includes(id)?'produce':'';
      detail.removeAttribute('data-v74-phase');
      if(phase)detail.dataset.v74PhaseSection=phase;else delete detail.dataset.v74PhaseSection;
      const summary=detail.querySelector(':scope > summary');
      if(summary&&!summary.querySelector('[data-v74-section-guide]')&&guideMap[id]){
        const button=document.createElement('button');
        button.type='button';button.className='v74-section-guide';button.dataset.v74SectionGuide=id;button.textContent='View Guide';
        const stateNode=summary.querySelector('.v71-step-state');stateNode?.insertAdjacentElement('afterend',button)||summary.appendChild(button);
      }
    });
    if(!flow.dataset.v74Initialized){
      flow.dataset.v74Initialized='1';
      const storageKey=`accelerator-v74-phase-${state.currentCreatorId||'creator'}-${state.currentVideoId||'video'}`;
      const selected=flow.querySelector(`button[data-v74-phase="${localStorage.getItem(storageKey)||'plan'}"]`)||flow.querySelector('button[data-v74-phase="plan"]');
      selected?.click();
    }
  }catch(error){console.error('V74 video anchor fix failed',error)}
}
const previous=window.render;
if(typeof previous==='function')window.render=function(...args){const result=previous.apply(this,args);ensure();requestAnimationFrame(ensure);return result};
ensure();
})();
