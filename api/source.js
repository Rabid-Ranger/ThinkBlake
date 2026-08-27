const V179_SOURCE_URL = 'https://raw.githubusercontent.com/Rabid-Ranger/ThinkBlake/56c48e445cd5279ded464aa79a3db009418e6b0d/index.html';
let sourcePromise;

async function fetchSource(){
  const response=await fetch(V179_SOURCE_URL,{cache:'no-store',headers:{'user-agent':'Accelerator-OS-V179'}});
  if(!response.ok)throw new Error(`V179 source returned ${response.status}`);
  return response.text();
}

function injectRenderBridge(source){
  const patch=`<script id="v179-production-render-bridge-fix">(()=>{\nfunction install(){\n if(window.__v179ProductionRenderBridgeFix||typeof window.render!=='function'||typeof window.__v179Enhance!=='function')return;\n window.__v179ProductionRenderBridgeFix=true;\n const previous=window.render;\n window.render=function(){const result=previous.apply(this,arguments);queueMicrotask(()=>{try{window.__v179Enhance()}catch(e){console.error('V179 enhance failed',e)}});return result};\n try{window.__v179Enhance()}catch(e){console.error('V179 initial enhance failed',e)}\n}\ninstall();setTimeout(install,0);setTimeout(install,250);\n})();<\/script>`;
  const i=source.lastIndexOf('</body>');
  if(i<0)throw new Error('V179 source is missing closing body tag');
  return source.slice(0,i)+patch+'\n'+source.slice(i);
}

async function getSource(){
  if(!sourcePromise)sourcePromise=fetchSource().then(injectRenderBridge).catch(e=>{sourcePromise=null;throw e});
  return sourcePromise;
}

module.exports=async function handler(req,res){
  try{
    const source=await getSource();
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Accelerator-Build','V179-protocol-focus-flow-cloud-renderfix');
    res.setHeader('X-Accelerator-Source-Length',String(source.length));
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.status(200).send(source);
  }catch(error){
    console.error(error);res.setHeader('Cache-Control','no-store');res.status(500).send(error?.stack||String(error));
  }
};
