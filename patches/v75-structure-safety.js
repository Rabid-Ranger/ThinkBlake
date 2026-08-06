(()=>{
if(window.__v75StructureSafetyInstalled)return;
window.__v75StructureSafetyInstalled=true;
let running=false;
function stabilize(){
 if(running)return;running=true;
 try{
  document.querySelectorAll('[data-v75-card]>.v75-card-body').forEach(body=>{
   const card=body.parentElement;if(!card)return;
   while(body.firstChild)card.insertBefore(body.firstChild,body);
   body.remove();card.classList.add('v75-card-structure-safe');
  });
  document.querySelectorAll('[data-v75-card].v75-card-structure-safe').forEach(card=>{
   [...card.children].forEach(child=>{
    if(child.classList.contains('v75-card-head'))return;
    if(!child.style.getPropertyValue('--v75-child-space')){child.style.setProperty('--v75-child-space','1');if(!child.matches('script,style')){child.style.marginLeft=child.style.marginLeft||'16px';child.style.marginRight=child.style.marginRight||'16px'}}
   });
   const last=[...card.children].filter(child=>!child.classList.contains('v75-card-head')).at(-1);if(last)last.style.marginBottom=last.style.marginBottom||'16px';
  })
 }finally{running=false}
}
const observer=new MutationObserver(()=>requestAnimationFrame(stabilize));observer.observe(document.documentElement,{subtree:true,childList:true});
stabilize();
})();
