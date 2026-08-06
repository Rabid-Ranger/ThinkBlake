const fs=require('fs');
const {chromium}=require('playwright');
const report={build:'V52.1-reference-system-v75',checkedAt:new Date().toISOString(),passed:[],errors:[],pages:{}};
const pass=m=>{report.passed.push(m);console.log(`PASS: ${m}`)};
const check=(v,m)=>{if(!v){report.errors.push(m);throw new Error(m)}pass(m)};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const runtime=[];page.on('pageerror',e=>runtime.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/api\/cloud|Failed to fetch/i.test(m.text()))runtime.push(m.text())});
 try{
  await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
  await page.evaluate(()=>{document.body.classList.remove('cloud-locked');const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=true;const data=seedData();state.creators=data.creators;state.currentCreatorId=data.creators[0]?.id||'';state.currentVideoId=data.creators[0]?.videos?.[0]?.id||'';save();render()});
  await page.waitForFunction(()=>document.body.classList.contains('v75-reference-system'),null,{timeout:10000});
  check(await page.evaluate(()=>window.__acceleratorBuild)==='V52.1-reference-system-v75','The app identifies the V75 reference system build.');
  const views=['overview','creators','setup','plan','calendar','results','video','session'];
  for(const view of views){
   await page.evaluate(v=>{state.currentView=v;render()},view);await page.waitForTimeout(220);
   const data=await page.evaluate(v=>({view:v,body:document.body.classList.contains(`v75-view-${v}`),orientation:document.querySelectorAll('.content>.v75-orientation').length,heads:document.querySelectorAll('.content .page-head,.content .v49-page-head,.content .v49-video-top').length,cards:document.querySelectorAll('[data-v75-card]').length,fields:document.querySelectorAll('.v75-field-group').length}),view);
   report.pages[view]=data;check(data.body,`${view} receives its V75 page identity.`);check(data.heads>=1,`${view} keeps a clear page header.`);if(view!=='video')check(data.orientation===1,`${view} has one source-style orientation panel.`);
   await page.screenshot({path:`qa/v75-${view}.png`,fullPage:true});
  }
  await page.evaluate(()=>{state.currentView='video';render()});await page.waitForTimeout(200);
  check(await page.locator('.v74-phase-tabs').count()===1,'The verified four-phase video workflow is retained.');
  check(await page.locator('details[data-v49-section]:visible[open]').count()===0,'Video sections still start collapsed.');
  await page.evaluate(()=>{state.currentView='calendar';render()});await page.waitForTimeout(200);
  check(await page.locator('.v74-calendar-legend').count()===1,'Calendar color coding and legend are retained.');
  const colors=await page.locator('.event-chip:visible').evaluateAll(nodes=>[...new Set(nodes.map(n=>getComputedStyle(n).backgroundColor))]);check(colors.length>=4,'Calendar retains multiple semantic work colors.');
  check(await page.locator('.top-actions .v58-youtube').evaluate(n=>getComputedStyle(n).backgroundColor)==='rgb(229, 45, 39)','YouTube remains red.');
  check(runtime.length===0,`No meaningful runtime errors occur. ${runtime.join(' | ')}`);
 }catch(error){if(!report.errors.includes(error.message))report.errors.push(error.message);console.error(error.stack||error)}finally{fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/v75-reference-system-report.json',JSON.stringify(report,null,2));await browser.close()}
 if(report.errors.length)process.exit(1);
})();
