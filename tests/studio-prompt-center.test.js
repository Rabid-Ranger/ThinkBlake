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

test('checkpoint buttons intelligently switch setup vs update',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/const mode=hasBaseline\?'update':'setup'/);
  assert.match(live,/I\.collectionPrompt\(c,h,mode\)/);
  assert.match(live,/Each checkpoint keeps its own eligible cohort/);
});

test('missing data is secondary and conditional, not a primary tab',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/missing\?\.total\?/);
  assert.match(live,/button\('missing','Fill missing data'\)/);
});

test('main Analytics card matches the 15-video checkpoint workflow',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/24h, 48h, 7d, 28d, or 90d Channel Health/);
  assert.match(live,/15 most recent fully matured eligible long-form videos/);
  assert.doesNotMatch(live,/collect up to 5 videos per request/);
});


test('prompt center does not fake a recommendation from the currently selected window',()=>{
  const live=read('analytics/live.js');
  assert.doesNotMatch(live,/studio-rec|Recommended right now/);
  assert.match(live,/First-time setup:/);
  assert.match(live,/Choose another checkpoint/);
});
