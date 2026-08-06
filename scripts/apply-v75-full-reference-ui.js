const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const zlib=require('zlib');

const root=path.resolve(__dirname,'..');
const decodedPath=path.join(root,'decoded-source.html');
const indexPath=path.join(root,'index.html');
const cssFiles=[1,2,3,4,5].map(n=>path.join(root,'patches',`v75-css-${n}.b64`));
const jsFiles=Array.from({length:10},(_,i)=>path.join(root,'patches',`v75-js-small-${String(i+1).padStart(2,'0')}.b64`));
const polishCssPath=path.join(root,'patches','v75-polish.css');
const polishJsPath=path.join(root,'patches','v75-polish.js');
const decode=files=>Buffer.from(files.map(file=>fs.readFileSync(file,'utf8').trim()).join(''),'base64').toString('utf8');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const css=decode(cssFiles);
const js=decode(jsFiles);
const polishCss=fs.readFileSync(polishCssPath,'utf8').trim();
const polishJs=fs.readFileSync(polishJsPath,'utf8').trim();
const expected={css:'e0be80b7a8c1904676760930659d0db821bdf404b2eaa565bfd4414a4561db7d',js:'e505da464bd7c1387152bcc6a94c2e92541d554044c65a231775d4bf9eb6c383'};
if(sha(css)!==expected.css)throw new Error(`V75 CSS payload checksum failed: ${sha(css)}`);
if(sha(js)!==expected.js)throw new Error(`V75 JS payload checksum failed: ${sha(js)}`);
let source=fs.readFileSync(decodedPath,'utf8');
if(source.includes('id="v75-full-reference-ui-style"')||source.includes('id="v75-full-reference-ui-script"'))throw new Error('V75 payload is already present.');
source=source
 .replace(/<meta content="Accelerator OS V52\.1 V74:[^"]+" name="description"\/>/,'<meta content="Accelerator OS V52.1 V75: full source-faithful planner UI rebuild across every coaching workflow." name="description"/>')
 .replace('<title>Accelerator OS V52.1 Reference UI V74</title>','<title>Accelerator OS V52.1 Reference UI V75</title>');
const closing=source.lastIndexOf('</body>');
if(closing<0)throw new Error('Closing body tag is missing.');
source=`${source.slice(0,closing)}<style id="v75-full-reference-ui-style">${css}</style>\n<script id="v75-full-reference-ui-script">${js}</script>\n<style id="v75-polish-style">${polishCss}</style>\n<script id="v75-polish-script">${polishJs}</script>\n${source.slice(closing)}`;
fs.writeFileSync(decodedPath,source);
const payload=zlib.gzipSync(Buffer.from(source,'utf8'),{level:9}).toString('base64');
const wrapper=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="accelerator-build" content="V52.1-reference-ui-v75"><title>Accelerator OS V52.1</title><style>html,body{margin:0;min-height:100%;background:#0D1117;color:#E6EDF3;font-family:Inter,system-ui,sans-serif}body{display:grid;place-items:center}.load{text-align:center;padding:24px}.load p{color:#8B949E}</style></head><body><div class="load"><h1>Accelerator OS</h1><p>Loading V52.1…</p></div><script>(async()=>{try{const bytes=Uint8Array.from(atob('${payload}'),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));const html=await new Response(stream).text();document.open();document.write(html);document.close()}catch(error){console.error(error);document.body.innerHTML='<div class="load"><h1>Accelerator OS could not load</h1><p>Please refresh the page.</p></div>'}})();</script></body></html>`;
fs.writeFileSync(indexPath,wrapper);
console.log(JSON.stringify({build:'V52.1-reference-ui-v75',cssCharacters:css.length,jsCharacters:js.length,polishCssCharacters:polishCss.length,polishJsCharacters:polishJs.length,sourceCharacters:source.length,wrapperCharacters:wrapper.length,checksums:expected},null,2));
