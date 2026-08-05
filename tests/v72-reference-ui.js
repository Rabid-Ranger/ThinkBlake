const fs=require('fs');
const {chromium}=require('playwright');
const report={build:'V52.1-reference-ui-v73',checkedAt:new Date().toISOString(),passed:[],errors:[]};
const pass=message=>{report.passed.push(message);console.log(`PASS: ${message}`)};
const check=(value,message)=>{if(!value){report.errors.push(message);throw new Error(message)}pass(message)};

(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const runtime=[];
 page.on('pageerror',error=>runtime.push(`pageerror: ${error.message}`));
 page.on('console',message=>{if(message.type()==='error')runtime.push(`console: ${message.text()}`)});
 try{
  await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
  await page.evaluate(()=>{
   document.body.classList.remove('cloud-locked');const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=true;
   const data=seedData(),creator=data.creators.find(item=>item.id==='jordan')||data.creators[0];
   creator.foundationConfirmedAt=creator.foundationConfirmedAt||todayIso();creator.onboardingCompletedAt=creator.onboardingCompletedAt||todayIso();
   creator.month=creator.month||{};creator.month.reviewedAt=todayIso();
   state.creators=data.creators;state.currentCreatorId=creator.id;state.currentVideoId=creator.videos?.[0]?.id||'';state.currentView='video';
   localStorage.clear();save();render();
  });
  await page.waitForTimeout(500);
  check(await page.evaluate(()=>window.__acceleratorBuild)==='V52.1-reference-ui-v73','The app identifies the V73 reference-led build.');
  check(await page.locator('.v72-flow-note').count()===1,'The video page begins with one short flow instruction.');
  check(await page.locator('.v72-phase-tab').count()===4,'The planner has four clear phase tabs.');
  check((await page.locator('.v72-phase-tab.active').innerText()).includes('Plan'),'Plan is the default active phase.');
  const visiblePlan=await page.locator('details[data-v49-section]:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.v49Section));
  check(JSON.stringify(visiblePlan)===JSON.stringify(['video-purpose','video-strategy','video-package']),'Plan shows only viewer, research and packaging work.');
  check(await page.locator('details[data-v49-section]:visible').count()===3,'Only three working sections are visible in Plan.');
  check(await page.locator('details[data-v49-section]:visible .v72-guide-button').count()===3,'Each visible Plan section has a View Guide action.');

  await page.locator('[data-v72-guide="video-package"]').click();await page.waitForTimeout(120);
  check(await page.locator('#v72-guide-backdrop.open').count()===1,'View Guide opens a separate right-side guide drawer.');
  const guideText=(await page.locator('#v72-guide-backdrop').innerText()).replace(/\s+/g,' ');
  check(/Topic.*what the video is about/i.test(guideText)&&/click frame/i.test(guideText),'The packaging guide explains topic versus click frame.');
  await page.locator('[data-v72-close-guide]').click();
  check(await page.locator('#v72-guide-backdrop.open').count()===0,'The guide drawer closes without changing the working page.');

  await page.locator('[data-v72-phase="script"]').click();await page.waitForTimeout(120);
  check((await page.locator('.v72-phase-tab.active').innerText()).includes('Script'),'Script becomes the active phase.');
  check(await page.locator('details[data-v49-section="video-experience"]:visible').count()===1,'Script shows the Story and opening workspace.');
  check(await page.locator('details[data-v49-section]:visible').count()===1,'Script hides unrelated planning sections.');
  const experience=page.locator('details[data-v49-section="video-experience"]');
  check(await experience.evaluate(node=>node.open),'The first section in a selected phase opens automatically.');
  const story=page.locator('[data-v49-section="video-experience"] [data-v57-structure]:visible').nth(1);
  if(await story.count()){await story.click();await page.waitForTimeout(160);check(await experience.evaluate(node=>node.open),'Choosing a story option keeps the section open.')}else throw new Error('No visible story choice was available.');

  await page.locator('[data-v72-phase="produce"]').click();await page.waitForTimeout(120);
  const visibleProduce=await page.locator('details[data-v49-section]:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.v49Section));
  check(JSON.stringify(visibleProduce)===JSON.stringify(['video-publish','video-handoff']),'Produce and Publish shows only publishing and handoff work.');

  await page.locator('[data-v72-phase="review"]').click();await page.waitForTimeout(120);
  check(await page.locator('details[data-v49-section]:visible').count()===0,'Review hides planning form sections.');
  check(await page.locator('.v72-review-phase.active').count()===1,'Review shows a focused 24-hour, 7-day and 28-day panel.');
  const reviewText=(await page.locator('.v72-review-phase').innerText()).replace(/\s+/g,' ');
  check(/24 hours/i.test(reviewText)&&/7 days/i.test(reviewText)&&/28 days/i.test(reviewText),'Review shows the three meaningful review windows.');
  await page.locator('[data-v72-review-guide]').click();await page.waitForTimeout(100);
  check(/Because of this video/i.test(await page.locator('#v72-guide-content').innerText()),'The review guide ends with one future-decision prompt.');
  await page.locator('[data-v72-close-guide]').click();

  check(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--brand').trim())==='#3B82F6','The reference blue is the primary action color.');
  check(runtime.length===0,`No runtime errors occur. ${runtime.join(' | ')}`);
 }catch(error){if(!report.errors.includes(error.message))report.errors.push(error.message);console.error(error.stack||error)}finally{
  fs.mkdirSync('qa',{recursive:true});
  fs.writeFileSync('qa/v72-reference-ui-report.json',JSON.stringify(report,null,2));
  await page.screenshot({path:'qa/v72-reference-ui-screen.png',fullPage:true}).catch(()=>{});
  await browser.close();
 }
 if(report.errors.length)process.exit(1);
})();
