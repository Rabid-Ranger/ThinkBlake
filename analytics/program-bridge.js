(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.AcceleratorAnalyticsProgramBridge=api;if(root.document)api.install(root);}
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const n=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=v=>{if(!v)return 'not recorded';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):String(v);};

  function latestEngineBaseline(c,policyId){
    return (c?.analyticsFoundation?.baselines||[]).filter(x=>x.policyId===policyId&&x.kind==='operating').slice().sort((a,b)=>String(a.builtAt||'').localeCompare(String(b.builtAt||''))).at(-1)||null;
  }
  function baselineRead(c,W,hours=168){
    const rows=W?.baselines?W.baselines(c,hours):[],reads=[];
    for(const b of rows||[]){
      if(b.engine){const x=latestEngineBaseline(c,b.id);if(x)reads.push({id:b.id,label:b.label,n:x.memberVideoIds?.length||x.metrics?.views?.n||x.metrics?.engagedViews?.n||0,builtAt:x.builtAt,engine:true});}
      else if(b.manual)reads.push({id:b.id,label:b.label,n:n(b.manual.n)||0,builtAt:b.manual.refreshedAt||b.manual.savedAt||'',engine:false});
    }
    reads.sort((a,b)=>(b.n-a.n)||String(b.builtAt).localeCompare(String(a.builtAt)));
    const best=reads[0]||null,sample=best?.n||0;
    return {rows,best,n:sample,level:sample>=10?'Established':sample>=5?'Usable':sample>0?'Provisional':'Missing'};
  }
  function refreshRead(c,hours=168){
    const policies=(c?.analyticsFoundation?.policies||[]).filter(x=>x.windowHours===hours),ids=new Set(policies.map(x=>x.id));
    const pending=(c?.analyticsFoundation?.events||[]).filter(x=>x.kind==='eligible_video'&&ids.has(x.policyId)&&!x.countedAt&&x.active!==false).length;
    const target=policies.length?Math.min(...policies.map(x=>Number(x.refreshAfter)||4)):4;
    return {pending,target,due:policies.length>0&&pending>=target,managed:policies.length>0};
  }
  function resultRead(current){
    const vals={qualifiedLeads:n(current?.qualifiedLeads),bookings:n(current?.bookings),sales:n(current?.sales),revenue:n(current?.revenue)};
    return {values:vals,available:Object.values(vals).some(v=>v!==null)};
  }
  function programRead(c,W,ADC,WF,guide){
    let proposal=null,overall=null,pattern=null,channel=null;
    try{proposal=WF?.proposal?WF.proposal(c,W,ADC):null;}catch(_){}
    try{overall=ADC?.overallRead?ADC.overallRead(c,W,guide):null;}catch(_){}
    try{pattern=W?.clarityPattern?W.clarityPattern(c):null;}catch(_){}
    try{channel=W?.channel?W.channel(c):null;}catch(_){}
    const baseline=baselineRead(c,W,168),refresh=refreshRead(c,168);
    const audienceRows=(c?.coachOS?.analytics?.audienceSnapshots||[]).slice().sort((a,b)=>String(a.asOf||a.date||'').localeCompare(String(b.asOf||b.date||'')));
    const result=resultRead(channel?.current||{});
    const focus=overall?.focus||proposal?.leading||'Not enough evidence yet';
    const job=proposal?.jobFocus||overall?.action?.job||'Decide from the diagnosis';
    const metric=overall?.action?.metric||'7-day creator-relative result';
    const next=proposal?.next||overall?.action?.video||'Collect the missing evidence before changing the plan.';
    const confidence=proposal?.confidence||overall?.confidence||'Low';
    const why=proposal?.because||overall?.why?.slice?.(0,2).join(' ')||'Use the recent same-age comparisons and channel context below.';
    const checks=[];
    if(baseline.n<5)checks.push('Build a usable 7-day normal before making strong calls.');
    else if(refresh.due)checks.push('Refresh the 7-day operating normal now: '+refresh.pending+' new eligible videos are waiting.');
    else if(refresh.managed)checks.push('7-day normal auto-refresh progress: '+refresh.pending+' / '+refresh.target+' new eligible videos.');
    if((pattern?.n||0)<2)checks.push('Get at least two fair 7-day reads before treating a problem as a repeating pattern.');
    if(!channel?.comparable)checks.push('Add a second comparable 90-day channel report to measure program-level movement.');
    if(audienceRows.length<2)checks.push('Add another 28-day audience snapshot to track RETURN over time.');
    if(!result.available)checks.push('RESULT is not connected yet. Add leads, bookings, sales, or revenue when that creator has a business goal.');
    if(!checks.length)checks.push('Tracking is healthy. Re-evaluate the focus after the next 4-video / 30-day checkpoint.');
    return {proposal,overall,pattern,channel,baseline,refresh,audienceRows,result,focus,job,metric,next,confidence,why,checks};
  }
  function status(label,value,sub,tone='normal'){
    return '<div class="apb-status '+tone+'"><span>'+esc(label)+'</span><b>'+esc(value)+'</b><small>'+esc(sub)+'</small></div>';
  }
  function render(c,W,ADC,WF,guide){
    const r=programRead(c,W,ADC,WF,guide),patternN=r.pattern?.n||0,repeatN=r.pattern?.max||0;
    const baseTone=r.baseline.n>=10?'good':r.baseline.n>=5?'normal':r.baseline.n>0?'warn':'bad';
    const patternTone=repeatN>=3?'warn':patternN>=2?'normal':'muted';
    const channelTone=r.channel?.comparable?'good':'warn';
    const audienceTone=r.audienceRows.length>=2?'good':r.audienceRows.length?'normal':'warn';
    const resultTone=r.result.available?'good':'muted';
    const latestAudience=r.audienceRows.at(-1);
    const last90=r.channel?.current;
    return '<section class="cg-native-section apb-shell" id="analytics-program-bridge">'+
      '<div class="apb-head"><div><div class="cg-kicker">USE THIS IN THE COACHING PROGRAM</div><h2>Evidence → Diagnosis → Plan → Track</h2><p>Analytics should tell you what deserves attention, feed the diagnosis, shape the next video job, and give you a scoreboard for the next checkpoint. It should not create a strategy by itself.</p></div><div class="apb-confidence"><span>CURRENT CONFIDENCE</span><b>'+esc(r.confidence)+'</b><small>'+esc(patternN)+' recent fair 7-day read'+(patternN===1?'':'s')+'</small></div></div>'+
      '<div class="apb-flow">'+
        '<div class="apb-step"><span>1 · DIAGNOSE</span><h3>'+esc(r.focus)+'</h3><p>'+esc(r.why)+'</p><small>Use Reach → Packaging → Retention → Return → Result to locate the layer. Do not force a bottleneck when the system looks healthy.</small></div>'+
        '<div class="apb-step"><span>2 · PROGRAM</span><h3>'+esc(r.job)+'</h3><p>'+esc(r.next)+'</p><small><b>Primary measure:</b> '+esc(r.metric)+'. The job tells you what the next video is supposed to do, not just what topic to make.</small></div>'+
        '<div class="apb-step"><span>3 · TRACK</span><h3>Is the focus actually improving?</h3><p>Track the creator against their own normal, then zoom out to 90-day channel health, audience return, and business result.</p><small>Starting normal tells you progress since coaching began. Current normal tells you what “normal now” looks like.</small></div>'+
        '<div class="apb-step"><span>4 · RE-EVALUATE</span><h3>4 videos / ~30 days</h3><p>Ask whether the same bottleneck repeated, whether the normal moved, and whether the next program focus should stay or change.</p><small>One weird video is a lesson. A repeated pattern becomes a programming decision.</small></div>'+
      '</div>'+
      '<div class="apb-track">'+
        status('7-day creator normal',r.baseline.n?('n='+r.baseline.n+' · '+r.baseline.level):'Missing',r.refresh.managed?(r.refresh.due?'Refresh due now':r.refresh.pending+' / '+r.refresh.target+' toward auto-refresh'):'Manual baseline',baseTone)+
        status('Repeated pattern',patternN?(repeatN+' of '+patternN+' recent videos'):'Not enough reads',repeatN>=2?'Same issue is repeating':'Do not force a pattern yet',patternTone)+
        status('90-day channel progress',r.channel?.comparable?'Comparable':'Needs another report',last90?.date?('Latest: '+fmtDate(last90.date)):'Starting/latest periods required',channelTone)+
        status('28-day audience',r.audienceRows.length>=2?'Trend ready':r.audienceRows.length?'Current only':'Missing',latestAudience?('Latest: '+fmtDate(latestAudience.asOf||latestAudience.date)):'Track New / Casual / Regular / Returning',audienceTone)+
        status('RESULT',r.result.available?'Connected':'Not connected',r.result.available?'Business outcome data is available':'Add leads / bookings / sales / revenue when relevant',resultTone)+
      '</div>'+
      '<div class="apb-check"><div><span>NEXT CHECKPOINT QUESTIONS</span>'+r.checks.map(x=>'<p>• '+esc(x)+'</p>').join('')+'</div><div class="apb-actions"><button class="btn dark" data-apb="diagnosis">Open Diagnosis</button><button class="btn" data-apb="channel">View 90-day tracking</button><button class="btn" data-apb="copy">Copy coaching read</button></div></div>'+
    '</section>';
  }
  function summary(c,W,ADC,WF,guide){
    const r=programRead(c,W,ADC,WF,guide);
    return ['COACHING ANALYTICS READ','Focus: '+r.focus,'Confidence: '+r.confidence,'Why: '+r.why,'Program job: '+r.job,'Next move: '+r.next,'Measure: '+r.metric,'7-day normal: '+(r.baseline.n?'n='+r.baseline.n+' '+r.baseline.level:'missing'),'Recent pattern: '+(r.pattern?.max||0)+' of '+(r.pattern?.n||0)+' videos','90-day tracking: '+(r.channel?.comparable?'ready':'needs another comparable report'),'Audience trend: '+(r.audienceRows.length>=2?'ready':'needs another 28-day snapshot'),'RESULT: '+(r.result.available?'connected':'not connected')].join('\n');
  }
  function phaseLabels(html){
    let out=String(html||'');
    const replacements=[
      ['>24 hours<','>24h · Launch<'],
      ['>48 hours<','>48h · Triage<'],
      ['>7 days<','>7d · Diagnosis<'],
      ['>28 days · optional<','>28d · Programming<'],
      ['Build a 24 hours baseline','Build a 24h Launch baseline'],
      ['Build a 48 hours baseline','Build a 48h Triage baseline'],
      ['Build a 7 days baseline','Build a 7d Diagnosis baseline'],
      ['Build a 28 days baseline','Build a 28d Programming baseline'],
      ['28-day follow-up','28-day Programming read'],
      ['48-hour check','48-hour Triage'],
      ['7-day main read','7-day Diagnosis read'],
      ['24-hour launch','24-hour Launch']
    ];
    for(const [a,b] of replacements)out=out.split(a).join(b);
    return out;
  }
  function install(win){
    if(win.__acceleratorAnalyticsProgramBridgeV1)return;win.__acceleratorAnalyticsProgramBridgeV1=true;
    const W=win.AcceleratorAnalyticsWorkspace,ADC=win.AcceleratorDecisionContext,WF=win.AcceleratorWorkflowAnalytics,guide=win.__acceleratorCoachGuide;
    if(!W)return;
    if(!W.__programPhaseLabelsV1&&typeof W.body==='function'){
      W.__programPhaseLabelsV1=true;
      const priorBody=W.body.bind(W);
      W.body=function(c){return phaseLabels(priorBody(c));};
    }
    let queued=false;
    const paint=()=>{if(queued)return;queued=true;win.requestAnimationFrame(()=>{queued=false;const host=win.document.querySelector('main .cg-native-analytics');const c=win.AcceleratorDeskBridge?.current?.();if(!host||!c)return;const html=render(c,W,ADC,WF,guide);let old=host.querySelector('#analytics-program-bridge');if(!old){const t=win.document.createElement('template');t.innerHTML=html;const node=t.content.firstElementChild;const studio=host.querySelector('#studio-tools');studio?studio.after(node):(host.querySelector('.cg-native-hero')||host.firstElementChild)?.after(node);}else if(old.dataset.sig!==html){const t=win.document.createElement('template');t.innerHTML=html;const node=t.content.firstElementChild;node.dataset.sig=html;old.replaceWith(node);}});};
    win.document.addEventListener('click',async e=>{const a=e.target.closest?.('[data-apb]');if(!a)return;const c=win.AcceleratorDeskBridge?.current?.();if(!c)return;if(a.dataset.apb==='diagnosis'){const existing=win.document.querySelector('[data-aw="diagnosis"],[data-action="v11-open-diagnosis"]');if(existing){existing.click();return;}}if(a.dataset.apb==='channel'){const existing=win.document.querySelector('[data-ac-mode="channel"],[data-aw="mode"][data-mode="channel"]');if(existing){existing.click();return;}}if(a.dataset.apb==='copy'){const text=summary(c,W,ADC,WF,guide);try{await win.navigator.clipboard.writeText(text);a.textContent='Copied';setTimeout(()=>a.textContent='Copy coaching read',1200);}catch(_){a.textContent='Copy failed';setTimeout(()=>a.textContent='Copy coaching read',1200);}}});
    new MutationObserver(paint).observe(win.document.documentElement,{childList:true,subtree:true});
    const style=win.document.createElement('style');style.id='apb-style';style.textContent=`
      .apb-shell{border:1px solid var(--line,#d9e0e2);border-left:5px solid #55757a}.apb-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,300px);gap:16px;align-items:start}.apb-head h2{margin:4px 0 7px}.apb-head p{margin:0;line-height:1.5}.apb-confidence{border:1px solid var(--line,#d9e0e2);border-radius:10px;padding:12px;display:grid;gap:4px}.apb-confidence span,.apb-step>span,.apb-status>span,.apb-check>div>span{font-size:9px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.apb-confidence b{font-size:20px}.apb-confidence small,.apb-step small,.apb-status small{opacity:.7;line-height:1.4}.apb-flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.apb-step{border:1px solid var(--line,#d9e0e2);border-radius:10px;padding:13px;display:grid;align-content:start;gap:7px}.apb-step h3{margin:0;font-size:16px}.apb-step p{margin:0;line-height:1.4}.apb-track{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:12px 0}.apb-status{border:1px solid var(--line,#d9e0e2);border-top:4px solid #718087;border-radius:9px;padding:10px;display:grid;gap:4px}.apb-status.good{border-top-color:#2f8464}.apb-status.warn{border-top-color:#b5822e}.apb-status.bad{border-top-color:#b54b4b}.apb-status.muted{opacity:.68}.apb-status b{font-size:15px}.apb-check{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;border-top:1px solid var(--line,#d9e0e2);padding-top:14px}.apb-check p{margin:6px 0;line-height:1.4}.apb-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;align-content:start}.apb-actions .dark{background:#19282d;color:#fff}@media(max-width:1000px){.apb-flow{grid-template-columns:repeat(2,minmax(0,1fr))}.apb-track{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.apb-head,.apb-check{grid-template-columns:1fr}.apb-flow,.apb-track{grid-template-columns:1fr}.apb-actions{justify-content:flex-start}.apb-actions .btn{flex:1 1 auto}}
    `;win.document.head.appendChild(style);paint();
  }
  return {baselineRead,refreshRead,resultRead,programRead,render,summary,phaseLabels,install};
});