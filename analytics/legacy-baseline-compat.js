(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.AcceleratorLegacyBaselineCompat=api;if(root.document)api.install(root);}
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const METRICS=['views','engagedViews','impressions','ctr','retention30','apv','avdSeconds','browsePct','suggestedPct','searchPct','externalPct','watchSeconds','viewsFromImpressions','watchSecondsFromImpressions','endScreenRate','qualifiedLeads','bookings','purchases'];
  function metricShell(existing){
    const x=existing&&typeof existing==='object'&&!Array.isArray(existing)?existing:{};
    if(!Object.prototype.hasOwnProperty.call(x,'median'))x.median=null;
    if(!Object.prototype.hasOwnProperty.call(x,'n'))x.n=0;
    if(!Object.prototype.hasOwnProperty.call(x,'p25'))x.p25=null;
    if(!Object.prototype.hasOwnProperty.call(x,'p75'))x.p75=null;
    if(!Object.prototype.hasOwnProperty.call(x,'observationRevisionIds'))x.observationRevisionIds=[];
    return x;
  }
  function hydrateStore(store){
    if(!store||typeof store!=='object')return store;
    if(!Array.isArray(store.baselines))store.baselines=[];
    for(const baseline of store.baselines){
      if(!baseline||typeof baseline!=='object')continue;
      if(!baseline.metrics||typeof baseline.metrics!=='object'||Array.isArray(baseline.metrics))baseline.metrics={};
      for(const key of METRICS)baseline.metrics[key]=metricShell(baseline.metrics[key]);
      if(!Array.isArray(baseline.memberVideoIds))baseline.memberVideoIds=[];
      if(!Array.isArray(baseline.observationRevisionIds))baseline.observationRevisionIds=[];
    }
    return store;
  }
  function hydrateCreator(creator){
    if(!creator||typeof creator!=='object')return creator;
    if(creator.analyticsFoundation)hydrateStore(creator.analyticsFoundation);
    return creator;
  }
  function install(win){
    if(win.__acceleratorLegacyBaselineCompatV1)return;
    win.__acceleratorLegacyBaselineCompatV1=true;
    const B=win.AcceleratorDeskBridge;
    if(!B||typeof B.current!=='function')return;
    const current=B.current.bind(B);
    B.current=function(){return hydrateCreator(current());};
    try{hydrateCreator(current());}catch(_){/* compatibility guard must never block app render */}
  }
  return {METRICS,metricShell,hydrateStore,hydrateCreator,install};
});