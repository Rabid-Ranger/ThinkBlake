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
const clean=()=>{
 if(window.state?.currentView==='setup')document.querySelectorAll('.v69-map').forEach(node=>node.remove());
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
