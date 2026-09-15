const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const clarity=require('../analytics/clarity');

const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('core UI source no longer contains the confusing copy we removed',()=>{
  const files=[
    'analytics/clarity.js','analytics/decision-context.js','analytics/engine.js',
    'analytics/import.js','analytics/live.js','analytics/measurement.js',
    'analytics/page.js','analytics/workflow-context.js','analytics/workspace.js',
    'ai/review-reminders.js','ai/review-ui.js'
  ];
  const source=files.map(read).join('\n');
  const banned=[
    'Use this for programming and follow-up decisions.',
    '48-hour triage',
    '28-day programming',
    'connected decision',
    'Working clue:',
    'One working read',
    'What should programming learn?',
    'Build the 90-day evidence plan',
    'Plan this video as a learning rep'
  ];
  for(const phrase of banned)assert.equal(source.includes(phrase),false,phrase);
});

test('28-day checkpoint tells a strategist what it is for',()=>{
  const read28=clarity.diagnose({status:'needs_evidence',comparisons:{},message:'Missing 28-day result'},672);
  assert.equal(read28.age.name,'WHAT TO MAKE NEXT');
  assert.equal(read28.age.purpose,'What did this video teach us?');
  assert.match(read28.age.act,/decide what to make next/i);
  assert.doesNotMatch(read28.age.act,/programming|follow-up decisions/i);
});

test('legacy UI rewrite layer covers the old dashboard vocabulary',()=>{
  const source=read('ui/plain-language.js');
  const required=[
    "'Provisional':'Not final yet'",
    "'Constraint':'Main issue'",
    "'Find bottleneck':'Find the main issue'",
    "'Primary signal':'Main number to watch'",
    "'Guardrail':'What needs to stay healthy'",
    "'Explore / Exploit':'Test new ideas or repeat what works'",
    "'Programming':'What to make next'",
    "'Video Performance Baselines':'What This Creator Usually Gets'"
  ];
  for(const phrase of required)assert.equal(source.includes(phrase),true,phrase);
});
