const fs=require('fs');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
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
    state.creators=data.creators;
    state.currentCreatorId=creator.id;
    state.currentVideoId=creator.videos?.find(item=>item.id==='v3')?.id||creator.videos?.[0]?.id||'';
    localStorage.clear();
    save();
  });
  const views=['overview','creators','setup','plan','calendar','results','video'];
  const output={checkedAt:new Date().toISOString(),views:{}};
  fs.mkdirSync('qa',{recursive:true});
  for(const view of views){
    await page.evaluate(view=>{state.currentView=view;render()},view);
    await page.waitForTimeout(220);
    output.views[view]=await page.evaluate(()=>{
      const content=document.querySelector('.content');
      const children=[...(content?.children||[])].map((node,index)=>({index,tag:node.tagName,className:node.className,id:node.id||'',text:(node.textContent||'').replace(/\s+/g,' ').trim().slice(0,260)}));
      return{
        bodyClass:document.body.className,
        contentClass:content?.className||'',
        children,
        html:content?.innerHTML||'',
        topbar:document.querySelector('.topbar')?.outerHTML||'',
        sidebar:document.querySelector('.sidebar')?.outerHTML||''
      };
    });
    await page.screenshot({path:`qa/v75-dom-${view}.png`,fullPage:true});
  }
  fs.writeFileSync('qa/v75-dom-snapshots.json',JSON.stringify(output,null,2));
  await browser.close();
})();
