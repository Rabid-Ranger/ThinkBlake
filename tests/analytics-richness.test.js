const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../analytics/richness');

test('keeps the full checkpoint flow visible without calling 28d optional',()=>{
  const html=R.flowStrip();
  assert.match(html,/24h[\s\S]*Launch/);
  assert.match(html,/48h[\s\S]*Triage/);
  assert.match(html,/7d[\s\S]*Diagnosis/);
  assert.match(html,/28d[\s\S]*Programming/);
  assert.match(html,/90d[\s\S]*Channel health/);
  assert.doesNotMatch(html,/optional/i);
});

test('channel deep dive surfaces library, audience, traffic, and business result evidence',()=>{
  const creator={coachOS:{analytics:{audienceSnapshots:[
    {asOf:'2026-07-01',monthlyAudience:1000,newViewers:700,casual:200,regular:50,returning:250,avgViewsPerViewer:1.4},
    {asOf:'2026-08-01',monthlyAudience:1300,newViewers:850,casual:260,regular:70,returning:310,avgViewsPerViewer:1.6}
  ]}}};
  const W={channel:()=>({comparable:true,starting:{views:10000,engagedViews:9000,impressions:100000,ctr:5,watchTime:500,browsePct:40,suggestedPct:20,searchPct:15,externalPct:5,uploadsPublished:8,newUploadViews:7000,libraryViews:3000,qualifiedLeads:20,bookings:5,sales:2,revenue:1000},current:{views:14000,engagedViews:12000,impressions:130000,ctr:5.5,watchTime:700,browsePct:50,suggestedPct:18,searchPct:12,externalPct:4,uploadsPublished:9,newUploadViews:8000,libraryViews:6000,qualifiedLeads:30,bookings:8,sales:3,revenue:1600,libraryNote:'Advanced Mode split',sourceNote:'Browse led'}})};
  const html=R.channelDeepDive(creator,W);
  assert.match(html,/Programming \+ library contribution/);
  assert.match(html,/Views from new uploads/);
  assert.match(html,/Views from older library/);
  assert.match(html,/Audience growth \+ loyalty/);
  assert.match(html,/Where the views came from/);
  assert.match(html,/RESULT · business outcome/);
  assert.match(html,/Qualified leads/);
  assert.match(html,/Source, filter, library, and attribution notes/);
});

test('missing deeper fields stay visibly missing instead of throwing or being invented',()=>{
  const html=R.channelDeepDive({coachOS:{analytics:{audienceSnapshots:[]}}},{channel:()=>({comparable:false,starting:{},current:{}})});
  assert.match(html,/Not recorded/);
  assert.match(html,/Business-result data is not connected yet/);
  assert.match(html,/Needs both exact split fields/);
});
