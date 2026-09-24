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

test('baseline onboarding is staged and cannot update live diagnosis until completion',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/analyticsSetupDraft/);
 assert.match(live,/The live dashboard will not change until you choose Complete setup/);
 assert.match(live,/draftReady=c=>draftActive\(c\)&&draftCoverage\(c\)\.every/);
 assert.match(live,/Complete 15 usable rows at 24h, 48h, 7d and 28d before finishing the setup/);
 assert.match(live,/I\.compactStore\(draft\.foundation\)/);
});

test('first baseline workflow auto-starts a staged setup draft',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/!draftActive\(c\)&&!\(c\.analyticsFoundation\?\.policies\|\|\[\]\)\.length/);
 assert.match(live,/foundation:seedSetupFoundation\(c\)/);
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

test('preserved trusted rows are explained instead of making Analytics look empty',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/Your trusted analytics are still here\./);
 assert.match(live,/You do not need to delete or recreate this creator\./);
 assert.match(live,/Finish clean baseline setup/);
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
