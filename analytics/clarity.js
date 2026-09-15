(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){ root.AcceleratorAnalyticsClarity=api; if(root.document) api.install(root); }
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';

  const AGES={
    24:{label:'24h',name:'EARLY READ',purpose:'How did it start?',act:'Watch. Do not overreact yet.'},
    48:{label:'48h',name:'PROBLEM CHECK',purpose:'Is there a clear problem?',act:'Investigate a clear issue, but keep it provisional.'},
    168:{label:'7d',name:'MAIN DIAGNOSIS',purpose:'What actually happened vs normal?',act:'This is the main decision point.'},
    672:{label:'28d',name:'WHAT TO MAKE NEXT',purpose:'What did the video become?',act:'Use this for programming and follow-up decisions.'}
  };
  const STAGE={reach:'TOPIC / REACH',packaging:'PACKAGING',retention:'RETENTION'};
  const n=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtCount=v=>n(v)===null?'—':Math.round(n(v)).toLocaleString();
  const fmtRate=v=>n(v)===null?'—':(n(v)*100).toFixed(1)+'%';
  const fmtMultiple=v=>n(v)===null?'—':n(v).toFixed(2)+'×';
  const signedPp=v=>n(v)===null?'—':(n(v)>=0?'+':'')+n(v).toFixed(1)+' pp';
  const stageLabel=stages=>stages.map(x=>STAGE[x]||x).join(' + ');

  function countSignal(x){
    const m=n(x?.multiple);
    if(m===null) return {tone:'muted',label:'Need data',detail:'No fair matched comparison yet',range:'Normal = 0.70–1.30×'};
    if(m<.7) return {tone:'bad',label:'Needs attention',detail:fmtMultiple(m)+' normal',range:'Normal = 0.70–1.30×'};
    if(m<1.3) return {tone:'normal',label:'In range',detail:fmtMultiple(m)+' normal',range:'Normal = 0.70–1.30×'};
    if(m<1.7) return {tone:'good',label:'Promising',detail:fmtMultiple(m)+' normal',range:'1.30×+ is above normal'};
    if(m<2.5) return {tone:'great',label:'Strong',detail:fmtMultiple(m)+' normal',range:'1.70×+ is a strong result'};
    return {tone:'great',label:'Big outlier',detail:fmtMultiple(m)+' normal',range:'2.50×+ is a major strength signal'};
  }
  function rateSignal(x,threshold){
    const d=n(x?.deltaPp);
    if(d===null) return {tone:'muted',label:'Need data',detail:'No fair matched comparison yet',range:'Use the creator’s matched normal'};
    if(d<-threshold) return {tone:'bad',label:'Needs attention',detail:signedPp(d)+' vs normal',range:'In range = within ±'+threshold+' pp'};
    if(d>threshold) return {tone:'good',label:'Strong',detail:signedPp(d)+' vs normal',range:'In range = within ±'+threshold+' pp'};
    return {tone:'normal',label:'In range',detail:signedPp(d)+' vs normal',range:'In range = within ±'+threshold+' pp'};
  }
  function metricRead(r){
    const c=r?.comparisons||{};
    const outcomeKey=c.engagedViews?.multiple!=null?'engagedViews':'views';
    const outcome=countSignal(c[outcomeKey]);
    const show=countSignal(c.impressions);
    const click=rateSignal(c.ctr,.5);
    let watchKey='retention30',watch=rateSignal(c.retention30,3);
    if(n(c.retention30?.deltaPp)===null && n(c.apv?.deltaPp)!==null){watchKey='apv';watch=rateSignal(c.apv,3);}
    return {outcomeKey,outcome,show,click,watch,watchKey};
  }
  function nextFor(stages,winner){
    const key=stages.slice().sort().join('|');
    if(winner){
      if(stages.includes('packaging')) return 'Do not panic-change a winner. Check traffic source and audience breadth, then carry the packaging lesson into the follow-up.';
      if(stages.includes('retention')) return 'Do not rescue the winner. Study the opening/retention soft spot and use the lesson on the next video.';
      if(stages.includes('reach')) return 'The result won despite uneven opportunity. Study where the views actually came from before copying the surface topic.';
      return 'Protect what worked. Look for the repeatable topic, package and viewing pattern before scaling it.';
    }
    if(key==='packaging|retention') return 'Check the promise first. If fewer people click and the people who click also watch less, a thumbnail swap alone may not fix it.';
    if(key==='packaging|reach') return 'Check topic demand and traffic source first, then inspect whether the title/thumbnail are earning the opportunity they do get.';
    if(key==='reach|retention') return 'Check audience fit and traffic source, then inspect whether the opening is delivering for the people who do arrive.';
    if(stages.includes('reach')) return 'Check topic demand, audience fit and traffic source before touching the package.';
    if(stages.includes('packaging')) return 'Inspect the title/thumbnail promise and source-aware CTR. Test one meaningfully different package, not random tweaks.';
    if(stages.includes('retention')) return 'Inspect the first 30 seconds and the first real retention divergence. Check promise delivery, pacing and structure.';
    return 'Do not force a fix. Keep the video job and source mix in view and recheck at the next useful checkpoint.';
  }
  function diagnose(r,hours=168){
    const age=AGES[hours]||AGES[168],m=metricRead(r);
    if(!r||r.status!=='compared') return {tone:'muted',kind:'needs_data',headline:'Need a fair comparison first.',bottleneck:'NEED DATA',explain:r?.message||'Choose a matched baseline and exact same-age result.',next:'Complete the comparison before changing strategy.',hardIssues:[],softIssues:[],metrics:m,age};
    const outcomeMultiple=n(r.comparisons?.[m.outcomeKey]?.multiple);
    const winner=outcomeMultiple!==null&&outcomeMultiple>=1.7;
    const under=outcomeMultiple!==null&&outcomeMultiple<.7;
    const expandedAudience=n(r.comparisons?.impressions?.multiple)>=1.7;
    const raw=[];
    if(m.show.tone==='bad')raw.push('reach');
    if(m.click.tone==='bad')raw.push('packaging');
    if(m.watch.tone==='bad')raw.push('retention');
    const soft=[],hard=[];
    raw.forEach(stage=>{
      const expansion=stage==='packaging'&&expandedAudience;
      if(winner||expansion)soft.push(stage); else hard.push(stage);
    });
    let headline,bottleneck,tone='normal',explain;
    if(hard.length){
      bottleneck=stageLabel(hard);
      tone=hours<168?'warn':'bad';
      headline=(hours<168?'Early concern: ':'Main bottleneck: ')+bottleneck;
      explain='This is the clearest weak part of SHOW → CLICK → WATCH compared with this creator’s own same-age normal.';
    }else if(winner){
      bottleneck=soft.length?'NO RESCUE NEEDED · soft spot: '+stageLabel(soft):'NO CLEAR ISSUE';
      tone='great';
      headline=soft.length?'Winner. '+stageLabel(soft)+' is the soft spot.':'Winner. Nothing obvious is broken.';
      explain='The outcome is '+fmtMultiple(outcomeMultiple)+' normal. Treat weak-looking supporting metrics as learning context, not an automatic rescue job.';
    }else if(under){
      bottleneck=soft.length?stageLabel(soft):'CAUSE NOT CLEAR';
      tone='warn';
      headline='Under normal, but the cause is not clear yet.';
      explain='The outcome is '+fmtMultiple(outcomeMultiple)+' normal, but SHOW → CLICK → WATCH does not isolate one clean failure.';
    }else if(soft.length){
      bottleneck='CHECK CONTEXT · '+stageLabel(soft);
      tone='warn';
      headline=stageLabel(soft)+' needs context, not a panic change.';
      explain='One metric is soft, but audience expansion or the total result makes a simple failure call unsafe.';
    }else{
      bottleneck='NO CLEAR ISSUE';
      headline='In range. Nothing obvious is broken.';
      explain='The available funnel metrics are inside the working range versus this creator’s own same-age normal.';
    }
    const all=[...new Set([...hard,...soft])];
    const expansionContext=expandedAudience&&soft.includes('packaging')&&!winner;
    const next=expansionContext
      ? 'Check traffic source, audience breadth and other expanded videos first. Lower CTR during wider distribution is not automatically a thumbnail problem. Only test the package if it is still materially weak after that context check.'
      : nextFor(all,winner);
    return {tone,kind:'diagnosed',headline,bottleneck,explain,next,hardIssues:hard,softIssues:soft,winner,under,outcomeMultiple,metrics:m,age};
  }

  function patternFromDiagnoses(diags){
    const usable=(diags||[]).filter(Boolean);
    const hard={reach:0,packaging:0,retention:0},soft={reach:0,packaging:0,retention:0};
    usable.forEach(d=>{(d.hardIssues||[]).forEach(x=>hard[x]++);(d.softIssues||[]).forEach(x=>soft[x]++);});
    const top=o=>Math.max(0,...Object.values(o));
    let source='hard',max=top(hard),counts=hard;
    if(!max){source='soft';max=top(soft);counts=soft;}
    const stages=max?Object.keys(counts).filter(k=>counts[k]===max):[];
    const confidence=max>=3?'Pattern emerging':max===2?'Worth watching':max===1?'One clue only':'No repeated bottleneck';
    return {n:usable.length,source,max,stages,confidence,countsHard:hard,countsSoft:soft};
  }

  function install(win){
    if(win.__acceleratorAnalyticsClarityV1) return;
    win.__acceleratorAnalyticsClarityV1=true;
    const W=win.AcceleratorAnalyticsWorkspace;
    if(!W) return;
    const originalBody=W.body;

    function current(){try{return win.AcceleratorDeskBridge?.current?.()||null}catch(_){return null}}
    function rerender(){try{win.__acceleratorCoachGuide?.analyticsPage?.()}catch(_){}}
    function action(a,t,extra=''){return '<button class="btn" data-aw="'+a+'" '+extra+'>'+esc(t)+'</button>';}
    function selectedVideo(c){const p=W.prefs(c),vs=W.videos(c);return vs.find(v=>v.id===p.videoId)||vs[0]||null;}
    function matchingBaseline(c,v,h){
      const bs=W.baselines(c,h); if(!bs.length)return null;
      const obs=(c.analyticsFoundation?.observations||[]).filter(o=>o.videoId===(v?.engineId||v?.id)&&o.windowHours===h).at(-1);
      return bs.find(b=>b.engine&&obs&&b.engine.format===obs.format&&b.engine.eraId===obs.eraId&&b.engine.definitionId===obs.definitionId&&b.engine.traffic===obs.traffic&&b.engine.paid===obs.paid)
        ||bs.find(b=>b.manual&&(b.manual.job==='All'||b.manual.job===v?.native?.job))
        ||bs[0];
    }
    function readFor(c,v,h){
      const b=matchingBaseline(c,v,h); if(!b)return null;
      let r;try{r=W.compare(c,v,b,h);}catch(_){return null}
      return {h,b,r,d:diagnose(r,h)};
    }
    function baselineRecord(c,b){
      if(!b)return null;
      if(b.engine){
        const rows=(c.analyticsFoundation?.baselines||[]).filter(x=>x.policyId===b.id&&x.kind==='operating');
        const first=rows[0],last=rows.at(-1);if(!last)return null;
        const get=(row,k)=>n(row?.metrics?.[k]?.median);
        return {label:b.label,sample:last.memberVideoIds?.length||last.metrics?.engagedViews?.n||last.metrics?.views?.n||0,first,last,
          values:{views:get(last,'views'),engagedViews:get(last,'engagedViews'),impressions:get(last,'impressions'),ctr:get(last,'ctr'),retention30:get(last,'retention30'),apv:get(last,'apv')},
          firstValues:{views:get(first,'views'),engagedViews:get(first,'engagedViews'),impressions:get(first,'impressions'),ctr:get(first,'ctr'),retention30:get(first,'retention30'),apv:get(first,'apv')}};
      }
      const values=W.values(b.manual),hist=(c.coachOS?.baseline?.history||[]).filter(x=>x.id===b.id),first=W.values(hist[0]||b.manual);
      return {label:b.label,sample:n(b.manual?.n)||0,values,firstValues:first,first:hist[0]||b.manual,last:b.manual};
    }
    function baselineMetric(c,b,k){const rec=baselineRecord(c,b);return rec?.values?.[k]??null;}
    function baselineOutcome(rec){
      const k=n(rec?.values?.engagedViews)!==null?'engagedViews':'views',a=n(rec?.firstValues?.[k]),z=n(rec?.values?.[k]);
      const growth=a&&z!==null?z/a:null;
      return {key:k,current:z,first:a,growth};
    }
    function ageOverview(c,v){
      return [24,48,168,672].map(h=>{
        const b=matchingBaseline(c,v,h),rec=baselineRecord(c,b),out=baselineOutcome(rec);
        return '<button class="ac-age '+(W.prefs(c).hours===h?'on':'')+'" data-ac-window="'+h+'"><span>'+AGES[h].label+' · '+AGES[h].name+'</span><b>'+(out.current===null?'No normal yet':fmtCount(out.current)+' '+(out.key==='engagedViews'?'engaged':'views'))+'</b><small>'+esc(AGES[h].purpose)+'</small></button>';
      }).join('');
    }
    function metricCard(stage,label,x,signal,format){
      const current=n(x?.current),base=n(x?.baseline);
      return '<div class="ac-metric '+signal.tone+'"><div class="ac-stage">'+esc(stage)+'</div><h4>'+esc(label)+'</h4><div class="ac-values"><b>'+format(current)+'</b><span>normal '+format(base)+'</span></div><strong>'+esc(signal.label)+'</strong><p>'+esc(signal.detail)+'</p><small>'+esc(signal.range)+'</small></div>';
    }
    function metricsHtml(r,d){
      const c=r?.comparisons||{},m=d.metrics;
      const outcomeX=c[m.outcomeKey]||{};
      const watchX=c[m.watchKey]||{};
      return '<div class="ac-metrics">'+
        metricCard('OUTCOME',m.outcomeKey==='engagedViews'?'Engaged views':'Views',outcomeX,m.outcome,fmtCount)+
        metricCard('SHOW','Impressions',c.impressions||{},m.show,fmtCount)+
        metricCard('CLICK','CTR',c.ctr||{},m.click,fmtRate)+
        metricCard('WATCH',m.watchKey==='retention30'?'First 30 sec':'Average % viewed',watchX,m.watch,fmtRate)+
      '</div>';
    }
    function baselineHtml(c,v,h,b){
      const rec=baselineRecord(c,b);
      if(!rec)return '<section class="ac-block"><div class="ac-kicker">YOUR NORMAL</div><h3>No matched '+AGES[h].label+' baseline yet</h3><p>Build the same-age baseline first so the dashboard has a fair definition of normal.</p>'+action('baseline','Build '+AGES[h].label+' baseline')+'</section>';
      const o=baselineOutcome(rec),watch=n(rec.values.retention30)!==null?['First 30 sec',rec.values.retention30]:['APV',rec.values.apv];
      const evo=o.growth===null?'No earlier saved version to compare yet.':Math.abs(o.growth-1)<.001?'Normal has not moved from the first saved version.':'Normal is '+((o.growth-1)*100>=0?'+':'')+((o.growth-1)*100).toFixed(1)+'% vs the first saved version.';
      return '<section class="ac-block"><div class="ac-kicker">YOUR NORMAL RIGHT NOW · '+AGES[h].label+'</div><div class="ac-block-head"><div><h3>'+esc(rec.label)+'</h3><p>'+esc(evo)+' Built from '+esc(rec.sample)+' comparable video'+(rec.sample===1?'':'s')+'.</p></div><button class="btn" data-aw="edit-baseline">Review baseline</button></div><div class="ac-baseline-grid">'+
        '<div><span>Outcome</span><b>'+fmtCount(o.current)+'</b><small>'+(o.key==='engagedViews'?'Engaged views':'Views')+'</small></div>'+
        '<div><span>Show</span><b>'+fmtCount(rec.values.impressions)+'</b><small>Impressions</small></div>'+
        '<div><span>Click</span><b>'+fmtRate(rec.values.ctr)+'</b><small>CTR</small></div>'+
        '<div><span>Watch</span><b>'+fmtRate(watch[1])+'</b><small>'+esc(watch[0])+'</small></div>'+
      '</div></section>';
    }
    function bestReads(c,limit=8){
      const rows=[];
      for(const v of W.videos(c)){
        let read=null;
        for(const h of [168,672,48,24]){const x=readFor(c,v,h);if(x?.r?.status==='compared'){read={v,...x};break;}}
        if(read)rows.push(read);
        if(rows.length>=limit)break;
      }
      return rows;
    }
    function sevenDayReads(c,limit=6){
      const rows=[];
      for(const v of W.videos(c)){
        const x=readFor(c,v,168);
        if(x?.r?.status==='compared')rows.push({v,...x});
        if(rows.length>=limit)break;
      }
      return rows;
    }
    function pattern(c){
      const reads=sevenDayReads(c,6),p=patternFromDiagnoses(reads.map(x=>x.d));
      const label=p.stages.length?stageLabel(p.stages):'NO REPEATED BOTTLENECK';
      let explain,next;
      if(!reads.length){explain='No comparable 7-day reads yet. The numbers should not pretend to know the bottleneck.';next='Get the 7-day baseline and first mature video comparisons in place.';}
      else if(p.max){explain=p.max+' of '+p.n+' recent 7-day videos point to '+label.toLowerCase()+'. '+(p.source==='soft'?'These are mostly soft spots, not rescue-level failures.':'This is the most repeated hard issue in the recent sample.');next=nextFor(p.stages,false);}
      else{explain='Across '+p.n+' recent 7-day videos, no SHOW → CLICK → WATCH failure repeats often enough to call it the channel bottleneck.';next='Keep using the diagnosis flow. Protect strengths and wait for a repeated pattern before making a channel-wide fix.';}
      return {...p,reads,label,explain,next};
    }
    function recentHtml(c){
      const reads=bestReads(c,8);
      if(!reads.length)return '<section class="ac-block"><div class="ac-kicker">RECENT VIDEOS</div><h3>No fair video reads yet</h3><p>Add same-age results and the list will fill itself in.</p></section>';
      return '<section class="ac-block"><div class="ac-kicker">RECENT VIDEOS</div><h3>See the pattern without opening every video</h3><div class="ac-recent">'+reads.map(x=>{
        const out=x.d.outcomeMultiple===null?'—':fmtMultiple(x.d.outcomeMultiple);
        return '<div class="ac-row"><div><b>'+esc(x.v.title)+'</b><small>'+AGES[x.h].label+' · '+AGES[x.h].name+'</small></div><strong class="'+x.d.tone+'">'+out+'</strong><span class="ac-badge '+x.d.tone+'">'+esc(x.d.bottleneck)+'</span></div>';
      }).join('')+'</div></section>';
    }
    function patternHtml(c){
      const p=pattern(c),tone=p.max?(p.source==='hard'?'bad':'warn'):'normal';
      return '<section class="ac-block ac-pattern '+tone+'"><div class="ac-kicker">OVERALL PATTERN · RECENT 7-DAY VIDEOS</div><div class="ac-block-head"><div><h3>'+(p.max?'Overall bottleneck: '+esc(p.label):'No repeated bottleneck yet')+'</h3><p>'+esc(p.explain)+'</p></div><span class="ac-badge '+tone+'">'+esc(p.confidence)+'</span></div><p><b>What I would do:</b> '+esc(p.next)+'</p><small>1 result = interesting. 2 similar = watch it. 3+ similar = a pattern may be emerging. This is coaching discipline, not a statistical law.</small></section>';
    }
    function videoSummary(c,full){
      const p=W.prefs(c),v=selectedVideo(c);if(!v)return full;
      const b=matchingBaseline(c,v,p.hours); if(b)p.baselineId=b.id;
      let r;try{r=W.compare(c,v,b,p.hours);}catch(e){r={status:'needs_evidence',comparisons:{},message:e.message};}
      const d=diagnose(r,p.hours),age=AGES[p.hours];
      const baselineName=b?.label||'No matched baseline';
      return '<div class="ac-shell">'+
        '<section class="ac-top '+d.tone+'"><div><div class="ac-kicker">'+age.label+' · '+age.name+'</div><h2>'+esc(d.headline)+'</h2><p>'+esc(d.explain)+'</p></div><div class="ac-top-badge"><span>BOTTLENECK</span><b>'+esc(d.bottleneck)+'</b><small>'+esc(age.act)+'</small></div></section>'+
        '<section class="ac-controls"><label>Video<select id="ac-video">'+W.videos(c).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===v.id?'selected':'')+'>'+esc(x.title)+'</option>').join('')+'</select></label><div class="ac-age-grid">'+ageOverview(c,v)+'</div><p>Comparing this video with <b>'+esc(baselineName)+'</b>. Same age vs same age.</p><div class="actions">'+(v.native&&!v.engineId?action('result','Update this video’s results'):action('import',v.engineId?'Update imported results':'Import results'))+action('baseline','Build / update baseline')+action('diagnosis','Use this in Diagnosis')+'</div></section>'+
        '<section class="ac-block ac-next '+d.tone+'"><div class="ac-kicker">WHAT TO DO NEXT</div><h3>'+esc(d.bottleneck)+'</h3><p>'+esc(d.next)+'</p></section>'+
        metricsHtml(r,d)+baselineHtml(c,v,p.hours,b)+patternHtml(c)+recentHtml(c)+
        '<details class="ac-full"><summary><b>Full analytics details</b> · sources, every metric, baseline history and advanced controls</summary><div class="ac-full-inner">'+full+'</div></details>'+
      '</div>';
    }
    function channelSummary(c,full){
      const d=W.channel(c),keys=[['engagedViews','Engaged views'],['views','Views'],['impressions','Impressions'],['ctr','CTR']];
      const comparable=d.comparable;
      return '<div class="ac-shell"><section class="ac-top '+(comparable?'normal':'warn')+'"><div><div class="ac-kicker">90-DAY CHANNEL TREND</div><h2>'+(comparable?'Is the whole channel moving?':'Need two verified 90-day reports')+'</h2><p>Use this for channel direction. Do not use 90-day totals as a per-video baseline.</p></div><div class="ac-top-badge"><span>STATUS</span><b>'+(comparable?'COMPARABLE':'NEED DATA')+'</b><small>Video bottlenecks still come from same-age video comparisons.</small></div></section><div class="ac-channel">'+keys.map(([k,l])=>{
        const a=n(d.starting?.[k]),z=n(d.current?.[k]);let change='Not comparable yet';
        if(comparable&&a!==null&&z!==null) change=k==='ctr'?((z-a)>=0?'+':'')+(z-a).toFixed(1)+' pp':a?((z/a-1)*100>=0?'+':'')+((z/a-1)*100).toFixed(1)+'%':'—';
        const val=k==='ctr'?(z===null?'—':Number(z).toFixed(1)+'%'):fmtCount(z);
        return '<div class="ac-channel-card"><span>'+l+'</span><b>'+val+'</b><small>'+change+' vs starting report</small></div>';
      }).join('')+'</div><div class="actions"><button class="btn" data-cg="analytics-snapshot-new">Add 90-day report</button><button class="btn" data-ac-mode="video">Back to video diagnosis</button></div><details class="ac-full"><summary><b>Full channel details</b> · report dates, sources and history</summary><div class="ac-full-inner">'+full+'</div></details></div>';
    }

    W.body=function(c){
      const full=originalBody(c),p=W.prefs(c);
      return p.mode==='channel'?channelSummary(c,full):videoSummary(c,full);
    };
    W.clarityDiagnose=diagnose;
    W.clarityPattern=pattern;

    function diagnosisEvidence(c){
      const p=pattern(c),reads=p.reads||[],latest=reads[0],has=p.n>0;
      let title,lead,tone='normal';
      if(!has){title='Analytics do not have enough mature evidence yet.';lead='Keep the diagnosis flow primary. Get comparable 7-day reads before letting the numbers push the plan.';tone='warn';}
      else if(p.max&&p.source==='hard'){title='Analytics are backing: '+p.label;lead=p.explain;tone='bad';}
      else if(p.max){title='No rescue-level pattern. Most common soft spot: '+p.label;lead=p.explain;tone='warn';}
      else{title='Analytics are not showing a repeated bottleneck.';lead=p.explain;tone='normal';}
      const latestLine=latest?'<p><b>Latest 7-day read:</b> '+esc(latest.v.title)+' · '+(latest.d.outcomeMultiple===null?'no outcome multiple':fmtMultiple(latest.d.outcomeMultiple)+' normal')+' · '+esc(latest.d.bottleneck)+'.</p>':'';
      return '<section class="studio-evidence ac-diagnosis-evidence '+tone+'" id="studio-diagnosis-evidence"><div class="kicker">Analytics check</div><h3>'+esc(title)+'</h3><p>'+esc(lead)+'</p>'+latestLine+'<p><b>How to use this here:</b> Analytics support the diagnosis. They do not replace the rest of the diagnosis flow. If audience, offer, capacity, business goal or creator context disagree, investigate before locking the plan.</p><p><b>Check next:</b> '+esc(p.next)+'</p><details><summary>See the video evidence</summary>'+(reads.length?'<div class="ac-mini-evidence">'+reads.map(x=>'<p><b>'+esc(x.v.title)+'</b> · '+(x.d.outcomeMultiple===null?'—':fmtMultiple(x.d.outcomeMultiple))+' normal · '+esc(x.d.bottleneck)+'</p>').join('')+'</div>':'<p>No comparable 7-day video reads yet.</p>')+'</details><button class="btn" data-studio="analytics">Open Analytics</button></section>';
    }
    W.diagnosisEvidence=diagnosisEvidence;

    if(typeof win.renderPlan==='function'&&!win.__acceleratorAnalyticsClarityPlanWrapped){
      win.__acceleratorAnalyticsClarityPlanWrapped=true;
      const prior=win.renderPlan;
      win.renderPlan=function(){
        const html=prior.apply(this,arguments),c=current();
        if(!c||typeof html!=='string')return html;
        const tpl=win.document.createElement('template');tpl.innerHTML=html;
        const old=tpl.content.querySelector('#studio-diagnosis-evidence');
        if(old){const repl=win.document.createElement('template');repl.innerHTML=diagnosisEvidence(c);old.replaceWith(repl.content.firstElementChild);}
        return tpl.innerHTML;
      };
    }

    const style=win.document.createElement('style');
    style.id='accelerator-analytics-clarity-style';
    style.textContent=`
      .ac-shell{display:grid;gap:18px}.ac-kicker{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#68757d)}
      .ac-top,.ac-block,.ac-controls,.ac-metrics,.ac-channel{border:1px solid var(--line,#d9e0e2);background:var(--card,#fff);border-radius:16px}
      .ac-top{padding:22px;display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,340px);gap:20px;align-items:center;border-left:5px solid #55757a}
      .ac-top h2,.ac-block h3{margin:5px 0 7px}.ac-top p,.ac-block p{margin:6px 0;line-height:1.5}.ac-top.bad{border-left-color:#b54b4b}.ac-top.warn{border-left-color:#b5822e}.ac-top.great{border-left-color:#2f8464}
      .ac-top-badge{padding:15px;border-radius:12px;background:rgba(84,110,116,.08);display:grid;gap:4px}.ac-top-badge span{font-size:10px;font-weight:800;letter-spacing:.1em}.ac-top-badge b{font-size:18px}.ac-top-badge small{line-height:1.35;color:var(--muted,#68757d)}
      .ac-controls{padding:18px}.ac-controls>label{display:grid;gap:7px;font-weight:700}.ac-controls select{width:100%;font-size:15px}.ac-controls .actions{margin-top:12px}
      .ac-age-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:14px 0}.ac-age{border:1px solid var(--line,#d9e0e2);border-radius:12px;background:transparent;padding:11px;text-align:left;display:grid;gap:4px;cursor:pointer;color:inherit}.ac-age.on{border-color:#245c5b;box-shadow:inset 0 0 0 1px #245c5b}.ac-age span{font-size:10px;font-weight:800;letter-spacing:.05em}.ac-age b{font-size:14px}.ac-age small{color:var(--muted,#68757d)}
      .ac-next{padding:18px;border-left:5px solid #55757a}.ac-next.bad{border-left-color:#b54b4b}.ac-next.warn{border-left-color:#b5822e}.ac-next.great{border-left-color:#2f8464}
      .ac-metrics{padding:12px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ac-metric{border:1px solid var(--line,#d9e0e2);border-radius:12px;padding:14px;display:grid;gap:5px;border-top:4px solid #718189}.ac-metric.bad{border-top-color:#b54b4b;background:rgba(181,75,75,.05)}.ac-metric.warn{border-top-color:#b5822e}.ac-metric.good,.ac-metric.great{border-top-color:#2f8464;background:rgba(47,132,100,.05)}.ac-metric.normal{border-top-color:#4d7884}.ac-metric.muted{opacity:.75}.ac-stage{font-size:10px;font-weight:900;letter-spacing:.1em}.ac-metric h4{margin:0;font-size:15px}.ac-values{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.ac-values b{font-size:23px}.ac-values span{font-size:12px;color:var(--muted,#68757d)}.ac-metric strong{font-size:13px}.ac-metric p,.ac-metric small{margin:0;color:var(--muted,#68757d);font-size:12px;line-height:1.4}
      .ac-block{padding:18px}.ac-block-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.ac-baseline-grid,.ac-channel{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ac-baseline-grid>div,.ac-channel-card{padding:13px;border:1px solid var(--line,#d9e0e2);border-radius:11px;display:grid;gap:3px}.ac-baseline-grid span,.ac-channel-card span{font-size:11px;font-weight:800}.ac-baseline-grid b,.ac-channel-card b{font-size:20px}.ac-baseline-grid small,.ac-channel-card small{color:var(--muted,#68757d)}
      .ac-pattern{border-left:5px solid #55757a}.ac-pattern.bad{border-left-color:#b54b4b}.ac-pattern.warn{border-left-color:#b5822e}
      .ac-badge{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800;background:rgba(84,110,116,.1)}.ac-badge.bad,.ac-row strong.bad{color:#a23d3d}.ac-badge.warn,.ac-row strong.warn{color:#956713}.ac-badge.great,.ac-row strong.great,.ac-badge.good,.ac-row strong.good{color:#237055}
      .ac-recent{display:grid}.ac-row{display:grid;grid-template-columns:minmax(0,1fr) 78px minmax(150px,auto);gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line,#d9e0e2)}.ac-row:last-child{border-bottom:0}.ac-row>div{display:grid;gap:3px}.ac-row small{color:var(--muted,#68757d)}.ac-row strong{text-align:right}
      .ac-full{border:1px dashed var(--line,#c9d1d5);border-radius:14px;padding:14px}.ac-full>summary{cursor:pointer}.ac-full-inner{margin-top:14px}.ac-full-inner>.cg-native-section:first-child{margin-top:0}
      .ac-diagnosis-evidence{border-left:5px solid #55757a!important}.ac-diagnosis-evidence.bad{border-left-color:#b54b4b!important}.ac-diagnosis-evidence.warn{border-left-color:#b5822e!important}.ac-mini-evidence p{padding:7px 0;border-bottom:1px solid var(--line,#ddd);margin:0}
      @media(max-width:900px){.ac-top{grid-template-columns:1fr}.ac-age-grid,.ac-metrics,.ac-baseline-grid,.ac-channel{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.ac-age-grid,.ac-metrics,.ac-baseline-grid,.ac-channel{grid-template-columns:1fr}.ac-block-head{display:grid}.ac-row{grid-template-columns:1fr auto}.ac-row .ac-badge{grid-column:1/-1}.ac-top,.ac-block,.ac-controls{border-radius:12px}.ac-top{padding:16px}.ac-metrics{padding:9px}}
    `;
    win.document.head.appendChild(style);

    win.document.addEventListener('change',ev=>{
      if(ev.target?.id!=='ac-video')return;
      const c=current();if(!c)return;
      const p=W.prefs(c);p.videoId=ev.target.value;p.baselineId='';rerender();
    });
    win.document.addEventListener('click',ev=>{
      const el=ev.target.closest?.('[data-ac-window],[data-ac-mode]');if(!el)return;
      const c=current();if(!c)return;const p=W.prefs(c);
      if(el.dataset.acWindow){p.hours=Number(el.dataset.acWindow);p.baselineId='';}
      if(el.dataset.acMode)p.mode=el.dataset.acMode;
      rerender();
    });
    if(win.AcceleratorDeskBridge?.analyticsActive?.()) rerender();
  }

  return {countSignal,rateSignal,metricRead,diagnose,patternFromDiagnoses,install};
});
