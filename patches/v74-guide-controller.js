(()=>{
if(window.__v74GuideControllerInstalled)return;
window.__v74GuideControllerInstalled=true;
const map={'video-purpose':['research'],'video-strategy':['research'],'video-package':['titles','thumbtips','thumbstrategies'],'video-experience':['hooks','story','retention'],'video-publish':['cta'],'video-handoff':['cta']};
function drawer(){
 let root=document.querySelector('#v74-guide-backdrop');
 if(root)return root;
 document.body.insertAdjacentHTML('beforeend','<div class="v74-guide-backdrop" id="v74-guide-backdrop" aria-hidden="true"><aside class="v74-guide-drawer" role="dialog" aria-modal="true"><header class="v74-guide-head"><div><span id="v74-guide-eyebrow">Source guide</span><h2 id="v74-guide-title">Guide</h2><p id="v74-guide-subtitle">Complete teaching copied from the supplied vidIQ planner.</p></div><button type="button" class="v74-guide-close" data-v74-close-guide aria-label="Close guide">×</button></header><nav class="v74-guide-tabs" id="v74-guide-tabs"></nav><div class="v74-guide-content" id="v74-guide-content"></div></aside></div>');
 return document.querySelector('#v74-guide-backdrop');
}
function showTab(key){
 const guide=window.V74_SOURCE_GUIDES?.[key];
 if(!guide)return;
 document.querySelectorAll('.v74-guide-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.v74GuideTab===key));
 document.querySelector('#v74-guide-title').textContent=guide.title;
 const content=document.querySelector('#v74-guide-content');
 content.innerHTML=guide.content;
 content.scrollTop=0;
}
function open(keys){
 const available=keys.filter(key=>window.V74_SOURCE_GUIDES?.[key]);
 if(!available.length)return;
 const root=drawer();
 document.querySelector('#v74-guide-tabs').innerHTML=available.map(key=>`<button type="button" class="v74-guide-tab" data-v74-guide-tab="${key}">${window.V74_SOURCE_GUIDES[key].title}</button>`).join('');
 showTab(available[0]);
 root.classList.add('open');
 root.setAttribute('aria-hidden','false');
}
function close(){const root=document.querySelector('#v74-guide-backdrop');root?.classList.remove('open');root?.setAttribute('aria-hidden','true')}
document.addEventListener('click',event=>{
 const guide=event.target.closest?.('[data-v74-section-guide]');
 if(guide){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();open(map[guide.dataset.v74SectionGuide]||['research']);return}
 const tab=event.target.closest?.('[data-v74-guide-tab]');
 if(tab){event.preventDefault();event.stopPropagation();showTab(tab.dataset.v74GuideTab);return}
 if(event.target.closest?.('[data-v74-close-guide]')||event.target.id==='v74-guide-backdrop'){event.preventDefault();close()}
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
})();
