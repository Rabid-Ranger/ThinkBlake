const test=require('node:test');
const assert=require('node:assert/strict');
const U=require('../analytics/usability-v2');

test('checkpoint labels use coaching decisions, not optional wording',()=>{
  const out=U.phaseLabels('<button>24 hours</button><button>48 hours</button><button>7 days</button><button>28 days · optional</button>');
  assert.match(out,/24h · Launch/);
  assert.match(out,/48h · Triage/);
  assert.match(out,/7d · Diagnosis/);
  assert.match(out,/28d · Programming/);
  assert.doesNotMatch(out,/optional/);
});

test('video prompt appendix requires exact per-video traffic source context',()=>{
  const out=U.promptAppendix('video');
  assert.match(out,/SAME exact first-life window/);
  assert.match(out,/Browse, Suggested, Search, and External/);
  assert.match(out,/Do not substitute the channel-wide traffic mix/);
});

test('channel prompt appendix requires matched 90-day source mix',()=>{
  const out=U.promptAppendix('channel');
  assert.match(out,/each 90-day period/);
  assert.match(out,/actual Traffic source report/);
});
