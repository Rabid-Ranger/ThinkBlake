const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const decodedPath = path.join(root, 'decoded-source.html');
const basePath = path.join(root, 'base-source-v67.html');
const patchPath = path.join(root, 'patches', 'v68-coach-flow.html');
const indexPath = path.join(root, 'index.html');

if (!fs.existsSync(decodedPath)) throw new Error('decoded-source.html is missing.');
if (!fs.existsSync(patchPath)) throw new Error('patches/v68-coach-flow.html is missing.');
if (!fs.existsSync(basePath)) fs.copyFileSync(decodedPath, basePath);

let source = fs.readFileSync(basePath, 'utf8');
const patch = fs.readFileSync(patchPath, 'utf8').trim();

function replaceOnce(label, search, replacement) {
  const count = source.split(search).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}.`);
  source = source.replace(search, replacement);
}

replaceOnce(
  'confirmed Foundation gate',
  "function foundationDone67(c){return channelDone67(c)&&audienceStatus(c)==='Complete'&&messageStatus(c)==='Complete'&&businessStatus(c)==='Complete';}",
  "function foundationCoreDone67(c){return channelDone67(c)&&audienceStatus(c)==='Complete'&&messageStatus(c)==='Complete'&&businessStatus(c)==='Complete';}\n  function foundationDone67(c){\n    const core=foundationCoreDone67(c);\n    if(core&&c.foundationConfirmedAt===undefined){\n      const established=has67(c.diagnostic?.updatedAt)||has67(c.diagnosticReviewedAt)||has67(c.roadmap?.destination)||has67(c.cycleOutcome)||(c.videos||[]).length>0||(c.sessions||[]).length>0||(c.monthHistory||[]).length>0;\n      if(established)c.foundationConfirmedAt=c.strategyUpdatedAt||c.createdAt||todayIso();\n    }\n    return core&&has67(c.foundationConfirmedAt);\n  }"
);

replaceOnce(
  'confirmed diagnosis gate',
  "function diagnosisDone67(c){ensure67(c);return has67(c.diagnostic.updatedAt)||has67(c.diagnosticReviewedAt)||Object.values(c.diagnostic.signals).some(v=>v&&v!=='Unknown');}",
  "function diagnosisDone67(c){ensure67(c);return has67(c.diagnostic.updatedAt)&&has67(c.diagnosticReviewedAt);}"
);

replaceOnce(
  'real video-plan gate',
  "function videosDone67(c){return (c.videos||[]).length>0;}",
  "function videoPlanReady67(v){\n    const titleCount=(v.packaging?.titles||[]).filter(has67).length;\n    const thumbCount=(v.packaging?.thumbnailIdeas||[]).filter(has67).length;\n    const purpose=[v.exactViewer,v.viewerMoment,v.surfaceProblem,v.promise].filter(has67).length>=3;\n    const evidence=[v.angle,v.format,v.research?.platformEvidence,v.research?.referenceVideos,v.research?.openGap||v.research?.beliefShift||v.research?.objection].filter(has67).length>=3;\n    const packaging=(titleCount>=3||has67(v.packaging?.selectedTitle))&&(thumbCount>=1||has67(v.packaging?.selectedThumbnail)||has67(v.packaging?.thumbnailImage));\n    const structure=[v.structure?.hook,v.structure?.first30,v.structure?.beats||v.structure?.storyProblem,v.structure?.firstPayoff].filter(has67).length>=3;\n    return purpose&&evidence&&packaging&&structure;\n  }\n  function videosDone67(c){const list=c.videos||[];return list.length>0&&list.some(videoPlanReady67);}"
);

replaceOnce(
  'explicit Foundation confirmation',
  '<button class="button" type="button" data-v67-stage-go="overview">Continue to starting diagnosis</button>',
  '<button class="button" type="button" data-v68-confirm-foundation>Confirm Foundation and continue</button>'
);

replaceOnce(
  'stable story-choice order',
  "const names=[rec.name,selected,...rec.alts,'Problem → Cause → Solution → Application','Story → Lesson → Viewer Application'].filter(Boolean);",
  "const names=[rec.name,...rec.alts,'Problem → Cause → Solution → Application','Story → Lesson → Viewer Application'].filter(Boolean);"
);

source = source
  .replace(/<meta content="Accelerator OS V30\.3:[^"]+" name="description"\/>/, '<meta content="Accelerator OS V52.1 V68: guided one-decision-at-a-time onboarding and recurring coaching flow." name="description"/>')
  .replace('<title>Accelerator OS V36 Clarity System</title>', '<title>Accelerator OS V52.1 Coach Flow V68</title>');

if (source.includes('id="v68-coach-flow-fixes"')) throw new Error('The V68 patch is already present in the V67 base.');
const closingBody = source.lastIndexOf('</body>');
if (closingBody < 0) throw new Error('Closing body tag is missing.');
source = `${source.slice(0, closingBody)}${patch}\n${source.slice(closingBody)}`;

fs.writeFileSync(decodedPath, source);

const payload = zlib.gzipSync(Buffer.from(source, 'utf8'), { level: 9 }).toString('base64');
const wrapper = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="accelerator-build" content="V52.1-coach-flow-v68">
<title>Accelerator OS V52.1</title>
<style>html,body{margin:0;min-height:100%;background:#081116;color:#f4f7f8;font-family:Inter,system-ui,sans-serif}body{display:grid;place-items:center}.load{text-align:center;padding:24px}.load p{color:#9fb3bd}</style>
</head>
<body>
<div class="load"><h1>Accelerator OS</h1><p>Loading V52.1…</p></div>
<script>
(async()=>{
try{
const bytes=Uint8Array.from(atob('${payload}'),c=>c.charCodeAt(0));
const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
const html=await new Response(stream).text();
document.open();document.write(html);document.close();
}catch(error){console.error(error);document.body.innerHTML='<div class="load"><h1>Accelerator OS could not load</h1><p>Please refresh the page. If this continues, contact the workspace administrator.</p></div>';}
})();
</script>
</body>
</html>`;
fs.writeFileSync(indexPath, wrapper);
console.log(JSON.stringify({ sourceCharacters: source.length, wrapperCharacters: wrapper.length, build: 'V52.1-coach-flow-v68' }, null, 2));
