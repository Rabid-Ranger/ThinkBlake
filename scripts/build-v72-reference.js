const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const cp=require('child_process');

const root=path.resolve(__dirname,'..');
cp.execFileSync(process.execPath,[path.join(__dirname,'rebuild-v68.js')],{cwd:root,stdio:'inherit'});
cp.execFileSync(process.execPath,[path.join(__dirname,'apply-v71-postfix.js')],{cwd:root,stdio:'inherit'});

const decodedPath=path.join(root,'decoded-source.html');
const indexPath=path.join(root,'index.html');
const inputs=[
  ['v72-reference-ui-styles','style',path.join(root,'patches','v72-reference-ui.css')],
  ['v72-reference-ui-script','script',path.join(root,'patches','v72-reference-ui.js')],
  ['v72-reference-ui-fix-script','script',path.join(root,'patches','v72-reference-ui-fix.js')],
  ['v73-app-design-system-styles','style',path.join(root,'patches','v73-app-design-system.css')],
  ['v73-app-design-system-script','script',path.join(root,'patches','v73-app-design-system.js')],
  ['v73-creator-card-fix-styles','style',path.join(root,'patches','v73-creator-card-fix.css')],
  ['v73-creator-card-fix-script','script',path.join(root,'patches','v73-creator-card-fix.js')],
  ['v73-workspace-panel-fix-styles','style',path.join(root,'patches','v73-workspace-panel-fix.css')],
  ['v73-workspace-panel-fix-script','script',path.join(root,'patches','v73-workspace-panel-fix.js')]
];
for(const [, ,file] of inputs)if(!fs.existsSync(file))throw new Error(`${path.relative(root,file)} is missing.`);

let source=fs.readFileSync(decodedPath,'utf8');
for(const [marker] of inputs)if(source.includes(`id="${marker}"`))throw new Error(`${marker} is already present.`);
source=source
  .replace(/<meta content="Accelerator OS V52\.1 V71:[^"]+" name="description"\/>/,'<meta content="Accelerator OS V52.1 V73: an app-wide reference-led coaching workspace with clear hierarchy, semantic states, and pop-out guides." name="description"/>')
  .replace('<title>Accelerator OS V52.1 Simplified Coaching V71</title>','<title>Accelerator OS V52.1 App Design V73</title>');

const closing=source.lastIndexOf('</body>');
if(closing<0)throw new Error('Closing body tag is missing.');
const additions=inputs.map(([marker,type,file])=>`<${type} id="${marker}">${fs.readFileSync(file,'utf8').trim()}</${type}>`).join('\n');
source=`${source.slice(0,closing)}${additions}\n${source.slice(closing)}`;
fs.writeFileSync(decodedPath,source);

const payload=zlib.gzipSync(Buffer.from(source,'utf8'),{level:9}).toString('base64');
const wrapper=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="accelerator-build" content="V52.1-reference-ui-v73">
<title>Accelerator OS V52.1</title>
<style>html,body{margin:0;min-height:100%;background:#0D1117;color:#E6EDF3;font-family:Inter,system-ui,sans-serif}body{display:grid;place-items:center}.load{text-align:center;padding:24px}.load p{color:#8B949E}</style>
</head>
<body>
<div class="load"><h1>Accelerator OS</h1><p>Loading V52.1…</p></div>
<script>
(async()=>{
try{
const bytes=Uint8Array.from(atob('${payload}'),char=>char.charCodeAt(0));
const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
const html=await new Response(stream).text();
document.open();document.write(html);document.close();
}catch(error){console.error(error);document.body.innerHTML='<div class="load"><h1>Accelerator OS could not load</h1><p>Please refresh the page.</p></div>';}
})();
</script>
</body>
</html>`;
fs.writeFileSync(indexPath,wrapper);
console.log(JSON.stringify({build:'V52.1-reference-ui-v73',sourceCharacters:source.length,wrapperCharacters:wrapper.length},null,2));
