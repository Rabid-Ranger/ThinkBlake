(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){ root.AcceleratorAnalyticsClarity=api; if(root.document) api.install(root); }
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';

  const AGES={
    24:{label:'24h',name:'EARLY READ',purpose:'How did it start?',act:'Watch. Do not overreact yet.'},
    48:{label:'48h',name:'PROBLEM CHECK',purpose:'Is there a clear problem?',act:'Something may be off here. Check it, but don’t make a big change yet.'},
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
    if(m===null) return {tone:'muted',label:'Not enough data',detail:'No fair comparison yet',range:'Usual range: 0.70–1.30×'};
    if(m<.7) return {tone:'bad',label:'Looks weak',detail:fmtMultiple(m)+' of usual',range:'Usual range: 0.70–1.30×'};
    if(m<1.3) return {tone:'normal',label:'Looks normal',detail:fmtMultiple(m)+' of usual',range:'Usual range: 0.70–1.30×'};
    if(m<1.7) return {tone:'good',label:'Above normal',detail:fmtMultiple(m)+' of usual',range:'1.30×+ is above usual'};
    if(m<2.5) return {tone:'great',label:'Strong',detail:fmtMultiple(m)+' of usual',range:'1.70×+ is a strong result'};
    return {tone:'great',label:'Big win',detail:fmtMultiple(m)+' of usual',range:'2.50×+ is a very strong result'};
  }
  function rateSignal(x,threshold){
    const d=n(x?.deltaPp);
    if(d===null) return {tone:'muted',label:'Not enough data',detail:'No fair comparison yet',range:'Compare it with what this creator usually gets'};
    if(d<-threshold) return {tone:'bad',label:'Looks weak',detail:signedPp(d)+' vs usual',range:'Usually okay within ±'+threshold+' pp'};
    if(d>threshold) return {tone:'good',label:'Strong',detail:signedPp(d)+' vs usual',range:'Usually okay within ±'+threshold+' pp'};
    return {tone:'normal',label:'Looks normal',detail:signedPp(d)+' vs usual',range:'Usually okay within ±'+threshold+' pp'};
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
      if(stages.includes('packaging')) return 'Do not change a winning video just because CTR looks a little low. First check where the views came from and whether YouTube showed it to a broader audience. Use that lesson on the next video.';
      if(stages.includes('retention')) return 'Do not try to fix a winner. See where viewers drop more than usual and use that lesson on the next video.';
      if(stages.includes('reach')) return 'The video still won even though YouTube did not show it as evenly as usual. Check where the views came from before copying the surface topic.';
      return 'Protect what worked. Figure out what you can repeat in the topic, title/thumbnail, and viewing experience before changing the approach.';
    }
    if(key==='packaging|retention') return 'Check the promise first. If fewer people click and the people who click also watch less, a thumbnail swap alone may not fix it.';
    if(key==='packaging|reach') return 'Check the topic and where the views came from first. Then see whether the title and thumbnail are getting enough clicks from the people who do see it.';
    if(key==='reach|retention') return 'Check whether the right people are seeing the video and where the views came from. Then see whether the opening is working for the people who click.';
    if(stages.includes('reach')) return 'Check the topic, whether the right people are seeing it, and where the views came from before changing the title or thumbnail.';
    if(stages.includes('packaging')) return 'Look at the title and thumbnail. If you can, compare CTR by traffic source. Test one meaningfully different title/thumbnail, not tiny random tweaks.';
    if(stages.includes('retention')) return 'Look at the first 30 seconds and the retention graph. Find the first point where viewers leave more than usual, then check whether the opening delivered the promise quickly enough.';
    return 'Nothing clearly needs fixing right now. Keep the video’s job and where the views came from in mind, then check again at the next useful checkpoint.';
  }
  function diagnose(r,hours=168){
    const age=AGES[hours]||AGES[168],m=metricRead(r);
    if(!r||r.status!=='compared') return {tone:'muted',kind:'needs_data',headline:'Not enough data yet.',bottleneck:'NOT ENOUGH DATA YET',explain:r?.message||'We need this video compared with what this creator usually gets at the same point after publishing.',next:'Get the missing comparison first. Don’t change the strategy yet.',hardIssues:[],softIssues:[],metrics:m,age};
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
      headline=(hours<168?'This may be the issue: ':'Main issue: ')+bottleneck;
      explain='This is the clearest weak part of the video compared with what this creator usually gets at the same point after publishing.';
    }else if(winner){
      bottleneck=soft.length?'NO FIX NEEDED · '+stageLabel(soft)+' A LITTLE SOFT':'NO CLEAR ISSUE';
      tone='great';
      headline=soft.length?'Winner. '+stageLabel(soft)+' is a little soft, but the video still won.':'Winner. Nothing obvious is broken.';
      explain='The video is at '+fmtMultiple(outcomeMultiple)+' of its usual result. A weaker-looking number is something to learn from, not a reason to change a winning video.';
    }else if(under){
      bottleneck=soft.length?stageLabel(soft):'CAUSE NOT CLEAR';
      tone='warn';
      headline='This video is below normal, but we can’t tell why yet.';
      explain='The video is at '+fmtMultiple(outcomeMultiple)+' of its normal result, but the numbers do not point to one clear reason yet.';
    }else if(soft.length){
      bottleneck='CHECK THIS · '+stageLabel(soft);
      tone='warn';
      headline=stageLabel(soft)+' looks a little soft, but don’t overreact.';
      explain='One number is below normal, but the video may have reached a broader audience or still performed well overall.';
    }else{
      bottleneck='NO CLEAR ISSUE';
      headline='Nothing looks clearly wrong here.';
      explain='These numbers are close to what this creator usually gets at this point after publishing.';
    }
    const all=[...new Set([...hard,...soft])];
    const expansionContext=expandedAudience&&soft.includes('packaging')&&!winner;
    const next=expansionContext
      ? 'First check where the views came from and whether YouTube showed the video to a broader audience. Lower CTR during wider distribution does not automatically mean the thumbnail is bad. Only test the title or thumbnail if CTR still looks clearly weak after that check.'
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
    const confidence=max>=3?'This is becoming a pattern':max===2?'Worth watching':max===1?'One clue so far':'Nothing repeating yet';
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
        const read=readFor(c,v,h),d=read?.d;
        const score=d?.outcomeMultiple!=null?fmtMultiple(d.outcomeMultiple):'No comparison yet';
        const status=d?.kind==='diagnosed'?(d.hardIssues?.length?d.bottleneck:d.winner?'Winner':d.softIssues?.length?'Check context':'In range'):AGES[h].purpose;
        const tone=d?.tone||'muted';
        return '<button class="ac-age '+tone+' '+(W.prefs(c).hours===h?'on':'')+'" data-ac-window="'+h+'"><span>'+AGES[h].label+' · '+AGES[h].name+'</span><b>'+esc(score)+'</b><small>'+esc(status)+'</small></button>';
      }).join('');
    }
    function metricCard(stage,label,x,signal,format){
      const current=n(x?.current),base=n(x?.baseline);
      return '<div class="ac-metric '+signal.tone+'"><div class="ac-stage">'+esc(stage)+'</div><h4>'+esc(label)+'</h4><div class="ac-values"><b>'+format(current)+'</b><span>usual '+format(base)+'</span></div><strong>'+esc(signal.label)+'</strong><p>'+esc(signal.detail)+'</p><small>'+esc(signal.range)+'</small></div>';
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
      if(!rec)return '<section class="ac-section ac-baseline-section"><div class="ac-section-head"><div class="ac-section-index">03</div><div><div class="ac-kicker">YOUR NORMAL</div><h2>No usual '+AGES[h].label+' result saved yet</h2><p>Set up what this creator usually gets at this point first, so the comparison is fair.</p></div></div><div class="ac-section-body">'+action('baseline','Build '+AGES[h].label+' baseline')+'</div></section>';
      const o=baselineOutcome(rec),watch=n(rec.values.retention30)!==null?['First 30 sec',rec.values.retention30]:['APV',rec.values.apv];
      const evo=o.growth===null?'No earlier saved version to compare yet.':Math.abs(o.growth-1)<.001?'Normal has not moved from the first saved version.':'Normal is '+((o.growth-1)*100>=0?'+':'')+((o.growth-1)*100).toFixed(1)+'% vs the first saved version.';
      const startLine=o.first===null||o.first===undefined?'Starting normal not recorded yet.':'Started at '+fmtCount(o.first)+' '+(o.key==='engagedViews'?'engaged views':'views')+' → now '+fmtCount(o.current)+'.';
      return '<section class="ac-section ac-baseline-section">'+
        '<div class="ac-section-head"><div class="ac-section-index">03</div><div><div class="ac-kicker">YOUR NORMAL · '+AGES[h].label+'</div><h2>'+esc(rec.label)+'</h2><p><b>'+esc(startLine)+'</b> '+esc(evo)+' Built from '+esc(rec.sample)+' comparable video'+(rec.sample===1?'':'s')+'.</p></div><button class="btn" data-aw="edit-baseline">Review baseline</button></div>'+
        '<div class="ac-section-body"><div class="ac-baseline-grid">'+
          '<div><span>Outcome</span><b>'+fmtCount(o.current)+'</b><small>'+(o.key==='engagedViews'?'Engaged views':'Views')+'</small></div>'+
          '<div><span>Show</span><b>'+fmtCount(rec.values.impressions)+'</b><small>Impressions</small></div>'+
          '<div><span>Click</span><b>'+fmtRate(rec.values.ctr)+'</b><small>CTR</small></div>'+
          '<div><span>Watch</span><b>'+fmtRate(watch[1])+'</b><small>'+esc(watch[0])+'</small></div>'+
        '</div></div>'+
      '</section>';
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
      const label=p.stages.length?stageLabel(p.stages):'NOTHING REPEATING YET';
      let explain,next;
      if(!reads.length){explain='We do not have enough 7-day results yet to call a channel-wide problem.';next='Get a 7-day normal in place and add the first few 7-day video results.';}
      else if(p.max){explain=p.max+' of '+p.n+' recent 7-day videos point to '+label.toLowerCase()+'. '+(p.source==='soft'?'These are mostly small weak spots, not major problems.':'This is the most repeated hard issue in the recent sample.');next=nextFor(p.stages,false);}
      else{explain='Across '+p.n+' recent 7-day videos, nothing is repeating often enough to call it the main channel issue.';next='Keep using the diagnosis questions. Protect what is working and wait for a repeated pattern before making a big channel-wide change.';}
      return {...p,reads,label,explain,next};
    }
    function recentHtml(c){
      const reads=bestReads(c,8);
      if(!reads.length)return '<section class="ac-section ac-recent-section"><div class="ac-section-head"><div class="ac-section-index">05</div><div><div class="ac-kicker">RECENT VIDEOS</div><h2>No fair video reads yet</h2><p>Add same-age results and the list will fill itself in.</p></div></div></section>';
      return '<section class="ac-section ac-recent-section">'+
        '<div class="ac-section-head"><div class="ac-section-index">05</div><div><div class="ac-kicker">RECENT VIDEOS</div><h2>See the pattern without opening every video</h2><p>Latest usable checkpoint, score vs normal, and the current bottleneck for each video.</p></div></div>'+
        '<div class="ac-section-body"><div class="ac-recent">'+reads.map(x=>{
          const out=x.d.outcomeMultiple===null?'—':fmtMultiple(x.d.outcomeMultiple);
          return '<div class="ac-row"><div><b>'+esc(x.v.title)+'</b><small>'+AGES[x.h].label+' · '+AGES[x.h].name+'</small></div><strong class="'+x.d.tone+'">'+out+'</strong><span class="ac-badge '+x.d.tone+'">'+esc(x.d.bottleneck)+'</span></div>';
        }).join('')+'</div></div>'+
      '</section>';
    }
    function patternHtml(c){
      const p=pattern(c),tone=p.max?(p.source==='hard'?'bad':'warn'):'normal';
      return '<section class="ac-section ac-pattern-section '+tone+'">'+
        '<div class="ac-section-head"><div class="ac-section-index">04</div><div><div class="ac-kicker">CHANNEL PATTERN · RECENT 7-DAY VIDEOS</div><h2>'+(p.max?'Main issue showing up: '+esc(p.label):'Nothing is repeating yet')+'</h2><p>'+esc(p.explain)+'</p></div><span class="ac-badge '+tone+'">'+esc(p.confidence)+'</span></div>'+
        '<div class="ac-section-body"><div class="ac-decision-callout"><span>WHAT I’D DO NEXT</span><b>'+esc(p.next)+'</b></div><small>1 result = interesting. 2 similar = watch it. 3+ similar = a pattern may be emerging. This is coaching discipline, not a statistical law.</small></div>'+
      '</section>';
    }
    function videoSummary(c,full){
      const p=W.prefs(c),v=selectedVideo(c);if(!v)return full;
      const b=matchingBaseline(c,v,p.hours); if(b)p.baselineId=b.id;
      let r;try{r=W.compare(c,v,b,p.hours);}catch(e){r={status:'needs_evidence',comparisons:{},message:e.message};}
      const d=diagnose(r,p.hours),age=AGES[p.hours];
      const baselineName=b?.label||'No matched baseline';
      const controls='<div class="ac-video-controls"><label>Video<select id="ac-video">'+W.videos(c).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===v.id?'selected':'')+'>'+esc(x.title)+'</option>').join('')+'</select></label><div class="ac-age-grid">'+ageOverview(c,v)+'</div><p>Comparing this video with <b>'+esc(baselineName)+'</b> at the same point after publishing.</p></div>';
      const actions='<div class="actions ac-video-actions">'+(v.native&&!v.engineId?action('result','Update this video’s results'):action('import',v.engineId?'Update imported results':'Import results'))+action('baseline','Build / update baseline')+action('diagnosis','Use this in Diagnosis')+'</div>';
      return '<div class="ac-shell">'+
        '<section class="ac-section ac-video-section '+d.tone+'">'+
          '<div class="ac-section-head ac-video-head"><div class="ac-section-index">02</div><div><div class="ac-kicker">THIS VIDEO READ · '+age.label+' · '+age.name+'</div><h2>'+esc(d.headline)+'</h2><p>'+esc(d.explain)+'</p></div><div class="ac-top-badge"><span>MAIN ISSUE</span><b>'+esc(d.bottleneck)+'</b><small>'+esc(age.act)+'</small></div></div>'+
          '<div class="ac-section-body">'+
            controls+
            '<div class="ac-subsection"><div class="ac-subsection-label">HOW THE NUMBERS LOOK</div>'+metricsHtml(r,d)+'</div>'+
            '<div class="ac-next-inline '+d.tone+'"><div><span>WHAT TO DO NEXT</span><b>'+esc(d.bottleneck)+'</b></div><p>'+esc(d.next)+'</p></div>'+
            actions+
          '</div>'+
        '</section>'+
        baselineHtml(c,v,p.hours,b)+
        patternHtml(c)+
        recentHtml(c)+
      '</div>';
    }
    function channelSummary(c,full){
      const d=W.channel(c),keys=[['engagedViews','Engaged views'],['views','Views'],['impressions','Impressions'],['ctr','CTR']];
      const comparable=d.comparable;
      return '<div class="ac-shell">'+
        '<section class="ac-section ac-channel-section '+(comparable?'normal':'warn')+'">'+
          '<div class="ac-section-head"><div class="ac-section-index">02</div><div><div class="ac-kicker">90-DAY CHANNEL TREND</div><h2>'+(comparable?'Is the whole channel moving?':'Need two verified 90-day reports')+'</h2><p>Use this for channel direction. Do not use 90-day totals as a per-video baseline.</p></div><div class="ac-top-badge"><span>STATUS</span><b>'+(comparable?'READY':'NOT ENOUGH DATA')+'</b><small>Video bottlenecks still come from same-age video comparisons.</small></div></div>'+
          '<div class="ac-section-body"><div class="ac-channel">'+keys.map(([k,l])=>{
            const a=n(d.starting?.[k]),z=n(d.current?.[k]);let change='Not comparable yet';
            if(comparable&&a!==null&&z!==null) change=k==='ctr'?((z-a)>=0?'+':'')+(z-a).toFixed(1)+' pp':a?((z/a-1)*100>=0?'+':'')+((z/a-1)*100).toFixed(1)+'%':'—';
            const val=k==='ctr'?(z===null?'—':Number(z).toFixed(1)+'%'):fmtCount(z);
            return '<div class="ac-channel-card"><span>'+l+'</span><b>'+val+'</b><small>'+change+' vs starting report</small></div>';
          }).join('')+'</div><div class="actions"><button class="btn" data-cg="analytics-snapshot-new">Add 90-day report</button><button class="btn" data-ac-mode="video">Back to video diagnosis</button></div></div>'+
        '</section>'+
      '</div>';
    }


    W.body=function(c){
      const full=originalBody(c),p=W.prefs(c);
      return p.mode==='channel'?channelSummary(c,full):videoSummary(c,full);
    };
    W.clarityDiagnose=diagnose;
    W.clarityPattern=pattern;
    W.clarityReadFor=readFor;
    W.clarityMatchingBaseline=matchingBaseline;

    function diagnosisEvidence(c){
      const p=pattern(c),reads=p.reads||[],latest=reads[0],has=p.n>0;
      let title,lead,tone='normal';
      if(!has){title='We do not have enough 7-day data yet.';lead='Use the diagnosis questions for now. Get a few fair 7-day comparisons before letting the numbers change the plan.';tone='warn';}
      else if(p.max&&p.source==='hard'){title='Analytics are backing: '+p.label;lead=p.explain;tone='bad';}
      else if(p.max){title='Nothing looks badly broken. The most common weak spot is '+p.label;lead=p.explain;tone='warn';}
      else{title='The data is not showing one repeated channel problem.';lead=p.explain;tone='normal';}
      const latestLine=latest?'<p><b>Latest 7-day read:</b> '+esc(latest.v.title)+' · '+(latest.d.outcomeMultiple===null?'no outcome multiple':fmtMultiple(latest.d.outcomeMultiple)+' normal')+' · '+esc(latest.d.bottleneck)+'.</p>':'';
      return '<section class="studio-evidence ac-diagnosis-evidence '+tone+'" id="studio-diagnosis-evidence"><div class="kicker">Analytics check</div><h3>'+esc(title)+'</h3><p>'+esc(lead)+'</p>'+latestLine+'<p><b>How to use this here:</b> Analytics support the diagnosis. They do not replace the rest of the diagnosis flow. If audience, offer, capacity, business goal or creator context disagree, check why before locking the plan.</p><p><b>Check next:</b> '+esc(p.next)+'</p><details><summary>See the video evidence</summary>'+(reads.length?'<div class="ac-mini-evidence">'+reads.map(x=>'<p><b>'+esc(x.v.title)+'</b> · '+(x.d.outcomeMultiple===null?'—':fmtMultiple(x.d.outcomeMultiple))+' normal · '+esc(x.d.bottleneck)+'</p>').join('')+'</div>':'<p>No comparable 7-day video reads yet.</p>')+'</details><button class="btn" data-studio="analytics">Open Analytics</button></section>';
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
      .ac-shell{display:grid;gap:24px}.ac-kicker{font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:var(--muted,#68757d)}
      .ac-section{border:1px solid var(--line,#d9e0e2);border-left:6px solid #55757a;background:var(--card,#fff);border-radius:18px;overflow:hidden;box-shadow:0 1px 0 rgba(17,33,43,.025)}
      .ac-section.bad{border-left-color:#b54b4b}.ac-section.warn{border-left-color:#b5822e}.ac-section.good,.ac-section.great{border-left-color:#2f8464}
      .ac-section-head{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:start;padding:20px 22px;border-bottom:1px solid var(--line,#d9e0e2);background:rgba(84,110,116,.035)}
      .ac-section-head h2{margin:4px 0 6px;font-size:22px;line-height:1.16}.ac-section-head p{margin:0;line-height:1.5;color:var(--muted,#68757d)}
      .ac-section-index{width:34px;height:34px;border:1px solid var(--line,#d9e0e2);border-radius:10px;display:grid;place-items:center;font-size:11px;font-weight:900;letter-spacing:.05em;background:var(--card,#fff);color:var(--muted,#68757d);flex:0 0 auto}
      .ac-section-body{padding:20px 22px;display:grid;gap:18px}
      .ac-top-badge{min-width:220px;max-width:340px;padding:14px;border-radius:12px;background:rgba(84,110,116,.08);display:grid;gap:4px}.ac-top-badge span{font-size:9px;font-weight:900;letter-spacing:.1em}.ac-top-badge b{font-size:17px}.ac-top-badge small{line-height:1.35;color:var(--muted,#68757d)}
      .ac-video-controls{display:grid;gap:9px}.ac-video-controls>label{display:grid;gap:7px;font-weight:800}.ac-video-controls select{width:100%;font-size:15px}.ac-video-controls p{margin:0;color:var(--muted,#68757d)}
      .ac-age-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.ac-age{border:1px solid var(--line,#d9e0e2);border-radius:12px;background:transparent;padding:11px;text-align:left;display:grid;gap:4px;cursor:pointer;color:inherit}.ac-age.on{border-color:#245c5b;box-shadow:inset 0 0 0 1px #245c5b;background:rgba(36,92,91,.035)}.ac-age span{font-size:10px;font-weight:800;letter-spacing:.05em}.ac-age b{font-size:14px}.ac-age small{color:var(--muted,#68757d)}
      .ac-subsection{display:grid;gap:9px}.ac-subsection-label{font-size:10px;font-weight:900;letter-spacing:.09em;color:var(--muted,#68757d)}
      .ac-metrics{border:0!important;background:transparent!important;border-radius:0!important;padding:0!important;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ac-metric{border:1px solid var(--line,#d9e0e2);border-radius:12px;padding:14px;display:grid;gap:5px;border-top:4px solid #718189}.ac-metric.bad{border-top-color:#b54b4b;background:rgba(181,75,75,.05)}.ac-metric.warn{border-top-color:#b5822e;background:rgba(181,130,46,.045)}.ac-metric.good,.ac-metric.great{border-top-color:#2f8464;background:rgba(47,132,100,.05)}.ac-metric.normal{border-top-color:#4d7884}.ac-metric.muted{opacity:.72}.ac-stage{font-size:10px;font-weight:900;letter-spacing:.1em}.ac-metric h4{margin:0;font-size:15px}.ac-values{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.ac-values b{font-size:23px}.ac-values span{font-size:12px;color:var(--muted,#68757d)}.ac-metric strong{font-size:13px}.ac-metric p,.ac-metric small{margin:0;color:var(--muted,#68757d);font-size:12px;line-height:1.4}
      .ac-next-inline{border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:12px;padding:14px 15px;display:grid;grid-template-columns:minmax(180px,280px) minmax(0,1fr);gap:16px;align-items:center;background:rgba(84,110,116,.03)}.ac-next-inline.bad{border-left-color:#b54b4b}.ac-next-inline.warn{border-left-color:#b5822e}.ac-next-inline.good,.ac-next-inline.great{border-left-color:#2f8464}.ac-next-inline span{font-size:9px;font-weight:900;letter-spacing:.09em}.ac-next-inline b{display:block;margin-top:3px}.ac-next-inline p{margin:0;line-height:1.45}
      .ac-video-actions{padding-top:2px}
      .ac-baseline-grid,.ac-channel{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ac-baseline-grid>div,.ac-channel-card{padding:13px;border:1px solid var(--line,#d9e0e2);border-radius:11px;display:grid;gap:3px}.ac-baseline-grid span,.ac-channel-card span{font-size:11px;font-weight:800}.ac-baseline-grid b,.ac-channel-card b{font-size:20px}.ac-baseline-grid small,.ac-channel-card small{color:var(--muted,#68757d)}
      .ac-decision-callout{border:1px solid var(--line,#d9e0e2);border-radius:12px;padding:14px;background:rgba(84,110,116,.035);display:grid;gap:4px}.ac-decision-callout span{font-size:9px;font-weight:900;letter-spacing:.09em}.ac-decision-callout b{line-height:1.45}
      .ac-badge{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800;background:rgba(84,110,116,.1)}.ac-badge.bad,.ac-row strong.bad{color:#a23d3d}.ac-badge.warn,.ac-row strong.warn{color:#956713}.ac-badge.great,.ac-row strong.great,.ac-badge.good,.ac-row strong.good{color:#237055}
      .ac-recent{display:grid}.ac-row{display:grid;grid-template-columns:minmax(0,1fr) 78px minmax(150px,auto);gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line,#d9e0e2)}.ac-row:last-child{border-bottom:0}.ac-row>div{display:grid;gap:3px}.ac-row small{color:var(--muted,#68757d)}.ac-row strong{text-align:right}
      .ac-full{padding:0}.ac-full>summary{cursor:pointer;display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:center;padding:16px 22px;list-style:none}.ac-full>summary::-webkit-details-marker{display:none}.ac-full>summary span:last-child{display:grid;gap:2px}.ac-full>summary small{font-weight:400;color:var(--muted,#68757d)}.ac-full-inner{padding:0 22px 20px;border-top:1px solid var(--line,#d9e0e2);margin-top:0}.ac-full-inner>.cg-native-section:first-child{margin-top:18px}
      .ac-diagnosis-evidence{border-left:5px solid #55757a!important}.ac-diagnosis-evidence.bad{border-left-color:#b54b4b!important}.ac-diagnosis-evidence.warn{border-left-color:#b5822e!important}.ac-mini-evidence p{padding:7px 0;border-bottom:1px solid var(--line,#ddd);margin:0}
      @media(max-width:900px){.ac-section-head{grid-template-columns:40px minmax(0,1fr)}.ac-section-head>.ac-top-badge,.ac-section-head>.ac-badge,.ac-section-head>.btn{grid-column:2}.ac-age-grid,.ac-metrics,.ac-baseline-grid,.ac-channel{grid-template-columns:repeat(2,minmax(0,1fr))}.ac-next-inline{grid-template-columns:1fr}}
      @media(max-width:560px){.ac-shell{gap:16px}.ac-section{border-radius:13px}.ac-section-head{grid-template-columns:32px minmax(0,1fr);padding:15px 14px;gap:10px}.ac-section-index{width:28px;height:28px;border-radius:8px}.ac-section-head h2{font-size:18px}.ac-section-body{padding:14px}.ac-age-grid,.ac-metrics,.ac-baseline-grid,.ac-channel{grid-template-columns:1fr}.ac-row{grid-template-columns:1fr auto}.ac-row .ac-badge{grid-column:1/-1}.ac-full>summary{grid-template-columns:32px 1fr;padding:14px}.ac-full-inner{padding:0 14px 14px}}
`
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
