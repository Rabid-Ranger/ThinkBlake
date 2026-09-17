const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../analytics/program-bridge');

test('maps analytics evidence into program diagnosis, programming, and tracking',()=>{
  const creator={
    id:'c',
    analyticsFoundation:{
      policies:[{id:'p',windowHours:168,refreshAfter:4}],
      baselines:[{policyId:'p',kind:'operating',builtAt:'2026-09-01T00:00:00Z',memberVideoIds:['1','2','3','4','5','6','7','8','9','10'],metrics:{views:{n:10}}}],
      events:[{kind:'eligible_video',policyId:'p',active:true}]
    },
    coachOS:{analytics:{audienceSnapshots:[{asOf:'2026-08-01'},{asOf:'2026-09-01'}]}}
  };
  const W={
    baselines:()=>[{id:'p',label:'7d',engine:{}}],
    clarityPattern:()=>({n:4,max:2}),
    channel:()=>({comparable:true,current:{date:'2026-09-01',qualifiedLeads:10},rows:[{},{}]})
  };
  const ADC={overallRead:()=>({focus:'Packaging',confidence:'Medium',why:['CTR is soft'],action:{job:'Reach',metric:'CTR',video:'Test a clearer promise'}})};
  const WF={proposal:()=>({leading:'Packaging',because:'CTR repeats below normal',next:'Test a clearer promise',confidence:'Medium',jobFocus:'Reach'})};
  const r=P.programRead(creator,W,ADC,WF,{});
  assert.equal(r.focus,'Packaging');
  assert.equal(r.job,'Reach');
  assert.equal(r.baseline.n,10);
  assert.equal(r.refresh.pending,1);
  assert.equal(r.channel.comparable,true);
  assert.equal(r.result.available,true);
  const html=P.render(creator,W,ADC,WF,{});
  assert.match(html,/Evidence → Diagnosis → Plan → Track/);
  assert.match(html,/4 videos \/ ~30 days/);
  assert.match(html,/Open Diagnosis/);
  assert.match(html,/7-day creator normal/);
});

test('shows missing program evidence instead of forcing a bottleneck',()=>{
  const creator={id:'c',analyticsFoundation:{policies:[],baselines:[],events:[]},coachOS:{analytics:{audienceSnapshots:[]}}};
  const W={baselines:()=>[],clarityPattern:()=>({n:0,max:0}),channel:()=>({comparable:false,current:{},rows:[]})};
  const r=P.programRead(creator,W,{},null,{});
  assert.equal(r.baseline.level,'Missing');
  assert.equal(r.result.available,false);
  assert.ok(r.checks.some(x=>/7-day normal/i.test(x)));
  assert.ok(r.checks.some(x=>/90-day channel report/i.test(x)));
  assert.ok(r.checks.some(x=>/RESULT/i.test(x)));
});

test('renames checkpoints to the program language without stripping rich content',()=>{
  const source='<button>24 hours</button><button>48 hours</button><button>7 days</button><button>28 days · optional</button><div class="keep-me">Rich analytics</div>';
  const out=P.phaseLabels(source);
  assert.match(out,/24h · Launch/);
  assert.match(out,/48h · Triage/);
  assert.match(out,/7d · Diagnosis/);
  assert.match(out,/28d · Programming/);
  assert.match(out,/keep-me/);
  assert.doesNotMatch(out,/optional/i);
});
