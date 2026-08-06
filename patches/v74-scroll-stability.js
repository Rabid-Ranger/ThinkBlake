(()=>{
if(window.__v74ScrollStabilityInstalled)return;
window.__v74ScrollStabilityInstalled=true;
let pending=null;
let restoreTimers=[];
function isVideoControl(target){
 return Boolean(target?.closest?.('details[data-v49-section]')&&target.matches?.('input,select,textarea,[contenteditable="true"]'));
}
function capture(target){
 if(typeof state==='undefined'||state.currentView!=='video'||!isVideoControl(target))return;
 const section=target.closest('details[data-v49-section]');
 pending={
  view:'video',
  x:window.scrollX,
  y:window.scrollY,
  sectionId:section?.dataset.v49Section||'',
  sectionTop:section?.getBoundingClientRect().top??null,
  at:Date.now()
 };
}
function clearTimers(){restoreTimers.forEach(clearTimeout);restoreTimers=[]}
function restore(snapshot){
 if(!snapshot||snapshot.view!=='video'||typeof state==='undefined'||state.currentView!=='video'||Date.now()-snapshot.at>2500)return;
 clearTimers();
 const apply=()=>{
  if(typeof state==='undefined'||state.currentView!=='video')return;
  window.scrollTo(snapshot.x,snapshot.y);
  const section=snapshot.sectionId?document.querySelector(`details[data-v49-section="${snapshot.sectionId}"]`):null;
  if(section&&snapshot.sectionTop!==null){
   const drift=section.getBoundingClientRect().top-snapshot.sectionTop;
   if(Math.abs(drift)>1)window.scrollBy(0,drift);
  }
 };
 requestAnimationFrame(()=>{apply();requestAnimationFrame(apply)});
 [0,40,120,260,500,800].forEach(delay=>restoreTimers.push(setTimeout(apply,delay)));
}
document.addEventListener('pointerdown',event=>capture(event.target),true);
document.addEventListener('input',event=>capture(event.target),true);
document.addEventListener('change',event=>capture(event.target),true);
const previous=window.render;
if(typeof previous==='function')window.render=function(...args){
 const snapshot=pending;
 pending=null;
 const result=previous.apply(this,args);
 restore(snapshot);
 return result;
};
})();
