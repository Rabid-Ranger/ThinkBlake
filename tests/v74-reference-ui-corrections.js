const fs=require('fs');
const {chromium}=require('playwright');

const report={build:'V52.1-reference-ui-v74',checkedAt:new Date().toISOString(),passed:[],errors:[],measurements:{}};
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
      state.currentView='video';
      localStorage.clear();
      save();render();
    });
    await page.waitForFunction(()=>document.body.classList.contains('v74-reference-ui')&&document.querySelector('.v74-phase-tabs'),null,{timeout:10000});
    await page.evaluate(()=>window.V74_GUIDES_READY);
    await page.waitForTimeout(250);

    check(await page.evaluate(()=>window.__acceleratorBuild)==='V52.1-reference-ui-v74','The rebuilt app identifies the V74 source-faithful UI.');
    check(await page.evaluate(()=>Object.keys(window.V74_SOURCE_GUIDES||{}).length)===8,'All eight original source guides are loaded.');
    check(await page.locator('.v74-video-flow').count()===1,'The video page has one stable workflow header.');
    check(await page.locator('.v74-phase-tab').count()===4,'The workflow has four phase tabs.');
    check(await page.locator('.v72-phase-tabs,.v72-video-shell').count()===0,'No older V72 phase interface remains.');

    const positions=await page.evaluate(()=>{
      const tabs=document.querySelector('.v74-phase-tabs');
      const first=document.querySelector('details[data-v49-section]');
      return{tabsTop:tabs?.getBoundingClientRect().top??99999,firstTop:first?.getBoundingClientRect().top??-1,tabsBefore:Boolean(tabs&&first&&(tabs.compareDocumentPosition(first)&Node.DOCUMENT_POSITION_FOLLOWING))};
    });
    report.measurements.phasePositions=positions;
    check(positions.tabsBefore&&positions.tabsTop<positions.firstTop,'The phase tabs sit above the video sections, not below them.');
    check(/Plan/i.test(await page.locator('.v74-phase-tab.active').innerText()),'Plan is the default phase.');

    const visiblePlan=await page.locator('details[data-v49-section]:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.v49Section));
    check(JSON.stringify(visiblePlan)===JSON.stringify(['video-purpose','video-strategy','video-package']),'Plan shows only Viewer and Goal, Strategy, and Package sections.');
    check(await page.locator('details[data-v49-section]:visible[open]').count()===0,'Every visible video section starts collapsed.');

    const purpose=page.locator('details[data-v49-section="video-purpose"]');
    const strategy=page.locator('details[data-v49-section="video-strategy"]');
    await purpose.locator(':scope > summary').click();
    check(await purpose.evaluate(node=>node.open),'Clicking a section opens it.');
    await strategy.locator(':scope > summary').click();
    check(await strategy.evaluate(node=>node.open),'Clicking a second section opens it.');
    check(!(await purpose.evaluate(node=>node.open)),'Opening a second section closes the first one.');

    await strategy.locator('[data-v74-section-guide]').click();
    await page.waitForSelector('#v74-guide-backdrop.open');
    const researchText=await page.locator('#v74-guide-content').innerText();
    check(/VIDIQ OUTLIERS/i.test(researchText)&&/YOUTUBE RESEARCH TAB/i.test(researchText)&&/GOOGLE TRENDS/i.test(researchText)&&/YOUTUBE AUTOCOMPLETE/i.test(researchText)&&/COMMENT MINING/i.test(researchText),'The Research guide preserves all five original research methods.');
    check(/Research Strategies/i.test(await page.locator('#v74-guide-title').innerText()),'The drawer uses the original Research Strategies guide.');
    check(await page.locator('#v74-guide-content .method-header').count()===5,'The Research guide contains all five original method headers.');
    check(await page.locator('#v74-guide-content .guide-table').count()>=1,'The full guide preserves source tables.');
    check(await page.locator('#v74-guide-content .guide-tip').count()>=1,'The full guide preserves source tip components.');
    check(await page.locator('#v74-guide-content .guide-warning').count()>=1,'The full guide preserves the original warning component.');
    await page.screenshot({path:'qa/v74-guide.png',fullPage:true});
    await page.locator('[data-v74-close-guide]').click();

    await page.locator('details[data-v49-section="video-package"] > summary').click();
    await page.locator('details[data-v49-section="video-package"] [data-v74-section-guide]').click();
    await page.waitForSelector('#v74-guide-backdrop.open');
    check(await page.locator('.v74-guide-tab').count()===3,'Package opens the full Title, Thumbnail Tips, and Thumbnail Strategies guide set.');
    const packageTabs=(await page.locator('.v74-guide-tab').allInnerTexts()).join(' | ');
    check(/Title Formulas/i.test(packageTabs)&&/Thumbnail Tips/i.test(packageTabs)&&/12 Methods/i.test(packageTabs),'Package guide tabs preserve the original guide names.');
    await page.locator('.v74-guide-tab').filter({hasText:'12 Methods'}).click();
    check(await page.locator('#v74-guide-content .method-header').count()>=12,'The thumbnail strategy guide includes all 12 source methods.');
    await page.locator('[data-v74-close-guide]').click();

    const phaseScrollBefore=await page.evaluate(()=>window.scrollY);
    await page.locator('[data-v74-phase="script"]').click();
    await page.waitForTimeout(120);
    const phaseScrollAfter=await page.evaluate(()=>window.scrollY);
    report.measurements.phaseScrollDelta=Math.abs(phaseScrollAfter-phaseScrollBefore);
    check(Math.abs(phaseScrollAfter-phaseScrollBefore)<20,'Changing phases does not jump the page.');
    check(await page.locator('details[data-v49-section="video-experience"]:visible').count()===1,'Script shows the Viewer Experience section.');
    check(!(await page.locator('details[data-v49-section="video-experience"]').evaluate(node=>node.open)),'Script also starts collapsed.');

    await page.locator('details[data-v49-section="video-experience"] > summary').click();
    await page.locator('details[data-v49-section="video-experience"] [data-v74-section-guide]').click();
    await page.waitForSelector('#v74-guide-backdrop.open');
    const experienceTabs=(await page.locator('.v74-guide-tab').allInnerTexts()).join(' | ');
    check(/Hook Strategies/i.test(experienceTabs)&&/Story Structures/i.test(experienceTabs)&&/Retention Strategies/i.test(experienceTabs),'Viewer Experience includes the complete Hook, Story, and Retention source guides.');
    await page.locator('[data-v74-close-guide]').click();

    await page.locator('[data-v74-phase="plan"]').click();
    await page.locator('details[data-v49-section="video-purpose"] > summary').click();
    await page.locator('details[data-v49-section="video-purpose"]').scrollIntoViewIfNeeded();
    await page.evaluate(()=>window.scrollBy(0,180));
    const jobSelect=page.locator('select[data-bind="job"]:visible').first();
    check(await jobSelect.count()===1,'The Reach, Trust, and Convert control is present.');
    const scrollBefore=await page.evaluate(()=>window.scrollY);
    const current=await jobSelect.inputValue();
    const next=current==='Reach'?'Trust':'Reach';
    await jobSelect.selectOption(next);
    await page.waitForTimeout(550);
    const scrollAfter=await page.evaluate(()=>window.scrollY);
    report.measurements.jobChangeScrollDelta=Math.abs(scrollAfter-scrollBefore);
    check(Math.abs(scrollAfter-scrollBefore)<35,'Changing Reach, Trust, or Convert does not shoot the page to the bottom.');
    check(await page.locator('.v74-video-flow').count()===1,'Rerendering after a job change does not duplicate the phase UI.');

    await page.screenshot({path:'qa/v74-video.png',fullPage:true});

    const header=await page.evaluate(()=>{
      const bar=document.querySelector('.topbar'),actions=document.querySelector('.top-actions'),youtube=document.querySelector('.top-actions .v58-youtube');
      const b=bar?.getBoundingClientRect(),a=actions?.getBoundingClientRect();
      return{
        rightGap:b&&a?Math.round(b.right-a.right):999,
        youtubeBackground:youtube?getComputedStyle(youtube).backgroundColor:'',
        youtubeColor:youtube?getComputedStyle(youtube).color:'',
        extraSaved:document.querySelectorAll('.v73-save-state').length,
        cloudTools:document.querySelectorAll('.top-actions .cloud-tools').length
      };
    });
    report.measurements.header=header;
    check(header.rightGap<30,'Workspace, Team, Saved, YouTube, creator, and menu controls are aligned to the right.');
    check(header.extraSaved===0,'The duplicated V73 Saved indicator is gone.');
    check(header.youtubeBackground==='rgb(229, 45, 39)'||header.youtubeBackground==='rgb(240, 68, 62)','The YouTube button is red.');

    await page.evaluate(()=>{state.currentView='calendar';render()});
    await page.waitForFunction(()=>document.body.classList.contains('v74-reference-ui')&&document.querySelector('.v74-calendar-legend'),null,{timeout:10000});
    await page.waitForTimeout(180);
    check(await page.locator('.v74-calendar-legend').count()===1,'Calendar includes a visible event-color legend.');
    const eventColors=await page.locator('.event-chip:visible').evaluateAll(nodes=>[...new Set(nodes.map(node=>getComputedStyle(node).backgroundColor))]);
    report.measurements.calendarColors=eventColors;
    check(eventColors.length>=4,'Calendar events retain multiple distinct colors by work type.');
    const namedColors=await page.evaluate(()=>{
      const pick=selector=>{const node=document.querySelector(selector);return node?getComputedStyle(node).backgroundColor:''};
      return{coaching:pick('.event-chip.type-coaching-call'),publish:pick('.event-chip.type-publish'),edit:pick('.event-chip.type-edit'),research:pick('.event-chip.type-research')};
    });
    check(Boolean(namedColors.coaching)&&Boolean(namedColors.publish)&&namedColors.coaching!==namedColors.publish,'Coaching calls and publishing remain visually distinct.');
    await page.screenshot({path:'qa/v74-calendar.png',fullPage:true});

    const meaningfulRuntime=runtime.filter(message=>!/^pageerror: Failed to fetch$/.test(message));
    check(meaningfulRuntime.length===0,`No runtime errors occur in the V74 walkthrough. ${meaningfulRuntime.join(' | ')}`);
  }catch(error){
    if(!report.errors.includes(error.message))report.errors.push(error.message);
    console.error(error.stack||error);
  }finally{
    fs.mkdirSync('qa',{recursive:true});
    fs.writeFileSync('qa/v74-reference-ui-report.json',JSON.stringify(report,null,2));
    await browser.close();
  }
  if(report.errors.length)process.exit(1);
})();
