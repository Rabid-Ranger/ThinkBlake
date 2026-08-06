const fs=require('fs');
const {chromium}=require('playwright');

const report={build:'V52.1-reference-ui-v75',checkedAt:new Date().toISOString(),passed:[],errors:[],measurements:{}};
const pass=message=>{report.passed.push(message);console.log(`PASS: ${message}`)};
const check=(value,message)=>{if(!value){report.errors.push(message);throw new Error(message)}pass(message)};

(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const runtime=[];
 page.on('pageerror',error=>runtime.push(`pageerror: ${error.message}`));
 page.on('console',message=>{if(message.type()==='error'&&!/cloud|api\/source|Failed to load resource/i.test(message.text()))runtime.push(`console: ${message.text()}`)});
 try{
  await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
  await page.evaluate(()=>{
   document.body.classList.remove('cloud-locked');
   const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=true;
   const data=seedData();
   const creator=data.creators.find(item=>item.id==='jordan')||data.creators[0];
   creator.foundationConfirmedAt=creator.foundationConfirmedAt||todayIso();
   creator.onboardingCompletedAt=creator.onboardingCompletedAt||todayIso();
   creator.month=creator.month||{};creator.month.reviewedAt=todayIso();
   creator.channelUrl=creator.channelUrl||'https://www.youtube.com/@leadwithconfidence';
   state.creators=data.creators;state.currentCreatorId=creator.id;
   state.currentVideoId=creator.videos?.find(item=>item.id==='v3')?.id||creator.videos?.[0]?.id||'';
   localStorage.clear();save();state.currentView='overview';render();
  });
  await page.waitForFunction(()=>window.__acceleratorBuild==='V52.1-reference-ui-v75'&&document.body.classList.contains('v75-reference-rebuild'),null,{timeout:15000});
  check(await page.evaluate(()=>window.__acceleratorBuild)==='V52.1-reference-ui-v75','The app identifies the V75 full reference UI rebuild.');
  check(await page.locator('#v75-full-reference-ui-style').count()===1,'The complete V75 source-derived stylesheet is installed once.');
  check(await page.locator('#v75-full-reference-ui-script').count()===1,'The complete V75 structural controller is installed once.');

  const style=await page.evaluate(()=>{
   const root=getComputedStyle(document.documentElement);
   return{bg:root.getPropertyValue('--v75-bg').trim(),panel:root.getPropertyValue('--v75-panel').trim(),panel2:root.getPropertyValue('--v75-panel-2').trim(),border:root.getPropertyValue('--v75-border').trim(),blue:root.getPropertyValue('--v75-blue').trim()};
  });
  report.measurements.designTokens=style;
  check(style.bg==='#0D1117'&&style.panel==='#161B22'&&style.panel2==='#21262D'&&style.border==='#30363D'&&style.blue==='#3B82F6','The supplied planner design tokens are preserved exactly.');

  const views=['overview','creators','setup','plan','calendar','results','video'];
  for(const view of views){
   await page.evaluate(view=>{state.currentView=view;render()},view);
   await page.waitForFunction(view=>document.body.classList.contains(`v75-view-${view}`)&&document.querySelector('.content>.v75-page-hero')&&document.querySelector('.content>.v75-workflow-notice')&&document.querySelector('.content>.v75-stage'),view,{timeout:10000});
   check(await page.locator('.content>.v75-page-hero').count()===1,`${view} has one reference-style page hero.`);
   check(await page.locator('.content>.v75-workflow-notice').count()===1,`${view} has one plain-English working-order banner.`);
   check(await page.locator('.content>.v75-stage').count()===1,`${view} uses the new structured content stage.`);
   check(await page.locator('.content>.page-head,.content>.v49-page-head,.content>.v49-video-top,.content>.v67-page-head').count()===0,`${view} no longer exposes the legacy page header.`);
   await page.screenshot({path:`qa/v75-${view}.png`,fullPage:true});
  }

  await page.evaluate(()=>{state.currentView='setup';render()});
  await page.waitForFunction(()=>document.querySelector('.v75-foundation-flow .v75-phase-tabs'));
  check(await page.locator('.v75-foundation-flow .v75-phase-tab').count()===4,'Foundation is organized into four source-style phases.');
  check(await page.locator('.v75-foundation-flow .v75-phase-tab.active').count()===1,'Foundation shows one active phase at a time.');
  check(await page.locator('.v75-foundation-flow .v75-phase-body details:visible').count()>=1,'The active Foundation phase retains its real working sections.');
  check(await page.locator('.v75-foundation-flow .v75-phase-body details:visible[open]').count()===0,'Foundation sections begin collapsed.');
  const foundationTabs=page.locator('.v75-foundation-flow .v75-phase-tab');
  if(await foundationTabs.count()>1){
   const before=await page.evaluate(()=>window.scrollY);await foundationTabs.nth(1).click();await page.waitForTimeout(120);const after=await page.evaluate(()=>window.scrollY);
   report.measurements.foundationPhaseScroll=Math.abs(after-before);check(Math.abs(after-before)<20,'Foundation phase switching does not jump the page.');
  }

  await page.evaluate(()=>{state.currentView='plan';render()});
  await page.waitForFunction(()=>document.querySelector('.v75-plan-flow .v75-phase-tabs'));
  check(await page.locator('.v75-plan-flow .v75-phase-tab').count()===4,'Monthly Plan is organized into Diagnose, Portfolio, Schedule, and Confirm phases.');
  check(await page.locator('.v75-plan-flow .v75-phase-tab.active').count()===1,'Monthly Plan shows one active phase at a time.');

  await page.evaluate(()=>{state.currentView='video';render()});
  await page.waitForFunction(()=>document.querySelector('.v75-stage .v74-video-flow'));
  const phasePlacement=await page.evaluate(()=>{const flow=document.querySelector('.v74-video-flow'),first=document.querySelector('details[data-v49-section]');return{before:Boolean(flow&&first&&(flow.compareDocumentPosition(first)&Node.DOCUMENT_POSITION_FOLLOWING)),flowTop:flow?.getBoundingClientRect().top,firstTop:first?.getBoundingClientRect().top}});
  report.measurements.videoPhasePlacement=phasePlacement;
  check(phasePlacement.before&&phasePlacement.flowTop<phasePlacement.firstTop,'Video phases remain above all video sections.');
  check(await page.locator('.v74-phase-tab').count()===4,'Video retains four workflow phases.');
  check(await page.locator('details[data-v49-section]:visible[open]').count()===0,'Visible video sections begin collapsed.');
  const firstVisible=page.locator('details[data-v49-section]:visible').first();
  if(await firstVisible.count()){
   await firstVisible.locator(':scope>summary').click();check(await firstVisible.evaluate(node=>node.open),'A video section opens normally.');
   const guide=firstVisible.locator('[data-v74-section-guide]');if(await guide.count()){await guide.click();await page.waitForSelector('#v74-guide-backdrop.open');check(await page.locator('#v74-guide-content').innerText().then(text=>text.length>500),'Full source guide content remains available from the rebuilt section.');await page.locator('[data-v74-close-guide]').click()}
  }

  const header=await page.evaluate(()=>{const bar=document.querySelector('.topbar'),actions=document.querySelector('.top-actions'),youtube=document.querySelector('.top-actions .v58-youtube,.top-actions a[href*="youtube.com"],.top-actions a[href*="youtu.be"]');const b=bar?.getBoundingClientRect(),a=actions?.getBoundingClientRect();return{rightGap:b&&a?Math.round(b.right-a.right):999,youtubeBackground:youtube?getComputedStyle(youtube).backgroundColor:'',extraSaved:document.querySelectorAll('.v73-save-state').length}});
  report.measurements.header=header;
  check(header.rightGap<30,'The complete top control group is aligned back to the right.');
  check(header.youtubeBackground==='rgb(229, 45, 39)','The YouTube button is red.');
  check(header.extraSaved===0,'No duplicated Saved indicator remains.');

  await page.evaluate(()=>{state.currentView='calendar';render()});
  await page.waitForFunction(()=>document.querySelector('.v75-calendar-legend,.v74-calendar-legend'));
  check(await page.locator('.v75-calendar-legend,.v74-calendar-legend').count()===1,'Calendar has one visible semantic color legend.');
  const eventColors=await page.locator('.event-chip:visible').evaluateAll(nodes=>[...new Set(nodes.map(node=>getComputedStyle(node).backgroundColor))]);
  report.measurements.calendarColors=eventColors;
  check(eventColors.length>=6,'Calendar retains distinct colors for different work types.');

  const meaningfulRuntime=runtime.filter(item=>!/favicon|cloud-status|Failed to fetch/i.test(item));
  report.measurements.runtime=meaningfulRuntime;
  check(meaningfulRuntime.length===0,`No runtime errors occur in the app-wide V75 walkthrough. ${meaningfulRuntime.join(' | ')}`);
 }catch(error){if(!report.errors.includes(error.message))report.errors.push(error.message);console.error(error.stack||error)}finally{
  fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/v75-full-reference-ui-report.json',JSON.stringify(report,null,2));await browser.close();
 }
 if(report.errors.length)process.exit(1);
})();
