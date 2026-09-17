const test=require('node:test');
const assert=require('node:assert/strict');
const U=require('../analytics/usability-v3');

test('checkpoint guide uses the exact decision language requested',()=>{
  assert.equal(U.PHASES[24].label,'24h · Launch');
  assert.equal(U.PHASES[48].label,'48h · Triage');
  assert.equal(U.PHASES[168].label,'7d · Diagnosis');
  assert.equal(U.PHASES[672].label,'28d · Programming');
  assert.equal(U.PHASES[2160].label,'90d · Channel Health');
  assert.match(U.PHASES[168].decision,/main video decision point/i);
  assert.match(U.PHASES[672].decision,/what the next video should do/i);
});

test('optional checkpoint wording is removed everywhere',()=>{
  const out=U.phaseLabels('<button>24 hours</button><button>48 hours</button><button>7 days</button><button>28 days · optional</button>');
  assert.match(out,/24h · Launch/);
  assert.match(out,/48h · Triage/);
  assert.match(out,/7d · Diagnosis/);
  assert.match(out,/28d · Programming/);
  assert.doesNotMatch(out,/optional/i);
});

test('winner with a soft metric is framed as keep strategy plus watch item',()=>{
  assert.deepEqual(U.winnerCall('NO FIX NEEDED · PACKAGING A LITTLE SOFT'),{soft:'PACKAGING',label:'KEEP STRATEGY · WATCH PACKAGING'});
  assert.deepEqual(U.winnerCall('NO FIX NEEDED · RETENTION A LITTLE SOFT'),{soft:'RETENTION',label:'KEEP STRATEGY · WATCH RETENTION'});
  assert.equal(U.winnerCall('NO CLEAR ISSUE'),null);
});

test('video prompt explicitly requires same-window per-video traffic source',()=>{
  const out=U.promptAppendix('video');
  assert.match(out,/EVERY returned video\/checkpoint row/i);
  assert.match(out,/SAME exact first-life checkpoint window/);
  assert.match(out,/Browse, Suggested, Search, and External/);
  assert.match(out,/Do not substitute the channel-wide traffic mix/);
  assert.match(out,/set those source fields to null/i);
});

test('channel prompt explicitly requires exact 90-day traffic source',()=>{
  const out=U.promptAppendix('channel');
  assert.match(out,/EACH returned 90-day period/);
  assert.match(out,/exact same 90-day date range/);
  assert.match(out,/actual report\/filter/i);
});
