const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Studio analytics uses one prompt center with all prompt choices',()=>{
  const live=read('analytics/live.js');
  assert.match(live,/data-studio="prompt-center"/);
  assert.match(live,/\['all','Everything'\]/);
  assert.match(live,/\['24','24h'\]/);
  assert.match(live,/\['48','48h'\]/);
  assert.match(live,/\['168','7d'\]/);
  assert.match(live,/\['672','28d'\]/);
  assert.match(live,/\['channel','90-day channel \+ audience'\]/);
  assert.match(live,/data-studio="copy-current"/);
  assert.match(live,/navigator\.clipboard\.writeText\(p\.text\)/);
  assert.match(live,/data-studio="paste"/);
});

test('legacy channel button does not appear when prompt center exists',()=>{
  const decision=read('analytics/decision-context.js');
  assert.match(decision,/data-studio="prompt-center"/);
});
