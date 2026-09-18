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
  function audienceCoachRead(a){
    if(!a?.hasCurrent)return {tone:'muted',headline:'Audience trend is not connected yet.',meaning:'We cannot tell whether attention is becoming an audience until at least one 28-day audience snapshot is saved.',action:'Add the current 28-day audience snapshot. After a second comparable snapshot, use the direction of New + Casual / Regular / Returning together.',protect:'Do not infer loyalty from subscribers or one viral video.'};
    if(!a.hasComparison)return {tone:'warn',headline:'We have an audience snapshot, but not a trend yet.',meaning:'The current audience mix is useful context, but one rolling 28-day snapshot cannot tell us whether acquisition or loyalty is improving.',action:'Add the next comparable 28-day snapshot before changing programming from audience movement alone.',protect:'Keep the current plan unless video-level evidence gives a separate reason to change it.'};
    const acq=a.acquisitionBand,loy=a.loyaltyBand,depth=a.depthBand;
    let tone='normal',headline='',meaning='',action='',protect='';
    if(acq==='weak'&&['steady','strong'].includes(loy)){
      tone='warn';headline='Acquisition is the pressure. Repeat-audience signals are holding better.';
      meaning='The channel appears to serve existing viewers better than it is bringing in enough new ones. This points toward a Gateway / Reach problem before a loyalty rebuild.';
      action='For the next 2–3 programming reps, strengthen the doorway: broader problem-aware Reach ideas around proven audience pain, while keeping the Trust / follow-up content that is still bringing people back.';
      protect='Protect the topics, formats, and continuation paths that are supporting repeat viewing.';
    }else if(['steady','strong'].includes(acq)&&loy==='weak'){
      tone='warn';headline='Acquisition is working better than loyalty. Attention is not turning into repeat viewing strongly enough.';
      meaning='New people are arriving, but Casual / Regular / Returning behavior is not keeping pace. The research treats this as a Gateway → Bridge → Core / Trust-pathway pressure, not a reason to shrink the Reach strategy.';
      action='Protect the Reach mechanism. Build an obvious bridge from the winning gateway topic into a closely related Trust / core follow-up, then inspect own-Suggested, end-screen behavior, and Average views per viewer.';
      protect='Do not kill a successful gateway just because repeat viewing has not caught up yet.';
    }else if(acq==='weak'&&loy==='weak'){
      tone='bad';headline='Acquisition and repeat-audience signals are both under pressure.';
      meaning='This is broader than one weak audience metric. The channel may be losing both new-viewer opportunity and reasons to return, or the prior period may have been inflated by a spike.';
      action='Do not blame one upload. Check new-upload vs library contribution, traffic-source change, topic / market demand, and the recent SHOW → CLICK → WATCH pattern. Then choose one dominant bottleneck for the next 2–3 reps.';
      protect='Avoid changing topic, packaging, cadence, and format all at once. We still need a readable test.';
    }else if(['steady','strong'].includes(acq)&&['steady','strong'].includes(loy)){
      tone='good';headline='Acquisition and repeat-audience signals are both healthy.';
      meaning='The audience side is not the obvious bottleneck right now. The channel is bringing people in while also maintaining or improving repeat viewing.';
      action='Protect the current acquisition + continuation pattern. Look next at library depth, the business RESULT, or the repeated video-level bottleneck before changing audience strategy.';
      protect='Do not manufacture an audience problem just because another metric on the page is available.';
    }else{
      tone='warn';headline='Audience direction is mixed or partly unavailable.';
      meaning='We have some audience evidence, but not enough compatible movement to make a clean acquisition-versus-loyalty call.';
      action='Use the available direction as context and wait for the next comparable 28-day snapshot before making audience programming the dominant plan.';
      protect='Let the stronger video-level and 90-day evidence carry more weight for now.';
    }
    if(depth==='weak'){
      meaning+=' Average views per viewer is also down, which adds evidence that viewers are going less deep into the channel.';
      action+=' Add a library-pathway check: own-Suggested, end screens, gateway → bridge → core, and whether the next useful video is obvious.';
    }else if(depth==='strong'){
      meaning+=' Average views per viewer is up, which supports stronger channel depth even if some audience segments are soft.';
    }else if(depth==='unknown'){
      protect+=' Average views per viewer is missing, so library depth is not fully proven yet.';
    }
    if(a.overlapDays){
      protect+=' The rolling 28-day snapshots overlap by about '+a.overlapDays+' day'+(a.overlapDays===1?'':'s')+', so treat the direction as a clue rather than a clean before/after experiment.';
    }
    return {tone,headline,meaning,action,protect};
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
  function channelHealthRead(c,stages,audience){
    const by=Object.fromEntries((stages||[]).map(s=>[s.key,s])),att=by.attention||{},ret=by.return||{},depth=by.depth||{},result=by.result||{};
    const rows=snapshots(c),cur=rows.at(-1)||{},prev=rows.at(-2)||{};
    const attBand=att.band||'unknown',retBand=ret.band||'unknown',depthBand=depth.band||'unknown',resultBand=result.band||'unknown';
    let tone='normal',headline='',meaning='',action='',protect='';
    if(attBand==='strong'&&retBand==='weak'){
      tone='warn';headline='Attention expanded, but repeat-audience behavior weakened.';
      meaning='The channel is getting more opportunity / attention, but that attention is not becoming repeat viewing at the same rate. This is closer to a bridge / loyalty pressure than a reason to shrink the Reach mechanism.';
      action='Protect the topics and packages creating attention. Use the next programming slots to create obvious Gateway → Bridge → Core follow-ups and measure repeat-audience / continuation.';
      protect='Do not “fix” growing attention by making the doorway smaller.';
    }else if(attBand==='weak'&&['steady','strong'].includes(retBand)){
      tone='warn';headline='Existing audience behavior is holding better than acquisition.';
      meaning='People who already know the channel appear relatively healthier than the channel’s ability to earn new attention. Gateway / Reach opportunity is the first channel-level pressure.';
      action='Investigate new-upload opportunity, Browse/Suggested reach, current topic demand, and gateway idea breadth before rebuilding loyalty content.';
      protect='Keep the Trust / core programming that is still bringing people back.';
    }else if(attBand==='weak'&&retBand==='weak'){
      tone='bad';headline='Both attention and repeat-audience health are under pressure.';
      meaning='This is a broader channel problem. The research says to separate new uploads from library, then inspect audience, traffic/reach, packaging, viewing experience, portfolio, and market before naming one dominant bottleneck.';
      action='Run the channel audit in order and choose ONE dominant 90-day bottleneck. Do not hand the creator ten equal fixes.';
      protect='Change one major strategic lane at a time so the next 2–3 comparable reps can actually teach us something.';
    }else if(['steady','strong'].includes(attBand)&&['steady','strong'].includes(retBand)){
      tone='good';headline='Attention and repeat-audience health are both holding or improving.';
      meaning='The channel’s top two health layers are not the obvious break. Look deeper at library consumption and business result before changing acquisition or loyalty strategy.';
      action='Protect the current attention + return engine. Use Library Depth and RESULT to decide whether the next priority is sequencing, conversion, or simply continued execution.';
      protect='Do not change a healthy Reach / loyalty system just because a lower-level metric is missing.';
    }else{
      tone='warn';headline='Channel-health evidence is incomplete or mixed.';
      meaning='We can read individual pieces, but there is not yet enough compatible evidence to name a channel-wide bottleneck with confidence.';
      action='Use the strongest verified stage as a watch item and keep collecting comparable 90-day / 28-day evidence before changing the whole program.';
      protect='Let repeated 7-day video evidence carry more weight until the channel trend is clearer.';
    }

    if(depthBand==='weak'){
      meaning+=' Library depth is also weakening, which strengthens the case for a continuation / sequencing problem.';
      action+=' Inspect Average views per viewer, own-Suggested, final-20-second retention, end-screen relevance, and related-library lift.';
    }else if(depthBand==='strong'){
      meaning+=' Library depth is improving, so the channel appears to be converting attention into more viewing.';
    }else{
      protect+=' Library depth is not fully connected yet.';
    }

    if(resultBand==='weak'){
      meaning+=' Platform attention is not translating into the tracked business result strongly enough.';
      action+=' Keep platform diagnosis separate from business diagnosis: inspect CTA / offer fit, audience quality, and attribution before changing Reach or Trust.';
    }else if(resultBand==='strong'){
      meaning+=' The tracked business RESULT is also improving.';
    }else{
      protect+=' Business RESULT is not fully connected, so the commercial read is incomplete.';
    }

    const newCur=n(cur.newUploadViews),libCur=n(cur.libraryViews),newPrev=n(prev.newUploadViews),libPrev=n(prev.libraryViews);
    if(newCur!==null&&libCur!==null){
      const total=newCur+libCur,share=total>0?libCur/total:null;
      if(share!==null)meaning+=' Older-library views make up '+Math.round(share*100)+'% of the recorded new+library split in the latest 90-day report.';
      if(newPrev!==null&&libPrev!==null){
        const nr=ratio(newCur,newPrev),lr=ratio(libCur,libPrev);
        if(nr!==null&&lr!==null&&nr>=1&&lr<.85)action+=' New uploads are holding better than the back catalog, so investigate library decay separately from current programming.';
        if(nr!==null&&lr!==null&&nr<.85&&lr>=1)action+=' The library is holding better than new programming, so current-upload opportunity / execution deserves priority.';
      }
    }else{
      protect+=' New-upload vs older-library contribution is missing, so we cannot yet tell whether the channel movement is launch-driven or library-driven.';
    }
    if(audience?.overlapDays)protect+=' Audience snapshots overlap, so use that audience direction as supporting evidence rather than a perfectly independent comparison.';
    return {tone,headline,meaning,action,protect};
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
    const stages=channelStages(c,audience),audienceCoach=audienceCoachRead(audience),channelHealth=channelHealthRead(c,stages,audience);
    return {pattern,audience,audienceCoach,channelHealth,trajectory,diagnosis,...focus,action,why,stages};
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
  function normalConfidence(sample){
    const x=n(sample)||0;
    if(x>=10)return {label:'Good working normal',tone:'good'};
    if(x>=5)return {label:'Usable · less confidence',tone:'normal'};
    if(x>0)return {label:'Provisional · under 5',tone:'warn'};
    return {label:'Not available',tone:'muted'};
  }
  function selectedVideoFor(c,W){
    const p=W.prefs(c),vs=W.videos(c);
    return vs.find(v=>v.id===p.videoId)||vs[0]||null;
  }
  function matchingBaselineFor(c,W,v,h){
    const bs=W.baselines(c,h);if(!bs.length)return null;
    const obs=(c.analyticsFoundation?.observations||[]).filter(o=>o.videoId===(v?.engineId||v?.id)&&o.windowHours===h).at(-1);
    return bs.find(b=>b.engine&&obs&&b.engine.format===obs.format&&b.engine.eraId===obs.eraId&&b.engine.definitionId===obs.definitionId&&b.engine.traffic===obs.traffic&&b.engine.paid===obs.paid)
      ||bs.find(b=>b.manual&&(b.manual.job==='All'||b.manual.job===(c.coachOS?.analytics?.videoJobs?.[v?.engineId||v?.id]||v?.native?.coachOS?.intent?.job||v?.native?.job)))
      ||bs[0];
  }
  function baselineDetail(c,W,h){
    const v=selectedVideoFor(c,W),b=matchingBaselineFor(c,W,v,h);
    const metricKeys=['views','engagedViews','impressions','ctr','retention30','apv','avdSeconds','browsePct','suggestedPct','searchPct','externalPct'];
    if(!b)return {h,label:'No matching baseline',sample:0,values:Object.fromEntries(metricKeys.map(k=>[k,null])),samples:Object.fromEntries(metricKeys.map(k=>[k,0])),source:'No baseline saved yet'};
    if(b.engine){
      const rows=(c.analyticsFoundation?.baselines||[]).filter(x=>x.policyId===b.id&&x.kind==='operating'),last=rows.at(-1);
      if(!last)return {h,label:b.label,sample:0,values:Object.fromEntries(metricKeys.map(k=>[k,null])),samples:Object.fromEntries(metricKeys.map(k=>[k,0])),source:'No operating baseline built yet'};
      const values=Object.fromEntries(metricKeys.map(k=>[k,n(last?.metrics?.[k]?.median)]));
      const samples=Object.fromEntries(metricKeys.map(k=>[k,n(last?.metrics?.[k]?.n)||0]));
      const sample=Math.max(0,...Object.values(samples));
      return {h,label:b.label,sample,values,samples,source:'Automatic · matched current-era videos'};
    }
    const values=W.values(b.manual),sample=n(b.manual?.n)||0;
    const samples=Object.fromEntries(metricKeys.map(k=>[k,n(values?.[k])===null?0:sample]));
    return {h,label:b.label,sample,values,samples,source:'Coach-selected baseline'};
  }
  function normalValue(key,value){
    if(n(value)===null)return '—';
    if(['ctr','retention30','apv','browsePct','suggestedPct','searchPct','externalPct'].includes(key))return (n(value)*100).toFixed(1)+'%';
    if(key==='avdSeconds'){const sec=Math.round(n(value));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
    return Math.round(n(value)).toLocaleString();
  }
  function normalMetricCell(label,key,detail,note=''){
    const value=detail.values?.[key],sample=n(detail.samples?.[key])||0,conf=normalConfidence(sample);
    return '<div class="adc-normal-metric '+conf.tone+'"><span>'+esc(label)+'</span><b>'+esc(normalValue(key,value))+'</b><small>'+esc(sample?('n='+sample+' · '+conf.label):'Not available')+'</small>'+(note?'<em>'+esc(note)+'</em>':'')+'</div>';
  }
  function normalsAtGlance(c,W){
    const p=W.prefs(c),h=AGE_ORDER.includes(Number(p.hours))?Number(p.hours):168,d=baselineDetail(c,W,h),conf=normalConfidence(d.sample);
    const tabs=AGE_ORDER.map(x=>'<button class="adc-normal-tab '+(x===h?'active':'')+'" data-adc-baseline-window="'+x+'">'+AGE_NAME[x]+'</button>').join('');
    return '<div class="adc-normal-panel">'+
      '<div class="adc-normal-head"><div><div class="adc-subhead"><b>Normals at a glance</b><span>Click a checkpoint. The selected video below switches to the same age.</span></div><h3>'+esc(AGE_NAME[h]+' creator normal')+'</h3><p>'+esc(d.label)+' · '+esc(d.source)+'</p></div><div class="adc-normal-confidence '+conf.tone+'"><span>BASELINE CONFIDENCE</span><b>'+esc(conf.label)+'</b><small>Each metric keeps its own compatible n.</small></div></div>'+
      '<div class="adc-normal-tabs">'+tabs+'</div>'+
      '<div class="adc-normal-channel-link"><div><span>CHANNEL TRACKING</span><b>90-day progress</b><small>Whole-channel movement after several videos. It does not set the 24h / 48h / 7d / 28d video normal.</small></div><button class="btn" data-ac-mode="channel">Open 90-day progress</button></div>'+
      '<div class="adc-normal-groups">'+
        '<div><div class="adc-normal-group-label">OUTCOME + SHOW</div><div class="adc-normal-metrics">'+
          normalMetricCell('Views · new count','views',d,'Outcome volume')+
          normalMetricCell('Engaged views · original count','engagedViews',d,'Use only when Studio verifies it')+
          normalMetricCell('Impressions','impressions',d,'How often the package was shown')+
        '</div></div>'+
        '<div><div class="adc-normal-group-label">CLICK + WATCH</div><div class="adc-normal-metrics">'+
          normalMetricCell('CTR','ctr',d,'Choice after an impression')+
          normalMetricCell('First 30 sec','retention30',d,'Exact Intro value when available')+
          normalMetricCell('APV','apv',d,'Average percentage viewed')+
          normalMetricCell('AVD','avdSeconds',d,'Average view duration')+
        '</div></div>'+
        '<div><div class="adc-normal-group-label">TRAFFIC SOURCE MIX</div><div class="adc-normal-metrics traffic">'+
          normalMetricCell('Browse','browsePct',d)+normalMetricCell('Suggested','suggestedPct',d)+normalMetricCell('Search','searchPct',d)+normalMetricCell('External','externalPct',d)+
        '</div></div>'+
      '</div>'+
      '<p class="adc-normal-note"><b>How to use this:</b> this is the reference point, not the diagnosis. First see what is normal for the creator at this exact age. Then compare the selected video below, find the first meaningful break, and only change strategy when the evidence repeats or clearly matters for the video’s job.</p>'+
    '</div>';
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
  const VIDEO_COMPLETION_FIELDS=[
    ['views','Views','Studio → Content → open the video → Analytics → Advanced Mode / SEE MORE. Set the exact video-age lifespan and use Views.'],
    ['engagedViews','Engaged views','Studio → Analytics → Advanced Mode / SEE MORE → Engaged views. Keep the exact same video-age lifespan. Do not substitute public Views.'],
    ['impressions','Impressions','Studio → Content → open the video → Analytics → Reach / Advanced Mode. Use the exact same video-age lifespan.'],
    ['ctr','CTR','Studio → Content → open the video → Analytics → Reach / Advanced Mode → Impressions click-through rate. Use the exact same lifespan.'],
    ['retention30','First 30 sec / Intro','Studio → Content → open the video → Analytics → Engagement → Audience retention / Key moments → Intro. Enter the exact reported 0:30 value only; never estimate the curve.'],
    ['apv','APV','Studio → Content → open the video → Analytics → Engagement / Advanced Mode → Average percentage viewed. Use the exact same lifespan.'],
    ['avdSeconds','AVD','Studio → Content → open the video → Analytics → Engagement / Advanced Mode → Average view duration. Use the exact same lifespan.'],
    ['browsePct','Browse %','Studio → Content → open the video → Analytics → Reach / Content → How viewers found this video. Match the checkpoint lifespan when Studio can isolate it.'],
    ['suggestedPct','Suggested %','Studio → Content → open the video → Analytics → Reach / Content → How viewers found this video. Match the checkpoint lifespan when Studio can isolate it.'],
    ['searchPct','Search %','Studio → Content → open the video → Analytics → Reach / Content → How viewers found this video. Match the checkpoint lifespan when Studio can isolate it.'],
    ['externalPct','External %','Studio → Content → open the video → Analytics → Reach / Content → How viewers found this video. Match the checkpoint lifespan when Studio can isolate it.']
  ];
  const AUDIENCE_COMPLETION_FIELDS=[
    ['monthlyAudience','Monthly audience'],['newViewers','New viewers'],['casual','Casual viewers'],['regular','Regular viewers'],['returning','Returning viewers'],['avgViewsPerViewer','Average views / viewer']
  ];
  const CHANNEL_COMPLETION_FIELDS=[
    ['views','Views'],['engagedViews','Engaged views'],['impressions','Impressions'],['ctr','CTR'],['watchTime','Watch time'],
    ['browsePct','Browse %'],['suggestedPct','Suggested %'],['searchPct','Search %'],['externalPct','External %'],
    ['uploadsPublished','Long-form uploads published'],['newUploadViews','New-upload views'],['libraryViews','Older-library views']
  ];
  function latestCheckpointRows(c){
    const rows=(c?.analyticsFoundation?.observations||[]).filter(o=>o&&AGE_ORDER.includes(Number(o.windowHours))),map=new Map();
    const rank=o=>[(n(o.revision)||0),Date.parse(o.capturedAt||o.acceptedAt||0)||0];
    for(const o of rows){
      const key=String(o.videoId)+'|'+String(o.windowHours),prev=map.get(key);
      if(!prev){map.set(key,o);continue;}
      const a=rank(prev),b=rank(o);if(b[0]>a[0]||(b[0]===a[0]&&b[1]>=a[1]))map.set(key,o);
    }
    return [...map.values()].sort((a,b)=>(Number(a.windowHours)-Number(b.windowHours))||String(b.publishedAt||'').localeCompare(String(a.publishedAt||'')));
  }
  function businessResultIsExpected(c){
    const text=[c?.coachOS?.plan90?.primaryMetricKey,c?.coachOS?.plan90?.primaryMetric,c?.coachOS?.plan90?.outcome,c?.coachOS?.baseline?.context?.channelGoal].filter(Boolean).join(' ').toLowerCase();
    return /lead|book|sale|revenue|customer|client|convert|conversion|application/.test(text);
  }
  function missingDataReport(c,W){
    const videoRows=latestCheckpointRows(c).map(o=>{
      const missing=VIDEO_COMPLETION_FIELDS.filter(([k])=>n(o?.metrics?.[k])===null);
      const context=[];
      if(o.coverage!=='exact')context.push(o.coverage==='partial'?'Checkpoint is partial, not the full '+AGE_NAME[o.windowHours]+' lifespan':'Exact checkpoint coverage is not verified');
      if(!o.definitionId||/unknown|unverified/i.test(String(o.definitionId)))context.push('Measurement definition is unverified');
      if(!o.paid||o.paid==='unknown')context.push('Organic / paid status is unverified');
      return {videoId:o.videoId,title:o.title||o.videoId,hours:Number(o.windowHours),missing,context};
    }).filter(x=>x.missing.length||x.context.length);
    const audRows=audienceSnapshots(c).map(a=>({asOf:a.asOf||a.date||'',missing:AUDIENCE_COMPLETION_FIELDS.filter(([k])=>n(a[k])===null)})).filter(x=>x.missing.length);
    const chRows=snapshots(c).map(s=>{
      const missing=CHANNEL_COMPLETION_FIELDS.filter(([k])=>n(s[k])===null);
      const context=[];
      if(!s.metricDefinitionId||/unknown|unverified/i.test(String(s.metricDefinitionId)))context.push('Measurement definition is unverified');
      if(!s.paidNote||/unable to verify|unknown/i.test(String(s.paidNote)))context.push('Organic / paid context is unverified');
      if(businessResultIsExpected(c)&&['qualifiedLeads','bookings','sales','revenue'].every(k=>n(s[k])===null))context.push('Business result is not connected. Pull it from the CRM / sales system, not YouTube Studio.');
      return {id:s.id,date:s.date||String(s.periodEndExclusive||'').slice(0,10),missing,context};
    }).filter(x=>x.missing.length||x.context.length);
    const baselineDepth=AGE_ORDER.map(h=>{const d=baselineDetail(c,W,h),sample=n(d.sample)||0;return {hours:h,sample,need:Math.max(0,10-sample)};});
    return {videoRows,audRows,chRows,baselineDepth,total:videoRows.length+audRows.length+chRows.length};
  }
  function missingDataHtml(c,W){
    const r=missingDataReport(c,W);
    const fieldList=items=>items.map(x=>x[1]).join(', ');
    const videoPaths=items=>[...new Map(items.map(x=>[x[2],x])).values()].map(x=>'<li><b>'+esc(x[1])+':</b> '+esc(x[2])+'</li>').join('');
    const depth=r.baselineDepth.map(x=>'<div class="adc-gap-depth '+(x.need?'warn':'good')+'"><span>'+AGE_NAME[x.hours]+' BASELINE</span><b>n='+x.sample+'</b><small>'+(x.need?'Aim for 10+ · need about '+x.need+' more comparable row'+(x.need===1?'':'s'):'Good working sample')+'</small>'+(x.need?'<button class="btn" data-studio="prompt-view-'+x.hours+'">Get more '+AGE_NAME[x.hours]+' rows</button>':'')+'</div>').join('');
    const videos=r.videoRows.map(x=>'<div class="adc-gap-row"><div><b>'+esc(x.title)+' · '+AGE_NAME[x.hours]+'</b>'+(x.missing.length?'<span><strong>Missing:</strong> '+esc(fieldList(x.missing))+'</span>':'')+(x.context.length?'<span><strong>Verify:</strong> '+esc(x.context.join(' · '))+'</span>':'')+'<details><summary>Where do I find this?</summary><ul>'+videoPaths(x.missing)+(x.context.some(y=>/definition/i.test(y))?'<li><b>Measurement definition:</b> Verify the Views / Engaged views definition in the report or Advanced Mode and enter the exact definition label. If it cannot be verified, leave it unknown.</li>':'')+(x.context.some(y=>/paid/i.test(y))?'<li><b>Organic / paid:</b> Confirm whether the video was organically distributed, promoted, or mixed. Use the report/filter or campaign history.</li>':'')+(x.context.some(y=>/partial/i.test(y))?'<li><b>Partial checkpoint:</b> Return after the full '+AGE_NAME[x.hours]+' has processed and replace the partial values with the exact lifespan.</li>':'')+'</ul></details></div><button class="btn" data-adc-fill-checkpoint data-video-id="'+esc(x.videoId)+'" data-hours="'+x.hours+'">Enter verified values</button></div>').join('');
    const audience=r.audRows.map(x=>'<div class="adc-gap-row"><div><b>Audience · '+esc(x.asOf||'undated')+' · rolling 28d</b><span><strong>Missing:</strong> '+esc(fieldList(x.missing))+'</span><details><summary>Where do I find this?</summary><ul><li><b>Monthly / New / Casual / Regular / Returning:</b> Studio → Analytics → Audience, using the same fully processed rolling 28-day window.</li><li><b>Average views / viewer:</b> Studio → Analytics → Advanced Mode / SEE MORE for that same 28-day window.</li></ul></details></div><button class="btn" data-cg="analytics-audience-edit:'+esc(x.asOf)+'">Enter audience data</button></div>').join('');
    const channel=r.chRows.map(x=>'<div class="adc-gap-row"><div><b>Channel · 90d ending '+esc(x.date||'unknown')+'</b>'+(x.missing.length?'<span><strong>Missing:</strong> '+esc(fieldList(x.missing))+'</span>':'')+(x.context.length?'<span><strong>Verify / external:</strong> '+esc(x.context.join(' · '))+'</span>':'')+'<details><summary>Where do I find this?</summary><ul><li><b>Core / traffic:</b> Studio → Analytics → Advanced Mode using the exact 90-day period and Traffic source breakdown.</li><li><b>New upload vs library:</b> Advanced Mode → exact 90-day range → separate videos published inside the period from videos published before the period.</li><li><b>Business results:</b> CRM / booking / sales system. Do not infer them from YouTube.</li></ul></details></div><button class="btn" data-cg="'+esc(x.id?'analytics-snapshot-edit:'+x.id:'analytics-snapshot-new')+'">Enter channel data</button></div>').join('');
    return '<div class="adc-missing-data" id="adc-missing-data"><div class="adc-subhead"><b>Missing Data Checklist</b><span>Studio AI fills what it can. You complete the verified gaps.</span></div><p class="adc-gap-intro">A blank metric stays unavailable. It is never estimated. Use the list below to finish the dataset, then the dashboard will automatically use the completed evidence.</p><div class="adc-gap-depth-grid">'+depth+'</div>'+
      (videos?'<details open class="adc-gap-group"><summary>Video checkpoint gaps · '+r.videoRows.length+'</summary>'+videos+'</details>':'<div class="adc-gap-complete">Video checkpoint fields are complete for the saved rows.</div>')+
      (audience?'<details class="adc-gap-group"><summary>Audience snapshot gaps · '+r.audRows.length+'</summary>'+audience+'</details>':'')+
      (channel?'<details class="adc-gap-group"><summary>Channel / business gaps · '+r.chRows.length+'</summary>'+channel+'</details>':'')+
      (!r.total?'<div class="adc-gap-complete"><b>No saved-data gaps detected.</b> Keep adding new checkpoints as videos mature.</div>':'')+
    '</div>';
  }

  function channelReadHtml(c,W,guide){
    const r=overallRead(c,W,guide),tone=toneFor(r),a=r.audience,latestChannel=snapshots(c).at(-1)||{},manualAction=latestChannel.id?'analytics-snapshot-edit:'+latestChannel.id:'analytics-snapshot-new';
    const mini=(label,value,change)=>'<div class="adc-audience-mini"><span>'+esc(label)+'</span><b>'+esc(fmt(value))+'</b><small>'+esc(change===null?'No prior read':signed(change-1)+' vs prior')+'</small></div>';
    const health=r.stages.map(s=>'<div class="adc-stage '+s.band+'"><span>'+esc(s.label)+'</span><b>'+esc(s.value)+'</b><small>'+esc(s.sub)+'</small></div>').join('');
    const healthHelp=r.stages.map(s=>'<p><b>'+esc(s.label)+':</b> '+esc(s.action||'')+'</p>').join('');
    return '<section class="ac-section adc-overall '+tone+'" id="adc-overall-read">'+
      '<div class="ac-section-head adc-overall-head"><div class="ac-section-index">01</div><div><div class="adc-kicker">OVERALL CHANNEL READ</div><h2>'+esc(r.focus)+'</h2><p>'+esc(r.why.slice(0,2).join(' '))+'</p><div class="adc-program-context"><b>Program goal:</b> '+esc(c.coachOS?.plan90?.outcome||c.coachOS?.baseline?.context?.channelGoal||'Not set yet')+(c.coachOS?.plan90?.primaryMetric?'<span> · Main measure: '+esc(c.coachOS.plan90.primaryMetric)+'</span>':'')+'</div></div><div class="adc-focus"><span>WHAT I’D DO NOW</span><b>'+esc(r.action.video)+'</b><small>'+esc(r.confidence)+' confidence · '+esc(r.source)+'</small></div></div>'+
      '<div class="ac-section-body">'+
        normalsAtGlance(c,W)+
        missingDataHtml(c,W)+
        '<div class="adc-compact-block"><div class="adc-subhead"><b>Channel health</b><span>What does the combination mean?</span></div><div class="adc-stages">'+health+'</div>'+
          '<div class="adc-current-read '+r.channelHealth.tone+'"><span>CURRENT CHANNEL-HEALTH READ</span><b>'+esc(r.channelHealth.headline)+'</b><p>'+esc(r.channelHealth.meaning)+'</p><div><strong>Coach action</strong><p>'+esc(r.channelHealth.action)+'</p></div><small><b>Protect / limits:</b> '+esc(r.channelHealth.protect)+'</small></div>'+
          '<details class="adc-help"><summary>How do I read Attention / Return / Library Depth / Result?</summary>'+healthHelp+'</details></div>'+
        '<div class="adc-compact-block"><div class="adc-subhead"><b>Audience · rolling 28 days</b><span>'+esc(a.read)+'</span></div><div class="adc-audience-mini-grid">'+
          mini('New',a.newViewers,a.changes?.newViewers??null)+mini('Casual',a.casual,a.changes?.casual??null)+mini('Regular',a.regular,a.changes?.regular??null)+mini('Returning',a.returning,a.changes?.returning??null)+
        '</div><div class="adc-current-read '+r.audienceCoach.tone+'"><span>WHAT THIS AUDIENCE DATA MEANS NOW</span><b>'+esc(r.audienceCoach.headline)+'</b><p>'+esc(r.audienceCoach.meaning)+'</p><div><strong>Coach action</strong><p>'+esc(r.audienceCoach.action)+'</p></div><small><b>Protect / limits:</b> '+esc(r.audienceCoach.protect)+'</small></div><details class="adc-help"><summary>What do these audience groups mean?</summary>'+
          '<p><b>Important:</b> New → Casual → Regular is a programming lens, not a tracked person-by-person conversion funnel. Read the direction of the groups together over time.</p>'+
          '<p><b>New:</b> fresh people reached. If this falls while repeat viewing holds, inspect stronger gateway / Reach ideas.</p>'+
          '<p><b>Casual:</b> occasional repeat viewers. If this weakens, inspect follow-ups, series, consistency, and whether a viewer has an obvious next video.</p>'+
          '<p><b>Regular:</b> long-term consistent viewers. The definition is strict, so direction over several snapshots matters more than the raw size.</p>'+
          '<p><b>Returning:</b> prior viewers who came back. If this falls, check continuation, cadence, topic consistency, and watch-next paths.</p>'+
          '<p><b>How to use this read:</b> '+esc(a.focus)+'</p>'+
          (a.overlapDays?'<p><b>Caution:</b> these rolling snapshots overlap by about '+esc(a.overlapDays)+' day'+(a.overlapDays===1?'':'s')+', so treat the direction as a clue rather than a clean before/after experiment.</p>':'')+
        '</details></div>'+
        '<div class="adc-manual-data"><span><b>Missing verified data?</b> Add or correct channel, audience, library, traffic-source, upload-count, or business-result fields manually when Studio cannot return them.</span><button class="btn" data-cg="'+esc(manualAction)+'">'+(latestChannel.id?'Add / edit verified channel data':'Add verified channel data')+'</button></div>'+ '<div class="adc-overall-foot"><span><b>Program job:</b> '+esc(r.action.job)+'</span><span><b>Main measure:</b> '+esc(r.action.metric)+'</span></div>'+
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
      hypothesis='If the title/thumbnail is the real problem, stronger packaging should move CTR closer to what this creator usually gets while retention stays healthy.';
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
- THEN include previous comparable current-era uploads needed to establish the creator normal. Return 10–20 previous comparable rows whenever at least 10 eligible uploads exist. Do NOT stop at five merely because five is enough to form a provisional baseline.
- If fewer than 10 previous comparable rows are returned for any checkpoint, limitations MUST state how many eligible comparable uploads were found and the exact reason fewer than 10 could be returned.
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
- If an exact checkpoint metric or traffic-source split is unavailable or still processing, use null AND identify the missing metric/report in limitations so the coach knows what must be filled manually.
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
      const missingFill=e.target.closest?.('[data-adc-fill-checkpoint]');
      if(missingFill){
        e.preventDefault();
        const api=win.AcceleratorAnalyticsManual;
        if(api?.openCheckpoint)api.openCheckpoint(missingFill.dataset.videoId,Number(missingFill.dataset.hours));
        return;
      }
      const baselineJump=e.target.closest?.('[data-adc-baseline-window]');
      if(baselineJump){
        e.preventDefault();const c=current();if(!c)return;
        const p=W.prefs(c);p.mode='video';p.hours=Number(baselineJump.dataset.adcBaselineWindow);p.baselineId='';
        try{guide?.analyticsPage?.()}catch(_){}
        setTimeout(()=>win.document.querySelector('.adc-normal-panel')?.scrollIntoView({behavior:'smooth',block:'nearest'}),0);
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
      .adc-subhead{display:flex;gap:10px;align-items:baseline;justify-content:space-between}.adc-subhead span{font-size:12px;opacity:.65}.adc-audience-read{margin:0 0 10px;padding:12px;border-radius:10px;background:rgba(75,104,110,.07);display:grid;gap:3px}.adc-audience-read span,.adc-audience-note{font-size:12px;line-height:1.45;opacity:.72}.adc-audience-note{display:block;margin-top:8px}.adc-missing-data{display:grid;gap:10px;border:1px solid var(--line,#d9e0e2);border-radius:12px;padding:13px;background:rgba(181,130,46,.035)}.adc-gap-intro{font-size:11px!important;color:var(--muted,#68757d)}.adc-gap-depth-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.adc-gap-depth{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:9px;display:grid;gap:3px}.adc-gap-depth span{font-size:9px;font-weight:900;letter-spacing:.07em}.adc-gap-depth b{font-size:15px}.adc-gap-depth small{font-size:9px;color:var(--muted,#68757d)}.adc-gap-depth.warn{border-top:3px solid #b5822e}.adc-gap-depth.good{border-top:3px solid #2f8464}.adc-gap-group{border-top:1px solid var(--line,#d9e0e2);padding-top:9px}.adc-gap-group>summary{cursor:pointer;font-size:11px;font-weight:900}.adc-gap-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start;padding:10px 0;border-bottom:1px solid var(--line,#d9e0e2)}.adc-gap-row>div{display:grid;gap:4px}.adc-gap-row span{font-size:11px;line-height:1.4}.adc-gap-row details summary{cursor:pointer;font-size:10px;font-weight:800;color:var(--muted,#68757d)}.adc-gap-row li{font-size:10px;line-height:1.45;margin:4px 0}.adc-gap-complete{font-size:11px;padding:9px;border-radius:8px;background:rgba(47,132,100,.06)}.adc-manual-data{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border:1px dashed var(--line,#d9e0e2);border-radius:10px;font-size:12px}.adc-manual-data span{line-height:1.4}.adc-manual-data .btn{flex:0 0 auto}.adc-overall-foot{display:flex;gap:18px;justify-content:space-between;flex-wrap:wrap;font-size:12px}
      .adc-diagnosis{border-left:5px solid #55757a!important}.adc-diagnosis.focus{border-left-color:#366f7a!important}.adc-diagnosis.warn{border-left-color:#b5822e!important}.adc-diagnosis.great{border-left-color:#2f8464!important}.adc-decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.adc-decision-grid>div{border:1px solid var(--line,#ddd);border-radius:10px;padding:12px;display:grid;gap:4px}.adc-decision-grid span{font-size:10px;font-weight:800;text-transform:uppercase}.adc-decision-grid small{opacity:.65}
      .adc-plan-focus{margin:0 0 14px;border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:var(--card,#fff);display:grid;gap:12px}.adc-plan-focus.focus{border-left-color:#366f7a}.adc-plan-focus.warn{border-left-color:#b5822e}.adc-plan-focus.great{border-left-color:#2f8464}.adc-plan-focus h3{margin:4px 0 5px}.adc-plan-focus p{margin:0;line-height:1.45}.adc-plan-focus small{opacity:.65}.adc-plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.adc-plan-grid>div{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:10px;display:grid;gap:4px}.adc-plan-grid span{font-size:9px;font-weight:900;letter-spacing:.07em}.adc-plan-grid b{font-size:12px;line-height:1.35}
      .adc-video-focus{margin:0 0 14px;border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:var(--card,#fff);display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,420px);gap:15px}.adc-video-focus.focus{border-left-color:#366f7a}.adc-video-focus.warn{border-left-color:#b5822e}.adc-video-focus.great{border-left-color:#2f8464}.adc-video-focus h3{margin:4px 0 5px}.adc-video-focus p{margin:0;line-height:1.45}.adc-video-meta{display:grid;gap:5px;font-size:12px}.adc-video-meta small{opacity:.65}
      .adc-prompt-dialog{width:min(820px,94vw);border:1px solid #bbc7c7;border-radius:12px;padding:20px;background:var(--panel,#fff);color:var(--text,#17212a)}.adc-prompt-dialog textarea{width:100%;height:360px;box-sizing:border-box;margin:10px 0}
      @media(max-width:900px){.adc-plan-grid{grid-template-columns:1fr}.adc-overall-head{grid-template-columns:40px minmax(0,1fr)}.adc-overall-head .adc-focus{grid-column:2}.adc-video-focus{grid-template-columns:1fr}.adc-baselines,.adc-audience,.adc-stages{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.adc-baselines,.adc-audience,.adc-stages,.adc-decision-grid{grid-template-columns:1fr}.adc-subhead{display:grid}.adc-overall{margin-bottom:16px}.adc-overall-head{grid-template-columns:32px minmax(0,1fr)}.adc-overall-head .adc-focus{grid-column:1/-1}}

      .adc-baselines{grid-template-columns:repeat(5,minmax(0,1fr))}.adc-baseline-pill{padding:9px 10px;gap:2px;min-height:0}.adc-baseline-pill span{font-size:9px}.adc-baseline-pill b{font-size:13px}.adc-baseline-pill small{font-size:9px;line-height:1.25}.adc-90-pill{border-style:dashed}.adc-compact-block{display:grid;gap:8px}.adc-compact-block+.adc-compact-block{border-top:1px solid var(--line,#d9e0e2);padding-top:12px}.adc-stages{grid-template-columns:repeat(4,minmax(0,1fr))}.adc-stage{padding:9px}.adc-stage em{display:none}.adc-help summary{cursor:pointer;font-size:11px;font-weight:800;color:var(--muted,#68757d)}.adc-help p{font-size:11px;line-height:1.45;margin:7px 0}.adc-audience-mini-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.adc-audience-mini{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:8px;display:grid;gap:2px}.adc-audience-mini span{font-size:9px;font-weight:900;text-transform:uppercase}.adc-audience-mini b{font-size:15px}.adc-audience-mini small{font-size:9px;color:var(--muted,#68757d)}.adc-audience{display:none}.adc-audience-read,.adc-audience-note{display:none}
      @media(max-width:1000px){.adc-baselines{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:650px){.adc-baselines,.adc-stages,.adc-audience-mini-grid{grid-template-columns:1fr 1fr}}

      .adc-program-context{margin-top:8px;font-size:11px;color:var(--muted,#68757d)}.adc-normal-panel{border:1px solid var(--line,#d9e0e2);border-radius:13px;padding:14px;display:grid;gap:12px;background:rgba(84,110,116,.025)}.adc-normal-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start}.adc-normal-head h3{margin:5px 0 3px}.adc-normal-head p{margin:0;font-size:11px;color:var(--muted,#68757d)}.adc-normal-confidence{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:8px 10px;display:grid;gap:2px;min-width:170px}.adc-normal-confidence span{font-size:8px;font-weight:900;letter-spacing:.08em}.adc-normal-confidence b{font-size:12px}.adc-normal-confidence small{font-size:9px;opacity:.7}.adc-normal-confidence.good{border-top:3px solid #2f8464}.adc-normal-confidence.normal{border-top:3px solid #55757a}.adc-normal-confidence.warn{border-top:3px solid #b5822e}.adc-normal-confidence.muted{opacity:.65}.adc-normal-tabs{display:flex;gap:6px;flex-wrap:wrap}.adc-normal-tab{border:1px solid var(--line,#d9e0e2);background:var(--card,#fff);color:inherit;border-radius:999px;padding:7px 12px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.adc-normal-tab.active{background:#203d3e;color:#fff;border-color:#203d3e}.adc-normal-tab.channel{margin-left:auto;border-style:dashed;border-color:#55757a;background:rgba(84,110,116,.04)}.adc-normal-groups{display:grid;gap:12px}.adc-normal-group-label{font-size:9px;font-weight:900;letter-spacing:.09em;color:var(--muted,#68757d);margin-bottom:6px}.adc-normal-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.adc-normal-metrics.traffic{grid-template-columns:repeat(4,minmax(0,1fr))}.adc-normal-metric{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:9px;display:grid;gap:2px;min-width:0}.adc-normal-metric span{font-size:9px;font-weight:900;text-transform:uppercase}.adc-normal-metric b{font-size:16px}.adc-normal-metric small{font-size:9px;opacity:.7}.adc-normal-metric em{font-style:normal;font-size:9px;line-height:1.25;color:var(--muted,#68757d)}.adc-normal-metric.good{border-top:3px solid #2f8464}.adc-normal-metric.normal{border-top:3px solid #55757a}.adc-normal-metric.warn{border-top:3px solid #b5822e}.adc-normal-metric.muted{opacity:.58}.adc-normal-note{font-size:11px;line-height:1.45;color:var(--muted,#68757d)}
      @media(max-width:900px){.adc-normal-head{grid-template-columns:1fr}.adc-normal-confidence{min-width:0}.adc-normal-metrics,.adc-normal-metrics.traffic{grid-template-columns:repeat(2,minmax(0,1fr))}.adc-normal-tab.channel{margin-left:0}}@media(max-width:560px){.adc-normal-metrics,.adc-normal-metrics.traffic{grid-template-columns:1fr 1fr}}

      .adc-normal-channel-link{display:flex;justify-content:space-between;align-items:center;gap:14px;border-top:1px dashed var(--line,#d9e0e2);padding-top:10px}.adc-normal-channel-link>div{display:grid;gap:2px}.adc-normal-channel-link span{font-size:9px;font-weight:900;letter-spacing:.08em;color:var(--muted,#68757d)}.adc-normal-channel-link b{font-size:13px}.adc-normal-channel-link small{font-size:10px;color:var(--muted,#68757d);line-height:1.35}
      .adc-current-read{border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:11px;padding:12px;display:grid;gap:6px;background:rgba(84,110,116,.025)}.adc-current-read.bad{border-left-color:#b54b4b}.adc-current-read.warn{border-left-color:#b5822e}.adc-current-read.good{border-left-color:#2f8464}.adc-current-read.muted{opacity:.72}.adc-current-read>span{font-size:9px;font-weight:900;letter-spacing:.08em}.adc-current-read>b{font-size:14px;line-height:1.35}.adc-current-read p{margin:0!important;font-size:11px!important;line-height:1.45!important}.adc-current-read>div{padding-top:6px;border-top:1px solid var(--line,#d9e0e2)}.adc-current-read strong{font-size:10px;text-transform:uppercase;letter-spacing:.05em}.adc-current-read small{font-size:10px;line-height:1.4;color:var(--muted,#68757d)}
      @media(max-width:650px){.adc-normal-channel-link{display:grid}.adc-gap-depth-grid{grid-template-columns:1fr 1fr}.adc-gap-row{grid-template-columns:1fr}.adc-gap-row>.btn{width:100%}}
    `;win.document.head.appendChild(style);
    paint();
  }

  return {snapshots,audienceSnapshots,audienceRead,audienceCoachRead,baselineTrajectory,baselineDetail,normalsAtGlance,missingDataReport,missingDataHtml,channelStages,channelHealthRead,deriveFocus,focusAction,overallRead,planSuggestion,channelPrompt,masterPrompt,parseJsonBlock,install};
});
