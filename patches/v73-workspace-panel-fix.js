(()=>{
if(window.__v73WorkspacePanelFixInstalled)return;
window.__v73WorkspacePanelFixInstalled=true;
const text=value=>String(value??'').replace(/\s+/g,' ').trim();
const stateNow=()=>{try{return typeof state!=='undefined'?state:null}catch{return null}};
function candidateFor(heading,root){
  const explicit=heading.closest('details,section,article,.card,[class*="foundation"],[class*="setup"],[class*="stage"],[class*="panel"],[class*="section"]');
  if(explicit&&explicit!==root&&!explicit.classList.contains('page-head')&&!explicit.classList.contains('v73-page-head'))return explicit;
  let node=heading.parentElement;
  while(node&&node.parentElement&&node.parentElement!==root){
    if(node.querySelector('input,textarea,select,button,[contenteditable="true"]'))return node;
    node=node.parentElement;
  }
  return node&&node!==root?node:null;
}
function markPanel(panel,heading=null){
  if(!panel||panel.classList.contains('v73-generic-work-panel'))return;
  panel.classList.add('v73-work-card','v73-generic-work-panel');
  if(panel.tagName==='DETAILS')return;
  const directHeader=heading?.closest('header,.section-title');
  if(directHeader&&directHeader.parentElement===panel)directHeader.classList.add('v73-generic-panel-head');
  else heading?.classList.add('v73-card-heading');
}
function decorate(){
  const view=stateNow()?.currentView;
  if(view!=='setup'&&view!=='plan')return;
  const root=document.querySelector('.content');if(!root)return;

  if(view==='setup'){
    root.querySelectorAll('details.v67-foundation-section,[data-v67-foundation]').forEach(panel=>markPanel(panel));
  }

  const seen=new Set();
  for(const heading of root.querySelectorAll('h2,h3,h4')){
    if(heading.closest('.v73-page-head,.page-head,.v72-guide-drawer,[role="dialog"],summary,.v73-work-card'))continue;
    const label=text(heading.textContent);if(!label||label.length>110)continue;
    const panel=candidateFor(heading,root);
    if(!panel||seen.has(panel)||panel.closest('.v72-guide-drawer,[role="dialog"]'))continue;
    if(panel===root||panel.contains(root.querySelector('.v73-page-head')))continue;
    const hasWork=panel.querySelector('input,textarea,select,button,[contenteditable="true"],details');
    if(!hasWork)continue;
    seen.add(panel);markPanel(panel,heading);
  }
}
let frame=0;
const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;decorate()})};
const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{subtree:true,childList:true});
const prior=window.render;if(typeof prior==='function')window.render=function(...args){const result=prior.apply(this,args);decorate();setTimeout(decorate,0);return result};
decorate();
})();
