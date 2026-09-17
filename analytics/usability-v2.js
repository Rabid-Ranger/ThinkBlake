(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.AcceleratorAnalyticsUsabilityV2=api;if(root.document)api.install(root);}
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PHASES={
    24:{short:'24h · Launch',question:'Is anything obviously broken?',decision:'Usually no strategy change. Note a severe SHOW / CLICK / WATCH problem and keep collecting data.'},
    48:{short:'48h · Triage',question:'Did the early signal persist?',decision:'Decide what deserves investigation. Still do not make a channel-wide strategy call from this alone.'},
    168:{short:'7d · Diagnosis',question:'What actually over- or under-performed vs this creator’s normal?',decision:'Main decision point. Name a real bottleneck, or explicitly decide there is no fix needed.'},
    672:{short:'28d · Programming',question:'What did the full run teach us?',decision:'Decide what to repeat, change, stop, and what job the next video should do.'},
    2160:{short:'90d · Channel health',question:'Is the channel moving after several videos?',decision:'Track whether the floor, audience, library contribution, and business result are improving over time.'}
  };

  function promptAppendix(kind='video'){
    if(kind==='channel')return `\n\nSOURCE-MIX QA — IMPORTANT\nTreat traffic-source retrieval as a required part of this request, not an optional nice-to-have. For each 90-day period, actively check the actual Traffic source report and return Browse, Suggested, Search, and External percentages when Studio can retrieve them. Do not copy a source mix from a different date range. If Studio cannot isolate the exact period, leave the affected fields null and state that limitation. Keep sourceNote factual and include the actual report/filter used.`;
    return `\n\nPER-VIDEO TRAFFIC-SOURCE QA — IMPORTANT\nFor every returned video/checkpoint row, actively check How viewers found this video / Traffic source for that SAME exact first-life window. Return Browse, Suggested, Search, and External percentages for the individual video when Studio can retrieve them. Do not substitute the channel-wide traffic mix, a lifetime source mix, or a different date range. Do not skip traffic-source fields just because retention30 or Engaged views is unavailable. If Ask Studio cannot isolate the exact per-video source mix for that checkpoint, set those source fields to null and explain that specific limitation.`;
  }

  function phaseLabels(html){
    let out=String(html||'');
    const replacements=[
      ['>24 hours<','>24h · Launch<'],['>48 hours<','>48h · Triage<'],['>7 days<','>7d · Diagnosis<'],['>28 days · optional<','>28d · Programming<'],['>28 days<','>28d · Programming<'],
      ['Build a 24 hours baseline','Build a 24h Launch baseline'],['Build a 48 hours baseline','Build a 48h Triage baseline'],['Build a 7 days baseline','Build a 7d Diagnosis baseline'],['Build a 28 days baseline','Build a 28d Programming baseline']
    ];
    for(const [a,b] of replacements)out=out.split(a).join(b);
    return out;
  }

  function install(win){
    if(win.__acceleratorAnalyticsUsabilityV2)return;
    win.__acceleratorAnalyticsUsabilityV2=true;
    const W=win.AcceleratorAnalyticsWorkspace,guide=win.__acceleratorCoachGuide;
    if(!W)return;

    if(!W.__usabilityPhaseLabelsV2&&typeof W.body==='function'){
      W.__usabilityPhaseLabelsV2=true;
      const prior=W.body.bind(W);
      W.body=c=>phaseLabels(prior(c));
    }

    const I=win.AcceleratorStudioImport;
    if(I&&!I.__sourceQaV2&&typeof I.prompt==='function'){
      I.__sourceQaV2=true;
      const prior=I.prompt.bind(I);
      I.prompt=(c,h)=>prior(c,h)+promptAppendix('video');
    }
    const ADC=win.AcceleratorDecisionContext;
    if(ADC&&!ADC.__sourceQaV2){
      ADC.__sourceQaV2=true;
      if(typeof ADC.masterPrompt==='function'){
        const prior=ADC.masterPrompt.bind(ADC);
        ADC.masterPrompt=c=>prior(c)+promptAppendix('video')+promptAppendix('channel');
      }
      if(typeof ADC.channelPrompt==='function'){
        const prior=ADC.channelPrompt.bind(ADC);
        ADC.channelPrompt=c=>prior(c)+promptAppendix('channel');
      }
    }

    function current(){try{return win.AcceleratorDeskBridge?.current?.()||null}catch(_){return null}}
    function render(){try{guide?.analyticsPage?.()}catch(_){}}

    function mergeStudioActions(host){
      const tools=host.querySelector('#studio-tools');if(!tools)return;
      const rows=[...tools.querySelectorAll(':scope > .actions')];
      if(rows.length>=2){
        const first=rows[0];first.classList.add('au-studio-actions');
        for(let i=1;i<rows.length;i++){
          [...rows[i].children].forEach(x=>first.appendChild(x));
          rows[i].remove();
        }
      }else rows[0]?.classList.add('au-studio-actions');
      if(!tools.querySelector('.au-source-note')){
        const note=win.document.createElement('p');note.className='cg-note au-source-note';
        note.innerHTML='<b>Traffic source:</b> the prompts now explicitly request per-video Browse / Suggested / Search / External at the same checkpoint. If Ask Studio cannot isolate an exact source mix, null is better than a guessed number.';
        tools.appendChild(note);
      }
    }

    function rewriteFlow(host){
      const flow=host.querySelector('.ar-flow');if(!flow)return;
      const head=flow.querySelector('.ar-flow-head');
      if(head){
        const h2=head.querySelector('h2');if(h2)h2.textContent='When to check, and what decision you can make';
        const small=head.querySelector(':scope > small');if(small)small.textContent='You are not making the same kind of decision at every checkpoint. 7 days is the main video diagnosis.';
        const kicker=head.querySelector('.ar-kicker');if(kicker)kicker.textContent='CHECKPOINT GUIDE';
      }
      const steps=[...flow.querySelectorAll('.ar-flow-step')];
      [24,48,168,672,2160].forEach((h,i)=>{
        const el=steps[i],p=PHASES[h];if(!el||!p)return;
        el.innerHTML='<span>'+esc(p.short)+'</span><b>'+esc(p.question)+'</b><small><strong>Decision:</strong> '+esc(p.decision)+'</small>';
        el.classList.toggle('primary',h===168);
      });
      const tools=host.querySelector('#studio-tools');
      if(tools&&flow.previousElementSibling!==tools)tools.after(flow);
    }

    function compactBaselineDetails(host){
      const selected=host.querySelector('.ac-baseline-section');
      if(selected&&!selected.dataset.auCompact){
        const title=selected.querySelector('h2')?.textContent||'';
        if(!/^No usual/i.test(title)){
          selected.dataset.auCompact='1';
          const details=win.document.createElement('details');details.className='au-selected-baseline';
          const summary=win.document.createElement('summary');summary.innerHTML='<b>Detailed selected baseline</b><span>Open only when you need source, sample, or baseline-history detail.</span>';
          details.appendChild(summary);
          [...selected.childNodes].forEach(n=>details.appendChild(n));
          selected.appendChild(details);
        }
      }
      [...host.querySelectorAll('.cg-native-section')].forEach(section=>{
        const h=section.querySelector(':scope > h2');
        if(!h||!/^Your .* baselines$/i.test(h.textContent||'')||section.dataset.auCompact)return;
        section.dataset.auCompact='1';
        const details=win.document.createElement('details');details.className='au-raw-baselines';
        const summary=win.document.createElement('summary');summary.innerHTML='<b>Baseline history + source detail</b><span>The useful current normals are already summarized above.</span>';
        details.appendChild(summary);
        [...section.childNodes].forEach(n=>details.appendChild(n));
        section.appendChild(details);
      });
    }

    function makePatternDistinct(host,c){
      const section=host.querySelector('.ac-pattern-section');if(!section)return;
      const kicker=section.querySelector('.ac-kicker');if(kicker)kicker.textContent='IS THIS REPEATING? · RECENT 7-DAY VIDEOS';
      try{
        const p=W.clarityPattern?.(c);const h2=section.querySelector('h2');
        if(h2&&p){
          if(p.max)h2.textContent=(p.max+' of '+p.n+' recent videos show the same '+(p.label||'weak spot'));
          else h2.textContent='No repeated issue yet';
        }
      }catch(_){}
    }

    function clarifyOverall(host,c){
      const section=host.querySelector('#adc-overall-read');if(!section)return;
      const kicker=section.querySelector('.adc-kicker');if(kicker)kicker.textContent='OVERALL CHANNEL READ · ACROSS RECENT VIDEOS + AUDIENCE';
      let r=null;try{r=W.channelRead?.(c);}catch(_){}
      const focus=section.querySelector('.adc-focus');
      if(focus){
        const label=focus.querySelector('span');if(label)label.textContent='WHAT I WOULD DO NOW';
        if(r?.focus==='No clear channel problem yet'){
          const b=focus.querySelector('b');if(b)b.textContent='Keep the current strategy. Do not force a fix. Recheck after the next comparable 7-day read or when a real pattern repeats.';
        }
      }
      const button=section.querySelector('[data-ac-mode="channel"]');if(button)button.textContent='View 90-day progress';
    }

    function clarifyVideoCall(host){
      const section=host.querySelector('.ac-video-section');if(!section)return;
      const badge=section.querySelector('.ac-top-badge');
      const b=badge?.querySelector('b'),label=badge?.querySelector('span');
      const next=section.querySelector('.ac-next-inline'),nextB=next?.querySelector('b'),nextP=next?.querySelector('p');
      const text=(b?.textContent||'').trim();
      if(text.startsWith('NO FIX NEEDED')){
        const soft=text.split('·')[1]?.replace(/A LITTLE SOFT/i,'').trim()||'ONE METRIC';
        if(label)label.textContent='CURRENT CALL';
        if(b)b.textContent='KEEP STRATEGY · WATCH '+soft;
        if(nextB)nextB.textContent='No strategy change right now';
        if(nextP){
          if(/PACKAGING/i.test(soft))nextP.textContent='The video still won. Keep the strategy. On the next comparable video, check CTR by source. Only test packaging if it stays below this creator’s normal without a clear audience-expansion explanation.';
          else if(/RETENTION/i.test(soft))nextP.textContent='The video still won. Keep the strategy. Use the next comparable video to see whether the same WATCH weakness repeats before changing the structure.';
          else if(/REACH/i.test(soft))nextP.textContent='The video still won. Keep the strategy. Check where the views came from and whether the Reach softness repeats before changing the topic approach.';
        }
      }else if(text==='NO CLEAR ISSUE'){
        if(label)label.textContent='CURRENT CALL';if(b)b.textContent='NO CHANGE NEEDED';
        if(nextB)nextB.textContent='Keep the current approach';
        if(nextP)nextP.textContent='Nothing is clearly broken versus this creator’s normal. Do not create a fix from one normal-looking video. Keep the next planned job and look for a repeated pattern.';
      }else if(text.startsWith('CHECK THIS')){
        if(label)label.textContent='WATCH ITEM';
      }
    }

    function channelMode(host,c){
      const p=W.prefs?.(c);if(!p)return;
      let back=host.querySelector('.au-channel-return');
      if(p.mode!=='channel'){back?.remove();return;}
      if(!back){
        back=win.document.createElement('section');back.className='cg-native-section au-channel-return';
        back.innerHTML='<div class="au-channel-return-head"><div><div class="cg-kicker">90-DAY PROGRESS VIEW</div><h2>Is the channel moving over time?</h2><p>This compares a starting whole-channel 90-day report with the latest comparable 90-day report, plus separate 28-day audience snapshots. Use it to track whether coaching is moving the channel after several videos. Come back to individual video analytics to diagnose <i>why</i>.</p></div><button class="btn dark" data-au-back-video>← Back to video analytics</button></div>';
        const tools=host.querySelector('#studio-tools');tools?tools.after(back):host.prepend(back);
      }
      const deep=host.querySelector('.ar-deep');
      if(deep){
        const h2=deep.querySelector('.ar-deep-head h2');if(h2)h2.textContent='Additional channel context';
        const p=deep.querySelector('.ar-deep-head p');if(p)p.textContent='Use these extra fields for programming, library health, and business impact. They are not required to diagnose a single video.';
        [...deep.querySelectorAll('.ar-sub')].forEach(sub=>{
          const title=(sub.querySelector('h3')?.textContent||'').trim();
          if(['Attention + viewing','Where the views came from','Audience growth + loyalty · rolling 28 days'].includes(title))sub.remove();
        });
      }
    }

    function patch(){
      const host=win.document.querySelector('main .cg-native-analytics'),c=current();if(!host||!c)return;
      host.querySelector('#analytics-program-bridge')?.remove();
      mergeStudioActions(host);
      rewriteFlow(host);
      clarifyOverall(host,c);
      clarifyVideoCall(host);
      compactBaselineDetails(host);
      makePatternDistinct(host,c);
      channelMode(host,c);
    }

    win.document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-au-back-video]')){const c=current();if(!c)return;const p=W.prefs(c);p.mode='video';render();}
    });
    let queued=false;const schedule=()=>{if(queued)return;queued=true;win.requestAnimationFrame(()=>{queued=false;patch();});};
    new MutationObserver(schedule).observe(win.document.documentElement,{childList:true,subtree:true});

    const style=win.document.createElement('style');style.id='analytics-usability-v2-style';style.textContent=`
      #studio-tools .au-studio-actions{display:flex!important;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}#studio-tools .au-studio-actions .btn{margin:0}.au-source-note{margin-top:8px!important}
      .ar-flow{margin-top:0}.ar-flow-head h2{max-width:680px}.ar-flow-step b{line-height:1.25}.ar-flow-step small strong{color:inherit}.ar-flow-step.primary{box-shadow:inset 0 0 0 2px #356f78}
      .ac-next-inline{border:1px solid var(--line,#d9e0e2)!important;border-left:5px solid #55757a!important;border-radius:12px!important;padding:15px!important}.ac-next-inline.bad{border-left-color:#b54b4b!important}.ac-next-inline.warn{border-left-color:#b5822e!important}.ac-next-inline.good,.ac-next-inline.great{border-left-color:#2f8464!important}.ac-next-inline span{font-size:10px!important;letter-spacing:.08em}.ac-next-inline b{font-size:16px!important}
      .au-selected-baseline,.au-raw-baselines{margin:0!important}.au-selected-baseline>summary,.au-raw-baselines>summary{display:flex;justify-content:space-between;gap:16px;align-items:center;cursor:pointer;padding:4px 0}.au-selected-baseline>summary span,.au-raw-baselines>summary span{font-size:11px;color:var(--muted,#65717a);font-weight:500}.au-selected-baseline[open]>summary,.au-raw-baselines[open]>summary{padding-bottom:14px;border-bottom:1px solid var(--line,#ddd);margin-bottom:12px}.ac-baseline-section:has(.au-selected-baseline),.cg-native-section:has(.au-raw-baselines){padding-top:14px!important;padding-bottom:14px!important}
      .au-channel-return{position:relative;border-left:5px solid #55757a!important}.au-channel-return-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:start}.au-channel-return h2{margin:4px 0 6px}.au-channel-return p{margin:0;max-width:850px;line-height:1.5}.au-channel-return .btn{white-space:nowrap}.ar-deep .ar-deep-head{margin-bottom:2px}
      @media(max-width:760px){.au-channel-return-head{grid-template-columns:1fr}.au-channel-return .btn{width:100%}.au-selected-baseline>summary,.au-raw-baselines>summary{display:grid}}
    `;win.document.head.appendChild(style);
    schedule();
  }

  return {PHASES,promptAppendix,phaseLabels,install};
});