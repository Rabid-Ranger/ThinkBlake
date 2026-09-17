const {test}=require('node:test');
const assert=require('node:assert/strict');
const Compat=require('../analytics/legacy-baseline-compat');

test('legacy baselines receive missing metric shells without changing existing values',()=>{
  const creator={analyticsFoundation:{baselines:[
    {metrics:{views:{median:100,n:5}}},
    {metrics:{ctr:{median:.05}}},
    {}
  ]}};
  Compat.hydrateCreator(creator);
  const rows=creator.analyticsFoundation.baselines;
  assert.equal(rows[0].metrics.views.median,100);
  assert.equal(rows[0].metrics.avdSeconds.median,null);
  assert.equal(rows[1].metrics.ctr.n,0);
  assert.equal(rows[2].metrics.engagedViews.median,null);
});
