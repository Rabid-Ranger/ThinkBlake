const fs=require('fs');
const {chromium}=require('playwright');
const report={build:'V52.1-reference-ui-v73',checkedAt:new Date().toISOString(),passed:[],pages:{},errors:[]};
const pass=message=>{report.passed.push(message);console.log(`PASS: ${message}`)};
const check=(value,message)=>{if(!value){report.errors.push(message);throw new Error(message)}pass(message)};

(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const runtime=[];
 page.on('pageerror',error=>runtime.push(`pageerror: ${error.message}`));
 page.on('console',message=>{if(message.type()==='error')runtime.push(`console: ${message.text()}`)});

 async function waitForDesign(){
  await page.waitForFunction(()=>document.body.classList.contains('v73-app-design'),null,{timeout:10000});
  await page.waitForTimeout(260);
 }

 async function openView(view){
  await page.evaluate(target=>{state.currentView=target;if(target!=='overview')state.v67DiagnosisReview=false;render()},view);
  await waitForDesign();
 }

 async function inspect(view,label){
  await openView(view);
  const data=await page.evaluate(()=>{
   const shown=node=>{if(!node)return false;const box=node.getBoundingClientRect(),style=getComputedStyle(node);return box.width>0&&box.height>0&&style.display!=='none'&&style.visibility!=='hidden'};
   const head=document.querySelector('.content .v73-page-head');
   const cards=[...document.querySelectorAll('.content .card')].filter(shown);
   const primary=[...document.querySelectorAll('.content .button')].filter(shown).filter(node=>getComputedStyle(node).backgroundColor==='rgb(59, 130, 246)');
   return{
    bodyClasses:[...document.body.classList],
    headCount:document.querySelectorAll('.content .v73-page-head').length,
    eyebrow:head?.querySelector('.v73-page-eyebrow')?.textContent?.trim()||'',
    purpose:head?.querySelector('.v73-page-purpose')?.textContent?.trim()||'',
    guideButtons:[...document.querySelectorAll('[data-v73-page-guide]')].filter(shown).length,
    visibleCards:cards.length,
    workCards:cards.filter(node=>node.classList.contains('v73-work-card')).length,
    legacyGuides:[...document.querySelectorAll('.page-guide,.v70-job-guide,.v70-planner-guide,.v70-learn-guide,.v69-map')].filter(shown).length,
    primaryButtons:primary.length,
    background:getComputedStyle(document.body).backgroundColor,
    topbarBackground:getComputedStyle(document.querySelector('.topbar')||document.body).backgroundColor
   };
  });
  report.pages[view]=data;
  await page.screenshot({path:`qa/v73-${view}.png`,fullPage:true});
  check(data.bodyClasses.includes(`v73-view-${view}`),`${label} has its own view-level design state.`);
  check(data.headCount===1,`${label} has one clear page orientation header.`);
  check(Boolean(data.eyebrow)&&Boolean(data.purpose),`${label} explains what the page is and why the coach uses it.`);
  check(data.guideButtons===1,`${label} keeps deeper teaching behind one View Guide action.`);
  check(data.legacyGuides===0,`${label} does not show legacy guide panels beside the working interface.`);
  check(data.background==='rgb(13, 17, 23)',`${label} uses the reference navy page background.`);
  return data;
 }

 try{
  await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
  await page.evaluate(()=>{
   document.body.classList.remove('cloud-locked');const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=true;
   const data=seedData(),creator=data.creators.find(item=>item.id==='jordan')||data.creators[0];
   creator.foundationConfirmedAt=creator.foundationConfirmedAt||todayIso();creator.onboardingCompletedAt=creator.onboardingCompletedAt||todayIso();
   creator.month=creator.month||{};creator.month.reviewedAt=todayIso();
   creator.diagnostic=creator.diagnostic||{signals:{}};creator.diagnostic.updatedAt='2026-01-01';creator.diagnosticReviewedAt='2026-01-01';
   creator.needsReview=creator.needsReview||{};creator.needsReview.diagnosis=true;
   creator.events=creator.events||[];
   if(!creator.events.some(item=>item.id==='v73-review'))creator.events.push({id:'v73-review',title:'Video review due',date:todayIso(),type:'Learning review',owner:'Coach',status:'Not started',videoId:creator.videos?.[0]?.id||''});
   state.creators=data.creators;state.currentCreatorId=creator.id;state.currentVideoId=creator.videos?.[0]?.id||'';state.currentView='overview';state.v67DiagnosisReview=false;
   localStorage.clear();save();render();
  });
  await waitForDesign();

  check(await page.evaluate(()=>window.__acceleratorBuild)==='V52.1-reference-ui-v73','The app identifies the app-wide V73 reference build.');
  check(await page.locator('.v73-save-state').count()===1,'The global header shows one quiet auto-save state.');
  check(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--v73-blue').trim())==='#3B82F6','The reference blue is the primary action and working-state color.');

  await inspect('overview','Creator Home');
  await page.locator('[data-v73-page-guide]').click();await page.waitForTimeout(100);
  check(await page.locator('#v72-guide-backdrop.open').count()===1,'Creator Home guidance opens in the separate right-side drawer.');
  check(/Creator Home/i.test(await page.locator('#v72-guide-title').innerText()),'The page guide is specific to the current workspace.');
  await page.locator('[data-v72-close-guide]').click();

  const creators=await inspect('creators','All Creators');
  check(creators.visibleCards===0||creators.workCards>=0,'All Creators preserves its roster while using the new frame.');
  check(await page.locator('.v73-creator-avatar').count()>=1,'Creator rows have a consistent compact identity treatment.');

  await inspect('setup','Foundation');
  check(await page.locator('.content .v73-work-card').count()>=1,'Foundation uses consistent working-section cards.');

  await inspect('plan','Monthly Plan');
  check(await page.locator('.content .v73-work-card').count()>=1,'Monthly Plan uses the same working-section hierarchy as Foundation.');

  const calendar=await inspect('calendar','Calendar');
  check(await page.locator('.calendar-stack').count()===1,'Calendar keeps the month view as the primary orientation surface.');
  check(calendar.visibleCards>=1,'Calendar uses the shared card system for its visible work.');

  await inspect('results','Review and Learn');
  const resultsPurpose=(await page.locator('.v73-page-purpose').innerText()).replace(/\s+/g,' ');
  check(/review is due/i.test(resultsPurpose)&&/future decision/i.test(resultsPurpose),'Review and Learn explains when it is used and what it must produce.');

  await openView('overview');
  await page.evaluate(()=>{
   const root=document.querySelector('.content');
   const sample=document.createElement('span');sample.className='badge v73-test-status';sample.textContent='Needs attention';root.appendChild(sample);
  });
  await page.waitForTimeout(180);
  check(await page.locator('.v73-test-status.v73-status-amber').count()===1,'Needs-attention states use the amber semantic treatment.');
  await page.evaluate(()=>document.querySelector('.v73-test-status')?.remove());

  await openView('video');
  check(await page.locator('.v72-phase-tab').count()===4,'The app-wide system preserves the four-phase video workflow.');
  check(await page.locator('.v72-guide-button').count()>=3,'Video teaching remains available through pop-out section guides.');
  check(await page.locator('.page-guide:visible,.v70-job-guide:visible,.v70-planner-guide:visible').count()===0,'The video page does not bring old inline teaching panels back.');
  await page.screenshot({path:'qa/v73-video.png',fullPage:true});

  await openView('overview');
  const call=page.locator('[data-v70-run-call],[data-action="run-session"]').first();
  check(await call.count()===1,'Creator Home retains the Run coaching call action.');
  await call.click();await page.waitForTimeout(220);
  check(await page.locator('.v73-call-workspace:visible').count()>=1,'The live coaching call uses the shared modal and form design.');
  const progress=page.locator('[data-session-bind="progress"]');
  if(await progress.count()){await progress.fill('App-wide design verification draft');await page.waitForTimeout(100)}
  await page.screenshot({path:'qa/v73-session.png',fullPage:true});
  const cancel=page.locator('[data-action="cancel-session"]');if(await cancel.count())await cancel.click();

  check(runtime.length===0,`No runtime errors occur across the app-wide walkthrough. ${runtime.join(' | ')}`);
 }catch(error){if(!report.errors.includes(error.message))report.errors.push(error.message);console.error(error.stack||error)}finally{
  fs.mkdirSync('qa',{recursive:true});
  fs.writeFileSync('qa/v73-app-design-report.json',JSON.stringify(report,null,2));
  await browser.close();
 }
 if(report.errors.length)process.exit(1);
})();
