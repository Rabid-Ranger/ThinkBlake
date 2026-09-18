(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){ root.AcceleratorDecisionContext=api; if(root.document) api.install(root); }
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';

  const AGE_ORDER=[24,48,168,672];
  const WINDOW_KEY={24:'_24h',48:'_48h',168:'_7d',672:'_28d'};
  const AGE_NAME={24:'24h',48:'48h',168:'7d',672:'28d'};
  const STAGE_TO_FOCUS={reach:'Topic / Reach',packaging:'Title / thumbnail',retention:'Opening / watch experience'};
  const n=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ratio=(a,b)=>n(a)!==null&&n(b)!==null&&n(b)!==0?n(a)/n(b):null;
  const pct=v=>n(v)===null?'—':n(v).toFixed(1)+'%';
  const fmt=v=>n(v)===null?'—':Math.round(n(v)).toLocaleString();
  const signed=v=>n(v)===null?'—':(v>=0?'+':'')+(v*100).toFixed(0)+'%';

  function snapshots(c){
    return (c?.coachOS?.analytics?.snapshots||[]).filter(x=>x&&x.period==='90d').slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  }
  function audienceSnapshots(c){
    const dedicated=(c?.coachOS?.analytics?.audienceSnapshots||[]).filter(Boolean).slice().sort((a,b)=>String(a.asOf||a.date||'').localeCompare(String(b.asOf||b.date||'')));
    if(dedicated.length)return dedicated.map(x=>({...(x.metrics||{}),...x,sourceWindow:'28-day monthly audience',legacyWindow:false}));
    const legacy=snapshots(c).filter(x=>['newViewers','casual','regular','returning','avgViewsPerViewer'].some(k=>n(x[k])!==null));
    return legacy.map(x=>({...x,sourceWindow:'legacy saved audience data · refresh with 28-day snapshot',legacyWindow:true}));
  }
  function audienceRead(c){
    const rows=audienceSnapshots(c),cur=rows.at(-1)||{},prev=rows.at(-2)||{};
    const change=k=>ratio(cur[k],prev[k]);
    const changes={
      newViewers:change('newViewers'),
      casual:change('casual'),
      regular:change('regular'),
      returning:change('returning'),
      avgViewsPerViewer:change('avgViewsPerViewer')
    };
    const repeatEntries=['casual','regular','returning'].map(k=>[k,changes[k]]).filter(x=>x[1]!==null);
    const repeatValues=repeatEntries.map(x=>x[1]).sort((a,b)=>a-b);
    const loyalty=repeatValues.length?(repeatValues.length%2?repeatValues[Math.floor(repeatValues.length/2)]:(repeatValues[repeatValues.length/2-1]+repeatValues[repeatValues.length/2])/2):null;
    const acquisition=changes.newViewers,depth=changes.avgViewsPerViewer;
    const band=r=>r===null?'unknown':r<.85?'weak':r>1.05?'strong':'steady';
    let read='Not enough audience data yet.',focus='Need another comparable 28-day audience snapshot.';
    if(rows.length>=2){
      if(band(acquisition)==='weak'&&['steady','strong'].includes(band(loyalty))){
        read='Repeat viewing looks healthier than new-viewer growth.';
        focus='Reach is the audience-side pressure: bring in more of the right new viewers while protecting what is already bringing people back.';
      }else if(['steady','strong'].includes(band(acquisition))&&band(loyalty)==='weak'){
        read='New people are arriving, but repeat viewing is weaker.';
        focus='Trust is the audience-side pressure: make the next useful video obvious and give viewers stronger reasons to return.';
      }else if(band(acquisition)==='weak'&&band(loyalty)==='weak'){
        read='Both new-viewer growth and repeat viewing are weak.';
        focus='This is broader than one audience metric. Check the earlier diagnosis stages, then the content mix and channel promise.';
      }else if(['steady','strong'].includes(band(acquisition))&&['steady','strong'].includes(band(loyalty))){
        read='New-viewer growth and repeat viewing both look healthy.';
        focus='Audience growth is not the obvious break. Protect what is working and keep checking the rest of the diagnosis.';
      }
      if(depth!==null&&band(depth)==='weak')focus+=' Average views per viewer is also down, so viewers may not be going as deep into the channel.';
      if(depth!==null&&band(depth)==='strong')focus+=' Average views per viewer is up, which supports stronger channel depth.';
    }
    const curDate=Date.parse(cur.asOf||cur.date||''),prevDate=Date.parse(prev.asOf||prev.date||''),gapDays=Number.isFinite(curDate)&&Number.isFinite(prevDate)?Math.round((curDate-prevDate)/86400000):null;
    const overlapDays=gapDays!==null&&gapDays<28?28-gapDays:0;
    return {
      current:cur,previous:prev,hasCurrent:Boolean(rows.length),hasComparison:rows.length>=2,sourceWindow:cur.sourceWindow||'28-day monthly audience',legacyWindow:Boolean(cur.legacyWindow),
      changes,
      acquisition,acquisitionBand:band(acquisition),
      loyaltyKey:repeatEntries.length>1?'repeat audience':repeatEntries[0]?.[0]||null,
      loyalty,loyaltyBand:band(loyalty),loyaltySignals:repeatEntries,
      depth,depthBand:band(depth),read,focus,overlapDays,
      newViewers:n(cur.newViewers),casual:n(cur.casual),regular:n(cur.regular),returning:n(cur.returning),avgViewsPerViewer:n(cur.avgViewsPerViewer)
    };
  }
  function baselineTrajectory(c){
    const sets=(c?.coachOS?.baseline?.sets||[]).filter(x=>x&&!x.archived&&x.confirmedComparable);
    const history=c?.coachOS?.baseline?.history||[];
    const metricKeys=['views','engagedViews','impressions','ctr','ret30','apv','avdSeconds'];
    return AGE_ORDER.map(hours=>{
      const key=WINDOW_KEY[hours],candidates=sets.filter(x=>x.window===key);
      const current=candidates.find(x=>x.primary)||candidates[0];
      if(!current)return {hours,key,current:null,first:null,outcomeKey:null,growth:null,metrics:{},hasHistory:false};
      const prior=history.filter(x=>x&&(x.id===current.id||x.sourceBaselineId===current.id)).sort((a,b)=>String(a.effectiveFrom||a.savedAt||'').localeCompare(String(b.effectiveFrom||b.savedAt||'')));
      const first=prior[0]||current,hasHistory=prior.length>0;
      const metrics={};
      for(const k of metricKeys){
        const cur=n(current[k]),start=n(first[k]),isRate=['ctr','ret30','apv'].includes(k);
        metrics[k]={current:cur,first:start,change:hasHistory&&cur!==null&&start!==null?(isRate?cur-start:ratio(cur,start)):null};
      }
      const outcomeKey=n(current.engagedViews)!==null?'engagedViews':n(current.views)!==null?'views':n(current.impressions)!==null?'impressions':null;
      const growth=hasHistory&&outcomeKey?ratio(current[outcomeKey],first[outcomeKey]):null;
      return {hours,key,current,first,outcomeKey,growth,metrics,hasHistory,sample:n(current.n)||0};
    });
  }
  function stageBand(r){
    if(r===null)return 'unknown';
    if(r<.85)return 'weak';
    if(r>1.05)return 'strong';
    return 'steady';
  }
  function channelStages(c,audience){
    const rows=snapshots(c),cur=rows.at(-1)||{},prev=rows.at(-2)||{};
    const defsKnown=cur.metricDefinitionId&&prev.metricDefinitionId&&!/unknown|unspecified|unverified/i.test(String(cur.metricDefinitionId))&&cur.metricDefinitionId===prev.metricDefinitionId;
    const engagedComparable=defsKnown&&n(cur.engagedViews)!==null&&n(prev.engagedViews)!==null;
    const viewsComparable=defsKnown&&n(cur.views)!==null&&n(prev.views)!==null;
    const impressions=ratio(cur.impressions,prev.impressions),watchTime=ratio(cur.watchTime,prev.watchTime);
    const attention=engagedComparable?ratio(cur.engagedViews,prev.engagedViews):viewsComparable?ratio(cur.views,prev.views):impressions;
    const attentionLabel=engagedComparable?'Engaged views':viewsComparable?'Views':'Impressions';
    const returnRatio=audience.loyalty,depth=audience.depth;
    const resultKey=['qualifiedLeads','bookings','sales'].find(k=>n(cur[k])!==null&&n(prev[k])!==null)||null;
    const resultRatio=resultKey?ratio(cur[resultKey],prev[resultKey]):null;
    const phrase=(r,label)=>r===null?'No comparable trend yet':label+' '+signed(r-1)+' vs prior';
    return [
      {key:'attention',label:'ATTENTION',band:stageBand(attention),value:phrase(attention,attentionLabel),sub:(defsKnown?'':'Views definition is not verified across these reports, so this read uses Impressions instead. ')+(watchTime===null?'':'Watch time '+signed(watchTime-1)+' vs prior.'),action:attention!==null&&attention<.85?'Check whether the decline is new-upload opportunity, traffic mix, market demand, or library contribution before changing packaging.':'Keep checking whether attention is translating into repeat viewing, not just raw reach.'},
      {key:'return',label:'RETURN',band:stageBand(returnRatio),value:returnRatio===null?'No comparable repeat-audience trend yet':'Repeat-audience trend '+signed(returnRatio-1),sub:'Casual + Regular + Returning viewers, read together.',action:returnRatio===null?'Add/verify comparable 28-day audience snapshots.':returnRatio<.85?'Test stronger follow-ups, series, consistent promises, and obvious next-video paths.':'Repeat viewing is not the obvious break; protect what is bringing people back.'},
      {key:'depth',label:'LIBRARY DEPTH',band:stageBand(depth),value:depth===null?'Average views/viewer not connected yet':'Avg views/viewer '+signed(depth-1)+' vs prior',sub:'Is attention turning into more viewing across the channel?',action:depth===null?'Manually pull Average views per viewer in Studio Advanced Mode / SEE MORE. Also add exact new-upload vs older-library views if Studio can isolate them.':depth<.85?'Inspect own-Suggested, end screens, follow-up paths, and whether viewers have an obvious second video.':'Channel depth is holding; keep checking continuation on the videos driving it.'},
      {key:'result',label:'RESULT',band:stageBand(resultRatio),value:resultRatio===null?'Business result not connected yet':(resultKey==='qualifiedLeads'?'Qualified leads':resultKey==='bookings'?'Bookings':'Sales')+' '+signed(resultRatio-1),sub:'Is attention producing the intended business outcome?',action:resultRatio===null?'If this creator has a business goal, enter qualified leads / bookings / sales from the CRM or business system. Do not invent these from YouTube.':resultRatio<.85?'Check CTA/offer alignment and attribution before changing Reach or Trust content.':'Business result is keeping pace; protect the path that is working.'}
    ];
  }
  function patternFocus(pattern){
    if(!pattern?.max||!pattern?.stages?.length)return null;
    if(pattern.stages.length===1)return STAGE_TO_FOCUS[pattern.stages[0]]||null;
    return pattern.stages.map(x=>STAGE_TO_FOCUS[x]||x).join(' + ');
  }
  function deriveFocus(input){
    const d=input.diagnosis||{},p=input.pattern||{},a=input.audience||{},t=input.trajectory||[];
    if(d.leading&&!['Not enough data yet','Not enough evidence yet'].includes(d.leading)&&d.confidence!=='Low')return {focus:d.leading,confidence:d.confidence||'Low',source:'channel diagnosis'};
    if(p.max&&p.source==='hard')return {focus:patternFocus(p)||'Video funnel pattern',confidence:p.max>=3?'Medium':'Low',source:'repeated 7-day videos'};
    if(a.acquisitionBand==='weak'&&['steady','strong'].includes(a.loyaltyBand))return {focus:'Acquisition / gateway',confidence:'Medium',source:'audience trend'};
    if(['steady','strong'].includes(a.acquisitionBand)&&a.loyaltyBand==='weak')return {focus:'Loyalty / pathway',confidence:'Medium',source:'audience trend'};
    if(a.acquisitionBand==='weak'&&a.loyaltyBand==='weak')return {focus:'Audience growth + loyalty pressure',confidence:a.overlapDays?'Low':'Medium',source:'audience trend'};
    const seven=t.find(x=>x.hours===168);
    if(seven?.growth!==null&&seven.growth>=1.1&&!p.max)return {focus:'Growth pattern worth protecting',confidence:'Medium',source:'rising 7-day normal'};
    if(p.max)return {focus:patternFocus(p)||'A small pattern worth checking',confidence:'Low',source:'small 7-day pattern'};
    if(d.leading&&!['Not enough data yet','Not enough evidence yet'].includes(d.leading))return {focus:d.leading,confidence:'Low',source:'low-confidence channel diagnosis'};
    return {focus:'No clear channel problem yet',confidence:'Low',source:'not enough repeated data yet'};
  }
  function focusAction(focus){
    const x=String(focus||'').toLowerCase();
    if(x.includes('packag'))return {job:'Keep the video’s intended job',metric:'CTR + engaged views',video:'Plan the title + thumbnail promise before production, then change one meaningful packaging variable without changing the whole idea.'};
    if(x.includes('opening')||x.includes('viewing')||x.includes('retention'))return {job:'Trust or the video’s intended job',metric:'0:30 + APV/AVD',video:'Focus the next test on the first 30–60 seconds and delivering the promise faster. Do not make the idea smaller just to improve retention.'};
    if(x.includes('discovery')||x.includes('acquisition')||x.includes('gateway'))return {job:'Reach',metric:'Engaged views + impressions + new viewers',video:'Make a broader Reach video around a proven audience problem. Try to get in front of more of the right people without hurting CTR or watch quality.'};
    if(x.includes('audience growth + loyalty'))return {job:'Reach + Trust',metric:'New viewers + Casual / Regular / Returning',video:'Do not blame one video. Check whether the prior audience period was spike-driven, then pair stronger gateway ideas with obvious follow-ups so qualified new attention has somewhere to go next.'};
    if(x.includes('loyalty')||x.includes('pathway'))return {job:'Trust',metric:'Returning / casual / regular viewers',video:'Make the next video feel like the obvious thing to watch next: a follow-up, series, or deeper answer for the same viewer.'};
    if(x.includes('business')||x.includes('convert'))return {job:'Convert',metric:'Qualified leads / bookings',video:'Make the audience-to-offer path explicit without turning the video into an ad. Judge the video by its job, not only views.'};
    if(x.includes('growth')||x.includes('protect'))return {job:'Use the job that produced the win',metric:'7-day result + the numbers that need to stay healthy',video:'Protect what is clearly working and make one nearby follow-up instead of changing everything.'};
    if(x.includes('capacity')||x.includes('cadence'))return {job:'Any',metric:'Completed strategic reps',video:'Reduce complexity so the team can actually ship the learning rep without lowering topic, package or watch quality.'};
    return {job:'Decide from the video purpose',metric:'Use the number that matches the video’s job',video:'Use the diagnosis questions. Do not invent a problem just because the dashboard has numbers.'};
  }
  function overallRead(c,W,guide){
    const pattern=W?.clarityPattern?W.clarityPattern(c):null;
    const audience=audienceRead(c),trajectory=baselineTrajectory(c);
    let diagnosis={};
    try{diagnosis=guide?.analyticsDiagnosis?guide.analyticsDiagnosis(c):{}}catch(_){}
    const focus=deriveFocus({diagnosis,pattern,audience,trajectory}),action=focusAction(focus.focus);
    const seven=trajectory.find(x=>x.hours===168),why=[];
    if(pattern?.n){
      if(pattern.max)why.push((pattern.source==='hard'?'Repeated issue: ':'Repeated soft spot: ')+(pattern.label||patternFocus(pattern))+' in '+pattern.max+' of '+pattern.n+' recent 7-day videos.');
      else why.push('No SHOW → CLICK → WATCH issue repeats across '+pattern.n+' recent 7-day videos.');
    }
    if(seven?.current){
      const current=n(seven.current[seven.outcomeKey]);
      if(seven.growth!==null)why.push('7-day normal is '+signed(seven.growth-1)+' vs its first saved version.');
      else if(current!==null)why.push('Current 7-day normal: '+fmt(current)+' '+(seven.outcomeKey==='engagedViews'?'engaged views':'views')+'.');
    }
    if(audience.hasComparison){
      if(audience.acquisition!==null)why.push('New viewers are '+signed(audience.acquisition-1)+' vs the prior 28-day audience snapshot.');
      if(audience.loyalty!==null)why.push((audience.loyaltyKey==='repeat audience'?'Casual / Regular / Returning':audience.loyaltyKey==='regular'?'Regular':audience.loyaltyKey==='casual'?'Casual':'Returning')+' viewers are '+signed(audience.loyalty-1)+' vs prior.');
    } else if(audience.hasCurrent) why.push('Audience data is saved, but we need one more 28-day audience snapshot before we can see the trend.');
    else why.push('We do not have comparable 28-day audience snapshots yet, so New / Casual / Regular / Returning viewer trends are not affecting this read.');
    const stages=channelStages(c,audience);
    return {pattern,audience,trajectory,diagnosis,...focus,action,why,stages};
  }
  function toneFor(read){
    const x=String(read.focus||'').toLowerCase();
    if(x.includes('no clear'))return 'normal';
    if(x.includes('growth'))return 'great';
    if(read.confidence==='Low')return 'warn';
    return 'focus';
  }
  function audienceCard(label,value,change,meaning){
    let tone='muted',delta='No prior comparison';
    if(change!==null){tone=change<.85?'bad':change>1.05?'good':'normal';delta=signed(change-1)+' vs prior';}
    return '<div class="adc-audience-card '+tone+'"><span>'+esc(label)+'</span><b>'+fmt(value)+'</b><strong>'+esc(delta)+'</strong><small>'+esc(meaning)+'</small></div>';
  }
  function baselinePills(read){
    const countFmt=v=>n(v)===null?'—':Math.round(n(v)).toLocaleString();
    const rateFmt=v=>n(v)===null?'—':n(v).toFixed(1)+'%';
    const durationFmt=v=>n(v)===null?'—':Math.floor(n(v)/60)+':'+String(Math.round(n(v)%60)).padStart(2,'0');
    return read.trajectory.map(x=>{
      if(!x.current)return '<button class="adc-baseline-pill muted" data-adc-baseline-window="'+x.hours+'"><span>'+AGE_NAME[x.hours]+'</span><b>No baseline</b><small>Not ready</small></button>';
      const m=x.metrics||{},watch=n(m.ret30?.current)!==null?['0:30',rateFmt(m.ret30.current)]:n(m.apv?.current)!==null?['APV',rateFmt(m.apv.current)]:['AVD',durationFmt(m.avdSeconds?.current)];
      const views=n(m.engagedViews?.current)!==null?'Engaged '+countFmt(m.engagedViews.current):n(m.views?.current)!==null?'Views '+countFmt(m.views.current):'Views not comparable';
      const movement=x.hasHistory&&x.outcomeKey&&x.growth!==null?' · '+signed(x.growth-1)+' since starting normal':' · starting normal';
      return '<button class="adc-baseline-pill" data-adc-baseline-window="'+x.hours+'"><span>'+AGE_NAME[x.hours]+' · '+esc(x.sample||'—')+' videos</span><b>Impr. '+esc(countFmt(m.impressions?.current))+'</b><small>CTR '+esc(rateFmt(m.ctr?.current))+' · '+esc(watch[0]+' '+watch[1])+'</small><small>'+esc(views+movement)+'</small></button>';
    }).join('');
  }
  function channelReadHtml(c,W,guide){
    const r=overallRead(c,W,guide),tone=toneFor(r),a=r.audience;
    const mini=(label,value,change)=>'<div class="adc-audience-mini"><span>'+esc(label)+'</span><b>'+esc(fmt(value))+'</b><small>'+esc(change===null?'No prior read':signed(change-1)+' vs prior')+'</small></div>';
    const health=r.stages.map(s=>'<div class="adc-stage '+s.band+'"><span>'+esc(s.label)+'</span><b>'+esc(s.value)+'</b><small>'+esc(s.sub)+'</small></div>').join('');
    const healthHelp=r.stages.map(s=>'<p><b>'+esc(s.label)+':</b> '+esc(s.action||'')+'</p>').join('');
    return '<section class="ac-section adc-overall '+tone+'" id="adc-overall-read">'+
      '<div class="ac-section-head adc-overall-head"><div class="ac-section-index">01</div><div><div class="adc-kicker">OVERALL CHANNEL READ</div><h2>'+esc(r.focus)+'</h2><p>'+esc(r.why.slice(0,2).join(' '))+'</p></div><div class="adc-focus"><span>WHAT I’D DO NOW</span><b>'+esc(r.action.video)+'</b><small>'+esc(r.confidence)+' confidence · '+esc(r.source)+'</small></div></div>'+
      '<div class="ac-section-body">'+
        '<div class="adc-subhead"><b>Normals at a glance</b><span>Click a checkpoint to inspect that same-age read. These use every compatible metric, not Views alone.</span></div>'+
        '<div class="adc-baselines">'+baselinePills(r)+'<button class="adc-baseline-pill adc-90-pill" data-ac-mode="channel"><span>90d · Channel Health</span><b>Open progress</b><small>Whole-channel movement, not a per-video normal</small></button></div>'+
        '<div class="adc-compact-block"><div class="adc-subhead"><b>Channel health</b><span>Where should I look next?</span></div><div class="adc-stages">'+health+'</div><details class="adc-help"><summary>How do I read these?</summary>'+healthHelp+'</details></div>'+
        '<div class="adc-compact-block"><div class="adc-subhead"><b>Audience · rolling 28 days</b><span>'+esc(a.read)+'</span></div><div class="adc-audience-mini-grid">'+
          mini('New',a.newViewers,a.changes?.newViewers??null)+mini('Casual',a.casual,a.changes?.casual??null)+mini('Regular',a.regular,a.changes?.regular??null)+mini('Returning',a.returning,a.changes?.returning??null)+
        '</div><details class="adc-help"><summary>What do these audience groups mean, and what do I do with them?</summary>'+
          '<p><b>New:</b> fresh people reached. If this falls while repeat viewing holds, inspect stronger gateway / Reach ideas.</p>'+
          '<p><b>Casual:</b> occasional repeat viewers. If this weakens, inspect follow-ups, series, consistency, and whether a viewer has an obvious next video.</p>'+
          '<p><b>Regular:</b> long-term consistent viewers. The definition is strict, so direction over several snapshots matters more than the raw size.</p>'+
          '<p><b>Returning:</b> prior viewers who came back. If this falls, check continuation, cadence, topic consistency, and watch-next paths.</p>'+
          '<p><b>How to use this read:</b> '+esc(a.focus)+'</p>'+
          (a.overlapDays?'<p><b>Caution:</b> these rolling snapshots overlap by about '+esc(a.overlapDays)+' day'+(a.overlapDays===1?'':'s')+', so treat the direction as a clue rather than a clean before/after experiment.</p>':'')+
        '</details></div>'+
        '<div class="adc-overall-foot"><span><b>Program job:</b> '+esc(r.action.job)+'</span><span><b>Main measure:</b> '+esc(r.action.metric)+'</span><button class="btn" data-ac-mode="channel">Open 90-day progress</button></div>'+
      '</div>'+
    '</section>';
  }
  function diagnosisHtml(c,W,guide){
    const r=overallRead(c,W,guide),p=r.pattern,a=r.audience,tone=toneFor(r);
    let verdict='The data is not pointing to one clear answer yet.';
    if(r.focus!=='No clear channel problem yet')verdict='The data is pointing you toward '+r.focus+'.';
    const support=[];
    if(p?.max)support.push((p.source==='hard'?'Hard':'Soft')+' video pattern: '+(p.label||patternFocus(p))+' · '+p.max+' of '+p.n+' recent 7-day videos.');
    if(a.acquisition!==null)support.push('New viewers '+signed(a.acquisition-1)+' vs prior 90-day report.');
    if(a.loyalty!==null)support.push((a.loyaltyKey==='repeat audience'?'Casual / Regular / Returning viewers':(a.loyaltyKey||'Repeat audience'))+' '+signed(a.loyalty-1)+' vs prior.');
    const decision='If the rest of the diagnosis agrees, use '+r.focus+' as the main focus. If the creator goal, audience fit, offer, capacity, or business situation points somewhere else, check that before locking the plan.';
    return '<section class="studio-data adc-diagnosis '+tone+'" id="studio-diagnosis-data"><div class="kicker">WHAT THE DATA IS SAYING</div><h3>'+esc(verdict)+'</h3><p><b>Why:</b> '+esc((support.length?support:r.why).slice(0,3).join(' '))+'</p><div class="adc-decision-grid"><div><span>What the data suggests</span><b>'+esc(r.focus)+'</b><small>'+esc(r.confidence)+' confidence</small></div><div><span>If you accept it</span><b>'+esc(r.action.video)+'</b><small>Main number to watch: '+esc(r.action.metric)+'</small></div></div><p><b>How to use this in the diagnosis:</b> '+esc(decision)+'</p><p><b>Do not force it:</b> Repeated numbers can show you where to look. They still do not tell you exactly why it happened.</p><button class="btn" data-studio="analytics">Open Analytics</button></section>';
  }
  function videoFocusHtml(c,W,guide){
    const r=overallRead(c,W,guide),tone=toneFor(r);
    return '<section class="adc-video-focus '+tone+'" id="adc-video-focus"><div><div class="adc-kicker">DATA FOCUS FOR THIS VIDEO</div><h3>'+esc(r.focus)+'</h3><p>'+esc(r.action.video)+'</p></div><div class="adc-video-meta"><span><b>Why:</b> '+esc(r.why.slice(0,2).join(' '))+'</span><span><b>Suggested job:</b> '+esc(r.action.job)+'</span><span><b>Main number to watch:</b> '+esc(r.action.metric)+'</span><small>You can intentionally make a video that does not address this focus. If you do, know why.</small></div></section>';
  }

  function planSuggestion(r){
    const focus=String(r?.focus||'No clear channel problem yet'),x=focus.toLowerCase();
    let primaryMetricKey='engagedViews',job=r?.action?.job||'Decide from the plan',mix='Keep the existing Reach / Trust / Convert mix unless the diagnosis gives you a reason to change it.';
    let hypothesis='If we improve the current focus, the result should improve without hurting CTR or watch quality.';
    let success='Across several similar videos, the main number improves toward what this creator usually gets while the other important numbers stay healthy.';
    let guard='Do not improve one number by attracting the wrong audience or hurting another important part of the video.';
    if(x.includes('packag')){
      primaryMetricKey='ctr';
      hypothesis='If the title/thumbnail is the real problem, stronger packaging should move CTR closer to what this what this creator usually getsly gets while retention stays healthy.';
      success='CTR improves across several similar videos without a meaningful drop in 0:30 / APV.';
      guard='Do not chase CTR with a promise the video cannot deliver.';
    }else if(x.includes('opening')||x.includes('viewing')||x.includes('retention')){
      primaryMetricKey='ret30';
      hypothesis='If the opening is the real problem, stronger first 30–60 seconds should improve 0:30 first, with APV / AVD helping confirm it.';
      success='0:30 improves across several similar videos and APV / AVD do not get worse.';
      guard='Do not make the idea or package smaller just to manufacture retention.';
    }else if(x.includes('acquisition')||x.includes('gateway')||x.includes('discovery')){
      primaryMetricKey='newViewers';job='Reach';
      mix='Bias the next stretch toward qualified Reach / gateway videos, while keeping enough Trust and Convert follow-through.';
      hypothesis='If Reach is the problem, stronger gateway ideas should bring in more New viewers and better engaged-view results without hurting CTR or watch quality.';
      success='New viewers improve versus the previous 90-day period and Reach videos perform better at the same point after publishing.';
      guard='Do not grow with viewers who do not fit the channel promise.';
    }else if(x.includes('loyalty')||x.includes('pathway')){
      primaryMetricKey='returning';job='Trust';
      mix='Bias the next stretch toward Trust / pathway videos, follow-ups, series and obvious second-watch opportunities.';
      hypothesis='If Trust is the problem, clearer follow-ups and next-video paths should improve Returning / Regular viewers and average views per viewer.';
      success='Returning or Regular viewers and average views per viewer improve versus the previous 90-day period.';
      guard='Do not sacrifice new-viewer clarity just to serve the core.';
    }else if(x.includes('business')||x.includes('convert')){
      primaryMetricKey='qualifiedLeads';job='Convert';
      mix='Protect Reach and Trust, but give Convert videos enough slots to test the audience-to-offer path.';
      hypothesis='If conversion is the problem, clearer audience-to-offer alignment should increase qualified business actions without requiring every video to be a sales video.';
      success='Qualified leads / bookings improve for comparable Convert videos while audience quality stays healthy.';
      guard='Do not judge Reach or Trust videos by conversion metrics they were not designed to win.';
    }else if(x.includes('growth')||x.includes('protect')){
      primaryMetricKey='engagedViews';
      mix='Protect the Reach / Trust / Convert mix that produced the wins and make adjacent follow-ups before introducing major changes.';
      hypothesis='If the current growth mechanism is repeatable, adjacent videos should keep producing above-normal matched outcomes.';
      success='Multiple adjacent videos stay above what this creator usually gets without deterioration in CTR or WATCH.';
      guard='Do not copy the surface topic if the repeatable mechanism is actually package, audience fit or format.';
    }
    return {focus,job,primaryMetricKey,mix,hypothesis,success,guard,next:r?.action?.video||'Use the diagnosis flow before forcing a plan.'};
  }
  function planFocusHtml(c,W,guide){
    const r=overallRead(c,W,guide),s=planSuggestion(r),tone=toneFor(r);
    return '<section class="adc-plan-focus '+tone+'" id="adc-plan-focus">'+
      '<div><div class="adc-kicker">DATA → 90-DAY PLAN</div><h3>'+esc(r.focus)+'</h3><p>'+esc(r.why.slice(0,3).join(' '))+'</p></div>'+
      '<div class="adc-plan-grid">'+
        '<div><span>CONTENT JOB</span><b>'+esc(s.job)+'</b></div>'+
        '<div><span>MAIN NUMBER TO WATCH</span><b>'+esc(r.action.metric)+'</b></div>'+
        '<div><span>WHAT THE NEXT VIDEOS NEED TO SHOW</span><b>'+esc(s.next)+'</b></div>'+
      '</div>'+
      '<p><b>What this means for what you make next:</b> '+esc(s.mix)+'</p>'+
      '<button class="btn" data-adc-plan-fill>Use these suggestions in empty plan fields</button>'+
      '<small>This only fills blank fields. It will not overwrite work you already did.</small>'+
    '</section>';
  }

  function parseJsonBlock(text){
    if(typeof text!=='string')return null;
    let raw=text.trim();
    const fence=String.fromCharCode(96,96,96);
    if(raw.startsWith(fence)){
      const firstBreak=raw.indexOf('\n'),lastFence=raw.lastIndexOf(fence);
      if(firstBreak>=0&&lastFence>firstBreak)raw=raw.slice(firstBreak+1,lastFence).trim();
    }
    try{return JSON.parse(raw)}catch(_){return null}
  }
  function channelPrompt(c){
    const schema={schemaVersion:1,creatorId:c?.id||'',channelName:'ACTUAL CHANNEL',observations:[],channelPeriods:[{
      start:'YYYY-MM-DD',end:'YYYY-MM-DD',source:'ACTUAL YOUTUBE STUDIO REPORT(S) + FILTERS',metricDefinitionId:'ACTUAL DEFINITION OR unknown',
      metrics:{
        views:null,engagedViews:null,impressions:null,ctr:null,watchTime:null,
        browsePct:null,suggestedPct:null,searchPct:null,externalPct:null,
        uploadsPublished:null,newUploadViews:null,libraryViews:null,
        qualifiedLeads:null,bookings:null,sales:null,revenue:null
      },
      context:{paidNote:null,sourceNote:null,libraryNote:null,attributionNote:null,notes:null}
    }],audienceSnapshots:[
      {asOf:'YYYY-MM-DD',windowDays:28,source:'YouTube Studio Audience · Monthly audience',metricDefinitionId:'youtube-monthly-audience-28d',metrics:{monthlyAudience:null,newViewers:null,casual:null,regular:null,returning:null,avgViewsPerViewer:null},notes:null},
      {asOf:'YYYY-MM-DD',windowDays:28,source:'YouTube Studio Audience · Monthly audience',metricDefinitionId:'youtube-monthly-audience-28d',metrics:{monthlyAudience:null,newViewers:null,casual:null,regular:null,returning:null,avgViewsPerViewer:null},notes:null}
    ],limitations:[]};
    return `In Ask Studio, return RAW YouTube Studio channel analytics for ${JSON.stringify(c?.name||'this channel')} so Accelerator can update the Analytics page and support the channel diagnosis. Do not coach, diagnose, estimate, infer missing values, or calculate trends for me. Return the measurements only.

PERIODS
Return TWO completed, non-overlapping 90-day periods when available:
1. the latest fully completed 90-day period that does not include today;
2. the immediately preceding 90-day period.
The JSON start/end dates are inclusive, so each end date must be exactly 89 days after its start date. Keep filters and metric definitions as consistent as possible across both periods.

CORE CHANNEL METRICS
For each exact 90-day period request:
- views
- engagedViews
- registered impressions
- impressions CTR
- watchTime in hours

AUDIENCE GROWTH + LOYALTY · SEPARATE 28-DAY SNAPSHOTS
Do NOT put New / Casual / Regular into the 90-day channelPeriods. Monthly audience is a rolling 28-day audience view.

Return TWO comparable audienceSnapshots when available:
1. the latest fully processed 28-day Monthly audience snapshot;
2. a previous non-overlapping 28-day snapshot, ideally 28 days earlier.

For each audienceSnapshot request:
- monthlyAudience
- newViewers
- casual
- regular
- returning for the same 28-day window when available
- avgViewsPerViewer for the same 28-day window when available

Audience rules:
- asOf is the latest fully processed audience date and windowDays must be 28.
- New, Casual, Regular, and Returning are separate Studio measures. Do not substitute one for another.
- Do not derive Casual or Regular from Returning, New, subscribers, or percentages.
- Do not convert a percentage into a viewer count.
- avgViewsPerViewer must be the raw reported metric. Do not calculate it yourself.
- If audience data has processing delay, use the latest fully processed asOf date and explain the delay in notes.
- If an exact audience value is unavailable, use null.

TRAFFIC-SOURCE CONTEXT
For those same 90-day dates, request the percentage of views from these sources when Studio can report them:
- browsePct
- suggestedPct
- searchPct
- externalPct
Use the raw percentages. Do not renormalize them to 100%.
In context.sourceNote, include concise raw source evidence when available, such as the leading Suggested source videos or leading Search queries. Do not interpret them.

PROGRAMMING / LIBRARY CONTEXT
- uploadsPublished = exact count of long-form uploads published inside that 90-day period, only if Studio can retrieve that exact count. Do not infer it from cadence.
- newUploadViews = views during the period from videos published inside that same period, only if Studio can isolate that exact slice.
- libraryViews = views during the period from videos published before the period began, only if Studio can isolate that exact slice.
If either library split cannot be produced exactly, use null rather than estimating. In context.libraryNote, record the exact filter/report used when available.

PAID / FILTER CONTEXT
In context.paidNote, state the actual paid/promoted/organic filter or note if Studio cannot verify it. Keep the source/report/filter description readable in source.

NOT YOUTUBE STUDIO METRICS
qualifiedLeads, bookings, sales, revenue, and context.attributionNote must be null in this YouTube Studio request. Those are added separately from business/CRM evidence. Do not invent them.
Planned uploads/capacity are also not YouTube analytics and should not be inferred here.

MEASUREMENT RULES
- Keep engagedViews separate from public Views. Since August 24, 2026, Views is the new exposure count that starts when playback begins. Engaged views is the older/original view-count methodology retained in YouTube Analytics Advanced Mode, including long-form. Ask Studio should explicitly check Advanced Mode for Engaged views. If Ask Studio cannot access that metric, use null and state that Ask Studio could not retrieve it. Do NOT claim Engaged views is Shorts-only and do not copy Views into engagedViews.
- CTR and traffic-source fields are percentages where 6.2 means 6.2%.
- Do not put video-level 0:30 retention, APV, or AVD into these channel periods. Those belong in the separate video-checkpoint prompt.
- If Ask Studio cannot retrieve an exact field, return null and explain why in limitations.
- metricDefinitionId describes the measurement definitions/version, not the date-range precision. Do not set it to "exact". Include the post-August-24 Views / Engaged views regime when verified; otherwise use "unknown".
- Keep creatorId exactly ${JSON.stringify(c?.id||'')}.
- channelName must be the actual channel being inspected.
- Return observations as an empty array. This request is for 90-day channel health plus separate 28-day audience snapshots.
- Return ONLY the JSON object. No prose before or after it.

STRICT JSON OUTPUT
- Return one parseable JSON object only.
- Do not wrap the object in Markdown code fences.
- IDs must contain literal underscores or hyphens with NO backslash characters before them.
- If a text value contains quotation marks, encode each quotation mark as a backslash character followed by a quotation-mark character, as required by JSON.
- Do not append SVG, charts, citations, explanations, the prompt itself, or any text after the final closing brace.
- Before responding, verify the object would parse with JSON.parse.

JSON SHAPE:
${JSON.stringify(schema,null,2)}`;
  }

  function masterPrompt(c){
    const videoRow=hours=>({
      videoId:'ACTUAL YOUTUBE URL OR ID',
      title:'ACTUAL TITLE',
      publishedAt:'ISO TIMESTAMP',
      capturedAt:'ISO TIMESTAMP',
      windowHours:hours,
      format:'edited-long-form',
      eraId:'current',
      job:null,
      definitionId:'unknown',
      coverage:'unknown',
      paid:'unknown',
      traffic:'all',
      source:'ACTUAL REPORT AND FILTERS',
      metrics:{views:null,engagedViews:null,impressions:null,ctr:null,retention30:null,apv:null,avdSeconds:null,browsePct:null,suggestedPct:null,searchPct:null,externalPct:null}
    });
    const channelPeriod={
      start:'YYYY-MM-DD',end:'YYYY-MM-DD',
      source:'ACTUAL YOUTUBE STUDIO REPORT(S) + FILTERS',
      metricDefinitionId:'ACTUAL DEFINITION OR unknown',
      metrics:{
        views:null,engagedViews:null,impressions:null,ctr:null,watchTime:null,
        browsePct:null,suggestedPct:null,searchPct:null,externalPct:null,
        uploadsPublished:null,newUploadViews:null,libraryViews:null,
        qualifiedLeads:null,bookings:null,sales:null,revenue:null
      },
      context:{paidNote:null,sourceNote:null,libraryNote:null,attributionNote:null,notes:null}
    };
    const schema={
      schemaVersion:1,
      creatorId:c?.id||'',
      channelName:'ACTUAL CHANNEL',
      observations:[24,48,168,672].map(videoRow),
      channelPeriods:[channelPeriod,{...channelPeriod}],
      audienceSnapshots:[
        {asOf:'YYYY-MM-DD',windowDays:28,source:'YouTube Studio Audience · Monthly audience',metricDefinitionId:'youtube-monthly-audience-28d',metrics:{monthlyAudience:null,newViewers:null,casual:null,regular:null,returning:null,avgViewsPerViewer:null},notes:null},
        {asOf:'YYYY-MM-DD',windowDays:28,source:'YouTube Studio Audience · Monthly audience',metricDefinitionId:'youtube-monthly-audience-28d',metrics:{monthlyAudience:null,newViewers:null,casual:null,regular:null,returning:null,avgViewsPerViewer:null},notes:null}
      ],
      limitations:[]
    };
    return `In Ask Studio, collect ALL analytics needed by Accelerator for ${JSON.stringify(c?.name||'this channel')} in ONE response. Return raw measurements only. Do not coach, diagnose, estimate, infer, average, or calculate missing metrics.

PART 1 — VIDEO CHECKPOINTS
Build comparable video rows for ALL FOUR checkpoints:
- 24 hours
- 48 hours
- 7 days / 168 hours
- 28 days / 672 hours

For EACH checkpoint independently:
- FIRST include the NEWEST eligible current-era long-form upload that has fully completed that checkpoint. This is the target row the coach may want to inspect right now.
- THEN include previous comparable current-era uploads needed to establish the creator normal. 10–20 previous comparable rows is preferred; 5–9 is usable but less certain.
- Do not omit the newest eligible upload just because it must not be used to judge itself. Accelerator excludes each target video from its own same-age baseline.
- The eligible video set can differ by checkpoint. A recent upload can qualify for 24h but not 28d.
- The same video may appear up to four times, once for each exact checkpoint.
- Keep only ONE row per video + checkpoint.
- Do not substitute lifetime totals, realtime totals, last calendar days, or a different age window.
- Do not remove flops or outliers unless the video is structurally incomparable, paid/promoted when judging organic, a different format, or from a genuinely different strategy era.

For every video/checkpoint row request these metrics when Studio can report them:
1. views
2. engagedViews
3. registered impressions
4. impressions CTR
5. first-30-second / Intro retention
6. average percentage viewed / APV
7. average view duration / AVD in seconds
8. Browse %
9. Suggested %
10. Search %
11. External %

VIDEO-METRIC RULES
- Keep Views and Engaged Views separate. Since August 24, 2026, Views counts playback starts across formats. Engaged views is the older/original view-count methodology retained in YouTube Analytics Advanced Mode, including long-form. Explicitly check Advanced Mode for Engaged views. If Ask Studio itself cannot access it, use null and say that Ask Studio could not retrieve the Advanced Mode Engaged views metric. Do NOT say Engaged views is Shorts-only and never substitute Views.
- CTR, retention30, APV, browsePct, suggestedPct, searchPct, and externalPct are percentage numbers where 6.2 means 6.2%.
- avdSeconds is seconds.
- Do NOT derive APV from AVD or video length.
- For retention30, first look for an exact YouTube Studio Key moments / Intro / first-30-second value. Use it only if Studio reports an exact number. If only a visual retention curve is available, do NOT eyeball or estimate the graph; return null.
- If an exact checkpoint metric or traffic-source split is unavailable or still processing, use null.
- Do not renormalize Browse / Suggested / Search / External to 100%. They are context fields and other sources may exist.
- Use coverage "exact" only when the report really represents the exact first 24h / 48h / 7d / 28d lifespan. Otherwise use "unknown" or "partial".
- definitionId describes the measurement definitions/version, not whether the time window is exact. Do not set definitionId to "exact". Include the post-August-24 Views / Engaged views regime when verified; otherwise use "unknown".
- Use actual video IDs/URLs, publication timestamps, capture timestamps, filters, traffic scope, and measurement definitions.

PART 2 — 90-DAY CHANNEL + AUDIENCE HEALTH
Return TWO completed, non-overlapping 90-day periods when available:
1. the latest fully completed 90-day period that does not include today;
2. the immediately preceding completed 90-day period.
start/end are inclusive, so end is exactly 89 days after start.

For each exact 90-day period request:
CORE
- views = the new playback-start view count
- engagedViews = the older/original view-count metric from Advanced Mode when accessible
- registered impressions
- impressions CTR
- watchTime hours

AUDIENCE
Do not put New / Casual / Regular / Returning into the 90-day channelPeriods. Those are collected separately as rolling 28-day audienceSnapshots in Part 3.

TRAFFIC SOURCE
- browsePct
- suggestedPct
- searchPct
- externalPct

LIBRARY / OUTPUT CONTEXT, only when Studio can isolate it exactly
- uploadsPublished = exact count of long-form uploads published inside that 90-day period
- newUploadViews = views during the period from videos published inside that same period
- libraryViews = views during the period from videos published before the period began

In context:
- paidNote = actual organic/paid/promoted filter or "unable to verify"
- sourceNote = concise raw source evidence such as leading Suggested videos or Search queries when available
- libraryNote = exact report/filter used for the new-upload vs older-library split
- attributionNote = null
- notes = raw measurement/context notes only, not strategy advice

PART 3 — 28-DAY AUDIENCE SNAPSHOTS
Return TWO comparable audienceSnapshots when available:
1. latest fully processed rolling 28-day Monthly audience snapshot;
2. previous non-overlapping 28-day snapshot, ideally 28 days earlier.

For each snapshot request:
- monthlyAudience
- newViewers
- casual
- regular
- returning for the same 28-day window when available
- avgViewsPerViewer for the same 28-day window when available

AUDIENCE RULES
- asOf is the latest fully processed audience date and windowDays is 28.
- New, Casual, Regular, and Returning are separate Studio measures. Never substitute one for another.
- Do not derive Casual or Regular from Returning, New, subscribers, percentages, or the 90-day channel report.
- avgViewsPerViewer must be Studio's raw reported metric. Do not calculate it yourself.
- If audience reporting lags, use the latest fully processed asOf date and explain the lag in notes.
- Use null when an exact value is unavailable.
- Do not treat New → Casual → Regular as a tracked person-by-person conversion funnel.

NOT YOUTUBE STUDIO METRICS
qualifiedLeads, bookings, sales, revenue, and context.attributionNote must be null. Do not infer them.
Do not infer planned uploads or capacity from Studio.

STRICT JSON OUTPUT
- Return one parseable JSON object only.
- Do not wrap the object in Markdown code fences.
- IDs must contain literal underscores or hyphens with NO backslash characters before them.
- If a text value contains quotation marks, encode each quotation mark as a backslash character followed by a quotation-mark character, as required by JSON.
- Do not append SVG, charts, citations, explanations, the prompt itself, or any text after the final closing brace.
- Before responding, verify the object would parse with JSON.parse.

OUTPUT RULES
- Keep creatorId exactly ${JSON.stringify(c?.id||'')}.
- channelName must be the actual channel inspected.
- Return ONE JSON object only, no prose before or after it.
- observations may contain many rows. Repeat a video across different windowHours when exact data exists.
- If Ask Studio cannot retrieve part of this request, DO NOT fail the whole request. Return every verified field/row you can, use null or omit unavailable observations, and explain the limitation in limitations.
- Do not fabricate a cleaner or more complete answer.

JSON SHAPE:
${JSON.stringify(schema,null,2)}`;
  }

  function extendStudioImport(win){
    const I=win.AcceleratorStudioImport;if(!I||I.__adcExtended)return;
    I.__adcExtended=true;
    // Video-checkpoint prompting and channel-period parsing now live in analytics/import.js.
    // Keep this hook only as a version marker so older runtime wrappers do not double-modify prompts or imports.
  }

  function openChannelPrompt(win,c){
    let d=win.document.getElementById('adc-channel-prompt-dialog');
    if(!d){d=win.document.createElement('dialog');d.id='adc-channel-prompt-dialog';d.className='adc-prompt-dialog';win.document.body.appendChild(d);}
    const text=channelPrompt(c);
    d.innerHTML='<h2>Copy 90-day channel + audience prompt</h2><p>This gathers the whole-channel, audience, traffic-source and library context used by Analytics and the diagnosis. Video retention checkpoints use the separate 24h / 48h / 7d / 28d prompts. If Ask Studio cannot return something exactly, it should leave it null.</p><textarea readonly id="adc-channel-prompt-text">'+esc(text)+'</textarea><div class="actions"><button class="btn dark" id="adc-copy-channel">Copy prompt</button><button class="btn" id="adc-close-channel">Close</button></div>';
    if(!d.open)d.showModal();
    d.querySelector('#adc-close-channel').onclick=()=>d.close();
    d.querySelector('#adc-copy-channel').onclick=async()=>{try{await win.navigator.clipboard.writeText(text);d.querySelector('#adc-copy-channel').textContent='Copied';}catch(_){d.querySelector('textarea').select();}};
  }

  function install(win){
    if(win.__acceleratorDecisionContextV1)return;win.__acceleratorDecisionContextV1=true;
    const W=win.AcceleratorAnalyticsWorkspace,guide=win.__acceleratorCoachGuide;if(!W||!guide)return;
    extendStudioImport(win);
    const priorBody=W.body;
    W.body=function(c){
      const html=priorBody(c);
      return channelReadHtml(c,W,guide)+html;
    };
    W.channelRead=c=>overallRead(c,W,guide);

    function current(){try{return win.AcceleratorDeskBridge?.current?.()||null}catch(_){return null}}
    function injectDiagnosis(){
      const c=current(),old=win.document.getElementById('studio-diagnosis-data');if(!c||!old)return;
      const html=diagnosisHtml(c,W,guide);if(old.dataset.adcSignature===html)return;
      const tpl=win.document.createElement('template');tpl.innerHTML=html;const node=tpl.content.firstElementChild;node.dataset.adcSignature=html;old.replaceWith(node);
    }
    function injectVideoFocus(){
      const c=current();if(!c)return;
      let view='';try{view=win.AcceleratorDeskBridge?.view?.()||''}catch(_){}
      if(['videos','planner'].includes(view)){
        const strip=win.document.getElementById('cg-context-strip');
        if(strip){
          let node=win.document.getElementById('adc-video-focus');
          const html=videoFocusHtml(c,W,guide),holder=win.document.createElement('template');holder.innerHTML=html;
          const fresh=holder.content.firstElementChild;fresh.dataset.adcSignature=html;
          if(!node)strip.after(fresh);
          else if(node.dataset.adcSignature!==html)node.replaceWith(fresh);
        }
      }else{
        const node=win.document.getElementById('adc-video-focus');if(node&&!node.closest('dialog'))node.remove();
      }
      const candidates=[...win.document.querySelectorAll('dialog[open],#drawerBack.show,.drawer.show,.drawer.open')];
      const target=candidates.find(x=>/Plan Next Video/i.test(x.textContent||''));
      if(target&&!target.querySelector('#adc-video-prep-focus')){
        const holder=win.document.createElement('template');holder.innerHTML=videoFocusHtml(c,W,guide).replace('id="adc-video-focus"','id="adc-video-prep-focus"');
        const first=target.querySelector('.studio-body,.drawer-body,.body,.content')||target;
        first.prepend(holder.content.firstElementChild);
      }
    }
    function injectPlan(){
      const c=current();if(!c)return;
      const candidates=[...win.document.querySelectorAll('dialog[open],#drawerBack.show,.drawer.show,.drawer.open')];
      const target=candidates.find(x=>/90-Day Plan/i.test(x.textContent||''));
      if(!target)return;
      const html=planFocusHtml(c,W,guide),existing=target.querySelector('#adc-plan-focus');
      if(existing?.dataset?.adcSignature===html)return;
      const holder=win.document.createElement('template');holder.innerHTML=html;const fresh=holder.content.firstElementChild;fresh.dataset.adcSignature=html;
      if(existing)existing.replaceWith(fresh);
      else{
        const first=target.querySelector('.studio-body,.drawer-body,.body,.content')||target;
        first.prepend(fresh);
      }
    }
    function injectChannelButton(){
      const c=current(),tools=win.document.querySelector('#studio-tools .actions');if(!c||!tools||win.document.querySelector('#studio-tools [data-studio="prompt-center"],#studio-tools [data-studio="channel-prompt"],#studio-tools [data-adc-channel-prompt]'))return;
      const b=win.document.createElement('button');b.className='btn';b.dataset.adcChannelPrompt='1';b.textContent='Copy 90-day channel + audience prompt';b.onclick=()=>openChannelPrompt(win,c);tools.appendChild(b);
    }
    let queued=false;
    const paint=()=>{if(queued)return;queued=true;win.requestAnimationFrame(()=>{queued=false;injectDiagnosis();injectPlan();injectVideoFocus();injectChannelButton();});};
    new MutationObserver(paint).observe(win.document.documentElement,{childList:true,subtree:true});
    win.document.addEventListener('click',e=>{
      const baselineJump=e.target.closest?.('[data-adc-baseline-window]');
      if(baselineJump){
        e.preventDefault();const c=current();if(!c)return;
        const p=W.prefs(c);p.mode='video';p.hours=Number(baselineJump.dataset.adcBaselineWindow);p.baselineId='';
        try{guide?.analyticsPage?.()}catch(_){}
        setTimeout(()=>win.document.querySelector('.ac-video-section')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
        return;
      }
      const fill=e.target.closest?.('[data-adc-plan-fill]');
      if(fill){
        e.preventDefault();
        const c=current();if(!c)return;
        const s=planSuggestion(overallRead(c,W,guide));
        const setEmpty=(id,value)=>{const el=win.document.getElementById(id);if(el&&!String(el.value||'').trim()&&value!=null){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}};
        setEmpty('cg-p-hyp',s.hypothesis);
        setEmpty('cg-p-mix',s.mix);
        setEmpty('cg-p-better',s.success);
        setEmpty('cg-p-guard',s.guard);
        const metric=win.document.getElementById('cg-p-metric');
        if(metric&&!c.coachOS?.plan90?.primaryMetricKey){metric.value=s.primaryMetricKey;metric.dataset.adcAuto='done';metric.dispatchEvent(new Event('change',{bubbles:true}));}
        const outcome=win.document.getElementById('cg-p-outcome');if(outcome&&!String(outcome.value||'').trim()){outcome.value='Improve '+s.focus+' while protecting the rest of the funnel.';outcome.dispatchEvent(new Event('input',{bubbles:true}));}
        fill.textContent='Added to empty fields';
        return;
      }
      if(e.target.closest?.('[data-cg="video-prep"],[data-action="v12-plan-step"],[data-cg="diagnosis"],[data-cg="plan90"]'))setTimeout(paint,0);
    });
    const style=win.document.createElement('style');style.id='adc-style';style.textContent=`
      .adc-kicker{font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;opacity:.65}
      .adc-overall{margin-bottom:24px}.adc-overall.focus{border-left-color:#366f7a}.adc-overall.warn{border-left-color:#b5822e}.adc-overall.great{border-left-color:#2f8464}
      .adc-overall-head{grid-template-columns:44px minmax(0,1fr) minmax(260px,420px)}.adc-overall h2{margin:4px 0 6px}.adc-overall p{margin:0;line-height:1.5}.adc-focus{padding:14px;border-radius:12px;background:rgba(75,104,110,.08);display:grid;gap:5px}.adc-focus span{font-size:10px;font-weight:900;letter-spacing:.08em}.adc-focus b{line-height:1.4}.adc-focus small{opacity:.7}
      .adc-baselines,.adc-stages{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.adc-audience{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.adc-baseline-pill,.adc-audience-card,.adc-stage{border:1px solid var(--line,#d9e0e2);border-radius:11px;padding:12px;display:grid;gap:3px}.adc-baseline-pill{font:inherit;text-align:left;background:var(--card,#fff);color:inherit;cursor:pointer}.adc-baseline-pill:hover{border-color:#55757a}.adc-stage em{font-style:normal;font-size:10px;line-height:1.35;padding-top:5px;border-top:1px solid var(--line,#d9e0e2);opacity:.82}.adc-stage span{font-size:10px;font-weight:900;letter-spacing:.07em}.adc-stage b{font-size:13px;line-height:1.35}.adc-stage small{opacity:.65;line-height:1.35}.adc-stage.weak{border-top:4px solid #b54b4b}.adc-stage.strong{border-top:4px solid #2f8464}.adc-stage.steady{border-top:4px solid #55757a}.adc-stage.unknown{opacity:.65}.adc-baseline-pill span,.adc-audience-card span{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.adc-baseline-pill b,.adc-audience-card b{font-size:19px}.adc-baseline-pill small,.adc-audience-card small{opacity:.65;line-height:1.35}.adc-baseline-pill.muted,.adc-audience-card.muted{opacity:.6}.adc-audience-card.bad{border-top:4px solid #b54b4b}.adc-audience-card.good{border-top:4px solid #2f8464}.adc-audience-card.normal{border-top:4px solid #55757a}.adc-audience-card strong{font-size:11px}
      .adc-subhead{display:flex;gap:10px;align-items:baseline;justify-content:space-between}.adc-subhead span{font-size:12px;opacity:.65}.adc-audience-read{margin:0 0 10px;padding:12px;border-radius:10px;background:rgba(75,104,110,.07);display:grid;gap:3px}.adc-audience-read span,.adc-audience-note{font-size:12px;line-height:1.45;opacity:.72}.adc-audience-note{display:block;margin-top:8px}.adc-overall-foot{display:flex;gap:18px;justify-content:space-between;flex-wrap:wrap;font-size:12px}
      .adc-diagnosis{border-left:5px solid #55757a!important}.adc-diagnosis.focus{border-left-color:#366f7a!important}.adc-diagnosis.warn{border-left-color:#b5822e!important}.adc-diagnosis.great{border-left-color:#2f8464!important}.adc-decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.adc-decision-grid>div{border:1px solid var(--line,#ddd);border-radius:10px;padding:12px;display:grid;gap:4px}.adc-decision-grid span{font-size:10px;font-weight:800;text-transform:uppercase}.adc-decision-grid small{opacity:.65}
      .adc-plan-focus{margin:0 0 14px;border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:var(--card,#fff);display:grid;gap:12px}.adc-plan-focus.focus{border-left-color:#366f7a}.adc-plan-focus.warn{border-left-color:#b5822e}.adc-plan-focus.great{border-left-color:#2f8464}.adc-plan-focus h3{margin:4px 0 5px}.adc-plan-focus p{margin:0;line-height:1.45}.adc-plan-focus small{opacity:.65}.adc-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.adc-plan-grid>div{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:10px;display:grid;gap:4px}.adc-plan-grid span{font-size:9px;font-weight:900;letter-spacing:.07em}.adc-plan-grid b{font-size:12px;line-height:1.35}
      .adc-video-focus{margin:0 0 14px;border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:var(--card,#fff);display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,420px);gap:15px}.adc-video-focus.focus{border-left-color:#366f7a}.adc-video-focus.warn{border-left-color:#b5822e}.adc-video-focus.great{border-left-color:#2f8464}.adc-video-focus h3{margin:4px 0 5px}.adc-video-focus p{margin:0;line-height:1.45}.adc-video-meta{display:grid;gap:5px;font-size:12px}.adc-video-meta small{opacity:.65}
      .adc-prompt-dialog{width:min(820px,94vw);border:1px solid #bbc7c7;border-radius:12px;padding:20px;background:var(--panel,#fff);color:var(--text,#17212a)}.adc-prompt-dialog textarea{width:100%;height:360px;box-sizing:border-box;margin:10px 0}
      @media(max-width:900px){.adc-plan-grid{grid-template-columns:1fr}.adc-overall-head{grid-template-columns:40px minmax(0,1fr)}.adc-overall-head .adc-focus{grid-column:2}.adc-video-focus{grid-template-columns:1fr}.adc-baselines,.adc-audience,.adc-stages{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.adc-baselines,.adc-audience,.adc-stages,.adc-decision-grid{grid-template-columns:1fr}.adc-subhead{display:grid}.adc-overall{margin-bottom:16px}.adc-overall-head{grid-template-columns:32px minmax(0,1fr)}.adc-overall-head .adc-focus{grid-column:1/-1}}

      .adc-baselines{grid-template-columns:repeat(5,minmax(0,1fr))}.adc-baseline-pill{padding:9px 10px;gap:2px;min-height:0}.adc-baseline-pill span{font-size:9px}.adc-baseline-pill b{font-size:13px}.adc-baseline-pill small{font-size:9px;line-height:1.25}.adc-90-pill{border-style:dashed}.adc-compact-block{display:grid;gap:8px}.adc-compact-block+.adc-compact-block{border-top:1px solid var(--line,#d9e0e2);padding-top:12px}.adc-stages{grid-template-columns:repeat(4,minmax(0,1fr))}.adc-stage{padding:9px}.adc-stage em{display:none}.adc-help summary{cursor:pointer;font-size:11px;font-weight:800;color:var(--muted,#68757d)}.adc-help p{font-size:11px;line-height:1.45;margin:7px 0}.adc-audience-mini-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.adc-audience-mini{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:8px;display:grid;gap:2px}.adc-audience-mini span{font-size:9px;font-weight:900;text-transform:uppercase}.adc-audience-mini b{font-size:15px}.adc-audience-mini small{font-size:9px;color:var(--muted,#68757d)}.adc-audience{display:none}.adc-audience-read,.adc-audience-note{display:none}
      @media(max-width:1000px){.adc-baselines{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:650px){.adc-baselines,.adc-stages,.adc-audience-mini-grid{grid-template-columns:1fr 1fr}}
    `;win.document.head.appendChild(style);
    paint();
  }

  return {snapshots,audienceSnapshots,audienceRead,baselineTrajectory,deriveFocus,focusAction,overallRead,planSuggestion,channelPrompt,masterPrompt,parseJsonBlock,install};
});
