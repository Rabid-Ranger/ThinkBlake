const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('../analytics/streamline');

test('shows x-normal plus percent / pp / seconds',()=>{
  assert.equal(S.metricDiff({multiple:1.2,relativeChangePct:20},'count'),'1.20× normal · +20%');
  assert.equal(S.metricDiff({multiple:1.2,deltaPp:1.2},'rate'),'1.20× normal · +1.2 pp');
  assert.equal(S.metricDiff({multiple:.8,deltaSeconds:-24},'seconds'),'0.80× normal · -24 sec');
});

test('legacy engine baselines tolerate missing newer metric objects',()=>{
  const W={values:()=>({})};
  const c={analyticsFoundation:{baselines:[{policyId:'p',kind:'operating',memberVideoIds:['a','b'],metrics:{views:{median:1000,n:2},ctr:{median:.05,n:2}}}]}};
  const r=S.baselineRecord(c,{id:'p',engine:{}},W);
  assert.equal(r.values.views,1000);
  assert.equal(r.values.ctr,.05);
  assert.equal(r.values.avdSeconds,null);
  assert.equal(r.values.engagedViews,null);
});

test('main flow uses Launch, Triage, Diagnosis, Programming and hides optional wording',()=>{
  const creator={id:'c',videos:[{id:'v',title:'Target'}],coachOS:{baseline:{sets:[],history:[]},analytics:{snapshots:[]}}};
  const p={mode:'video',hours:168,videoId:'v',baselineId:''};
  const W={
    prefs:()=>p,
    videos:()=>[{id:'v',title:'Target',native:creator.videos[0]}],
    baselines:()=>[],values:()=>({}),
    compare:()=>({status:'needs_evidence',comparisons:{},message:'Need a baseline'}),
    clarityDiagnose:()=>({tone:'muted',headline:'Not enough data yet.',bottleneck:'NOT ENOUGH DATA YET',explain:'Need a baseline',next:'Build the normal first.',metrics:{outcomeKey:'views',outcome:{},show:{},click:{},watchKey:'retention30',watch:{}}}),
    clarityPattern:()=>({n:0,max:0,confidence:'Nothing repeating yet',explain:'No reads yet',next:'Get 7-day reads',reads:[]}),
    clarityMatchingBaseline:()=>null,
    channel:()=>({starting:{},current:{},comparable:false})
  };
  const ADC={overallRead:()=>({focus:'No clear channel problem yet',confidence:'Low',source:'not enough repeated data yet',why:[],action:{video:'Collect fair comparisons.',job:'Use the video job',metric:'7-day result'},stages:[],audience:{}})};
  const html=S.renderBody(creator,W,ADC,{});
  assert.match(html,/<b>24h<\/b><span>Launch<\/span>/);
  assert.match(html,/<b>48h<\/b><span>Triage<\/span>/);
  assert.match(html,/<b>7d<\/b><span>Diagnosis<\/span>/);
  assert.match(html,/<b>28d<\/b><span>Programming<\/span>/);
  assert.doesNotMatch(html,/optional/i);
});

test('empty creator state renders without throwing',()=>{
  const p={mode:'video',hours:168,videoId:'',baselineId:''};
  const W={prefs:()=>p,videos:()=>[],baselines:()=>[],values:()=>({}),clarityPattern:()=>({n:0,max:0,reads:[]}),channel:()=>({starting:{},current:{},comparable:false})};
  const ADC={overallRead:()=>({focus:'No clear channel problem yet',confidence:'Low',source:'none',why:[],action:{video:'Collect data',job:'Any',metric:'—'},stages:[],audience:{}})};
  const html=S.renderBody({id:'x',videos:[],coachOS:{baseline:{sets:[]},analytics:{snapshots:[]}}},W,ADC,{});
  assert.match(html,/Add or import a video first/);
  assert.match(html,/No videos yet/);
});
