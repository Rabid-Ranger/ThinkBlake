(()=>{
if(window.__v73PageHeadFixInstalled)return;
window.__v73PageHeadFixInstalled=true;
const stateNow=()=>{try{return typeof state!=='undefined'?state:null}catch{return null}};
const definitions={
 overview:['Creator workspace','See what needs attention, run the next coaching step, and leave with one clear commitment.'],
 creators:['Creator management','Scan every creator, address due work, and open the right workspace without hunting across the app.'],
 setup:['Foundation','Define the audience, message, offer, and operating constraints once, then update them only when strategy changes.'],
 plan:['Monthly planning','Choose the month’s priorities and Reach, Trust, and Convert mix before planning individual videos.'],
 calendar:['Operating calendar','See planning, publishing, review, and coaching commitments in one place.'],
 results:['Review and learn','Open this when a review is due, then turn performance evidence into one future decision.']
};
function definition(){
 const app=stateNow();
 if(app?.currentView==='overview'&&app?.v67DiagnosisReview)return['90-day diagnosis','Review the creator’s current signals, identify the real bottleneck, and decide what the next 90 days must change.'];
 return definitions[app?.currentView]||['Creator workspace','Complete the work on this page, then return to Creator Home for the next decision.'];
}
function unwrap(node){
 const parent=node.parentNode;if(!parent)return;
 while(node.firstChild)parent.insertBefore(node.firstChild,node);
 node.remove();
}
function stabilize(){
 const view=stateNow()?.currentView;
 if(view==='video')return;
 const head=document.querySelector('.content .v73-page-head');if(!head)return;
 const title=head.querySelector('h1,h2');if(!title)return;
 let direct=head.querySelector(':scope > .v73-page-copy');
 if(!direct){direct=document.createElement('div');direct.className='v73-page-copy';head.insertBefore(direct,head.firstChild)}
 if(title.parentElement!==direct)direct.appendChild(title);
 for(const copy of [...head.querySelectorAll('.v73-page-copy')])if(copy!==direct)unwrap(copy);
 head.querySelectorAll('.v73-page-eyebrow,.v73-page-purpose').forEach(node=>node.remove());
 const [eyebrowText,purposeText]=definition();
 const eyebrow=document.createElement('span');eyebrow.className='v73-page-eyebrow';eyebrow.textContent=eyebrowText;direct.insertBefore(eyebrow,direct.firstChild);
 const purpose=document.createElement('p');purpose.className='v73-page-purpose';purpose.textContent=purposeText;direct.appendChild(purpose);
 const actionGroups=[...head.querySelectorAll(':scope > .v73-page-actions')];
 let actions=actionGroups.shift();
 if(!actions){actions=document.createElement('div');actions.className='v73-page-actions';head.appendChild(actions)}
 for(const duplicate of actionGroups){while(duplicate.firstChild)actions.appendChild(duplicate.firstChild);duplicate.remove()}
 const guides=[...actions.querySelectorAll('[data-v73-page-guide]')];guides.slice(1).forEach(node=>node.remove());
}
let frame=0;
const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;stabilize()})};
const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{subtree:true,childList:true});
const prior=window.render;if(typeof prior==='function')window.render=function(...args){const result=prior.apply(this,args);stabilize();setTimeout(stabilize,0);return result};
stabilize();
})();
