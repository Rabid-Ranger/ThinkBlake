const {test}=require('node:test');
const assert=require('node:assert/strict');
const I=require('../analytics/import');
const A=require('../analytics/engine');
const c={id:'test',name:'Synthetic creator'};
const now='2026-09-21T12:00:00Z';
const row={videoId:'test-video',title:'Synthetic',publishedAt:'2026-09-01T12:00:00Z',capturedAt:'2026-09-08T12:00:00Z',windowHours:168,format:'edited-long-form',eraId:'current',job:null,definitionId:'test-definition',coverage:'exact',paid:'organic',traffic:'all',source:'Synthetic first 7 days',metrics:{views:1000,engagedViews:900,impressions:10000,ctr:5,apv:40}};
const packet=observations=>JSON.stringify({schemaVersion:1,creatorId:c.id,channelName:c.name,observations,channelPeriods:[],audienceSnapshots:[],limitations:[]});
test('batch setup uses one exact checkpoint and requests all video metrics',()=>{
 for(const h of [24,48,168,672]){
  const p=I.collectionPrompt(c,h,'setup',now),schema=I.studioJson(p,c.id).data;
  assert.equal(schema.observations[0].windowHours,h);assert.equal(schema.channelPeriods.length,0);
  assert.deepEqual(Object.keys(schema.observations[0].metrics),I.metrics);
  assert.match(p,/at most 5 eligible/);assert.match(p,/10–20 previous/);
  assert.match(p,/rolling last-48-hour realtime/);assert.match(p,/Keep flops and outliers/);
 }
});
test('missing-field request uses saved values with public percentage units and correct checkpoint',()=>{
 const store=I.parse(packet([row]),c,A.emptyStore(),now).next;
 const p=I.collectionPrompt({...c,analyticsFoundation:store},168,'missing',now);
 assert.match(p,/at most 3 saved/);assert.match(p,/"ctr":5/);assert.match(p,/"engagedViews":900/);
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
 assert.doesNotMatch(p,/at most 5|10–20/);
});
test('partial revisions preserve saved metrics while independent valid rows can import',()=>{
 const first=I.parse(packet([row]),c,A.emptyStore(),now),prior=JSON.stringify(first.next);
 const partial={...row,capturedAt:'2026-09-09T12:00:00Z',metrics:{views:1100,engagedViews:null}};
 const next=I.parse(packet([partial,{...row,videoId:'second-video'}]),c,first.next,now);
 assert.equal(next.skipped,1);assert.equal(next.added,1);assert.equal(next.reviewRows.length,1);
 assert.equal(next.reviewRows[0].videoId,'second-video');
 assert.match(next.limitations.join(' '),/erase saved engagedViews/);
 assert.equal(JSON.stringify(first.next),prior);
 assert.equal(next.next.observations.find(x=>x.videoId==='test-video').metrics.engagedViews,900);
});
test('duplicate-only reply has no new review rows; verified complete revisions work',()=>{
 const first=I.parse(packet([row]),c,A.emptyStore(),now);
 const dup=I.parse(packet([row]),c,first.next,now);
 assert.equal(dup.duplicates,1);assert.equal(dup.reviewRows.length,0);
 const revision=I.parse(packet([{...row,metrics:{...row.metrics,retention30:65}}]),c,first.next,now);
 assert.equal(revision.added,1);assert.equal(revision.reviewRows[0].metrics.retention30,.65);
 assert.equal(revision.next.observations.length,2);
});
