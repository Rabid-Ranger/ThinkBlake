const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Studio prompt center exposes the checkpoint choices',()=>{
 const live=read('analytics/live.js');
 for(const x of ["['24','24h']","['48','48h']","['168','7d']","['672','28d']","['channel','90d Channel Health']"])assert.ok(live.includes(x));
});

test('complete checkpoint tabs default to verification while new-only is separate',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/inventory\.complete>=15\?'verify':'update'/);
 assert.match(live,/Check only for new uploads/);
 assert.match(live,/re-verifies all 15 rows/);
});

test('baseline onboarding is a sequential staged wizard with one final commit',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/analyticsSetupDraft/);
 assert.match(live,/setupDefs=\[\{key:'24'/);
 assert.match(live,/Step 7 of 7/);
 assert.match(live,/Save &amp; continue/);
 assert.match(live,/Complete baseline/);
 assert.match(live,/draftReady=c=>draftActive\(c\)&&setupProgress\(c\)\.every/);
 assert.match(live,/I\.compactStore\(draft\.foundation\)/);
});

test('first baseline workflow starts at the guided setup wizard',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/ensureSetupDraft=\(c,fresh=false\)=>/);
 assert.match(live,/foundation:seedSetupFoundation\(c\)/);
 assert.match(live,/return openSetupWizard\(c\)/);
});

test('staged setup is seeded from already trusted checkpoint observations',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/const obs=c\?\.analyticsFoundation\?\.observations\|\|\[\]/);
 assert.match(live,/I\.parse\(JSON\.stringify\(packet\),c,A\.emptyStore\(\)\)\.next/);
});

test('Copy prompt copies the visible prompt and has a clipboard fallback',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/const text=ta\?\.value\|\|ta\?\.textContent\|\|''/);
 assert.match(live,/navigator\.clipboard\?\.writeText/);
 assert.match(live,/document\.execCommand\?\.\('copy'\)/);
});


test('native top navigation exits Analytics before native navigation renders',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/\.v11-primary-nav button\[data-view\],\.nav button\[data-view\]/);
 assert.match(live,/if\(window\.__cgNativeView==='analytics'\)window\.__cgNativeView=''/);
 assert.match(live,/,true\);/);
});

test('active setup explains why the live dashboard has not changed yet',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/The live Analytics dashboard has not been changed yet/);
 assert.match(live,/The live dashboard has not been updated yet/);
 assert.match(live,/Review & complete baseline/);
});


test('Analytics owns native exit clicks so native and Analytics routers cannot race',()=>{
 const page=read('analytics/page.js');
 assert.match(page,/if\(window\.__cgNativeView!=='analytics'\)\{syncAnalyticsNavActive\(\);return;\}/);
 assert.match(page,/e\.stopImmediatePropagation\(\)/);
 assert.match(page,/routeNativeView\(view\)/);
 assert.match(page,/if\(hasView\)st\.view=view/);
 assert.match(page,/if\(hasCurrentView\)st\.currentView=view/);
});

test('Analytics clears stale active state from topbar icon navigation',()=>{
 const page=read('analytics/page.js');
 assert.match(page,/\.topbar button\[data-view\],\.topbar nav button/);
 assert.match(page,/x\.classList\.remove\('active'\)/);
});


test('wizard enforces one data type per setup step',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/This is the '\+def\.short\+' step/);
 assert.match(live,/Channel and audience data have their own later steps/);
 assert.match(live,/The 90-day channel step must contain channelPeriods only/);
 assert.match(live,/The audience step must contain audienceSnapshots only/);
});

test('wizard advances only after the current step is usable',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/setupProgress\(c\)\.find\(x=>x\.key===stepKey\)/);
 assert.match(live,/saved successfully\. Moving to the next step/);
 assert.match(live,/this step is not complete yet/);
});


test('intentional baseline rebuild starts with an empty staged foundation',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/ensureSetupDraft\(c,true\)/);
 assert.match(live,/foundation:fresh\?A\.emptyStore\(\):seedSetupFoundation\(c\)/);
});


test('wizard shows traffic-source completeness separately from core completeness',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/checkpointTrafficCoverage/);
 assert.match(live,/Core '\+Math\.min\(inv\.complete,15\)\+'\/15 · traffic mix/);
 assert.match(live,/90d channel: /);
 assert.match(live,/Traffic-source context is incomplete/);
});

test('wizard tells the coach that checkpoint prompts perform a second traffic-source pass',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/second exact-window traffic-source pass/);
 assert.match(live,/Browse, Suggested, Search and External/);
});
