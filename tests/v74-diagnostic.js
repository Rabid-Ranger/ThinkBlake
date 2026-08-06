const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const runtime=[];
 page.on('pageerror',error=>runtime.push(`pageerror: ${error.message}`));
 page.on('console',message=>{if(message.type()==='error')runtime.push(`console: ${message.text()}`)});
 await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
 await page.evaluate(()=>{
  document.body.classList.remove('cloud-locked');const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=true;
  const data=seedData(),creator=data.creators.find(item=>item.id==='jordan')||data.creators[0];
  creator.foundationConfirmedAt=creator.foundationConfirmedAt||todayIso();creator.onboardingCompletedAt=creator.onboardingCompletedAt||todayIso();creator.month=creator.month||{};creator.month.reviewedAt=todayIso();
  state.creators=data.creators;state.currentCreatorId=creator.id;state.currentVideoId=creator.videos?.[0]?.id||'';state.currentView='video';localStorage.clear();save();render();
 });
 await page.waitForTimeout(900);
 const data=await page.evaluate(()=>({
  build:window.__acceleratorBuild,
  installed:window.__v74ReferenceUiInstalled,
  anchorFix:window.__v74VideoAnchorFixInstalled,
  currentView:typeof state!=='undefined'?state.currentView:null,
  bodyClasses:[...document.body.classList],
  contentText:(document.querySelector('.content')?.innerText||'').slice(0,500),
  headers:[...document.querySelectorAll('.content .page-head,.content .v49-page-head,.content .v49-video-head')].map(node=>({tag:node.tagName,className:node.className,text:(node.innerText||'').slice(0,120)})),
  detailCount:document.querySelectorAll('.content details[data-v49-section]').length,
  flowCount:document.querySelectorAll('.v74-video-flow').length,
  phaseCount:document.querySelectorAll('.v74-phase-tab').length,
  cloudGate:Boolean(document.querySelector('.cloud-gate:not([hidden]),#cloud-gate:not([hidden])')),
  topbar:Boolean(document.querySelector('.topbar'))
 }));
 console.log(JSON.stringify({data,runtime},null,2));
 await page.screenshot({path:'qa/v74-diagnostic.png',fullPage:true});
 await browser.close();
 if(!data.flowCount||runtime.length)process.exit(1);
})();
