const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=name=>fs.readFileSync(path.join(__dirname,'../analytics',name),'utf8');
const decision=read('decision-context.js');
const usability=read('usability-v3.js');
const page=read('page.js');
const clarity=read('clarity.js');
const workspace=read('workspace.js');

test('main audience read uses plain YouTube strategist language',()=>{
  assert.match(decision,/New viewers and returning viewers are both healthy\./);
  assert.match(decision,/The channel is bringing people in while also keeping people coming back\./);
  assert.match(decision,/Protect the current Reach \+ follow-up pattern\./);
  assert.doesNotMatch(decision,/Acquisition and repeat-audience signals are both healthy\./);
  assert.doesNotMatch(decision,/Protect the current acquisition \+ continuation pattern\./);
});

test('channel health labels explain the idea without analyst jargon',()=>{
  assert.match(decision,/REACH \/ VIEWS/);
  assert.match(decision,/COME BACK/);
  assert.match(decision,/WATCH MORE/);
  assert.match(decision,/BUSINESS RESULT/);
  assert.match(decision,/How do I read Reach \/ Views, Come Back, Watch More, and Business Result\?/);
});

test('checkpoint labels stay simple',()=>{
  assert.match(usability,/48h · Check/);
  assert.match(usability,/28d · What to make next/);
  assert.doesNotMatch(usability,/48h · Triage/);
  assert.doesNotMatch(usability,/28d · Programming/);
});

test('visible baseline and audience copy uses current-normal language',()=>{
  assert.match(page,/Current normal/);
  assert.match(page,/Content plan mix/);
  assert.doesNotMatch(page,/>Operating baseline</);
  assert.doesNotMatch(page,/Acquisition and repeat-audience signals/);
});

test('video strategist reads explain Reach Trust Convert plainly',()=>{
  assert.match(clarity,/Reach videos should get in front of more of the right new viewers/);
  assert.match(clarity,/Trust videos should get the right viewers to watch longer, watch another video, and come back/);
  assert.match(clarity,/Convert videos are judged by whether the right viewers take the intended business action/);
  assert.match(workspace,/New \+ returning viewers · rolling 28 days/);
});
