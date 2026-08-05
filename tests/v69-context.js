const fs=require('fs');
const {chromium}=require('playwright');
const report={build:'V52.1-coach-flow-v68.1',passed:[],errors:[],checkedAt:new Date().toISOString()};
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
  await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof blankCreator==='function',null,{timeout:60000});
  await page.waitForTimeout(500);
  assert(await page.evaluate(()=>window.__acceleratorBuild)==='V52.1-coach-flow-v68.1','The app identifies the contextual guided-flow build.');

  await page.evaluate(()=>{
   const c=blankCreator();c.id='context-new';c.name='Context Test';c.channelName='';c.channelUrl='';
   state.creators=[c];state.currentCreatorId=c.id;state.currentVideoId='';state.currentView='overview';save();render();
  });
  await page.waitForTimeout(250);
  assert(await page.locator('.v69-map').count()===1,'A new creator sees the full journey map while Foundation remains current.');
  assert(await page.locator('.v69-stage').count()===7,'The journey map shows Foundation through Learning.');
  assert((await page.locator('.v69-stage.current b').textContent()).trim()==='Foundation','Only Foundation is marked as the current action.');
  assert(await page.locator('.v69-stage em',{hasText:'Preview'}).count()>=1,'Later stages remain visible as previews instead of disappearing.');
  assert(await page.locator('[data-v69-open-strategy]').count()>=1,'Creator Strategy is always available from the workspace.');

  await page.locator('[data-v69-open-strategy]').first().click();
  await page.waitForTimeout(100);
  assert(await page.locator('#v69-overlay.open').count()===1,'Creator Strategy opens without leaving onboarding.');
  const strategySectionCount=await page.locator('#v69-body .v69-section').count();
  const strategyLabels=(await page.locator('#v69-body .v69-kicker').allTextContents()).map(x=>x.trim().toLowerCase());
  assert(strategySectionCount>=5&&strategyLabels.includes('audience')&&strategyLabels.includes('message and brand')&&strategyLabels.includes('business and funnel'),'The reference clearly separates audience, brand and funnel information.');
  await page.locator('[data-v69-close]').click();

  await page.evaluate(()=>{
   const data=seedData();const c=data.creators.find(x=>x.id==='jordan')||data.creators[0];
   state.creators=[c];state.currentCreatorId=c.id;state.currentVideoId=c.videos?.[0]?.id||'';state.currentView='overview';save();render();
  });
  await page.waitForTimeout(250);
  await page.locator('[data-v69-open-strategy]').first().click();
  const jordan=await page.locator('#v69-body').innerText();
  assert(jordan.includes('First 30 Days Manager Checklist'),'Jordan Lee’s lead magnet is visible in Creator Strategy.');
  assert(jordan.includes('First-Time Manager Coaching')||jordan.includes('First-Time Director Coaching'),'Jordan Lee’s coaching offer is visible in Creator Strategy.');
  assert(jordan.includes('Lead your first team with confidence'),'Jordan Lee’s saved branding message is visible.');
  assert(jordan.includes('Every two weeks'),'Jordan Lee’s coaching cadence is visible.');
  await page.locator('[data-v69-close]').click();

  await page.evaluate(()=>{state.currentView='video';const v=video();if(v)v.uiStep='structure';save();render()});
  await page.waitForTimeout(400);
  assert(await page.locator('.v69-rationale').count()>=1,'The video planner explains why recommendations are being shown.');
  const rationale=(await page.locator('.v69-rationale').allInnerTexts()).join(' ');
  const hasInputEvidence=/Video job|Format:|Angle:|Viewer problem|Proof available|Research signal|Creator capacity|Monthly business goal/.test(rationale);
  assert(rationale.includes('Best fit')&&hasInputEvidence,'Best fit is defined and tied to visible creator and video inputs.');
  assert(/packaging angle|story shape|video types|opening|pacing|next action/i.test(rationale),'The recommendation explanation describes what the choice controls.');

  await page.evaluate(()=>{state.currentView='setup';render()});
  await page.waitForTimeout(250);
  assert(await page.locator('.v69-impact').count()===1,'The active Foundation section states what its answer will influence later.');

  assert(runtime.length===0,`No runtime errors occur in the context flow. ${runtime.join(' | ')}`);
 }catch(e){if(!report.errors.includes(e.message))report.errors.push(e.message);console.error(e.stack||e)}finally{
  fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/v69-context-report.json',JSON.stringify(report,null,2));
  await page.screenshot({path:'qa/v69-context-screen.png',fullPage:true}).catch(()=>{});await browser.close();
 }
 if(report.errors.length)process.exit(1);
})();
