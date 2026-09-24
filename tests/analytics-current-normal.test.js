const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../analytics/workspace.js');
const D=require('../analytics/decision-context.js');

function creator(){
  const policy={id:'p7',creatorId:'c',label:'7d',windowHours:168,format:'edited-long-form',eraId:'current',definitionId:'youtube-studio-registered-impressions-v1',metricDefinitions:{views:'unknown',impressions:'youtube-studio-registered-impressions-v1',ctr:'youtube-studio-impressions-ctr-v1',apv:'youtube-studio-average-percentage-viewed-v1',avdSeconds:'youtube-studio-average-view-duration-v1'},paid:'unknown',traffic:'all',primaryMetric:'impressions',cohortLimit:15,refreshAfter:4};
  const metrics={
    views:{median:7244,n:15,definitionId:'unknown',definitionVerified:false},
    engagedViews:{median:null,n:0,definitionId:'unknown',definitionVerified:false},
    impressions:{median:61529,n:15,definitionId:'youtube-studio-registered-impressions-v1',definitionVerified:true},
    ctr:{median:.0522,n:15,definitionId:'youtube-studio-impressions-ctr-v1',definitionVerified:true},
    retention30:{median:null,n:0,definitionId:'youtube-studio-intro-retention-30s-v1',definitionVerified:true},
    apv:{median:.4506,n:15,definitionId:'youtube-studio-average-percentage-viewed-v1',definitionVerified:true},
    avdSeconds:{median:546,n:15,definitionId:'youtube-studio-average-view-duration-v1',definitionVerified:true},
    browsePct:{median:null,n:0,definitionId:'youtube-studio-traffic-source-share-v1',definitionVerified:true},
    suggestedPct:{median:null,n:0,definitionId:'youtube-studio-traffic-source-share-v1',definitionVerified:true},
    searchPct:{median:null,n:0,definitionId:'youtube-studio-traffic-source-share-v1',definitionVerified:true},
    externalPct:{median:null,n:0,definitionId:'youtube-studio-traffic-source-share-v1',definitionVerified:true}
  };
  const memberVideoIds=Array.from({length:15},(_,i)=>'v'+i);
  const observations=memberVideoIds.map((videoId,i)=>({id:'o'+i,revisionId:'o'+i+':r1',revision:1,creatorId:'c',videoId,title:videoId,publishedAt:'2026-07-'+String(i+1).padStart(2,'0')+'T12:00:00Z',capturedAt:'2026-07-30T12:00:00Z',windowHours:168,format:'edited-long-form',eraId:'current',definitionId:'unknown',metricDefinitions:{views:'unknown'},coverage:'exact',paid:'unknown',traffic:'all',source:'Ask Studio',metrics:{views:7000+i,engagedViews:null,impressions:60000+i,ctr:.052,retention30:null,apv:.45,avdSeconds:546,browsePct:null,suggestedPct:null,searchPct:null,externalPct:null}}));
  return {id:'c',name:'Creator',videos:[],analyticsFoundation:{observations,policies:[policy],baselines:[{id:'p7:starting:1',policyId:'p7',kind:'starting',builtAt:'2026-09-24T00:00:00Z',memberVideoIds,observationRevisionIds:observations.map(x=>x.revisionId),metrics},{id:'p7:operating:1',policyId:'p7',kind:'operating',builtAt:'2026-09-24T00:00:00Z',memberVideoIds,observationRevisionIds:observations.map(x=>x.revisionId),metrics}],reviews:[],events:[]},coachOS:{baseline:{sets:[],history:[]},analytics:{snapshots:[],audienceSnapshots:[]}}};
}

test('creator normal renders from saved baseline even with no selected video',()=>{
  const c=creator();
  W.prefs(c).hours=168;
  const d=D.baselineDetail(c,W,168);
  assert.equal(d.sample,15);
  assert.equal(d.values.views,7244);
  assert.equal(d.values.impressions,61529);
  const html=D.normalsAtGlance(c,W);
  assert.match(html,/7,244/);
  assert.match(html,/61,529/);
  assert.match(html,/5\.2%/);
  assert.match(html,/45\.1%/);
  assert.match(html,/9:06/);
  assert.match(html,/Good working normal/);
  assert.doesNotMatch(html,/No matching baseline|No baseline saved yet/);
});

test('optional checkpoint context is labeled optional and does not create a missing-data row',()=>{
  const c=creator();
  const html=D.normalsAtGlance(c,W);
  assert.match(html,/Optional · not returned by Studio/);
  const report=D.missingDataReport(c,W);
  assert.equal(report.videoRows.length,0);
});
