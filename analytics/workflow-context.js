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
    const currentRaw=median(xs.map(x=>x.current)),baselineRaw=median(xs.map(x=>x.baseline));
    const ratioMetric=['ctr','retention30','apv'].includes(key);
    const current=ratioMetric&&currentRaw!==null?currentRaw*100:currentRaw;
    const baseline=ratioMetric&&baselineRaw!==null?baselineRaw*100:baselineRaw;
    const deltaPp=median(xs.map(x=>x.deltaPp));
    const deltaSeconds=median(xs.map(x=>x.deltaSeconds));
    const multiple=median(xs.map(x=>n(x.current)!==null&&n(x.baseline)!==null&&n(x.baseline)!==0?n(x.current)/n(x.baseline):null));
    return {current,baseline,deltaPp,deltaSeconds,multiple};
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
    const avd=avdStrict;
    const hasRate=x=>n(x?.multiple)!==null||n(x?.deltaPp)!==null||n(x?.current)!==null;
    const hasDuration=x=>n(x?.multiple)!==null||n(x?.deltaSeconds)!==null||n(x?.current)!==null;
    const watch=hasRate(r30)?r30:hasRate(apv)?apv:avd;
    const watchMetric=watch===r30?'0:30':watch===apv?'APV':'AVD';
    const audience=ADC?.audienceRead?ADC.audienceRead(c):{};
    const overall=ADC?.overallRead?ADC.overallRead(c,W,guide):null;
    const jobs=guide?.jobScorecard?guide.jobScorecard(c):[];
    return {
      p,reads,fallback,outcome,show,click,r30,apv,watch,watchMetric,avd,audience,overall,jobs,
      sample:Math.max(reads.length,n(fallback.n)||0),
      sources:{
        outcome:n(strictOutcome)!==null?'verified Analytics workspace':'saved channel diagnosis data',
        show:n(strictShow)!==null?'verified Analytics workspace':'saved channel diagnosis data',
        click:(n(clickStrict.multiple)!==null||n(clickStrict.deltaPp)!==null)?'verified Analytics workspace':'saved channel diagnosis data',
        watch:(n(r30Strict.multiple)!==null||n(r30Strict.deltaPp)!==null||n(apvStrict.multiple)!==null||n(apvStrict.deltaPp)!==null||n(avdStrict.multiple)!==null||n(avdStrict.deltaSeconds)!==null)?'verified Analytics workspace':'saved channel diagnosis data'
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
  function durationAnswer(rate,label='AVD'){
    const ratioV=n(rate?.multiple),delta=n(rate?.deltaSeconds),current=n(rate?.current),baseline=n(rate?.baseline);
    if(ratioV===null&&delta===null)return {tone:'muted',label:'Not enough data yet',line:'We do not have a fair Average View Duration comparison yet.',meaning:'AVD can support WATCH when exact 0:30 and APV are unavailable.',next:'Add or verify the same-age AVD normal, then inspect the retention curve if WATCH looks weak.'};
    const line=(current!==null&&baseline!==null?label+' '+Math.round(current)+' sec vs '+Math.round(baseline)+' sec normal':label+' comparison available')+
      (ratioV!==null?' · '+mult(ratioV)+' normal':'')+(delta!==null?' · '+(delta>=0?'+':'')+Math.round(delta)+' sec':'');
    if(ratioV!==null&&ratioV<.7)return {tone:'bad',label:'Yes. WATCH looks clearly weak for this creator.',line,meaning:'Average viewing time is well below this creator’s normal. That flags the viewing experience, even without an exact 0:30 number.',next:'Open the retention curve and inspect the first meaningful divergence, promise delivery, pacing, and structure.'};
    if(ratioV!==null&&ratioV<.85)return {tone:'warn',label:'WATCH is a little below normal.',line,meaning:'AVD is softer than usual, but not enough by itself to prove the opening is the main problem.',next:'Keep it in context with CTR, traffic source, APV when available, and the retention curve.'};
    if(ratioV!==null&&ratioV>1.15)return {tone:'good',label:'No. WATCH looks stronger than usual.',line,meaning:'Average viewing time is above this creator’s normal.',next:'Protect the viewing pattern and continue to RETURN + RESULT.'};
    return {tone:'normal',label:'Nothing looks clearly wrong here.',line,meaning:'Average viewing time is close to this creator’s normal.',next:'Continue to RETURN + RESULT.'};
  }
  function questionAnswers(c,W,ADC){
    const r=channelQuestionRead(c,W,ADC);
    const out=countAnswer(r.outcome,'outcome',r.sample);
    const show=countAnswer(r.show,'show',r.sample);
    const click=rateAnswer(r.click,'CTR',.7,'CTR');
    const watch=r.watchMetric==='AVD'?durationAnswer(r.watch,'AVD'):rateAnswer(r.watch,r.watchMetric,.7,r.watchMetric==='0:30'?'first-30-second retention':'APV');

    if(n(r.show)!==null&&r.show>=1.7&&(click.tone==='bad')){
      click.meaning='CTR is weak, but impressions are strongly expanded. Wider/colder distribution can lower CTR without proving the package is broken.';
      click.next='Check traffic source and how broad the audience was first. Only call packaging the bottleneck if CTR remains weak in comparable where the views came from.';
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
        ?'Existing viewers are holding better than new viewers. That points more toward a Reach problem.'
        :['steady','strong'].includes(a.acquisitionBand)&&a.loyaltyBand==='weak'
        ?'New people are arriving, but fewer are coming back. That points more toward a Trust / follow-up problem.'
        :'Audience movement does not isolate one simple Reach-vs-Trust problem yet.';
      rrNext=a.acquisitionBand==='weak'&&['steady','strong'].includes(a.loyaltyBand)
        ?'Bias the plan toward Reach ideas aimed at the right people while protecting click and watch.'
        :['steady','strong'].includes(a.acquisitionBand)&&a.loyaltyBand==='weak'
        ?'Bias the plan toward Trust videos, follow-ups, and clearer next-video paths.'
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

  function metricTone(rate,{seconds=false}={}){
    const m=n(rate?.multiple),delta=seconds?n(rate?.deltaSeconds):n(rate?.deltaPp);
    if(m===null&&delta===null)return 'muted';
    if(m!==null&&m<.7)return 'bad';
    if(delta!==null&&delta<(seconds?-15:-3))return 'bad';
    if(m!==null&&m<.85)return 'warn';
    if(delta!==null&&delta<(seconds?-5:-1))return 'warn';
    if(m!==null&&m>1.15)return 'good';
    if(delta!==null&&delta>(seconds?10:3))return 'good';
    return 'normal';
  }
  function displayRate(rate,{seconds=false}={}){
    const cur=n(rate?.current),base=n(rate?.baseline),m=n(rate?.multiple),delta=seconds?n(rate?.deltaSeconds):n(rate?.deltaPp);
    const value=cur===null?'—':seconds?Math.round(cur)+' sec':cur.toFixed(1)+'%';
    let compare='No fair comparison yet';
    if(base!==null){
      compare='usual '+(seconds?Math.round(base)+' sec':base.toFixed(1)+'%');
      if(m!==null)compare+=' · '+mult(m)+' normal';
      if(delta!==null)compare+=' · '+(delta>=0?'+':'')+(seconds?Math.round(delta)+' sec':delta.toFixed(1)+' pp');
    }
    return {value,compare,tone:metricTone(rate,{seconds})};
  }
  function audienceMetric(a,key,label,definition){
    const cur=n(a?.current?.[key]),prev=n(a?.previous?.[key]),r=cur!==null&&prev!==null&&prev!==0?cur/prev:null;
    const value=cur===null?'—':key==='avgViewsPerViewer'?cur.toFixed(2):Math.round(cur).toLocaleString();
    return {label,value,compare:r===null?'No prior comparison':signedPct(r)+' vs prior 90 days',tone:r===null?'muted':r<.85?'bad':r>1.05?'good':'normal',note:definition};
  }
  function businessMetric(a,key,label){
    const cur=n(a?.current?.[key]),prev=n(a?.previous?.[key]),r=cur!==null&&prev!==null&&prev!==0?cur/prev:null;
    return {label,value:cur===null?'—':Math.round(cur).toLocaleString(),compare:r===null?'No prior comparison':signedPct(r)+' vs prior 90 days',tone:r===null?'muted':r<.85?'bad':r>1.05?'good':'normal'};
  }
  function diagnosisQuestionSupport(c,W,ADC,index=c?.diagnosis?.index||0){
    const q=questionAnswers(c,W,ADC),r=q.raw,a=r.audience||{},cur=a.current||{},prev=a.previous||{};
    const channelRows=(c?.coachOS?.analytics?.snapshots||[]).filter(x=>x&&x.period==='90d').slice().sort((x,y)=>String(x.date||'').localeCompare(String(y.date||'')));
    const channelCur=channelRows.at(-1)||{},channelPrev=channelRows.at(-2)||{},channelData={current:channelCur,previous:channelPrev};
    const base={tone:'muted',verdict:'Analytics cannot answer this yet.',line:'There is not enough matching data for this question.',meaning:'Use the question itself and collect the missing data before letting analytics sway the answer.',next:'Choose NOT SURE if the non-analytics evidence is also missing.',metrics:[],note:''};
    if(index===0){
      const published=n(channelCur.uploadsPublished),previousPublished=n(channelPrev.uploadsPublished),planned=n(channelCur.uploadsPlanned),ratioV=published!==null&&planned!==null&&planned>0?published/planned:null;
      if(ratioV===null){
        const metrics=published===null?[]:[{label:'Published in latest 90d',value:String(Math.round(published)),compare:previousPublished===null?'No prior upload count':Math.round(previousPublished)+' in prior 90d',tone:'normal'}];
        return {...base,
          verdict:'Studio can show output, but it cannot fully answer this question.',
          line:published===null?'We do not have a reliable published-upload count yet.':('Studio shows '+Math.round(published)+' long-form upload'+(Math.round(published)===1?'':'s')+' in the latest 90 days'+(previousPublished===null?'.':' vs '+Math.round(previousPublished)+' in the prior 90 days.')),
          meaning:'This question is really asking whether the creator is executing the plan consistently enough to learn. YouTube Studio does not know the planned upload count, team capacity, ownership, or whether the right strategic videos actually shipped.',
          next:'Use the upload count as context, then compare planned vs published videos in the dashboard or on the call. Do not treat a raw upload frequency as good or bad by itself.',
          metrics,
          note:'There is no universal ideal upload frequency. This is the one diagnosis question that needs execution / planning context in addition to YouTube analytics.'
        };
      }
      const tone=ratioV<.7?'bad':ratioV<.9?'warn':'good';
      return {tone,verdict:ratioV<.7?'Analytics lean NO: execution is getting in the way.':ratioV<.9?'Analytics say this is worth checking.':'Analytics support YES: execution looks consistent enough to keep diagnosing.',line:Math.round(published)+' of '+Math.round(planned)+' planned long-form uploads were published in the latest report.',meaning:ratioV<.7?'The team may not be shipping enough of the plan to judge the strategy fairly.':'Publishing does not look like the first obvious break from the data we have.',next:ratioV<.7?'Fix scope, ownership, or capacity before over-diagnosing creative strategy.':'Keep checking the next part of the diagnosis unless the call context says execution is still unstable.',metrics:[{label:'Published',value:String(Math.round(published)),compare:'Planned '+Math.round(planned),tone}],note:'Upload schedule is context, not a universal grade.'};
    }
    if(index===1){
      const newTrend=n(a.acquisition),show=n(r.show),weak=(show!==null&&show<.7)||(newTrend!==null&&newTrend<.85),healthy=(show===null||show>=.7)&&(newTrend===null||newTrend>=.85);
      const metrics=[
        {label:'Impressions vs usual',value:show===null?'—':mult(show),compare:'Recent similar videos',tone:show===null?'muted':show<.7?'bad':show>1.3?'good':'normal'},
        audienceMetric(a,'newViewers','New viewers','First-time viewers in the period')
      ];
      return {tone:weak?'bad':healthy?'good':'warn',verdict:weak?'Analytics lean NO: discovery / Reach looks weak.':healthy?'Analytics support YES: enough people appear to be getting a chance to see the videos.':'Analytics are mixed on Reach.',line:'This question uses impressions against the creator’s usual result plus the New-viewer trend.',meaning:weak?'The first issue may be getting in front of enough of the right new people, before CTR or retention.':'Reach does not look like the clearest break from the data we have.',next:weak?'Check topic demand and traffic sources before changing the title/thumbnail.':'Keep moving to audience fit and click unless the creator context says otherwise.',metrics,note:'New viewers help with Reach. They do not tell you by themselves whether those viewers are the right audience.'};
    }
    if(index===2){
      const leads=businessMetric(channelData,'qualifiedLeads','Qualified leads');
      const metrics=[
        audienceMetric(a,'newViewers','New viewers','How much new audience is entering'),
        audienceMetric(a,'returning','Returning viewers','Whether people choose the channel again'),
        leads
      ];
      const warning=n(a.acquisition)!==null&&a.acquisition>1.05&&n(a.loyalty)!==null&&a.loyalty<.85;
      return {tone:warning?'warn':'muted',verdict:warning?'Analytics raise an audience-fit question, but do not prove it.':'Analytics can support this question, but cannot decide audience fit by themselves.',line:warning?'New viewers are growing while returning-viewer numbers are weakening. That can happen when growth attracts people who do not connect with the broader channel.':'Aggregate analytics cannot tell us exactly who the viewer is or whether they fit the business.',meaning:'Use this alongside comments, topics driving growth, returning behavior by topic, subscriber behavior, and lead quality.',next:'Do not choose YES or NO from total views alone. Check who the strongest topics are attracting and whether those viewers connect to the core promise.',metrics,note:'This is intentionally not auto-scored. Audience fit needs qualitative and topic-level evidence too.'};
    }
    if(index===3){
      const ctr=displayRate(r.click),show=n(r.show);
      const tone=q.click.tone;
      return {tone,verdict:tone==='bad'?'Analytics lean NO: clicking looks weak.':tone==='good'?'Analytics support YES: clicking looks healthy.':tone==='muted'?'Not enough CTR data yet.':'Analytics do not show a clear packaging break.',line:q.click.line,meaning:q.click.meaning,next:q.click.next,metrics:[
        {label:'CTR',value:ctr.value,compare:ctr.compare,tone:ctr.tone},
        {label:'Impressions',value:show===null?'—':mult(show),compare:'vs what this creator usually gets',tone:show===null?'muted':show<.7?'bad':show>1.3?'good':'normal'}
      ],note:'Read CTR with traffic source and audience expansion. A lower CTR can be normal when YouTube reaches a broader/cooler audience.'};
    }
    if(index===4){
      const r30=displayRate(r.watchMetric==='0:30'?r.watch:r.r30||{}),apv=displayRate(r.apv||{}),avd=displayRate(r.avd||{},{seconds:true});
      const tones=[r30.tone,apv.tone,avd.tone].filter(x=>x!=='muted');
      const bad=tones.includes('bad'),warn=tones.includes('warn'),healthy=tones.length>0&&!bad&&!warn;
      let verdict='Not enough retention data yet.',line='Add 0:30 retention first. APV and AVD help show whether the problem continues after the opening.';
      if(bad){verdict='Analytics lean NO: viewers are leaving more than usual.';line='At least one key watch metric is clearly weaker than this creator’s usual result.';}
      else if(warn){verdict='Analytics say WATCH is a little soft, but not clearly the main break.';line='One or more watch metrics are a little below usual, but the pattern is not strong enough by itself.';}
      else if(healthy){verdict='Analytics support YES: watch performance looks healthy.';line='0:30 / APV / AVD do not show a clear watch problem against this creator’s usual results.';}
      return {tone:bad?'bad':warn?'warn':healthy?'good':'muted',verdict,line,meaning:bad?'The viewing experience deserves attention. 0:30 tells you about the opening; APV/AVD help show whether the weakness continues later.':healthy?'Retention does not look like the first obvious break.':'The averages are not enough to force an answer.',next:bad?'Open the retention curve. Find the first meaningful divergence and rewind 30–60 seconds before the visible drop before deciding what caused it.':'If this looks healthy, move to whether people come back. If you are still unsure, inspect the full retention curve.',metrics:[
        {label:'First 30 sec',value:r30.value,compare:r30.compare,tone:r30.tone},
        {label:'APV',value:apv.value,compare:apv.compare,tone:apv.tone},
        {label:'AVD',value:avd.value,compare:avd.compare,tone:avd.tone}
      ],note:'The dashboard does not have the full retention curve or exact drop timestamps. These numbers tell you whether to inspect WATCH, not why viewers left.'};
    }
    if(index===5){
      const metrics=[
        audienceMetric(a,'newViewers','New','First-time viewers · Reach context'),
        audienceMetric(a,'casual','Casual','Occasional repeat viewers'),
        audienceMetric(a,'regular','Regular','Long-term consistent viewers; this can be a small group'),
        audienceMetric(a,'returning','Returning','People coming back again'),
        audienceMetric(a,'avgViewsPerViewer','Avg views / viewer','Channel-depth clue; repeat views can count')
      ];
      if(!a.hasComparison)return {...base,verdict:'Not enough audience trend data yet.',line:'Add a second comparable 90-day audience report so we can see whether repeat viewing is strengthening or weakening.',metrics,note:'New / Casual / Regular are not a tracked conversion funnel.'};
      const loyalty=n(a.loyalty),newTrend=n(a.acquisition),depth=n(a.depth);
      let tone='normal',verdict='Analytics do not show a clear Trust problem.',meaning='Repeat-audience signals are roughly steady.';
      if(loyalty!==null&&loyalty<.85){tone='bad';verdict='Analytics lean NO: repeat viewing is weakening.';meaning='Casual / Regular / Returning trends say fewer people are building a repeat relationship with the channel.';}
      else if(loyalty!==null&&loyalty>1.05){tone='good';verdict='Analytics support YES: repeat viewing is strengthening.';meaning='Casual / Regular / Returning trends are moving in the right direction.';}
      else if(newTrend!==null&&newTrend>1.05&&loyalty!==null&&loyalty<=1.05){tone='warn';verdict='Reach is growing faster than Trust.';meaning='More new people are arriving, but repeat-audience growth is not keeping pace yet.';}
      if(depth!==null&&depth<.85)meaning+=' Average views per viewer is also down, which suggests people may be watching fewer videos across the channel.';
      return {tone,verdict,line:'Read Casual, Regular, and Returning together, then use Average views per viewer as depth context. New viewers tells you whether Reach is expanding at the same time.',meaning,next:tone==='bad'||tone==='warn'?'Test clearer follow-ups, series, bridge videos, and stronger next-video paths. Keep the core audience promise clear.':'Trust does not look like the first obvious break. Continue to leads / next-step behavior.',metrics,note:'Regular viewers are a stricter long-term segment than Returning viewers. Do not treat New → Casual → Regular as a proven person-by-person conversion path.'};
    }
    if(index===6){
      const lead=businessMetric(channelData,'qualifiedLeads','Qualified leads'),book=businessMetric(channelData,'bookings','Bookings / applications');
      const has=n(channelCur.qualifiedLeads)!==null||n(channelCur.bookings)!==null;
      if(!has)return {...base,verdict:'YouTube analytics cannot answer the lead question yet.',line:'Connect qualified clicks / leads / bookings or use CRM / sales data.',metrics:[lead,book],note:'Views and returning viewers are not a substitute for lead tracking.'};
      const leadR=n(channelCur.qualifiedLeads)!==null&&n(channelPrev.qualifiedLeads)!==null&&n(channelPrev.qualifiedLeads)!==0?channelCur.qualifiedLeads/channelPrev.qualifiedLeads:null;
      return {tone:leadR!==null&&leadR<.85?'bad':leadR!==null&&leadR>1.05?'good':'normal',verdict:leadR!==null&&leadR<.85?'Business data raises a lead-path concern.':'The lead data does not show an obvious break by itself.',line:'Use qualified leads / bookings from the same reporting periods, then check which video jobs actually created them.',meaning:'This tells you whether deeper action is moving. It does not tell you whether the CTA, resource, offer fit, or attribution caused the change.',next:'Check CTA fit, lead quality, and which Trust / Convert videos created action.',metrics:[lead,book],note:'Use a consistent qualified-lead definition. Compare similar business jobs, not every video against one lead target.'};
    }
    if(index===7){
      const book=businessMetric(channelData,'bookings','Bookings / applications'),sales=businessMetric(channelData,'sales','Sales / purchases');
      const has=n(channelCur.sales)!==null||n(channelCur.bookings)!==null;
      if(!has)return {...base,verdict:'Analytics cannot answer the sales question yet.',line:'Connect bookings / applications / sales and use sales-call notes for the reasons people do or do not buy.',metrics:[book,sales],note:'YouTube platform metrics cannot diagnose objections, price, fit, or the sales process.'};
      const salesR=n(channelCur.sales)!==null&&n(channelPrev.sales)!==null&&n(channelPrev.sales)!==0?channelCur.sales/channelPrev.sales:null;
      return {tone:salesR!==null&&salesR<.85?'bad':salesR!==null&&salesR>1.05?'good':'normal',verdict:salesR!==null&&salesR<.85?'Business results raise a sales / decision concern.':'Business results do not show an obvious sales decline by themselves.',line:'Bookings and sales can flag a change, but the reason still comes from objections, lead quality, offer fit, price / ROI, and the sales process.',meaning:'Treat this as business evidence supporting the diagnosis, not a YouTube performance grade.',next:'Review close rate, repeated objections, lead quality, and what good prospects say before deciding this is the break.',metrics:[book,sales],note:'Do not try to solve a sales problem with more views until you know what happens to qualified people who are already close to buying.'};
    }
    return base;
  }
  function questionSupportHtml(support,index){
    const metrics=(support.metrics||[]).map(m=>'<div class="awf-question-metric '+esc(m.tone||'muted')+'"><span>'+esc(m.label)+'</span><b>'+esc(m.value)+'</b><small>'+esc(m.compare||'')+'</small>'+(m.note?'<em>'+esc(m.note)+'</em>':'')+'</div>').join('');
    return '<section class="awf-question-analytics '+esc(support.tone||'muted')+'" id="awf-question-analytics" data-question="'+index+'">'+
      '<div class="awf-kicker">ANALYTICS CHECK FOR THIS QUESTION</div>'+
      '<h3>'+esc(support.verdict)+'</h3><p class="awf-question-line">'+esc(support.line||'')+'</p>'+
      (metrics?'<div class="awf-question-metrics">'+metrics+'</div>':'')+
      '<div class="awf-answer-grid"><div><small>WHAT THIS MEANS</small><p>'+esc(support.meaning||'')+'</p></div><div><small>HOW I’D USE IT</small><p>'+esc(support.next||'')+'</p></div></div>'+
      (support.note?'<p class="awf-question-note">'+esc(support.note)+'</p>':'')+
      '<div class="awf-question-actions"><small>This supports your call. It does not choose YES / NO / NOT SURE for you.</small><button class="tinybtn" type="button" data-awf-open-analytics>Open Analytics</button></div>'+
    '</section>';
  }
  function injectGuidedQuestion(win,c,W,ADC){
    const progress=win.document.querySelector('.diagnosis-progress');
    const decision=progress?.closest('.decision');
    const answers=decision?.querySelector('.diag-answers');
    const old=win.document.getElementById('awf-question-analytics');
    if(!decision||!answers){if(old&&!old.closest('#drawerBack'))old.remove();return;}
    const index=Math.max(0,Math.min(7,Number(c?.diagnosis?.index)||0));
    const support=diagnosisQuestionSupport(c,W,ADC,index),html=questionSupportHtml(support,index);
    if(old?.dataset?.sig===html)return;
    const t=win.document.createElement('template');t.innerHTML=html;const fresh=t.content.firstElementChild;fresh.dataset.sig=html;
    if(old)old.replaceWith(fresh);else answers.before(fresh);
  }

  function planJobFocus(leading,overall){
    const x=String(leading||'').toLowerCase();
    if(x.includes('reach')||x.includes('discovery')||x.includes('acquisition')||x.includes('gateway'))return 'Reach';
    if(x.includes('trust')||x.includes('loyalty')||x.includes('pathway'))return 'Trust';
    if(x.includes('business')||x.includes('convert'))return 'Convert';
    if(x.includes('packag')||x.includes('opening')||x.includes('viewing')||x.includes('retention'))return overall?.action?.job||'Keep intended Reach / Trust / Convert job, fix this execution layer across it';
    if(x.includes('growth'))return 'Protect the job mix producing the wins';
    return overall?.action?.job||'Decide from the plan';
  }
  function proposal(c,W,ADC){
    const q=questionAnswers(c,W,ADC),r=q.raw,a=r.audience||{},p=r.p||{};
    let leading='Not enough data yet',because='',next='',alternative='',confidence='Low';
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
      because='Recent 7-day results are above what this creator usually gets, and no earlier part of the video looks clearly broken.';
      next='Protect what is clearly working and make nearby follow-ups before changing the whole approach.';
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
      ['1 · OUTCOME',q.outcome,'Uses 7-day views / engaged views. Source: '+q.raw.sources.outcome+'.'],
      ['2 · SHOW',q.show,'Uses impressions from the same point after publishing. Source: '+q.raw.sources.show+'.'],
      ['3 · CLICK',q.click,'Uses CTR vs what this creator usually gets, with impression expansion context. Source: '+q.raw.sources.click+'.'],
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
    const summaryHtml='<section class="awf-diagnosis-decision '+(prop.leading==='Not enough data yet'?'muted':'focus')+'" id="awf-diagnosis-decision">'+
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
      ctr:{current:cur.ctr,baseline:n(b.ctr),multiple:cmp(cur.ctr,b.ctr),deltaPp:n(cur.ctr)!==null&&n(b.ctr)!==null?cur.ctr-b.ctr:null},
      retention30:{current:cur.ret30,baseline:n(b.ret30),multiple:cmp(cur.ret30,b.ret30),deltaPp:n(cur.ret30)!==null&&n(b.ret30)!==null?cur.ret30-b.ret30:null},
      apv:{current:cur.apv,baseline:n(b.apv),multiple:cmp(cur.apv,b.apv),deltaPp:n(cur.apv)!==null&&n(b.apv)!==null?cur.apv-b.apv:null},
      avdSeconds:{current:cur.avdSeconds,baseline:n(b.avdSeconds),multiple:cmp(cur.avdSeconds,b.avdSeconds),deltaSeconds:n(cur.avdSeconds)!==null&&n(b.avdSeconds)!==null?cur.avdSeconds-b.avdSeconds:null}
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
    if(read.status==='needs_data')return '<section class="awf-live muted" id="awf-live-review"><div class="awf-kicker">LIVE READ VS THIS CREATOR’S USUAL NUMBERS</div><h3>Add the checkpoint numbers</h3><p>As you enter the results below, this panel will update against what this creator usually gets at the same point after publishing.</p></section>';
    const c=read.comparisons,d=read.d||{};
    const rateText=x=>[n(x?.multiple)!==null?mult(x.multiple)+' normal':null,n(x?.deltaPp)!==null?pp(x.deltaPp):null].filter(Boolean).join(' · ')||'—';
    const durationText=x=>[n(x?.multiple)!==null?mult(x.multiple)+' normal':null,n(x?.deltaSeconds)!==null?(x.deltaSeconds>=0?'+':'')+Math.round(x.deltaSeconds)+' sec':null].filter(Boolean).join(' · ')||'—';
    const watch=n(c.retention30?.deltaPp)!==null?['0:30',rateText(c.retention30)]:n(c.apv?.deltaPp)!==null?['APV',rateText(c.apv)]:['AVD',durationText(c.avdSeconds)],avd=durationText(c.avdSeconds);
    return '<section class="awf-live '+esc(d.tone||'normal')+'" id="awf-live-review"><div class="awf-live-head"><div><div class="awf-kicker">LIVE READ VS WHAT THIS CREATOR USUALLY GETS · '+esc(read.rw.hours===24?'24H':read.rw.hours===48?'48H':read.rw.hours===168?'7D':'28D')+'</div><h3>'+esc(d.headline||'Current read')+'</h3><p>'+esc(d.explain||'Compared with this creator’s usual result at the same point after publishing.')+'</p></div><div class="awf-bottleneck"><span>MAIN ISSUE</span><b>'+esc(d.bottleneck||'—')+'</b></div></div><div class="awf-live-metrics"><div><span>OUTCOME</span><b>'+mult(c[read.outcomeKey]?.multiple)+'</b><small>vs normal</small></div><div><span>SHOW</span><b>'+mult(c.impressions.multiple)+'</b><small>impressions</small></div><div><span>CLICK</span><b>'+esc(rateText(c.ctr))+'</b><small>CTR vs normal</small></div><div><span>WATCH</span><b>'+esc(watch[1])+'</b><small>'+esc(watch[0])+' vs normal'+(watch[0]==='AVD'?'':' · AVD '+esc(avd))+'</small></div></div><p><b>What I would do next:</b> '+esc(d.next||'Keep collecting data before changing the strategy.')+'</p><button class="btn" data-awf-use-read>Use this read in the review</button></section>';
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
    return '<section class="awf-learn-page '+esc(d.tone||'normal')+'" id="awf-learn-page"><div class="awf-learn-head"><div><div class="awf-kicker">LATEST BASELINE READ · '+label(latest.hours)+'</div><h3>'+esc(d.headline||d.bottleneck||'Current read')+'</h3><p>'+esc(d.explain||'Compared with this creator’s usual result at the same point after publishing.')+'</p></div><div class="awf-bottleneck"><span>WHAT TO CARRY FORWARD</span><b>'+esc(d.next||'Keep collecting data.')+'</b></div></div><div class="awf-learn-pills">'+pills+'</div><p><b>Use Learn like this:</b> 24h = first look, 48h = early check, 7d = main read, 28d = what to make next. Save what changed, what it might mean, and what the next video should do differently.</p></section>';
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
    const paint=()=>{if(queued)return;queued=true;win.requestAnimationFrame(()=>{queued=false;const c=current();if(!c)return;injectGuidedQuestion(win,c,W,ADC);injectDiagnosis(win,c,W,ADC);injectLearnPage(win,c,W);injectLearn(win,c,W,guide);});};
    new MutationObserver(paint).observe(win.document.documentElement,{childList:true,subtree:true});
    win.document.addEventListener('input',e=>{if(e.target.closest?.('#drawerBack')&&/^cg-r-/.test(e.target.id||''))paint();});
    win.document.addEventListener('change',e=>{if(e.target.closest?.('#drawerBack'))paint();});
    win.document.addEventListener('click',e=>{if(e.target.closest?.('[data-action="diag-answer"],[data-action="diag-back"],[data-action="restart-diagnosis"],[data-action="v11-open-diagnosis"]'))setTimeout(paint,0);const open=e.target.closest?.('[data-awf-open-analytics]');if(open){e.preventDefault();win.document.getElementById('accelerator-analytics-nav')?.click();}});
    const style=win.document.createElement('style');style.id='awf-style';style.textContent=`
      .awf-kicker{font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;opacity:.65}
      .awf-answer{grid-column:1/-1;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-left:4px solid #55757a;border-radius:10px;padding:11px;background:color-mix(in srgb,currentColor 3%,transparent);display:grid;gap:4px}.awf-answer span{font-size:9px;font-weight:900;letter-spacing:.08em}.awf-answer b{font-size:14px}.awf-answer p,.awf-answer small{margin:0;font-size:12px;line-height:1.4}.awf-answer-evidence{font-weight:650}.awf-answer-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:5px}.awf-answer-grid>div{padding:9px;border-radius:8px;background:rgba(84,110,116,.055)}.awf-answer-grid small{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;margin-bottom:3px}.awf-answer em{font-style:normal;font-size:10px;opacity:.65}.awf-plan-link{margin:12px 0;padding:12px;border-radius:10px;background:rgba(54,111,122,.07);display:grid;gap:4px}.awf-plan-link span{font-size:9px;font-weight:900;letter-spacing:.08em}.awf-plan-link p{margin:0}.awf-plan-link b{font-size:15px}.awf-answer.bad{border-left-color:#b54b4b}.awf-answer.good,.awf-answer.great{border-left-color:#2f8464}.awf-answer.muted{opacity:.7}
      .awf-question-analytics{margin:18px 0;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-left:5px solid #55757a;border-radius:12px;padding:16px;background:color-mix(in srgb,currentColor 3%,transparent)}.awf-question-analytics h3{margin:5px 0 6px}.awf-question-line{margin:0 0 12px;line-height:1.5}.awf-question-analytics.bad{border-left-color:#b54b4b}.awf-question-analytics.warn{border-left-color:#b5822e}.awf-question-analytics.good{border-left-color:#2f8464}.awf-question-analytics.muted{opacity:.78}.awf-question-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:12px 0}.awf-question-metric{border:1px solid var(--line,#d9e0e2);border-top:4px solid #55757a;border-radius:9px;padding:10px;display:grid;gap:3px}.awf-question-metric.bad{border-top-color:#b54b4b}.awf-question-metric.warn{border-top-color:#b5822e}.awf-question-metric.good{border-top-color:#2f8464}.awf-question-metric.muted{opacity:.62}.awf-question-metric span{font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.awf-question-metric b{font-size:16px}.awf-question-metric small,.awf-question-metric em{font-size:10px;line-height:1.35;opacity:.7;font-style:normal}.awf-question-note{font-size:11px;line-height:1.5;opacity:.7}.awf-question-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}.awf-question-actions small{opacity:.65}
      .awf-diagnosis-decision,.awf-live{margin:0 0 14px;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:color-mix(in srgb,currentColor 3%,transparent)}.awf-diagnosis-decision h3,.awf-live h3{margin:4px 0 6px}.awf-diagnosis-decision p,.awf-live p{line-height:1.45}.awf-diagnosis-decision.focus{border-left-color:#366f7a}.awf-diagnosis-decision.muted,.awf-live.muted{opacity:.72}
      .awf-learn-page{margin:0 0 14px;border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:var(--card,#fff)}.awf-learn-page.bad{border-left-color:#b54b4b}.awf-learn-page.warn{border-left-color:#b5822e}.awf-learn-page.good,.awf-learn-page.great{border-left-color:#2f8464}.awf-learn-page.muted{opacity:.72}.awf-learn-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,420px);gap:14px}.awf-learn-head h3{margin:4px 0 6px}.awf-learn-head p{margin:0;line-height:1.45}.awf-learn-pills{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.awf-learn-pill{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:10px;display:grid;gap:3px}.awf-learn-pill span{font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.awf-learn-pill b{font-size:16px}.awf-learn-pill small{opacity:.65}.awf-learn-pill.bad{border-top:4px solid #b54b4b}.awf-learn-pill.warn{border-top:4px solid #b5822e}.awf-learn-pill.good,.awf-learn-pill.great{border-top:4px solid #2f8464}.awf-learn-pill.muted{opacity:.6}
      .awf-live.bad{border-left-color:#b54b4b}.awf-live.warn{border-left-color:#b5822e}.awf-live.good,.awf-live.great{border-left-color:#2f8464}.awf-live-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,300px);gap:14px}.awf-bottleneck{padding:11px;border-radius:10px;background:color-mix(in srgb,currentColor 6%,transparent);display:grid;gap:4px}.awf-bottleneck span{font-size:9px;font-weight:900;letter-spacing:.08em}.awf-live-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.awf-live-metrics>div{border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:9px;padding:10px;display:grid;gap:3px}.awf-live-metrics span{font-size:9px;font-weight:900;letter-spacing:.07em}.awf-live-metrics b{font-size:17px}.awf-live-metrics small{opacity:.65}
      @media(max-width:720px){.awf-question-actions{align-items:stretch;flex-direction:column}.awf-question-actions button{width:100%}.awf-live-head,.awf-learn-head{grid-template-columns:1fr}.awf-live-metrics,.awf-learn-pills{grid-template-columns:repeat(2,minmax(0,1fr))}.awf-answer-grid{grid-template-columns:1fr}}@media(max-width:460px){.awf-live-metrics,.awf-learn-pills{grid-template-columns:1fr}}
    `;win.document.head.appendChild(style);paint();
  }
  return {channelQuestionRead,questionAnswers,diagnosisQuestionSupport,proposal,liveReviewRead,install};
});
