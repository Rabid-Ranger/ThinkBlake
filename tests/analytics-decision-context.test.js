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
  assert.equal(r.loyaltyKey,'regular');
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
  const x=A.parseJsonBlock('\\`\\`\\`json\n{"schemaVersion":1,"channelPeriods":[]}\n\\`\\`\\`');
  assert.equal(x.schemaVersion,1);
});
