const {test}=require('node:test'),assert=require('node:assert/strict'),I=require('../analytics/import'),A=require('../analytics/engine');const c={id:'c',name:'Test'},day=86400000,start=Date.parse('2026-01-01T12:00:00Z');const row=i=>({videoId:'video-'+i,title:'Example '+i,publishedAt:new Date(start+i*day).toISOString(),capturedAt:new Date(start+(i+7)*day).toISOString(),windowHours:168,format:'long',eraId:'a',definitionId:'studio-current',coverage:'exact',paid:'organic',traffic:'all',source:'Exact Studio first 7 days',metrics:{views:1000+i*100,engagedViews:700+i*50,ctr:6,retention30:65}});const text=rows=>JSON.stringify({schemaVersion:1,creatorId:'c',channelName:'Test',observations:rows});
test('initial baseline and four new results update current normal, preserve starting line',()=>{const initial=I.parse(text(Array.from({length:10},(_,i)=>row(i))),c,A.emptyStore(),'2026-02-01T00:00:00Z').next;assert.equal(initial.policies.length,1);const starting=initial.baselines.find(x=>x.kind==='starting');let next=initial;for(let i=10;i<14;i++)next=I.parse(text([row(i)]),c,next,'2026-02-02T00:00:00Z').next;assert.equal(next.baselines.filter(x=>x.kind==='operating').length,2);assert.deepEqual(next.baselines.find(x=>x.kind==='starting'),starting);assert.equal(next.observations[0].metrics.ctr,.06);assert.equal(I.parse(text([row(13)]),c,next,'2026-02-03T00:00:00Z').duplicates,1);});
test('invalid inputs never change saved data or invent missing metrics',()=>{const prior=A.emptyStore();assert.throws(()=>I.parse(text([row(1)]),{id:'other'},prior));assert.throws(()=>I.parse(text([{...row(1),metrics:{views:'1000'}}]),c,prior));assert.throws(()=>I.parse(text([row(1),row(1)]),c,prior));assert.throws(()=>I.parse(text([{...row(1),capturedAt:'2030-01-01T00:00:00Z'}]),c,prior));const p=I.parse(text([{...row(1),coverage:'unknown'}]),c,prior);assert.equal(p.next.policies.length,0);assert.equal(p.next.observations[0].metrics.apv,null);assert.deepEqual(prior,A.emptyStore());});

test('correcting report coverage is accepted, not discarded as a duplicate',()=>{const rows=Array.from({length:5},(_,i)=>row(i));const partial=I.parse(text(rows.map(x=>({...x,coverage:'unknown'}))),c,A.emptyStore(),'2026-02-01T00:00:00Z').next;assert.equal(partial.policies.length,0);const corrected=I.parse(text(rows),c,partial,'2026-02-02T00:00:00Z');assert.equal(corrected.added,5);assert.equal(corrected.next.policies.length,1);assert.equal(corrected.next.baselines.find(x=>x.kind==='starting').metrics.views.n,5);});

test('Studio prose around one JSON block imports; ambiguous blocks and prose do not',()=>{const packet=text([row(1)]);assert.equal(I.parse('Here you go:\n```json\n'+packet+'\n```\nCheck the report.',c,A.emptyStore()).added,1);assert.throws(()=>I.parse('Summary only',c,A.emptyStore()),/Nothing was saved/);assert.throws(()=>I.parse('```json\n'+packet+'\n```\n```json\n'+packet+'\n```',c,A.emptyStore()));assert.throws(()=>I.parse('null',c,A.emptyStore()));});


test('channel health import preserves New Casual Regular Returning and views per viewer',()=>{
  const payload=JSON.stringify({
    schemaVersion:1,creatorId:'c',channelName:'Test',observations:[],
    channelPeriods:[{
      start:'2025-10-01',end:'2025-12-29',source:'YouTube Studio Audience + Advanced Mode',metricDefinitionId:'studio-current',
      metrics:{views:10000,engagedViews:9000,impressions:100000,ctr:5.5,watchTime:800,newViewers:6000,casual:1800,regular:700,returning:2500,avgViewsPerViewer:1.6,browsePct:45,suggestedPct:30,searchPct:15,externalPct:5,uploadsPublished:12,newUploadViews:7000,libraryViews:3000,qualifiedLeads:null,bookings:null,sales:null,revenue:null},
      context:{paidNote:'Organic only',sourceNote:'Top Suggested: Example A',libraryNote:'Published-in-period filter vs older videos',attributionNote:null,notes:null}
    }]
  });
  const out=I.parse(payload,c,A.emptyStore(),'2026-02-01T00:00:00Z');
  assert.equal(out.periods.length,1);
  assert.equal(out.periods[0].metrics.newViewers,6000);
  assert.equal(out.periods[0].metrics.casual,1800);
  assert.equal(out.periods[0].metrics.regular,700);
  assert.equal(out.periods[0].metrics.returning,2500);
  assert.equal(out.periods[0].metrics.avgViewsPerViewer,1.6);
  assert.equal(out.periods[0].metrics.browsePct,45);
  assert.equal(out.periods[0].metrics.uploadsPublished,12);
  assert.equal(out.periods[0].metrics.newUploadViews,7000);
  assert.equal(out.periods[0].metrics.libraryViews,3000);
  assert.equal(out.periods[0].context.paidNote,'Organic only');
  assert.match(out.periods[0].context.sourceNote,/Suggested/);
});

test('video checkpoint prompt requests every WATCH metric and keeps channel periods separate',()=>{
  const p=I.prompt(c,168);
  for(const term of ['views','engagedViews','impressions','ctr','retention30','apv','avdSeconds'])assert.match(p,new RegExp(term));
  assert.match(p,/first-30-second/i);
  assert.match(p,/Do not derive APV/i);
  assert.match(p,/Do not include channelPeriods/i);
  assert.match(p,/exact first 7 days/i);
});

test('channel import rejects impossible traffic percentages instead of saving them',()=>{
  const payload=JSON.stringify({
    schemaVersion:1,creatorId:'c',channelName:'Test',observations:[],
    channelPeriods:[{start:'2025-10-01',end:'2025-12-29',source:'Studio',metricDefinitionId:'studio-current',metrics:{browsePct:140}}]
  });
  const out=I.parse(payload,c,A.emptyStore(),'2026-02-01T00:00:00Z');
  assert.equal(out.periods.length,0);
  assert.match(out.limitations.join(' '),/Invalid channel metric browsePct/);
});


test('one combined Studio response can import all four checkpoints and 90-day channel data together',()=>{
  const base=Date.parse('2026-01-01T12:00:00Z');
  const observations=[];
  for(const hours of [24,48,168,672]){
    for(let n=0;n<5;n++){
      observations.push({
        videoId:'combo-'+n,title:'Combo '+n,publishedAt:new Date(base+n*86400000).toISOString(),
        capturedAt:new Date(base+n*86400000+hours*3600000).toISOString(),
        windowHours:hours,format:'long',eraId:'a',definitionId:'studio-current',coverage:'exact',paid:'organic',traffic:'all',source:'Exact Studio '+hours+'h',
        metrics:{views:1000+n*10,engagedViews:800+n*10,impressions:10000+n*100,ctr:6,retention30:65,apv:45,avdSeconds:300}
      });
    }
  }
  const payload=JSON.stringify({
    schemaVersion:1,creatorId:'c',channelName:'Test',observations,
    channelPeriods:[
      {start:'2025-07-03',end:'2025-09-30',source:'Studio 90d A',metricDefinitionId:'studio-current',metrics:{views:10000,newViewers:6000,casual:1800,regular:700,returning:2500,avgViewsPerViewer:1.6,browsePct:45}},
      {start:'2025-10-01',end:'2025-12-29',source:'Studio 90d B',metricDefinitionId:'studio-current',metrics:{views:12000,newViewers:7000,casual:2000,regular:800,returning:2900,avgViewsPerViewer:1.7,browsePct:48}}
    ]
  });
  const out=I.parse(payload,c,A.emptyStore(),'2026-03-15T00:00:00Z');
  assert.equal(out.added,20);
  assert.equal(out.periods.length,2);
  for(const hours of [24,48,168,672])assert.equal(out.next.policies.some(p=>p.windowHours===hours),true);
  assert.equal(out.periods[1].metrics.regular,800);
});
