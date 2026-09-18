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
  assert.match(html,/90d progress · channel/);
  assert.match(html,/Whole-channel progress, not a per-video baseline/);
});

test('baseline detail keeps metric-specific sample sizes',()=>{
  const c=creator(),W=workspaceFor(),d=D.baselineDetail(c,W,168);
  assert.equal(d.values.impressions,10168);
  assert.equal(d.values.retention30,.65);
  assert.equal(d.samples.views,10);
  assert.equal(d.samples.externalPct,10);
});

test('strategist UI is wired for Reach Trust Convert and coach instructions',()=>{
  const src=C.install.toString();
  assert.match(src,/data-ac-job-select/);
  assert.match(src,/This is an acquisition rep for the program/i);
  assert.match(src,/This is a depth \/ return rep for the program/i);
  assert.match(src,/This is an action rep for the program/i);
  assert.match(src,/COACH NEXT MOVE/);
  assert.match(src,/MEASURE/);
  assert.match(src,/PROTECT/);
  assert.match(src,/Assign the video as Reach, Trust, or Convert/i);
});