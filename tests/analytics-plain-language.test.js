const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const clarity=require('../analytics/clarity');

const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('core analytics UI does not use the jargon phrases we removed',()=>{
  const files=[
    'analytics/clarity.js',
    'analytics/workflow-context.js',
    'analytics/decision-context.js',
    'analytics/workspace.js',
    'analytics/page.js'
  ];
  const source=files.map(read).join('\n');
  const banned=[
    'Investigate a clear issue, but keep it provisional.',
    'The available funnel metrics are inside the working range versus this creator’s own same-age normal.',
    'DATA-ASSISTED WORKING ANSWER',
    'Under 3% · investigate',
    'Clearly weak opportunity',
    'No same-age creator baseline'
  ];
  for(const phrase of banned)assert.equal(source.includes(phrase),false,phrase);
});

test('plain-language diagnosis outputs say what happened and what to do next',()=>{
  const none=clarity.diagnose({status:'needs_evidence',comparisons:{},message:'Missing 48-hour result'},48);
  assert.equal(none.headline,'Not enough data yet.');
  assert.match(none.next,/Get the missing comparison first/);

  const normal=clarity.diagnose({status:'compared',comparisons:{
    engagedViews:{multiple:1,current:1000,baseline:1000},
    views:{multiple:1,current:1000,baseline:1000},
    impressions:{multiple:1,current:10000,baseline:10000},
    ctr:{deltaPp:0,current:5,baseline:5},
    retention30:{deltaPp:0,current:65,baseline:65},
    apv:{deltaPp:0,current:45,baseline:45}
  }},168);
  assert.equal(normal.headline,'Nothing looks clearly broken here.');
  assert.match(normal.explain,/what this creator usually gets/);
  assert.doesNotMatch(normal.explain,/working range|same-age normal/i);
});
