const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../analytics/engine.js');
const I=require('../analytics/import.js');

function rawRow(id,h=48,views=1000){
 return {videoId:id,title:id,publishedAt:'2026-08-01T00:00:00Z',capturedAt:'2026-09-20T00:00:00Z',windowHours:h,format:'edited-long-form',eraId:'current',job:null,definitionId:'unknown',coverage:'exact',paid:'unknown',traffic:'all',source:'Ask Studio',metrics:{views,engagedViews:null,impressions:10000,ctr:5,retention30:null,apv:50,avdSeconds:500,browsePct:70,suggestedPct:15,searchPct:5,externalPct:2}};
}
function engineObs(id,views=1000){
 return {id:'o-'+id,creatorId:'c',videoId:id,title:id,publishedAt:'2026-08-01T00:00:00Z',capturedAt:'2026-09-20T00:00:00Z',windowHours:168,format:'edited-long-form',eraId:'current',job:null,definitionId:'unknown',metricDefinitions:{views:'unknown',impressions:'youtube-studio-registered-impressions-v1'},coverage:'exact',paid:'unknown',traffic:'all',source:'Ask Studio',metrics:{views,engagedViews:null,impressions:10000,ctr:.05,retention30:null,apv:.5,avdSeconds:500,browsePct:.7,suggestedPct:.15,searchPct:.05,externalPct:.02}};
}
test('checkpoint inventory requires complete usable core fields',()=>{
 const good=rawRow('aaaaaaaaaaa'),missing=rawRow('bbbbbbbbbbb'),bad=rawRow('ccccccccccc',48,0);
 missing.metrics.externalPct=null;bad.metrics.impressions=50000;bad.metrics.ctr=5;
 const c={analyticsFoundation:{observations:[good,missing,bad]}};
 const inv=I.checkpointInventory(c,48);
 assert.equal(inv.saved,3);assert.equal(inv.complete,2);assert.equal(inv.repair.length,1);
});
test('repair prompt names incomplete rows and does not pretend the cohort is complete',()=>{
 const rows=[];for(let i=0;i<13;i++)rows.push(rawRow(('g'+String(i).padStart(10,'0')).slice(0,11)));
 const bad=rawRow('bad00000001',48,0);bad.metrics.impressions=50000;bad.metrics.ctr=5;bad.metrics.browsePct=null;rows.push(bad);
 const c={id:'c',name:'Creator',analyticsFoundation:{observations:rows,policies:[],baselines:[],reviews:[],events:[]}};
 const p=I.collectionPrompt(c,48,'update','2026-09-24T14:00:00Z');
 assert.match(p,/BASELINE REPAIR \/ BACKFILL/);assert.match(p,/13 complete usable rows out of the 15/);assert.match(p,/bad00000001/);
});
test('import rejects zero-view placeholder rows with positive impressions and CTR',()=>{
 const row=rawRow('bad00000002',48,0);row.metrics.impressions=50000;row.metrics.ctr=5;
 const c={id:'c',name:'Creator',analyticsFoundation:A.emptyStore()};
 const p=I.parse(JSON.stringify({schemaVersion:1,creatorId:'c',channelName:'Channel',observations:[row],channelPeriods:[],audienceSnapshots:[],limitations:[]}),c,A.emptyStore(),'2026-09-24T14:00:00Z');
 assert.equal(p.added,0);assert.equal(p.skipped,1);assert.match(p.limitations.join(' '),/zero must not be used as a placeholder/);
});
test('unknown-definition Views are retained descriptively in baseline summaries',()=>{
 let store=A.emptyStore();
 for(let i=0;i<10;i++)store=A.acceptObservation(store,engineObs(('v'+String(i).padStart(10,'0')).slice(0,11),1000+i*100),'2026-09-24T14:00:00Z');
 store=A.createPolicy(store,{id:'p',creatorId:'c',label:'7d',windowHours:168,format:'edited-long-form',eraId:'current',definitionId:'youtube-studio-registered-impressions-v1',metricDefinitions:{views:'unknown',impressions:'youtube-studio-registered-impressions-v1'},paid:'unknown',traffic:'all',primaryMetric:'impressions',cohortLimit:10,refreshAfter:4},'2026-09-24T14:00:00Z');
 const row=store.baselines.at(-1).metrics.views;
 assert.equal(row.n,10);assert.equal(row.definitionVerified,false);assert.ok(Number.isFinite(row.median));
});
