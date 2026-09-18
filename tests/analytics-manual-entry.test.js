const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../analytics/decision-context');
const I=require('../analytics/import');

const page=fs.readFileSync(path.join(__dirname,'../analytics/page.js'),'utf8');
const clarity=fs.readFileSync(path.join(__dirname,'../analytics/clarity.js'),'utf8');
const decision=fs.readFileSync(path.join(__dirname,'../analytics/decision-context.js'),'utf8');

test('studio prompts require strict parseable json and exact checkpoint fields',()=>{
  const c={id:'c_test',name:'Test Creator'};
  const video=I.prompt(c,168);
  const all=D.masterPrompt(c);
  for(const prompt of [video,all]){
    assert.match(prompt,/STRICT JSON OUTPUT/i);
    assert.match(prompt,/parse with JSON\.parse/i);
    assert.match(prompt,/NO backslash characters before them/i);
    assert.match(prompt,/Do not append .*SVG/i);
  }
  for(const field of ['views','engagedViews','impressions','ctr','retention30','apv','avdSeconds','browsePct','suggestedPct','searchPct','externalPct']){
    assert.ok(all.includes(field),field);
  }
  assert.match(all,/NEWEST eligible current-era long-form upload/i);
  assert.match(all,/latest fully processed rolling 28-day Monthly audience snapshot/i);
});

test('manual video checkpoint editor exposes every missing video field',()=>{
  for(const id of ['acm-views','acm-engaged','acm-impressions','acm-ctr','acm-ret30','acm-apv','acm-avd','acm-browse','acm-suggested','acm-search','acm-external']){
    assert.ok(clarity.includes(id),id);
  }
  assert.match(clarity,/creates a revised checkpoint and keeps the earlier import history/i);
});

test('manual channel editor exposes audience library traffic business and execution fields',()=>{
  for(const id of [
    'cg-as-audience-date','cg-as-monthly-audience','cg-as-new','cg-as-casual','cg-as-regular','cg-as-returning','cg-as-avpv',
    'cg-as-browse','cg-as-suggested','cg-as-search','cg-as-external',
    'cg-as-newuploadviews','cg-as-libraryviews','cg-as-published','cg-as-planned',
    'cg-as-leads','cg-as-bookings','cg-as-sales','cg-as-revenue'
  ]) assert.ok(page.includes(id),id);
});

test('manual audience edits persist as their own dated 28-day snapshot',()=>{
  assert.match(page,/const audienceDate=val\('cg-as-audience-date'\)\|\|x\.date/);
  assert.match(page,/if\(hasAudience\)upsertAudiencePulse\(c,audience\);saveNow\(\)/);
});

test('current analytics read provides a direct manual channel data action',()=>{
  assert.match(decision,/Missing verified data\?/);
  assert.match(decision,/Add \/ edit verified channel data/);
  assert.match(decision,/analytics-snapshot-edit:/);
});
