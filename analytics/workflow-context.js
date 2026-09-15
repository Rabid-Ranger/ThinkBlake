(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.AcceleratorWorkflowAnalytics=api;if(root.document)api.install(root);}
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const n=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const median=xs=>{const a=xs.map(n).filter(v=>v!==null).sort((a,b)=>a-b);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
  const mult=v=>n(v)===null?'—':n(v).toFixed(2)+'×';
  const pp=v=>n(v)===null?'—':(n(v)>=0?'+':'')+n(v).toFixed(1)+' pp';
  const signedPct=r=>n(r)===null?'—':((r-1)>=0?'+':'')+((r-1)*100).toFixed(0)+'%';

  function rateSnapshot(reads,key){
    const xs=reads.map(x=>x.r?.comparisons?.[key]).filter(Boolean);
    const current=median(xs.map(x=>x.current)),baseline=median(xs.map(x=>x.baseline));
    const deltaPp=median(xs.map(x=>x.deltaPp));
    const multiple=median(xs.map(x=>n(x.current)!==null&&n(x.baseline)!==null&&n(x.baseline)!==0?n(x.current)/n(x.baseline):null));
    return {current,baseline,deltaPp,multiple};
  }
  function channelQuestionRead(c,W,ADC){
    const guide=(typeof globalThis!=='undefined'?globalThis.__acceleratorCoachGuide:null);
    const p=W?.clarityPattern?W.clarityPattern(c):{reads:[]},reads=p.reads||[];
    const fallback=guide?.recentVideoRead?guide.recentVideoRead(c):{};
    const values=key=>reads.map(x=>x.r?.comparisons?.[key]);
    const strictOutcome=median(reads.map(x=>{
      const a=x.r?.comparisons?.engagedViews?.multiple;
      return n(a)!==null?a:x.r?.comparisons?.views?.multiple;
    }));
    const strictShow=median(values('impressions').map(x=>x?.multiple));
    const clickStrict=rateSnapshot(reads,'ctr');
    const r30Strict=rateSnapshot(reads,'retention30');
    const apvStrict=rateSnapshot(reads,'apv');
    const avdStrict=rateSnapshot(reads,'avdSeconds');

    const fallbackRate=(current,ratioValue)=>{
      const cur=n(current),ratioN=n(ratioValue),base=cur!==null&&ratioN!==null&&ratioN!==0?cur/ratioN:null;
      return {current:cur,baseline:base,multiple:ratioN,deltaPp:cur!==null&&base!==null?cur-base:null};
    };
    const clickFallback=fallbackRate(fallback.ctr,fallback.ctrRatio);
    const r30Fallback=fallbackRate(fallback.ret30,fallback.retRatio);

    const chooseRate=(strict,fallbackRateObj)=>{
      const usableStrict=n(strict.multiple)!==null||n(strict.deltaPp)!==null||n(strict.current)!==null;
      return usableStrict?strict:fallbackRateObj;
    };

    const outcome=n(strictOutcome)!==null?strictOutcome:n(fallback.viewRatio);
    const show=n(strictShow)!==null?strictShow:n(fallback.impRatio);
    const click=chooseRate(clickStrict,clickFallback);
    const r30=chooseRate(r30Strict,r30Fallback);
    const apv=apvStrict;
    const watch=n(r30.multiple)!==null||n(r30.deltaPp)!==null?r30:apv;
    const watchMetric=watch===r30?'0:30':'APV';
    const avd=avdStrict;
    const audience=ADC?.audienceRead?ADC.audienceRead(c):{};
    const overall=ADC?.overallRead?ADC.overallRead(c,W,guide):null;
    const jobs=guide?.jobScorecard?guide.jobScorecard(c):[];
    return {
      p,reads,fallback,outcome,show,click,watch,watchMetric,avd,audience,overall,jobs,
      sample:Math.max(reads.length,n(fallback.n)||0),
      sources:{
        outcome:n(strictOutcome)!==null?'verified Analytics workspace':'saved channel diagnosis data',
        show:n(strictShow)!==null?'verified Analytics workspace':'saved channel diagnosis data',
        click:(n(clickStrict.multiple)!==null||n(clickStrict.deltaPp)!==null)?'verified Analytics workspace':'saved channel diagnosis data',
        watch:(n(r30Strict.multiple)!==null||n(r30Strict.deltaPp)!==null||n(apvStrict.multiple)!==null)?'verified Analytics workspace':'saved channel diagnosis data'
      }
    };
  }
  function countAnswer(v,kind='outcome',sample=0){
    const name=kind==='show'?'opportunity':'outcome';
    if(v===null)return {
      tone:'muted',label:'Not enough data yet',
      line:'We do not have a fair '+(kind==='show'?'impression':'views / engaged-views')+' comparison yet.',
      meaning:'We cannot answer this question confidently yet.',
      next:kind==='show'?'Add or verify 7-day impressions for a few similar recent videos.':'Add or verify the 7-day result for a few similar recent videos.'
    };
    if(v<.7)return {
      tone:'bad',label:kind==='show'?'Yes. YouTube is showing these videos less than usual.':'Yes. Recent videos are clearly below normal.',
      line:'Recent middle result: '+mult(v)+' of what this creator usually gets'+(sample?' across '+sample+' 7-day video'+(sample===1?'':'s'):'')+'.',
      meaning:kind==='show'?'This is a real clue. YouTube is not showing these videos as much as it usually does.':'The videos really are under normal, so keep checking where the drop starts.',
      next:kind==='show'?'Before changing the title or thumbnail, check the topic, who the video reached, and where the views came from.':'Next, check whether YouTube showed the videos as much as usual.'
    };
    if(v<1.3)return {
      tone:'normal',label:kind==='show'?'No. YouTube is showing these videos about as much as usual.':'No clear problem here.',
      line:'Recent middle result: '+mult(v)+' of what this creator usually gets'+(sample?' across '+sample+' 7-day video'+(sample===1?'':'s'):'')+'.',
      meaning:kind==='show'?'How often YouTube showed the videos does not look like the problem.':'The result is close to what this creator usually gets.',
      next:kind==='show'?'Next, check whether people clicked when they saw the videos.':'Do not treat normal results like a channel problem. Only dig deeper if something else in the channel points to an issue.'
    };
    return {
      tone:v>=1.7?'great':'good',
      label:kind==='show'?'No. YouTube is showing these videos more than usual.':'No. Results are above normal.',
      line:'Recent middle result: '+mult(v)+' of what this creator usually gets'+(sample?' across '+sample+' 7-day video'+(sample===1?'':'s'):'')+'.',
      meaning:kind==='show'?'YouTube is showing these videos more than it usually does.':'This looks like a strength, not a problem.',
      next:kind==='show'?'If the result is still weak, check CLICK and WATCH next. The problem is not that YouTube failed to show it.':'Protect what is working and figure out what you can repeat before changing it.'
    };
  }
  function rateAnswer(rate,label,thresholdRatio,missingMetric){
    const ratioV=n(rate?.multiple),delta=n(rate?.deltaPp),current=n(rate?.current),baseline=n(rate?.baseline);
    const currentTxt=current===null?'—':current.toFixed(1)+'%';
    const baselineTxt=baseline===null?'—':baseline.toFixed(1)+'%';
    if(ratioV===null&&delta===null)return {
      tone:'muted',label:'Not enough data yet',
      line:'We do not have a fair comparison for '+missingMetric+'.',
      meaning:'The raw '+label+' number by itself is not enough to call this a problem.',
      next:'Add or verify the 7-day '+missingMetric+' normal and a few similar recent videos.'
    };
    const weak=(ratioV!==null&&ratioV<thresholdRatio)||(ratioV===null&&delta!==null&&delta<(label==='CTR'?-0.5:-3));
    const soft=!weak&&((ratioV!==null&&ratioV<.85)||(delta!==null&&delta<(label==='CTR'?-0.5:-3)));
    const strong=(ratioV!==null&&ratioV>=1.15)||(ratioV===null&&delta!==null&&delta>(label==='CTR'?0.5:3));
    const line=(current!==null&&baseline!==null?label+' '+currentTxt+' vs '+baselineTxt+' normal':label+' comparison available')+
      (ratioV!==null?' · '+mult(ratioV)+' normal':'')+(delta!==null?' · '+pp(delta):'');
    if(weak)return {
      tone:'bad',label:'Yes. This looks clearly weak for this creator.',
      line,
      meaning:label==='CTR'?'People are clicking these videos less than they usually do for this creator.':'People are watching less than they usually do after clicking.',
      next:label==='CTR'?'First check whether YouTube showed the video to a broader audience and where the views came from. If that does not explain it, the title/thumbnail is likely the issue.':'Open the retention graph and check the first 30–60 seconds. Find where viewers start leaving more than usual.'
    };
    if(soft)return {
      tone:'warn',label:'A little below normal, but not enough to call it the main problem.',
      line,
      meaning:label==='CTR'?'CTR is a little low, but not low enough by itself to say the title/thumbnail is the main problem.':'Watch performance is a little low, but not low enough by itself to say retention is the main problem.',
      next:label==='CTR'?'Keep it in mind, check where the views came from, then look at WATCH.':'Keep it in mind and continue to RETURN + RESULT.'
    };
    if(strong)return {
      tone:'good',label:'No. This looks stronger than usual.',
      line,
      meaning:label==='CTR'?'Clicking does not look like the problem.':'Watching does not look like the problem.',
      next:label==='CTR'?'Move to WATCH.':'Protect the viewing pattern and continue to RETURN + RESULT.'
    };
    return {
      tone:'normal',label:'Nothing looks clearly wrong here.',
      line,
      meaning:label==='CTR'?'CTR is close to what this creator usually gets, so I would not stop here.':'Watch performance is close to what this creator usually gets, so I would not stop here.',
      next:label==='CTR'?'Next, look at WATCH unless the traffic source clearly changed.':'Next, look at RETURN + RESULT.'
    };
  }
  function questionAnswers(c,W,ADC){
    const r=channelQuestionRead(c,W,ADC);
    const out=countAnswer(r.outcome,'outcome',r.sample);
    const show=countAnswer(r.show,'show',r.sample);
    const click=rateAnswer(r.click,'CTR',.7,'CTR');
    const watch=rateAnswer(r.watch,r.watchMetric,.7,r.watchMetric==='0:30'?'first-30-second retention':'APV');

    if(n(r.show)!==null&&r.show>=1.7&&(click.tone==='bad')){
      click.meaning='CTR is weak, but impressions are strongly expanded. Wider/colder distribution can lower CTR without proving the package is broken.';
      click.next='Check traffic source and audience breadth first. Only call packaging the bottleneck if CTR remains weak in comparable source context.';
    }

    const a=r.audience||{},trend=(key,label)=>{
      const cur=n(a.current?.[key]),prev=n(a.previous?.[key]),rr=cur!==null&&prev!==null&&prev!==0?cur/prev:null;
      return rr===null?null:{label,ratio:rr,text:label+' '+signedPct(rr)};
    };
    const audienceTrends=[trend('newViewers','New'),trend('casual','Casual'),trend('regular','Regular'),trend('returning','Returning')].filter(Boolean);
    const loyaltyWeak=a.loyaltyBand==='weak',loyaltyStrong=a.loyaltyBand==='strong';
    const jobParts=(r.jobs||[]).map(j=>{
      const bits=[j.job];
      if(n(j.viewRatio)!==null)bits.push(mult(j.viewRatio)+' view result');
      if(n(j.yield)!==null)bits.push(j.yield.toFixed(1)+' leads / 1K views');
      else if(n(j.leads)!==null)bits.push(j.leads.toFixed(1)+' median leads');
      return bits.join(' · ');
    });
    const resultStage=r.overall?.stages?.find(x=>x.key==='result');
    let rrTone='muted',rrLabel='I can’t fully answer RETURN + RESULT yet',rrMeaning='Audience and/or business-result trend is incomplete.',rrNext='Add a comparable audience snapshot and connect the job-specific result you care about.';
    if(audienceTrends.length){
      rrTone=loyaltyWeak?'bad':loyaltyStrong?'good':'normal';
      rrLabel=loyaltyWeak?'RETURN is weakening.':loyaltyStrong?'RETURN is strengthening.':'RETURN is roughly steady.';
      rrMeaning=a.acquisitionBand==='weak'&&['steady','strong'].includes(a.loyaltyBand)
        ?'Existing viewers are healthier than new-viewer acquisition. That points more toward Reach / gateway pressure.'
        :['steady','strong'].includes(a.acquisitionBand)&&a.loyaltyBand==='weak'
        ?'New people are arriving, but repeat behavior is weaker. That points more toward Trust / pathway pressure.'
        :'Audience movement does not isolate one simple Reach-vs-Trust problem yet.';
      rrNext=a.acquisitionBand==='weak'&&['steady','strong'].includes(a.loyaltyBand)
        ?'Bias the plan toward qualified Reach/gateway ideas while protecting click and watch.'
        :['steady','strong'].includes(a.acquisitionBand)&&a.loyaltyBand==='weak'
        ?'Bias the plan toward Trust/pathway videos, follow-ups and continuation.'
        :'Use the video job scorecard and business result to decide what the next content mix should prove.';
    }
    const returnResult={
      tone:rrTone,label:rrLabel,
      line:(audienceTrends.length?audienceTrends.map(x=>x.text).join(' · '):'No comparable New / Casual / Regular / Returning trend yet.')+
        (jobParts.length?' | Jobs: '+jobParts.join(' | '):'')+
        (resultStage?.value?' | '+resultStage.value:''),
      meaning:rrMeaning,next:rrNext
    };
    return {raw:r,outcome:out,show,click,watch,returnResult};
  }
  function planJobFocus(leading,overall){
    const x=String(leading||'').toLowerCase();
    if(x.includes('discovery')||x.includes('acquisition')||x.includes('gateway'))return 'Reach';
    if(x.includes('loyalty')||x.includes('pathway'))return 'Trust';
    if(x.includes('business')||x.includes('convert'))return 'Convert';
    if(x.includes('packag')||x.includes('opening')||x.includes('viewing')||x.includes('retention'))return overall?.action?.job||'Keep intended Reach / Trust / Convert job, fix this execution layer across it';
    if(x.includes('growth'))return 'Protect the job mix producing the wins';
    return overall?.action?.job||'Decide from the plan';
  }
  function proposal(c,W,ADC){
    const q=questionAnswers(c,W,ADC),r=q.raw,a=r.audience||{},p=r.p||{};
    let leading='Not enough evidence yet',because='',next='',alternative='',confidence='Low';
    if(r.outcome===null){
      because='We still cannot answer OUTCOME because we do not have a fair 7-day comparison yet.';
      next='Verify the 7-day result before deciding what the main issue is.';
    }else if(r.show!==null&&r.show<.7){
      leading='Topic / Reach';
      because='The videos are under normal, and the first place the drop shows up is SHOW: YouTube is showing them at '+mult(r.show)+' of the usual level.';
      next='Check the topic, who the video reached, and where the views came from before changing the title or thumbnail.';
      alternative='A narrower intentional audience, source shift or mixed comparison set could lower impressions without making the idea bad.';
    }else if((n(r.click?.multiple)!==null&&r.click.multiple<.7)||(n(r.click?.multiple)===null&&n(r.click?.deltaPp)!==null&&r.click.deltaPp<-.5)){
      leading='Packaging / click';
      because='SHOW is not the first clear failure, but CLICK is. '+q.click.line;
      next=q.click.next;
      alternative='A colder or broader audience mix can cool CTR without proving the package is bad.';
    }else if((n(r.watch?.multiple)!==null&&r.watch.multiple<.7)||(n(r.watch?.multiple)===null&&n(r.watch?.deltaPp)!==null&&r.watch.deltaPp<-3)){
      leading='Promise / opening / viewing experience';
      because='SHOW and CLICK hold better, while WATCH is the first clear weak stage. '+q.watch.line;
      next=q.watch.next;
      alternative='Traffic source or audience-temperature changes can depress retention without proving structure is the only cause.';
    }else if(a.acquisitionBand==='weak'&&['steady','strong'].includes(a.loyaltyBand)){
      leading='Reach / getting new viewers in';
      because='The video-level numbers do not show an earlier problem, but New viewers are falling while repeat viewers are healthier.';
      next='Make more Reach videos around proven audience problems, while keeping CTR and watch quality healthy.';
      alternative='Seasonality or an intentional core-audience period can reduce new viewers without representing a structural problem.';
    }else if(['steady','strong'].includes(a.acquisitionBand)&&a.loyaltyBand==='weak'){
      leading='Trust / getting viewers to come back';
      because='The video-level numbers do not show an earlier problem, but repeat viewing is weaker than new-viewer growth.';
      next='Make clearer follow-ups, series, and obvious next videos so people know what to watch next.';
      alternative='A recent discovery spike can temporarily make repeat-viewer ratios look weaker.';
    }else if(r.outcome!==null&&r.outcome>=1.3){
      leading='Growth pattern worth protecting';
      because='Recent mature outcomes are above creator normal and no earlier stage is clearly broken.';
      next='Protect the repeatable winning mechanism and make adjacent follow-ups before changing the system.';
      alternative='One or two outliers may still be carrying the recent sample.';
    }else{
      because='The numbers do not point to one clear problem yet.';
      next='Use the rest of the diagnosis questions. Do not force a channel-wide problem when the numbers are mixed or normal.';
      alternative='The issue may be what you are making, the market, the audience, the business, or capacity rather than one video metric.';
    }
    if((p.max||0)>=3)confidence='Medium';
    else if((p.max||0)>=2)confidence='Low';
    const jobFocus=planJobFocus(leading,r.overall);
    return {leading,because,next,alternative,confidence,jobFocus,q};
  }
  function answerHtml(question,x,detail=''){
    return '<div class="awf-answer '+x.tone+'">'+
      '<span>WHAT THE DATA SAYS</span>'+
      '<b>'+esc(x.label)+'</b>'+
      '<p class="awf-answer-evidence">'+esc(x.line)+'</p>'+
      '<div class="awf-answer-grid"><div><small>WHAT IT MEANS</small><p>'+esc(x.meaning||'')+'</p></div><div><small>WHAT I’D CHECK NEXT</small><p>'+esc(x.next||'')+'</p></div></div>'+
      (detail?'<em>'+esc(detail)+'</em>':'')+
    '</div>';
  }
  function injectDiagnosis(win,c,W,ADC){
    const drawer=win.document.getElementById('drawerBack');
    if(!drawer||!drawer.classList.contains('show')||!/Channel Diagnosis/i.test(drawer.textContent||''))return;
    const q=questionAnswers(c,W,ADC),map=[
      ['1 · OUTCOME',q.outcome,'Uses mature same-age views / engaged views. Source: '+q.raw.sources.outcome+'.'],
      ['2 · SHOW',q.show,'Uses same-age registered impressions. Source: '+q.raw.sources.show+'.'],
      ['3 · CLICK',q.click,'Uses CTR vs creator normal, with impression expansion context. Source: '+q.raw.sources.click+'.'],
      ['4 · WATCH',q.watch,'Uses 0:30 first, APV fallback, AVD as support when available. Source: '+q.raw.sources.watch+'.'],
      ['5 · RETURN + RESULT',q.returnResult,'Uses New / Casual / Regular / Returning trend plus Reach / Trust / Convert job results when available.']
    ];
    for(const [label,val,detail] of map){
      const d=[...drawer.querySelectorAll('details.cg-decision')].find(x=>(x.querySelector('summary span')?.textContent||'').trim()===label);
      if(!d)continue;
      const body=d.querySelector('.cg-decision-body');if(!body)continue;
      const html=answerHtml(label,val,detail);
      let box=body.querySelector('.awf-answer');
      if(!box){const t=win.document.createElement('template');t.innerHTML=html;body.prepend(t.content.firstElementChild);}
      else if(box.dataset.sig!==html){const t=win.document.createElement('template');t.innerHTML=html;const fresh=t.content.firstElementChild;fresh.dataset.sig=html;box.replaceWith(fresh);}
    }
    const saved=c.coachOS?.diagnosis||{},prop=proposal(c,W,ADC);
    const summaryHtml='<section class="awf-diagnosis-decision '+(prop.leading==='Not enough evidence yet'?'muted':'focus')+'" id="awf-diagnosis-decision">'+
      '<div class="awf-kicker">WHAT THE DATA IS POINTING TO</div>'+
      '<h3>'+esc(prop.leading)+'</h3>'+
      '<p>'+esc(prop.because)+'</p>'+
      '<div class="awf-plan-link"><span>WHAT THIS MEANS FOR THE PLAN</span><b>'+esc(prop.jobFocus)+'</b><p>'+esc(prop.next)+'</p></div>'+
      '<small>'+esc(prop.confidence)+' confidence. The metric sequence suggests where to focus. Creator goals, offer, audience fit, capacity and business context still confirm the final diagnosis.</small>'+
    '</section>';
    const summary=drawer.querySelector('#awf-diagnosis-decision');
    if(!summary){const first=drawer.querySelector('.cg-section');if(first){const t=win.document.createElement('template');t.innerHTML=summaryHtml;first.after(t.content.firstElementChild);}}
    else if(summary.dataset.sig!==summaryHtml){const t=win.document.createElement('template');t.innerHTML=summaryHtml;const fresh=t.content.firstElementChild;fresh.dataset.sig=summaryHtml;summary.replaceWith(fresh);}
    if(!saved.savedAt){
      const set=(id,v)=>{const el=drawer.querySelector('#'+id);if(el&&v!=null)el.value=v;};
      set('cg-d-leading',prop.leading);set('cg-d-confidence',prop.confidence);set('cg-d-because',prop.because);set('cg-d-alt',prop.alternative);set('cg-d-next',prop.next);
    }
  }

  function reviewWindow(drawer){
    const text=(drawer?.querySelector('h2')?.textContent||drawer?.textContent||'').toLowerCase();
    if(text.includes('24h')||text.includes('24 hour'))return {win:'_24h',hours:24};
    if(text.includes('48h')||text.includes('48 hour'))return {win:'_48h',hours:48};
    if(text.includes('7d')||text.includes('7 day'))return {win:'_7d',hours:168};
    if(text.includes('28d')||text.includes('28 day'))return {win:'_28d',hours:672};
    const label=drawer?.querySelector('label.cg-confirm')?.textContent?.toLowerCase()||'';
    if(label.includes('24'))return {win:'_24h',hours:24};
    if(label.includes('48'))return {win:'_48h',hours:48};
    if(label.includes('7'))return {win:'_7d',hours:168};
    if(label.includes('28'))return {win:'_28d',hours:672};
    return null;
  }
  function readInput(drawer,id,fallback){
    const el=drawer.querySelector('#'+id);return n(el?.value)!==null?n(el.value):n(fallback);
  }
  function liveReviewRead(win,c,v,W,guide,drawer){
    const rw=reviewWindow(drawer);if(!rw||!v)return null;
    const b=guide?.sameAgeBaseline?guide.sameAgeBaseline(c,rw.win,v):null;
    if(!b)return {rw,status:'needs_baseline'};
    const cur={
      views:readInput(drawer,'cg-r-views',v.analytics?.[rw.win]?.views),
      engagedViews:readInput(drawer,'cg-r-engaged',v.analytics?.[rw.win]?.engagedViews),
      impressions:readInput(drawer,'cg-r-impressions',v.analytics?.[rw.win]?.impressions),
      ctr:readInput(drawer,'cg-r-ctr',v.analytics?.[rw.win]?.ctr),
      ret30:readInput(drawer,'cg-r-ret30',v.analytics?.[rw.win]?.ret30),
      apv:readInput(drawer,'cg-r-apv',v.analytics?.[rw.win]?.apv),
      avdSeconds:readInput(drawer,'cg-r-avd',v.analytics?.[rw.win]?.avdSeconds)
    };
    const outcomeKey=cur.engagedViews!==null&&n(b.engagedViews)!==null?'engagedViews':'views';
    const cmp=(a,z)=>n(a)!==null&&n(z)!==null&&n(z)!==0?n(a)/n(z):null;
    const comparisons={
      views:{current:cur.views,baseline:n(b.views),multiple:cmp(cur.views,b.views)},
      engagedViews:{current:cur.engagedViews,baseline:n(b.engagedViews),multiple:cmp(cur.engagedViews,b.engagedViews)},
      impressions:{current:cur.impressions,baseline:n(b.impressions),multiple:cmp(cur.impressions,b.impressions)},
      ctr:{current:cur.ctr,baseline:n(b.ctr),deltaPp:n(cur.ctr)!==null&&n(b.ctr)!==null?cur.ctr-b.ctr:null},
      retention30:{current:cur.ret30,baseline:n(b.ret30),deltaPp:n(cur.ret30)!==null&&n(b.ret30)!==null?cur.ret30-b.ret30:null},
      apv:{current:cur.apv,baseline:n(b.apv),deltaPp:n(cur.apv)!==null&&n(b.apv)!==null?cur.apv-b.apv:null},
      avdSeconds:{current:cur.avdSeconds,baseline:n(b.avdSeconds),multiple:cmp(cur.avdSeconds,b.avdSeconds)}
    };
    const has=Object.values(comparisons).some(x=>n(x.current)!==null&&n(x.baseline)!==null);
    if(!has)return {rw,status:'needs_data',b,cur,comparisons};
    const d=W?.clarityDiagnose
      ?W.clarityDiagnose({status:'compared',comparisons},rw.hours)
      :null;
    return {rw,status:'compared',b,cur,comparisons,d,outcomeKey};
  }
  function liveReviewHtml(read){
    if(!read||read.status==='needs_baseline')return '<section class="awf-live muted" id="awf-live-review"><div class="awf-kicker">LIVE READ VS THIS CREATOR’S USUAL NUMBERS</div><h3>No fair comparison yet</h3><p>Set up what this creator usually gets at this point before judging this result.</p></section>';
    if(read.status==='needs_data')return '<section class="awf-live muted" id="awf-live-review"><div class="awf-kicker">LIVE READ VS THIS CREATOR’S USUAL NUMBERS</div><h3>Add the checkpoint numbers</h3><p>As you enter the results below, this panel will update against the creator’s same-age normal.</p></section>';
    const c=read.comparisons,d=read.d||{},watch=n(c.retention30.deltaPp)!==null?['0:30',pp(c.retention30.deltaPp)]:['APV',pp(c.apv.deltaPp)],avd=n(c.avdSeconds?.multiple)!==null?mult(c.avdSeconds.multiple):'—';
    return '<section class="awf-live '+esc(d.tone||'normal')+'" id="awf-live-review"><div class="awf-live-head"><div><div class="awf-kicker">LIVE SAME-AGE READ · '+esc(read.rw.hours===24?'24H':read.rw.hours===48?'48H':read.rw.hours===168?'7D':'28D')+'</div><h3>'+esc(d.headline||'Current read')+'</h3><p>'+esc(d.explain||'Compared with this creator’s same-age normal.')+'</p></div><div class="awf-bottleneck"><span>BOTTLENECK</span><b>'+esc(d.bottleneck||'—')+'</b></div></div><div class="awf-live-metrics"><div><span>OUTCOME</span><b>'+mult(c[read.outcomeKey]?.multiple)+'</b><small>vs normal</small></div><div><span>SHOW</span><b>'+mult(c.impressions.multiple)+'</b><small>impressions</small></div><div><span>CLICK</span><b>'+pp(c.ctr.deltaPp)+'</b><small>CTR vs normal</small></div><div><span>WATCH</span><b>'+esc(watch[1])+'</b><small>'+esc(watch[0])+' vs normal · AVD '+esc(avd)+'</small></div></div><p><b>What I would do next:</b> '+esc(d.next||'Keep collecting evidence before changing strategy.')+'</p><button class="btn" data-awf-use-read>Use this read in the review</button></section>';
  }
  function fillReview(drawer,read){
    if(!read?.d)return;
    const c=read.comparisons,d=read.d,out=read.outcomeKey;
    const values={
      'cg-r-see':(c[out]?.multiple!==null?'Outcome is '+mult(c[out].multiple)+' normal. ':'')+'Current read: '+d.bottleneck+'.',
      'cg-r-compare':'Compared with this creator’s matched '+(read.rw.hours===24?'24-hour':read.rw.hours===48?'48-hour':read.rw.hours===168?'7-day':'28-day')+' baseline.',
      'cg-r-unusual':d.bottleneck==='NO CLEAR ISSUE'?'Nothing looks clearly off.':d.bottleneck,
      'cg-r-mean':d.explain||'',
      'cg-r-notprove':'This comparison shows where the problem might be. It does not prove why it happened.',
      'cg-r-next':d.next||'',
      'cg-r-decision':d.next||''
    };
    for(const [id,val] of Object.entries(values)){const el=drawer.querySelector('#'+id);if(el&&!String(el.value||'').trim())el.value=val;}
  }
  function learnPageHtml(c,v,W){
    if(!v||!W?.clarityReadFor)return '';
    const reads=[24,48,168,672].map(hours=>{
      let x=null;try{x=W.clarityReadFor(c,v,hours)}catch(_){}
      const multiple=x?.d?.outcomeMultiple;
      return {hours,x,multiple};
    });
    const latest=[...reads].reverse().find(x=>x.x?.r?.status==='compared')||reads.find(x=>x.x?.r?.status==='compared');
    const label=h=>h===24?'24h':h===48?'48h':h===168?'7d':'28d';
    const pills=reads.map(x=>{
      const d=x.x?.d;
      return '<div class="awf-learn-pill '+esc(d?.tone||'muted')+'"><span>'+label(x.hours)+'</span><b>'+(n(x.multiple)!==null?mult(x.multiple):'—')+'</b><small>'+esc(d?.bottleneck||'No comparable read yet')+'</small></div>';
    }).join('');
    if(!latest||!latest.x?.d)return '<section class="awf-learn-page muted" id="awf-learn-page"><div class="awf-kicker">HOW THIS VIDEO IS TRACKING</div><h3>No fair checkpoint comparison yet</h3><p>Add the next checkpoint. Learn will compare it with what this creator usually gets at that point after publishing.</p><div class="awf-learn-pills">'+pills+'</div></section>';
    const d=latest.x.d;
    return '<section class="awf-learn-page '+esc(d.tone||'normal')+'" id="awf-learn-page"><div class="awf-learn-head"><div><div class="awf-kicker">LATEST BASELINE READ · '+label(latest.hours)+'</div><h3>'+esc(d.headline||d.bottleneck||'Current read')+'</h3><p>'+esc(d.explain||'Compared with this creator’s same-age normal.')+'</p></div><div class="awf-bottleneck"><span>WHAT TO CARRY FORWARD</span><b>'+esc(d.next||'Keep collecting evidence.')+'</b></div></div><div class="awf-learn-pills">'+pills+'</div><p><b>Use Learn like this:</b> 24h = early read, 48h = problem check, 7d = main diagnosis, 28d = programming lesson. Save what changed, what it might mean, and what the next video should do differently.</p></section>';
  }
  function injectLearnPage(win,c,W){
    let view='';try{view=win.AcceleratorDeskBridge?.view?.()||''}catch(_){}
    const old=win.document.getElementById('awf-learn-page');
    if(view!=='learn'){if(old&&!old.closest('#drawerBack'))old.remove();return;}
    const v=win.AcceleratorDeskBridge?.currentVideo?.();if(!v)return;
    const strip=win.document.getElementById('cg-context-strip'),page=strip?.parentElement||win.document.querySelector('main .page,.page');if(!page)return;
    const html=learnPageHtml(c,v,W);if(!html)return;
    if(!old){const t=win.document.createElement('template');t.innerHTML=html;(strip||page.firstElementChild)?.after(t.content.firstElementChild);}
    else if(old.dataset.sig!==html){const t=win.document.createElement('template');t.innerHTML=html;const fresh=t.content.firstElementChild;fresh.dataset.sig=html;old.replaceWith(fresh);}
  }
  function injectLearn(win,c,W,guide){
    const drawer=win.document.getElementById('drawerBack');
    if(!drawer||!drawer.classList.contains('show')||!drawer.querySelector('#cg-r-views'))return;
    const v=win.AcceleratorDeskBridge?.currentVideo?.();if(!v)return;
    const read=liveReviewRead(win,c,v,W,guide,drawer),html=liveReviewHtml(read);
    let panel=drawer.querySelector('#awf-live-review');
    if(!panel){const first=drawer.querySelector('.cg-section');if(first){const t=win.document.createElement('template');t.innerHTML=html;first.before(t.content.firstElementChild);}}
    else if(panel.dataset.sig!==html){const t=win.document.createElement('template');t.innerHTML=html;const fresh=t.content.firstElementChild;fresh.dataset.sig=html;panel.replaceWith(fresh);}
    drawer.querySelector('[data-awf-use-read]')?.addEventListener('click',()=>fillReview(drawer,read),{once:true});
  }

  function install(win){
    if(win.__acceleratorWorkflowAnalyticsV1)return;win.__acceleratorWorkflowAnalyticsV1=true;
    const W=win.AcceleratorAnalyticsWorkspace,ADC=win.AcceleratorDecisionContext,guide=win.__acceleratorCoachGuide;
    if(!W||!guide)return;
    const current=()=>win.AcceleratorDeskBridge?.current?.()||null;
    let queued=false;
    const paint=()=>{if(queued)return;queued=true;win.requestAnimationFrame(()=>{queued=false;const c=current();if(!c)return;injectDiagnosis(win,c,W,ADC);injectLearnPage(win,c,W);injectLearn(win,c,W,guide);});};
    new MutationObserver(paint).observe(win.document.documentElement,{childList:true,subtree:true});
    win.document.addEventListener('input',e=>{if(e.target.closest?.('#drawerBack')&&/^cg-r-/.test(e.target.id||''))paint();});
    win.document.addEventListener('change',e=>{if(e.target.closest?.('#drawerBack'))paint();});
    const style=win.document.createElement('style');style.id='awf-style';style.textContent=`
      .awf-kicker{font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;opacity:.65}
      .awf-answer{grid-column:1/-1;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-left:4px solid #55757a;border-radius:10px;padding:11px;background:color-mix(in srgb,currentColor 3%,transparent);display:grid;gap:4px}.awf-answer span{font-size:9px;font-weight:900;letter-spacing:.08em}.awf-answer b{font-size:14px}.awf-answer p,.awf-answer small{margin:0;font-size:12px;line-height:1.4}.awf-answer-evidence{font-weight:650}.awf-answer-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:5px}.awf-answer-grid>div{padding:9px;border-radius:8px;background:rgba(84,110,116,.055)}.awf-answer-grid small{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;margin-bottom:3px}.awf-answer em{font-style:normal;font-size:10px;opacity:.65}.awf-plan-link{margin:12px 0;padding:12px;border-radius:10px;background:rgba(54,111,122,.07);display:grid;gap:4px}.awf-plan-link span{font-size:9px;font-weight:900;letter-spacing:.08em}.awf-plan-link p{margin:0}.awf-plan-link b{font-size:15px}.awf-answer.bad{border-left-color:#b54b4b}.awf-answer.good,.awf-answer.great{border-left-color:#2f8464}.awf-answer.muted{opacity:.7}
      .awf-diagnosis-decision,.awf-live{margin:0 0 14px;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:color-mix(in srgb,currentColor 3%,transparent)}.awf-diagnosis-decision h3,.awf-live h3{margin:4px 0 6px}.awf-diagnosis-decision p,.awf-live p{line-height:1.45}.awf-diagnosis-decision.focus{border-left-color:#366f7a}.awf-diagnosis-decision.muted,.awf-live.muted{opacity:.72}
      .awf-learn-page{margin:0 0 14px;border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:var(--card,#fff)}.awf-learn-page.bad{border-left-color:#b54b4b}.awf-learn-page.warn{border-left-color:#b5822e}.awf-learn-page.good,.awf-learn-page.great{border-left-color:#2f8464}.awf-learn-page.muted{opacity:.72}.awf-learn-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,420px);gap:14px}.awf-learn-head h3{margin:4px 0 6px}.awf-learn-head p{margin:0;line-height:1.45}.awf-learn-pills{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.awf-learn-pill{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:10px;display:grid;gap:3px}.awf-learn-pill span{font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.awf-learn-pill b{font-size:16px}.awf-learn-pill small{opacity:.65}.awf-learn-pill.bad{border-top:4px solid #b54b4b}.awf-learn-pill.warn{border-top:4px solid #b5822e}.awf-learn-pill.good,.awf-learn-pill.great{border-top:4px solid #2f8464}.awf-learn-pill.muted{opacity:.6}
      .awf-live.bad{border-left-color:#b54b4b}.awf-live.warn{border-left-color:#b5822e}.awf-live.good,.awf-live.great{border-left-color:#2f8464}.awf-live-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,300px);gap:14px}.awf-bottleneck{padding:11px;border-radius:10px;background:color-mix(in srgb,currentColor 6%,transparent);display:grid;gap:4px}.awf-bottleneck span{font-size:9px;font-weight:900;letter-spacing:.08em}.awf-live-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.awf-live-metrics>div{border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:9px;padding:10px;display:grid;gap:3px}.awf-live-metrics span{font-size:9px;font-weight:900;letter-spacing:.07em}.awf-live-metrics b{font-size:17px}.awf-live-metrics small{opacity:.65}
      @media(max-width:720px){.awf-live-head,.awf-learn-head{grid-template-columns:1fr}.awf-live-metrics,.awf-learn-pills{grid-template-columns:repeat(2,minmax(0,1fr))}.awf-answer-grid{grid-template-columns:1fr}}@media(max-width:460px){.awf-live-metrics,.awf-learn-pills{grid-template-columns:1fr}}
    `;win.document.head.appendChild(style);paint();
  }
  return {channelQuestionRead,questionAnswers,proposal,liveReviewRead,install};
});
