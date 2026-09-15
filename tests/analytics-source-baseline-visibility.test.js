const {test}=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../analytics/engine');
const Import=require('../analytics/import');
const Decision=require('../analytics/decision-context');
const Workflow=require('../analytics/workflow-context');

const creator={id:'c',name:'QA Creator'};
const day=86400000;
const base=Date.parse('2026-01-01T12:00:00Z');

function observation(i,{hours=168,title='Video '+i,apv=50,avd=300,views=1000,browse=50,suggested=25,search=15,external=5,videoId='v'+i}={}){
  return {
    videoId,title,publishedAt:new Date(base+i*day).toISOString(),
    capturedAt:new Date(base+i*day+hours*3600000).toISOString(),
    windowHours:hours,format:'long',eraId:'a',
    definitionId:'youtube-views-playback-start-2026-08-24+engaged-views-original',
    coverage:'exact',paid:'organic',traffic:'all',source:'Studio exact checkpoint',
    metrics:{views,engagedViews:null,impressions:10000,ctr:6,retention30:null,apv,avdSeconds:avd,browsePct:browse,suggestedPct:suggested,searchPct:search,externalPct:external}
  };
}

test('Studio prompts request both view counts, exact retention when available, and per-video source mix',()=>{
  const p=Import.prompt(creator,168);
  assert.match(p,/Advanced Mode for Engaged views/i);
  assert.match(p,/Do NOT claim Engaged views is Shorts-only/i);
  assert.match(p,/Key moments \/ Intro \/ first-30-second/i);
  for(const term of ['Browse %','Suggested %','Search %','External %'])assert.match(p,new RegExp(term));
  assert.match(p,/definitionId.*measurement method/i);
});

test('Everything prompt keeps 90-day channel and 28-day audience in separate objects',()=>{
  const p=Decision.masterPrompt(creator);
  assert.match(p,/PART 3 — 28-DAY AUDIENCE SNAPSHOTS/);
  assert.match(p,/Do not put New \/ Casual \/ Regular \/ Returning into the 90-day channelPeriods/i);
  assert.match(p,/audienceSnapshots/);
  assert.match(p,/monthlyAudience/);
  assert.match(p,/Advanced Mode for Engaged views/i);
});

test('import accepts per-video source mix and separate 28-day audience snapshots',()=>{
  const payload=JSON.stringify({
    schemaVersion:1,creatorId:'c',channelName:'QA',
    observations:[observation(0)],
    channelPeriods:[{
      start:'2025-10-01',end:'2025-12-29',source:'Studio 90d',metricDefinitionId:'studio-current',
      metrics:{views:10000,impressions:100000,ctr:5.5,browsePct:45,suggestedPct:30,searchPct:15,externalPct:5}
    }],
    audienceSnapshots:[
      {asOf:'2025-12-01',windowDays:28,source:'Studio Monthly audience',metrics:{monthlyAudience:9000,newViewers:6000,casual:1800,regular:700,returning:2500,avgViewsPerViewer:1.6}},
      {asOf:'2025-12-29',windowDays:28,source:'Studio Monthly audience',metrics:{monthlyAudience:10000,newViewers:6500,casual:2100,regular:850,returning:2900,avgViewsPerViewer:1.7}}
    ],
    limitations:['Engaged Views are only tracked and reported for Shorts formats in YouTube Studio.']
  });
  const out=Import.parse(payload,creator,Engine.emptyStore(),'2026-02-01T00:00:00Z');
  assert.equal(out.next.observations[0].metrics.browsePct,.5);
  assert.equal(out.next.observations[0].metrics.suggestedPct,.25);
  assert.equal(out.audienceSnapshots.length,2);
  assert.equal(out.audienceSnapshots[1].metrics.regular,850);
  assert.match(out.limitations.join(' '),/YouTube retains Engaged views in Advanced Mode/i);
  assert.doesNotMatch(out.limitations.join(' '),/only tracked and reported for Shorts/i);
});

test('retention evidence can use Views for playback volume when Engaged views is unavailable',()=>{
  const rows=Array.from({length:5},(_,i)=>observation(i,{views:1000+i*50,apv:50,avd:300}));
  let parsed=Import.parse(JSON.stringify({schemaVersion:1,creatorId:'c',channelName:'QA',observations:rows}),creator,Engine.emptyStore(),'2026-01-15T00:00:00Z');
  const target=observation(10,{videoId:'target',title:'Target',views:1800,apv:20,avd:100});
  parsed=Import.parse(JSON.stringify({schemaVersion:1,creatorId:'c',channelName:'QA',observations:[target]}),creator,parsed.next,'2026-02-01T00:00:00Z');
  const policy=parsed.next.policies.find(x=>x.windowHours===168);
  assert.ok(policy);
  const cmp=Engine.compareVideo(parsed.next,{videoId:'target',policyId:policy.id,windowHours:168,asOf:'2026-02-01T00:00:00Z'});
  assert.equal(cmp.evidence.targetEngagedViews,null);
  assert.equal(cmp.evidence.targetViewingCount,1800);
  assert.equal(cmp.evidence.viewingCountSource,'views');
  assert.equal(cmp.evidence.cautions.some(x=>/not enough playback volume/i.test(x)),false);
  assert.equal(cmp.findings.some(x=>x.stage==='experience'),true);
});

test('audience read prefers dedicated 28-day snapshots over legacy 90-day audience fields',()=>{
  const c={coachOS:{analytics:{
    snapshots:[
      {period:'90d',date:'2025-12-01',newViewers:100,casual:100,regular:100,returning:100},
      {period:'90d',date:'2025-12-29',newViewers:1000,casual:1000,regular:1000,returning:1000}
    ],
    audienceSnapshots:[
      {asOf:'2025-12-01',newViewers:1000,casual:500,regular:100,returning:600,avgViewsPerViewer:1.5},
      {asOf:'2025-12-29',newViewers:800,casual:550,regular:120,returning:650,avgViewsPerViewer:1.6}
    ]
  }}};
  const r=Decision.audienceRead(c);
  assert.equal(r.legacyWindow,false);
  assert.equal(r.current.newViewers,800);
  assert.equal(r.acquisitionBand,'weak');
  assert.equal(r.loyaltyBand,'strong');
  assert.match(r.sourceWindow,/28-day/);
});

test('Question 1 uses 90-day upload output while Question 6 uses 28-day audience data',()=>{
  const c={coachOS:{analytics:{
    snapshots:[
      {period:'90d',date:'2025-12-01',uploadsPublished:6},
      {period:'90d',date:'2025-12-29',uploadsPublished:12}
    ],
    audienceSnapshots:[
      {asOf:'2025-12-01',newViewers:1000,casual:500,regular:100,returning:600},
      {asOf:'2025-12-29',newViewers:1200,casual:400,regular:75,returning:450}
    ]
  }}};
  const W={clarityPattern:()=>({reads:[],max:0,source:'hard',stages:[]})};
  const ADC={
    audienceRead:Decision.audienceRead,
    overallRead:()=>({action:{job:'Keep intended job'},stages:[{key:'result',value:'Business result not connected yet'}]})
  };
  const q1=Workflow.diagnosisQuestionSupport(c,W,ADC,0);
  assert.match(q1.line,/12 long-form uploads/i);
  assert.match(q1.line,/6 in the prior 90 days/i);
  const q6=Workflow.diagnosisQuestionSupport(c,W,ADC,5);
  assert.match(q6.verdict,/repeat viewing is weakening/i);
  assert.deepEqual(q6.metrics.map(x=>x.label),['New','Casual','Regular','Returning','Avg views / viewer']);
});
