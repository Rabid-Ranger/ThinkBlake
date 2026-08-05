(()=>{
if(window.__v72PhaseAttributeFixInstalled)return;
window.__v72PhaseAttributeFixInstalled=true;
function repairPhaseAttributes(){
  document.querySelectorAll('details[data-v72-phase]').forEach(detail=>{
    detail.dataset.v72PhaseSection=detail.dataset.v72Phase;
    detail.removeAttribute('data-v72-phase');
  });
}
const observer=new MutationObserver(repairPhaseAttributes);
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-v72-phase']});
repairPhaseAttributes();
setTimeout(repairPhaseAttributes,0);
setTimeout(repairPhaseAttributes,200);
})();
