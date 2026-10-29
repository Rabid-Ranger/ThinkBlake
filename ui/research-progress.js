/* A source ledger over saved videos; it never guesses a PDF's remaining ideas. */
(function(root){
  const title=v=>String(v?.package?.finalTitle||v?.package?.workingTitle||v?.title||'').trim();
  const key=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
  function progress(client,resources,drafts=[]){
    const videos=client?.videos||[];
    return resources.map(resource=>{
      const related=drafts.filter(d=>d.payload?.sourceResourceIds?.includes(resource.resourceId));
      const relatedIds=new Set(related.map(d=>d.id));
      const saved=videos.filter(v=>v.aiSourceResourceIds?.includes(resource.resourceId)||relatedIds.has(v.aiPlanDraftId));
      const savedTitles=new Set(videos.map(v=>key(title(v))));
      const pending=related.filter(d=>d.status==='pending').flatMap(d=>d.payload.videos||[]).filter(v=>!savedTitles.has(key(v.title)));
      return {...resource,saved:saved.map(v=>({id:v.id,title:title(v),stage:v.stage||'Planning'})),pending:pending.map(v=>v.title)};
    });
  }
  const api={progress,title,key};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.AcceleratorResearchProgress=api;
})(typeof window==='object'?window:globalThis);
