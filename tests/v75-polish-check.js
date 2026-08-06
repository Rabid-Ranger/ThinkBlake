const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
 await page.evaluate(()=>{
  document.body.classList.remove('cloud-locked');const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=true;
  const data=seedData(),creator=data.creators.find(item=>item.id==='jordan')||data.creators[0];
  creator.foundationConfirmedAt=creator.foundationConfirmedAt||todayIso();creator.onboardingCompletedAt=creator.onboardingCompletedAt||todayIso();creator.month=creator.month||{};creator.month.reviewedAt=todayIso();
  state.creators=data.creators;state.currentCreatorId=creator.id;state.currentVideoId=creator.videos?.[0]?.id||'';save();
 });
 const expected={overview:'Creator Home',creators:'All Creators',setup:'Creator Foundation',plan:'Monthly Plan',calendar:'Calendar',results:'Review & Learn'};
 for(const [view,title] of Object.entries(expected)){
  await page.evaluate(view=>{state.currentView=view;render()},view);
  await page.waitForFunction(()=>document.querySelector('.content>.v75-page-hero'));
  await page.waitForTimeout(80);
  const actual=(await page.locator('.content>.v75-page-hero h2').innerText()).trim();
  if(actual!==title)throw new Error(`${view} hero title is ${actual}, expected ${title}.`);
  const sectionGuides=await page.locator('.content>.v75-page-hero .v75-page-actions [data-v74-section-guide]').count();
  if(sectionGuides!==0)throw new Error(`${view} copied a section guide into the page hero.`);
  const pageGuides=await page.locator('.content>.v75-page-hero .v75-page-actions [data-v74-page-guide]').count();
  if(pageGuides>1)throw new Error(`${view} has duplicate page guide buttons.`);
 }
 await page.evaluate(()=>{state.currentView='setup';render()});await page.waitForTimeout(80);
 const summary=page.locator('.v75-foundation-flow details:visible>summary').first();
 if(await summary.count()){
  const central=summary.locator(':scope>div').first();
  const flex=await central.evaluate(node=>getComputedStyle(node).flexGrow);
  if(Number(flex)<1)throw new Error('Accordion title block does not fill the available source-style header space.');
 }
 console.log('PASS: Explicit page copy, guide de-duplication, and accordion hierarchy are correct.');
 await browser.close();
})().catch(error=>{console.error(error.stack||error);process.exit(1)});
