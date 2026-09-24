const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../analytics/decision-context');

const clarity=fs.readFileSync(path.join(__dirname,'../analytics/clarity.js'),'utf8');
const page=fs.readFileSync(path.join(__dirname,'../analytics/page.js'),'utf8');
const live=fs.readFileSync(path.join(__dirname,'../analytics/live.js'),'utf8');
const decision=fs.readFileSync(path.join(__dirname,'../analytics/decision-context.js'),'utf8');

test('master Studio prompt asks for enough comparable rows and explains missing fields',()=>{
  const p=D.masterPrompt({id:'c1',name:'Creator'});
  assert.match(p,/Do NOT stop at five/i);
  assert.match(p,/fewer than 10 previous comparable rows/i);
  assert.match(p,/identify the missing metric\/report in limitations/i);
  for(const metric of ['views','engagedViews','retention30','browsePct','suggestedPct','searchPct','externalPct']){
    assert.ok(p.includes(metric),metric);
  }
});

test('missing-data workflow covers video audience and channel gaps without rendering on the main read',()=>{
  assert.match(decision,/Missing Data Checklist/);
  assert.match(decision,/Video checkpoint gaps/);
  assert.match(decision,/Audience snapshot gaps/);
  assert.match(decision,/Channel \/ business gaps/);
  assert.match(decision,/Where do I find this\?/);
  assert.match(decision,/data-adc-fill-checkpoint/);
  assert.match(decision,/Average views \/ viewer/);
  assert.doesNotMatch(decision,/normalsAtGlance\(c,W\)\+\s*missingDataHtml\(c,W\)\+/);
  assert.doesNotMatch(decision,/Missing verified data\?/);
});

test('manual video editor can fill metrics plus checkpoint verification context',()=>{
  for(const id of ['acm-views','acm-engaged','acm-impressions','acm-ctr','acm-ret30','acm-apv','acm-avd','acm-browse','acm-suggested','acm-search','acm-external','acm-definition','acm-coverage','acm-paid']){
    assert.ok(clarity.includes(id),id);
  }
  assert.match(clarity,/AcceleratorAnalyticsManual=\{openCheckpoint:openManualEditorFor\}/);
});

test('dated audience snapshots can be edited independently of 90-day channel periods',()=>{
  for(const id of ['cg-aud-date','cg-aud-monthly','cg-aud-new','cg-aud-casual','cg-aud-regular','cg-aud-returning','cg-aud-avpv']){
    assert.ok(page.includes(id),id);
  }
  assert.match(page,/analytics-audience-edit:/);
  assert.match(page,/analytics-audience-save/);
});

test('import completion screen makes missing rows directly editable',()=>{
  assert.match(live,/Start here:/);
  assert.match(live,/Video checkpoints/);
  assert.match(live,/Complete Missing Data/);
  assert.match(live,/data-studio="missing-video"/);
  assert.match(live,/data-studio="missing-audience"/);
  assert.match(live,/data-studio="missing-channel"/);
  assert.match(live,/AcceleratorAnalyticsManual\?\.openCheckpoint/);
  assert.match(live,/AcceleratorAnalyticsManualData\?\.audience/);
  assert.match(live,/AcceleratorAnalyticsManualData\?\.channel/);
  assert.match(live,/Keep unavailable fields blank/);
});

test('missing data stays in the import workflow without another main-page checklist',()=>{
  assert.match(live,/if\(completion\?\.total\)\{return open\('Results saved'/);
  assert.match(live,/openMissing/);
});

test('manual page editors are exposed for direct workflow handoff',()=>{
  assert.match(page,/AcceleratorAnalyticsManualData=\{channel:analyticsSnapshot,audience:analyticsAudienceSnapshot\}/);
});

test('missing audience and channel rows are deduplicated before rendering',()=>{
  assert.match(decision,/const audMap=new Map\(\)/);
  assert.match(decision,/const chMap=new Map\(\)/);
});


test('manual saves return to the active import completion flow',()=>{
  assert.match(clarity,/AcceleratorLiveAnalytics\?\.openMissing\?\.\(\)/);
  assert.match(page,/function finishAnalyticsManualFlow\(\)/);
  assert.match(page,/AcceleratorLiveAnalytics\?\.openMissing\?\.\(\)/);
});


test('baseline coverage target matches the 15-video prompt cohort',()=>{
  assert.match(decision,/Math\.max\(0,15-sample\)/);
  assert.match(decision,/Aim for 15/);
});


test('missing-data checklist does not treat optional metadata as an actionable gap',()=>{
  assert.doesNotMatch(decision,/Measurement definition is unverified/);
  assert.doesNotMatch(decision,/Organic \/ paid context is unverified/);
  assert.match(decision,/optional library-split context do not make the checkpoint incomplete/);
});


test('90-day optional library splits do not create required channel gaps',()=>{
  const block=decision.slice(decision.indexOf('const CHANNEL_COMPLETION_FIELDS'),decision.indexOf('function latestCheckpointRows'));
  assert.doesNotMatch(block,/uploadsPublished|newUploadViews|libraryViews/);
  assert.doesNotMatch(decision,/Organic \/ paid context is unverified/);
});
