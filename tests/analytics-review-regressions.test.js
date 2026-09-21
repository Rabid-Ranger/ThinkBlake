const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../analytics/decision-context');
const C=require('../analytics/clarity');
const I=require('../analytics/import');
const R=require('../analytics/richness');
const creator=rows=>({coachOS:{analytics:{audienceSnapshots:rows}}});

test('same-date audience revisions are one period and do not imply healthy growth',()=>{
 const c=creator([{asOf:'2026-09-15',newViewers:100,returning:50},{asOf:'2026-09-15',newViewers:120,returning:60}]);
 const before=JSON.stringify(c),r=D.audienceRead(c);
 assert.equal(r.hasComparison,false);assert.equal(r.current.newViewers,120);assert.equal(r.acquisition,null);
 assert.match(D.audienceCoachRead(r).headline,/not a trend/);assert.equal(JSON.stringify(c),before);
 const html=R.channelDeepDive(c,{channel:()=>({starting:{},current:{}})});
 assert.match(html,/no distinct comparable period yet/);
});
test('latest audience revision compares with a distinct compatible period',()=>{
 const c=creator([{asOf:'2026-08-18',newViewers:100},{asOf:'2026-09-15',newViewers:110},{asOf:'2026-09-15',newViewers:130}]);
 assert.equal(D.audienceRead(c).acquisition,1.3);
 c.coachOS.analytics.audienceSnapshots.at(-1).scope='shorts';
 assert.equal(D.audienceRead(c).hasComparison,false);
});
test('impressions-only baseline retains its metric label in the overview',()=>{
 const c={coachOS:{baseline:{sets:[{id:'x',window:'_7d',confirmedComparable:true,impressions:125640}]}}};
 const read=D.overallRead(c,{},{});
 assert.ok(read.why.some(x=>x.includes('125,640 impressions')));
 assert.ok(!read.why.some(x=>x.includes('125,640 views')));
});
test('one clue does not rewrite the plan; multiple stages start at the earliest',()=>{
 const clue=D.deriveFocus({pattern:{max:1,n:6,source:'hard',stages:['reach','packaging','retention']}});
 assert.equal(clue.stageId,'reach');assert.match(D.focusAction(clue).video,/Keep the current plan/);
 const repeated=D.deriveFocus({pattern:{max:3,n:6,source:'hard',stages:['packaging','retention']}});
 assert.equal(repeated.stageId,'packaging');assert.match(D.focusAction(repeated).video,/title \+ thumbnail/);
 assert.match(D.focusAction('Title / thumbnail').video,/title \+ thumbnail/);
 assert.match(D.focusAction('Opening / watch experience').video,/cannot locate an opening problem/);
});
test('an unassigned winner retains the win without claiming strategic success',()=>{
 const r={status:'compared',comparisons:{views:{multiple:3.04},impressions:{multiple:1.39},ctr:{deltaPp:-.6},apv:{deltaPp:-4.8}}};
 const d=C.diagnose(r),s=C.strategistRead({}, {id:'v'},r,d,168);
 assert.equal(d.winner,true);assert.match(s.meaning,/still won/);assert.match(s.meaning,/Assign the intended job/);
 assert.match(s.next,/Keep the winning video/);assert.doesNotMatch(s.meaning,/a CLICK \/ packaging issue/);
});
test('missing checkpoint never becomes a healthy strategist read for any video job',()=>{
 for(const job of ['Unassigned','Reach','Trust','Convert']){
  const c={coachOS:{analytics:{videoJobs:{v:job}}}},d=C.diagnose(null);
  const s=C.strategistRead(c,{id:'v'},null,d,168);
  assert.equal(s.tone,'muted');assert.equal(s.meaning,d.explain);assert.equal(s.next,d.next);
 }
});
test('routine request is bounded, excludes saved rows and keeps missing fields honest',()=>{
 const c={id:'c',name:'Synthetic',analyticsFoundation:{observations:[{videoId:'abc123abc12',windowHours:168,metrics:{views:100}}]}};
 const p=I.routinePrompt(c,168);
 assert.match(p,/at most 5 newly eligible/);assert.doesNotMatch(p,/Use 10-20 previous comparable rows/);
 assert.match(p,/never send a single-field patch/);assert.match(p,/abc123abc12/);
 assert.match(p,/engagedViews/);assert.match(p,/same-age baseline/);
 assert.match(p,/Do not substitute lifetime totals, realtime totals/);
});
test('a partial library split cannot fabricate a share',()=>{
 const html=R.channelDeepDive(creator([]),{channel:()=>({starting:{},current:{newUploadViews:100}})});
 assert.match(html,/Needs both exact split fields/);assert.doesNotMatch(html,/100.0%/);
});
