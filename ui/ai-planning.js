/* ChatGPT provides the AI; Accelerator stores scoped connections and drafts. */
(() => {
  if(window.__acceleratorCreatorPlannerMode||window.AcceleratorAIPlanning)return;
  const ENDPOINT='/api/accelerator-ai',AUTH='sb-pqggobwpazihraeqvspc-auth-token';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bind=n=>{try{return(0,eval)('typeof '+n+'!=="undefined"?'+n+':undefined');}catch{return null;}};
  const app=()=>bind('state');
  const current=()=>bind('creator')?.();
  const wid=()=>window.__acceleratorSaveDiagnostics?.().workspaceId;
  function tokenIn(x,d=0){if(!x||typeof x!=='object'||d>5)return null;if(typeof x.access_token==='string')return x.access_token;return Object.values(x).map(v=>tokenIn(v,d+1)).find(Boolean);}
  function auth(){try{return tokenIn(JSON.parse(localStorage.getItem(AUTH)||'null'));}catch{return null;}}
  async function api(body,context=active) {
    const token=auth();if(!token)throw Error('Sign in to cloud saving first.');
    if(!context?.wid||!context?.cid)throw Error('Your cloud workspace is still loading. Please try again.');
    const r=await fetch(ENDPOINT+'?route=dashboard',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({workspaceId:context.wid,creatorId:context.cid,...body}),cache:'no-store'});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'The ChatGPT connection could not be reached. Please try again.');return data;
  }
  let dialog=null,active=null,overview=null,reviewing=null,busy=false,consentVerified=false;
  const params=new URLSearchParams(location.search);
  const consent=params.get('aiConsent')==='1'?Object.fromEntries(['client_id','redirect_uri','response_type','code_challenge','code_challenge_method','resource','scope','state'].map(k=>[k,params.get(k)||''])):null;
  function ensureDialog() {
    if(dialog)return;
    const style=document.createElement('style');style.textContent=`
      .ai-planning-dialog{box-sizing:border-box;width:min(1000px,calc(100vw - 28px));max-width:none;max-height:calc(100dvh - 28px);padding:0;border:1px solid var(--line,#d9dfe4);border-radius:18px;background:var(--surface,#fff);color:var(--ink,#17212b);font:14px/1.5 Inter,system-ui,sans-serif}
      .ai-planning-dialog::backdrop{background:#0009}.ai-planning-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 24px;border-bottom:1px solid var(--line,#ddd)}.ai-planning-head h2{margin:0;font-size:20px}.ai-planning-body{padding:22px 24px;overflow:auto;max-height:calc(100dvh - 170px)}.ai-planning-dialog p{line-height:1.6}.ai-planning-dialog h3{margin:24px 0 10px}.ai-planning-dialog label{display:grid;gap:5px;font-weight:650;margin:12px 0}.ai-planning-dialog input:not([type=checkbox]),.ai-planning-dialog textarea,.ai-planning-dialog select{box-sizing:border-box;width:100%;padding:10px 12px;border:1px solid var(--line,#ccd3db);border-radius:8px;background:var(--surface,#fff);color:inherit;font:inherit}.ai-planning-dialog textarea{min-height:86px;resize:vertical}.ai-planning-dialog .ai-check{display:flex;align-items:flex-start;gap:10px;font-weight:500}.ai-check input{margin-top:5px}.ai-planning-note{background:var(--soft,#f3f5f6);border-radius:12px;padding:14px 16px}.ai-planning-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.ai-draft-card{border:1px solid var(--line,#dce1e6);border-radius:12px;padding:16px;margin:14px 0}.ai-draft-card h4{margin:0;font-size:16px}.ai-draft-card p{margin:8px 0}.ai-draft-card details{margin:12px 0}.ai-draft-card summary{cursor:pointer;font-weight:650}.ai-planning-dialog a{color:inherit;text-underline-offset:3px}.ai-planning-status{white-space:pre-wrap;margin:14px 0;color:var(--muted,#5d6b76)}.ai-planning-dialog .ai-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.ai-planning-dialog .ai-grid label{margin:0}.ai-connection{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid var(--line,#ddd);padding:12px 0}.ai-step-list{padding-left:22px}.ai-step-list li{margin:8px 0}@media(max-width:650px){.ai-planning-head,.ai-planning-body{padding:16px}.ai-planning-dialog .ai-grid{grid-template-columns:1fr}}
    `;document.head.append(style);
    dialog=document.createElement('dialog');dialog.className='ai-planning-dialog';
    dialog.innerHTML='<header class="ai-planning-head"><h2 id="ai-planning-title">Plan with ChatGPT</h2><button class="btn" data-ai-action="close">Close</button></header><div class="ai-planning-body" id="ai-planning-body"></div>';
    dialog.setAttribute('aria-labelledby','ai-planning-title');document.body.append(dialog);
    dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
    dialog.addEventListener('close',()=>{if(consent)clearConsentUrl();});
    dialog.addEventListener('click',e=>{const button=e.target.closest('[data-ai-action]');if(button)void action(button.dataset.aiAction,button);});
    dialog.addEventListener('change',e=>{if(e.target.id==='ai-consent-client'){const c=app()?.creators?.find(c=>String(c.id)===e.target.value);if(c){active={wid:wid(),cid:String(c.id),c};consentVerified=false;showConsent();}}});
  }
  function body(markup){document.getElementById('ai-planning-body').innerHTML=markup;}
  function status(message){const s=document.getElementById('ai-planning-status');if(s)s.textContent=message;}
  const statusMarkup='<p id="ai-planning-status" class="ai-planning-status" role="status" aria-live="polite"></p>';
  function clearConsentUrl(){const u=new URL(location.href);for(const k of ['aiConsent','client_id','redirect_uri','response_type','code_challenge','code_challenge_method','resource','scope','state'])u.searchParams.delete(k);history.replaceState(null,'',u);}
  function capture(){const c=current();if(!c)return null;return {wid:wid(),cid:String(c.id),c};}
  async function open() {
    ensureDialog();active=capture();overview=null;reviewing=null;
    if(!dialog.open)dialog.showModal();
    if(!active){body('<p>Choose a client first.</p>');return;}
    body('<p>Loading ChatGPT connections and plan drafts for '+esc(active.c.name)+'…</p>'+statusMarkup);
    try {overview=await api({action:'overview'});showOverview();}catch(e){body('<h3>Connect your cloud workspace</h3><p>'+esc(e.message)+'</p><div class="ai-planning-actions"><button class="btn" data-ai-action="sign-in">Cloud sign-in</button><button class="btn" data-ai-action="reload">Try again</button></div>'+statusMarkup);}
  }
  function showOverview() {
    const pending=(overview?.drafts||[]).filter(d=>d.status==='pending');
    body('<p>Research and refine ideas in ChatGPT, then review them here for <strong>'+esc(active.c.name)+'</strong>.</p><div class="ai-planning-note"><strong>Uses ChatGPT for the AI</strong><p>Your ChatGPT plan and its usage limits apply. Accelerator does not call a separately billed AI API. Existing dashboard hosting and storage still apply.</p></div>'+
      '<h3>Connect this client</h3><ol class="ai-step-list"><li>Open <a href="https://chatgpt.com/plugins" target="_blank" rel="noopener noreferrer">ChatGPT Plugins ↗</a> and choose <strong>Add custom MCP server</strong>.</li><li>Name it <strong>Accelerator</strong>, paste the server address below, and choose <strong>OAuth</strong>. Use <strong>Client ID Metadata Documents (CIMD)</strong> if asked.</li><li>Connect, then choose the client and resources on Accelerator’s approval screen.</li></ol><label>Server address<input readonly value="'+esc(location.origin+ENDPOINT)+'" aria-label="Accelerator server address"></label><button class="btn" data-ai-action="copy-server">Copy server address</button><p>One connection gives access to one client. Custom plugin availability depends on your ChatGPT account and workspace settings. Your past chats remain in ChatGPT.</p>'+
      '<h3>Connected for this client</h3>'+((overview?.connections||[]).map(c=>'<div class="ai-connection"><div><strong>ChatGPT</strong><br>'+esc(c.resource_ids.length)+' selected resource'+(c.resource_ids.length===1?'':'s')+' · expires '+esc(new Date(c.expires_at).toLocaleDateString())+'</div><button class="btn" data-ai-action="disconnect" data-id="'+esc(c.id)+'">Disconnect</button></div>').join('')||'<p>No active connection yet.</p>')+
      '<h3>Plan drafts to review'+(pending.length?' · '+pending.length:'')+'</h3>'+(pending.map(d=>'<article class="ai-draft-card"><h4>'+esc(d.payload.title)+'</h4><p>'+esc(d.payload.summary)+'</p><p>'+d.payload.videos.length+' proposed videos · '+esc(new Date(d.created_at).toLocaleString())+'</p><button class="btn dark" data-ai-action="review" data-id="'+esc(d.id)+'">Review plan</button></article>').join('')||'<p>When ChatGPT sends a proposed plan, it will appear here. Nothing is added to the approved plan automatically.</p>')+
      '<details><summary>Example request for ChatGPT</summary><p id="ai-example-prompt">Use Accelerator to review the connected client’s strategy and selected resources. Preserve approved videos and call decisions. Suggest an evidence-backed Reach, Trust and Convert plan, with references, title-formula provenance, thumbnail direction, and uncertainties. Let me refine it before sending a draft to Accelerator for review.</p><button class="btn" data-ai-action="copy-prompt">Copy request</button></details><div class="ai-planning-actions"><button class="btn" data-ai-action="reload">Refresh drafts</button></div>'+statusMarkup);
  }
  async function showConsent() {
    ensureDialog();if(!dialog.open)dialog.showModal();
    const c=active?.c;if(!c)return;
    body('<h3>Allow ChatGPT to work with one client</h3><p>ChatGPT will be able to read this client’s strategy, recent coaching summaries, and existing video plan, read the resources you select, and send proposed plans for your review. It cannot apply changes to your approved videos.</p><label>Client<select id="ai-consent-client">'+(app()?.creators||[]).map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===active.cid?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label><h3>Resources ChatGPT may read</h3>'+
      ((c.clientResources||[]).map(r=>'<label class="ai-check"><input type="checkbox" name="ai-resource" value="'+esc(r.id)+'"><span><strong>'+esc(r.label||r.fileName||'Resource')+'</strong><br>'+esc(r.type||'Link')+(r.note?' · '+esc(r.note):'')+'</span></label>').join('')||'<p>No resources are saved for this client yet. You can still connect its strategy and plan.</p>')+
      '<div class="ai-planning-note">Access expires after 30 days and can be disconnected here at any time. Selected file content is shared only when ChatGPT requests it. PDFs with readable text and text/CSV/Markdown files are supported; other files may need to be attached in ChatGPT.</div><div class="ai-planning-actions"><button class="btn dark" data-ai-action="approve" disabled>Allow selected access</button><button class="btn" data-ai-action="deny">Cancel connection</button></div>'+statusMarkup);
    status('Verifying the connection request…');
    const context=active;
    try{await api({action:'consent-details',authorization:consent},context);if(active!==context)return;consentVerified=true;dialog.querySelector('[data-ai-action="approve"]').disabled=false;status('Verified request from ChatGPT. Choose the client and resources you want to share.');}
    catch(e){if(active===context)status(e.message);}
  }
  function review(id) {
    reviewing=overview.drafts.find(d=>d.id===id&&d.status==='pending');if(!reviewing)return;
    const p=reviewing.payload;
    body('<button class="btn" data-ai-action="back">← All drafts</button><h3>'+esc(p.title)+'</h3><p>'+esc(p.summary)+'</p><div class="ai-planning-note">Select the ideas you approve and fine-tune them below. This adds new videos and fills matching empty slots in the current month. Extra ideas remain in Videos. Existing videos and decisions stay intact.</div>'+
      p.videos.map((v,i)=>'<article class="ai-draft-card" data-ai-idea="'+i+'"><label class="ai-check"><input type="checkbox" name="ai-idea-include" checked><strong>Include idea '+(i+1)+'</strong></label><label>Working title<input data-ai-field="title" value="'+esc(v.title)+'"></label><div class="ai-grid"><label>Video job<select data-ai-field="job">'+['Reach','Trust','Convert'].map(j=>'<option '+(j===v.job?'selected':'')+'>'+j+'</option>').join('')+'</select></label><label>Viewer<input data-ai-field="viewer" value="'+esc(v.viewer)+'"></label></div>'+['problem','promise','rationale','thumbnail'].map(k=>'<label>'+({problem:'Viewer problem',promise:'Video promise',rationale:'Why this idea fits',thumbnail:'Thumbnail direction'}[k])+'<textarea data-ai-field="'+k+'">'+esc(v[k])+'</textarea></label>').join('')+'<details><summary>Evidence, title provenance, and uncertainty</summary><label>Title provenance<textarea data-ai-field="titleProvenance">'+esc(v.titleProvenance)+'</textarea></label><label>Uncertainty / missing evidence<textarea data-ai-field="uncertainty">'+esc(v.uncertainty)+'</textarea></label>'+(v.sources?.length?'<ul>'+v.sources.map(s=>'<li>'+(s.url?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title||s.url)+'</a>':esc(s.title))+(s.note?' — '+esc(s.note):'')+'</li>').join('')+'</ul>':'<p>No reference links supplied. Check the research before approving.</p>')+'</details></article>').join('')+
      '<div class="ai-planning-actions"><button class="btn dark" data-ai-action="apply">Add selected videos to plan</button><button class="btn" data-ai-action="reject">Reject draft</button></div>'+statusMarkup);
  }
  async function saveToCloud() {
    bind('save')();
    const start=Date.now();
    while(Date.now()-start<20000) {
      await new Promise(resolve=>setTimeout(resolve,250));
      const d=window.__acceleratorSaveDiagnostics?.();
      if(d?.syncConflict||d?.saveBlocked||d?.authRequired)throw Error('The dashboard could not confirm a cloud save. Resolve the cloud-saving notice, then retry. Your draft remains available.');
      if(d?.cloudStateLoaded&&!d.pending&&!d.saveInFlight&&!d.pendingDraft)return;
    }
    throw Error('Cloud saving is taking longer than expected. Your draft remains available; retry after the dashboard says saved.');
  }
  async function applyDraft() {
    if(!reviewing||wid()!==active.wid)throw Error('The workspace changed. Close this window and reopen the draft.');
    const c=app()?.creators?.find(c=>String(c.id)===active.cid);if(!c)throw Error('The client is no longer available.');
    const selected=[...dialog.querySelectorAll('[data-ai-idea]')].filter(card=>card.querySelector('[name="ai-idea-include"]').checked).map(card=>{
      const original=reviewing.payload.videos[Number(card.dataset.aiIdea)];const v={...original};card.querySelectorAll('[data-ai-field]').forEach(input=>v[input.dataset.aiField]=input.value.trim());return v;
    });
    if(!selected.length)throw Error('Select at least one video to add.');
    if(selected.some(v=>!v.title||!v.rationale))throw Error('Each selected video needs a working title and rationale.');
    for(const idea of selected) {
      if(c.videos.some(v=>v.aiPlanDraftId===reviewing.id&&v.aiPlanIdeaId===idea.id))continue;
      const v=bind('blankVideo')(idea.title,idea.job);v.owner=c.name;
      v.viewer.problem=idea.problem;v.promise.viewer=idea.viewer;v.promise.problem=idea.problem;v.promise.result=idea.promise;v.package.thumbnailConcept=idea.thumbnail;
      v.research.refs=idea.sources||[];v.research.notes=[idea.rationale,idea.titleProvenance?'Title provenance: '+idea.titleProvenance:'',idea.uncertainty?'Uncertainty: '+idea.uncertainty:''].filter(Boolean).join('\n\n');
      v.aiPlanDraftId=reviewing.id;v.aiPlanIdeaId=idea.id;
      const slot=(c.month?.slots||[]).find(s=>!s.videoId&&s.job===idea.job);
      if(slot){v.fromSlotId=slot.id;v.role=slot.role||'';slot.videoId=v.id;}
      c.videos.push(v);
    }
    status('Saving approved videos to your cloud workspace…');
    await saveToCloud();
    await api({action:'review',draftId:reviewing.id,status:'accepted'});
    bind('render')();overview=await api({action:'overview'});reviewing=null;showOverview();status('Selected videos were added and saved. Open Plan or Videos to continue refining them.');
  }
  async function action(name,button) {
    if(busy)return;
    if(name==='close'){dialog.close();return;}
    if(name==='sign-in'){dialog.close();window.__acceleratorOpenCloudSignIn?.();return;}
    if(name==='deny'){clearConsentUrl();dialog.close();return;}
    if(name==='back'){reviewing=null;showOverview();return;}
    if(name==='review'){review(button.dataset.id);return;}
    busy=true;button.disabled=true;
    const controls=[...dialog.querySelectorAll('button,input,textarea,select')];const previous=controls.map(x=>x.disabled);controls.forEach(x=>x.disabled=true);
    try {
      if(name==='copy-server'){await navigator.clipboard.writeText(location.origin+ENDPOINT);status('Server address copied.');}
      if(name==='copy-prompt'){await navigator.clipboard.writeText(document.getElementById('ai-example-prompt').textContent);status('Request copied.');}
      if(name==='reload'){overview=await api({action:'overview'});showOverview();}
      if(name==='disconnect'){await api({action:'disconnect',connectionId:button.dataset.id});overview=await api({action:'overview'});showOverview();status('ChatGPT access for this connection has been removed.');}
      if(name==='approve') {
        if(!consentVerified)throw Error('The connection request has not been verified.');
        const resourceIds=[...dialog.querySelectorAll('[name="ai-resource"]:checked')].map(x=>x.value);
        const data=await api({action:'approve',authorization:consent,resourceIds});
        const redirect=new URL(data.redirectUrl);if(redirect.origin!=='https://chatgpt.com')throw Error('Unexpected return address.');location.assign(redirect.href);
      }
      if(name==='apply')await applyDraft();
      if(name==='reject'){if(app()?.creators?.find(c=>String(c.id)===active.cid)?.videos?.some(v=>v.aiPlanDraftId===reviewing.id))throw Error('Videos from this draft have already been added locally. Finish saving them with Add selected videos to plan before closing this review.');await api({action:'review',draftId:reviewing.id,status:'rejected'});overview=await api({action:'overview'});reviewing=null;showOverview();status('Draft rejected. Your plan is unchanged.');}
    }catch(e){status(e.message);}finally{busy=false;controls.forEach((x,i)=>{if(x.isConnected)x.disabled=previous[i];});if(button.isConnected)button.disabled=false;}
  }
  let openingConsent=false,openedInitial=false;
  function inject() {
    const toolbar=document.querySelector('.top-actions');
    if(toolbar&&!toolbar.querySelector('[data-ai-launch]')){const button=document.createElement('button');button.className='btn ghost';button.dataset.aiLaunch='';button.textContent='ChatGPT';button.title='Plan with ChatGPT and review drafts';button.addEventListener('click',open);toolbar.insertBefore(button,toolbar.querySelector('[data-action="open-data"]'));}
    const d=window.__acceleratorSaveDiagnostics?.();
    if(!openedInitial&&consent&&!openingConsent&&d?.cloudStateLoaded&&current()) {openedInitial=true;openingConsent=true;ensureDialog();active=capture();void showConsent();}
    else if(!openedInitial&&params.get('aiPlanning')==='1'&&d?.cloudStateLoaded&&current()){openedInitial=true;void open();}
  }
  window.AcceleratorAIPlanning={open};
  if(document.body)new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});
  setInterval(()=>{if(!openedInitial&&(consent||params.get('aiPlanning')==='1'))inject();},1500);
  inject();
})();
