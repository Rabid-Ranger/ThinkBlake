(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){ root.AcceleratorAnalyticsClarity=api; if(root.document) api.install(root); }
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';

  const AGES={
    24:{label:'24h',name:'FIRST LOOK',purpose:'What is happening so far?',act:'It is too early for a big change. Just note anything that looks clearly off.'},
    48:{label:'48h',name:'EARLY CHECK',purpose:'Does anything look clearly off?',act:'Check obvious problems, but do not change the whole strategy yet.'},
    168:{label:'7d',name:'MAIN READ',purpose:'What happened compared with this creator’s usual result?',act:'Use this to decide what, if anything, should change on the next video.'},
    672:{label:'28d',name:'WHAT TO MAKE NEXT',purpose:'What did this video teach us?',act:'Use this to decide what to make next and what to repeat, change, or stop.'}
  };
  const STAGE={reach:'TOPIC / REACH',packaging:'PACKAGING',retention:'RETENTION'};
  const n=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtCount=v=>n(v)===null?'—':Math.round(n(v)).toLocaleString();
  const fmtRate=v=>n(v)===null?'—':(n(v)*100).toFixed(1)+'%';
  const fmtMultiple=v=>n(v)===null?'—':n(v).toFixed(2)+'×';
  const signedPp=v=>n(v)===null?'—':(n(v)>=0?'+':'')+n(v).toFixed(1)+' pp';
  const signedPctFromMultiple=v=>n(v)===null?'—':((n(v)-1)>=0?'+':'')+((n(v)-1)*100).toFixed(0)+'%';
  const stageLabel=stages=>stages.map(x=>STAGE[x]||x).join(' + ');

  function countSignal(x){
    const m=n(x?.multiple);
    if(m===null) return {tone:'muted',label:'Not enough data',detail:'No fair comparison yet',range:'Usual range: 0.70–1.30×'};
    const detail=fmtMultiple(m)+' normal · '+signedPctFromMultiple(m)+' vs normal';
    if(m<.7) return {tone:'bad',label:'Looks weak',detail,range:'Usual range: 0.70–1.30×'};
    if(m<1.3) return {tone:'normal',label:'Looks normal',detail,range:'Usual range: 0.70–1.30×'};
    if(m<1.7) return {tone:'good',label:'Above normal',detail,range:'1.30×+ is above usual'};
    if(m<2.5) return {tone:'great',label:'Strong',detail,range:'1.70×+ is a strong result'};
    return {tone:'great',label:'Big win',detail,range:'2.50×+ is a very strong result'};
  }
  function rateSignal(x,threshold){
    const d=n(x?.deltaPp),m=n(x?.multiple),detail=[m!==null?fmtMultiple(m)+' normal':null,d!==null?signedPp(d):null].filter(Boolean).join(' · ');
    if(d===null&&m===null) return {tone:'muted',label:'Not enough data',detail:'No fair comparison yet',range:'Compare it with what this creator usually gets'};
    if(d!==null&&d<-threshold) return {tone:'bad',label:'Looks weak',detail,range:'Usually okay within ±'+threshold+' pp'};
    if(d!==null&&d>threshold) return {tone:'good',label:'Strong',detail,range:'Usually okay within ±'+threshold+' pp'};
    return {tone:'normal',label:'Looks normal',detail,range:'Usually okay within ±'+threshold+' pp'};
  }
  function durationSignal(x){
    const m=n(x?.multiple),d=n(x?.deltaSeconds),detail=[m!==null?fmtMultiple(m)+' normal':null,d!==null?(d>=0?'+':'')+Math.round(d)+' sec':null].filter(Boolean).join(' · ');
    if(m===null&&d===null)return {tone:'muted',label:'Not enough data',detail:'No fair comparison yet',range:'Compare AVD with this creator’s normal'};
    if(m!==null&&m<.7)return {tone:'bad',label:'Looks weak',detail,range:'AVD is well below this creator’s normal'};
    if(m!==null&&m<.85)return {tone:'warn',label:'A little soft',detail,range:'AVD is below this creator’s normal'};
    if(m!==null&&m>1.15)return {tone:'good',label:'Strong',detail,range:'AVD is above this creator’s normal'};
    return {tone:'normal',label:'Looks normal',detail,range:'AVD is close to this creator’s normal'};
  }
  function metricRead(r){
    const c=r?.comparisons||{};
    const outcomeKey=c.engagedViews?.multiple!=null?'engagedViews':'views';
    const outcome=countSignal(c[outcomeKey]);
    const show=countSignal(c.impressions);
    const click=rateSignal(c.ctr,.5);
    let watchKey='retention30',watch=rateSignal(c.retention30,3);
    if(n(c.retention30?.deltaPp)===null && n(c.apv?.deltaPp)!==null){watchKey='apv';watch=rateSignal(c.apv,3);}
    else if(n(c.retention30?.deltaPp)===null && n(c.apv?.deltaPp)===null && (n(c.avdSeconds?.multiple)!==null||n(c.avdSeconds?.deltaSeconds)!==null)){watchKey='avdSeconds';watch=durationSignal(c.avdSeconds);}
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
  function sourceContextText(r){
    const c=r?.comparisons||{},items=[
      ['Browse',c.browsePct],['Suggested',c.suggestedPct],['Search',c.searchPct],['External',c.externalPct]
    ].map(([label,x])=>({label,delta:n(x?.deltaPp),current:n(x?.current),baseline:n(x?.baseline)}))
      .filter(x=>x.delta!==null&&x.current!==null&&x.baseline!==null)
      .sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
    if(!items.length)return '';
    const useful=items.filter(x=>Math.abs(x.delta)>=3).slice(0,3);
    if(!useful.length)return 'Traffic-source mix is close to this creator’s usual mix.';
    return 'Traffic mix vs usual: '+useful.map(x=>x.label+' '+(x.delta>=0?'+':'')+x.delta.toFixed(1)+' pp').join(' · ')+'.';
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
      if(hard.length>1){
        headline=(hours<168?'More than one stage may be weak: ':'More than one stage is weak: ')+bottleneck;
        explain='These are separate abnormal signals, not one proven cause. Start with the earliest weak stage in SHOW → CLICK → WATCH order, then use the later stage as supporting context.';
      }else{
        headline=(hours<168?'This may be the issue: ':'Main issue: ')+bottleneck;
        explain='This is the clearest weak part of the video compared with what this creator usually gets at the same point after publishing.';
      }
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
    const sourceContext=sourceContextText(r);
    let next=expansionContext
      ? 'First check where the views came from and whether YouTube showed the video to a broader audience. Lower CTR during wider distribution does not automatically mean the thumbnail is bad. Only test the title or thumbnail if CTR still looks clearly weak after that check.'
      : nextFor(all,winner);
    if(all.includes('retention')&&m.watchKey!=='retention30'){
      const watchName=m.watchKey==='apv'?'APV':'AVD',note=' Exact 0:30 is missing, so WATCH is being flagged from '+watchName+'. Treat that as a viewing-experience clue, not proof that the opening caused the problem.';
      if(all.length===1)next='Open the retention curve and pull the exact Intro / first-30-second value if available before deciding the opening is the problem.'+note;
      else next=next+note;
    }
    if(sourceContext&&(all.includes('packaging')||all.includes('reach')))next=sourceContext+' '+next;
    if(all.includes('retention')&&m.watchKey!=='retention30'){
      bottleneck=bottleneck.replace(/RETENTION/g,'WATCH / VIEWING EXPERIENCE');
      headline=headline.replace(/RETENTION/g,'WATCH / VIEWING EXPERIENCE');
    }
    return {tone,kind:'diagnosed',headline,bottleneck,explain,next,sourceContext,hardIssues:hard,softIssues:soft,winner,under,outcomeMultiple,metrics:m,age};
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
    const clone=x=>JSON.parse(JSON.stringify(x));
    function latestObservation(c,v,h){
      const id=v?.engineId||v?.id;
      return (c.analyticsFoundation?.observations||[]).filter(o=>o.videoId===id&&o.windowHours===h).sort((a,b)=>(a.revision||0)-(b.revision||0)).at(-1)||null;
    }
    function manualInput(id,label,value,step='any'){
      return '<label><span>'+esc(label)+'</span><input id="'+id+'" type="number" step="'+step+'" value="'+esc(value??'')+'" placeholder="optional"></label>';
    }
    function openManualEditor(){
      const c=current(),p=c&&W.prefs(c),v=c&&selectedVideo(c);if(!c||!p||!v)return;
      const o=latestObservation(c,v,p.hours);
      if(!o){
        if(v.native&&win.__acceleratorCoachGuide?.review){const map={24:'_24h',48:'_48h',168:'_7d',672:'_28d'};return win.__acceleratorCoachGuide.review(map[p.hours],v.id);}
        alert('No saved checkpoint exists for this video yet. Use Quick Check for a temporary read, or import the video first.');return;
      }
      let d=win.document.getElementById('ac-manual-dialog');
      if(!d){d=win.document.createElement('dialog');d.id='ac-manual-dialog';d.className='ac-manual-dialog';win.document.body.appendChild(d);}
      const pct=k=>o.metrics?.[k]==null?'':Number(o.metrics[k])*100;
      d.innerHTML='<h2>Edit '+esc(AGES[p.hours].label)+' checkpoint</h2><p><b>'+esc(v.title)+'</b></p><p>Use verified Studio values only. Blank means unavailable. This creates a revised checkpoint and keeps the earlier import history.</p><div class="ac-manual-grid">'+
        manualInput('acm-views','Views',o.metrics?.views)+manualInput('acm-engaged','Engaged views',o.metrics?.engagedViews)+manualInput('acm-impressions','Impressions',o.metrics?.impressions)+
        manualInput('acm-ctr','CTR %',pct('ctr'),'0.01')+manualInput('acm-ret30','0:30 / Intro %',pct('retention30'),'0.01')+manualInput('acm-apv','APV %',pct('apv'),'0.01')+manualInput('acm-avd','AVD seconds',o.metrics?.avdSeconds,'1')+
        manualInput('acm-browse','Browse %',pct('browsePct'),'0.01')+manualInput('acm-suggested','Suggested %',pct('suggestedPct'),'0.01')+manualInput('acm-search','Search %',pct('searchPct'),'0.01')+manualInput('acm-external','External %',pct('externalPct'),'0.01')+
      '</div><label class="ac-manual-source"><span>Source / report note</span><input id="acm-source" value="'+esc(o.source?.report||'YouTube Studio manual correction')+'"></label><div class="actions"><button class="btn dark" data-ac-manual-save>Save verified checkpoint</button><button class="btn" data-ac-manual-close>Cancel</button></div><p role="alert" class="ac-manual-error"></p>';
      if(!d.open)d.showModal();
    }
    function saveManualEditor(){
      const c=current(),p=c&&W.prefs(c),v=c&&selectedVideo(c),A=win.AcceleratorAnalytics,B=win.AcceleratorDeskBridge;if(!c||!p||!v||!A||!B?.commitAI)return;
      const o=latestObservation(c,v,p.hours),d=win.document.getElementById('ac-manual-dialog');if(!o||!d)return;
      const val=id=>{const raw=d.querySelector('#'+id)?.value?.trim();if(!raw)return null;const x=Number(raw);if(!Number.isFinite(x)||x<0)throw Error('Use non-negative numbers only.');return x;};
      const count=id=>{const x=val(id);if(x===null)return null;if(!Number.isInteger(x))throw Error('Views, Engaged views, and Impressions must be whole numbers.');return x;};
      const rate=(id,max100=true)=>{const x=val(id);if(x===null)return null;if(max100&&x>100)throw Error('That percentage must be between 0 and 100.');return x/100;};
      try{
        const metrics={...o.metrics,views:count('acm-views'),engagedViews:count('acm-engaged'),impressions:count('acm-impressions'),ctr:rate('acm-ctr'),retention30:rate('acm-ret30'),apv:rate('acm-apv',false),avdSeconds:val('acm-avd'),browsePct:rate('acm-browse'),suggestedPct:rate('acm-suggested'),searchPct:rate('acm-search'),externalPct:rate('acm-external')};
        const defs={...(o.metricDefinitions||{})};
        if(metrics.engagedViews!==null&&(!defs.engagedViews||/unknown|unverified/i.test(String(defs.engagedViews))))defs.engagedViews='youtube-studio-engaged-views-advanced-mode-v1';
        const sourceNote=d.querySelector('#acm-source')?.value?.trim()||'YouTube Studio manual correction';
        const input={...clone(o),metrics,metricDefinitions:defs,capturedAt:new Date().toISOString(),source:{kind:'manual',report:sourceNote}};
        delete input.acceptedAt;delete input.logicalKey;delete input.revision;delete input.revisionId;delete input.supersedesId;
        const nextStore=A.acceptObservation(c.analyticsFoundation||A.emptyStore(),input,new Date().toISOString());
        const next=win.AcceleratorLiveAnalytics?.apply?win.AcceleratorLiveAnalytics.apply(c,{next:nextStore,periods:[],audienceSnapshots:[]}):clone(c);
        next.analyticsFoundation=nextStore;
        const expected=win.AcceleratorAI?.revision?.(c);if(expected===undefined)throw Error('Save revision check is unavailable.');
        B.commitAI(next,expected,false);d.close();rerender();
      }catch(err){const box=d.querySelector('.ac-manual-error');if(box)box.textContent=err.message;else alert(err.message);}
    }
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
        const get=(row,k)=>n(row?.metrics?.[k]?.median),getN=(row,k)=>n(row?.metrics?.[k]?.n)||0;
        const metricKeys=['views','engagedViews','impressions','ctr','retention30','apv','avdSeconds','browsePct','suggestedPct','searchPct','externalPct'];
        return {label:b.label,sample:last.memberVideoIds?.length||0,first,last,
          values:Object.fromEntries(metricKeys.map(k=>[k,get(last,k)])),
          samples:Object.fromEntries(metricKeys.map(k=>[k,getN(last,k)])),
          firstValues:Object.fromEntries(metricKeys.map(k=>[k,get(first,k)])),
          firstSamples:Object.fromEntries(metricKeys.map(k=>[k,getN(first,k)]))};
      }
      const values=W.values(b.manual),hist=(c.coachOS?.baseline?.history||[]).filter(x=>x.id===b.id),first=W.values(hist[0]||b.manual),sample=n(b.manual?.n)||0;
      return {label:b.label,sample,values,samples:Object.fromEntries(Object.keys(values).map(k=>[k,n(values[k])===null?0:sample])),firstValues:first,firstSamples:Object.fromEntries(Object.keys(first).map(k=>[k,n(first[k])===null?0:sample])),first:hist[0]||b.manual,last:b.manual};
    }
    function baselineMetric(c,b,k){const rec=baselineRecord(c,b);return rec?.values?.[k]??null;}
    function baselineOutcome(rec){
      const k=n(rec?.values?.engagedViews)!==null?'engagedViews':n(rec?.values?.views)!==null?'views':n(rec?.values?.impressions)!==null?'impressions':null;
      const a=k?n(rec?.firstValues?.[k]):null,z=k?n(rec?.values?.[k]):null;
      const growth=a&&z!==null?z/a:null;
      return {key:k,current:z,first:a,growth};
    }
    function coverageStatus(sample,rawCount){
      if(sample>=10)return {tone:'good',label:'Ready',detail:sample+' comparable values'};
      if(sample>=5)return {tone:'normal',label:'Usable',detail:sample+' comparable values'};
      if(sample>0)return {tone:'warn',label:'Partial',detail:sample+' comparable values'};
      if(rawCount>=5)return {tone:'warn',label:'Collected, comparison blocked',detail:rawCount+' raw rows'};
      return {tone:'muted',label:'Missing',detail:rawCount?rawCount+' raw rows':'Not returned'};
    }
    function dataCoverageHtml(c,b,h){
      const rec=baselineRecord(c,b),obs=(c.analyticsFoundation?.observations||[]).filter(o=>o.windowHours===h);
      const rawN=k=>obs.filter(o=>n(o?.metrics?.[k])!==null).length,sample=k=>n(rec?.samples?.[k])||0;
      const checks=[['Impressions','impressions'],['CTR','ctr'],['0:30','retention30'],['APV','apv'],['AVD','avdSeconds'],['Views','views'],['Engaged views','engagedViews']];
      const ready=checks.filter(([,k])=>sample(k)>=5),partial=checks.filter(([,k])=>sample(k)>0&&sample(k)<5),missing=checks.filter(([,k])=>sample(k)===0);
      const sourceSample=Math.min(...['browsePct','suggestedPct','searchPct','externalPct'].map(sample));
      const instructions=[];
      if(sample('retention30')<5)instructions.push('<li><b>Exact 0:30 / Intro:</b> Studio → Content → open the video → Analytics → Engagement / Audience retention → Intro. Enter the exact percentage only if Studio reports it. Do not eyeball the curve.</li>');
      if(sample('engagedViews')<5)instructions.push('<li><b>Engaged views:</b> Studio → Analytics → Advanced Mode / SEE MORE → add Engaged views for the same lifespan. Never copy public Views into this field.</li>');
      if(sourceSample<5)instructions.push('<li><b>Per-video traffic source:</b> open the video → Analytics → Reach/Content → How viewers found this video. Use Browse / Suggested / Search / External for the same lifespan when Studio lets you isolate it.</li>');
      if(sample('views')<5&&rawN('views')>=5)instructions.push('<li><b>Views normal:</b> raw Views were collected, but one compatible Views definition was not verified across the cohort. Keep using Impressions / CTR / WATCH until a same-definition set is verified.</li>');
      const readyText=ready.length?ready.map(x=>x[0]).join(' · '):'No comparison metrics ready';
      const missingText=[...missing.map(x=>x[0]),sourceSample<5?'Traffic source':null].filter(Boolean).join(' · ');
      return '<details class="ac-data-compact"><summary><span><b>Data check</b> · '+esc(readyText)+'</span><small>'+(missingText?esc('Missing / blocked: '+missingText):'Core comparison data ready')+'</small></summary><div class="ac-data-compact-body">'+
        (partial.length?'<p><b>Limited sample:</b> '+esc(partial.map(x=>x[0]).join(' · '))+'.</p>':'')+
        (instructions.length?'<p><b>Fill these manually only if they matter for the decision:</b></p><ul>'+instructions.join('')+'</ul>':'<p>The main matched fields for this checkpoint are ready.</p>')+
        '<div class="actions"><button class="btn dark" data-ac-manual-edit>Edit this video\'s checkpoint</button><button class="btn" data-aw="baseline">Edit creator normal</button></div></div></details>';
    }
    function quickCompare(c,b,h,q){
      const rec=baselineRecord(c,b),comparisons={};
      const rateKeys=new Set(['ctr','retention30','apv','browsePct','suggestedPct','searchPct','externalPct']),sourceKeys=new Set(['browsePct','suggestedPct','searchPct','externalPct']);
      const current={
        views:n(q.views),engagedViews:n(q.engagedViews),impressions:n(q.impressions),
        ctr:n(q.ctr)===null?null:n(q.ctr)/100,retention30:n(q.retention30)===null?null:n(q.retention30)/100,apv:n(q.apv)===null?null:n(q.apv)/100,avdSeconds:n(q.avdSeconds),
        browsePct:n(q.browsePct)===null?null:n(q.browsePct)/100,suggestedPct:n(q.suggestedPct)===null?null:n(q.suggestedPct)/100,searchPct:n(q.searchPct)===null?null:n(q.searchPct)/100,externalPct:n(q.externalPct)===null?null:n(q.externalPct)/100
      };
      let comparableCount=0;
      for(const k of Object.keys(current)){
        const cur=current[k],base=n(rec?.values?.[k]),sample=n(rec?.samples?.[k])||0,ready=cur!==null&&base!==null&&sample>0;
        if(ready)comparableCount++;
        comparisons[k]={current:cur,baseline:base,n:sample,multiple:ready&&base>0&&!sourceKeys.has(k)?cur/base:null,relativeChangePct:ready&&base>0?100*(cur-base)/base:null,deltaPp:ready&&rateKeys.has(k)?(cur-base)*100:null,deltaSeconds:ready&&k==='avdSeconds'?cur-base:null,status:ready?'quick_check':'unavailable'};
      }
      return {status:rec&&comparableCount?'compared':'needs_evidence',comparisons,source:'Quick check · not saved',baselineName:rec?.label||'No matching baseline',message:!rec?'Choose a matching baseline first.':comparableCount?'Quick check against the selected creator normal. Nothing here is saved.':'Enter at least one metric that has a matching creator normal.'};
    }
    function quickInput(field,label,value,step='any'){
      return '<label><span>'+esc(label)+'</span><input type="number" step="'+esc(step)+'" data-ac-quick-field="'+esc(field)+'" value="'+esc(value??'')+'" placeholder="optional"></label>';
    }
    function diagnosisWhyHtml(r,d){
      const m=d.metrics,c=r?.comparisons||{},watchLabel=m.watchKey==='retention30'?'exact 0:30':m.watchKey==='apv'?'APV':'AVD';
      const evidence=['SHOW: '+(m.show.detail||'No fair impression comparison yet.'),'CLICK: '+(m.click.detail||'No fair CTR comparison yet.'),'WATCH ('+watchLabel+'): '+(m.watch.detail||'No fair WATCH comparison yet.')];
      const missing=[];
      if(n(c.retention30?.current)===null||n(c.retention30?.baseline)===null)missing.push('exact 0:30');
      if(!['browsePct','suggestedPct','searchPct','externalPct'].some(k=>n(c[k]?.current)!==null&&n(c[k]?.baseline)!==null))missing.push('traffic-source context');
      if(n(c.engagedViews?.current)===null||n(c.engagedViews?.baseline)===null)missing.push('Engaged views');
      let logic='No stage is clearly weak enough to justify inventing a fix.';
      if(d.hardIssues?.includes('reach'))logic='SHOW is clearly weak versus this creator’s normal. Topic / opportunity / distribution is the first place to investigate. This does not prove why impressions are low.';
      else if(d.hardIssues?.includes('packaging'))logic='SHOW is not the main break while CLICK is clearly weak. Packaging becomes a candidate after traffic-source / audience-expansion context is checked.';
      else if(d.hardIssues?.includes('retention'))logic=m.watchKey==='retention30'?'WATCH is clearly weak on exact 0:30. Inspect the opening and retention curve, but the number still does not prove the cause.':'WATCH is clearly weak based on '+watchLabel+'. Exact 0:30 is missing, so this is a viewing-experience clue, not proof that the opening is the cause.';
      else if(d.softIssues?.length)logic='A metric is soft, but the result/context does not justify a strategy change yet. Watch for repetition.';
      const change=d.hardIssues?.includes('reach')?'The call changes if comparable topic/source evidence looks healthy while CLICK or WATCH becomes the clearer repeated break.':d.hardIssues?.includes('packaging')?'The call weakens if CTR looks normal inside a comparable traffic source or wider distribution explains the drop.':d.hardIssues?.includes('retention')?'The call weakens if exact 0:30 / the retention curve is healthy and APV/AVD is explained by length or audience mix.':'A repeated abnormal stage across comparable videos would raise confidence.';
      return '<details class="ac-why-compact"><summary><b>Why this diagnosis?</b><span>'+esc(missing.length?'Confidence limited by '+missing.join(', '):'See the evidence behind the call')+'</span></summary><div class="ac-why-body"><p><b>Logic:</b> '+esc(logic)+'</p><ul>'+evidence.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p><b>What would change the call:</b> '+esc(change)+'</p></div></details>';
    }
    function quickCheckHtml(c,b,h){
      const p=W.prefs(c);if(!p.quickOpen)return '<button class="btn ac-quick-open" data-ac-quick-toggle>Quick check newest / custom video</button>';
      p.quick=p.quick||{};const q=p.quick,r=quickCompare(c,b,h,q),d=diagnose(r,h);
      return '<section class="ac-quick"><div class="ac-quick-head"><div><div class="ac-subsection-label">QUICK CHECK · NOT SAVED</div><h3>Compare a current video with the '+esc(AGES[h]?.label||h+'h')+' normal</h3><p>Type only what you have. This does not add the video to the creator.</p></div><button class="btn" data-ac-quick-toggle>Close</button></div>'+
        '<div class="ac-quick-fields ac-quick-primary">'+quickInput('impressions','Impressions',q.impressions)+quickInput('ctr','CTR %',q.ctr,'0.01')+quickInput('retention30','0:30 / Intro %',q.retention30,'0.01')+quickInput('apv','APV %',q.apv,'0.01')+quickInput('avdSeconds','AVD seconds',q.avdSeconds,'1')+quickInput('views','Views',q.views)+'</div>'+
        '<details class="ac-quick-advanced"><summary>Optional advanced fields</summary><div class="ac-quick-fields">'+quickInput('engagedViews','Engaged views',q.engagedViews)+quickInput('browsePct','Browse %',q.browsePct,'0.01')+quickInput('suggestedPct','Suggested %',q.suggestedPct,'0.01')+quickInput('searchPct','Search %',q.searchPct,'0.01')+quickInput('externalPct','External %',q.externalPct,'0.01')+'</div></details>'+
        '<div class="actions"><button class="btn dark" data-ac-quick-run>Run quick check</button><button class="btn" data-ac-quick-clear>Clear</button></div>'+
        (r.status==='compared'?'<div class="ac-subsection"><div class="ac-subsection-label">QUICK READ</div>'+metricsHtml(r,d)+'</div><div class="ac-next-inline '+d.tone+'"><div><span>WHAT TO DO NEXT</span><b>'+esc(d.bottleneck)+'</b></div><p>'+esc(d.next)+'</p></div>'+diagnosisWhyHtml(r,d):'<p class="ac-ready-note">'+esc(r.message||'Enter at least one comparable metric.')+'</p>')+
      '</section>';
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
    function viewCountsHtml(r){
      const c=r?.comparisons||{},v=c.views||{},e=c.engagedViews||{};
      const hasViews=n(v.current)!==null||n(v.baseline)!==null,hasEngaged=n(e.current)!==null||n(e.baseline)!==null;
      if(!hasViews&&!hasEngaged)return '';
      return '<div class="ac-view-counts"><div><span>Views · new count</span><b>'+fmtCount(v.current)+'</b><small>usual '+fmtCount(v.baseline)+'</small></div>'+
        '<div><span>Engaged views · old/original count</span><b>'+fmtCount(e.current)+'</b><small>'+(hasEngaged?'usual '+fmtCount(e.baseline):'Not available for this checkpoint')+'</small></div></div>';
    }
    function sourceMixHtml(r){
      const c=r?.comparisons||{},rows=[
        ['Browse',c.browsePct],['Suggested',c.suggestedPct],['Search',c.searchPct],['External',c.externalPct]
      ],has=rows.some(([,x])=>n(x?.current)!==null||n(x?.baseline)!==null);
      if(!has)return '';
      return '<div class="ac-source-mix"><div class="ac-subsection-label">WHERE THE VIEWS CAME FROM</div><div class="ac-source-grid">'+rows.map(([label,x])=>{
        const cur=n(x?.current),base=n(x?.baseline),delta=n(x?.deltaPp);
        return '<div><span>'+label+'</span><b>'+fmtRate(cur)+'</b><small>'+(base===null?'No usual source mix yet':'usual '+fmtRate(base)+(delta===null?'':' · '+(delta>=0?'+':'')+delta.toFixed(1)+' pp'))+'</small></div>';
      }).join('')+'</div><small class="ac-source-note">Use this as context for CTR. A different traffic-source mix can change click behavior even when the title and thumbnail did not get worse.</small></div>';
    }
    function metricsHtml(r,d){
      const c=r?.comparisons||{},m=d.metrics;
      const outcomeX=c[m.outcomeKey]||{};
      const watchX=c[m.watchKey]||{};
      const watchLabel=m.watchKey==='retention30'?'First 30 sec':m.watchKey==='apv'?'Average % viewed':'Average view duration',watchFormat=m.watchKey==='avdSeconds'?(v=>n(v)===null?'—':Math.round(n(v))+' sec'):fmtRate;
      return viewCountsHtml(r)+'<div class="ac-metrics">'+
        metricCard('OUTCOME',m.outcomeKey==='engagedViews'?'Engaged views':'Views',outcomeX,m.outcome,fmtCount)+
        metricCard('SHOW','Impressions',c.impressions||{},m.show,fmtCount)+
        metricCard('CLICK','CTR',c.ctr||{},m.click,fmtRate)+
        metricCard('WATCH',watchLabel,watchX,m.watch,watchFormat)+
      '</div>'+sourceMixHtml(r);
    }
    function normalCell(label,value,format=fmtCount,note=''){
      return '<div class="ac-normal-cell"><span>'+esc(label)+'</span><b>'+format(value)+'</b>'+(note?'<small>'+esc(note)+'</small>':'')+'</div>';
    }
    function allNormalsHtml(c,v){
      const cards=[24,48,168,672].map(h=>{
        const b=matchingBaseline(c,v,h),rec=baselineRecord(c,b);
        if(!rec)return '<div class="ac-normal-card muted"><div class="ac-normal-card-head"><span>'+AGES[h].label+'</span><b>No normal yet</b></div><p>Import or build at least five comparable '+AGES[h].label+' results.</p></div>';
        const viewNote=n(rec.values.engagedViews)!==null?'Both view-count methods available':'Engaged views not available yet';
        return '<div class="ac-normal-card"><div class="ac-normal-card-head"><span>'+AGES[h].label+'</span><b>'+esc(rec.sample)+' videos</b></div>'+
          '<div class="ac-normal-cells">'+
            normalCell('Views · new count',rec.values.views,fmtCount)+
            normalCell('Engaged views · old count',rec.values.engagedViews,fmtCount,viewNote)+
            normalCell('Impressions',rec.values.impressions,fmtCount)+
            normalCell('CTR',rec.values.ctr,fmtRate)+
            normalCell('First 30 sec',rec.values.retention30,fmtRate)+
            normalCell('APV',rec.values.apv,fmtRate)+
            normalCell('AVD',rec.values.avdSeconds,v=>n(v)===null?'—':Math.round(v)+' sec')+
          '</div>'+
          '<details><summary>Traffic-source normal</summary><div class="ac-normal-source">'+
            normalCell('Browse',rec.values.browsePct,fmtRate)+
            normalCell('Suggested',rec.values.suggestedPct,fmtRate)+
            normalCell('Search',rec.values.searchPct,fmtRate)+
            normalCell('External',rec.values.externalPct,fmtRate)+
          '</div></details>'+
        '</div>';
      }).join('');
      const ch=W.channel(c),cur=ch?.current||{},prior=ch?.starting||{},pctx=(label,k,rate=false)=>{
        const z=n(cur[k]),a=n(prior[k]),value=z===null?'—':rate?z.toFixed(1)+'%':Math.round(z).toLocaleString(),before=a===null?'No prior value':('prior '+(rate?a.toFixed(1)+'%':Math.round(a).toLocaleString()));
        return '<div class="ac-normal-cell"><span>'+label+'</span><b>'+value+'</b><small>'+before+'</small></div>';
      };
      const channelCard='<div class="ac-normal-channel"><div class="ac-normal-card-head"><span>90-day channel trend</span><b>'+(ch?.comparable?'Starting → latest':'Latest report')+'</b></div><p>This is not a per-video baseline. It shows whole-channel movement over matching 90-day periods.</p><div class="ac-normal-cells">'+
        pctx('Views · new count','views')+pctx('Engaged views · old count','engagedViews')+pctx('Impressions','impressions')+pctx('CTR','ctr',true)+
      '</div></div>';
      const aud=(c.coachOS?.analytics?.audienceSnapshots||[]).slice().sort((a,b)=>String(a.asOf||a.date||'').localeCompare(String(b.asOf||b.date||''))),az=aud.at(-1)||{},aa=aud.at(-2)||{};
      const ap=(label,k,decimals=0)=>{const z=n(az[k]),a=n(aa[k]),value=z===null?'—':decimals?z.toFixed(decimals):Math.round(z).toLocaleString(),change=a===null?'No prior 28-day snapshot':(a===0?'prior 0':((z/a-1)>=0?'+':'')+((z/a-1)*100).toFixed(0)+'% vs prior');return normalCell(label,z===null?null:z,decimals?(v=>n(v)===null?'—':n(v).toFixed(decimals)):fmtCount,change);};
      const audienceCard='<div class="ac-normal-channel"><div class="ac-normal-card-head"><span>28-day audience snapshot</span><b>'+(az.asOf||az.date||'Not saved yet')+'</b></div><p>Monthly audience is a rolling 28-day view. This is separate from the 90-day channel trend.</p><div class="ac-normal-cells">'+
        ap('Monthly audience','monthlyAudience')+ap('New viewers','newViewers')+ap('Casual','casual')+ap('Regular','regular')+ap('Returning','returning')+ap('Avg views / viewer','avgViewsPerViewer',2)+
      '</div></div>';
      return '<section class="ac-section ac-all-normals"><div class="ac-section-head"><div class="ac-section-index">03</div><div><div class="ac-kicker">YOUR NORMALS AT A GLANCE</div><h2>What does this creator usually get by each checkpoint?</h2><p>These are the current video baselines for the selected video’s format and era. Views is the new view count. Engaged views is the older/original view count when Studio can provide it.</p></div></div><div class="ac-section-body"><div class="ac-normal-grid">'+cards+'</div>'+channelCard+audienceCard+'<p class="ac-normal-note"><b>Different jobs:</b> 24h / 48h / 7d / 28d are per-video normals. 90-day is whole-channel movement. Monthly audience is a separate rolling 28-day snapshot.</p></div></section>';
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
      if(!reads.length)return '<section class="ac-section ac-recent-section"><div class="ac-section-head"><div class="ac-section-index">05</div><div><div class="ac-kicker">RECENT VIDEOS</div><h2>No fair video reads yet</h2><p>Add results at the same checkpoints and the list will fill itself in.</p></div></div></section>';
      return '<section class="ac-section ac-recent-section">'+
        '<div class="ac-section-head"><div class="ac-section-index">05</div><div><div class="ac-kicker">RECENT VIDEOS</div><h2>See the pattern without opening every video</h2><p>Latest usable checkpoint, score vs usual, and the main issue for each video.</p></div></div>'+
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
        '<div class="ac-section-body"><div class="ac-decision-callout"><span>WHAT I’D DO NEXT</span><b>'+esc(p.next)+'</b></div><small>One result is worth noticing. Two similar results are worth watching. Three or more may be a real pattern.</small></div>'+
      '</section>';
    }
    function videoSummary(c,full){
      const p=W.prefs(c),v=selectedVideo(c);if(!v)return full;
      const b=matchingBaseline(c,v,p.hours); if(b)p.baselineId=b.id;
      let r;try{r=W.compare(c,v,b,p.hours);}catch(e){r={status:'needs_evidence',comparisons:{},message:e.message};}
      const d=diagnose(r,p.hours),age=AGES[p.hours],baselineName=b?.label||'No usual result saved yet';
      const quickToggle='<button class="btn ac-quick-open" data-ac-quick-toggle>'+(p.quickOpen?'Close quick check':'Quick check newest / custom video')+'</button>';
      const quickPanel=p.quickOpen?quickCheckHtml(c,b,p.hours):'';
      const controls='<div class="ac-video-controls"><div class="ac-video-select-row"><label>Video<select id="ac-video">'+W.videos(c).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===v.id?'selected':'')+'>'+esc(x.title)+'</option>').join('')+'</select></label>'+quickToggle+'</div><div class="ac-age-grid">'+ageOverview(c,v)+'</div><p>Comparing this video with <b>'+esc(baselineName)+'</b> at the same point after publishing.</p>'+quickPanel+'</div>';
      const actions='<div class="actions ac-video-actions">'+(v.native&&!v.engineId?action('result','Update this video’s results'):action('import',v.engineId?'Update imported results':'Import results'))+action('baseline','Build / update baseline')+action('diagnosis','Use this in Diagnosis')+'</div>';
      return '<div class="ac-shell">'+
        '<section class="ac-section ac-video-section '+d.tone+'"><div class="ac-section-head ac-video-head"><div class="ac-section-index">02</div><div><div class="ac-kicker">THIS VIDEO READ · '+age.label+' · '+age.name+'</div><h2>'+esc(d.headline)+'</h2><p>'+esc(d.explain)+'</p></div><div class="ac-top-badge"><span>CURRENT CALL</span><b>'+esc(d.bottleneck)+'</b><small>'+esc(age.act)+'</small></div></div>'+
        '<div class="ac-section-body">'+controls+
          '<div class="ac-subsection"><div class="ac-subsection-label">HOW THE NUMBERS LOOK</div>'+metricsHtml(r,d)+'</div>'+
          '<div class="ac-next-inline '+d.tone+'"><div><span>WHAT TO DO NEXT</span><b>'+esc(d.bottleneck)+'</b></div><p>'+esc(d.next)+'</p></div>'+
          '<div class="ac-support-row">'+diagnosisWhyHtml(r,d)+dataCoverageHtml(c,b,p.hours)+'</div>'+
          actions+
        '</div></section>'+
        baselineHtml(c,v,p.hours,b)+patternHtml(c)+recentHtml(c)+
      '</div>';
    }
    function channelSummary(c,full){
      const d=W.channel(c),keys=[['engagedViews','Engaged views'],['views','Views'],['impressions','Impressions'],['ctr','CTR']];
      const comparable=d.comparable;
      return '<div class="ac-shell">'+
        '<section class="ac-section ac-channel-section '+(comparable?'normal':'warn')+'">'+
          '<div class="ac-section-head"><div class="ac-section-index">02</div><div><div class="ac-kicker">90-DAY CHANNEL TREND</div><h2>'+(comparable?'Is the whole channel moving?':'Need two verified 90-day reports')+'</h2><p>Use this to track whether the whole channel moved after several videos. Come back to individual video analytics to diagnose why.</p><button class="btn ac-channel-back" data-ac-mode="video">← Back to video analytics</button></div><div class="ac-top-badge"><span>STATUS</span><b>'+(comparable?'READY':'NOT ENOUGH DATA')+'</b><small>Video issues still come from comparing each video with what this creator usually gets at the same point after publishing.</small></div></div>'+
          '<div class="ac-section-body"><div class="ac-channel">'+keys.map(([k,l])=>{
            const a=n(d.starting?.[k]),z=n(d.current?.[k]);let change='Not comparable yet';
            const metricOk=typeof d.metricComparable==='function'?d.metricComparable(k):comparable;
            if(metricOk&&a!==null&&z!==null) change=k==='ctr'?((z-a)>=0?'+':'')+(z-a).toFixed(1)+' pp':a?((z/a-1)*100>=0?'+':'')+((z/a-1)*100).toFixed(1)+'%':'—';
            else if(comparable&&['views','engagedViews'].includes(k))change='Definition not verified';
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
      .ac-data-coverage{border:1px solid var(--line,#d9e0e2);border-radius:12px;padding:14px;display:grid;gap:10px}.ac-coverage-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.ac-coverage{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:9px;display:grid;gap:3px}.ac-coverage span{font-size:9px;font-weight:900;text-transform:uppercase}.ac-coverage b{font-size:12px}.ac-coverage small{font-size:10px;line-height:1.35;opacity:.7}.ac-coverage.good{border-top:3px solid #2f8464}.ac-coverage.warn{border-top:3px solid #b5822e}.ac-coverage.normal{border-top:3px solid #55757a}.ac-coverage.muted{opacity:.65}.ac-missing summary{cursor:pointer;display:flex;justify-content:space-between;gap:10px}.ac-missing summary span{font-size:11px;opacity:.7}.ac-missing li{margin:8px 0;line-height:1.45}.ac-ready-note{font-size:12px;color:var(--muted,#68757d)}
      .ac-why{border:1px solid var(--line,#d9e0e2);border-radius:12px;padding:14px;background:rgba(84,110,116,.035)}.ac-why p{margin:7px 0;line-height:1.45}.ac-why ul{margin:8px 0;padding-left:20px}.ac-why li{margin:5px 0}.ac-why-missing{color:#8a5d18}
      .ac-quick-open{justify-self:start}.ac-quick{border:1px dashed #55757a;border-radius:12px;padding:14px;display:grid;gap:12px}.ac-quick-head{display:flex;justify-content:space-between;gap:16px;align-items:start}.ac-quick-head h3{margin:3px 0 5px}.ac-quick-head p{margin:0;line-height:1.45}.ac-quick-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ac-quick-fields label{display:grid;gap:4px}.ac-quick-fields span{font-size:10px;font-weight:800}.ac-quick-fields input{width:100%;box-sizing:border-box}.ac-channel-back{margin-top:10px}
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
      .ac-view-counts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px}.ac-view-counts>div{border:1px solid var(--line,#d9e0e2);border-radius:10px;padding:10px;display:grid;gap:2px}.ac-view-counts span{font-size:9px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.ac-view-counts b{font-size:17px}.ac-view-counts small{font-size:10px;opacity:.68}.ac-source-mix{margin-top:12px;border:1px solid var(--line,#d9e0e2);border-radius:12px;padding:12px}.ac-source-grid,.ac-normal-source{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ac-source-grid>div,.ac-normal-cell{border:1px solid var(--line,#d9e0e2);border-radius:9px;padding:9px;display:grid;gap:2px}.ac-source-grid span,.ac-normal-cell span{font-size:9px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.ac-source-grid b,.ac-normal-cell b{font-size:15px}.ac-source-grid small,.ac-normal-cell small,.ac-source-note,.ac-normal-note{font-size:10px;line-height:1.4;opacity:.68}.ac-source-note{display:block;margin-top:8px}.ac-normal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ac-normal-card{border:1px solid var(--line,#d9e0e2);border-left:4px solid #55757a;border-radius:12px;padding:12px;display:grid;gap:10px}.ac-normal-channel{margin-top:12px;border:1px solid var(--line,#d9e0e2);border-left:4px solid #2f6873;border-radius:12px;padding:14px;display:grid;gap:10px}.ac-normal-channel>p{margin:0;font-size:12px;opacity:.72}.ac-normal-card.muted{opacity:.65}.ac-normal-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.ac-normal-card-head span{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.ac-normal-card-head b{font-size:12px}.ac-normal-cells{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.ac-normal-card details{margin:0}.ac-normal-card summary{cursor:pointer;font-size:11px;font-weight:800;margin-bottom:8px}
      .ac-decision-callout{border:1px solid var(--line,#d9e0e2);border-radius:12px;padding:14px;background:rgba(84,110,116,.035);display:grid;gap:4px}.ac-decision-callout span{font-size:9px;font-weight:900;letter-spacing:.09em}.ac-decision-callout b{line-height:1.45}
      .ac-badge{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800;background:rgba(84,110,116,.1)}.ac-badge.bad,.ac-row strong.bad{color:#a23d3d}.ac-badge.warn,.ac-row strong.warn{color:#956713}.ac-badge.great,.ac-row strong.great,.ac-badge.good,.ac-row strong.good{color:#237055}
      .ac-recent{display:grid}.ac-row{display:grid;grid-template-columns:minmax(0,1fr) 78px minmax(150px,auto);gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line,#d9e0e2)}.ac-row:last-child{border-bottom:0}.ac-row>div{display:grid;gap:3px}.ac-row small{color:var(--muted,#68757d)}.ac-row strong{text-align:right}
      .ac-full{padding:0}.ac-full>summary{cursor:pointer;display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:center;padding:16px 22px;list-style:none}.ac-full>summary::-webkit-details-marker{display:none}.ac-full>summary span:last-child{display:grid;gap:2px}.ac-full>summary small{font-weight:400;color:var(--muted,#68757d)}.ac-full-inner{padding:0 22px 20px;border-top:1px solid var(--line,#d9e0e2);margin-top:0}.ac-full-inner>.cg-native-section:first-child{margin-top:18px}
      .ac-diagnosis-evidence{border-left:5px solid #55757a!important}.ac-diagnosis-evidence.bad{border-left-color:#b54b4b!important}.ac-diagnosis-evidence.warn{border-left-color:#b5822e!important}.ac-mini-evidence p{padding:7px 0;border-bottom:1px solid var(--line,#ddd);margin:0}
      @media(max-width:900px){.ac-section-head{grid-template-columns:40px minmax(0,1fr)}.ac-section-head>.ac-top-badge,.ac-section-head>.ac-badge,.ac-section-head>.btn{grid-column:2}.ac-age-grid,.ac-metrics,.ac-baseline-grid,.ac-channel,.ac-normal-source,.ac-source-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ac-next-inline{grid-template-columns:1fr}}
      @media(max-width:560px){.ac-normal-grid,.ac-normal-source,.ac-source-grid,.ac-view-counts,.ac-coverage-grid,.ac-quick-fields{grid-template-columns:1fr}.ac-shell{gap:16px}.ac-section{border-radius:13px}.ac-section-head{grid-template-columns:32px minmax(0,1fr);padding:15px 14px;gap:10px}.ac-section-index{width:28px;height:28px;border-radius:8px}.ac-section-head h2{font-size:18px}.ac-section-body{padding:14px}.ac-age-grid,.ac-metrics,.ac-baseline-grid,.ac-channel{grid-template-columns:1fr}.ac-row{grid-template-columns:1fr auto}.ac-row .ac-badge{grid-column:1/-1}.ac-full>summary{grid-template-columns:32px 1fr;padding:14px}.ac-full-inner{padding:0 14px 14px}}
      .ac-support-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ac-data-compact,.ac-why-compact{border:1px solid var(--line,#d9e0e2);border-radius:10px;background:var(--card,#fff)}.ac-data-compact summary,.ac-why-compact summary{cursor:pointer;padding:11px 12px;display:grid;gap:3px}.ac-data-compact summary span,.ac-why-compact summary b{font-size:12px}.ac-data-compact summary small,.ac-why-compact summary span{font-size:10px;color:var(--muted,#68757d)}.ac-data-compact-body,.ac-why-body{padding:0 12px 12px}.ac-data-compact-body p,.ac-why-body p{margin:7px 0;line-height:1.4}.ac-data-compact-body li,.ac-why-body li{margin:6px 0}.ac-video-select-row{display:flex;gap:10px;align-items:end}.ac-video-select-row label{flex:1}.ac-video-select-row .ac-quick-open{white-space:nowrap}.ac-quick-primary{grid-template-columns:repeat(3,minmax(0,1fr))}.ac-quick-advanced summary{cursor:pointer;font-weight:800;font-size:11px}.ac-baseline-section{opacity:.94}
      @media(max-width:760px){.ac-support-row{grid-template-columns:1fr}.ac-video-select-row{display:grid}.ac-quick-primary{grid-template-columns:1fr 1fr}}

      .ac-manual-dialog{width:min(850px,94vw);max-height:90vh;overflow:auto;border:1px solid var(--line,#bbc7c7);border-radius:14px;padding:20px;background:var(--card,#fff);color:inherit}.ac-manual-dialog h2{margin-top:0}.ac-manual-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:14px 0}.ac-manual-grid label,.ac-manual-source{display:grid;gap:4px}.ac-manual-grid span,.ac-manual-source span{font-size:10px;font-weight:800}.ac-manual-source{margin:10px 0}.ac-manual-error{color:#a23d3d;font-size:12px}@media(max-width:650px){.ac-manual-grid{grid-template-columns:1fr 1fr}}

`
    win.document.head.appendChild(style);

    win.document.addEventListener('change',ev=>{
      if(ev.target?.id!=='ac-video')return;
      const c=current();if(!c)return;
      const p=W.prefs(c);p.videoId=ev.target.value;p.baselineId='';rerender();
    });
    win.document.addEventListener('input',ev=>{
      const field=ev.target?.dataset?.acQuickField;if(!field)return;
      const c=current();if(!c)return;const p=W.prefs(c);p.quick=p.quick||{};p.quick[field]=ev.target.value;
    });
    win.document.addEventListener('click',ev=>{
      if(ev.target.closest?.('[data-ac-manual-edit]')){openManualEditor();return;}
      if(ev.target.closest?.('[data-ac-manual-close]')){win.document.getElementById('ac-manual-dialog')?.close();return;}
      if(ev.target.closest?.('[data-ac-manual-save]')){saveManualEditor();return;}
      const quick=ev.target.closest?.('[data-ac-quick-toggle],[data-ac-quick-run],[data-ac-quick-clear]');
      if(quick){
        const c=current();if(!c)return;const p=W.prefs(c);
        if(quick.hasAttribute('data-ac-quick-toggle'))p.quickOpen=!p.quickOpen;
        if(quick.hasAttribute('data-ac-quick-clear'))p.quick={};
        rerender();return;
      }
      const el=ev.target.closest?.('[data-ac-window],[data-ac-mode]');if(!el)return;
      const c=current();if(!c)return;const p=W.prefs(c);
      if(el.dataset.acWindow){p.hours=Number(el.dataset.acWindow);p.baselineId='';}
      if(el.dataset.acMode)p.mode=el.dataset.acMode;
      rerender();
    });
    if(win.AcceleratorDeskBridge?.analyticsActive?.()) rerender();
  }

  return {countSignal,rateSignal,durationSignal,metricRead,diagnose,patternFromDiagnoses,install};
});
