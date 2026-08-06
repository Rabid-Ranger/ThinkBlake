(()=>{
if(window.__v75PolishInstalled)return;
window.__v75PolishInstalled=true;
const copy={
 overview:['Creator Home','See the creator’s current priority, what needs attention, and the clearest next action without searching across the system.'],
 creators:['All Creators','Review the full roster, identify who needs attention, and move directly into the right creator workspace.'],
 setup:['Creator Foundation','Define the audience, business journey, positioning, and strategic direction that every future plan should use.'],
 plan:['Monthly Plan','Turn the strategy into a focused month of videos, assignments, dates, and clear ownership.'],
 calendar:['Calendar','See coaching calls, assignments, production work, publishing, and reviews in one color-coded timeline.'],
 results:['Review & Learn','Capture performance, interpret what happened, and turn the result into a decision for the next video or plan.']
};
function polish(){
 try{
  const view=typeof state!=='undefined'?state.currentView:'overview';
  const hero=document.querySelector('.content>.v75-page-hero');
  if(hero&&copy[view]){
   const [title,purpose]=copy[view];
   const h=hero.querySelector('h2'),p=hero.querySelector('p');
   if(h)h.textContent=title;
   if(p)p.textContent=purpose;
  }
  document.querySelectorAll('.v75-page-actions [data-v74-section-guide]').forEach(node=>node.remove());
  const actions=hero?.querySelector('.v75-page-actions');
  if(actions){
   const guides=[...actions.querySelectorAll('[data-v74-page-guide]')];
   guides.slice(1).forEach(node=>node.remove());
  }
 }catch(error){console.error('V75 polish failed',error)}
}
const prior=window.render;
if(typeof prior==='function')window.render=function(...args){const result=prior.apply(this,args);requestAnimationFrame(polish);return result};
requestAnimationFrame(polish);
})();
