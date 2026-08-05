const fs=require('fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
 await page.evaluate(()=>{document.body.classList.remove('cloud-locked');const g=document.getElementById('cloud-gate');if(g)g.hidden=true;const d=seedData(),c=d.creators.find(x=>x.id==='jordan')||d.creators[0];c.foundationConfirmedAt=c.foundationConfirmedAt||todayIso();c.onboardingCompletedAt=c.onboardingCompletedAt||todayIso();state.creators=[c];state.currentCreatorId=c.id;state.currentVideoId=c.videos?.[0]?.id||'';state.currentView='video';render()});
 await page.waitForTimeout(500);
 const map=await page.evaluate(()=>{
  const visible=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  const clean=n=>(n?.innerText||n?.textContent||'').replace(/\s+/g,' ').trim();
  const attrs=n=>Object.fromEntries([...n.attributes].filter(a=>a.name.startsWith('data-')||a.name==='class'||a.name==='id').map(a=>[a.name,a.value]));
  const details=[...document.querySelectorAll('.content details')].map((n,i)=>({i,open:n.open,visible:visible(n),summary:clean(n.querySelector(':scope>summary')).slice(0,180),attrs:attrs(n),parentDetails:n.parentElement?.closest('details')?[...document.querySelectorAll('.content details')].indexOf(n.parentElement.closest('details')):null,visibleButtons:[...n.querySelectorAll('button')].filter(visible).map(clean).slice(0,30)}));
  const major=[...document.querySelectorAll('.content [data-v49-section],.content .v49-section,.content .v57-choice-section,.content .v51-choice-coach,.content .planner-panel,.content article.card,.content section')].map((n,i)=>({i,tag:n.tagName,visible:visible(n),attrs:attrs(n),heading:clean(n.querySelector('h2,h3,h4,summary')).slice(0,180),directButtons:[...n.querySelectorAll(':scope>button,:scope>.button')].filter(visible).map(clean).slice(0,20)})).filter(x=>x.heading||x.attrs['data-v49-section']);
  return {details,major};
 });
 fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/v71-video-map.json',JSON.stringify(map,null,2));
 await browser.close();
})();
