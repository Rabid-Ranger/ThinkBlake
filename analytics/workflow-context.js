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

  function channelQuestionRead(c,W,ADC){
    const p=W?.clarityPattern?W.clarityPattern(c):{reads:[]},reads=p.reads||[];
    const values=key=>reads.map(x=>x.r?.comparisons?.[key]);
    const outcome=median(reads.map(x=>{
      const a=x.r?.comparisons?.engagedViews?.multiple;
      return n(a)!==null?a:x.r?.comparisons?.views?.multiple;
    }));
    const show=median(values('impressions').map(x=>x?.multiple));
    const click=median(values('ctr').map(x=>x?.deltaPp));
    const r30=median(values('retention30').map(x=>x?.deltaPp));
    const apv=median(values('apv').map(x=>x?.deltaPp));
    const watch=r30!==null?r30:apv;
    const watchMetric=r30!==null?'0:30':'APV';
    const audience=ADC?.audienceRead?ADC.audienceRead(c):{};
    const overall=ADC?.overallRead?ADC.overallRead(c,W,root.__acceleratorCoachGuide):null;
    return {p,reads,outcome,show,click,watch,watchMetric,audience,overall};
  }
  function countVerdict(v,kind='result'){
    if(v===null)return {tone:'muted',label:'Need data',line:'No fair matched read yet.'};
    if(v<.7)return {tone:'bad',label:kind==='show'?'Yes, opportunity is weak':'Yes, this is under normal',line:mult(v)+' of normal.'};
    if(v<1.3)return {tone:'normal',label:'No clear problem here',line:mult(v)+' of normal, inside the working range.'};
    if(v<1.7)return {tone:'good',label:kind==='show'?'Opportunity is above normal':'Result is above normal',line:mult(v)+' of normal.'};
    return {tone:'great',label:kind==='show'?'Strong expansion':'Strong result',line:mult(v)+' of normal.'};
  }
  function rateVerdict(v,threshold,label){
    if(v===null)return {tone:'muted',label:'Need data',line:'No fair matched '+label+' read yet.'};
    if(v<-threshold)return {tone:'bad',label:'Yes, this is weak vs normal',line:pp(v)+' vs creator normal.'};
    if(v>threshold)return {tone:'good',label:'No, this is stronger than normal',line:pp(v)+' vs creator normal.'};
    return {tone:'normal',label:'No clear problem here',line:pp(v)+' vs creator normal, inside the working noise range.'};
  }
  function questionAnswers(c,W,ADC){
    const r=channelQuestionRead(c,W,ADC),out=countVerdict(r.outcome),show=countVerdict(r.show,'show'),click=rateVerdict(r.click,.5,'CTR'),watch=rateVerdict(r.watch,3,r.watchMetric);
    const a=r.audience||{},retTone=a.loyaltyBand==='weak'?'bad':a.loyaltyBand==='strong'?'good':a.loyaltyBand==='steady'?'normal':'muted';
    const returnLine=a.loyalty!==null&&a.loyalty!==undefined
      ? ((a.loyaltyKey==='regular'?'Regular':a.loyaltyKey==='casual'?'Casual':'Returning')+' viewers '+signedPct(a.loyalty)+' vs prior 90-day report.')
      : 'No comparable repeat-audience trend yet.';
    const resultStage=r.overall?.stages?.find(x=>x.key==='result');
    const resultLine=resultStage?.value||'Business result is not connected yet.';
    const returnVerdict={tone:retTone,label:retTone==='bad'?'Return is weakening':retTone==='good'?'Return is strengthening':retTone==='normal'?'Return is roughly steady':'Need audience trend',line:returnLine+' '+resultLine};
    return {raw:r,outcome:out,show,click,watch,returnResult:returnVerdict};
  }
  function proposal(c,W,ADC){
    const q=questionAnswers(c,W,ADC),r=q.raw,a=r.audience||{},p=r.p||{};
    let leading='Not enough evidence yet',because='',next='',alternative='',confidence='Low';
    if(r.outcome===null){because='There is not enough mature same-age evidence to judge the recent video outcome yet.';next='Get comparable 7-day results before forcing a channel bottleneck.';}
    else if(r.show!==null&&r.show<.7){
      leading='Discovery / idea opportunity';
      because='The first unusual stage is SHOW. Recent mature videos are getting only '+mult(r.show)+' of normal impression opportunity.';
      next='Check topic demand, audience fit and traffic source before changing the title or thumbnail.';
      alternative='A narrower intentional audience, source shift or mixed comparison set could lower impressions without making the idea bad.';
    }else if(r.click!==null&&r.click<-.5){
      leading='Packaging / click';
      because='SHOW is not the first clear failure, but CLICK is. Recent CTR is '+pp(r.click)+' vs creator normal.';
      next=r.show!==null&&r.show>=1.7?'Check audience expansion and traffic source first. If CTR is still weak in comparable source context, test a meaningfully different package.':'Test the title + thumbnail promise while protecting the underlying idea and opening.';
      alternative='A colder or broader audience mix can cool CTR without proving the package is bad.';
    }else if(r.watch!==null&&r.watch<-3){
      leading='Promise / opening / viewing experience';
      because='SHOW and CLICK are holding better, while '+r.watchMetric+' is '+pp(r.watch)+' vs creator normal.';
      next='Review the first 30–60 seconds, promise delivery and the first meaningful retention divergence.';
      alternative='Traffic source or audience-temperature changes can depress retention without proving the content structure is the only cause.';
    }else if(a.acquisitionBand==='weak'&&['steady','strong'].includes(a.loyaltyBand)){
      leading='Acquisition / gateway';
      because='Existing viewers are returning better than new viewers are entering. The pressure is getting enough qualified new people into the channel.';
      next='Use Reach/gateway videos around proven audience problems and protect click/watch quality.';
      alternative='Seasonality or an intentional core-audience period can reduce new viewers without representing a structural problem.';
    }else if(['steady','strong'].includes(a.acquisitionBand)&&a.loyaltyBand==='weak'){
      leading='Loyalty / pathway';
      because='New viewers are arriving, but repeat-audience signals are weaker. The pressure is turning first views into second and third views.';
      next='Build follow-ups, bridges, series and clearer continuation paths.';
      alternative='A recent discovery spike can temporarily make repeat-viewer ratios look weaker.';
    }else if(r.outcome!==null&&r.outcome>=1.3){
      leading='Growth pattern worth protecting';
      because='Recent mature results are above the creator’s own normal and no earlier funnel stage is clearly broken.';
      next='Protect the repeatable winning mechanism and make adjacent follow-ups before changing the system.';
      alternative='One or two outliers may still be carrying the median.';
    }else{
      because='The current evidence does not isolate one clear first unusual stage.';
      next='Keep the broader diagnosis flow primary and wait for a repeated signal before making a channel-wide change.';
      alternative='The issue may be portfolio, market, audience, business or capacity rather than one video funnel stage.';
    }
    if((p.max||0)>=3)confidence='Medium';
    else if((p.max||0)>=2)confidence='Low';
    return {leading,because,next,alternative,confidence,q};
  }
  function answerHtml(title,x,detail=''){
    return '<div class="awf-answer '+x.tone+'"><span>WHAT YOUR DATA SAYS</span><b>'+esc(x.label)+'</b><p>'+esc(x.line)+'</p>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div>';
  }
  function injectDiagnosis(win,c,W,ADC){
    const drawer=win.document.getElementById('drawerBack');
    if(!drawer||!drawer.classList.contains('show')||!/Channel Diagnosis/i.test(drawer.textContent||''))return;
    const q=questionAnswers(c,W,ADC),map=[
      ['1 · OUTCOME',q.outcome,'Across '+q.raw.reads.length+' recent mature 7-day videos.'],
      ['2 · SHOW',q.show,'Same-age impression opportunity across the recent 7-day set.'],
      ['3 · CLICK',q.click,q.raw.show>=1.7&&q.raw.click<-.5?'Important: impressions are expanded, so check source/audience breadth before blaming packaging.':'CTR is compared with creator normal in percentage points.'],
      ['4 · WATCH',q.watch,(q.raw.watchMetric||'WATCH')+' is the current usable matched signal. 0:30 is preferred; APV is the fallback.'],
      ['5 · RETURN + RESULT',q.returnResult,'Use 90-day audience trend and the video/channel job. No universal loyalty target.']
    ];
    for(const [label,val,detail] of map){
      const d=[...drawer.querySelectorAll('details.cg-decision')].find(x=>(x.querySelector('summary span')?.textContent||'').trim()===label);
      if(!d)continue;
      const body=d.querySelector('.cg-decision-body');if(!body)continue;
      let box=body.querySelector('.awf-answer');const html=answerHtml(label,val,detail);
      if(!box){const t=win.document.createElement('template');t.innerHTML=html;body.prepend(t.content.firstElementChild);}
      else if(box.dataset.sig!==html){const t=win.document.createElement('template');t.innerHTML=html;const fresh=t.content.firstElementChild;fresh.dataset.sig=html;box.replaceWith(fresh);}
    }
    const s=c.coachOS?.diagnosis||{},prop=proposal(c,W,ADC);
    let summary=drawer.querySelector('#awf-diagnosis-decision');
    const summaryHtml='<section class="awf-diagnosis-decision '+(prop.leading==='Not enough evidence yet'?'muted':'focus')+'" id="awf-diagnosis-decision"><div class="awf-kicker">DATA-ASSISTED WORKING ANSWER</div><h3>'+esc(prop.leading)+'</h3><p>'+esc(prop.because)+'</p><p><b>Next:</b> '+esc(prop.next)+'</p><small>'+esc(prop.confidence)+' confidence. This uses the first unusual stage, then audience/business context. You still confirm the diagnosis.</small></section>';
    if(!summary){const first=drawer.querySelector('.cg-section');if(first){const t=win.document.createElement('template');t.innerHTML=summaryHtml;first.after(t.content.firstElementChild);}}
    if(!s.savedAt){
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
    const d=root.AcceleratorAnalyticsClarity?.diagnose
      ?root.AcceleratorAnalyticsClarity.diagnose({status:'compared',comparisons},rw.hours)
      :null;
    return {rw,status:'compared',b,cur,comparisons,d,outcomeKey};
  }
  function liveReviewHtml(read){
    if(!read||read.status==='needs_baseline')return '<section class="awf-live muted" id="awf-live-review"><div class="awf-kicker">LIVE SAME-AGE READ</div><h3>No matched baseline yet</h3><p>Build the same-age baseline before treating this checkpoint like a diagnosis.</p></section>';
    if(read.status==='needs_data')return '<section class="awf-live muted" id="awf-live-review"><div class="awf-kicker">LIVE SAME-AGE READ</div><h3>Add the checkpoint numbers</h3><p>As you enter the results below, this panel will update against the creator’s same-age normal.</p></section>';
    const c=read.comparisons,d=read.d||{},watch=n(c.retention30.deltaPp)!==null?['0:30',pp(c.retention30.deltaPp)]:['APV',pp(c.apv.deltaPp)];
    return '<section class="awf-live '+esc(d.tone||'normal')+'" id="awf-live-review"><div class="awf-live-head"><div><div class="awf-kicker">LIVE SAME-AGE READ · '+esc(read.rw.hours===24?'24H':read.rw.hours===48?'48H':read.rw.hours===168?'7D':'28D')+'</div><h3>'+esc(d.headline||'Current read')+'</h3><p>'+esc(d.explain||'Compared with this creator’s same-age normal.')+'</p></div><div class="awf-bottleneck"><span>BOTTLENECK</span><b>'+esc(d.bottleneck||'—')+'</b></div></div><div class="awf-live-metrics"><div><span>OUTCOME</span><b>'+mult(c[read.outcomeKey]?.multiple)+'</b><small>vs normal</small></div><div><span>SHOW</span><b>'+mult(c.impressions.multiple)+'</b><small>impressions</small></div><div><span>CLICK</span><b>'+pp(c.ctr.deltaPp)+'</b><small>CTR vs normal</small></div><div><span>WATCH</span><b>'+esc(watch[1])+'</b><small>'+esc(watch[0])+' vs normal</small></div></div><p><b>What I would do next:</b> '+esc(d.next||'Keep collecting evidence before changing strategy.')+'</p><button class="btn" data-awf-use-read>Use this read in the review</button></section>';
  }
  function fillReview(drawer,read){
    if(!read?.d)return;
    const c=read.comparisons,d=read.d,out=read.outcomeKey;
    const values={
      'cg-r-see':(c[out]?.multiple!==null?'Outcome is '+mult(c[out].multiple)+' normal. ':'')+'Current read: '+d.bottleneck+'.',
      'cg-r-compare':'Compared with this creator’s matched '+(read.rw.hours===24?'24-hour':read.rw.hours===48?'48-hour':read.rw.hours===168?'7-day':'28-day')+' baseline.',
      'cg-r-unusual':d.bottleneck==='NO CLEAR ISSUE'?'Nothing is clearly outside the working range.':d.bottleneck,
      'cg-r-mean':d.explain||'',
      'cg-r-notprove':'This comparison identifies where to investigate. It does not prove the cause by itself.',
      'cg-r-next':d.next||'',
      'cg-r-decision':d.next||''
    };
    for(const [id,val] of Object.entries(values)){const el=drawer.querySelector('#'+id);if(el&&!String(el.value||'').trim())el.value=val;}
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
    const paint=()=>{if(queued)return;queued=true;win.requestAnimationFrame(()=>{queued=false;const c=current();if(!c)return;injectDiagnosis(win,c,W,ADC);injectLearn(win,c,W,guide);});};
    new MutationObserver(paint).observe(win.document.documentElement,{childList:true,subtree:true});
    win.document.addEventListener('input',e=>{if(e.target.closest?.('#drawerBack')&&/^cg-r-/.test(e.target.id||''))paint();});
    win.document.addEventListener('change',e=>{if(e.target.closest?.('#drawerBack'))paint();});
    const style=win.document.createElement('style');style.id='awf-style';style.textContent=`
      .awf-kicker{font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;opacity:.65}
      .awf-answer{grid-column:1/-1;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-left:4px solid #55757a;border-radius:10px;padding:11px;background:color-mix(in srgb,currentColor 3%,transparent);display:grid;gap:4px}.awf-answer span{font-size:9px;font-weight:900;letter-spacing:.08em}.awf-answer b{font-size:13px}.awf-answer p,.awf-answer small{margin:0;font-size:12px;line-height:1.4}.awf-answer.bad{border-left-color:#b54b4b}.awf-answer.good,.awf-answer.great{border-left-color:#2f8464}.awf-answer.muted{opacity:.7}
      .awf-diagnosis-decision,.awf-live{margin:0 0 14px;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:color-mix(in srgb,currentColor 3%,transparent)}.awf-diagnosis-decision h3,.awf-live h3{margin:4px 0 6px}.awf-diagnosis-decision p,.awf-live p{line-height:1.45}.awf-diagnosis-decision.focus{border-left-color:#366f7a}.awf-diagnosis-decision.muted,.awf-live.muted{opacity:.72}
      .awf-live.bad{border-left-color:#b54b4b}.awf-live.warn{border-left-color:#b5822e}.awf-live.good,.awf-live.great{border-left-color:#2f8464}.awf-live-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,300px);gap:14px}.awf-bottleneck{padding:11px;border-radius:10px;background:color-mix(in srgb,currentColor 6%,transparent);display:grid;gap:4px}.awf-bottleneck span{font-size:9px;font-weight:900;letter-spacing:.08em}.awf-live-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.awf-live-metrics>div{border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:9px;padding:10px;display:grid;gap:3px}.awf-live-metrics span{font-size:9px;font-weight:900;letter-spacing:.07em}.awf-live-metrics b{font-size:17px}.awf-live-metrics small{opacity:.65}
      @media(max-width:720px){.awf-live-head{grid-template-columns:1fr}.awf-live-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:460px){.awf-live-metrics{grid-template-columns:1fr}}
    `;win.document.head.appendChild(style);paint();
  }
  return {channelQuestionRead,questionAnswers,proposal,liveReviewRead,install};
});
