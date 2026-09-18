const test=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../analytics/engine');
const Import=require('../analytics/import');

const creator={id:'c_8ks712b',name:'Fanathem'};
const now='2026-09-18T12:50:00Z';

test('repairs Ask Studio markdown escapes, inner title quotes, and trailing svg text',()=>{
  const raw=`{
    "schemaVersion":1,
    "creatorId":"c\\_8ks712b",
    "channelName":"Fanathem",
    "observations":[{
      "videoId":"xC9d\\_ijfe7s",
      "title":""You're NOTHING Without Him" - Being Mrs. PewView",
      "publishedAt":"2026-09-03T16:34:58Z",
      "capturedAt":"2026-09-18T08:46:06Z",
      "windowHours":24,
      "format":"edited-long-form",
      "eraId":"current",
      "job":null,
      "definitionId":"unknown",
      "coverage":"exact",
      "paid":"unknown",
      "traffic":"all",
      "source":"YouTube Studio Analytics · Video Analytics (First 24 Hours)",
      "metrics":{"views":12731,"engagedViews":null,"impressions":55792,"ctr":7.36,"retention30":null,"apv":37.02,"avdSeconds":211,"browsePct":null,"suggestedPct":null,"searchPct":null,"externalPct":null}
    }],
    "channelPeriods":[{
      "start":"2026-06-20","end":"2026-09-17","source":"YouTube Studio Channel Analytics · Custom Date Range (90 days)","metricDefinitionId":"unknown",
      "metrics":{"views":1677972,"engagedViews":null,"impressions":6711916,"ctr":7.6,"watchTime":57004.096,"browsePct":49.45,"suggestedPct":3.03,"searchPct":4.99,"externalPct":0.4,"uploadsPublished":null,"newUploadViews":null,"libraryViews":null,"qualifiedLeads":null,"bookings":null,"sales":null,"revenue":null},
      "context":{"paidNote":"unable to verify","sourceNote":"Traffic sources report","libraryNote":null,"attributionNote":null,"notes":null}
    }],
    "audienceSnapshots":[{
      "asOf":"2026-09-15","windowDays":28,"source":"YouTube Studio Audience · Monthly audience","metricDefinitionId":"youtube-monthly-audience-28d",
      "metrics":{"monthlyAudience":null,"newViewers":231935,"casual":52792,"regular":2660,"returning":null,"avgViewsPerViewer":null},"notes":"Last 2 days excluded due to processing delay."
    }],
    "limitations":["Separate 48h, 7d and 28d rows unavailable."]
  }
  **svg**`;
  const out=Import.parse(raw,creator,Engine.emptyStore(),now);
  assert.equal(out.added,1);
  assert.equal(out.next.observations[0].videoId,'xC9d_ijfe7s');
  assert.equal(out.next.observations[0].title,'"You\'re NOTHING Without Him" - Being Mrs. PewView');
  assert.equal(out.periods.length,1);
  assert.equal(out.audienceSnapshots.length,1);
  assert.ok(out.formatRepairs.some(x=>/extra text/i.test(x)));
  assert.ok(out.formatRepairs.some(x=>/Markdown-style escape/i.test(x)));
  assert.ok(out.formatRepairs.some(x=>/unescaped quote/i.test(x)));
});

test('leaves valid strict JSON unchanged',()=>{
  const raw=JSON.stringify({schemaVersion:1,creatorId:creator.id,channelName:'Fanathem',observations:[],channelPeriods:[],audienceSnapshots:[],limitations:[]});
  const out=Import.parse(raw,creator,Engine.emptyStore(),now);
  assert.deepEqual(out.formatRepairs,[]);
});

test('still rejects content that cannot be repaired safely',()=>{
  assert.throws(()=>Import.parse('not json at all',creator,Engine.emptyStore(),now),/JSON object|malformed JSON/i);
});
