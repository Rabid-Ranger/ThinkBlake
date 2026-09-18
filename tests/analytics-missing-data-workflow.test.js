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

test('persistent missing-data checklist covers video audience and channel gaps',()=>{
  assert.match(decision,/Missing Data Checklist/);
  assert.match(decision,/Video checkpoint gaps/);
  assert.match(decision,/Audience snapshot gaps/);
  assert.match(decision,/Channel \/ business gaps/);
  assert.match(decision,/Where do I find this\?/);
  assert.match(decision,/data-adc-fill-checkpoint/);
  assert.match(decision,/Average views \/ viewer/);
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

test('import completion screen points coach to exact missing data checklist',()=>{
  assert.match(live,/Missing Data Checklist/);
  assert.match(live,/Video checkpoint gaps/);
  assert.match(live,/Open Missing Data Checklist/);
  assert.match(live,/Nothing missing is estimated/);
});
