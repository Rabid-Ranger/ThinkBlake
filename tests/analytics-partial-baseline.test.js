const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../analytics/engine');
const I=require('../analytics/import');

const creator={id:'c_8ks712b',name:'Fanathem'};
const now='2026-09-18T12:50:00Z';
const rows=[
['TggWdhi0MTY','2026-08-11T15:38:27Z',39882,270891,9.22,41.92,321],
['nskhvggCtZc','2026-08-24T15:18:51Z',23792,166913,10.51,53.44,275],
['nylRYrNZbaI','2026-06-25T19:39:35Z',17705,169558,6.52,31.81,271],
['xC9d_ijfe7s','2026-09-03T16:34:58Z',12731,55792,7.36,37.02,211],
['XLs-R3AaPiE','2026-07-27T16:43:41Z',5197,40234,8.92,40.45,255],
['gGIB9ah8ybs','2026-05-14T19:43:56Z',2909,24213,8.62,37.47,206],
['RJ-kInLCIcE','2026-04-15T16:30:25Z',2557,17705,9.72,30.15,164],
['1hlceVqshkY','2026-06-05T16:41:15Z',2261,24931,6.55,30.63,229],
['hFXI6DKkTwQ','2026-07-10T16:34:25Z',469,5591,5.35,29.36,200],
['7f97w9MtCyw','2026-05-01T16:16:00Z',464,4293,7.15,25.32,336]
].map(([videoId,publishedAt,views,impressions,ctr,apv,avdSeconds])=>({
 videoId,title:videoId,publishedAt,capturedAt:'2026-09-18T08:46:06Z',windowHours:24,format:'edited-long-form',eraId:'current',job:null,definitionId:'unknown',coverage:'exact',paid:'unknown',traffic:'all',source:'YouTube Studio Analytics · Video Analytics (First 24 Hours)',
 metrics:{views,engagedViews:null,impressions,ctr,retention30:null,apv,avdSeconds,browsePct:null,suggestedPct:null,searchPct:null,externalPct:null}
}));
const payload=()=>({schemaVersion:1,creatorId:creator.id,channelName:'Fanathem',observations:rows,channelPeriods:[],audienceSnapshots:[],limitations:[]});

test('unknown view definition still creates partial 24h baseline from compatible metrics',()=>{
 const out=I.parse(JSON.stringify(payload()),creator,E.emptyStore(),now);
 assert.equal(out.next.policies.length,1);
 const p=out.next.policies[0];
 assert.equal(p.primaryMetric,'impressions');
 const b=out.next.baselines.filter(x=>x.policyId===p.id&&x.kind==='operating').at(-1);
 assert.equal(b.metrics.impressions.n,10);
 assert.equal(b.metrics.ctr.n,10);
 assert.equal(b.metrics.apv.n,10);
 assert.equal(b.metrics.avdSeconds.n,10);
 assert.equal(b.metrics.views.n,10); // descriptive raw median is kept, but comparison remains blocked until the Views definition is verified
 assert.equal(b.metrics.engagedViews.n,0);
 assert.equal(b.metrics.retention30.n,0);
 assert.equal(b.metrics.impressions.median,32582.5);
 assert.equal(b.metrics.ctr.median,0.0799);
 assert.equal(b.metrics.apv.median,0.34415);
 assert.equal(b.metrics.avdSeconds.median,242);
});

test('repasting already-saved legacy rows upgrades them and creates the partial baseline',()=>{
 let prior=E.emptyStore();
 for(const row of rows){
  const clean={};for(const k of I.metrics){const v=row.metrics[k],rate=['ctr','retention30','apv','browsePct','suggestedPct','searchPct','externalPct'].includes(k);clean[k]=v==null?null:rate?v/100:v;}
  const id='studio:'+I.hash([row.videoId,row.windowHours,clean,row.capturedAt,row.definitionId,row.publishedAt,row.coverage,row.format,row.eraId,row.job,row.paid,row.traffic,row.source]);
  prior=E.acceptObservation(prior,{id,creatorId:creator.id,videoId:row.videoId,title:row.title,publishedAt:row.publishedAt,capturedAt:row.capturedAt,windowHours:24,format:row.format,eraId:row.eraId,job:null,definitionId:'unknown',coverage:'exact',paid:'unknown',traffic:'all',source:row.source,metrics:clean},now);
 }
 assert.equal(prior.policies.length,0);
 const out=I.parse(JSON.stringify(payload()),creator,prior,now);
 assert.equal(out.added,0);
 assert.equal(out.duplicates,10);
 assert.equal(out.next.policies.length,1);
 const p=out.next.policies[0];
 assert.equal(p.primaryMetric,'impressions');
 const b=out.next.baselines.filter(x=>x.policyId===p.id&&x.kind==='operating').at(-1);
 assert.equal(b.metrics.impressions.n,10);
 assert.equal(b.metrics.views.n,0);
});


test('explicit engaged views remain comparable even when the row-level view definition is unknown',()=>{
 const withEngaged=rows.map((row,i)=>({...row,metrics:{...row.metrics,engagedViews:1000+i*100}}));
 const packet={...payload(),observations:withEngaged};
 const out=I.parse(JSON.stringify(packet),creator,E.emptyStore(),now);
 const p=out.next.policies[0];
 const b=out.next.baselines.filter(x=>x.policyId===p.id&&x.kind==='operating').at(-1);
 assert.equal(b.metrics.engagedViews.n,10);
 assert.equal(b.metrics.views.n,10);
 assert.equal(b.metrics.engagedViews.definitionId,'youtube-studio-engaged-views-advanced-mode-v1');
 const target=withEngaged.at(-1);
 const r=E.compareVideo(out.next,{videoId:target.videoId,policyId:p.id,windowHours:24,asOf:now});
 assert.ok(r.comparisons.engagedViews.multiple!==null);
 assert.equal(r.comparisons.views.multiple,null);
});
