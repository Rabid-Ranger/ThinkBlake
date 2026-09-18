const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../analytics/clarity');

const result=(x={})=>({status:'compared',comparisons:{
  engagedViews:{multiple:x.outcome??1,current:1000,baseline:1000},
  views:{multiple:x.views??x.outcome??1,current:1000,baseline:1000},
  impressions:{multiple:x.imp??1,current:10000,baseline:10000},
  ctr:{deltaPp:x.ctr??0,current:.05,baseline:.05},
  retention30:{deltaPp:x.ret??0,current:.65,baseline:.65},
  apv:{deltaPp:x.apv??0,current:.45,baseline:.45}
}});

test('same-age count and rate ranges stay simple and explicit',()=>{
  assert.equal(A.countSignal({multiple:.69}).label,'Needs attention');
  assert.equal(A.countSignal({multiple:1}).label,'In range');
  assert.equal(A.countSignal({multiple:1.5}).label,'Promising');
  assert.equal(A.countSignal({multiple:2}).label,'Strong');
  assert.equal(A.countSignal({multiple:3}).label,'Big outlier');
  assert.equal(A.rateSignal({deltaPp:-.6},.5).label,'Needs attention');
  assert.equal(A.rateSignal({deltaPp:-.4},.5).label,'In range');
});

test('diagnosis isolates reach packaging retention and combinations',()=>{
  assert.equal(A.diagnose(result({outcome:.55,imp:.5}),168).bottleneck,'TOPIC / REACH');
  assert.equal(A.diagnose(result({outcome:.85,ctr:-1.2}),168).bottleneck,'PACKAGING');
  assert.equal(A.diagnose(result({outcome:.85,ret:-6}),168).bottleneck,'RETENTION');
  assert.equal(A.diagnose(result({outcome:.6,ctr:-1,ret:-5}),168).bottleneck,'PACKAGING + RETENTION');
});

test('winner soft spots do not become rescue recommendations',()=>{
  const d=A.diagnose(result({outcome:3.1,imp:3.2,ctr:-1.1}),168);
  assert.deepEqual(d.hardIssues,[]);
  assert.deepEqual(d.softIssues,['packaging']);
  assert.match(d.bottleneck,/NO FIX NEEDED/);
  assert.match(d.next,/Do not change a winning strategy|winning video|keep/i);
});

test('CTR cooling during expansion checks audience context before package changes',()=>{
  const d=A.diagnose(result({outcome:1.2,imp:2,ctr:-.9}),168);
  assert.deepEqual(d.hardIssues,[]);
  assert.deepEqual(d.softIssues,['packaging']);
  assert.match(d.next,/Check traffic source, audience breadth/);
  assert.match(d.next,/not automatically a thumbnail problem/);
});

test('repeated 7-day issues become a pattern only after repeated evidence',()=>{
  const packaging=A.diagnose(result({outcome:.8,ctr:-1}),168);
  const normal=A.diagnose(result({outcome:1.05}),168);
  assert.equal(A.patternFromDiagnoses([packaging]).confidence,'One clue only');
  assert.equal(A.patternFromDiagnoses([packaging,packaging]).confidence,'Worth watching');
  const p=A.patternFromDiagnoses([packaging,packaging,packaging,normal]);
  assert.equal(p.confidence,'Pattern emerging');
  assert.deepEqual(p.stages,['packaging']);
});


test('APV fallback does not pretend the first 30 seconds caused the problem',()=>{
  const r={status:'compared',comparisons:{
    views:{current:null,baseline:null,multiple:null},
    engagedViews:{current:null,baseline:null,multiple:null},
    impressions:{current:50000,baseline:100000,multiple:.5,relativeChangePct:-50},
    ctr:{current:.08,baseline:.08,multiple:1,deltaPp:0},
    retention30:{current:null,baseline:null,deltaPp:null},
    apv:{current:.25,baseline:.35,multiple:.714,deltaPp:-10},
    avdSeconds:{current:180,baseline:240,multiple:.75,deltaSeconds:-60}
  }};
  const d=A.diagnose(r,168);
  assert.match(d.headline,/More than one stage is weak/i);
  assert.match(d.bottleneck,/WATCH \/ VIEWING EXPERIENCE/);
  assert.match(d.next,/Exact 0:30 is missing/i);
  assert.match(d.next,/not proof/i);
});
