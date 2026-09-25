const test=require('node:test');
const assert=require('node:assert/strict');
const U=require('../analytics/usability-v3');

test('checkpoint guide uses the exact decision language requested',()=>{
  assert.equal(U.PHASES[24].label,'24h · Launch');
  assert.equal(U.PHASES[48].label,'48h · Check');
  assert.equal(U.PHASES[168].label,'7d · Main read');
  assert.equal(U.PHASES[672].label,'28d · What to make next');
  assert.equal(U.PHASES[2160].label,'90d · Channel Health');
  assert.match(U.PHASES[48].question,/reach, CTR, or watch/i);
  assert.match(U.PHASES[168].decision,/main video decision point/i);
  assert.match(U.PHASES[672].decision,/what the next video should do/i);
  assert.match(U.PHASES[2160].decision,/does not set a per-video baseline/i);
});

test('optional checkpoint wording is removed everywhere',()=>{
  const out=U.phaseLabels('<button>24 hours</button><button>48 hours</button><button>7 days</button><button>28 days · optional</button>');
  assert.match(out,/24h · Launch/);
  assert.match(out,/48h · Check/);
  assert.match(out,/7d · Main read/);
  assert.match(out,/28d · What to make next/);
  assert.doesNotMatch(out,/optional/i);
});

test('winner with a soft metric is framed as keep strategy plus watch item',()=>{
  assert.deepEqual(U.winnerCall('NO FIX NEEDED · TITLE / THUMBNAIL A LITTLE SOFT'),{soft:'TITLE / THUMBNAIL',label:'KEEP STRATEGY · CHECK TITLE / THUMBNAIL'});
  assert.deepEqual(U.winnerCall('NO FIX NEEDED · WATCH A LITTLE SOFT'),{soft:'WATCH',label:'KEEP STRATEGY · CHECK WATCH'});
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


test('checkpoint guide is informational and does not navigate',()=>{
  const doc={createElement:()=>({className:'',innerHTML:''})};
  const flow=U.flowHtml(doc,{mode:'video',hours:168});
  assert.match(flow.innerHTML,/decision guide, not navigation/i);
  assert.match(flow.innerHTML,/24h · Launch/);
  assert.match(flow.innerHTML,/90d · Channel Health/);
  assert.doesNotMatch(flow.innerHTML,/data-au3-phase/);
  assert.doesNotMatch(flow.innerHTML,/<button[^>]*au3-phase/);
});
