(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){ root.AcceleratorDecisionContext=api; if(root.document) api.install(root); }
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';

  const AGE_ORDER=[24,48,168,672];
  const WINDOW_KEY={24:'_24h',48:'_48h',168:'_7d',672:'_28d'};
  const AGE_NAME={24:'24h',48:'48h',168:'7d',672:'28d'};
  const STAGE_TO_FOCUS={reach:'Discovery / idea opportunity',packaging:'Packaging / click',retention:'Promise / opening / viewing experience'};
  const n=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ratio=(a,b)=>n(a)!==null&&n(b)!==null&&n(b)!==0?n(a)/n(b):null;
  const pct=v=>n(v)===null?'—':n(v).toFixed(1)+'%';
  const fmt=v=>n(v)===null?'—':Math.round(n(v)).toLocaleString();
  const signed=v=>n(v)===null?'—':(v>=0?'+':'')+(v*100).toFixed(0)+'%';

  function snapshots(c){
    return (c?.coachOS?.analytics?.snapshots||[]).filter(x=>x&&x.period==='90d').slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  }
  function audienceRead(c){
    const rows=snapshots(c),cur=rows.at(-1)||{},prev=rows.at(-2)||{};
    const change=k=>ratio(cur[k],prev[k]);
    const loyaltyCandidates=['regular','returning','casual'].map(k=>[k,change(k)]).filter(x=>x[1]!==null);
    const loyalty=loyaltyCandidates.find(x=>x[0]==='regular')||loyaltyCandidates.find(x=>x[0]==='returning')||loyaltyCandidates[0]||[null,null];
    const acquisition=change('newViewers'),depth=change('avgViewsPerViewer');
    const band=r=>r===null?'unknown':r<.85?'weak':r>1.05?'strong':'steady';
    return {
      current:cur,previous:prev,hasCurrent:Boolean(rows.length),hasComparison:rows.length>=2,
      acquisition,acquisitionBand:band(acquisition),loyaltyKey:loyalty[0],loyalty:loyalty[1],loyaltyBand:band(loyalty[1]),depth,depthBand:band(depth),
      newViewers:n(cur.newViewers),casual:n(cur.casual),regular:n(cur.regular),returning:n(cur.returning),avgViewsPerViewer:n(cur.avgViewsPerViewer)
    };
  }
  function baselineTrajectory(c){
    const sets=(c?.coachOS?.baseline?.sets||[]).filter(x=>x&&!x.archived&&x.confirmedComparable);
    const history=c?.coachOS?.baseline?.history||[];
    return AGE_ORDER.map(hours=>{
      const key=WINDOW_KEY[hours],candidates=sets.filter(x=>x.window===key);
      const current=candidates.find(x=>x.primary)||candidates[0];
      if(!current)return {hours,key,current:null,first:null,outcomeKey:null,growth:null};
      const prior=history.filter(x=>x&&x.id===current.id).sort((a,b)=>String(a.effectiveFrom||a.savedAt||'').localeCompare(String(b.effectiveFrom||b.savedAt||'')));
      const first=prior[0]||current;
      const outcomeKey=n(current.engagedViews)!==null?'engagedViews':'views';
      return {hours,key,current,first,outcomeKey,growth:ratio(current[outcomeKey],first[outcomeKey])};
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
    const outcomeKey=n(cur.engagedViews)!==null&&n(prev.engagedViews)!==null?'engagedViews':'views';
    const attention=ratio(cur[outcomeKey],prev[outcomeKey]),impressions=ratio(cur.impressions,prev.impressions);
    const returnRatio=audience.loyalty,depth=audience.depth;
    const resultKey=['qualifiedLeads','bookings','sales'].find(k=>n(cur[k])!==null&&n(prev[k])!==null)||null;
    const resultRatio=resultKey?ratio(cur[resultKey],prev[resultKey]):null;
    const phrase=(r,label)=>r===null?'No comparable trend yet':label+' '+signed(r-1)+' vs prior';
    return [
      {key:'attention',label:'ATTENTION',band:stageBand(attention),value:phrase(attention,outcomeKey==='engagedViews'?'Engaged views':'Views'),sub:impressions===null?'Impressions trend unavailable':'Impressions '+signed(impressions-1)+' vs prior'},
      {key:'return',label:'RETURN',band:stageBand(returnRatio),value:returnRatio===null?'No comparable repeat-audience trend yet':(audience.loyaltyKey==='regular'?'Regular':audience.loyaltyKey==='casual'?'Casual':'Returning')+' viewers '+signed(returnRatio-1),sub:'Are more people choosing to come back?'},
      {key:'depth',label:'LIBRARY DEPTH',band:stageBand(depth),value:depth===null?'Average views/viewer not comparable yet':'Avg views/viewer '+signed(depth-1)+' vs prior',sub:'Is attention turning into more viewing?'},
      {key:'result',label:'RESULT',band:stageBand(resultRatio),value:resultRatio===null?'Business result not connected yet':(resultKey==='qualifiedLeads'?'Qualified leads':resultKey==='bookings'?'Bookings':'Sales')+' '+signed(resultRatio-1),sub:'Is attention producing the intended outcome?'}
    ];
  }
  function patternFocus(pattern){
    if(!pattern?.max||!pattern?.stages?.length)return null;
    if(pattern.stages.length===1)return STAGE_TO_FOCUS[pattern.stages[0]]||null;
    return pattern.stages.map(x=>STAGE_TO_FOCUS[x]||x).join(' + ');
  }
  function deriveFocus(input){
    const d=input.diagnosis||{},p=input.pattern||{},a=input.audience||{},t=input.trajectory||[];
    if(d.leading&&d.leading!=='Not enough evidence yet')return {focus:d.leading,confidence:d.confidence||'Low',source:'channel diagnosis'};
    if(p.max&&p.source==='hard')return {focus:patternFocus(p)||'Video funnel pattern',confidence:p.max>=3?'Medium':'Low',source:'repeated 7-day videos'};
    if(a.acquisitionBand==='weak'&&['steady','strong'].includes(a.loyaltyBand))return {focus:'Acquisition / gateway',confidence:'Medium',source:'audience trend'};
    if(['steady','strong'].includes(a.acquisitionBand)&&a.loyaltyBand==='weak')return {focus:'Loyalty / pathway',confidence:'Medium',source:'audience trend'};
    const seven=t.find(x=>x.hours===168);
    if(seven?.growth!==null&&seven.growth>=1.1&&!p.max)return {focus:'Growth pattern worth protecting',confidence:'Medium',source:'rising 7-day normal'};
    if(p.max)return {focus:patternFocus(p)||'Soft video pattern to investigate',confidence:'Low',source:'soft 7-day pattern'};
    return {focus:'No clear channel bottleneck yet',confidence:'Low',source:'insufficient repeated evidence'};
  }
  function focusAction(focus){
    const x=String(focus||'').toLowerCase();
    if(x.includes('packag'))return {job:'Keep intended job',metric:'CTR + engaged views',video:'Pre-build the title + thumbnail promise, then change one meaningful packaging variable while protecting the idea and opening.'};
    if(x.includes('opening')||x.includes('viewing')||x.includes('retention'))return {job:'Trust or intended job',metric:'0:30 + APV/AVD',video:'Make promise delivery and the first 30–60 seconds the controlled improvement lane. Do not fix retention by making the idea smaller.'};
    if(x.includes('discovery')||x.includes('acquisition')||x.includes('gateway'))return {job:'Reach',metric:'Engaged views + impressions + new viewers',video:'Build a broader qualified gateway around a proven audience problem. Protect click and watch quality while increasing opportunity.'};
    if(x.includes('loyalty')||x.includes('pathway'))return {job:'Trust',metric:'Returning / casual / regular + continuation',video:'Make the next video feel like the obvious second watch: follow-up, series, bridge or deeper answer for the same viewer.'};
    if(x.includes('business')||x.includes('convert'))return {job:'Convert',metric:'Qualified leads / bookings',video:'Make the audience-to-offer path explicit without turning the video into an ad. Judge the video by its job, not only views.'};
    if(x.includes('growth')||x.includes('protect'))return {job:'Use the job that produced the win',metric:'Matched 7-day outcome + guardrails',video:'Protect the repeatable mechanism in the winners and make one adjacent follow-up instead of changing everything.'};
    if(x.includes('capacity')||x.includes('cadence'))return {job:'Any',metric:'Completed strategic reps',video:'Reduce complexity so the team can actually ship the learning rep without lowering topic, package or watch quality.'};
    return {job:'Decide from the video purpose',metric:'Match the primary metric to the job',video:'Use the existing diagnosis flow. Do not invent a data-driven constraint when the evidence is not there.'};
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
      if(audience.acquisition!==null)why.push('New viewers are '+signed(audience.acquisition-1)+' vs the prior 90-day report.');
      if(audience.loyalty!==null)why.push((audience.loyaltyKey==='regular'?'Regular':audience.loyaltyKey==='casual'?'Casual':'Returning')+' viewers are '+signed(audience.loyalty-1)+' vs prior.');
    } else if(audience.hasCurrent) why.push('Audience mix is saved, but one more comparable 90-day report is needed for trend.');
    else why.push('90-day audience mix is not saved yet, so acquisition/loyalty is not influencing the read.');
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
    return read.trajectory.map(x=>{
      if(!x.current)return '<div class="adc-baseline-pill muted"><span>'+AGE_NAME[x.hours]+'</span><b>No baseline</b><small>Not ready</small></div>';
      const value=n(x.current[x.outcomeKey]),growth=x.growth;
      return '<div class="adc-baseline-pill"><span>'+AGE_NAME[x.hours]+' normal</span><b>'+fmt(value)+'</b><small>'+(x.outcomeKey==='engagedViews'?'engaged views':'views')+(growth!==null?' · '+signed(growth-1)+' since start':'')+'</small></div>';
    }).join('');
  }
  function channelReadHtml(c,W,guide){
    const r=overallRead(c,W,guide),tone=toneFor(r),a=r.audience;
    return '<section class="adc-overall '+tone+'" id="adc-overall-read"><div class="adc-overall-head"><div><div class="adc-kicker">OVERALL CHANNEL READ</div><h2>'+esc(r.focus)+'</h2><p>'+esc(r.why.slice(0,3).join(' '))+'</p></div><div class="adc-focus"><span>WHAT THIS MEANS NOW</span><b>'+esc(r.action.video)+'</b><small>'+esc(r.confidence)+' confidence · from '+esc(r.source)+'</small></div></div>'+
      '<div class="adc-baselines">'+baselinePills(r)+'</div>'+
      '<div class="adc-subhead"><b>Channel health loop</b><span>ATTENTION → RETURN → LIBRARY DEPTH → RESULT. Weak tells you where to investigate, not why.</span></div>'+
      '<div class="adc-stages">'+r.stages.map(s=>'<div class="adc-stage '+s.band+'"><span>'+esc(s.label)+'</span><b>'+esc(s.value)+'</b><small>'+esc(s.sub)+'</small></div>').join('')+'</div>'+
      '<div class="adc-subhead"><b>Audience health</b><span>Use this to understand Reach vs Trust pressure. These are trend signals, not grades.</span></div>'+
      '<div class="adc-audience">'+
        audienceCard('New viewers',a.newViewers,a.acquisition,'Are we attracting new people?')+
        audienceCard('Casual viewers',a.casual,a.hasComparison?ratio(a.current.casual,a.previous.casual):null,'Are newer viewers starting to come back?')+
        audienceCard('Regular viewers',a.regular,a.hasComparison?ratio(a.current.regular,a.previous.regular):null,'Is the loyal core strengthening?')+
        audienceCard('Returning viewers',a.returning,a.hasComparison?ratio(a.current.returning,a.previous.returning):null,'Are people choosing the channel again?')+
      '</div><div class="adc-overall-foot"><span><b>Suggested video job if you are addressing this focus:</b> '+esc(r.action.job)+'</span><span><b>Measure:</b> '+esc(r.action.metric)+'</span></div></section>';
  }
  function diagnosisHtml(c,W,guide){
    const r=overallRead(c,W,guide),p=r.pattern,a=r.audience,tone=toneFor(r);
    let verdict='Analytics are not deciding this for you yet.';
    if(r.focus!=='No clear channel bottleneck yet')verdict='Analytics are pointing you toward '+r.focus+'.';
    const support=[];
    if(p?.max)support.push((p.source==='hard'?'Hard':'Soft')+' video pattern: '+(p.label||patternFocus(p))+' · '+p.max+' of '+p.n+' recent 7-day videos.');
    if(a.acquisition!==null)support.push('New viewers '+signed(a.acquisition-1)+' vs prior 90-day report.');
    if(a.loyalty!==null)support.push((a.loyaltyKey||'repeat audience')+' '+signed(a.loyalty-1)+' vs prior.');
    const decision='If the rest of the diagnosis agrees, choose '+r.focus+' as the working constraint. If creator goal, audience fit, offer, capacity or business context points somewhere stronger, keep this as supporting evidence and investigate the conflict.';
    return '<section class="studio-evidence adc-diagnosis '+tone+'" id="studio-diagnosis-evidence"><div class="kicker">Analytics decision support</div><h3>'+esc(verdict)+'</h3><p><b>Why:</b> '+esc((support.length?support:r.why).slice(0,3).join(' '))+'</p><div class="adc-decision-grid"><div><span>Analytics suggestion</span><b>'+esc(r.focus)+'</b><small>'+esc(r.confidence)+' confidence</small></div><div><span>If you accept it</span><b>'+esc(r.action.video)+'</b><small>Primary measurement: '+esc(r.action.metric)+'</small></div></div><p><b>How to use this in the diagnosis:</b> '+esc(decision)+'</p><p><b>Do not force it:</b> A repeated metric pattern can tell you where to investigate. It still does not prove the cause.</p><button class="btn" data-studio="analytics">Open Analytics</button></section>';
  }
  function videoFocusHtml(c,W,guide){
    const r=overallRead(c,W,guide),tone=toneFor(r);
    return '<section class="adc-video-focus '+tone+'" id="adc-video-focus"><div><div class="adc-kicker">DATA FOCUS FOR THIS VIDEO</div><h3>'+esc(r.focus)+'</h3><p>'+esc(r.action.video)+'</p></div><div class="adc-video-meta"><span><b>Why:</b> '+esc(r.why.slice(0,2).join(' '))+'</span><span><b>Suggested job:</b> '+esc(r.action.job)+'</span><span><b>Primary signal:</b> '+esc(r.action.metric)+'</span><small>You can intentionally make a video that does not address this focus. If you do, know why.</small></div></section>';
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
    return `In Ask Studio, return RAW channel analytics for ${JSON.stringify(c?.name||'this channel')} so Accelerator can compare channel health. Do not estimate, infer, coach, or calculate trends. If a metric is unavailable, use null and explain it in limitations.

Return TWO completed, non-overlapping 90-day periods when available: the latest completed 90-day period and the immediately preceding completed 90-day period. Keep metric definitions and filters consistent. Use exact reported values.

For each period request: views, engagedViews, registered impressions, CTR, watchTime hours, new viewers, casual viewers, regular viewers, returning viewers, and average views per viewer. Audience segments are for acquisition/loyalty diagnosis. Do not convert percentages into counts or counts into percentages. Use the value exactly as Studio reports it, or null if Ask Studio cannot provide it. qualifiedLeads must be null unless that value is genuinely available from a connected first-party business source.

Important:
- Engaged views must stay separate from public Views.
- Audience retention and first-30-second Intro are video-level metrics, not channel-period metrics.
- New/casual/regular/returning viewer data may update with delay. Do not guess.
- Ask Studio is a convenience extractor. If it cannot return an exact metric, leave it null so I can verify it in YouTube Analytics.
- Keep creatorId exactly ${JSON.stringify(c?.id||'')}.
- Return observations as an empty array. This request is channel health only.

Return ONLY this JSON shape:
${JSON.stringify({schemaVersion:1,creatorId:c?.id||'',channelName:'ACTUAL CHANNEL',observations:[],channelPeriods:[{start:'YYYY-MM-DD',end:'YYYY-MM-DD',source:'ACTUAL REPORT AND FILTERS',metricDefinitionId:'ACTUAL DEFINITION OR unknown',metrics:{views:null,engagedViews:null,impressions:null,ctr:null,watchTime:null,newViewers:null,casual:null,regular:null,returning:null,avgViewsPerViewer:null,qualifiedLeads:null}}],limitations:[]},null,2)}`;
  }

  function extendStudioImport(win){
    const I=win.AcceleratorStudioImport;if(!I||I.__adcExtended)return;I.__adcExtended=true;
    const priorPrompt=I.prompt,priorParse=I.parse;
    I.prompt=function(c,hours){
      let text=priorPrompt(c,hours);
      text=text.replace('Always request BOTH views and engagedViews as separate fields. Do not replace engaged views with views.',
        'Always request BOTH views and engagedViews as separate fields. Do not replace engaged views with views. Also request AVD, APV and first-30-second Intro retention when available. Retention can take time to process; if 0:30 is unavailable use null. APV is the WATCH fallback, and AVD is supporting depth context.');
      text=text.replace('Attribution outside Studio must be null.',
        'For separately collected 90-day channel reports, also request casual viewers, regular viewers and average views per viewer when Studio can provide them. Do not guess or derive missing audience fields. Attribution outside Studio must be null.');
      return text;
    };
    I.parse=function(text,c,prior,now){
      const parsed=priorParse(text,c,prior,now),raw=parseJsonBlock(text);
      if(!raw?.channelPeriods?.length||!parsed.periods?.length)return parsed;
      for(const p of parsed.periods){
        const src=raw.channelPeriods.find(x=>x&&x.start===p.start&&x.end===p.end);if(!src?.metrics)continue;
        for(const k of ['casual','regular','avgViewsPerViewer']){
          const v=src.metrics[k];
          if(v===null||v===undefined){p.metrics[k]=null;continue;}
          if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error('Invalid channel metric '+k);
          p.metrics[k]=v;
        }
      }
      return parsed;
    };
  }

  function openChannelPrompt(win,c){
    let d=win.document.getElementById('adc-channel-prompt-dialog');
    if(!d){d=win.document.createElement('dialog');d.id='adc-channel-prompt-dialog';d.className='adc-prompt-dialog';win.document.body.appendChild(d);}
    const text=channelPrompt(c);
    d.innerHTML='<h2>Copy channel health prompt</h2><p>This gathers the audience + channel trend data used by the overall read. If Ask Studio cannot return something exactly, it should leave it null.</p><textarea readonly id="adc-channel-prompt-text">'+esc(text)+'</textarea><div class="actions"><button class="btn dark" id="adc-copy-channel">Copy prompt</button><button class="btn" id="adc-close-channel">Close</button></div>';
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
      const c=current(),old=win.document.getElementById('studio-diagnosis-evidence');if(!c||!old)return;
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
    function injectChannelButton(){
      const c=current(),tools=win.document.querySelector('#studio-tools .actions');if(!c||!tools||tools.querySelector('[data-adc-channel-prompt]'))return;
      const b=win.document.createElement('button');b.className='btn';b.dataset.adcChannelPrompt='1';b.textContent='Copy channel health prompt';b.onclick=()=>openChannelPrompt(win,c);tools.appendChild(b);
    }
    let queued=false;
    const paint=()=>{if(queued)return;queued=true;win.requestAnimationFrame(()=>{queued=false;injectDiagnosis();injectVideoFocus();injectChannelButton();});};
    new MutationObserver(paint).observe(win.document.documentElement,{childList:true,subtree:true});
    win.document.addEventListener('click',e=>{if(e.target.closest?.('[data-cg="video-prep"],[data-action="v12-plan-step"],[data-cg="diagnosis"],[data-cg="plan90"]'))setTimeout(paint,0);});
    const style=win.document.createElement('style');style.id='adc-style';style.textContent=`
      .adc-kicker{font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;opacity:.65}
      .adc-overall{border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:16px;padding:20px;background:var(--card,#fff);display:grid;gap:16px}.adc-overall.focus{border-left-color:#366f7a}.adc-overall.warn{border-left-color:#b5822e}.adc-overall.great{border-left-color:#2f8464}
      .adc-overall-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,420px);gap:18px;align-items:start}.adc-overall h2{margin:5px 0 8px}.adc-overall p{margin:0;line-height:1.5}.adc-focus{padding:14px;border-radius:12px;background:rgba(75,104,110,.08);display:grid;gap:5px}.adc-focus span{font-size:10px;font-weight:900;letter-spacing:.08em}.adc-focus b{line-height:1.4}.adc-focus small{opacity:.7}
      .adc-baselines,.adc-audience,.adc-stages{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.adc-baseline-pill,.adc-audience-card,.adc-stage{border:1px solid var(--line,#d9e0e2);border-radius:11px;padding:12px;display:grid;gap:3px}.adc-stage span{font-size:10px;font-weight:900;letter-spacing:.07em}.adc-stage b{font-size:13px;line-height:1.35}.adc-stage small{opacity:.65;line-height:1.35}.adc-stage.weak{border-top:4px solid #b54b4b}.adc-stage.strong{border-top:4px solid #2f8464}.adc-stage.steady{border-top:4px solid #55757a}.adc-stage.unknown{opacity:.65}.adc-baseline-pill span,.adc-audience-card span{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.adc-baseline-pill b,.adc-audience-card b{font-size:19px}.adc-baseline-pill small,.adc-audience-card small{opacity:.65;line-height:1.35}.adc-baseline-pill.muted,.adc-audience-card.muted{opacity:.6}.adc-audience-card.bad{border-top:4px solid #b54b4b}.adc-audience-card.good{border-top:4px solid #2f8464}.adc-audience-card.normal{border-top:4px solid #55757a}.adc-audience-card strong{font-size:11px}
      .adc-subhead{display:flex;gap:10px;align-items:baseline;justify-content:space-between}.adc-subhead span{font-size:12px;opacity:.65}.adc-overall-foot{display:flex;gap:18px;justify-content:space-between;flex-wrap:wrap;font-size:12px}
      .adc-diagnosis{border-left:5px solid #55757a!important}.adc-diagnosis.focus{border-left-color:#366f7a!important}.adc-diagnosis.warn{border-left-color:#b5822e!important}.adc-diagnosis.great{border-left-color:#2f8464!important}.adc-decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.adc-decision-grid>div{border:1px solid var(--line,#ddd);border-radius:10px;padding:12px;display:grid;gap:4px}.adc-decision-grid span{font-size:10px;font-weight:800;text-transform:uppercase}.adc-decision-grid small{opacity:.65}
      .adc-video-focus{margin:0 0 14px;border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a;border-radius:12px;padding:14px;background:var(--card,#fff);display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,420px);gap:15px}.adc-video-focus.focus{border-left-color:#366f7a}.adc-video-focus.warn{border-left-color:#b5822e}.adc-video-focus.great{border-left-color:#2f8464}.adc-video-focus h3{margin:4px 0 5px}.adc-video-focus p{margin:0;line-height:1.45}.adc-video-meta{display:grid;gap:5px;font-size:12px}.adc-video-meta small{opacity:.65}
      .adc-prompt-dialog{width:min(820px,94vw);border:1px solid #bbc7c7;border-radius:12px;padding:20px;background:var(--panel,#fff);color:var(--text,#17212a)}.adc-prompt-dialog textarea{width:100%;height:360px;box-sizing:border-box;margin:10px 0}
      @media(max-width:900px){.adc-overall-head,.adc-video-focus{grid-template-columns:1fr}.adc-baselines,.adc-audience,.adc-stages{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.adc-baselines,.adc-audience,.adc-stages,.adc-decision-grid{grid-template-columns:1fr}.adc-subhead{display:grid}.adc-overall{padding:15px}}
    `;win.document.head.appendChild(style);
    paint();
  }

  return {snapshots,audienceRead,baselineTrajectory,deriveFocus,focusAction,overallRead,channelPrompt,parseJsonBlock,install};
});
