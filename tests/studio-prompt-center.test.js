const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Studio prompt center exposes only the working checkpoint choices',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/\['24','24h'\]/);
  assert.match(live,/\['48','48h'\]/);
  assert.match(live,/\['168','7d'\]/);
  assert.match(live,/\['672','28d'\]/);
  assert.match(live,/\['channel','90d Channel Health'\]/);
  assert.doesNotMatch(live,/Recommended update/);
  assert.doesNotMatch(live,/Fill gaps with Studio/);
  assert.doesNotMatch(live,/Audience update/);
  assert.doesNotMatch(live,/Channel progress/);
  assert.doesNotMatch(live,/\['all','Everything'\]/);
});

test('first setup and ongoing update workflow are explained accurately',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/run 24h, 48h, 7d and 28d separately once/);
  assert.match(live,/Start with 7d if you want the main diagnosis first/);
  assert.match(live,/new eligible rows or backfill still needed/);
  assert.match(live,/15-video same-age cohort/);
});

test('checkpoint buttons intelligently switch setup vs update',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/const mode=hasBaseline\?'update':'setup'/);
  assert.match(live,/I\.collectionPrompt\(c,h,mode\)/);
  assert.match(live,/Each checkpoint keeps its own eligible cohort/);
});

test('missing video data is secondary and conditional, not a primary tab',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/missing\?\.videoRows\?\.length\?/);
  assert.match(live,/button\('missing','Fill video data gaps'\)/);
});

test('legacy Everything action cannot reopen an all-in-one prompt',()=>{
  const live=read('analytics/live.js');
  assert.doesNotMatch(live,/action==='prompt-all'\?'all'/);
  assert.doesNotMatch(live,/lastPrompt\.kind==='all'\?'all'/);
});


test('Copy prompt copies the exact visible prompt instead of regenerating it',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/const text=ta\?\.value\|\|ta\?\.textContent\|\|''/);
  assert.match(live,/if\(action==='copy-current'\)\{await copyVisibleStudioPrompt\(\);return;\}/);
  assert.doesNotMatch(live,/if\(action==='copy-current'\).*promptChoice\(c,key\)/);
});

test('Copy prompt has a real clipboard fallback and honest status text',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/navigator\.clipboard\?\.writeText/);
  assert.match(live,/document\.execCommand\?\.\('copy'\)/);
  assert.match(live,/Copied\. Paste it into Ask Studio\./);
  assert.match(live,/Press Ctrl\+C \(Windows\) or Cmd\+C \(Mac\) to copy it\./);
});


test('prompt center shows complete saved rows per checkpoint',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/Saved complete checkpoint rows:/);
  assert.match(live,/I\.checkpointInventory\?I\.checkpointInventory\(c,h\)/);
  assert.match(live,/repair incomplete rows/);
});


test('complete checkpoint tabs default to full verification, not silent new-only update',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/inventory\.complete>=15\?'verify':'update'/);
 assert.match(live,/Verify '\+winShort\(h\)\+' baseline/);
 assert.match(live,/Check only for new uploads/);
 assert.match(live,/re-verifies all 15 rows/);
 assert.match(live,/prompt-view-update-/);
});
