const {test}=require('node:test');
const assert=require('node:assert/strict');

function loadWithGuide(guide){
  const prior=globalThis.__acceleratorCoachGuide;
  globalThis.__acceleratorCoachGuide=guide||{};
  delete require.cache[require.resolve('../analytics/workflow-context')];
  const A=require('../analytics/workflow-context');
  return {A,restore:()=>{globalThis.__acceleratorCoachGuide=prior;}};
}

const read=(out,imp,ctrDelta,retDelta,opts={})=>({r:{comparisons:{
  engagedViews:{multiple:out,current:opts.engagedCurrent??1000,baseline:opts.engagedBase??1000},
  views:{multiple:out,current:opts.viewsCurrent??1000,baseline:opts.viewsBase??1000},
  impressions:{multiple:imp,current:opts.impCurrent??10000,baseline:opts.impBase??10000},
  ctr:{deltaPp:ctrDelta,current:(opts.ctrCurrent??5)/100,baseline:(opts.ctrBase??5)/100},
  retention30:{deltaPp:retDelta,current:(opts.retCurrent??65)/100,baseline:(opts.retBase??65)/100},
  apv:{deltaPp:opts.apvDelta??retDelta,current:(opts.apvCurrent??45)/100,baseline:(opts.apvBase??45)/100},
  avdSeconds:{multiple:opts.avdMultiple??1,deltaSeconds:(opts.avdCurrent??180)-(opts.avdBase??180),current:opts.avdCurrent??180,baseline:opts.avdBase??180}
}}});

function mocks(reads,audience={}){
  const W={clarityPattern:()=>({reads,max:reads.length>=3?3:reads.length,source:'hard',stages:['packaging'],label:'PACKAGING'})};
  const ADC={
    audienceRead:()=>({acquisitionBand:'unknown',loyaltyBand:'unknown',loyalty:null,loyaltyKey:null,current:{},previous:{},...audience}),
    overallRead:()=>({action:{job:'Keep intended job'},stages:[{key:'result',value:'Business result not connected yet'}]})
  };
  return {W,ADC};
}

test('each diagnosis question answers with the metric that question asks for',()=>{
  const {A,restore}=loadWithGuide({});
  try{
    const {W,ADC}=mocks([
      read(1,1,-1,0,{ctrCurrent:4,ctrBase:5}),
      read(1.1,1.05,-.8,1,{ctrCurrent:4.2,ctrBase:5}),
      read(.9,.95,-.7,-1,{ctrCurrent:4.3,ctrBase:5})
    ]);
    const q=A.questionAnswers({},W,ADC);
    assert.match(q.outcome.line,/usually gets/);
    assert.match(q.show.line,/usually gets/);
    assert.match(q.click.line,/CTR/);
    assert.match(q.click.line,/usual|normal/);
    assert.match(q.watch.line,/0:30/);
    assert.match(q.outcome.next,/SHOW|channel trend/i);
    assert.match(q.show.next,/CLICK/i);
  } finally {restore();}
});

test('diagnosis uses existing saved diagnosis metrics when strict analytics workspace read is unavailable',()=>{
  const guide={
    recentVideoRead:()=>({
      n:5,views:900,impressions:9000,ctr:4,ret30:60,apv:42,
      viewRatio:.9,impRatio:1,ctrRatio:.8,retRatio:.92
    }),
    jobScorecard:()=>[]
  };
  const {A,restore}=loadWithGuide(guide);
  try{
    const W={clarityPattern:()=>({reads:[],max:0,source:'hard',stages:[]})};
    const ADC={audienceRead:()=>({acquisitionBand:'unknown',loyaltyBand:'unknown',current:{},previous:{}}),overallRead:()=>({action:{job:'Keep intended job'},stages:[]})};
    const q=A.questionAnswers({},W,ADC);
    assert.equal(q.raw.sample,5);
    assert.equal(q.raw.outcome,.9);
    assert.equal(q.raw.show,1);
    assert.equal(q.raw.click.current,4);
    assert.equal(q.raw.click.baseline,5);
    assert.equal(q.raw.watch.current,60);
    assert.notEqual(q.click.label,'I can’t answer this yet');
    assert.notEqual(q.watch.label,'I can’t answer this yet');
    assert.equal(q.raw.sources.click,'saved channel diagnosis data');
  } finally {restore();}
});

test('soft metric clues do not automatically become the channel bottleneck',()=>{
  const guide={
    recentVideoRead:()=>({n:5,views:900,impressions:9000,ctr:4,ret30:60,viewRatio:.9,impRatio:1,ctrRatio:.8,retRatio:.92}),
    jobScorecard:()=>[]
  };
  const {A,restore}=loadWithGuide(guide);
  try{
    const W={clarityPattern:()=>({reads:[],max:0,source:'hard',stages:[]})};
    const ADC={audienceRead:()=>({acquisitionBand:'unknown',loyaltyBand:'unknown',current:{},previous:{}}),overallRead:()=>({action:{job:'Keep intended job'},stages:[]})};
    const q=A.questionAnswers({},W,ADC);
    assert.equal(q.click.tone,'warn');
    assert.match(q.click.label,/below normal/i);
    const p=A.proposal({},W,ADC);
    assert.notEqual(p.leading,'Packaging / click');
  } finally {restore();}
});

test('first clear unusual stage wins the working diagnosis',()=>{
  const {A,restore}=loadWithGuide({});
  try{
    let m=mocks([
      read(.5,.5,-2,-8,{ctrCurrent:3,ctrBase:5,retCurrent:50,retBase:65}),
      read(.6,.6,-2,-7,{ctrCurrent:3,ctrBase:5,retCurrent:52,retBase:65}),
      read(.55,.5,-2,-9,{ctrCurrent:3,ctrBase:5,retCurrent:49,retBase:65})
    ]);
    assert.equal(A.proposal({},m.W,m.ADC).leading,'Topic / Reach');

    m=mocks([
      read(.9,1,-2,0,{ctrCurrent:3,ctrBase:5}),
      read(1,1.1,-2,0,{ctrCurrent:3,ctrBase:5}),
      read(1.05,.9,-2,1,{ctrCurrent:3,ctrBase:5})
    ]);
    assert.equal(A.proposal({},m.W,m.ADC).leading,'Packaging / click');

    m=mocks([
      read(.9,1,0,-20,{retCurrent:45,retBase:65}),
      read(1,1.1,.2,-18,{retCurrent:47,retBase:65}),
      read(1.05,.9,0,-19,{retCurrent:46,retBase:65})
    ]);
    assert.equal(A.proposal({},m.W,m.ADC).leading,'Promise / opening / viewing experience');
  } finally {restore();}
});

test('audience trend informs Reach vs Trust only after earlier video funnel stages are not clearly broken',()=>{
  const {A,restore}=loadWithGuide({jobScorecard:()=>[]});
  try{
    const m=mocks(
      [
        read(1,1,0,0),
        read(1.05,1.1,.1,1),
        read(.95,.9,-.1,-1)
      ],
      {
        acquisitionBand:'weak',loyaltyBand:'strong',loyalty:1.2,loyaltyKey:'regular',
        current:{newViewers:800,casual:330,regular:120,returning:440},
        previous:{newViewers:1000,casual:300,regular:100,returning:400}
      }
    );
    const p=A.proposal({},m.W,m.ADC);
    assert.equal(p.leading,'Reach / getting new viewers in');
    assert.equal(p.jobFocus,'Reach');
    assert.match(p.q.returnResult.meaning,/Reach/i);
  } finally {restore();}
});

test('RETURN + RESULT includes Reach Trust Convert job evidence when available',()=>{
  const guide={jobScorecard:()=>[
    {job:'Reach',n:5,viewRatio:.9},
    {job:'Trust',n:4,viewRatio:1.2},
    {job:'Convert',n:3,viewRatio:.8,yield:2.4}
  ]};
  const {A,restore}=loadWithGuide(guide);
  try{
    const m=mocks([],{
      acquisitionBand:'steady',loyaltyBand:'strong',loyalty:1.15,loyaltyKey:'regular',
      current:{newViewers:1000,casual:400,regular:230,returning:600},
      previous:{newViewers:980,casual:380,regular:200,returning:550}
    });
    const q=A.questionAnswers({},m.W,m.ADC);
    assert.match(q.returnResult.line,/Reach/);
    assert.match(q.returnResult.line,/Trust/);
    assert.match(q.returnResult.line,/Convert/);
    assert.match(q.returnResult.line,/leads \/ 1K views/);
  } finally {restore();}
});

test('missing metric tells the coach exactly what is missing instead of generic Need data',()=>{
  const {A,restore}=loadWithGuide({});
  try{
    const W={clarityPattern:()=>({reads:[],max:0,source:'hard',stages:[]})};
    const ADC={audienceRead:()=>({acquisitionBand:'unknown',loyaltyBand:'unknown',current:{},previous:{}}),overallRead:()=>({action:{job:'Keep intended job'},stages:[]})};
    const q=A.questionAnswers({},W,ADC);
    assert.match(q.click.label,/Not enough data/i);
    assert.match(q.click.line,/CTR/i);
    assert.match(q.click.next,/7-day CTR normal/i);
    assert.match(q.watch.line,/retention|APV/i);
  } finally {restore();}
});


test('Question 5 uses 0:30 APV and AVD together',()=>{
  const {A,restore}=loadWithGuide({});
  try{
    const {W,ADC}=mocks([
      read(.9,1,0,-15,{retCurrent:55,retBase:70,apvCurrent:35,apvBase:45,avdCurrent:300,avdBase:420,avdMultiple:.714}),
      read(.9,1,0,-15,{retCurrent:55,retBase:70,apvCurrent:35,apvBase:45,avdCurrent:300,avdBase:420,avdMultiple:.714})
    ]);
    const s=A.diagnosisQuestionSupport({},W,ADC,4);
    assert.equal(s.tone,'bad');
    assert.match(s.verdict,/lean NO/i);
    assert.deepEqual(s.metrics.map(x=>x.label),['First 30 sec','APV','AVD']);
    assert.match(s.metrics[0].compare,/70.0%/);
    assert.match(s.metrics[2].compare,/420 sec/);
  } finally {restore();}
});

test('Question 6 reads New Casual Regular Returning and average views per viewer without treating them as a funnel',()=>{
  const {A,restore}=loadWithGuide({});
  try{
    const {W,ADC}=mocks([],{
      hasComparison:true,acquisition:2,acquisitionBand:'strong',loyalty:.75,loyaltyBand:'weak',depth:.79,depthBand:'weak',
      current:{newViewers:200000,casual:40000,regular:7000,returning:45000,avgViewsPerViewer:1.1},
      previous:{newViewers:100000,casual:50000,regular:10000,returning:60000,avgViewsPerViewer:1.4}
    });
    const s=A.diagnosisQuestionSupport({},W,ADC,5);
    assert.equal(s.tone,'bad');
    assert.match(s.verdict,/repeat viewing is weakening/i);
    assert.deepEqual(s.metrics.map(x=>x.label),['New','Casual','Regular','Returning','Avg views / viewer']);
    assert.match(s.note,/not.*person-by-person conversion path/i);
  } finally {restore();}
});
