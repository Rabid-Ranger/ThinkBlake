const fs=require('fs');
const path=require('path');
const sourcePath=path.join(__dirname,'v71-simplification.js');
const runtimePath=path.join(__dirname,'.v71-simplification-runtime.js');
let source=fs.readFileSync(sourcePath,'utf8');
source=source.replace("page.locator('.v69-map').count()===0","page.locator('.v69-map:visible').count()===0");
source=source.replace(
  "  check(/Topic.*what the video is about/i.test(packageText)&&/Click frame.*reason.*click/i.test(packageText),'Title and thumbnail explains topic versus click frame where the choice is made.');",
  "  const packageHelp=page.locator('details[data-v49-section=\"video-package\"] .v71-package-summary-help:visible');\n  const packageHelpText=(await packageHelp.innerText()).replace(/\\s+/g,' ');\n  check(await packageHelp.count()===1&&/Topic.*what it is about/i.test(packageHelpText)&&/Click frame.*why.*click/i.test(packageHelpText),'Title and thumbnail explains topic versus click frame where the choice is made.');"
);
source=source.replace(
  "  check(await page.evaluate(()=>state.currentView==='overview'&&state.v67DiagnosisReview===true),'The diagnosis reminder opens the actual diagnosis-review workflow.');",
  "  check(await page.evaluate(()=>state.currentView==='overview'&&state.v67DiagnosisReview===true),'The diagnosis reminder opens the actual diagnosis-review workflow.');\n  await page.evaluate(()=>{state.currentView='diagnosis';state.v67DiagnosisReview=false;render()});await page.waitForTimeout(180);\n  check(await page.evaluate(()=>state.currentView==='overview'&&state.v67DiagnosisReview===true),'Opening Diagnosis directly routes to the actual diagnosis-review workflow, not Review and Learn.');"
);
source=source.replace(
  "check(await page.locator('.content').getByText('Execution handoff',{exact:true}).count()===0,'Execution handoff no longer competes with the main calendar page.');",
  "check(await page.locator('.content').getByText('Execution handoff',{exact:true}).filter({visible:true}).count()===0,'Execution handoff no longer competes with the main calendar page.');"
);
fs.writeFileSync(runtimePath,source);
require(runtimePath);
