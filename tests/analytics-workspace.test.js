const {test}=require('node:test'),assert=require('node:assert/strict'),W=require('../analytics/workspace'),I=require('../analytics/import'),A=require('../analytics/engine');
const c={id:'c',name:'Test',videos:[{id:'v',title:'Video',job:'Reach',analytics:{_7d:{views:2000,engagedViews:1000,ctr:6,sourceRef:'Exact report',windowVerified:true,metricDefinitionId:'plays-2026'}}}],coachOS:{baseline:{sets:[{id:'b',name:'Reach 7d',window:'_7d',job:'Reach',n:10,views:1000,engagedViews:800,ctr:5,confirmedComparable:true,sourceRef:'Earlier set',metricDefinitionId:'plays-2026'}]}}};
test('same-age manual comparisons keep views/engaged counts independent and use pp for rates',()=>{const r=W.compare(c,W.videos(c)[0],W.baselines(c,168)[0],168);assert.equal(r.comparisons.views.multiple,2);assert.equal(r.comparisons.engagedViews.multiple,1.25);assert.ok(Math.abs(r.comparisons.ctr.deltaPp-1)<1e-8);assert.equal(W.baselines(c,24).length,0);assert.equal(W.compare(c,W.videos(c)[0],null,24).comparisons.views.current,null);});
test('definition mismatch, missing metrics and self inclusion never generate false multiples',()=>{let x=structuredClone(c);x.coachOS.baseline.sets[0].metricDefinitionId='old';assert.equal(W.compare(x,W.videos(x)[0],W.baselines(x,168)[0],168).comparisons.views.multiple,null);x=structuredClone(c);x.videos[0].analytics._7d.engagedViews=null;assert.equal(W.compare(x,W.videos(x)[0],W.baselines(x,168)[0],168).comparisons.engagedViews.multiple,null);x=structuredClone(c);x.coachOS.baseline.sets[0].sourceVideoIds=['v'];assert.equal(W.compare(x,W.videos(x)[0],W.baselines(x,168)[0],168).comparisons.views.multiple,null);});
test('undated channel totals cannot claim growth; dated matching reports can',()=>{let x={coachOS:{baseline:{current90:{views:900000}},analytics:{snapshots:[{period:'90d',views:1000000,date:'2026-07-01'}]}}};assert.equal(W.channel(x).comparable,false);x={coachOS:{baseline:{},analytics:{snapshots:[{period:'90d',date:'2026-04-01',periodStart:'2026-01-01',periodEndExclusive:'2026-04-01',sourceRef:'Studio',metricDefinitionId:'plays',views:100},{period:'90d',date:'2026-06-30',periodStart:'2026-04-01',periodEndExclusive:'2026-06-30',sourceRef:'Studio',metricDefinitionId:'plays',views:200}]}}};assert.equal(W.channel(x).comparable,true);});
test('bad optional channel period does not block verified video checkpoints; unknown definitions are stored without invented baselines',()=>{const rows=Array.from({length:6},(_,i)=>({videoId:'test'+i,publishedAt:'2026-01-0'+(i+1)+'T12:00:00Z',capturedAt:'2026-02-01T00:00:00Z',windowHours:168,format:'long',eraId:'a',coverage:'exact',paid:'organic',traffic:'all',definitionId:'plays',source:'Studio first 7 days',metrics:{views:null,engagedViews:100+i}}));const packet={schemaVersion:1,creatorId:'c',channelName:'Test',observations:rows,channelPeriods:[{start:'2026-01-01',end:'2026-01-28',source:'28 days',metrics:{views:10000}}]};const r=I.parse(JSON.stringify(packet),c,A.emptyStore());assert.equal(r.added,6);assert.equal(r.periods.length,0);assert.match(r.limitations.join(' '),/skipped/);assert.equal(r.next.policies[0].primaryMetric,'engagedViews');packet.observations=rows.map(x=>({...x,definitionId:'unknown'}));assert.equal(I.parse(JSON.stringify(packet),c,A.emptyStore()).next.policies.length,0);assert.match(I.prompt(c,24),/exact first 24 hours/);});


test('post-August-2026 Studio Views and Engaged views stay separate and can be compared',()=>{
  const now='2026-09-24T21:00:00Z';
  const rows=Array.from({length:6},(_,i)=>({
    id:'studio:viewdef'+i,creatorId:'c2',videoId:'video'+i,title:'Video '+i,
    publishedAt:'2026-09-'+String(1+i*3).padStart(2,'0')+'T12:00:00Z',
    capturedAt:'2026-09-24T20:00:00Z',windowHours:24,format:'edited-long-form',eraId:'current',
    definitionId:'unknown',metricDefinitions:{views:'unknown',engagedViews:'unknown',impressions:'youtube-studio-registered-impressions-v1'},
    coverage:'exact',paid:'unknown',traffic:'all',source:'YouTube Studio Advanced Mode',
    metrics:{views:2000+i*100,engagedViews:1200+i*100,impressions:15000+i*1000,ctr:.05,retention30:null,apv:.45,avdSeconds:300,browsePct:null,suggestedPct:null,searchPct:null,externalPct:null}
  }));
  let store=A.acceptObservations(A.emptyStore(),rows,now);
  assert.equal(A.definitionFor(store.observations[0],'views'),A.CURRENT_VIEW_DEFINITION);
  assert.equal(A.definitionFor(store.observations[0],'engagedViews'),A.ENGAGED_VIEW_DEFINITION);
  assert.notEqual(A.CURRENT_VIEW_DEFINITION,A.ENGAGED_VIEW_DEFINITION);
  store=A.createPolicy(store,{id:'p-current-views',creatorId:'c2',windowHours:24,format:'edited-long-form',eraId:'current',definitionId:'youtube-studio-registered-impressions-v1',metricDefinitions:{views:'unknown',engagedViews:'unknown',impressions:'youtube-studio-registered-impressions-v1'},paid:'unknown',traffic:'all',primaryMetric:'impressions',cohortLimit:15},now);
  const r=A.compareVideo(store,{videoId:'video5',policyId:'p-current-views',windowHours:24,asOf:now});
  assert.equal(r.status,'compared');
  assert.ok(r.comparisons.views.multiple>0);
  assert.ok(r.comparisons.engagedViews.multiple>0);
});

test('equivalent imported policies collapse to one current normal',()=>{
  const p=createdAt=>({id:'p'+createdAt,creatorId:'c',windowHours:168,format:'edited-long-form',eraId:'current',definitionId:'youtube-studio-registered-impressions-v1',metricDefinitions:{impressions:'youtube-studio-registered-impressions-v1'},paid:'unknown',traffic:'all',primaryMetric:'impressions',createdAt,ruleVersion:'connected-analytics-v1'});
  const x={id:'dedupe',coachOS:{baseline:{sets:[]}},analyticsFoundation:{observations:[],policies:[p('2026-09-20T00:00:00Z'),p('2026-09-24T00:00:00Z')],baselines:[],reviews:[],events:[]}};
  const bs=W.baselines(x,168);
  assert.equal(bs.length,1);
  assert.match(bs[0].label,/7-day normal · long-form/);
});
