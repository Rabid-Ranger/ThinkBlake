(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine'));else root.AcceleratorStudioImport=factory(root.AcceleratorAnalytics);})(typeof globalThis==='undefined'?this:globalThis,function(A){
'use strict';const windows={24:'_24h',48:'_48h',168:'_7d',672:'_28d'},metrics=['views','engagedViews','impressions','ctr','retention30','apv','avdSeconds','browsePct','suggestedPct','searchPct','externalPct'],studioCoreMetrics=['views','impressions','ctr','apv','avdSeconds'],studioOptionalMetrics=['engagedViews','retention30','browsePct','suggestedPct','searchPct','externalPct'],cumulativeMetrics=['views','engagedViews','impressions'],channelMetrics=['views','engagedViews','impressions','ctr','watchTime','newViewers','casual','regular','returning','avgViewsPerViewer','browsePct','suggestedPct','searchPct','externalPct','uploadsPublished','newUploadViews','libraryViews','qualifiedLeads','bookings','sales','revenue'],channelRates=new Set(['ctr','browsePct','suggestedPct','searchPct','externalPct']),channelContext=['paidNote','sourceNote','libraryNote','attributionNote','notes'],audienceMetrics=['monthlyAudience','newViewers','casual','regular','returning','avgViewsPerViewer'],windowNames={24:'24-hour launch',48:'48-hour check',168:'7-day main read',672:'28-day follow-up'};
function obviousStudioConflict(o){
 const m=o?.metrics||{};
 if(Number.isFinite(m.views)&&m.views===0&&Number.isFinite(m.impressions)&&m.impressions>=100&&Number.isFinite(m.ctr)&&m.ctr>0)return 'views are zero even though registered impressions and CTR are positive';
 if(Number.isFinite(m.views)&&Number.isFinite(m.impressions)&&m.impressions>=100&&Number.isFinite(m.ctr)&&m.ctr>0){
  const implied=m.impressions*m.ctr;
  if(implied>=100&&m.views<implied*.8&&(implied-m.views)>=50)return 'views are materially below the views implied by registered impressions × CTR; these fields appear to come from incompatible report populations, filters, or metric definitions';
 }
 return null;
}
function studioRowIssues(o){
 const issues=[];
 if(o?.coverage!=='exact')issues.push('exact checkpoint not verified');
 for(const k of studioCoreMetrics)if(!Number.isFinite(o?.metrics?.[k]))issues.push(k+' missing');
 const conflict=obviousStudioConflict(o);if(conflict)issues.push(conflict);
 return issues;
}
function checkpointInventory(c,hours){
 const latest=new Map();
 for(const o of c?.analyticsFoundation?.observations||[]){
  if(Number(o.windowHours)!==Number(hours))continue;
  const id=A.canonicalVideoId(o.videoId),old=latest.get(id);
  if(!old||(o.revision||0)>(old.revision||0)||((o.revision||0)===(old.revision||0)&&String(o.capturedAt||'')>String(old.capturedAt||'')))latest.set(id,o);
 }
 const structural=[...latest.values()].filter(o=>o.coverage==='exact'&&o.format==='edited-long-form'&&o.eraId==='current');
 const repair=structural.filter(o=>studioRowIssues(o).length);
 const complete=structural.filter(o=>!studioRowIssues(o).length);
 return {saved:structural.length,complete:complete.length,target:15,repair,completeRows:complete};
}
function checkpointTrafficCoverage(c,hours){
 const latest=new Map();
 for(const o of c?.analyticsFoundation?.observations||[]){
  if(Number(o.windowHours)!==Number(hours))continue;
  const id=A.canonicalVideoId(o.videoId),old=latest.get(id);
  if(!old||(o.revision||0)>(old.revision||0)||((o.revision||0)===(old.revision||0)&&String(o.capturedAt||'')>String(old.capturedAt||'')))latest.set(id,o);
 }
 const rows=[...latest.values()].filter(o=>o.coverage==='exact'&&o.format==='edited-long-form'&&o.eraId==='current');
 const keys=['browsePct','suggestedPct','searchPct','externalPct'];
 const counts=Object.fromEntries(keys.map(k=>[k,rows.filter(o=>Number.isFinite(o?.metrics?.[k])).length]));
 const complete=rows.filter(o=>keys.every(k=>Number.isFinite(o?.metrics?.[k]))).length;
 return {rows:rows.length,complete,target:15,counts};
}
const hash=x=>{let h=2166136261;for(const c of JSON.stringify(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36)};
function jsonObjectCandidates(text){
 const raw=String(text||'').trim().replace(/^\uFEFF/,'');
 const starts=[];const re=/\{\s*"schemaVersion"\s*:\s*1\s*,\s*"creatorId"\s*:/g;let m;
 while((m=re.exec(raw)))starts.push(m.index);
 const out=[];
 for(const start of starts){
   let depth=0,end=-1;
   for(let i=start;i<raw.length;i++){
     const ch=raw[i];
     if(ch==='{')depth++;
     else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
   }
   if(end>start)out.push({start,end,text:raw.slice(start,end)});
 }
 return {raw,candidates:out};
}
function repairJsonCandidate(raw){
 let out='',inside=false,escapeFixes=0,quoteFixes=0,newlineFixes=0;
 const validEscapes=new Set(['"','\\','/','b','f','n','r','t','u']);
 for(let i=0;i<raw.length;i++){
   const ch=raw[i];
   if(!inside){out+=ch;if(ch==='"')inside=true;continue;}
   if(ch==='\\'){
     const next=raw[i+1];
     if(next===undefined){out+=ch;continue;}
     if(validEscapes.has(next)){out+=ch+next;i++;continue;}
     out+=next;i++;escapeFixes++;continue;
   }
   if(ch==='"'){
     let j=i+1;while(j<raw.length&&/\s/.test(raw[j]))j++;
     const next=raw[j];
     if(next===undefined||next===':'||next===','||next==='}'||next===']'){out+=ch;inside=false;}
     else{out+='\\\"';quoteFixes++;}
     continue;
   }
   if(ch==='\n'){out+='\\n';newlineFixes++;continue;}
   if(ch==='\r'){if(raw[i+1]==='\n')i++;out+='\\n';newlineFixes++;continue;}
   if(ch==='\t'){out+='\\t';newlineFixes++;continue;}
   out+=ch;
 }
 const repairs=[];
 if(escapeFixes)repairs.push('removed '+escapeFixes+' invalid Markdown-style escape'+(escapeFixes===1?'':'s'));
 if(quoteFixes)repairs.push('escaped '+quoteFixes+' unescaped quote'+(quoteFixes===1?'':'s')+' inside text fields');
 if(newlineFixes)repairs.push('escaped '+newlineFixes+' line break'+(newlineFixes===1?'':'s')+' inside text fields');
 let data;try{data=JSON.parse(out);}catch(_){return null;}
 return {data,repairs,raw:out};
}
function studioPayloadScore(data,expectedCreatorId){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.schemaVersion!==1)return -1e9;
 let score=100;
 if(expectedCreatorId&&data.creatorId===expectedCreatorId)score+=100;else if(expectedCreatorId)score-=100;
 const channel=String(data.channelName||'');if(channel&&!/ACTUAL CHANNEL/i.test(channel))score+=40;
 const observations=Array.isArray(data.observations)?data.observations:[];
 const periods=Array.isArray(data.channelPeriods)?data.channelPeriods:[];
 const audience=Array.isArray(data.audienceSnapshots)?data.audienceSnapshots:[];
 for(const row of observations){
   if(row&&/^\d{4}-\d{2}-\d{2}T/.test(String(row.publishedAt||''))&&!/^ACTUAL/i.test(String(row.videoId||'')))score+=10;
   const vals=Object.values(row?.metrics||{}).filter(Number.isFinite).length;score+=Math.min(vals,8);
 }
 for(const row of periods)if(row&&/^\d{4}-\d{2}-\d{2}$/.test(String(row.start||''))&&/^\d{4}-\d{2}-\d{2}$/.test(String(row.end||'')))score+=20;
 for(const row of audience)if(row&&/^\d{4}-\d{2}-\d{2}$/.test(String(row.asOf||'')))score+=10;
 if(/ACTUAL YOUTUBE|YYYY-MM-DD|ACTUAL TITLE/.test(JSON.stringify(data)))score-=150;
 return score;
}
function studioJson(text,expectedCreatorId){
 const found=jsonObjectCandidates(text);
 if(!found.candidates.length)throw Error('Ask Studio did not return an Accelerator JSON object. Nothing was saved.');
 const parsed=[];
 for(const candidate of found.candidates){
   const repaired=repairJsonCandidate(candidate.text);if(!repaired)continue;
   parsed.push({...repaired,start:candidate.start,end:candidate.end,score:studioPayloadScore(repaired.data,expectedCreatorId)});
 }
 if(!parsed.length)throw Error('Ask Studio returned JSON-like content, but none of the Accelerator payloads could be repaired safely. Nothing was saved. Use Copy format follow-up and paste the reformatted response.');
 parsed.sort((a,b)=>b.score-a.score||b.start-a.start);
 const best=parsed[0];
 if(best.score<0)throw Error('Ask Studio returned structured JSON, but it does not look like this dashboard\'s analytics payload. Nothing was saved.');
 const top=parsed.filter(x=>x.score===best.score),uniqueTop=new Set(top.map(x=>JSON.stringify(x.data)));
 if(uniqueTop.size>1)throw Error('Ask Studio returned multiple conflicting Accelerator JSON objects with the same confidence. Nothing was saved. Paste only the final response or use Copy format follow-up.');
 const repairs=best.repairs.slice();
 if(found.candidates.length>1)repairs.unshift('found '+found.candidates.length+' JSON objects and selected the best matching Accelerator payload');
 if(best.start>0||best.end<found.raw.length)repairs.unshift('ignored extra text, prompt/prose, or other content outside the selected JSON object');
 return {data:best.data,repairs,raw:best.raw};
}
function metricDefs(row){
 const overall=String(row?.definitionId||'unknown');
 const knownOverall=overall&&!/unknown|unspecified|unverified/i.test(overall);
 return {
   views:knownOverall?overall:'unknown',
   engagedViews:knownOverall?overall:'unknown',
   impressions:'youtube-studio-registered-impressions-v1',
   ctr:'youtube-studio-impressions-ctr-v1',
   retention30:'youtube-studio-intro-retention-30s-v1',
   apv:'youtube-studio-average-percentage-viewed-v1',
   avdSeconds:'youtube-studio-average-view-duration-v1',
   browsePct:'youtube-studio-traffic-source-share-v1',
   suggestedPct:'youtube-studio-traffic-source-share-v1',
   searchPct:'youtube-studio-traffic-source-share-v1',
   externalPct:'youtube-studio-traffic-source-share-v1'
 };
}
function prompt(c,hours=168,now=new Date().toISOString()){return collectionPrompt(c,hours,'setup',now);}
function routinePrompt(c,hours=168,now=new Date().toISOString()){return collectionPrompt(c,hours,'update',now);}
function collectionPrompt(c,hours=168,mode='update',now=new Date().toISOString()){
 const latest=new Map();
 for(const o of c.analyticsFoundation?.observations||[]){
  if(Number(o.windowHours)!==hours)continue;
  const id=A.canonicalVideoId(o.videoId),old=latest.get(id);
  if(!old||(o.revision||0)>(old.revision||0)||(o.revision===old.revision&&o.capturedAt>old.capturedAt))latest.set(id,o);
 }
 const saved=[...latest.values()];
 const envelope={schemaVersion:1,creatorId:c.id,channelName:'ACTUAL CHANNEL',observations:[],channelPeriods:[],audienceSnapshots:[],limitations:[]};
 let task,reference='';
 if(mode==='audience'){
  task='Return the latest fully processed rolling 28-day audience snapshot. If no prior snapshot is saved, also request a comparable snapshot 28 days earlier when retrievable. Do not substitute a 90-day audience total. Record actual scope (whole channel or a supported format filter) in source. Regular viewers are a slow loyalty indicator, not a short-term conversion funnel.';
  reference='\nSAVED AUDIENCE DATES (reference only): '+JSON.stringify((c.coachOS?.analytics?.audienceSnapshots||[]).map(x=>({asOf:x.asOf||x.date,windowDays:x.windowDays||28,source:x.sourceRef||x.source})));
  envelope.audienceSnapshots=[{asOf:'YYYY-MM-DD',windowDays:28,source:'ACTUAL REPORT AND SCOPE',metricDefinitionId:'youtube-monthly-audience-28d',metrics:Object.fromEntries(audienceMetrics.map(k=>[k,null])),notes:null}];
 }else if(mode==='channel'){
  const end=new Date(Date.parse(now.slice(0,10)+'T00:00:00Z')-86400000),start=new Date(end.getTime()-89*86400000),prevEnd=new Date(start.getTime()-86400000),prevStart=new Date(prevEnd.getTime()-89*86400000);
  task='Return two completed 90-day channel reports for the exact inclusive date ranges below, using the same content and traffic filters. No per-video baselines or audience snapshots. First collect the core channel totals. THEN, as a separate required retrieval attempt for each exact 90-day range, explicitly query the Traffic source / How viewers found your content breakdown using the SAME date range, content filter and paid-traffic scope. Return browsePct, suggestedPct, searchPct and externalPct from that exact-range traffic-source report. Do not reuse lifetime, current, rolling, or differently filtered traffic percentages. Do not stop after a general channel analytics report merely because the traffic fields are absent there. If the exact-range traffic-source report is genuinely inaccessible after you explicitly try it, leave those four fields null and add a limitation naming the traffic-source report/query you attempted and why it was unavailable. Only include a new-upload versus older-library split if you can isolate videos published within versus before each period. Never infer external leads, bookings, sales or business revenue from YouTube numbers; leave those null. Record content type and paid-traffic scope in source.';
  envelope.channelPeriods=[[prevStart,prevEnd],[start,end]].map(([s,e])=>({start:s.toISOString().slice(0,10),end:e.toISOString().slice(0,10),source:'ACTUAL REPORT AND FILTERS',metricDefinitionId:'unknown',metrics:Object.fromEntries(channelMetrics.filter(k=>!audienceMetrics.includes(k)).map(k=>[k,null])),context:{paidNote:null,sourceNote:null,libraryNote:null,attributionNote:null,notes:null}}));
 }else{
  const row={videoId:'ACTUAL VIDEO ID OR URL',title:'ACTUAL TITLE',publishedAt:'ISO TIMESTAMP WITH TIMEZONE',capturedAt:'ACTUAL RETRIEVAL TIMESTAMP',windowHours:hours,format:'edited-long-form',eraId:'current',job:null,definitionId:'unknown',coverage:'unknown',paid:'unknown',traffic:'all',source:'ACTUAL REPORT AND FILTERS',metrics:Object.fromEntries(metrics.map(k=>[k,null]))};
  envelope.observations=[row];
  const inventory=checkpointInventory(c,hours),needsBackfill=inventory.complete<15,repairIds=inventory.repair.map(o=>A.canonicalVideoId(o.videoId));
  task=mode==='verify'
   ?'BASELINE VERIFY / REFRESH: Re-query and return the COMPLETE current 15-video cohort for this checkpoint, even when those videos are already saved in the dashboard. Determine eligibility first, then use the 15 most recent fully matured eligible comparable long-form videos. Re-collect the exact checkpoint measurements for all 15 rows. If a newer upload is too young, skip it and continue farther back until 15 matured eligible rows are returned. Keep ordinary flops and outliers; do not cherry-pick winners. Do not return observations:[] merely because rows are already saved. This is a deliberate full verification pass, not a new-only update. If fewer than 15 eligible comparable videos truly exist, return every eligible row and state the exact count in limitations. Do not include Shorts or live streams. Do not treat age, low performance, or ordinary topic/title variation by itself as a different strategy era. Exclude videos known to be paid/promoted when building an organic baseline; if paid status cannot be verified, keep it unknown rather than guessing. Use format "edited-long-form" and eraId "current" consistently for standard current-era long-form rows unless there is a real material change in audience, format, or channel strategy. Do not force the same cohort used by another checkpoint: 24h, 48h, 7d and 28d each use their own most recent fully matured eligible cohort.'
   :mode==='setup'
   ?'Build the starting comparison set in ONE request. First determine which long-form uploads have fully completed this checkpoint and are sufficiently processed. THEN select the 15 most recent eligible comparable long-form videos. If a newer upload is too young for this checkpoint, skip it and continue farther back until you have 15 complete eligible rows. If fewer than 15 eligible comparable long-form videos truly exist, return every eligible row and state the exact count in limitations. Keep ordinary flops and outliers; do not cherry-pick winners. Do not include Shorts or live streams. Do not treat age, low performance, or ordinary topic/title variation by itself as a different strategy era. Continue farther back until you have 15 unless there is a real material change in audience, format, or channel strategy. Do not stop with 10, 11, 12, 13 or 14 merely because newer uploads are too young; replace those ineligible newer uploads with older eligible comparable videos. Exclude videos known to be paid/promoted when building an organic baseline; if paid status cannot be verified, keep it unknown rather than guessing. Use format "edited-long-form" and eraId "current" consistently for standard current-era long-form rows unless this prompt explicitly provides a known material format or strategy-era break. Do not force the same cohort used by another checkpoint: 24h, 48h, 7d and 28d each use their own most recent fully matured eligible cohort. Accelerator excludes each target video from its own baseline.'
   :mode==='missing'
    ?'Recover missing or internally inconsistent AUTOMATABLE fields for up to 5 saved checkpoints from the reference below, prioritizing the newest. Do not chase engagedViews, retention30, or traffic-source percentages: they are optional context fields and may remain null without making the checkpoint incomplete. If the reference is empty, return observations:[] and explain that there are no automatable saved gaps for this checkpoint. Return a COMPLETE exact-window observation only if you can verify all previously saved non-null measurements as well as the newly retrieved values. Do not return a partial patch or erase known values with null. If you cannot verify the full row, describe which field and report are unavailable in limitations; leave that observation out.'
    :needsBackfill
     ?'BASELINE REPAIR / BACKFILL: The dashboard currently has '+inventory.complete+' complete usable rows out of the 15 needed for this checkpoint. '+(repairIds.length?'First re-query these saved video IDs because their checkpoint row is incomplete or internally inconsistent: '+repairIds.join(', ')+'. Return a complete corrected row for each one you can verify. ':'')+'Then add older eligible comparable videos that are not already saved until the dashboard can reach 15 complete usable rows. Search farther back as needed. Newer videos that are too young do not count toward the 15. Do not repeat already-complete saved rows. If fewer than 15 total eligible comparable videos truly exist, state the exact eligible count and why in limitations.'
     :'ROUTINE UPDATE: The 15-video cohort is already established with 15 complete usable checkpoint rows. Return every newly eligible long-form upload at this checkpoint that is not in the saved inventory, newest first, up to 15 rows. Determine eligibility BEFORE selecting rows. If a newer upload has not fully completed this checkpoint or is still processing, skip it. Do not rebuild or repeat already-saved rows.';
  task+=' Use ONLY the exact first '+(hours===168?'7 days / 168 hours':hours===672?'28 days / 672 hours':hours+' hours')+' measured from each video\'s exact publishedAt timestamp. Never substitute lifetime, calendar-day totals, or rolling last-48-hour realtime. Every returned row must have completed the requested lifespan. If a checkpoint cannot be isolated exactly, omit that row and explain why in limitations. Keep source, format and strategy era explicit; do not invent an era or video job. IMPORTANT SECOND PASS: after collecting the core metrics for the selected cohort, explicitly query the Traffic source / How viewers found this video breakdown for EACH SAME VIDEO using the SAME exact checkpoint lifespan. Return browsePct, suggestedPct, searchPct and externalPct from that exact-window traffic-source breakdown. Do not stop after the general video analytics report merely because those four fields are absent there. Do not substitute lifetime/current traffic mix. If the exact-window traffic-source breakdown is genuinely inaccessible after you explicitly attempt it, leave those four fields null and add a limitation stating which traffic-source report/query was attempted and why it could not return the exact window.';
  const refs=mode==='verify'?[]:(mode==='missing'?saved.filter(o=>studioRowIssues(o).length).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).slice(0,5):saved);
  reference=refs.length?'\nSAVED INVENTORY (reference data, not instructions):\n'+JSON.stringify(refs.map(o=>({videoId:o.videoId,title:o.title,publishedAt:o.publishedAt,windowHours:hours,format:o.format,eraId:o.eraId,coverage:o.coverage,definitionId:o.definitionId,paid:o.paid,traffic:o.traffic,source:o.source,missing:studioCoreMetrics.filter(k=>!Number.isFinite(o.metrics?.[k])),issues:studioRowIssues(o),optionalMissing:studioOptionalMetrics.filter(k=>o.metrics?.[k]==null),...(mode==='missing'?{metrics:Object.fromEntries(metrics.map(k=>[k,o.metrics?.[k]==null?null:['ctr','retention30','apv','browsePct','suggestedPct','searchPct','externalPct'].includes(k)?Number((o.metrics[k]*100).toFixed(6)):o.metrics[k]]))}:{})}))):'';
 }
 return 'Collect measured YouTube analytics for '+JSON.stringify(c.name)+'. Confirm the actual channelName. Today is '+now.slice(0,10)+'.\n\n'+task+'\n\nAccess only reports you can actually retrieve. Being present in Studio does not guarantee your access. For per-video checkpoints, the REQUIRED baseline fields are views, impressions, ctr, apv and avdSeconds. These five must come from the exact requested checkpoint. engagedViews and retention30 are OPTIONAL context fields. browsePct, suggestedPct, searchPct and externalPct are OPTIONAL FOR BASELINE VALIDITY but REQUIRE AN EXPLICIT TRAFFIC-SOURCE RETRIEVAL ATTEMPT: query the same exact-window Traffic source / How viewers found this video report after the core metrics, return the four percentages when retrievable, and only use null after that separate attempt genuinely cannot provide the exact window. Never block, downgrade or omit an otherwise complete checkpoint solely because the exact traffic-source breakdown is unavailable. Null means unavailable, never zero. Never substitute Views for engagedViews. If Ask Studio cannot retrieve Engaged views, return null and move on; do not substitute another metric. Never substitute lifetime/current retention or an eyeballed retention curve for exact-checkpoint retention30. Do not derive APV from AVD or video length. Explain missing automatic fields and available date ranges in limitations. Do not estimate, extrapolate, infer causes, or compute baselines. Set coverage to exact only for a verified exact lifespan measured from publishedAt. Views and Engaged views are separate; do not combine incompatible pre/post-August-24-2026 definitions. If the exact Views definition is verified, record it in definitionId; otherwise use unknown rather than guessing. Percentage values use 6.2 for 6.2%, and AVD uses seconds. Traffic percentages must come from the SAME exact checkpoint window and need not sum to 100 because other sources exist. For video-checkpoint requests leave channelPeriods and audienceSnapshots empty. Before returning, sanity-check cumulative counts when the same metric definition is comparable: a later checkpoint cannot have fewer Views or Impressions than an earlier checkpoint for the same video. If you detect an impossible decrease, re-query that row; if it cannot be resolved, omit it and explain the conflict in limitations. Also sanity-check each row internally: if registered impressions and CTR are clearly positive, Views must not be returned as zero; re-query that row instead of using placeholder zeros. Total Views also cannot be materially below registered impressions × CTR when all three fields come from the same exact-window report; if that happens, the fields are coming from incompatible populations, filters, or definitions, so re-query the row instead of returning it. Do not use zero to mean unavailable. If Studio can identify the Views metric definition used consistently across the returned rows, record it in definitionId; otherwise keep definitionId unknown rather than guessing.\n\nReturn one JSON object using this schema, no example values. Preserve creatorId exactly. Empty arrays plus limitations are acceptable if reports are inaccessible. Escape quotes correctly; do not add charts or SVG.\n'+JSON.stringify(envelope,null,2)+reference;
}
function formatPrompt(c,hours=168,mode='setup'){
 const packet=studioJson(collectionPrompt(c,hours,['audience','channel'].includes(mode)?mode:'setup'),c.id).data;
 if(mode==='all'){
  packet.channelPeriods=studioJson(collectionPrompt(c,hours,'channel'),c.id).data.channelPeriods;
  packet.audienceSnapshots=studioJson(collectionPrompt(c,hours,'audience'),c.id).data.audienceSnapshots;
 }
 for(const p of packet.channelPeriods){p.start='ACTUAL START DATE YYYY-MM-DD';p.end='ACTUAL END DATE YYYY-MM-DD';}
 return 'Reformat your PREVIOUS ANSWER only into the schema below. This is a formatting task, not a fresh analytics request. Preserve actual verified measurements and their actual dates, filters, units and definitions. Do not collect more videos, invent timestamps, assume exact coverage or fill missing context. A prose answer or table is acceptable as input; absent metrics become null. Percentage numbers use 6.2 for 6.2%, AVD uses seconds, watch time uses hours. Do not substitute lifetime or rolling realtime for first-age checkpoints. If required video ID, publication time, capture time or source/window cannot be verified from your answer, omit that row and explain the missing context in limitations. Preserve creatorId exactly and report the actual channelName. Return one JSON object only; empty arrays with limitations are valid.\\n'+JSON.stringify(packet,null,2);
}
function metricDefinitionFor(o,k){return o?.metricDefinitions?.[k]||o?.definitionId||'unknown';}
function materiallyLower(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&a<b&&((b-a)>=Math.max(5,b*.02));}
function materiallyDifferent(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)>=Math.max(5,Math.abs(b)*.02);}
function sameWindowConflict(store,o){
 const previous=(store.observations||[]).filter(x=>A.canonicalVideoId(x.videoId)===A.canonicalVideoId(o.videoId)&&Number(x.windowHours)===Number(o.windowHours)).sort((a,b)=>(Number(b.revision)||0)-(Number(a.revision)||0)||String(b.capturedAt||'').localeCompare(String(a.capturedAt||''))).at(0);
 if(!previous||previous.coverage!=='exact'||o.coverage!=='exact'||studioRowIssues(previous).length)return null;
 for(const k of cumulativeMetrics){
  const a=o.metrics?.[k],b=previous.metrics?.[k];if(!Number.isFinite(a)||!Number.isFinite(b))continue;
  const da=metricDefinitionFor(o,k),db=metricDefinitionFor(previous,k);
  if(!/unknown|unspecified|unverified/i.test(String(da))&&!/unknown|unspecified|unverified/i.test(String(db))&&da!==db)continue;
  if(materiallyDifferent(a,b))return {metric:k,newValue:a,oldValue:b,previousRevisionId:previous.revisionId||previous.id};
 }
 return null;
}
function monotonicConflict(store,o){
 const latest=new Map();
 for(const x of store.observations||[]){
  if(A.canonicalVideoId(x.videoId)!==A.canonicalVideoId(o.videoId)||Number(x.windowHours)===Number(o.windowHours)||x.coverage!=='exact')continue;
  const old=latest.get(Number(x.windowHours));
  if(!old||(Number(x.revision)||0)>(Number(old.revision)||0)||((Number(x.revision)||0)===(Number(old.revision)||0)&&String(x.capturedAt||'')>String(old.capturedAt||'')))latest.set(Number(x.windowHours),x);
 }
 for(const x of latest.values()){
  for(const k of cumulativeMetrics){
   const a=o.metrics?.[k],b=x.metrics?.[k];if(!Number.isFinite(a)||!Number.isFinite(b))continue;
   const da=metricDefinitionFor(o,k),db=metricDefinitionFor(x,k);
   if(!/unknown|unspecified|unverified/i.test(String(da))&&!/unknown|unspecified|unverified/i.test(String(db))&&da!==db)continue;
   if(Number(o.windowHours)>Number(x.windowHours)&&materiallyLower(a,b))return {metric:k,newHours:o.windowHours,newValue:a,oldHours:x.windowHours,oldValue:b};
   if(Number(o.windowHours)<Number(x.windowHours)&&materiallyLower(b,a))return {metric:k,newHours:o.windowHours,newValue:a,oldHours:x.windowHours,oldValue:b};
  }
 }
 return null;
}
function compactStore(store,now=new Date().toISOString()){
 const source=JSON.parse(JSON.stringify(store||A.emptyStore())),latest=new Map();
 for(const o of source.observations||[]){
  const key=o.logicalKey||JSON.stringify([o.creatorId||'',A.canonicalVideoId(o.videoId),Number(o.windowHours),o.traffic||'all',o.paid||'unknown']),old=latest.get(key);
  if(!old||(Number(o.revision)||0)>(Number(old.revision)||0)||((Number(o.revision)||0)===(Number(old.revision)||0)&&String(o.capturedAt||'')>String(old.capturedAt||'')))latest.set(key,o);
 }
 let clean=A.emptyStore();
 const observations=[...latest.values()].sort((a,b)=>String(a.publishedAt||'').localeCompare(String(b.publishedAt||''))||Number(a.windowHours)-Number(b.windowHours));
 clean=A.acceptObservations?A.acceptObservations(clean,observations,now):observations.reduce((s,o)=>A.acceptObservation(s,o,now),clean);
 for(const p of source.policies||[]){
  const input={id:p.id,creatorId:p.creatorId,label:p.label,windowHours:p.windowHours,format:p.format,eraId:p.eraId,definitionId:p.definitionId,metricDefinitions:p.metricDefinitions||{},paid:p.paid,traffic:p.traffic,primaryMetric:p.primaryMetric,cohortLimit:p.cohortLimit||15,refreshAfter:p.refreshAfter||4,refreshDays:p.refreshDays||30,job:p.job||null,allowBroaderJobFallback:p.allowBroaderJobFallback};
  try{
   const candidate=A.createPolicy(clean,input,now),last=candidate.baselines.at(-1);
   if(last?.metrics?.[input.primaryMetric]?.n>=5)clean=candidate;
  }catch{}
 }
 return clean;
}
function parse(text,c,prior,now=new Date().toISOString()){
 if(typeof text!=='string'||text.length>1500000)throw Error('Paste a response under 1.5 MB.');
 const parsedJson=studioJson(text,c.id),data=parsedJson.data,formatRepairs=parsedJson.repairs;
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Paste the complete structured response, not a single value. Nothing was saved.');
 if(data.schemaVersion!==1||data.creatorId!==c.id)throw Error('This response belongs to a different creator or prompt version. Copy a fresh prompt for the selected creator.');
 if(!data.channelName||!Array.isArray(data.observations)||data.observations.length>500)throw Error('Channel name and an observations array (at most 500 rows) are required.');
 let next=JSON.parse(JSON.stringify(prior||A.emptyStore())),added=0,duplicates=0;const groups=new Map(),seen=new Set(),reviewRows=[],importWarnings=[],acceptedInputs=[];let skipped=0;
 for(const existing of next.observations||[]){if(!existing.metricDefinitions||!Object.keys(existing.metricDefinitions).length)existing.metricDefinitions=metricDefs(existing);}
 for(const row of data.observations){
  if(!row||!windows[row.windowHours]||!row.metrics)throw Error('Each row needs a supported exact age window and metrics.');
  const clean={};for(const k of metrics){const v=row.metrics[k],isRate=['ctr','retention30','apv','browsePct','suggestedPct','searchPct','externalPct'].includes(k);if(v!==null&&v!==undefined&&(typeof v!=='number'||!Number.isFinite(v)||v<0||(isRate&&v>100)))throw Error(k+' must be a valid non-negative number or null'+(isRate?' (0–100%)':'')+'.');clean[k]=v==null?null:isRate?v/100:v;}
  const source=typeof row.source==='string'?row.source:'';if(!source.trim())throw Error('Each observation needs its actual source report.');
  const o={id:'studio:'+hash([row.videoId,row.windowHours,clean,row.capturedAt,row.definitionId,row.publishedAt,row.coverage,row.format,row.eraId,row.job,row.paid,row.traffic,source]),creatorId:c.id,videoId:row.videoId,title:String(row.title||row.videoId),publishedAt:row.publishedAt,capturedAt:row.capturedAt,windowHours:row.windowHours,format:row.format,eraId:row.eraId,job:row.job||null,definitionId:row.definitionId||'unknown',metricDefinitions:metricDefs(row),coverage:row.coverage||'unknown',paid:row.paid||'unknown',traffic:row.traffic||'all',source,metrics:clean};
  const key=A.canonicalVideoId(o.videoId)+':'+o.windowHours;if(seen.has(key))throw Error('The response contains duplicate video/window rows. Keep one report per checkpoint.');seen.add(key);
  const rowConflict=obviousStudioConflict(o);
  if(rowConflict){skipped++;importWarnings.push('Checkpoint rejected for '+o.title+' ('+o.windowHours+'h): '+rowConflict+'. Ask Studio to re-query this exact checkpoint; zero must not be used as a placeholder for unavailable data.');continue;}
  const impossible=monotonicConflict(next,o);
  if(impossible){skipped++;importWarnings.push('Checkpoint rejected for '+o.title+' ('+o.windowHours+'h): '+impossible.metric+'='+impossible.newValue+' conflicts with saved '+impossible.oldHours+'h '+impossible.metric+'='+impossible.oldValue+'. Cumulative checkpoint counts cannot materially decrease. Re-run this exact window in Ask Studio before saving it.');continue;}
  const sameWindow=sameWindowConflict(next,o);
  if(sameWindow){skipped++;importWarnings.push('Checkpoint kept unchanged for '+o.title+' ('+o.windowHours+'h): the new '+sameWindow.metric+' value '+sameWindow.newValue+' materially conflicts with the already-saved exact checkpoint value '+sameWindow.oldValue+'. Re-query the exact same report before replacing a clean historical measurement.');continue;}
  const previous=next.observations.filter(x=>A.canonicalVideoId(x.videoId)===A.canonicalVideoId(o.videoId)&&x.windowHours===o.windowHours).sort((a,b)=>(b.revision||0)-(a.revision||0)).at(0);
  const erased=previous?metrics.filter(k=>previous.metrics?.[k]!=null&&clean[k]==null):[];
  if(erased.length||!metrics.some(k=>clean[k]!=null)){skipped++;importWarnings.push('Checkpoint kept unchanged: '+o.title+' ('+o.windowHours+'h). '+(erased.length?'The reply would erase saved '+erased.join(', ')+'. Ask Studio for a complete row, or edit the specific field manually.':'No measured values were returned.'));continue;}
  const g=[c.id,o.windowHours,o.format,o.eraId,o.paid,o.traffic];groups.set(hash(g),o);
  const existing=next.observations.find(x=>x.id===o.id);
  if(existing){if(!existing.metricDefinitions||!Object.keys(existing.metricDefinitions).length)existing.metricDefinitions=o.metricDefinitions;duplicates++;continue;}
  acceptedInputs.push(o);
 }
 if(acceptedInputs.length){
  const beforeCount=next.observations.length;
  next=A.acceptObservations?A.acceptObservations(next,acceptedInputs,now):acceptedInputs.reduce((store,o)=>A.acceptObservation(store,o,now),next);
  reviewRows.push(...next.observations.slice(beforeCount));
  added=reviewRows.length;
 }
 for(const [id,o] of groups){
  const policyId='studio-policy:'+id;if(next.policies.some(p=>p.id===policyId))continue;
  const rows=next.observations.filter(x=>x.windowHours===o.windowHours&&x.format===o.format&&x.eraId===o.eraId&&x.paid===o.paid&&x.traffic===o.traffic);
  const knownDef=v=>v&&!/unknown|unspecified|unverified/i.test(String(v));
  const dominant=metric=>{const counts=new Map();for(const x of rows){if(!Number.isFinite(x.metrics?.[metric]))continue;const d=x.metricDefinitions?.[metric]||x.definitionId;if(!knownDef(d))continue;counts.set(d,(counts.get(d)||0)+1);}return [...counts.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])))[0]||[null,0];};
  const defs={...metricDefs(o)};for(const metric of metrics){const [d]=dominant(metric);if(d)defs[metric]=d;}
  const candidates=['views','impressions','engagedViews'].map((metric,priority)=>{const [definition,n]=dominant(metric);return{metric,definition,n,priority:3-priority};}).sort((a,b)=>b.n-a.n||b.priority-a.priority);
  const best=candidates[0],primaryMetric=best&&best.n>=5?best.metric:null;
  if(!primaryMetric)continue;
  const primaryDefinition=defs[primaryMetric]||best.definition||'youtube-studio-metric-specific-v1';
  const p={id:policyId,creatorId:c.id,label:o.windowHours+'h · '+o.format,windowHours:o.windowHours,format:o.format,eraId:o.eraId,definitionId:primaryDefinition,metricDefinitions:defs,paid:o.paid,traffic:o.traffic,primaryMetric,cohortLimit:15,refreshAfter:4};
  const candidate=A.createPolicy(next,p,now);if(candidate.baselines.at(-1).metrics[p.primaryMetric].n>=5)next=candidate;
 }
 const periods=[],periodWarnings=[];for(const p of data.channelPeriods||[]){try{if(!/^\d{4}-\d{2}-\d{2}$/.test(p.start)||!/^\d{4}-\d{2}-\d{2}$/.test(p.end)||(Date.parse(p.end)-Date.parse(p.start))/86400000!==89||p.end>=now.slice(0,10)||!p.source)throw Error('Channel periods must be completed 90-day ranges with a source.');const m={};for(const k of channelMetrics){const v=p.metrics?.[k];if(v!=null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||(channelRates.has(k)&&v>100)))throw Error('Invalid channel metric '+k);m[k]=v??null;}const context={};for(const k of channelContext){const v=p.context?.[k];if(v!=null&&typeof v!=='string')throw Error('Invalid channel context '+k);context[k]=v??null;}
 const outputContext=[context.notes,context.libraryNote,context.sourceNote,String(p.source||'')].filter(Boolean).join(' ');
 if(m.uploadsPublished!=null&&/includes?\s+(?:both\s+)?(?:long[- ]form\s+and\s+shorts|shorts)|both\s+long[- ]form\s+and\s+shorts|mixed\s+formats?/i.test(outputContext)){
   m.uploadsPublished=null;periodWarnings.push('Published-output count was not saved because Studio said the count included Shorts or mixed formats instead of exact long-form uploads.');
 }
 periods.push({start:p.start,end:p.end,source:String(p.source),metricDefinitionId:p.metricDefinitionId||'unknown',metrics:m,context});}catch(err){periodWarnings.push('Channel report skipped: '+err.message+' Your video checkpoint rows can still be reviewed and saved.');}}
 periods.sort((a,b)=>a.start.localeCompare(b.start));for(let i=1;i<periods.length;i++)if(periods[i-1].end>=periods[i].start)periodWarnings.push('Channel reports overlap: use care when reading changes; these are not independent periods.');
 const audienceSnapshots=[],audienceWarnings=[];for(const p of data.audienceSnapshots||[]){try{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(p.asOf)||p.asOf>=now.slice(0,10)||Number(p.windowDays)!==28||!p.source)throw Error('Audience snapshots must use a completed asOf date, windowDays 28, and a source.');
   const m={};for(const k of audienceMetrics){const v=p.metrics?.[k];if(v!=null&&(typeof v!=='number'||!Number.isFinite(v)||v<0))throw Error('Invalid audience metric '+k);m[k]=v??null;}
   audienceSnapshots.push({asOf:p.asOf,windowDays:28,source:String(p.source),metricDefinitionId:p.metricDefinitionId||'youtube-monthly-audience-28d',metrics:m,notes:p.notes==null?null:String(p.notes)});
 }catch(err){audienceWarnings.push('Audience snapshot skipped: '+err.message);}}
 audienceSnapshots.sort((a,b)=>a.asOf.localeCompare(b.asOf));
 const normalizeLimitation=x=>/engaged views.*only.*shorts/i.test(String(x))
   ?'Ask Studio could not retrieve Engaged views. YouTube retains Engaged views in Advanced Mode; use Advanced Mode/export if Ask Studio cannot access it.'
   :String(x);
 return {next,added,duplicates,skipped,reviewRows,channelName:String(data.channelName),periods,audienceSnapshots,formatRepairs,limitations:[...(data.limitations||[]).map(normalizeLimitation),...periodWarnings,...audienceWarnings,...importWarnings],signature:JSON.stringify(prior||A.emptyStore())};
}
return {prompt,routinePrompt,collectionPrompt,formatPrompt,parse,compactStore,studioJson,jsonObjectCandidates,repairJsonCandidate,studioPayloadScore,metricDefs,hash,metrics,channelMetrics,channelContext,audienceMetrics,windows,checkpointInventory,checkpointTrafficCoverage,studioRowIssues};
});
