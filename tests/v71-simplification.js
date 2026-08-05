const fs=require('fs');
const {chromium}=require('playwright');
const report={build:'V52.1-coach-flow-v71',passed:[],errors:[],checkedAt:new Date().toISOString()};
const pass=m=>{report.passed.push(m);console.log(`PASS: ${m}`)};
const check=(value,message)=>{if(!value){report.errors.push(message);throw new Error(message)}pass(message)};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const runtime=[];
 page.on('pageerror',e=>runtime.push(`pageerror: ${e.message}`));
 page.on('console',m=>{if(m.type()==='error')runtime.push(`console: ${m.text()}`)});
 try{
  await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
  await page.evaluate(()=>{
   document.body.classList.remove('cloud-locked');const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=true;
   const data=seedData(),c=data.creators.find(x=>x.id==='jordan')||data.creators[0];
   c.foundationConfirmedAt=c.foundationConfirmedAt||todayIso();c.onboardingCompletedAt=c.onboardingCompletedAt||todayIso();
   c.month=c.month||{};c.month.reviewedAt=todayIso();
   c.diagnostic=c.diagnostic||{signals:{}};c.diagnostic.updatedAt='2026-01-01';c.diagnosticReviewedAt='2026-01-01';
   c.needsReview=c.needsReview||{};c.needsReview.diagnosis=true;
   c.events=c.events||[];if(!c.events.some(x=>x.id==='v71-review'))c.events.push({id:'v71-review',title:'Sample video review due',date:todayIso(),type:'Learning review',owner:'Coach',status:'Not started',videoId:c.videos?.[0]?.id||''});
   state.creators=data.creators;state.currentCreatorId=c.id;state.currentVideoId=c.videos?.[0]?.id||'';state.currentView='overview';save();render();
  });
  await page.waitForTimeout(450);
  check(await page.evaluate(()=>window.__acceleratorBuild)==='V52.1-coach-flow-v71','The live app identifies the V71 simplified build.');

  const homeText=await page.locator('.content').innerText();
  check(/Foundation/i.test(homeText)&&/Diagnosis/i.test(homeText)&&/90-day plan/i.test(homeText)&&/Monthly plan/i.test(homeText),'Creator Home keeps the complete creator journey visible.');
  check(await page.locator('[data-v70-current-attention]').count()===1,'Creator Home shows the selected creator’s due-work badge.');
  check(await page.locator('[data-v70-run-call],[data-action="run-session"]').count()>=1,'Creator Home has one clear Run coaching call entry.');

  await page.locator('[data-v69-open-strategy]').first().click();await page.waitForTimeout(100);
  const strategy=await page.locator('#v69-body').innerText();
  check(/Business and funnel/i.test(strategy)&&/Message and brand/i.test(strategy)&&/Capacity and cadence/i.test(strategy),'Creator Strategy keeps branding, funnel and cadence available.');
  await page.locator('[data-v69-close]').click();

  await page.locator('[data-v70-current-attention]').click();await page.waitForTimeout(100);
  const reminders=await page.locator('#v70-attention-body').innerText();
  check(/90-day diagnosis review due/i.test(reminders)&&/video review/i.test(reminders),'The reminder list includes diagnosis and video reviews.');
  const diagnosisReminder=page.locator('#v70-attention-body .v70-reminder').filter({hasText:'90-day diagnosis review due'}).locator('button');
  await diagnosisReminder.click();await page.waitForTimeout(200);
  check(await page.evaluate(()=>state.currentView==='overview'&&state.v67DiagnosisReview===true),'The diagnosis reminder opens the actual diagnosis-review workflow.');

  await page.evaluate(()=>{state.currentView='creators';render()});await page.waitForTimeout(200);
  check(await page.locator('[data-v70-card-attention]').count()>=1,'The all-creators page marks creators who need attention.');

  await page.evaluate(()=>{state.currentView='setup';render()});await page.waitForTimeout(200);
  check(await page.locator('.v69-map').count()===0,'Foundation no longer repeats the full journey map.');
  check(await page.locator('[data-v69-open-strategy]').count()>=1,'Creator Strategy remains available from Foundation.');

  await page.evaluate(()=>{state.currentView='video';render()});await page.waitForTimeout(400);
  check(await page.locator('.v71-video-focus').count()===1,'The video page starts with one compact purpose and research summary.');
  const focus=await page.locator('.v71-video-focus').innerText();
  check(/Topic:/i.test(focus)&&/Click frame:/i.test(focus),'The planner separates the topic from the click frame.');
  const sections=page.locator('details[data-v49-section]');
  check(await sections.count()===6,'The video planner has six clear working stages.');
  check(await page.locator('.v70-job-guide:visible,.v70-planner-guide:visible,.v69-rationale:visible,.v57-guides:visible').count()===0,'Old guide layers are removed from the default planner view.');
  check(await sections.filter({has:page.locator('summary')}).count()===6,'Each planner stage has one visible summary.');

  const experience=page.locator('details[data-v49-section="video-experience"]');
  await experience.locator(':scope>summary').click();await page.waitForTimeout(220);
  check(await experience.evaluate(n=>n.open),'Story and opening opens without leaving the page.');
  const openCount=await page.locator('details[data-v49-section][open]').count();
  check(openCount===1,'Only one video-planning stage is open at a time.');
  const visible=await page.evaluate(()=>{const shown=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};const e=document.querySelector('details[data-v49-section="video-experience"]');return{stories:[...e.querySelectorAll('.v57-choice-card')].filter(shown).length,hooks:[...e.querySelectorAll('.v57-hook-choice')].filter(shown).length,buttons:[...e.querySelectorAll('button')].filter(shown).length}});
  check(visible.stories>=2&&visible.stories<=3,'Story planning shows only two or three useful starting choices.');
  check(visible.hooks>=2&&visible.hooks<=3,'Opening planning shows only two or three useful starting choices.');
  check(visible.buttons<=20,'The open Story and opening stage stays under twenty visible controls.');
  const story=page.locator('details[data-v49-section="video-experience"] [data-v57-structure]:visible').nth(1);
  check(await story.count()===1,'A visible story choice is available.');
  await story.click();await page.waitForTimeout(200);
  check(await experience.evaluate(n=>n.open),'Choosing a story option keeps the stage open.');

  const pack=page.locator('details[data-v49-section="video-package"]');
  await pack.locator(':scope>summary').click();await page.waitForTimeout(160);
  const packageText=await pack.innerText();
  check(/Topic.*what the video is about/i.test(packageText)&&/Click frame.*reason.*click/i.test(packageText),'Title and thumbnail explains topic versus click frame where the choice is made.');
  await page.locator('[data-v71-jobs]').click();await page.waitForTimeout(100);
  const jobs=await page.locator('#v71-help-overlay').innerText();
  check(/Reach/i.test(jobs)&&/Trust/i.test(jobs)&&/Convert/i.test(jobs)&&/Research/i.test(jobs)&&/Structure/i.test(jobs),'The optional video-job guide explains how research and structure differ.');
  await page.locator('[data-v71-close-help]').click();

  await page.evaluate(()=>{state.currentView='plan';render()});await page.waitForTimeout(220);
  const planContinues=await page.locator('.content button:visible').filter({hasText:/^Continue$/}).count();
  check(planContinues<=1,'Monthly Plan no longer shows repeated Continue buttons.');

  await page.evaluate(()=>{state.currentView='calendar';render()});await page.waitForTimeout(220);
  check(await page.locator('.calendar-stack').count()===1,'The full calendar is permanently visible.');
  check(await page.locator('.calendar-stack details').count()===0,'Calendar content is not hidden in dropdowns.');
  const order=await page.evaluate(()=>{const c=document.querySelector('.calendar-card'),u=document.querySelector('.upcoming-panel');return !!c&&!!u&&Boolean(c.compareDocumentPosition(u)&Node.DOCUMENT_POSITION_FOLLOWING)});
  check(order,'Upcoming work and reviews appears beneath the calendar.');
  check(await page.locator('.content').getByText('Execution handoff',{exact:true}).count()===0,'Execution handoff no longer competes with the main calendar page.');

  await page.evaluate(()=>{state.currentView='results';render()});await page.waitForTimeout(220);
  const intro=await page.locator('.v71-learn-intro').innerText();
  check(/only when a video review is due/i.test(intro)&&/24 hours/i.test(intro)&&/7 days/i.test(intro)&&/28 days/i.test(intro),'Reviews clearly explains when the coach uses it.');
  check(await page.locator('.v70-learn-guide:visible').count()===0,'The old large Learn guide is hidden.');

  await page.evaluate(()=>{state.currentView='overview';render()});await page.waitForTimeout(180);
  const call=page.locator('[data-v70-run-call],[data-action="run-session"]').first();await call.click();await page.waitForTimeout(180);
  const progress=page.locator('[data-session-bind="progress"]');await progress.fill('V71 recovered call draft');await page.waitForTimeout(150);
  await page.locator('[data-action="cancel-session"]').click();await page.waitForTimeout(140);await page.locator('[data-v70-run-call],[data-action="run-session"]').first().click();await page.waitForTimeout(180);
  check((await page.locator('[data-session-bind="progress"]').inputValue())==='V71 recovered call draft','An unfinished live coaching-call draft restores after leaving the workspace.');

  check(runtime.length===0,`No runtime errors occur in the complete V71 walkthrough. ${runtime.join(' | ')}`);
 }catch(error){if(!report.errors.includes(error.message))report.errors.push(error.message);console.error(error.stack||error)}finally{
  fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/v71-simplification-report.json',JSON.stringify(report,null,2));
  await page.screenshot({path:'qa/v71-simplification-screen.png',fullPage:true}).catch(()=>{});await browser.close();
 }
 if(report.errors.length)process.exit(1);
})();
