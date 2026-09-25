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
  assert.equal(A.countSignal({multiple:.69}).label,'Looks weak');
  assert.equal(A.countSignal({multiple:1}).label,'Looks normal');
  assert.equal(A.countSignal({multiple:1.5}).label,'Above normal');
  assert.equal(A.countSignal({multiple:2}).label,'Strong');
  assert.equal(A.countSignal({multiple:3}).label,'Big win');
  assert.equal(A.rateSignal({deltaPp:-.6},.5).label,'Looks weak');
  assert.equal(A.rateSignal({deltaPp:-.4},.5).label,'Looks normal');
});

test('diagnosis isolates reach packaging retention and combinations',()=>{
  assert.equal(A.diagnose(result({outcome:.55,imp:.5}),168).bottleneck,'REACH / TOPIC');
  assert.equal(A.diagnose(result({outcome:.85,ctr:-1.2}),168).bottleneck,'TITLE + THUMBNAIL');
  assert.equal(A.diagnose(result({outcome:.85,ret:-6}),168).bottleneck,'RETENTION');
  assert.equal(A.diagnose(result({outcome:.6,ctr:-1,ret:-5}),168).bottleneck,'TITLE + THUMBNAIL + RETENTION');
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
  assert.match(d.next,/check where the views came from|broader audience/i);
  assert.match(d.next,/does not automatically mean the thumbnail is bad/i);
});

test('repeated 7-day issues become a pattern only after repeated evidence',()=>{
  const packaging=A.diagnose(result({outcome:.8,ctr:-1}),168);
  const normal=A.diagnose(result({outcome:1.05}),168);
  assert.equal(A.patternFromDiagnoses([packaging]).confidence,'One clue so far');
  assert.equal(A.patternFromDiagnoses([packaging,packaging]).confidence,'Worth watching');
  const p=A.patternFromDiagnoses([packaging,packaging,packaging,normal]);
  assert.equal(p.confidence,'This is becoming a pattern');
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
  assert.match(d.bottleneck,/RETENTION \/ VIEWING EXPERIENCE/);
  assert.match(d.next,/Exact 0:30 is missing/i);
  assert.match(d.next,/not proof/i);
});


test('checkpoint tiles do not say no comparison when verified stage metrics are comparable',()=>{
  const r={status:'compared',comparisons:{
    engagedViews:{multiple:null,current:2325,baseline:3000},
    views:{multiple:null,current:5143,baseline:6000},
    impressions:{multiple:.92,current:25625,baseline:27800},
    ctr:{deltaPp:-.2,current:.0591,baseline:.0611},
    retention30:{deltaPp:null,current:null,baseline:null},
    apv:{deltaPp:4,current:.5307,baseline:.4907},
    avdSeconds:{deltaSeconds:-4,current:566,baseline:570}
  }};
  const card=A.ageCardRead(r,48,true);
  assert.equal(card.score,'Impressions 0.92×');
  assert.equal(card.status,'Looks normal');
});

test('checkpoint tiles distinguish a missing saved checkpoint from a missing comparison',()=>{
  const card=A.ageCardRead({status:'missing_observation',comparisons:{}},48,false);
  assert.equal(card.score,'No 48h result');
  assert.equal(card.status,'No 48h data saved');
});


test('checkpoint tile leads with result vs usual when the result metric is comparable',()=>{
  const r=result({outcome:.66,imp:.65,ctr:0,ret:0});
  const card=A.ageCardRead(r,24,true);
  assert.equal(card.score,'0.66× usual');
  assert.equal(card.status,'Reach is low so far');
  assert.doesNotMatch(card.score,/SHOW|CLICK|WATCH/);
});
