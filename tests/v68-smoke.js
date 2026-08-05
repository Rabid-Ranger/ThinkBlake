const fs = require('fs');
const { chromium } = require('playwright');

const report = { build: 'V52.1-coach-flow-v68', passed: [], warnings: [], errors: [], checkedAt: new Date().toISOString() };
const pass = message => { report.passed.push(message); console.log(`PASS: ${message}`); };
const warn = message => { report.warnings.push(message); console.warn(`WARN: ${message}`); };
const fail = message => { report.errors.push(message); throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); pass(message); };

(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`); });

  try {
    await page.goto('http://127.0.0.1:4173/decoded-source.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof render === 'function' && typeof state !== 'undefined' && typeof blankCreator === 'function', null, { timeout: 60000 });
    await page.waitForTimeout(500);
    const build = await page.evaluate(() => window.__acceleratorBuild);
    assert(build === 'V52.1-coach-flow-v68', 'The decoded app identifies itself as the V68 coach-flow build.');

    await page.evaluate(() => {
      const c = blankCreator();
      c.id = 'v68-new-coach'; c.name = 'New Coach Test'; c.channelName = ''; c.channelUrl = '';
      state.creators = [c]; state.currentCreatorId = c.id; state.currentVideoId = ''; state.currentView = 'overview'; state.v67DiagnosisReview = false;
      save(); render();
    });
    await page.waitForTimeout(150);
    assert((await page.locator('.v67-current h3').textContent()).trim() === 'Foundation', 'A brand-new creator sees Foundation as the only current onboarding step.');
    const earlyViews = await page.locator('.sidebar [data-view]').evaluateAll(nodes => nodes.map(node => node.dataset.view));
    assert(!earlyViews.includes('roadmap') && !earlyViews.includes('plan') && !earlyViews.includes('videos') && !earlyViews.includes('results'), 'Later strategy and learning pages stay out of the navigation during initial setup.');

    await page.locator('[data-v67-stage-go="setup"]').click();
    await page.waitForTimeout(100);
    assert(await page.locator('[data-v67-foundation="channel"]').getAttribute('open') !== null, 'The current Foundation section opens automatically.');
    await page.locator('[data-v67-bind="channelName"]').fill('New Coach Channel');
    await page.locator('[data-v67-bind="channelName"]').dispatchEvent('change');
    await page.waitForTimeout(180);
    assert(await page.locator('[data-v67-foundation="channel"]').getAttribute('open') !== null, 'Changing a Foundation field does not collapse the section being worked on.');

    await page.evaluate(() => {
      const c = structuredClone(seedData().creators[0]);
      c.id = 'v68-gate-test'; c.name = 'Lifecycle Gate Test';
      c.foundationConfirmedAt = ''; c.foundationReviewedAt = ''; c.onboardingCompletedAt = '';
      c.capacity = {videosPerMonth:4,hoursPerWeek:'8 focused hours',team:'Creator and editor',editing:'Dedicated editor',callCadence:'Every two weeks'};
      c.diagnostic = { signals: { discovery:'Unknown',click:'Unknown',trust:'Unknown',action:'Unknown',consistency:'Unknown',clarity:'Unknown' }, updatedAt:'' };
      c.diagnosticReviewedAt = ''; c.bottleneck = ''; c.priority = ''; c.diagnosticWhy = '';
      c.roadmap = {}; c.ninetyDayRoadmap = {}; c.cycleOutcome = '';
      c.videos = []; c.sessions = []; c.monthHistory = []; c.assignments = []; c.events = [];
      c.month = { month: monthIso(), constraint:'', monthlyGoal:'', learningQuestion:'', portfolioConfirmedAt:'', slots:[] };
      state.creators = [c]; state.currentCreatorId = c.id; state.currentVideoId=''; state.currentView='setup';
      save(); render();
    });
    await page.waitForTimeout(180);
    const foundationState = await page.evaluate(() => ({
      states:[...document.querySelectorAll('[data-v67-foundation]')].map(node=>({id:node.dataset.v67Foundation,open:node.open,state:node.querySelector('.v67-foundation-state')?.textContent?.trim()})),
      count:document.querySelectorAll('[data-v68-confirm-foundation]').length,
      visible:[...document.querySelectorAll('[data-v68-confirm-foundation]')].filter(node=>{const rect=node.getBoundingClientRect(),style=getComputedStyle(node);return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden';}).length,
      creator:{foundationConfirmedAt:creator().foundationConfirmedAt,audienceStatus:audienceStatus(creator()),messageStatus:messageStatus(creator()),businessStatus:businessStatus(creator()),capacity:creator().capacity}
    }));
    console.log(`FOUNDATION_GATE_STATE:${JSON.stringify(foundationState)}`);
    const confirmation = page.locator('[data-v68-confirm-foundation]');
    assert(await confirmation.count() === 1, 'A completed Foundation waits for one explicit confirmation before diagnosis opens.');
    await confirmation.click();
    await page.waitForTimeout(180);
    assert((await page.locator('.page-head h2').textContent()).includes('Starting diagnosis'), 'Confirming Foundation opens the starting diagnosis.');

    await page.locator('[data-v58-signal="discovery"][data-v58-value="Weak"]').click();
    await page.waitForTimeout(180);
    assert((await page.locator('.page-head h2').textContent()).includes('Starting diagnosis'), 'Selecting one diagnosis answer does not prematurely complete the diagnosis.');
    const diagnosisViews = await page.locator('.sidebar [data-view]').evaluateAll(nodes => nodes.map(node => node.dataset.view));
    assert(!diagnosisViews.includes('roadmap'), 'The 90-day roadmap remains locked until the diagnosis recommendation is confirmed.');
    await page.locator('[data-v67-confirm-diagnosis]').click();
    await page.waitForTimeout(180);
    assert((await page.evaluate(() => state.currentView)) === 'roadmap', 'Confirming the diagnosis opens the 90-day roadmap.');

    await page.evaluate(() => {
      const c = creator();
      c.foundationConfirmedAt = todayIso();
      c.diagnostic.updatedAt = todayIso(); c.diagnosticReviewedAt = todayIso();
      c.bottleneck = 'Qualified discovery'; c.priority = 'Reach topics and packaging';
      c.roadmap = {
        destination:'Create a repeatable qualified discovery system', successDefinition:'Three comparable videos create useful evidence',
        months:[
          {month:monthIso(),outcome:'Prove one topic family',learningQuestion:'Which problem creates qualified clicks?'},
          {month:addMonthsIso(monthIso(),1),outcome:'Repeat the useful pattern',learningQuestion:'Does the pattern hold across formats?'},
          {month:addMonthsIso(monthIso(),2),outcome:'Turn the pattern into a series',learningQuestion:'Which sequence creates returning viewers?'}
        ]
      };
      c.month = {month:monthIso(),constraint:'Qualified discovery',monthlyGoal:'Publish one qualified Reach test',learningQuestion:'Can one clear problem create qualified discovery?',portfolioConfirmedAt:todayIso(),slots:[{id:'slot-1',job:'Reach',videoId:''}]};
      const v = blankVideo('Reach'); v.id='v68-video'; v.title='Untitled test video';
      c.videos=[v]; state.currentVideoId=v.id; state.currentView='overview'; save(); render();
    });
    await page.waitForTimeout(180);
    assert((await page.locator('.v67-current h3').textContent()).trim() === 'First video plans', 'Adding a blank video does not unlock execution.');

    await page.evaluate(() => {
      const v = video();
      v.exactViewer='A creator struggling to earn qualified discovery'; v.viewerMoment='They are choosing the next topic to film';
      v.surfaceProblem='Their ideas do not earn enough qualified clicks'; v.promise='Choose a clearer topic and package it around a proven viewer problem';
      v.angle='Mistake or risk'; v.format='Educational';
      v.research={...(v.research||{}),platformEvidence:'Three relevant outliers',referenceVideos:'Three saved examples',openGap:'No one explains the decision for this viewer'};
      v.packaging={...(v.packaging||{}),titles:['Title one','Title two','Title three'],thumbnailIdeas:['Clear before and after concept'],thumbnailUploads:[]};
      v.structure={...(v.structure||{}),hook:'Show the weak and strong topic side by side',first30:'Name the decision and show the consequence',beats:'Problem → Cause → Solution → Application',firstPayoff:'Give the topic filter in the first minute'};
      state.currentView='overview'; save(); render();
    });
    await page.waitForTimeout(180);
    assert((await page.locator('.v67-current h3').textContent()).trim() === 'Ready to execute', 'Execution opens only after a real video plan is ready.');

    await page.evaluate(() => { state.currentView='video'; video().uiStep='structure'; save(); render(); });
    await page.waitForTimeout(300);
    assert(await page.locator('.v60-upload-slot').count() === 3, 'The video package shows three separate thumbnail upload areas.');

    const beforeOrder = await page.locator('.v57-choice-card h5').allTextContents();
    assert(beforeOrder.length === 4, 'The story planner presents four focused structure choices.');
    await page.locator('.v57-choice-card').nth(2).locator('[data-v57-structure]').click();
    await page.waitForTimeout(250);
    const afterOrder = await page.locator('.v57-choice-card h5').allTextContents();
    assert(JSON.stringify(beforeOrder) === JSON.stringify(afterOrder), 'Selecting a story structure does not reorder the four options.');
    assert(await page.locator('.v57-choice-card.selected').count() === 1, 'The selected story structure is highlighted instead of moved.');

    const guides = page.locator('details.v57-guides');
    await guides.evaluate(node => { node.open = true; });
    await page.locator('[data-v57-hook]').nth(1).click();
    await page.waitForTimeout(250);
    assert(await guides.getAttribute('open') !== null, 'Changing a video-planner choice does not collapse the open guide.');

    const duplicateActions = await page.evaluate(() => {
      const clean=value=>String(value||'').replace(/\s+/g,' ').trim().toLowerCase(); const duplicates=[];
      document.querySelectorAll('.content .v49-section-body,.content .v67-current,.content .v67-reference-section,.content .v57-choice-section,.content article.card').forEach((scope,index)=>{
        const seen=new Set(); scope.querySelectorAll(':scope button,:scope a.button').forEach(button=>{
          const data=[...button.attributes].filter(attr=>attr.name.startsWith('data-')).map(attr=>`${attr.name}=${attr.value}`).sort().join('|');
          const signature=`${clean(button.textContent)}|${data}`; if(seen.has(signature))duplicates.push({index,signature});else seen.add(signature);
        });
      }); return duplicates;
    });
    assert(duplicateActions.length === 0, 'Focused sections do not contain duplicate buttons with the same action.');

    const singleLetters = await page.evaluate(() => [...document.querySelectorAll('.content *')]
      .filter(node => node.children.length===0 && /^[A-Za-z]$/.test((node.textContent||'').trim()) && !node.closest('.avatar,.v67-progress,.step-index,.v58-choice-row'))
      .map(node => ({tag:node.tagName,text:node.textContent.trim(),className:node.className})).slice(0,20));
    if(singleLetters.length)warn(`Possible single-letter UI artifacts: ${JSON.stringify(singleLetters)}`);else pass('No unexplained single-letter artifacts appear in the focused video screen.');

    const youtubeCount = await page.evaluate(() => [...document.querySelectorAll('a,button')].filter(node => /youtube|youtu\.be/i.test(`${node.getAttribute('href')||''} ${node.textContent||''} ${node.getAttribute('title')||''}`)).length);
    assert(youtubeCount <= 1, 'The active creator workspace exposes no more than one YouTube channel button.');

    await page.evaluate(() => { const c=creator(); c.onboardingCompletedAt=todayIso(); c.videos[0].publishDate=todayIso(); state.currentView='overview'; save(); render(); });
    await page.waitForTimeout(200);
    assert((await page.locator('.page-head h2').textContent()).includes('Creator Home'), 'After onboarding, Home becomes the recurring coaching screen.');
    assert(await page.locator('.v67-progress').count() === 0, 'The one-time onboarding progress disappears from recurring Creator Home.');

    const views = ['overview','setup','roadmap','plan','videos','video','calendar','results'];
    for (const view of views) {
      await page.evaluate(viewName => { state.currentView=viewName; render(); }, view);
      await page.waitForTimeout(120);
      assert(await page.locator('.content').count() === 1, `${view} renders a single dashboard content area.`);
    }

    if(runtimeErrors.length)fail(`Runtime errors were captured: ${runtimeErrors.join(' | ')}`);
    pass('No runtime or console errors were captured during the end-to-end walkthrough.');
  } catch (error) {
    if(!report.errors.includes(error.message))report.errors.push(error.message);
    console.error(error.stack || error);
  } finally {
    fs.mkdirSync('qa', { recursive: true });
    fs.writeFileSync('qa/v68-report.json', JSON.stringify(report, null, 2));
    await page.screenshot({ path: 'qa/v68-final-screen.png', fullPage: true }).catch(()=>{});
    await browser.close();
  }

  if(report.errors.length)process.exit(1);
})();
