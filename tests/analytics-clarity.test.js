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
  assert.equal(A.countSignal({multiple:.69}).label,'Below usual');
  assert.equal(A.countSignal({multiple:1}).label,'In the usual range');
  assert.equal(A.countSignal({multiple:1.5}).label,'Above normal');
  assert.equal(A.countSignal({multiple:2}).label,'Strong');
  assert.equal(A.countSignal({multiple:3}).label,'Big win');
  assert.equal(A.rateSignal({deltaPp:-.6},.5).label,'Below usual');
  assert.equal(A.rateSignal({deltaPp:-.4},.5).label,'In the usual range');
});

test('diagnosis isolates reach packaging retention and combinations',()=>{
  assert.equal(A.diagnose(result({outcome:.55,imp:.5}),168).bottleneck,'REACH');
  assert.equal(A.diagnose(result({outcome:.85,ctr:-1.2}),168).bottleneck,'TITLE / THUMBNAIL');
  assert.equal(A.diagnose(result({outcome:.85,ret:-6}),168).bottleneck,'WATCH');
  assert.equal(A.diagnose(result({outcome:.6,ctr:-1,ret:-5}),168).bottleneck,'TITLE / THUMBNAIL + WATCH');
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
  assert.equal(A.patternFromDiagnoses([packaging]).confidence,'1 of 1 recent videos');
  assert.equal(A.patternFromDiagnoses([packaging,packaging]).confidence,'2 of 2 recent videos');
  const p=A.patternFromDiagnoses([packaging,packaging,packaging,normal]);
  assert.equal(p.confidence,'3 of 4 recent videos');
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
  assert.match(d.headline,/couple things look off/i);
  assert.match(d.bottleneck,/WATCH/);
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
  assert.equal(card.status,'Comparison ready');
});

test('checkpoint tiles distinguish a missing saved checkpoint from a missing comparison',()=>{
  const card=A.ageCardRead({status:'missing_observation',comparisons:{}},48,false);
  assert.equal(card.score,'No 48h result');
  assert.equal(card.status,'No 48h checkpoint saved');
});


test('quick and strategist reads explain why what to do and how in plain language',()=>{
  const r=result({outcome:.56,imp:.54,ctr:-.04,apv:9.1});
  const d=A.diagnose(r,48);
  const q=A.quickStrategistRead(r,d,48);
  assert.match(q.why,/Engaged views are 0\.56× normal/i);
  assert.match(q.why,/CTR is basically normal/i);
  assert.match(q.why,/APV is 9\.1 pp above normal/i);
  assert.match(q.doNext,/Browse and Suggested/i);
  assert.match(q.how,/traffic sources/i);

  const deep=A.strategistRead({coachOS:{}},{id:'video-1'},r,d,48);
  assert.match(deep.meaning,/Reach is the first thing I would look at/i);
  assert.match(deep.next,/Browse and Suggested/i);
  assert.match(deep.how,/traffic sources/i);
  assert.match(deep.measure,/Engaged views, impressions/i);
});
