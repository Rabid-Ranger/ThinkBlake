/* Coaching principles guide decisions; templates never count as research proof. */
(()=>{
  const get=n=>{try{return(0,eval)('typeof '+n+'!=="undefined"?'+n+':undefined')}catch{return null}};
  const original=get('renderVideoDecision');if(typeof original!=='function')return;
  const opening='<section class="video-quality-guide"><h2>Make the opening earn the next minute.</h2><p>Confirm the title’s promise immediately. Give the viewer one specific question they want answered, then start delivering.</p><details><summary>Check the opening</summary><ul><li><b>Confirm the click:</b> show or name the promised result, problem or decision.</li><li><b>Create honest curiosity:</b> an unresolved cause, surprising contrast, consequential choice or test—not “you won’t believe what happens.”</li><li><b>Make it credible:</b> use a real demonstration, example or relevant experience. Never invent proof or credentials.</li><li><b>Give direction:</b> make the payoff and approach clear without reading out a list of sections. Promise, proof and plan can appear in the order that fits this video.</li><li><b>Begin:</b> cut greetings, repeated setup and filler. Read it aloud in the creator’s voice; do not force a fixed duration.</li></ul></details></section>';
  const structure='<section class="video-quality-guide"><p><b>Keep pulling the viewer forward.</b> Each section should change what they know, can do or need to decide. Pay off the previous question, then expose the specific next obstacle or consequence. Avoid generic “next up” bridges and artificial cliffhangers.</p></section>';
  const wrapped=function(c,v,id){
    const html=original(c,v,id);
    if(window.__acceleratorCreatorPlannerMode&&id==='job'&&v.job){
      const jobs={Reach:'Help relevant new viewers discover you.',Trust:'Build confidence in your experience, judgment or approach.',Convert:'Help qualified viewers take a specific next step toward your offer.'};
      return '<section class="video-quality-guide"><h2>This video’s job: '+String(v.job).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</h2><p>'+(jobs[v.job]||'Confirm the intended job with your coach.')+'</p><p>Your coach has already set this. Keep it unless the purpose of the video changes.</p></section><details><summary>Review or change the video job</summary>'+html+'</details>';
    }
    if(id==='hook'){
      const tpl=document.createElement('template');tpl.innerHTML=html;
      const fields=tpl.content.querySelector('[data-bind="hook.draft"]')?.closest('.fields');
      if(!fields)return opening+html;
      const draft=fields.outerHTML;fields.remove();
      return opening+draft+'<details class="video-optional-patterns"><summary>Optional opening patterns and starters</summary><p>Use these to explore an approach. Replace placeholders and adapt them to the actual video; a suggested pattern is not a quality verdict.</p>'+tpl.innerHTML+'</details>';
    }
    return id==='structure'?structure+html:html;
  };
  window.__acceleratorDecisionGuidance=wrapped;(0,eval)('renderVideoDecision=window.__acceleratorDecisionGuidance');delete window.__acceleratorDecisionGuidance;
  // A coach can revisit any section. Continue still shows its completeness checks.
  if(!window.__acceleratorCreatorPlannerMode){
    const top=get('plannerTop');
    if(typeof top==='function'){
      window.__acceleratorPlannerTop=(...args)=>{const tpl=document.createElement('template');tpl.innerHTML=top(...args);tpl.content.querySelectorAll('[data-action="video-step"]').forEach(b=>{b.disabled=false;b.classList.remove('locked');});return tpl.innerHTML;};
      (0,eval)('plannerTop=window.__acceleratorPlannerTop');delete window.__acceleratorPlannerTop;
      document.addEventListener('click',event=>{const b=event.target.closest('[data-action="video-step"]');if(!b)return;const v=get('video')?.(),i=Number(b.dataset.index);if(!v||!Number.isInteger(i)||i<0||i>12)return;event.preventDefault();event.stopImmediatePropagation();v.flowStep=i;v.visitedFlow=Math.max(v.visitedFlow||0,i);get('save')?.();get('render')?.();window.scrollTo(0,0);},true);
    }
  }
  const style=document.createElement('style');style.textContent='.video-quality-guide{padding:16px 18px;border:1px solid var(--line,#dce3e6);border-radius:12px;background:var(--soft,#f4f7f8);margin:0 0 20px}.video-quality-guide h2{font-size:21px;margin:0 0 8px}.video-quality-guide p,.video-quality-guide li{line-height:1.65}.video-quality-guide li{margin:8px 0}.video-quality-guide summary,.video-optional-patterns>summary{cursor:pointer;font-weight:750}.video-optional-patterns{margin:20px 0}';document.head.appendChild(style);
})();
