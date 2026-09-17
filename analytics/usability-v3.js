(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.AcceleratorAnalyticsUsabilityV3=api;if(root.document)api.install(root);}
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';

  const PHASES={
    24:{label:'24h · Launch',question:'Is anything obviously broken?',decision:'Usually do not change anything yet. Only flag a severe SHOW, CLICK, or WATCH problem and keep collecting data.'},
    48:{label:'48h · Triage',question:'Did the early signal persist?',decision:'Decide what deserves investigation. Still avoid a channel-wide strategy change from this alone.'},
    168:{label:'7d · Diagnosis',question:'What actually under- or over-performed?',decision:'This is the main video decision point. Name a real bottleneck, or explicitly decide there is no fix needed.'},
    672:{label:'28d · Programming',question:'What did the full run teach us?',decision:'Decide what to repeat, change, stop, and what the next video should do.'},
    2160:{label:'90d · Channel Health',question:'Is the channel actually moving?',decision:'Track whether the creator’s floor, audience, library contribution, and business result are improving after several videos.'}
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function promptAppendix(kind='video'){
    if(kind==='channel')return `\n\nTRAFFIC-SOURCE QA — REQUIRED\nFor EACH returned 90-day period, actively retrieve the actual Traffic source report for that exact same 90-day date range. Return Browse, Suggested, Search, and External percentages when Studio can retrieve them. Do not reuse a traffic mix from another date range. In context.sourceNote, record the exact report/filter used and any leading Suggested source videos or Search queries Studio can return. If the exact 90-day source mix is unavailable, return null for the unavailable fields and state that limitation.`;
    return `\n\nPER-VIDEO TRAFFIC-SOURCE QA — REQUIRED\nFor EVERY returned video/checkpoint row, actively retrieve How viewers found this video / Traffic source for that SAME exact first-life checkpoint window. Return Browse, Suggested, Search, and External percentages for the individual video when Studio can retrieve them. Do not substitute the channel-wide traffic mix, a lifetime source mix, or a different date range. Do not skip traffic-source fields because retention30 or Engaged views is unavailable. If Ask Studio cannot isolate the exact per-video source mix for that checkpoint, set those source fields to null and state that specific limitation.`;
  }

  function phaseLabels(html){
    let out=String(html||'');
    const swaps=[
      ['>24 hours<','>24h · Launch<'],['>48 hours<','>48h · Triage<'],['>7 days<','>7d · Diagnosis<'],['>28 days · optional<','>28d · Programming<'],['>28 days<','>28d · Programming<'],
      ['Build a 24 hours baseline','Build a 24h Launch baseline'],['Build a 48 hours baseline','Build a 48h Triage baseline'],['Build a 7 days baseline','Build a 7d Diagnosis baseline'],['Build a 28 days baseline','Build a 28d Programming baseline']
    ];
    for(const [a,b] of swaps)out=out.split(a).join(b);
    return out;
  }

  function winnerCall(text){
    const raw=String(text||'').trim();
    if(!raw.startsWith('NO FIX NEEDED'))return null;
    const soft=raw.split('·')[1]?.replace(/A LITTLE SOFT/i,'').trim()||'ONE METRIC';
    return {soft,label:'KEEP STRATEGY · WATCH '+soft};
  }

  function flowHtml(doc){
    const section=doc.createElement('section');
    section.className='ar-flow au3-flow';
    const steps=[24,48,168,672,2160].map(h=>{
      const p=PHASES[h];
      return '<div class="au3-phase '+(h===168?'primary':'')+'"><span>'+esc(p.label)+'</span><b>'+esc(p.question)+'</b><small>'+esc(p.decision)+'</small></div>';
    }).join('');
    section.innerHTML='<div class="au3-flow-head"><div><div class="ar-kicker">HOW TO USE THIS PAGE</div><h2>Check the right thing at the right time</h2><p>Each checkpoint answers a different question. <b>7 days is the main video diagnosis.</b> 90 days is for tracking channel progress, not diagnosing one upload.</p></div></div><div class="au3-phases">'+steps+'</div>';
    return section;
  }

  function safeCollapse(section,doc,summaryTitle,summarySub){
    if(!section||section.dataset.au3Collapsed)return;
    section.dataset.au3Collapsed='1';
    const details=doc.createElement('details');details.className='au3-details';
    const summary=doc.createElement('summary');summary.innerHTML='<b>'+esc(summaryTitle)+'</b><span>'+esc(summarySub)+'</span>';
    details.appendChild(summary);
    const nodes=[...section.childNodes];
    for(const node of nodes)details.appendChild(node);
    section.appendChild(details);
  }

  function transformHtml(win,c,html,W){
    const doc=win.document,box=doc.createElement('div');box.innerHTML=phaseLabels(html);
    box.querySelector('#analytics-program-bridge')?.remove();
    const prefs=W.prefs?.(c)||{};

    if(prefs.mode==='video'){
      const oldFlow=box.querySelector('.ar-flow');
      const freshFlow=flowHtml(doc);
      if(oldFlow)oldFlow.replaceWith(freshFlow); else box.prepend(freshFlow);

      const overall=box.querySelector('#adc-overall-read');
      if(overall){
        const kicker=overall.querySelector('.adc-kicker');if(kicker)kicker.textContent='OVERALL CHANNEL READ · ACROSS RECENT VIDEOS + AUDIENCE';
        const h2=overall.querySelector('h2'),focus=overall.querySelector('.adc-focus');
        if(focus){const label=focus.querySelector('span');if(label)label.textContent='WHAT I WOULD DO NOW';}
        if(h2?.textContent.trim()==='No clear channel problem yet'&&focus){
          const b=focus.querySelector('b');if(b)b.textContent='No channel-wide change. Keep the current plan and wait for a repeated issue before changing strategy.';
          const small=focus.querySelector('small');if(small)small.textContent='Use the next comparable 7-day read to confirm whether anything is actually repeating.';
        }
        const channelBtn=overall.querySelector('[data-ac-mode="channel"]');if(channelBtn)channelBtn.textContent='View 90-day progress';
      }

      const video=box.querySelector('.ac-video-section');
      if(video){
        const badge=video.querySelector('.ac-top-badge'),badgeText=badge?.querySelector('b')?.textContent||'';
        const call=winnerCall(badgeText),next=video.querySelector('.ac-next-inline');
        if(call){
          const badgeLabel=badge.querySelector('span'),badgeB=badge.querySelector('b');
          if(badgeLabel)badgeLabel.textContent='CURRENT CALL';if(badgeB)badgeB.textContent=call.label;
          const nextB=next?.querySelector('b'),nextP=next?.querySelector('p');if(nextB)nextB.textContent='No strategy change right now';
          if(nextP){
            if(/PACKAGING/i.test(call.soft))nextP.textContent='The video still won. Keep the strategy. On the next comparable video, check CTR by traffic source. Only test packaging if CTR stays below this creator’s normal without wider distribution explaining it.';
            else if(/RETENTION/i.test(call.soft))nextP.textContent='The video still won. Keep the strategy. Watch whether the same WATCH weakness repeats on the next comparable video before changing the opening or structure.';
            else if(/REACH/i.test(call.soft))nextP.textContent='The video still won. Keep the strategy. Check where the views came from and whether the Reach softness repeats before changing the topic approach.';
          }
        }else if(badgeText.trim()==='NO CLEAR ISSUE'){
          const badgeLabel=badge?.querySelector('span'),badgeB=badge?.querySelector('b');if(badgeLabel)badgeLabel.textContent='CURRENT CALL';if(badgeB)badgeB.textContent='NO CHANGE NEEDED';
          const nextB=next?.querySelector('b'),nextP=next?.querySelector('p');if(nextB)nextB.textContent='Keep the current approach';if(nextP)nextP.textContent='Nothing is clearly broken versus this creator’s normal. Do not invent a fix from one normal-looking video. Keep the next planned job and look for a repeated pattern.';
        }else if(/^CHECK THIS/.test(badgeText.trim())){
          const badgeLabel=badge?.querySelector('span');if(badgeLabel)badgeLabel.textContent='WATCH ITEM';
        }
      }

      const normals=box.querySelector('.ac-all-normals');
      if(normals){
        normals.classList.add('au3-compact-normals');
        const h2=normals.querySelector('h2');if(h2)h2.textContent='Creator normals at a glance';
        const p=normals.querySelector('.ac-section-head p');if(p)p.textContent='Use this to understand what “normal” looks like at each checkpoint. Open detailed baseline history only when you need the source or sample.';
      }

      const pattern=box.querySelector('.ac-pattern-section');
      if(pattern){
        const kicker=pattern.querySelector('.ac-kicker');if(kicker)kicker.textContent='IS THIS REPEATING? · RECENT 7-DAY VIDEOS';
        try{const p=W.clarityPattern?.(c),h2=pattern.querySelector('h2');if(h2&&p){h2.textContent=p.max?(p.max+' of '+p.n+' recent videos show the same '+(p.label||'weak spot')):'No repeated issue yet';}}catch(_){}
      }

      const baseline=box.querySelector('.ac-baseline-section');
      if(baseline){
        safeCollapse(baseline,doc,'Detailed selected baseline','Source, sample size, starting normal, and baseline history.');
        const recent=box.querySelector('.ac-recent-section');
        if(recent)recent.after(baseline);
      }
    }else if(prefs.mode==='channel'){
      box.querySelector('.ar-flow')?.remove();
      const tabs=[...box.querySelectorAll('[data-aw="mode"]')];
      const videoTab=tabs.find(x=>x.dataset.mode==='video');if(videoTab)videoTab.textContent='← Back to video analytics';
      const channelTab=tabs.find(x=>x.dataset.mode==='channel');if(channelTab)channelTab.textContent='90-day progress';

      const intro=doc.createElement('section');intro.className='cg-native-section au3-channel-intro';
      intro.innerHTML='<div class="au3-channel-head"><div><div class="cg-kicker">90-DAY PROGRESS VIEW</div><h2>Is the channel moving after several videos?</h2><p>This is a <b>tracking view</b>. It compares a starting 90-day whole-channel report with the latest comparable 90-day report, plus separate 28-day audience snapshots. Use individual video analytics to diagnose why something moved.</p></div><button class="btn dark" data-au3-back-video>← Back to video analytics</button></div>';
      box.prepend(intro);

      const deep=box.querySelector('.ar-deep');
      if(deep){
        const h2=deep.querySelector('.ar-deep-head h2');if(h2)h2.textContent='Additional programming + business context';
        const p=deep.querySelector('.ar-deep-head p');if(p)p.textContent='These are the pieces not already shown in the main 90-day tables. Use them for library health, programming, and business impact.';
        [...deep.querySelectorAll('.ar-sub')].forEach(sub=>{
          const title=(sub.querySelector('h3')?.textContent||'').trim();
          if(['Attention + viewing','Where the views came from','Audience growth + loyalty · rolling 28 days'].includes(title))sub.remove();
        });
      }
    }
    return box.innerHTML;
  }

  function install(win){
    if(win.__acceleratorAnalyticsUsabilityV3)return;win.__acceleratorAnalyticsUsabilityV3=true;
    const W=win.AcceleratorAnalyticsWorkspace,guide=win.__acceleratorCoachGuide;if(!W||typeof W.body!=='function')return;
    const priorBody=W.body.bind(W);
    W.body=function(c){return transformHtml(win,c,priorBody(c),W);};

    const I=win.AcceleratorStudioImport;
    if(I&&!I.__sourceQaV3&&typeof I.prompt==='function'){
      I.__sourceQaV3=true;const prior=I.prompt.bind(I);I.prompt=(c,h)=>prior(c,h)+promptAppendix('video');
    }
    const ADC=win.AcceleratorDecisionContext;
    if(ADC&&!ADC.__sourceQaV3){
      ADC.__sourceQaV3=true;
      if(typeof ADC.masterPrompt==='function'){const prior=ADC.masterPrompt.bind(ADC);ADC.masterPrompt=c=>prior(c)+promptAppendix('video')+promptAppendix('channel');}
      if(typeof ADC.channelPrompt==='function'){const prior=ADC.channelPrompt.bind(ADC);ADC.channelPrompt=c=>prior(c)+promptAppendix('channel');}
    }

    win.document.addEventListener('click',e=>{
      if(!e.target.closest?.('[data-au3-back-video]'))return;
      let c=null;try{c=win.AcceleratorDeskBridge?.current?.()}catch(_){}if(!c)return;
      const p=W.prefs(c);p.mode='video';try{guide?.analyticsPage?.()}catch(_){}
    });

    const style=win.document.createElement('style');style.id='analytics-usability-v3-style';style.textContent=`
      #studio-tools .actions{display:inline-flex!important;align-items:center;gap:8px!important;flex-wrap:wrap!important;margin:4px 6px 8px 0!important}#studio-tools .actions .btn{margin:0!important}
      .au3-flow{padding:16px 18px!important;gap:12px!important}.au3-flow-head h2{margin:3px 0 5px!important}.au3-flow-head p{margin:0;max-width:900px;line-height:1.45;color:var(--muted,#68757d)}.au3-phases{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.au3-phase{border:1px solid var(--line,#d9e0e2);border-radius:10px;padding:10px;display:grid;gap:4px;min-width:0}.au3-phase.primary{border-color:#356f78;box-shadow:inset 0 0 0 1px #356f78}.au3-phase span{font-size:10px;font-weight:900;letter-spacing:.04em}.au3-phase b{font-size:13px}.au3-phase small{font-size:11px;line-height:1.35;color:var(--muted,#68757d)}
      .ac-next-inline{border-left-width:5px!important;padding:15px 17px!important}.ac-next-inline>div span{font-size:10px!important;letter-spacing:.08em}.ac-next-inline>div b{font-size:15px!important}.ac-next-inline p{font-size:14px!important;line-height:1.5!important}
      .au3-compact-normals .ac-section-head{padding-bottom:10px!important}.au3-compact-normals .ac-section-body{padding-top:8px!important}.au3-compact-normals .ac-normal-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}.au3-compact-normals .ac-normal-card,.au3-compact-normals .ac-normal-channel{padding:10px!important;border-radius:10px!important}.au3-compact-normals .ac-normal-card-head{margin-bottom:6px!important}.au3-compact-normals .ac-normal-card-head b{font-size:13px!important}.au3-compact-normals .ac-normal-card p,.au3-compact-normals .ac-normal-channel p{font-size:11px!important;line-height:1.35!important;margin:5px 0!important}.au3-compact-normals .ac-normal-cells{gap:5px!important}.au3-compact-normals .ac-normal-cell{padding:6px!important;min-height:0!important}.au3-compact-normals .ac-normal-cell span{font-size:9px!important}.au3-compact-normals .ac-normal-cell b{font-size:14px!important}.au3-compact-normals .ac-normal-cell small{font-size:9px!important}.au3-compact-normals .ac-normal-note{font-size:11px!important}
      .ac-baseline-section[data-au3-collapsed="1"]{padding:0!important;border-style:dashed!important}.au3-details>summary{cursor:pointer;padding:13px 16px;display:flex;justify-content:space-between;gap:14px;align-items:center}.au3-details>summary b{font-size:14px}.au3-details>summary span{font-size:11px;color:var(--muted,#68757d)}.au3-details[open]>summary{border-bottom:1px solid var(--line,#d9e0e2)}.au3-details[open]>.ac-section-head,.au3-details[open]>.ac-section-body{display:block}
      .au3-channel-intro{border-left:5px solid #55757a!important}.au3-channel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.au3-channel-head h2{margin:4px 0 6px}.au3-channel-head p{margin:0;max-width:850px;line-height:1.5}.au3-channel-head .btn{flex:0 0 auto}
      @media(max-width:1000px){.au3-phases,.au3-compact-normals .ac-normal-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:620px){.au3-phases,.au3-compact-normals .ac-normal-grid{grid-template-columns:1fr!important}.au3-channel-head{display:grid}.au3-details>summary{display:grid}}
    `;win.document.head.appendChild(style);
  }

  return {PHASES,promptAppendix,phaseLabels,winnerCall,transformHtml,install};
});
