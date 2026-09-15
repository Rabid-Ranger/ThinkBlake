const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../analytics/decision-context');

test('audience read keeps missing data unknown and reads comparable 90-day trend',()=>{
  let c={coachOS:{analytics:{snapshots:[]}}};
  let r=A.audienceRead(c);
  assert.equal(r.acquisitionBand,'unknown');
  assert.equal(r.loyaltyBand,'unknown');
  c={coachOS:{analytics:{snapshots:[
    {period:'90d',date:'2026-03-31',newViewers:1000,casual:300,regular:100,returning:400,avgViewsPerViewer:1.3},
    {period:'90d',date:'2026-06-29',newViewers:800,casual:330,regular:120,returning:440,avgViewsPerViewer:1.5}
  ]}}};
  r=A.audienceRead(c);
  assert.equal(r.acquisitionBand,'weak');
  assert.equal(r.loyaltyKey,'repeat audience');
  assert.equal(r.loyaltyBand,'strong');
  assert.equal(r.depthBand,'strong');
});

test('baseline trajectory reads all saved checkpoint normals and growth from first version',()=>{
  const c={coachOS:{baseline:{
    sets:[
      {id:'b24',window:'_24h',confirmedComparable:true,engagedViews:1000},
      {id:'b7',window:'_7d',confirmedComparable:true,primary:true,engagedViews:12000}
    ],
    history:[{id:'b7',window:'_7d',confirmedComparable:true,engagedViews:9000,effectiveFrom:'2026-06-01'}]
  }}};
  const r=A.baselineTrajectory(c);
  assert.equal(r.find(x=>x.hours===24).current.engagedViews,1000);
  assert.ok(Math.abs(r.find(x=>x.hours===168).growth-4/3)<1e-9);
  assert.equal(r.find(x=>x.hours===48).current,null);
});

test('focus uses a real saved channel diagnosis before weaker fallback signals',()=>{
  const f=A.deriveFocus({
    diagnosis:{leading:'Packaging / click',confidence:'Medium'},
    pattern:{max:3,source:'hard',stages:['retention']},
    audience:{acquisitionBand:'weak',loyaltyBand:'strong'},
    trajectory:[]
  });
  assert.equal(f.focus,'Packaging / click');
  assert.equal(f.source,'channel diagnosis');
});

test('audience imbalance can choose acquisition or loyalty only when enough trend exists',()=>{
  let f=A.deriveFocus({diagnosis:{leading:'Not enough evidence yet'},pattern:{max:0},audience:{acquisitionBand:'weak',loyaltyBand:'strong'},trajectory:[]});
  assert.equal(f.focus,'Acquisition / gateway');
  f=A.deriveFocus({diagnosis:{leading:'Not enough evidence yet'},pattern:{max:0},audience:{acquisitionBand:'strong',loyaltyBand:'weak'},trajectory:[]});
  assert.equal(f.focus,'Loyalty / pathway');
});

test('channel prompt explicitly requests audience segments and preserves missing values',()=>{
  const p=A.channelPrompt({id:'c1',name:'Test Creator'});
  for(const term of ['engagedViews','casual','regular','returning','avgViewsPerViewer','observations'])assert.match(p,new RegExp(term));
  assert.match(p,/use null/i);
  assert.match(p,/Do not guess/i);
});

test('JSON block parser accepts fenced Ask Studio responses',()=>{
  const fence=String.fromCharCode(96,96,96),nl=String.fromCharCode(10);
  const x=A.parseJsonBlock(fence+'json'+nl+'{"schemaVersion":1,"channelPeriods":[]}'+nl+fence);
  assert.equal(x.schemaVersion,1);
});


test('plan suggestion maps channel focus into Reach Trust Convert and the right primary metric',()=>{
  let s=A.planSuggestion({focus:'Acquisition / gateway',action:{job:'Reach',video:'Build a qualified gateway',metric:'Engaged views + new viewers'}});
  assert.equal(s.job,'Reach');
  assert.equal(s.primaryMetricKey,'newViewers');
  assert.match(s.mix,/Reach/);

  s=A.planSuggestion({focus:'Loyalty / pathway',action:{job:'Trust',video:'Build the next obvious watch',metric:'Returning viewers'}});
  assert.equal(s.job,'Trust');
  assert.equal(s.primaryMetricKey,'returning');
  assert.match(s.success,/Regular|Returning/);

  s=A.planSuggestion({focus:'Promise / opening / viewing experience',action:{job:'Keep intended job',video:'Improve the opening',metric:'0:30 + APV/AVD'}});
  assert.equal(s.primaryMetricKey,'ret30');
  assert.match(s.success,/0:30/);
});


test('audience read combines Casual Regular and Returning instead of letting one segment stand in for Trust',()=>{
  const c={coachOS:{analytics:{snapshots:[
    {period:'90d',date:'2026-03-31',newViewers:100000,casual:50000,regular:10000,returning:60000,avgViewsPerViewer:1.4},
    {period:'90d',date:'2026-06-29',newViewers:200000,casual:40000,regular:7000,returning:45000,avgViewsPerViewer:1.1}
  ]}}};
  const r=A.audienceRead(c);
  assert.equal(r.loyaltyKey,'repeat audience');
  assert.equal(r.loyaltyBand,'weak');
  assert.equal(r.acquisitionBand,'strong');
  assert.equal(r.changes.casual,.8);
  assert.equal(r.changes.regular,.7);
  assert.equal(r.changes.returning,.75);
  assert.match(r.focus,/Trust/i);
});
