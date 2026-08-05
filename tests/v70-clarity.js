const fs=require('fs');
const {chromium}=require('playwright');
const report={build:'V52.1-coach-flow-v70',passed:[],errors:[],checkedAt:new Date().toISOString()};
const pass=m=>{report.passed.push(m);console.log(`PASS: ${m}`)};
const assert=(v,m)=>{if(!v){report.errors.push(m);throw new Error(m)}pass(m)};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const runtime=[];
 page.on('pageerror',e=>runtime.push(`pageerror: ${e.message}`));
 page.on('console',m=>{if(m.type()==='error')runtime.push(`console: ${m.text()}`)});
 try{
  await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
  await page.waitForTimeout(500);
  await page.evaluate(()=>{document.body.classList.remove('cloud-locked');const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=true;render()});
  await page.waitForTimeout(200);
  assert(await page.evaluate(()=>window.__acceleratorBuild)==='V52.1-coach-flow-v70','The app identifies the V70 coaching-clarity build.');

  await page.evaluate(()=>{
   const data=seedData(),c=data.creators.find(x=>x.id==='jordan')||data.creators[0];
   c.foundationConfirmedAt=c.foundationConfirmedAt||todayIso();
   c.month=c.month||{};c.month.reviewedAt=todayIso();
   c.diagnostic=c.diagnostic||{signals:{}};c.diagnostic.updatedAt='2026-01-01';c.diagnosticReviewedAt='2026-01-01';
   c.needsReview=c.needsReview||{};c.needsReview.diagnosis=true;
   c.events=c.events||[];c.events.push({id:'v70-review',title:'Sample video review due',date:todayIso(),type:'Learning review',owner:'Coach',status:'Not started',videoId:c.videos?.[0]?.id||''});
   state.creators=[c];state.currentCreatorId=c.id;state.currentVideoId=c.videos?.[0]?.id||'';state.currentView='overview';save();render();
  });
  await page.waitForTimeout(300);
  const switchText=await page.locator('[data-creator-switch] option:checked').textContent();
  assert(/due/i.test(switchText),'The creator switcher shows when the selected creator has due reviews.');
  assert(await page.locator('[data-v70-current-attention]').count()===1,'A due-review badge is available beside the creator switcher.');
  await page.locator('[data-v70-current-attention]').click();
  await page.waitForTimeout(100);
  const reminderText=await page.locator('#v70-attention-body').innerText();
  assert(/90-day diagnosis review due/i.test(reminderText),'The global reminder list includes a due diagnosis review.');
  assert(/video review/i.test(reminderText),'The global reminder list includes a due video review.');
  await page.locator('[data-v70-close-attention]').click();

  await page.evaluate(()=>{state.currentView='creators';render()});
  await page.waitForTimeout(250);
  assert(await page.locator('[data-v70-card-attention]').count()>=1,'The creators page marks creators who have reviews due.');

  await page.evaluate(()=>{state.currentView='video';const v=video();if(v)v.uiStep='structure';render()});
  await page.waitForTimeout(350);
  await page.evaluate(()=>{const section=document.querySelector('[data-v49-section="video-experience"]');if(section)section.open=true});
  await page.waitForTimeout(100);
  assert(await page.locator('.v70-current-job').count()===1,'The video planner explains the current Reach, Trust or Convert job.');
  assert(/Job is not format/i.test(await page.locator('.v70-current-job').innerText()),'The video job guide separates purpose from format.');
  const contentText=await page.locator('.content').innerText();
  assert(/how the idea earns the click/i.test(contentText)&&/Click frame/i.test(contentText),'Packaging angle is replaced with a clear topic-versus-click-frame explanation.');
  const visibleCounts=await page.evaluate(()=>{
   const visible=n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   return {stories:[...document.querySelectorAll('.v57-choice-card')].filter(visible).length,hooks:[...document.querySelectorAll('.v57-hook-choice')].filter(visible).length,paceVisible:[...document.querySelectorAll('.v57-pace-choice')].filter(visible).length};
  });
  assert(visibleCounts.stories>=2&&visibleCounts.stories<=3,'The main story decision shows no more than three useful choices.');
  assert(visibleCounts.hooks>=2&&visibleCounts.hooks<=3,'The main opening decision shows no more than three useful choices.');
  assert(visibleCounts.paceVisible===0,'The full pacing library stays hidden until the coach asks to change pacing.');
  assert(await page.locator('.v69-card-why').count()===0,'Recommendation reasons are visible compact text instead of nested dropdowns.');

  const before=await page.evaluate(()=>({y:window.scrollY,open:document.querySelector('[data-v49-section="video-experience"]')?.open}));
  const visibleStory=page.locator('.v57-choice-card').filter({visible:true}).nth(1).locator('[data-v57-structure]');
  await visibleStory.click();
  await page.waitForTimeout(350);
  const after=await page.evaluate(()=>({y:window.scrollY,open:document.querySelector('[data-v49-section="video-experience"]')?.open}));
  assert(before.open&&after.open,'Choosing a story option does not close the Story, Hook and Pacing section.');
  assert(Math.abs(after.y-before.y)<120,'Choosing a planner option does not jump the coach to a different part of the page.');

  await page.evaluate(()=>{state.currentView='calendar';render()});
  await page.waitForTimeout(250);
  assert(await page.locator('.calendar-stack').count()===1,'The calendar page keeps a permanent calendar stack.');
  assert(await page.locator('.calendar-stack details').count()===0,'Calendar content is not hidden inside dropdowns.');
  const calendarOrder=await page.evaluate(()=>{const cal=document.querySelector('.calendar-card'),up=document.querySelector('.upcoming-panel');return !!cal&&!!up&&Boolean(cal.compareDocumentPosition(up)&Node.DOCUMENT_POSITION_FOLLOWING)});
  assert(calendarOrder,'The calendar appears before upcoming work and reviews.');
  assert(await page.locator('.v70-upcoming-title').count()===1,'Upcoming work and reviews is clearly labelled beneath the calendar.');

  await page.evaluate(()=>{state.currentView='results';render()});
  await page.waitForTimeout(250);
  const learnText=await page.locator('.v70-learn-guide').innerText();
  assert(/Observe/i.test(learnText)&&/Interpret/i.test(learnText)&&/Route/i.test(learnText),'Review & Learn explains the three actions the coach performs.');
  assert(/24 hours/i.test(learnText)&&/7 days/i.test(learnText)&&/28 days/i.test(learnText),'Review & Learn states when evidence reviews normally happen.');

  await page.evaluate(()=>{state.currentView='overview';render()});
  await page.waitForTimeout(150);
  await page.locator('[data-action="run-session"]').first().click();
  await page.waitForTimeout(200);
  assert(await page.locator('.v70-session-note').count()===1,'Run coaching call explicitly says it is the live-call workspace.');
  const progress=page.locator('[data-session-bind="progress"]');
  await progress.fill('Recovered draft marker');
  await page.waitForTimeout(150);
  assert(await page.evaluate(()=>Object.values(localStorage).some(value=>String(value).includes('Recovered draft marker'))),'The unfinished coaching-call draft is saved in browser storage.');
  await page.locator('[data-action="cancel-session"]').click();
  await page.waitForTimeout(160);
  await page.locator('[data-action="run-session"]').first().click();
  await page.waitForTimeout(200);
  assert((await page.locator('[data-session-bind="progress"]').inputValue())==='Recovered draft marker','Returning to Run coaching call restores the unfinished draft.');

  assert(runtime.length===0,`No runtime errors occur in the V70 clarity flow. ${runtime.join(' | ')}`);
 }catch(e){if(!report.errors.includes(e.message))report.errors.push(e.message);console.error(e.stack||e)}finally{
  fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/v70-clarity-report.json',JSON.stringify(report,null,2));
  await page.screenshot({path:'qa/v70-clarity-screen.png',fullPage:true}).catch(()=>{});await browser.close();
 }
 if(report.errors.length)process.exit(1);
})();
