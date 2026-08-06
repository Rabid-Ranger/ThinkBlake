(()=>{
if(window.__v74AccordionControllerInstalled)return;
window.__v74AccordionControllerInstalled=true;
document.addEventListener('click',event=>{
 const summary=event.target.closest?.('details[data-v49-section] > summary');
 if(!summary||event.target.closest('button,a,input,select,textarea'))return;
 const detail=summary.parentElement;
 if(detail.hidden||detail.classList.contains('v74-phase-hidden'))return;
 event.preventDefault();
 event.stopPropagation();
 event.stopImmediatePropagation();
 const next=!detail.open;
 document.querySelectorAll('details[data-v49-section]').forEach(item=>{
  if(item!==detail)item.open=false;
 });
 detail.open=next;
},true);
})();
