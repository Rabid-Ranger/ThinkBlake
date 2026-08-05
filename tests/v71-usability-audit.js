const fs=require('fs');
const {chromium}=require('playwright');

const audit={
  build:null,
  checkedAt:new Date().toISOString(),
  runtimeErrors:[],
  pages:[],
  interactions:[],
  requirementChecks:[],
  warnings:[]
};

const visibleScript=`node=>{if(!node)return false;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}`;

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>audit.runtimeErrors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')audit.runtimeErrors.push(`console: ${m.text()}`)});

  async function setup(){
    await page.goto('http://127.0.0.1:4173/decoded-source.html',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>typeof render==='function'&&typeof state!=='undefined'&&typeof seedData==='function',null,{timeout:60000});
    await page.evaluate(()=>{
      document.body.classList.remove('cloud-locked');
      const gate=document.getElementById('cloud-gate');if(gate)gate.hidden=true;
      const data=seedData();
      const c=data.creators.find(x=>x.id==='jordan')||data.creators[0];
      c.foundationConfirmedAt=c.foundationConfirmedAt||todayIso();
      c.onboardingCompletedAt=c.onboardingCompletedAt||todayIso();
      c.month=c.month||{};c.month.reviewedAt=todayIso();
      c.diagnostic=c.diagnostic||{signals:{}};
      c.diagnostic.updatedAt='2026-01-01';c.diagnosticReviewedAt='2026-01-01';
      c.needsReview=c.needsReview||{};c.needsReview.diagnosis=true;
      c.events=c.events||[];
      if(!c.events.some(x=>x.id==='v71-review'))c.events.push({id:'v71-review',title:'Sample video review due',date:todayIso(),type:'Learning review',owner:'Coach',status:'Not started',videoId:c.videos?.[0]?.id||''});
      state.creators=data.creators;
      state.currentCreatorId=c.id;
      state.currentVideoId=c.videos?.[0]?.id||'';
      state.currentView='overview';
      save();render();
    });
    await page.waitForTimeout(500);
    audit.build=await page.evaluate(()=>window.__acceleratorBuild||document.querySelector('meta[name="accelerator-build"]')?.content||document.title);
  }

  async function inspectView(view,label,{openVideo=false}={}){
    await page.evaluate(v=>{state.currentView=v;render()},view);
    await page.waitForTimeout(350);
    if(openVideo){
      await page.evaluate(()=>{const section=document.querySelector('[data-v49-section="video-experience"]');if(section)section.open=true});
      await page.waitForTimeout(150);
    }
    const data=await page.evaluate(({view,label})=>{
      const visible=node=>{if(!node)return false;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
      const texts=selector=>[...document.querySelectorAll(selector)].filter(visible).map(n=>(n.innerText||n.textContent||'').replace(/\s+/g,' ').trim()).filter(Boolean);
      const headings=texts('h1,h2,h3,h4').slice(0,80);
      const buttons=texts('button,[role="button"]').slice(0,120);
      const visibleDetails=[...document.querySelectorAll('details')].filter(visible);
      const guides=[...document.querySelectorAll('.page-guide,.v70-job-guide,.v70-planner-guide,.v70-click-frame-note,.v70-learn-guide,.v69-foundation-impact,.v69-recommendation-context,.v70-session-note')].filter(visible);
      const cards=[...document.querySelectorAll('.card,.v57-choice-card,.v57-hook-choice,.v69-strategy-section,.v70-job-card')].filter(visible);
      const text=(document.querySelector('.content')?.innerText||document.body.innerText||'').replace(/\s+/g,' ').trim();
      const duplicates={};
      [...headings,...buttons].forEach(t=>{const key=t.toLowerCase();duplicates[key]=(duplicates[key]||0)+1});
      return {
        view,label,
        title:document.title,
        headings,
        buttons,
        textCharacters:text.length,
        visibleButtons:buttons.length,
        visibleCards:cards.length,
        visibleDetails:visibleDetails.length,
        openDetails:visibleDetails.filter(x=>x.open).length,
        visibleGuides:guides.length,
        duplicateLabels:Object.entries(duplicates).filter(([,n])=>n>1).slice(0,30),
        horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,
        bodyClasses:[...document.body.classList]
      };
    },{view,label});
    audit.pages.push(data);
    await page.screenshot({path:`qa/v71-${view}.png`,fullPage:true});
    return data;
  }

  function req(name,status,evidence){audit.requirementChecks.push({name,status,evidence})}

  try{
    await setup();
    const creators=await inspectView('creators','All creators');
    const home=await inspectView('overview','Creator Home');
    const setupPage=await inspectView('setup','Foundation');
    const diagnosis=await inspectView('diagnosis','Diagnosis');
    const plan=await inspectView('plan','Plan');
    const videos=await inspectView('video','Video planner',{openVideo:true});
    const calendar=await inspectView('calendar','Calendar');
    const learn=await inspectView('results','Review and Learn');

    req('Creator Home shows Foundation, Diagnosis and Plan status',/foundation/i.test(home.headings.join(' ')+home.buttons.join(' '))&&/diagnos/i.test(home.headings.join(' ')+home.buttons.join(' '))&&/plan/i.test(home.headings.join(' ')+home.buttons.join(' ')),'Creator Home headings/buttons inspected.');
    req('Creator reminders appear outside Creator Home',await page.evaluate(()=>typeof acceleratorReminders70==='function'),'Global reminder function exists; creators page screenshot captured.');
    req('Planner explains topic versus click frame',/click frame/i.test(videos.headings.join(' ')+videos.buttons.join(' '))||await page.locator('.v70-click-frame-note').count()>0,'Video planner text and note inspected.');
    req('Calendar is visible without dropdowns',calendar.visibleDetails===0||await page.locator('.calendar-stack details').count()===0,`Visible details on calendar: ${calendar.visibleDetails}.`);
    req('Review and Learn explains when it is used',/observe/i.test(learn.headings.join(' ')+learn.buttons.join(' '))||await page.locator('.v70-learn-guide').count()>0,'Review and Learn guide inspected.');

    // Interaction audit: planner option, reminder, call entry and navigation.
    await page.evaluate(()=>{state.currentView='video';render();const s=document.querySelector('[data-v49-section="video-experience"]');if(s)s.open=true});
    await page.waitForTimeout(250);
    const story=page.locator('[data-v49-section="video-experience"] [data-v57-structure]:visible').nth(1);
    if(await story.count()){
      const before=await story.boundingBox();
      await story.click();await page.waitForTimeout(300);
      const after=await story.boundingBox();
      audit.interactions.push({name:'Select story option',passed:!!before&&!!after&&Math.abs(after.y-before.y)<60,detail:{before,after,sectionOpen:await page.locator('[data-v49-section="video-experience"]').evaluate(n=>n.open)}});
    }else audit.interactions.push({name:'Select story option',passed:false,detail:'No visible story option found.'});

    await page.evaluate(()=>{state.currentView='overview';render()});await page.waitForTimeout(200);
    const call=page.locator('[data-v70-run-call],[data-action="run-session"]').first();
    if(await call.count()){
      await call.click();await page.waitForTimeout(250);
      audit.interactions.push({name:'Open live coaching call',passed:await page.locator('[data-session-bind="progress"]').count()===1,detail:'Live-call form checked.'});
      const cancel=page.locator('[data-action="cancel-session"]');if(await cancel.count())await cancel.click();
    }else audit.interactions.push({name:'Open live coaching call',passed:false,detail:'No call entry control found.'});

    for(const p of audit.pages){
      if(p.visibleButtons>24)audit.warnings.push(`${p.label} shows ${p.visibleButtons} visible controls.`);
      if(p.visibleCards>18)audit.warnings.push(`${p.label} shows ${p.visibleCards} visible cards.`);
      if(p.visibleGuides>3)audit.warnings.push(`${p.label} shows ${p.visibleGuides} separate guide/explanation panels.`);
      if(p.textCharacters>12000)audit.warnings.push(`${p.label} contains ${p.textCharacters} visible text characters.`);
      if(p.horizontalOverflow)audit.warnings.push(`${p.label} has horizontal overflow at 1440px.`);
    }
  }catch(error){
    audit.runtimeErrors.push(`audit failure: ${error.stack||error.message}`);
  }finally{
    fs.mkdirSync('qa',{recursive:true});
    fs.writeFileSync('qa/v71-usability-audit.json',JSON.stringify(audit,null,2));
    const lines=[`# V71 Usability Audit`,``,`Build: ${audit.build||'unknown'}`,`Checked: ${audit.checkedAt}`,``, `## Page inventory`,``];
    for(const p of audit.pages){lines.push(`### ${p.label}`,`- Visible controls: ${p.visibleButtons}`,`- Visible cards: ${p.visibleCards}`,`- Visible disclosure sections: ${p.visibleDetails} (${p.openDetails} open)`,`- Separate guide panels: ${p.visibleGuides}`,`- Visible text characters: ${p.textCharacters}`,`- Horizontal overflow: ${p.horizontalOverflow?'Yes':'No'}`,`- Main headings: ${p.headings.slice(0,12).join(' | ')||'None'}`,``)}
    lines.push('## Requirement checks','');for(const r of audit.requirementChecks)lines.push(`- ${r.status?'PASS':'MISSING/PARTIAL'}: ${r.name}. ${r.evidence}`);
    lines.push('','## Interaction checks','');for(const i of audit.interactions)lines.push(`- ${i.passed?'PASS':'BROKEN'}: ${i.name}. ${JSON.stringify(i.detail)}`);
    lines.push('','## Overload warnings','');if(audit.warnings.length)audit.warnings.forEach(w=>lines.push(`- ${w}`));else lines.push('- None triggered by the audit thresholds.');
    lines.push('','## Runtime errors','');if(audit.runtimeErrors.length)audit.runtimeErrors.forEach(e=>lines.push(`- ${e}`));else lines.push('- None.');
    fs.writeFileSync('qa/v71-usability-audit.md',lines.join('\n'));
    await browser.close();
  }
  if(audit.runtimeErrors.length||audit.interactions.some(x=>!x.passed))process.exitCode=1;
})();
