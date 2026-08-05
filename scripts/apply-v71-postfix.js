const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

const root=path.resolve(__dirname,'..');
const decodedPath=path.join(root,'decoded-source.html');
const indexPath=path.join(root,'index.html');
let source=fs.readFileSync(decodedPath,'utf8');
const marker='v71-postfix-script';
if(source.includes(`id="${marker}"`))throw new Error('V71 postfix is already present.');
const patch=`<script id="${marker}">
(()=>{
if(window.__v71PostfixInstalled)return;
window.__v71PostfixInstalled=true;
const compact=value=>String(value??'').replace(/\\s+/g,' ').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const first=(...values)=>values.find(value=>compact(value))||'';
const jobs={
 Reach:{purpose:'Bring the right new viewers into the channel.',research:'Demand, repeated problems, outliers, search language and proven click patterns.'},
 Trust:{purpose:'Change a belief and build preference for this creator or method.',research:'Doubts, misconceptions, objections, proof, stories and credibility gaps.'},
 Convert:{purpose:'Help a ready viewer make one decision or take the next step.',research:'Buyer questions, fit, alternatives, risk, objections and decision criteria.'}
};
function ensureVideoFocus(){
 if(window.state?.currentView!=='video'||document.querySelector('.v71-video-focus'))return;
 let current=null;
 try{current=typeof video==='function'?video():null}catch{}
 if(!current)return;
 const job=first(current.job,'Reach');
 const info=jobs[job]||jobs.Reach;
 const topic=first(current.surfaceProblem,current.promise,current.title,current.packaging?.selectedTitle,'Not chosen yet');
 const clickFrame=first(current.packaging?.clickFrame,current.packaging?.mechanism,current.angle,'Not chosen yet');
 const title=[...document.querySelectorAll('.content h1,.content h2')].find(node=>/video plan/i.test(compact(node.textContent)));
 const anchor=document.querySelector('.content .page-head,.content .v49-page-head,.content .v49-video-head')||title?.closest('header,.page-head,.v49-page-head,.v49-video-head')||title?.parentElement||document.querySelector('.content');
 if(!anchor)return;
 anchor.insertAdjacentHTML('afterend',\`<section class="v71-video-focus"><div><span>\${escapeHtml(job)} video</span><strong>\${escapeHtml(info.purpose)}</strong><p><b>Research:</b> \${escapeHtml(info.research)}</p><p><b>Topic:</b> \${escapeHtml(topic)} &nbsp; <b>Click frame:</b> \${escapeHtml(clickFrame)}</p></div><div class="v71-video-focus-actions"><button class="v71-compact-button" data-v71-jobs>How video jobs differ</button><button class="v71-compact-button" data-v69-open-strategy>Creator Strategy</button></div></section>\`);
}
const clean=()=>{
 if(window.state?.currentView==='setup')document.querySelectorAll('.v69-map').forEach(node=>node.remove());
 ensureVideoFocus();
};
const observer=new MutationObserver(clean);
observer.observe(document.documentElement,{childList:true,subtree:true});
const previous=window.render;
window.render=function(...args){const result=previous.apply(this,args);clean();setTimeout(clean,0);setTimeout(clean,120);setTimeout(clean,300);return result};
clean();
})();
</script>`;
const closing=source.lastIndexOf('</body>');
if(closing<0)throw new Error('Closing body tag is missing.');
source=`${source.slice(0,closing)}${patch}\n${source.slice(closing)}`;
fs.writeFileSync(decodedPath,source);
const payload=zlib.gzipSync(Buffer.from(source,'utf8'),{level:9}).toString('base64');
const wrapper=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="accelerator-build" content="V52.1-coach-flow-v71"><title>Accelerator OS V52.1</title><style>html,body{margin:0;min-height:100%;background:#081116;color:#f4f7f8;font-family:Inter,system-ui,sans-serif}body{display:grid;place-items:center}.load{text-align:center;padding:24px}.load p{color:#9fb3bd}</style></head><body><div class="load"><h1>Accelerator OS</h1><p>Loading V52.1…</p></div><script>(async()=>{try{const bytes=Uint8Array.from(atob('${payload}'),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));const html=await new Response(stream).text();document.open();document.write(html);document.close()}catch(error){console.error(error);document.body.innerHTML='<div class="load"><h1>Accelerator OS could not load</h1><p>Please refresh the page.</p></div>'}})();</script></body></html>`;
fs.writeFileSync(indexPath,wrapper);
console.log(JSON.stringify({build:'V52.1-coach-flow-v71',postfix:marker,sourceCharacters:source.length},null,2));
