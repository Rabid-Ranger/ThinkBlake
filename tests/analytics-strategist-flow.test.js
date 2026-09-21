const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../analytics/decision-context');
const C=require('../analytics/clarity');

function workspaceFor(){
  return {
    prefs:()=>({hours:168,videoId:'v1'}),
    videos:()=>[{id:'v1',engineId:'v1',title:'Video 1'}],
    baselines:(c,h)=>[{id:'p'+h,label:h+' baseline',engine:{format:'edited-long-form',eraId:'current',definitionId:'def',traffic:'all',paid:'unknown'}}],
    values:x=>x
  };
}
function creator(){
  const metric=(median,n=10)=>({median,n});
  const baselines=[24,48,168,672].map(h=>({
    policyId:'p'+h,kind:'operating',memberVideoIds:Array.from({length:10},(_,i)=>'v'+i),
    metrics:{
      views:metric(1000+h),engagedViews:metric(900+h),impressions:metric(10000+h),
      ctr:metric(.07),retention30:metric(.65),apv:metric(.42),avdSeconds:metric(240),
      browsePct:metric(.5),suggestedPct:metric(.25),searchPct:metric(.15),externalPct:metric(.1)
    }
  }));
  const observations=[24,48,168,672].map(h=>({videoId:'v1',windowHours:h,format:'edited-long-form',eraId:'current',definitionId:'def',traffic:'all',paid:'unknown'}));
  return {id:'c1',analyticsFoundation:{baselines,observations},coachOS:{baseline:{context:{channelGoal:'Grow qualified audience',desiredAudience:'Owners'},sets:[]},plan90:{outcome:'Grow qualified audience',primaryMetric:'New viewers'}}};
}

test('normals at a glance shows every historical metric and checkpoint tabs',()=>{
  const c=creator(),W=workspaceFor();
  const html=D.normalsAtGlance(c,W);
  for(const label of ['Views · new count','Engaged views · original count','Impressions','CTR','First 30 sec','APV','AVD','Browse','Suggested','Search','External']) assert.ok(html.includes(label),label);
  for(const label of ['>24h<','>48h<','>7d<','>28d<']) assert.ok(html.includes(label),label);
  assert.match(html,/CHANNEL TRACKING/);
  assert.match(html,/90-day progress/);
  assert.match(html,/does not set the 24h \/ 48h \/ 7d \/ 28d video normal/);
});

test('baseline detail keeps metric-specific sample sizes',()=>{
  const c=creator(),W=workspaceFor(),d=D.baselineDetail(c,W,168);
  assert.equal(d.values.impressions,10168);
  assert.equal(d.values.retention30,.65);
  assert.equal(d.samples.views,10);
  assert.equal(d.samples.externalPct,10);
});

test('strategist UI is wired for Reach Trust Convert and coach instructions',()=>{
  const src=C.install.toString()+C.strategistRead.toString();
  assert.match(src,/data-ac-job-select/);
  assert.match(src,/This video’s job is to bring in more of the right new viewers/i);
  assert.match(src,/This video’s job is to help the right viewer stay/i);
  assert.match(src,/This video’s job is to turn the right viewer/i);
  assert.match(src,/COACH NEXT MOVE/);
  assert.match(src,/MEASURE/);
  assert.match(src,/PROTECT/);
  assert.match(src,/Assign the video as Reach, Trust, or Convert/i);
});

test('audience read turns current segment movement into a coach action',()=>{
  const a=D.audienceRead({coachOS:{analytics:{audienceSnapshots:[
    {asOf:'2026-08-18',newViewers:100000,casual:50000,regular:10000,returning:60000,avgViewsPerViewer:1.4},
    {asOf:'2026-09-15',newViewers:130000,casual:35000,regular:7000,returning:42000,avgViewsPerViewer:1.1}
  ]}}});
  const read=D.audienceCoachRead(a);
  assert.match(read.headline,/New-viewer growth is stronger than repeat viewing/i);
  assert.match(read.meaning,/Trust \/ follow-up/i);
  assert.match(read.action,/Protect the Reach video/i);
  assert.match(read.action,/follow-up|bridge/i);
});

test('channel health synthesizes attention up plus return down into bridge pressure',()=>{
  const c={coachOS:{analytics:{
    snapshots:[
      {period:'90d',date:'2026-06-19',periodStart:'2026-03-22T00:00:00Z',periodEndExclusive:'2026-06-20T00:00:00Z',sourceRef:'Studio',metricDefinitionId:'unknown',impressions:4000000,watchTime:20000},
      {period:'90d',date:'2026-09-17',periodStart:'2026-06-20T00:00:00Z',periodEndExclusive:'2026-09-18T00:00:00Z',sourceRef:'Studio',metricDefinitionId:'unknown',impressions:6800000,watchTime:55000}
    ],
    audienceSnapshots:[
      {asOf:'2026-08-18',newViewers:370000,casual:145000,regular:6600},
      {asOf:'2026-09-15',newViewers:230000,casual:53000,regular:2700}
    ]
  }}};
  const a=D.audienceRead(c),stages=D.channelStages(c,a),read=D.channelHealthRead(c,stages,a);
  assert.match(read.headline,/Reach\/views grew, but fewer viewers are coming back/i);
  assert.match(read.meaning,/bridge into the next useful video/i);
  assert.match(read.action,/Protect the topics and packages creating reach/i);
  assert.match(read.protect,/New-upload vs older-library contribution is missing/i);
});

test('strategist UI protects a winner and carries the soft lesson forward',()=>{
  const src=C.install.toString()+C.strategistRead.toString();
  assert.match(src,/d\.winner&&soft\.length/);
  assert.match(src,/learning \/ efficiency lane, not a reason to rescue a winning video/i);
  assert.match(src,/Do not panic-change the winning video/i);
  assert.match(src,/business RESULT still decides/i);
});


test('checkpoint-specific coaching keeps 24h 48h 7d and 28d decisions distinct',()=>{
  const src=C.install.toString()+C.strategistRead.toString();
  assert.match(src,/h===24/);
  assert.match(src,/Do not make a major creator-strategy decision from the first day/i);
  assert.match(src,/h===48/);
  assert.match(src,/decide what deserves investigation, not to rewrite the whole channel strategy/i);
  assert.match(src,/h===672/);
  assert.match(src,/28-day what-to-make-next read/i);
  assert.match(src,/what to make next/i);
});

test('manual baseline validation follows the coach-assigned video job',()=>{
  const W=require('../analytics/workspace');
  const c={
    id:'c1',
    coachOS:{analytics:{videoJobs:{v1:'Trust'}}},
    videos:[{id:'v1',title:'Video 1',analytics:{_7d:{views:1000,impressions:10000,ctr:5,ret30:60,apv:40,avdSeconds:200,metricDefinitionId:'def',sourceRef:'Studio',windowVerified:true}}}],
    analyticsFoundation:{observations:[]}
  };
  const v=W.videos(c)[0];
  const make=job=>({label:job+' normal',manual:{job,n:10,confirmedComparable:true,sourceRef:'Studio baseline',metricDefinitionId:'def',views:900,impressions:9000,ctr:5,ret30:60,apv:40,avdSeconds:200}});
  const trust=W.compare(c,v,make('Trust'),168);
  assert.equal(trust.reasons.includes('This video has a different job than the videos used for this normal.'),false);
  const reach=W.compare(c,v,make('Reach'),168);
  assert.equal(reach.reasons.includes('This video has a different job than the videos used for this normal.'),true);
});
