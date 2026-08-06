const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const cp=require('child_process');

const root=path.resolve(__dirname,'..');
cp.execFileSync(process.execPath,[path.join(__dirname,'rebuild-v68.js')],{cwd:root,stdio:'inherit'});
cp.execFileSync(process.execPath,[path.join(__dirname,'apply-v71-postfix.js')],{cwd:root,stdio:'inherit'});

const decodedPath=path.join(root,'decoded-source.html');
const indexPath=path.join(root,'index.html');
const fileInputs=[
  ['v74-reference-ui-corrections-style','style',path.join(root,'patches','v74-reference-ui-corrections.css')],
  ['v74-guide-research','script',path.join(root,'patches','v74-guide-research.js')],
  ['v74-guide-titles','script',path.join(root,'patches','v74-guide-titles.js')],
  ['v74-guide-thumbtips','script',path.join(root,'patches','v74-guide-thumbtips.js')],
  ['v74-guide-thumbstrategies','script',path.join(root,'patches','v74-guide-thumbstrategies.js')],
  ['v74-guide-story','script',path.join(root,'patches','v74-guide-story.js')],
  ['v74-guide-retention','script',path.join(root,'patches','v74-guide-retention.js')],
  ['v74-guide-cta','script',path.join(root,'patches','v74-guide-cta.js')],
  ['v74-guide-loader','script',path.join(root,'patches','v74-guide-loader.js')],
  ['v74-observer-preflight','script',path.join(root,'patches','v74-observer-preflight.js')],
  ['v74-reference-ui-corrections-script','script',path.join(root,'patches','v74-reference-ui-corrections.js')],
  ['v74-video-anchor-fix','script',path.join(root,'patches','v74-video-anchor-fix.js')]
];
const hooksPayloadPath=path.join(root,'patches','v74-guide-hooks.b64');
for(const [, ,file] of fileInputs)if(!fs.existsSync(file))throw new Error(`${path.relative(root,file)} is missing.`);
if(!fs.existsSync(hooksPayloadPath))throw new Error('patches/v74-guide-hooks.b64 is missing.');
const hooksCode=Buffer.from(fs.readFileSync(hooksPayloadPath,'utf8').trim(),'base64').toString('utf8');
if(!hooksCode.includes('V74_SOURCE_GUIDES["hooks"]'))throw new Error('The Hook Strategies guide payload is invalid.');

let source=fs.readFileSync(decodedPath,'utf8');
const markers=fileInputs.map(([marker])=>marker).concat('v74-guide-hooks');
for(const marker of markers)if(source.includes(`id="${marker}"`))throw new Error(`${marker} is already present.`);
source=source
  .replace(/<meta content="Accelerator OS V52\.1 V71:[^"]+" name="description"\/>/,'<meta content="Accelerator OS V52.1 V74: source-faithful planner UI, complete guides, stable accordions, and semantic calendar colors." name="description"/>')
  .replace('<title>Accelerator OS V52.1 Simplified Coaching V71</title>','<title>Accelerator OS V52.1 Reference UI V74</title>');

const closing=source.lastIndexOf('</body>');
if(closing<0)throw new Error('Closing body tag is missing.');
const additions=[];
for(const [marker,type,file] of fileInputs){
  if(marker==='v74-guide-loader')additions.push(`<script id="v74-guide-hooks">${hooksCode.trim()}</script>`);
  additions.push(`<${type} id="${marker}">${fs.readFileSync(file,'utf8').trim()}</${type}>`);
}
source=`${source.slice(0,closing)}${additions.join('\n')}\n${source.slice(closing)}`;
fs.writeFileSync(decodedPath,source);

const payload=zlib.gzipSync(Buffer.from(source,'utf8'),{level:9}).toString('base64');
const wrapper=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="accelerator-build" content="V52.1-reference-ui-v74">
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
console.log(JSON.stringify({build:'V52.1-reference-ui-v74',sourceCharacters:source.length,wrapperCharacters:wrapper.length,guides:8},null,2));
