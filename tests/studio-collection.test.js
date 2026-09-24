const {test}=require('node:test');
const assert=require('node:assert/strict');
const I=require('../analytics/import');
const A=require('../analytics/engine');
const c={id:'test',name:'Synthetic creator'};
const now='2026-09-21T12:00:00Z';
const fullMetrics={views:1000,engagedViews:null,impressions:10000,ctr:5,retention30:null,apv:40,avdSeconds:120,browsePct:80,suggestedPct:10,searchPct:5,externalPct:1};
const row={videoId:'test-video',title:'Synthetic',publishedAt:'2026-09-01T12:00:00Z',capturedAt:'2026-09-08T12:00:00Z',windowHours:168,format:'edited-long-form',eraId:'current',job:null,definitionId:'test-definition',coverage:'exact',paid:'unknown',traffic:'all',source:'Synthetic first 7 days',metrics:fullMetrics};
const packet=observations=>JSON.stringify({schemaVersion:1,creatorId:c.id,channelName:c.name,observations,channelPeriods:[],audienceSnapshots:[],limitations:[]});

test('setup uses one exact checkpoint and requests the 15 most recent matured eligible videos',()=>{
 for(const h of [24,48,168,672]){
  const p=I.collectionPrompt(c,h,'setup',now),schema=I.studioJson(p,c.id).data;
  assert.equal(schema.observations[0].windowHours,h);assert.equal(schema.channelPeriods.length,0);
  assert.deepEqual(Object.keys(schema.observations[0].metrics),I.metrics);
  assert.match(p,/15 most recent eligible comparable long-form videos/);
  assert.match(p,/skip it and continue farther back until you have 15/);
  assert.match(p,/Do not force the same cohort used by another checkpoint/);
  assert.match(p,/Do not treat age, low performance, or ordinary topic\/title variation/);
  assert.match(p,/rolling last-48-hour realtime/);
  assert.match(p,/ordinary flops and outliers/);
  assert.match(p,/IMPORTANT SECOND PASS/);
  assert.match(p,/Traffic source \/ How viewers found this video/);
  assert.match(p,/Do not stop after the general video analytics report/);
  assert.doesNotMatch(p,/at most 5 eligible|10–20 previous/);
 }
});

test('optional engagement, retention, and traffic context do not make an otherwise complete checkpoint incomplete',()=>{
 const optional={...row,metrics:{...fullMetrics,engagedViews:null,retention30:null,browsePct:null,suggestedPct:null,searchPct:null,externalPct:null}};
 const first=I.parse(packet([optional]),c,A.emptyStore(),now);
 const inv=I.checkpointInventory({...c,analyticsFoundation:first.next},168);
 const traffic=I.checkpointTrafficCoverage({...c,analyticsFoundation:first.next},168);
 assert.equal(inv.complete,1);
 assert.equal(traffic.complete,0);
 const p=I.collectionPrompt({...c,analyticsFoundation:first.next},168,'missing',now);
 assert.doesNotMatch(p,/"test-video"/);
});

test('missing-field request uses saved values and correct checkpoint for required metrics',()=>{
 const incomplete={...row,metrics:{...fullMetrics,apv:null}};
 const store=I.parse(packet([incomplete]),c,A.emptyStore(),now).next;
 const p=I.collectionPrompt({...c,analyticsFoundation:store},168,'missing',now);
 assert.match(p,/up to 5 saved checkpoints/);assert.match(p,/"ctr":5/);assert.match(p,/"apv":null/);
 assert.match(p,/Do not return a partial patch/);
 const other=I.collectionPrompt({...c,analyticsFoundation:store},24,'missing',now);
 assert.doesNotMatch(other,/test-video/);
});

test('channel and audience collection remain separate, with complete adjacent ranges',()=>{
 for(const date of [now,'2024-03-01T12:00:00Z']){
  const schema=I.studioJson(I.collectionPrompt(c,168,'channel',date),c.id).data;
  assert.equal(schema.audienceSnapshots.length,0);
  const [a,b]=schema.channelPeriods;
  for(const p of [a,b])assert.equal((Date.parse(p.end)-Date.parse(p.start))/86400000,89);
  assert.equal(Date.parse(b.start)-Date.parse(a.end),86400000);
  assert.ok(b.end<date.slice(0,10));assert.ok(!('newViewers' in b.metrics));
  const prompt=I.collectionPrompt(c,168,'channel',date);
  assert.match(prompt,/separate required retrieval attempt/);
  assert.match(prompt,/Traffic source \/ How viewers found your content/);
  assert.match(prompt,/Do not stop after a general channel analytics report/);
 }
 const p=I.collectionPrompt({...c,coachOS:{analytics:{audienceSnapshots:[{asOf:'2026-08-20'}]}}},168,'audience',now);
 const schema=I.studioJson(p,c.id).data;
 assert.equal(schema.channelPeriods.length,0);assert.equal(schema.audienceSnapshots[0].windowDays,28);
 assert.match(p,/2026-08-20/);
});

test('format follow-up reformats existing answer without initiating a new collection',()=>{
 const p=I.formatPrompt(c,48,'all');
 assert.match(p,/PREVIOUS ANSWER only/);assert.match(p,/Do not collect more videos/);
 const schema=I.studioJson(p,c.id).data;
 assert.equal(schema.observations[0].windowHours,48);
 assert.equal(schema.channelPeriods[0].start,'ACTUAL START DATE YYYY-MM-DD');
 assert.equal(schema.audienceSnapshots[0].windowDays,28);
 assert.doesNotMatch(p,/15 most recent|at most 5|10–20/);
});

test('partial revisions preserve saved metrics while independent valid rows can import',()=>{
 const first=I.parse(packet([row]),c,A.emptyStore(),now),prior=JSON.stringify(first.next);
 const partial={...row,capturedAt:'2026-09-09T12:00:00Z',metrics:{views:1100,engagedViews:null}};
 const next=I.parse(packet([partial,{...row,videoId:'second-video'}]),c,first.next,now);
 assert.equal(next.skipped,1);assert.equal(next.added,1);assert.equal(next.reviewRows.length,1);
 assert.equal(next.reviewRows[0].videoId,'second-video');
 assert.match(next.limitations.join(' '),/erase saved impressions|erase saved ctr|erase saved apv/);
 assert.equal(JSON.stringify(first.next),prior);
});

test('duplicate-only reply has no new review rows; verified complete revisions work',()=>{
 const first=I.parse(packet([row]),c,A.emptyStore(),now);
 const dup=I.parse(packet([row]),c,first.next,now);
 assert.equal(dup.duplicates,1);assert.equal(dup.reviewRows.length,0);
 const revision=I.parse(packet([{...row,capturedAt:'2026-09-09T12:00:00Z',metrics:{...row.metrics,retention30:65}}]),c,first.next,now);
 assert.equal(revision.added,1);assert.equal(revision.reviewRows[0].metrics.retention30,.65);
 assert.equal(revision.next.observations.length,2);
});

test('impossible cumulative checkpoint decreases are rejected',()=>{
 const first24={...row,windowHours:24,publishedAt:'2026-08-01T12:00:00Z',capturedAt:'2026-08-03T12:00:00Z',source:'Synthetic first 24h',metrics:{...fullMetrics,views:1000,impressions:10000}};
 const first=I.parse(packet([first24]),c,A.emptyStore(),now);
 const bad7={...first24,windowHours:168,capturedAt:'2026-08-10T12:00:00Z',source:'Synthetic first 7d',metrics:{...fullMetrics,views:900,impressions:9000}};
 const out=I.parse(packet([bad7]),c,first.next,now);
 assert.equal(out.added,0);assert.equal(out.skipped,1);
 assert.match(out.limitations.join(' '),/Cumulative checkpoint counts cannot materially decrease/);
});

test('15 exact rows create a 15-video rolling policy',()=>{
 const rows=Array.from({length:15},(_,i)=>({...row,videoId:'video-'+String(i).padStart(5,'0'),publishedAt:new Date(Date.parse('2026-08-01T12:00:00Z')+i*86400000).toISOString(),capturedAt:'2026-09-21T11:00:00Z',metrics:{...fullMetrics,views:1000+i,impressions:10000+i}}));
 const out=I.parse(packet(rows),c,A.emptyStore(),now);
 assert.equal(out.added,15);
 assert.equal(out.next.policies[0].cohortLimit,15);
 assert.equal(out.next.baselines.at(-1).memberVideoIds.length,15);
});


test('same-window cumulative revisions cannot silently replace a clean exact checkpoint',()=>{
 const first=I.parse(packet([row]),c,A.emptyStore(),now);
 const revised={...row,capturedAt:'2026-09-09T12:00:00Z',metrics:{...row.metrics,views:700,impressions:7000}};
 const out=I.parse(packet([revised]),c,first.next,now);
 assert.equal(out.added,0);assert.equal(out.skipped,1);
 assert.equal(out.next.observations.length,1);
 assert.match(out.limitations.join(' '),/materially conflicts with the already-saved exact checkpoint value/);
});

test('views materially below impressions times CTR are rejected as incompatible report populations',()=>{
 const bad={...row,metrics:{...row.metrics,views:300,impressions:10000,ctr:5}};
 const out=I.parse(packet([bad]),c,A.emptyStore(),now);
 assert.equal(out.added,0);assert.equal(out.skipped,1);
 assert.match(out.limitations.join(' '),/materially below the views implied by registered impressions/);
});

test('one multi-row revision import refreshes the operating baseline only once',()=>{
 const rows=Array.from({length:15},(_,i)=>({...row,videoId:'atomic-'+String(i).padStart(5,'0'),publishedAt:new Date(Date.parse('2026-08-01T12:00:00Z')+i*86400000).toISOString(),capturedAt:'2026-09-20T11:00:00Z',metrics:{...fullMetrics,views:1000+i*10,impressions:10000+i*100}}));
 const first=I.parse(packet(rows),c,A.emptyStore(),now);
 const policyId=first.next.policies[0].id;
 assert.equal(first.next.baselines.filter(b=>b.policyId===policyId&&b.kind==='operating').length,1);
 const revised=rows.map((x,i)=>({...x,capturedAt:'2026-09-21T11:00:00Z',metrics:{...x.metrics,apv:41+i/100}}));
 const second=I.parse(packet(revised),c,first.next,'2026-09-21T12:30:00Z');
 assert.equal(second.added,15);
 assert.equal(second.next.baselines.filter(b=>b.policyId===policyId&&b.kind==='operating').length,2);
 assert.equal(second.next.baselines.at(-1).reason,'data_revision');
});


test('compacting a staged setup keeps only the latest observation revisions and one clean starting baseline',()=>{
 const rows=Array.from({length:15},(_,i)=>({...row,videoId:'stage-'+String(i).padStart(6,'0'),publishedAt:new Date(Date.parse('2026-08-01T12:00:00Z')+i*86400000).toISOString(),capturedAt:'2026-09-20T11:00:00Z',metrics:{...fullMetrics,views:1000+i*10,impressions:10000+i*100}}));
 const first=I.parse(packet(rows),c,A.emptyStore(),now);
 const revised=rows.map((x,i)=>({...x,capturedAt:'2026-09-21T11:00:00Z',metrics:{...x.metrics,apv:42+i/100}}));
 const second=I.parse(packet(revised),c,first.next,'2026-09-21T12:30:00Z');
 const compact=I.compactStore(second.next,'2026-09-21T12:45:00Z');
 const policy=compact.policies[0],starts=compact.baselines.filter(b=>b.policyId===policy.id&&b.kind==='starting'),ops=compact.baselines.filter(b=>b.policyId===policy.id&&b.kind==='operating');
 assert.equal(compact.observations.length,15);
 assert.equal(starts.length,1);assert.equal(ops.length,1);
 assert.equal(starts[0].signature,ops[0].signature);
 assert.equal(ops[0].metrics.apv.n,15);
});


test('legacy prompt APIs delegate to the same one-window workflow',()=>{
 for(const h of [24,48,168,672]){
  assert.equal(I.prompt(c,h,now),I.collectionPrompt(c,h,'setup',now));
  assert.equal(I.routinePrompt(c,h,now),I.collectionPrompt(c,h,'update',now));
 }
});

test('partial saved checkpoint is included in the missing-data requery reference',()=>{
 const partial={...row,coverage:'partial',metrics:{...fullMetrics}};
 const store=I.parse(packet([partial]),c,A.emptyStore(),now).next;
 const p=I.collectionPrompt({...c,analyticsFoundation:store},168,'missing',now);
 assert.match(p,/test-video/);
 assert.match(p,/"coverage":"partial"/);
});

test('mixed Views definitions do not split stable-metric baseline cohorts',()=>{
 const defs=['views-old','views-new'];
 const rows=Array.from({length:15},(_,i)=>({...row,videoId:'mix-'+String(i).padStart(7,'0'),publishedAt:new Date(Date.parse('2026-08-01T12:00:00Z')+i*86400000).toISOString(),capturedAt:'2026-09-21T11:00:00Z',definitionId:defs[i%2],metrics:{...fullMetrics,views:1000+i,impressions:10000+i}}));
 const out=I.parse(packet(rows),c,A.emptyStore(),now);
 assert.equal(out.next.policies.length,1);
 const policy=out.next.policies[0];
 assert.equal(policy.primaryMetric,'impressions');
 assert.equal(out.next.baselines.at(-1).metrics.impressions.n,15);
});


test('underfilled saved cohort switches to backfill instead of routine-only updates',()=>{
 const rows=Array.from({length:11},(_,i)=>({...row,videoId:'backfill-'+String(i).padStart(4,'0'),publishedAt:new Date(Date.parse('2026-07-01T12:00:00Z')+i*86400000).toISOString(),capturedAt:'2026-09-20T12:00:00Z'}));
 const store=I.parse(packet(rows),c,A.emptyStore(),now).next;
 const p=I.collectionPrompt({...c,analyticsFoundation:store},168,'update',now);
 assert.match(p,/BASELINE BACKFILL/);
 assert.match(p,/currently contains 11 exact current-era long-form rows/);
 assert.match(p,/until the saved cohort can reach 15/);
});


test('verify mode explicitly re-queries all 15 and does not send saved inventory as an exclusion list',()=>{
 const c={id:'c1',name:'Creator',analyticsFoundation:{observations:[],policies:[],baselines:[],reviews:[],events:[]}};
 const p=I.collectionPrompt(c,168,'verify','2026-09-24T15:00:00Z');
 assert.match(p,/BASELINE VERIFY \/ REFRESH/);
 assert.match(p,/COMPLETE current 15-video cohort/);
 assert.match(p,/Re-collect the exact checkpoint measurements for all 15 rows/);
 assert.match(p,/Do not return observations:\[\] merely because rows are already saved/);
 assert.doesNotMatch(p,/SAVED INVENTORY/);
});
