(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.AcceleratorAnalyticsRichness=api;if(root.document)api.install(root);}
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';

  const n=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const count=v=>n(v)===null?'Not recorded':Math.round(n(v)).toLocaleString();
  const one=v=>n(v)===null?'Not recorded':n(v).toLocaleString(undefined,{maximumFractionDigits:1});
  const pct=v=>n(v)===null?'Not recorded':n(v).toFixed(1)+'%';
  const depth=v=>n(v)===null?'Not recorded':n(v).toFixed(2);
  const signedPct=v=>n(v)===null?'—':(n(v)>=0?'+':'')+n(v).toFixed(1)+'%';
  const signedPp=v=>n(v)===null?'—':(n(v)>=0?'+':'')+n(v).toFixed(1)+' pp';

  function flowStrip(){
    const steps=[
      ['24h','Launch','Early signal. Notice obvious problems, do not overreact.'],
      ['48h','Triage','Check whether an early issue is still showing up.'],
      ['7d','Diagnosis','Default video read. Decide what actually deserves attention.'],
      ['28d','Programming','Turn the result into a lesson about what to repeat, change, or make next.'],
      ['90d','Channel health','Check channel movement, audience, traffic, library contribution, and results.']
    ];
    return '<section class="ar-flow"><div class="ar-flow-head"><div><div class="ar-kicker">HOW TO USE ANALYTICS</div><h2>Read the right question at the right time</h2></div><small>7 days is the main video diagnosis. 90 days is channel health, not a per-video baseline.</small></div><div class="ar-flow-grid">'+steps.map((s,i)=>'<div class="ar-flow-step '+(i===2?'primary':'')+'"><span>'+esc(s[0])+'</span><b>'+esc(s[1])+'</b><small>'+esc(s[2])+'</small></div>').join('')+'</div></section>';
  }

  function change(start,current,kind='count'){
    const a=n(start),z=n(current);if(a===null||z===null)return 'No fair starting comparison';
    if(kind==='rate')return signedPp(z-a)+' vs starting';
    if(a===0)return z===0?'No change':'Starting value was 0';
    return signedPct((z/a-1)*100)+' vs starting';
  }
  function card(label,start,current,kind='count',format=count,note=''){
    return '<div class="ar-card"><span>'+esc(label)+'</span><b>'+esc(format(current))+'</b><strong>'+esc(change(start,current,kind))+'</strong>'+(note?'<small>'+esc(note)+'</small>':'')+'</div>';
  }
  function latestAudience(c){
    const rows=(c?.coachOS?.analytics?.audienceSnapshots||[]).filter(Boolean).slice().sort((a,b)=>String(a.asOf||a.date||'').localeCompare(String(b.asOf||b.date||'')));
    return {previous:rows.at(-2)||{},current:rows.at(-1)||{},rows};
  }
  function contextNotes(x){
    const rows=[
      ['Paid / filter context',x?.paidNote],
      ['Traffic-source evidence',x?.sourceNote],
      ['Library split evidence',x?.libraryNote],
      ['Attribution context',x?.attributionNote],
      ['Notes',x?.notes]
    ].filter(([,v])=>String(v||'').trim());
    if(!rows.length)return '<p class="ar-muted">No extra source/filter notes were recorded for the latest 90-day report.</p>';
    return '<div class="ar-notes">'+rows.map(([k,v])=>'<div><span>'+esc(k)+'</span><p>'+esc(v)+'</p></div>').join('')+'</div>';
  }
  function channelMissingHtml(c,W){
    const d=W?.channel?W.channel(c):{current:{}},z=d.current||{},aud=latestAudience(c),az=aud.current||{},missing=[];
    if(n(z.engagedViews)===null)missing.push(['Engaged views','Studio → Analytics → Advanced Mode / SEE MORE → Engaged views. Keep it separate from public Views. If Studio cannot expose it, leave it missing.']);
    if(n(az.avgViewsPerViewer)===null)missing.push(['Average views per viewer','Studio → Analytics → Advanced Mode / SEE MORE → Average views per viewer for the same 28-day audience window. This is a library-depth clue.']);
    if(n(z.newUploadViews)===null||n(z.libraryViews)===null)missing.push(['New-upload vs older-library views','Advanced Mode: use the exact 90-day date range and isolate views from videos published inside that period versus videos published before it. If Studio cannot isolate the split exactly, leave it missing.']);
    if(n(z.uploadsPublished)===null)missing.push(['Long-form uploads published','Count long-form uploads published inside the exact 90-day period. Do not use an all-content count that mixes Shorts and long-form.']);
    if(['qualifiedLeads','bookings','sales','revenue'].every(k=>n(z[k])===null))missing.push(['Business RESULT','Use the creator’s CRM / booking / sales system. Add qualified leads, bookings, sales, or revenue only when the attribution/definition is understood. These are not YouTube Studio metrics.']);
    if(!missing.length)return '<section class="ar-sub ar-missing"><div><h3>Missing-data check</h3><p>The main channel-health fields currently needed for this creator are connected.</p></div></section>';
    return '<section class="ar-sub ar-missing"><div><h3>What is still missing?</h3><p>Studio gave us a lot, but these fields are not connected. Missing stays missing until you add it manually or Studio can retrieve it exactly.</p></div><div class="ar-missing-list">'+missing.map(([name,path])=>'<div><b>'+esc(name)+'</b><p>'+esc(path)+'</p></div>').join('')+'</div></section>';
  }

  function channelDeepDive(c,W){
    const d=W?.channel?W.channel(c):{starting:{},current:{},comparable:false},a=d.starting||{},z=d.current||{},aud=latestAudience(c),ap=aud.previous||{},az=aud.current||{};
    const splitTotal=(n(z.newUploadViews)||0)+(n(z.libraryViews)||0),newShare=splitTotal>0?(n(z.newUploadViews)||0)/splitTotal*100:null;
    const hasBusiness=['qualifiedLeads','bookings','sales','revenue'].some(k=>n(z[k])!==null||n(a[k])!==null);
    const channelCard=(key,label,kind,format,note='')=>{
      const ok=typeof d.metricComparable==='function'?d.metricComparable(key):d.comparable;
      if(ok)return card(label,a[key],z[key],kind,format,note);
      return '<div class="ar-card"><span>'+esc(label)+'</span><b>'+esc(format(z[key]))+'</b><strong>Comparison unavailable</strong><small>'+esc(note||(['views','engagedViews'].includes(key)?'The view-count definition was not verified across both 90-day periods. Current value is shown without a trend claim.':'Add a comparable prior value before reading the trend.'))+'</small></div>';
    };
    return '<section class="ar-deep"><div class="ar-deep-head"><div><div class="ar-kicker">FULL CHANNEL HEALTH · 90 DAYS + 28-DAY AUDIENCE</div><h2>Track channel movement, then go back to videos to diagnose why</h2><p>This compares whole-channel periods after several uploads. It is a progress scoreboard, not a single-video diagnosis. Missing fields stay missing and are called out below.</p></div><span class="ar-status">'+(d.comparable?'Starting → latest':'Latest report / comparison incomplete')+'</span></div>'+ 
      '<div class="ar-sub"><div><h3>Attention + viewing</h3><p>Whole-channel movement. These are 90-day totals, not per-video normals.</p></div><div class="ar-grid">'+
        channelCard('views','Views · new count','count',count)+
        channelCard('engagedViews','Engaged views · old/original count','count',count)+
        channelCard('impressions','Impressions','count',count)+
        channelCard('ctr','CTR','rate',pct)+
        channelCard('watchTime','Watch time','count',v=>n(v)===null?'Not recorded':one(v)+' h')+
      '</div></div>'+ 
      '<div class="ar-sub"><div><h3>Where the views came from</h3><p>Use traffic mix as context before calling CTR or topic performance weak.</p></div><div class="ar-grid ar-grid4">'+
        card('Browse',a.browsePct,z.browsePct,'rate',pct)+
        card('Suggested',a.suggestedPct,z.suggestedPct,'rate',pct)+
        card('Search',a.searchPct,z.searchPct,'rate',pct)+
        card('External',a.externalPct,z.externalPct,'rate',pct)+
      '</div></div>'+ 
      '<div class="ar-sub"><div><h3>Programming + library contribution</h3><p>This answers whether recent publishing or the older library is carrying the channel. Studio may not always isolate this exactly, so unavailable stays unavailable.</p></div><div class="ar-grid ar-grid4">'+
        card('Uploads published',a.uploadsPublished,z.uploadsPublished,'count',count,'Exact long-form count when Studio can retrieve it')+
        card('Views from new uploads',a.newUploadViews,z.newUploadViews,'count',count,'Videos published inside the same 90-day period')+
        card('Views from older library',a.libraryViews,z.libraryViews,'count',count,'Videos published before the 90-day period')+
        '<div class="ar-card"><span>New-upload share of isolated split</span><b>'+esc(newShare===null?'Not recorded':newShare.toFixed(1)+'%')+'</b><strong>'+(newShare===null?'Needs both exact split fields':'New uploads vs older library')+'</strong><small>This is only calculated when both exact split fields are available.</small></div>'+ 
      '</div></div>'+ 
      '<div class="ar-sub"><div><h3>Audience growth + loyalty · rolling 28 days</h3><p>New, Casual, Regular, Returning, and average views/viewer are separate signals. They are not a person-by-person funnel.</p></div><div class="ar-grid">'+
        card('Monthly audience',ap.monthlyAudience,az.monthlyAudience,'count',count)+
        card('New viewers',ap.newViewers,az.newViewers,'count',count)+
        card('Casual viewers',ap.casual,az.casual,'count',count)+
        card('Regular viewers',ap.regular,az.regular,'count',count)+
        card('Returning viewers',ap.returning,az.returning,'count',count)+
        card('Avg views / viewer',ap.avgViewsPerViewer,az.avgViewsPerViewer,'count',depth)+
      '</div><p class="ar-muted">Latest audience snapshot: '+esc(az.asOf||az.date||'not recorded')+(aud.rows.length<2?' · Add another comparable 28-day snapshot before treating movement as a trend.':'')+'</p></div>'+ 
      '<div class="ar-sub"><div><h3>RESULT · business outcome</h3><p>Convert content should not be ranked only by views. These fields come from business/CRM evidence, not YouTube Studio.</p></div><div class="ar-grid ar-grid4">'+
        card('Qualified leads',a.qualifiedLeads,z.qualifiedLeads,'count',count)+
        card('Bookings',a.bookings,z.bookings,'count',count)+
        card('Sales',a.sales,z.sales,'count',count)+
        card('Revenue · reported',a.revenue,z.revenue,'count',one)+
      '</div>'+(hasBusiness?'':'<p class="ar-muted">Business-result data is not connected yet. That is expected if this creator is being judged on Reach or Trust, or if CRM data has not been added.</p>')+'</div>'+ 
      channelMissingHtml(c,W)+
      '<details class="ar-source"><summary>Source, filter, library, and attribution notes</summary>'+contextNotes(z)+'</details>'+ 
    '</section>';
  }

  function install(win){
    if(win.__acceleratorAnalyticsRichnessV1)return;win.__acceleratorAnalyticsRichnessV1=true;
    const W=win.AcceleratorAnalyticsWorkspace;if(!W||typeof W.body!=='function')return;
    const prior=W.body.bind(W);
    W.body=function(c){
      const html=prior(c),p=W.prefs(c);
      return p.mode==='channel'?html+channelDeepDive(c,W):flowStrip()+html;
    };
    const style=win.document.createElement('style');style.id='analytics-richness-style';style.textContent=`
      .ar-kicker{font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#68757d)}
      .ar-flow,.ar-deep{border:1px solid var(--line,#d9e0e2);background:var(--card,#fff);border-radius:18px;padding:20px 22px;margin-bottom:24px;display:grid;gap:16px}
      .ar-flow-head,.ar-deep-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.ar-flow h2,.ar-deep h2{margin:4px 0 5px}.ar-flow-head>small,.ar-status{max-width:360px;color:var(--muted,#68757d);line-height:1.45}
      .ar-flow-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.ar-flow-step{border:1px solid var(--line,#d9e0e2);border-radius:11px;padding:12px;display:grid;gap:4px}.ar-flow-step.primary{border-color:#356f78;box-shadow:inset 0 0 0 1px #356f78}.ar-flow-step span{font-size:10px;font-weight:900;letter-spacing:.08em}.ar-flow-step b{font-size:14px}.ar-flow-step small{color:var(--muted,#68757d);line-height:1.35}
      .ar-status{font-size:11px;font-weight:800;padding:7px 10px;border:1px solid var(--line,#d9e0e2);border-radius:999px;white-space:nowrap}.ar-sub{display:grid;gap:10px;padding-top:4px}.ar-sub+ .ar-sub{border-top:1px solid var(--line,#d9e0e2);padding-top:18px}.ar-sub h3{margin:0 0 4px;font-size:17px}.ar-sub p{margin:0;color:var(--muted,#68757d);line-height:1.45}
      .ar-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.ar-grid4{grid-template-columns:repeat(4,minmax(0,1fr))}.ar-card{border:1px solid var(--line,#d9e0e2);border-radius:11px;padding:12px;display:grid;gap:4px;min-width:0}.ar-card span{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.ar-card b{font-size:19px;overflow-wrap:anywhere}.ar-card strong{font-size:11px}.ar-card small,.ar-muted{font-size:11px;color:var(--muted,#68757d);line-height:1.4}
      .ar-missing-list{display:grid;gap:8px}.ar-missing-list>div{border:1px solid var(--line,#d9e0e2);border-radius:10px;padding:11px}.ar-missing-list b{font-size:12px}.ar-missing-list p{margin:4px 0 0!important;font-size:11px!important}.ar-source summary{cursor:pointer;font-weight:800}.ar-notes{display:grid;gap:8px;margin-top:10px}.ar-notes>div{padding:10px;border:1px solid var(--line,#d9e0e2);border-radius:9px}.ar-notes span{font-size:10px;font-weight:900;text-transform:uppercase}.ar-notes p{margin:4px 0 0!important;color:inherit!important}
      @media(max-width:1000px){.ar-flow-grid,.ar-grid,.ar-grid4{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:600px){.ar-flow-head,.ar-deep-head{display:grid}.ar-flow-grid,.ar-grid,.ar-grid4{grid-template-columns:1fr}.ar-status{white-space:normal}.ar-flow,.ar-deep{padding:16px}}
    `;win.document.head.appendChild(style);
  }

  return {flowStrip,channelDeepDive,change,latestAudience,install};
});
