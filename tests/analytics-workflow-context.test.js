const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../analytics/workflow-context');

const read=(out,imp,ctr,ret,apv=ret)=>({r:{comparisons:{
  engagedViews:{multiple:out},views:{multiple:out},
  impressions:{multiple:imp},ctr:{deltaPp:ctr},retention30:{deltaPp:ret},apv:{deltaPp:apv}
}}});

function mocks(reads,audience={}){
  const W={clarityPattern:()=>({reads,max:reads.length>=3?3:reads.length,source:'hard',stages:['packaging'],label:'PACKAGING'})};
  const ADC={
    audienceRead:()=>({acquisitionBand:'unknown',loyaltyBand:'unknown',loyalty:null,loyaltyKey:null,...audience}),
    overallRead:()=>({stages:[{key:'result',value:'Business result not connected yet'}]})
  };
  return {W,ADC};
}

test('diagnosis questions answer the exact stage with creator-relative metrics',()=>{
  const {W,ADC}=mocks([read(1,1,-.9,0),read(1.1,1.05,-.7,1),read(.9,.95,-.8,-1)]);
  const q=A.questionAnswers({},W,ADC);
  assert.equal(q.outcome.label,'No clear problem here');
  assert.equal(q.show.label,'No clear problem here');
  assert.equal(q.click.label,'Yes, this is weak vs normal');
  assert.equal(q.watch.label,'No clear problem here');
  assert.match(q.click.line,/-0.8 pp/);
});

test('first unusual stage wins the working diagnosis',()=>{
  let m=mocks([read(.5,.5,-1,-5),read(.6,.6,-1,-4),read(.55,.5,-.8,-5)]);
  assert.equal(A.proposal({},m.W,m.ADC).leading,'Discovery / idea opportunity');

  m=mocks([read(.9,1,-1,0),read(1,1.1,-.8,0),read(1.05,.9,-.9,1)]);
  assert.equal(A.proposal({},m.W,m.ADC).leading,'Packaging / click');

  m=mocks([read(.9,1,0,-5),read(1,1.1,.2,-4),read(1.05,.9,0,-6)]);
  assert.equal(A.proposal({},m.W,m.ADC).leading,'Promise / opening / viewing experience');
});

test('audience trend only takes over after video funnel has no earlier clear issue',()=>{
  const m=mocks(
    [read(1,1,0,0),read(1.05,1.1,.1,1),read(.95,.9,-.1,-1)],
    {acquisitionBand:'weak',loyaltyBand:'strong',loyalty:1.2,loyaltyKey:'regular'}
  );
  const p=A.proposal({},m.W,m.ADC);
  assert.equal(p.leading,'Acquisition / gateway');
  assert.match(p.because,/new people/i);
});

test('APV is used when 30-second retention is missing',()=>{
  const W={clarityPattern:()=>({reads:[
    read(1,1,0,null,-5),read(1,1,0,null,-4),read(1,1,0,null,-6)
  ],max:3,source:'hard',stages:['retention'],label:'RETENTION'})};
  const ADC={audienceRead:()=>({acquisitionBand:'unknown',loyaltyBand:'unknown'}),overallRead:()=>({stages:[]})};
  const q=A.questionAnswers({},W,ADC);
  assert.equal(q.raw.watchMetric,'APV');
  assert.equal(q.watch.label,'Yes, this is weak vs normal');
});

test('missing evidence stays unknown instead of inventing a bottleneck',()=>{
  const W={clarityPattern:()=>({reads:[],max:0,source:'hard',stages:[]})};
  const ADC={audienceRead:()=>({acquisitionBand:'unknown',loyaltyBand:'unknown',loyalty:null}),overallRead:()=>({stages:[]})};
  const p=A.proposal({},W,ADC);
  assert.equal(p.leading,'Not enough evidence yet');
});
