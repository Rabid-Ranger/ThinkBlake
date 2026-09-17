(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.AcceleratorAnalyticsStreamline=api;if(root.document)api.install(root);}
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';

  const WINDOWS={
    24:{short:'24h',label:'Launch',purpose:'Early signal only'},
    48:{short:'48h',label:'Triage',purpose:'Check obvious problems'},
    168:{short:'7d',label:'Diagnosis',purpose:'Main video read'},
    672:{short:'28d',label:'Programming',purpose:'What to repeat or change'}
  };
  const WINDOW_KEY={24:'_24h',48:'_48h',168:'_7d',672:'_28d'};
  const n=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const count=v=>n(v)===null?'—':Math.round(n(v)).toLocaleString();
  const rate=v=>n(v)===null?'—':(n(v)*100).toFixed(1)+'%';
  const seconds=v=>n(v)===null?'—':Math.round(n(v))+' sec';
  const signed=v=>n(v)===null?'—':(n(v)>=0?'+':'')+n(v).toFixed(1);
  const multiple=v=>n(v)===null?'—':n(v).toFixed(2)+'×';

  function metricDiff(x,kind){
    if(!x)return 'No fair comparison yet';
    const parts=[];
    if(n(x.multiple)!==null)parts.push(multiple(x.multiple)+' normal');
    if(kind==='rate'&&n(x.deltaPp)!==null)parts.push(signed(x.deltaPp)+' pp');
    else if(kind==='seconds'&&n(x.deltaSeconds)!==null)parts.push((n(x.deltaSeconds)>=0?'+':'')+Math.round(n(x.deltaSeconds))+' sec');
    else if(kind==='count'&&n(x.relativeChangePct)!==null)parts.push((n(x.relativeChangePct)>=0?'+':'')+Math.round(n(x.relativeChangePct))+'%');
    return parts.join(' · ')||'No fair comparison yet';
  }
  function signalLabel(signal){return signal?.label||'Not enough data';}
  function signalTone(signal){return signal?.tone||'muted';}
  function metricCard(stage,label,x,signal,kind,format){
    const sample=n(x?.n)||0;
    return '<div class="as-metric '+esc(signalTone(signal))+'"><div class="as-stage">'+esc(stage)+'</div><div class="as-metric-head"><h4>'+esc(label)+'</h4><strong>'+esc(signalLabel(signal))+'</strong></div><div class="as-value-row"><b>'+format(x?.current)+'</b><span>normal '+format(x?.baseline)+'</span></div><div class="as-diff">'+esc(metricDiff(x,kind))+'</div><small>'+(sample?sample+' comparable value'+(sample===1?'':'s'):'No verified normal yet')+'</small></div>';
  }
  function matchingBaseline(c,v,h,W){
    try{if(W.clarityMatchingBaseline)return W.clarityMatchingBaseline(c,v,h);}catch(_){}
    const bs=W.baselines(c,h),p=W.prefs(c);
    return bs.find(x=>x.id===p.baselineId)||bs[0]||null;
  }
  function selectedVideo(c,W){
    const p=W.prefs(c),vs=W.videos(c);
    if(!vs.some(v=>v.id===p.videoId))p.videoId=vs[0]?.id||'';
    return {p,vs,v:vs.find(v=>v.id===p.videoId)||vs[0]||null};
  }
  function safeRead(c,W){
    const {p,vs,v}=selectedVideo(c,W);
    if(!v)return {p,vs,v,b:null,r:{status:'needs_evidence',comparisons:{},message:'Add or import a video first.'},d:null};
    const b=matchingBaseline(c,v,p.hours,W);if(b)p.baselineId=b.id;
    let r;try{r=W.compare(c,v,b,p.hours);}catch(e){r={status:'needs_evidence',comparisons:{},message:e.message||'Comparison unavailable.'};}
    let d;try{d=W.clarityDiagnose?W.clarityDiagnose(r,p.hours):null}catch(_){d=null;}
    return {p,vs,v,b,r,d};
  }
  function baselineRecord(c,b,W){
    if(!b)return null;
    if(b.engine){
      const rows=(c.analyticsFoundation?.baselines||[]).filter(x=>x.policyId===b.id&&x.kind==='operating');
      const last=rows.at(-1);if(!last)return null;
      const get=k=>n(last.metrics?.[k]?.median);
      return {n:last.memberVideoIds?.length||last.metrics?.views?.n||last.metrics?.engagedViews?.n||0,values:{
        views:get('views'),engagedViews:get('engagedViews'),impressions:get('impressions'),ctr:get('ctr'),retention30:get('retention30'),apv:get('apv'),avdSeconds:get('avdSeconds')
      }};
    }
    return {n:n(b.manual?.n)||0,values:W.values(b.manual)};
  }
  function normalCard(c,v,h,W){
    const meta=WINDOWS[h],b=matchingBaseline(c,v,h,W),rec=baselineRecord(c,b,W);
    if(!rec)return '<div class="as-normal muted"><div><span>'+meta.short+' · '+meta.label+'</span><b>No normal yet</b></div><small>Import or build comparable '+meta.short+' results.</small></div>';
    const outcome=n(rec.values.engagedViews)!==null?rec.values.engagedViews:rec.values.views;
    const outcomeLabel=n(rec.values.engagedViews)!==null?'Engaged views':'Views';
    const watch=n(rec.values.retention30)!==null?['0:30',rate(rec.values.retention30)]:n(rec.values.apv)!==null?['APV',rate(rec.values.apv)]:['AVD',seconds(rec.values.avdSeconds)];
    return '<div class="as-normal"><div class="as-normal-head"><span>'+meta.short+' · '+meta.label+'</span><b>n='+esc(rec.n)+'</b></div><strong>'+count(outcome)+' <small>'+outcomeLabel+'</small></strong><p>CTR '+rate(rec.values.ctr)+' · '+watch[0]+' '+watch[1]+'</p></div>';
  }
  function stageTone(x){return ['weak','strong','steady','unknown'].includes(x)?x:'unknown';}
  function overallSection(c,W,ADC,guide){
    let r=null;try{r=ADC?.overallRead?ADC.overallRead(c,W,guide):W.channelRead?.(c);}catch(_){}
    if(!r)return '<section class="as-card"><div class="as-head"><div><div class="as-kicker">1 · OVERALL CHANNEL READ</div><h2>Not enough channel context yet</h2><p>Start with a fair video comparison, then add channel and audience snapshots when useful.</p></div></div></section>';
    const why=(r.why||[]).slice(0,3);
    const stages=(r.stages||[]).map(s=>'<div class="as-health '+stageTone(s.band)+'"><span>'+esc(s.label)+'</span><b>'+esc(s.value)+'</b><small>'+esc(s.sub)+'</small></div>').join('');
    return '<section class="as-card as-overall '+(String(r.focus||'').toLowerCase().includes('no clear')?'normal':'focus')+'"><div class="as-head"><div><div class="as-kicker">1 · OVERALL CHANNEL READ</div><h2>'+esc(r.focus||'No clear channel problem yet')+'</h2><p>'+esc(r.action?.video||'Use the evidence below before changing the strategy.')+'</p></div><div class="as-focus"><span>FOCUS NOW</span><b>'+esc(r.action?.job||'Use the video’s job')+'</b><small>'+esc(r.confidence||'Low')+' confidence · '+esc(r.source||'current evidence')+'</small></div></div>'+
      (why.length?'<div class="as-why">'+why.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>':'')+
      (stages?'<details class="as-details"><summary>Channel health details</summary><div class="as-health-grid">'+stages+'</div></details>':'')+
      '<div class="as-actions"><button class="btn" data-aw="mode" data-mode="channel">90-day + audience details</button><button class="btn" data-aw="diagnosis">Open Diagnosis</button></div></section>';
  }
  function videoSection(c,W){
    const {p,vs,v,b,r,d}=safeRead(c,W),meta=WINDOWS[p.hours]||WINDOWS[168],cmp=r.comparisons||{},m=d?.metrics||{};
    const outcomeKey=m.outcomeKey||((n(cmp.engagedViews?.multiple)!==null)?'engagedViews':'views');
    let watchKey=m.watchKey||'retention30';
    if(!cmp[watchKey])watchKey=n(cmp.retention30?.current)!==null?'retention30':n(cmp.apv?.current)!==null?'apv':'avdSeconds';
    const watchLabel=watchKey==='retention30'?'First 30 sec':watchKey==='apv'?'Average % viewed':'Average view duration';
    const watchKind=watchKey==='avdSeconds'?'seconds':'rate',watchFormat=watchKind==='seconds'?seconds:rate;
    const outcomeSignal=m.outcome||{},showSignal=m.show||{},clickSignal=m.click||{},watchSignal=m.watch||{};
    const headline=d?.headline||(r.status==='compared'?'Current video read':'Complete the comparison first');
    const explain=d?.explain||r.message||'Add enough comparable data to make a fair read.';
    const next=d?.next||(p.hours<168?'Treat this as an early check. Recheck at 7 days before changing the broader strategy.':'Use the creator’s job, source mix, and repeated pattern before changing the strategy.');
    const issue=d?.bottleneck||(r.status==='compared'?'NO CLEAR ISSUE':'NOT ENOUGH DATA');
    const baselineOptions=W.baselines(c,p.hours);
    const sourceRows=[['Browse',cmp.browsePct],['Suggested',cmp.suggestedPct],['Search',cmp.searchPct],['External',cmp.externalPct]].filter(([,x])=>n(x?.current)!==null||n(x?.baseline)!==null);
    const extraRows=[['Views',cmp.views,'count',count],['Engaged views',cmp.engagedViews,'count',count],['0:30',cmp.retention30,'rate',rate],['APV',cmp.apv,'rate',rate],['AVD',cmp.avdSeconds,'seconds',seconds]];
    return '<section class="as-card as-video '+esc(d?.tone||'normal')+'"><div class="as-head"><div><div class="as-kicker">2 · CURRENT VIDEO · '+meta.short+' '+meta.label.toUpperCase()+'</div><h2>'+esc(headline)+'</h2><p>'+esc(explain)+'</p></div><div class="as-focus"><span>MAIN READ</span><b>'+esc(issue)+'</b><small>'+esc(meta.purpose)+'</small></div></div>'+
      '<div class="as-controls"><label><span>Video</span><select id="aw-video">'+(vs.length?vs.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===v?.id?'selected':'')+'>'+esc(x.title)+'</option>').join(''):'<option>No videos yet</option>')+'</select></label><div class="as-checkpoints">'+Object.entries(WINDOWS).map(([h,x])=>'<button class="as-check '+(Number(h)===p.hours?'on':'')+'" data-aw="window" data-hours="'+h+'"><b>'+x.short+'</b><span>'+x.label+'</span>'+(Number(h)===168?'<em>Default</em>':'')+'</button>').join('')+'</div></div>'+
      '<div class="as-metrics">'+
        metricCard('OUTCOME',outcomeKey==='engagedViews'?'Engaged views':'Views',cmp[outcomeKey]||{},outcomeSignal,'count',count)+
        metricCard('SHOW','Impressions',cmp.impressions||{},showSignal,'count',count)+
        metricCard('CLICK','CTR',cmp.ctr||{},clickSignal,'rate',rate)+
        metricCard('WATCH',watchLabel,cmp[watchKey]||{},watchSignal,watchKind,watchFormat)+
      '</div>'+
      '<div class="as-next"><span>WHAT I’D DO NEXT</span><b>'+esc(next)+'</b></div>'+
      '<details class="as-details"><summary>Comparison details, traffic source, and alternate metrics</summary><div class="as-detail-grid">'+extraRows.map(([label,x,kind,fmt])=>'<div><span>'+label+'</span><b>'+fmt(x?.current)+'</b><small>'+esc(metricDiff(x,kind))+'</small></div>').join('')+'</div>'+
        (sourceRows.length?'<div class="as-source-grid">'+sourceRows.map(([label,x])=>'<div><span>'+label+'</span><b>'+rate(x?.current)+'</b><small>normal '+rate(x?.baseline)+(n(x?.deltaPp)!==null?' · '+signed(x.deltaPp)+' pp':'')+'</small></div>').join('')+'</div>':'<p class="as-muted">Traffic-source mix is not available for this checkpoint.</p>')+
        '<div class="as-baseline-picker"><label><span>Comparison baseline</span><select id="aw-baseline"><option value="">Choose a matching baseline</option>'+baselineOptions.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===p.baselineId?'selected':'')+'>'+esc(x.label)+'</option>').join('')+'</select></label><p>Source: '+esc(r.source||'not recorded')+'. '+esc(r.baselineName||b?.label||'No baseline selected')+'.</p></div></details>'+
      '<div class="as-actions">'+(v?.native&&!v.engineId?'<button class="btn" data-aw="result">Update video results</button>':'<button class="btn" data-aw="import">'+(v?.engineId?'Update imported results':'Import results')+'</button>')+'<button class="btn" data-aw="baseline">Build / update baseline</button><button class="btn dark" data-aw="diagnosis">Use in Diagnosis</button></div></section>';
  }
  function normalsSection(c,W){
    const {v}=selectedVideo(c,W);if(!v)return '';
    return '<section class="as-card as-normals"><div class="as-simple-head"><div><div class="as-kicker">3 · CREATOR NORMALS</div><h2>What does this creator usually get?</h2><p>Same creator, same age, current era. These are the reference points behind the read above.</p></div></div><div class="as-normal-grid">'+[24,48,168,672].map(h=>normalCard(c,v,h,W)).join('')+'</div><small class="as-muted">24h = Launch · 48h = Triage · 7d = Diagnosis · 28d = Programming. The 90-day report is channel health, not a per-video normal.</small></section>';
  }
  function patternSection(c,W){
    let p=null;try{p=W.clarityPattern?.(c)}catch(_){}
    if(!p)return '';
    const has=!!p.n,headline=!has?'Not enough 7-day reads yet':p.max?'Repeated signal: '+(p.label||'check the pattern'):'No repeated bottleneck is showing up';
    const reads=(p.reads||[]).slice(0,5);
    return '<section class="as-card as-pattern"><div class="as-simple-head"><div><div class="as-kicker">4 · RECENT PATTERN</div><h2>'+esc(headline)+'</h2><p>'+esc(p.explain||'Wait for repeated evidence before making a channel-wide change.')+'</p></div><span class="as-badge">'+esc(p.confidence||'Nothing repeating yet')+'</span></div>'+
      (reads.length?'<div class="as-recent">'+reads.map(x=>'<div><span>'+esc(x.v?.title||'Video')+'</span><b>'+(n(x.d?.outcomeMultiple)===null?'—':multiple(x.d.outcomeMultiple)+' normal')+'</b><small>'+esc(x.d?.bottleneck||'No clear issue')+'</small></div>').join('')+'</div>':'')+
      '<div class="as-next small"><span>PATTERN-LEVEL NEXT MOVE</span><b>'+esc(p.next||'Keep collecting fair 7-day reads.')+'</b></div></section>';
  }
  function channelMetric(label,key,d,kind='count'){
    const a=n(d.starting?.[key]),z=n(d.current?.[key]);
    let delta='No fair comparison yet';
    if(d.comparable&&a!==null&&z!==null){
      if(kind==='rate')delta=(z-a>=0?'+':'')+(z-a).toFixed(1)+' pp';
      else if(a!==0)delta=((z/a-1)>=0?'+':'')+((z/a-1)*100).toFixed(0)+'%';
    }
    const fmt=kind==='rate'?(v=>n(v)===null?'—':n(v).toFixed(1)+'%'):kind==='decimal'?(v=>n(v)===null?'—':n(v).toFixed(2)):count;
    return '<div class="as-channel-metric"><span>'+esc(label)+'</span><b>'+fmt(z)+'</b><small>'+esc(delta)+' vs starting</small></div>';
  }
  function channelDetails(c,W,ADC,guide){
    const d=W.channel(c),r=ADC?.overallRead?ADC.overallRead(c,W,guide):null,a=r?.audience||{};
    const sourceKeys=[['browsePct','Browse'],['suggestedPct','Suggested'],['searchPct','Search'],['externalPct','External']];
    const extra=[];
    for(const [k,label] of [['newUploadViews','New-upload views'],['libraryViews','Library views'],['qualifiedLeads','Qualified leads'],['bookings','Bookings'],['sales','Sales']])if(n(d.current?.[k])!==null)extra.push(channelMetric(label,k,d));
    return '<section class="as-card as-channel-details"><div class="as-head"><div><div class="as-kicker">CHANNEL DETAILS · 90 DAYS + AUDIENCE</div><h2>'+(d.comparable?'Starting point → latest channel health':'Need two verified 90-day reports for a trend')+'</h2><p>Use this for whole-channel movement. Do not use 90-day totals as a video baseline.</p></div><div class="as-focus"><span>MODE</span><b>Channel health</b><small>Video diagnosis stays creator-relative and same-age.</small></div></div>'+
      '<div class="as-channel-grid">'+channelMetric('Views','views',d)+channelMetric('Engaged views','engagedViews',d)+channelMetric('Impressions','impressions',d)+channelMetric('CTR','ctr',d,'rate')+channelMetric('Watch time','watchTime',d) + extra.join('')+'</div>'+
      '<details class="as-details" open><summary>Audience · rolling 28 days</summary><div class="as-channel-grid">'+
        [['New viewers','newViewers'],['Casual','casual'],['Regular','regular'],['Returning','returning']].map(([label,k])=>'<div class="as-channel-metric"><span>'+label+'</span><b>'+count(a[k])+'</b><small>'+esc(a.changes?.[k]==null?'No prior comparison':((a.changes[k]-1)>=0?'+':'')+((a.changes[k]-1)*100).toFixed(0)+'% vs prior')+'</small></div>').join('')+
        '<div class="as-channel-metric"><span>Avg views / viewer</span><b>'+((n(a.avgViewsPerViewer)===null)?'—':n(a.avgViewsPerViewer).toFixed(2))+'</b><small>'+esc(a.changes?.avgViewsPerViewer==null?'No prior comparison':((a.changes.avgViewsPerViewer-1)>=0?'+':'')+((a.changes.avgViewsPerViewer-1)*100).toFixed(0)+'% vs prior')+'</small></div></div></details>'+
      '<details class="as-details"><summary>Traffic-source context</summary><div class="as-source-grid">'+sourceKeys.map(([k,label])=>{const z=n(d.current?.[k]),s=n(d.starting?.[k]);return '<div><span>'+label+'</span><b>'+(z===null?'—':z.toFixed(1)+'%')+'</b><small>'+(s===null?'No starting value':'start '+s.toFixed(1)+'%'+(z!==null?' · '+(z-s>=0?'+':'')+(z-s).toFixed(1)+' pp':''))+'</small></div>';}).join('')+'</div></details>'+
      '<div class="as-actions"><button class="btn" data-aw="mode" data-mode="video">Back to video read</button><button class="btn" data-cg="analytics-snapshot-new">Add 90-day report</button><button class="btn dark" data-aw="diagnosis">Open Diagnosis</button></div></section>';
  }
  function renderBody(c,W,ADC,guide){
    const p=W.prefs(c);
    const overall=overallSection(c,W,ADC,guide);
    if(p.mode==='channel')return '<div class="as-shell">'+overall+channelDetails(c,W,ADC,guide)+'</div>';
    return '<div class="as-shell">'+overall+videoSection(c,W)+normalsSection(c,W)+patternSection(c,W)+'</div>';
  }
  function compactStudioTools(win){
    const tools=win.document.getElementById('studio-tools');if(!tools||tools.dataset.asStreamlined)return;
    tools.dataset.asStreamlined='1';tools.classList.add('as-tools');
    if(!tools.querySelector('.as-tools-kicker')){const k=win.document.createElement('div');k.className='as-kicker as-tools-kicker';k.textContent='0 · DATA';tools.prepend(k);}
    const h2=tools.querySelector('h2');if(h2)h2.textContent='Update analytics data';
    const ps=tools.querySelectorAll(':scope > p');if(ps[0])ps[0].innerHTML='Use <b>Studio prompts</b> to collect the data, then <b>Paste Studio results</b>. The dashboard stores missing fields as missing instead of guessing.';
    const actions=tools.querySelectorAll(':scope > .actions');
    if(actions[1]){
      const details=win.document.createElement('details');details.className='as-tools-advanced';
      const summary=win.document.createElement('summary');summary.textContent='Manual and advanced data tools';
      actions[1].before(details);details.append(summary,actions[1]);
    }
    if(ps.length>1)for(let i=1;i<ps.length;i++)ps[i].classList.add('as-tools-note');
  }
  function decorate(win){
    const page=win.document.querySelector('.cg-native-analytics');if(!page)return;
    const lead=page.querySelector('.cg-native-hero .lead');if(lead)lead.textContent='Start with the creator’s normal. Find what changed. Decide what to do next.';
    compactStudioTools(win);
  }
  function install(win){
    if(win.__acceleratorAnalyticsStreamlineV1)return;win.__acceleratorAnalyticsStreamlineV1=true;
    const W=win.AcceleratorAnalyticsWorkspace,ADC=win.AcceleratorDecisionContext,guide=win.__acceleratorCoachGuide;if(!W||!guide)return;
    W.body=c=>renderBody(c,W,ADC,guide);
    const style=win.document.createElement('style');style.id='analytics-streamline-style';style.textContent=`
      .as-shell{display:grid;gap:18px}.as-card{border:1px solid var(--line,#d9e0e2);border-radius:16px;background:var(--card,#fff);overflow:hidden}.as-card.focus{border-left:5px solid #366f7a}.as-card.bad{border-left:5px solid #b54b4b}.as-card.warn{border-left:5px solid #b5822e}.as-card.great,.as-card.good{border-left:5px solid #2f8464}.as-head,.as-simple-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,340px);gap:16px;padding:18px 20px;border-bottom:1px solid var(--line,#d9e0e2);align-items:start}.as-simple-head{grid-template-columns:minmax(0,1fr) auto}.as-head h2,.as-simple-head h2{margin:3px 0 6px;font-size:22px;line-height:1.15}.as-head p,.as-simple-head p{margin:0;color:var(--muted,#68757d);line-height:1.45}.as-kicker{font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#68757d)}.as-focus{padding:12px;border-radius:11px;background:rgba(75,104,110,.08);display:grid;gap:4px}.as-focus span{font-size:9px;font-weight:900;letter-spacing:.08em}.as-focus b{font-size:14px;line-height:1.35}.as-focus small{color:var(--muted,#68757d);line-height:1.35}.as-why{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:14px 20px 0}.as-why span{padding:10px;border:1px solid var(--line,#d9e0e2);border-radius:9px;font-size:12px;line-height:1.4}.as-actions{display:flex;gap:8px;flex-wrap:wrap;padding:14px 20px 18px}.as-details{margin:12px 20px 0!important;border-top:1px solid var(--line,#d9e0e2);padding-top:10px}.as-details summary{font-weight:800;cursor:pointer}.as-health-grid,.as-channel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:12px}.as-health,.as-channel-metric{border:1px solid var(--line,#d9e0e2);border-radius:10px;padding:11px;display:grid;gap:4px}.as-health span,.as-channel-metric span{font-size:9px;font-weight:900;letter-spacing:.06em}.as-health b,.as-channel-metric b{font-size:13px;line-height:1.35}.as-health small,.as-channel-metric small{color:var(--muted,#68757d);line-height:1.35}.as-health.weak{border-top:4px solid #b54b4b}.as-health.strong{border-top:4px solid #2f8464}.as-health.steady{border-top:4px solid #55757a}.as-health.unknown{opacity:.65}.as-controls{display:grid;grid-template-columns:minmax(260px,1fr) minmax(420px,1.5fr);gap:14px;padding:16px 20px}.as-controls label{display:grid;gap:6px;font-weight:800}.as-controls select,.as-baseline-picker select{width:100%;min-width:0}.as-checkpoints{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.as-check{position:relative;border:1px solid var(--line,#d9e0e2);border-radius:10px;padding:9px;text-align:left;background:transparent;color:inherit;display:grid;gap:1px;cursor:pointer}.as-check.on{border-color:#245c5b;box-shadow:inset 0 0 0 1px #245c5b;background:rgba(36,92,91,.04)}.as-check b{font-size:13px}.as-check span{font-size:11px}.as-check em{font-style:normal;font-size:8px;text-transform:uppercase;letter-spacing:.06em;opacity:.65}.as-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:0 20px 16px}.as-metric{border:1px solid var(--line,#d9e0e2);border-top:4px solid #55757a;border-radius:11px;padding:12px;display:grid;gap:6px}.as-metric.bad{border-top-color:#b54b4b;background:rgba(181,75,75,.04)}.as-metric.warn{border-top-color:#b5822e;background:rgba(181,130,46,.04)}.as-metric.good,.as-metric.great{border-top-color:#2f8464;background:rgba(47,132,100,.04)}.as-metric.muted{opacity:.7}.as-stage{font-size:9px;font-weight:900;letter-spacing:.09em}.as-metric-head{display:flex;justify-content:space-between;gap:8px;align-items:start}.as-metric-head h4{margin:0;font-size:14px}.as-metric-head strong{font-size:10px;text-align:right}.as-value-row{display:flex;gap:7px;align-items:baseline;flex-wrap:wrap}.as-value-row b{font-size:22px}.as-value-row span,.as-metric small{font-size:11px;color:var(--muted,#68757d)}.as-diff{font-size:12px;font-weight:800}.as-next{margin:0 20px;padding:13px 14px;border-radius:10px;background:rgba(75,104,110,.07);display:grid;gap:4px}.as-next span{font-size:9px;font-weight:900;letter-spacing:.08em}.as-next b{line-height:1.45}.as-next.small{margin:14px 20px 18px}.as-detail-grid,.as-source-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.as-detail-grid>div,.as-source-grid>div{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:10px;display:grid;gap:3px}.as-detail-grid span,.as-source-grid span{font-size:9px;font-weight:900}.as-detail-grid small,.as-source-grid small{color:var(--muted,#68757d)}.as-baseline-picker{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,1fr);gap:12px;margin-top:12px;align-items:end}.as-baseline-picker label{display:grid;gap:5px;font-weight:800}.as-baseline-picker p{margin:0;color:var(--muted,#68757d);font-size:12px}.as-normal-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:16px 20px}.as-normal{border:1px solid var(--line,#d9e0e2);border-radius:10px;padding:11px;display:grid;gap:5px}.as-normal.muted{opacity:.65}.as-normal-head{display:flex;justify-content:space-between;gap:8px}.as-normal-head span{font-size:10px;font-weight:900}.as-normal-head b{font-size:10px}.as-normal strong{font-size:18px}.as-normal strong small{font-size:10px;font-weight:500;color:var(--muted,#68757d)}.as-normal p{margin:0;font-size:11px;color:var(--muted,#68757d)}.as-normals>.as-muted{display:block;padding:0 20px 16px}.as-muted{color:var(--muted,#68757d);font-size:11px}.as-badge{align-self:start;padding:6px 9px;border-radius:999px;background:rgba(75,104,110,.08);font-size:10px;font-weight:800}.as-recent{display:grid;padding:10px 20px}.as-recent>div{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(120px,220px);gap:10px;padding:10px 0;border-bottom:1px solid var(--line,#d9e0e2);align-items:center}.as-recent>div:last-child{border-bottom:0}.as-recent b{font-size:12px}.as-recent small{color:var(--muted,#68757d);text-align:right}.as-tools{padding:14px 18px!important}.as-tools h2{font-size:17px!important;margin-bottom:4px!important}.as-tools>p{font-size:12px;margin:5px 0}.as-tools .studio-primary-actions{margin:8px 0}.as-tools-advanced{margin:6px 0!important}.as-tools-advanced summary{font-size:11px;font-weight:800}.as-tools-note{opacity:.72}.cg-native-hero .lead{max-width:760px}.cg-native-analytics>.cg-native-hero{margin-bottom:14px}
      @media(max-width:1000px){.as-head{grid-template-columns:1fr}.as-health-grid,.as-channel-grid,.as-metrics,.as-normal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.as-controls{grid-template-columns:1fr}.as-why{grid-template-columns:1fr}.as-detail-grid,.as-source-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){.as-health-grid,.as-channel-grid,.as-metrics,.as-normal-grid,.as-detail-grid,.as-source-grid{grid-template-columns:1fr}.as-checkpoints{grid-template-columns:repeat(2,minmax(0,1fr))}.as-simple-head{grid-template-columns:1fr}.as-baseline-picker{grid-template-columns:1fr}.as-recent>div{grid-template-columns:1fr}.as-recent small{text-align:left}.as-actions .btn{flex:1 1 100%}}
    `;win.document.head.appendChild(style);
    const paint=()=>decorate(win);let queued=false;
    new win.MutationObserver(()=>{if(queued)return;queued=true;win.requestAnimationFrame(()=>{queued=false;paint();});}).observe(win.document.documentElement,{childList:true,subtree:true});
    paint();
    try{if(win.AcceleratorDeskBridge?.analyticsActive?.())win.__acceleratorCoachGuide.analyticsPage();}catch(_){}
  }
  return {WINDOWS,metricDiff,renderBody,install,baselineRecord};
});
