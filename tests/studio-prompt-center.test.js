const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Studio analytics uses one prompt center with separate checkpoint choices',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/button\('prompt-center','Studio prompts'\)/);
  assert.match(live,/\['24','24h'\]/);
  assert.match(live,/\['48','48h'\]/);
  assert.match(live,/\['168','7d'\]/);
  assert.match(live,/\['672','28d'\]/);
  assert.match(live,/\['channel','Channel \+ audience'\]/);
  assert.doesNotMatch(live,/\['all','Everything'\]/);
  assert.match(live,/button\('copy-current','Copy prompt'\)/);
  assert.match(live,/navigator\.clipboard\.writeText\(p\.text\)/);
  assert.match(live,/button\('paste','Paste Studio results'\)/);
});

test('prompt-center copy explains per-checkpoint maturation and 15-video cohorts',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/15 most recent fully matured eligible long-form videos/);
  assert.match(live,/This checkpoint gets its own cohort/);
  assert.match(live,/a video can belong to 24h\/48h\/7d before it is old enough for 28d/);
});

test('legacy channel button does not appear when prompt center exists',()=>{
  const decision=read('analytics/decision-context.js');
  assert.match(decision,/data-studio="prompt-center"/);
});
