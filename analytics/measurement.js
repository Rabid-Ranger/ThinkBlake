(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AcceleratorMeasurement = api;
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';
  const VERSION = 'measurement-1';
  const DAYS = {_24h:1, _48h:2, _7d:7, _28d:28};
  const KEYS = ['views','impressions','ctr','ret30','apv','subscribers','qualifiedLeads'];
  function number(value) {
    if (value === null || value === undefined || !['number','string'].includes(typeof value)) return null;
    if (typeof value === 'string' && !value.trim()) return null;
    const n = Number(typeof value === 'string' ? value.replace(/[$,%\s]/g,'') : value);
    return Number.isFinite(n) ? n : null;
  }
  function time(value) { const n = value ? Date.parse(value.length === 10 ? value+'T00:00:00Z' : value) : NaN; return Number.isFinite(n) ? n : null; }
  function median(values) { const a=values.map(number).filter(v=>v!==null).sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length ? (a.length%2?a[m]:(a[m-1]+a[m])/2) : null; }
  function comparison(current, reference, {label='reference', percentagePoints=false, currentDefinition, referenceDefinition}={}) {
    const a=number(current),b=number(reference),base={current:a,reference:b,label,version:VERSION};
    if (currentDefinition !== referenceDefinition) return {...base,status:'incompatible',text:'Metric definitions differ; no comparison'};
    if (a===null || b===null) return {...base,status:'missing',text:'No '+label+' comparison'};
    const delta=a-b;
    if (!percentagePoints && b<=0) return {...base,status:'zero-reference',delta,text:'Reference is zero; relative change unavailable'};
    const value=percentagePoints?delta:delta/b*100;
    return {...base,status:'ready',delta,value,text:(value>=0?'+':'')+value.toFixed(1)+(percentagePoints?' pp':'%')+' vs '+label};
  }
  function period(snapshot) {
    if (!snapshot) return null;
    const explicitStart=time(snapshot.periodStart), explicitEnd=time(snapshot.periodEndExclusive);
    if(explicitStart!==null && explicitEnd!==null && explicitEnd>explicitStart) return {start:explicitStart,end:explicitEnd,inferred:false};
    const date=time(snapshot.date),days={'90d':90,'28d':28}[snapshot.period||'90d'];
    return date!==null && days ? {start:date-(days-1)*86400000,end:date+86400000,inferred:true} : null;
  }
  function periodNote(current,reference) {
    const a=period(current),b=period(reference);
    if(!a||!b)return 'Exact period boundaries not recorded; verify the source dates.';
    const overlap=Math.max(0,Math.min(a.end,b.end)-Math.max(a.start,b.start))/86400000;
    return (overlap?'Rolling periods overlap by '+overlap+' days; trend only, not independent periods.':'Non-overlapping periods.')+((a.end-a.start)!==(b.end-b.start)?' Durations differ.':'')+(a.inferred||b.inferred?' Boundaries inferred from saved period/end date; verify the export.':'');
  }
  const publishDate = v => v?.cta?.publishDate || v?.publishDate || '';
  const job = v => v?.coachOS?.intent?.job || v?.job || '';
  function cohort(creator,set,{asOf=new Date().toISOString(),beforeDate='',excludeId='',max=20}={}) {
    const end=time(asOf),days=DAYS[set?.window],era=time(creator?.coachOS?.baseline?.context?.eraStart);
    const included=[],excluded=[];
    for(const v of creator?.videos||[]) {
      const d=v.analytics?.[set?.window]||{},published=time(publishDate(v));let reason='';
      if(!days||end===null)reason='Unsupported window or evaluation date';
      else if(v.id===excludeId)reason='Target video';
      else if(published===null)reason='Publication date missing';
      else if(era!==null&&published<era)reason='Earlier strategic era';
      else if(beforeDate&&published>=time(beforeDate))reason='Target or later publication';
      else if(published+days*86400000>end)reason='Window not mature';
      else if(d.capturedAt&&time(d.capturedAt)===null)reason='Invalid capture date';
      else if(d.capturedAt&&time(d.capturedAt)>end)reason='Evidence not yet known';
      else if(d.status&&d.status!=='observed')reason='Observation unavailable';
      else if(d.window&&d.window!==set.window)reason='Different measurement window';
      else if(set.job&&set.job!=='All'&&set.job!==job(v))reason='Different video job';
      else if(set.scopeType&&set.scopeType.toLowerCase()!==String(v.archetype||v.format||'').toLowerCase())reason='Different format';
      else if(set.lengthBand&&set.lengthBand!==v.lengthBand)reason='Length scope not verified';
      else if((set.trafficScope||d.trafficScope)&&(set.trafficScope||'unspecified')!==(d.trafficScope||'unspecified'))reason='Different or unknown traffic scope';
      else if((set.metricDefinitionId||d.metricDefinitionId)&&(set.metricDefinitionId||'legacy-unspecified')!==(d.metricDefinitionId||'legacy-unspecified'))reason='Different metric definition';
      else if(!KEYS.some(k=>number(d[k])!==null))reason='No usable measurements';
      if(reason)excluded.push({id:v.id,reason});else included.push(v);
    }
    included.sort((a,b)=>publishDate(b).localeCompare(publishDate(a))||String(a.id).localeCompare(String(b.id)));
    const selected=included.slice(0,max);
    return {videos:selected,excluded:[...excluded,...included.slice(max).map(v=>({id:v.id,reason:'Outside rolling set'}))],legacy:selected.some(v=>!v.analytics[set.window].capturedAt||!v.analytics[set.window].metricDefinitionId)};
  }
  function summarize(creator,set,options) {
    const selected=cohort(creator,set,options),metrics={};
    for(const key of KEYS){const values=selected.videos.map(v=>number(v.analytics[set.window][key])).filter(v=>v!==null);metrics[key]={n:values.length,median:median(values)};}
    return {n:selected.videos.length,sourceVideoIds:selected.videos.map(v=>v.id),sourceTitles:selected.videos.map(v=>v.package?.finalTitle||v.title||v.id),metrics,...Object.fromEntries(KEYS.map(k=>[k,metrics[k].median])),excluded:selected.excluded,provenance:selected.legacy?'Legacy window fields; capture/definition not verified':'Recorded observations',sourceObservations:selected.videos.map(v=>({videoId:v.id,window:set.window,publishDate:publishDate(v),data:JSON.parse(JSON.stringify(v.analytics[set.window]))})),calculationVersion:VERSION};
  }
  function baselineEligible(set,video,window) {
    if(!set?.confirmedComparable||set.window!==window||(!set.historicalVersion&&set.archived))return false;
    if(!video)return true;
    const date=time(publishDate(video)),from=time(set.effectiveFrom||set.refreshedAt||set.savedAt),to=time(set.effectiveTo);
    if(date===null||from===null||date<from||(to!==null&&date>=to))return false;
    if(set.sourceVideoIds?.includes(video.id))return false;
    if(set.job&&set.job!=='All'&&set.job!==job(video))return false;
    if(set.scopeType&&set.scopeType.toLowerCase()!==String(video.archetype||video.format||'').toLowerCase())return false;
    const d=video.analytics?.[window]||{};
    if(set.lengthBand&&set.lengthBand!==video.lengthBand)return false;
    if((set.trafficScope||d.trafficScope)&&(set.trafficScope||'unspecified')!==(d.trafficScope||'unspecified'))return false;
    if((set.metricDefinitionId||d.metricDefinitionId)&&(set.metricDefinitionId||'legacy-unspecified')!==(d.metricDefinitionId||'legacy-unspecified'))return false;
    return true;
  }
  function freshEvidence(creator,set,asOf) {
    const prior=new Set(set.sourceVideoIds||[]),last=time(set.refreshedAt||set.savedAt||set.effectiveFrom),days=DAYS[set.window];
    return cohort(creator,set,{asOf,max:Infinity}).videos.filter(v=>{
      if(prior.has(v.id))return false;
      const d=v.analytics[set.window],eligible=Math.max(time(publishDate(v))+days*86400000,time(d.capturedAt)||0);
      return last===null||eligible>last;
    });
  }
  function planProgress(plan,snapshot,videos=[]) {
    const key=plan.primaryMetricKey||'',start=number(plan.startingLine),current=number(snapshot?.[key]),begin=time(plan.measurementStart||plan.savedAt),end=time(snapshot?.date);
    const reps=new Set(videos.filter(v=>begin!==null&&time(publishDate(v))>=begin&&Object.values(v.coachOS?.reviews||{}).some(r=>r.savedAt&&time(r.savedAt)>=begin)).map(v=>v.id).filter(Boolean)).size;
    if(begin===null||end===null||end<=begin)return {key,start,current,status:'Awaiting first outcome measurement',detail:'Record a dated observation after this plan starts; no outcome judgment yet.',reps};
    const result=comparison(current,start,{label:'plan starting line',percentagePoints:['ctr','ret30','apv'].includes(key)});
    return {key,start,current,status:result.status==='ready'?'Outcome recorded · review decision rule':'Insufficient evidence',detail:result.text,reps,comparison:result};
  }
  return {VERSION,DAYS,KEYS,number,median,comparison,period,periodNote,publishDate,cohort,summarize,baselineEligible,freshEvidence,planProgress};
});
