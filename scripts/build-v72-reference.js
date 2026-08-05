const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const cp=require('child_process');

const root=path.resolve(__dirname,'..');
cp.execFileSync(process.execPath,[path.join(__dirname,'rebuild-v68.js')],{cwd:root,stdio:'inherit'});
cp.execFileSync(process.execPath,[path.join(__dirname,'apply-v71-postfix.js')],{cwd:root,stdio:'inherit'});

const decodedPath=path.join(root,'decoded-source.html');
const indexPath=path.join(root,'index.html');
const cssPath=path.join(root,'patches','v72-reference-ui.css');
const jsPath=path.join(root,'patches','v72-reference-ui.js');
const fixPath=path.join(root,'patches','v72-reference-ui-fix.js');
for(const file of [decodedPath,cssPath,jsPath,fixPath])if(!fs.existsSync(file))throw new Error(`${path.relative(root,file)} is missing.`);

let source=fs.readFileSync(decodedPath,'utf8');
const css=fs.readFileSync(cssPath,'utf8').trim();
const js=fs.readFileSync(jsPath,'utf8').trim();
const fix=fs.readFileSync(fixPath,'utf8').trim();
const styleMarker='v72-reference-ui-styles';
const scriptMarker='v72-reference-ui-script';
const fixMarker='v72-reference-ui-fix-script';
if(source.includes(`id="${styleMarker}"`)||source.includes(`id="${scriptMarker}"`)||source.includes(`id="${fixMarker}"`))throw new Error('V72 reference UI is already present.');
source=source
  .replace(/<meta content="Accelerator OS V52\.1 V71:[^"]+" name="description"\/>/,'<meta content="Accelerator OS V52.1 V72: a reference-led coaching workspace with clear phases and pop-out guides." name="description"/>')
  .replace('<title>Accelerator OS V52.1 Simplified Coaching V71</title>','<title>Accelerator OS V52.1 Reference UI V72</title>');
const closing=source.lastIndexOf('</body>');
if(closing<0)throw new Error('Closing body tag is missing.');
source=`${source.slice(0,closing)}<style id="${styleMarker}">${css}</style>\n<script id="${scriptMarker}">${js}</script>\n<script id="${fixMarker}">${fix}</script>\n${source.slice(closing)}`;
fs.writeFileSync(decodedPath,source);

const payload=zlib.gzipSync(Buffer.from(source,'utf8'),{level:9}).toString('base64');
const wrapper=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="accelerator-build" content="V52.1-reference-ui-v72">
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
console.log(JSON.stringify({build:'V52.1-reference-ui-v72',sourceCharacters:source.length,wrapperCharacters:wrapper.length},null,2));
