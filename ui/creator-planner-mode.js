(()=>{
  if(!window.__acceleratorCreatorPlannerMode||window.__acceleratorCreatorPlannerModeLoaded)return;
  window.__acceleratorCreatorPlannerModeLoaded=true;
  const ENDPOINT='https://pqggobwpazihraeqvspc.supabase.co/functions/v1/creator-portal';
  const token=new URLSearchParams(location.search).get('creatorPortalToken')||'';
  const get=n=>{try{return(0,eval)('typeof '+n+'!=="undefined"?'+n+':undefined')}catch{return undefined}};
  const set=(n,v)=>{window.__acceleratorCreatorPlannerValue=v;try{(0,eval)(n+'=window.__acceleratorCreatorPlannerValue')}finally{delete window.__acceleratorCreatorPlannerValue}};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  const merge=(target,source)=>{for(const [key,value] of Object.entries(plain(source))){if(value&&typeof value==='object'&&!Array.isArray(value)){if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key]))target[key]={};merge(target[key],value)}else target[key]=clone(value)}return target};
  const diff=(next,base)=>{if(JSON.stringify(next)===JSON.stringify(base))return undefined;if(!next||typeof next!=='object'||Array.isArray(next))return clone(next);const out={};for(const key of Object.keys(next)){const value=diff(next[key],base?.[key]);if(value!==undefined)out[key]=value}return Object.keys(out).length?out:undefined};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let doc=null,baseVideo=null,saver=null,localCreator={},lastStatus='saved',lastError='';
  async function request(body){const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error==='LINK_NOT_FOUND_OR_REVOKED'?'This video link is no longer active. Ask your coach for a new one.':data.error||'Could not load this shared video.');return data}
  function style(){if(document.getElementById('creator-planner-mode-style'))return;const s=document.createElement('style');s.id='creator-planner-mode-style';s.textContent=`
    .creator-planner-banner{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 14px;border:1px solid var(--line,#d7e0e3);border-radius:10px;background:var(--surface,#fff);margin:0 0 14px;font-size:13px}.creator-planner-banner strong{display:block}.creator-planner-banner span{display:block;color:var(--muted,#66737a);font-size:12px}.creator-planner-banner .btn{white-space:nowrap}.creator-planner-banner[data-state="ready"]{border-color:#78aa90;background:#f0f8f3}.creator-planner-banner[data-state="saving"]{opacity:.72}
    html[data-creator-planner] .v11-primary-nav,html[data-creator-planner] .nav{display:none!important}html[data-creator-planner] [data-view="home"],html[data-creator-planner] [data-view="creators"],html[data-creator-planner] [data-view="strategy"],html[data-creator-planner] [data-view="plan"],html[data-creator-planner] [data-view="videos"],html[data-creator-planner] [data-view="calendar"],html[data-creator-planner] [data-view="learn"],html[data-creator-planner] [data-view="library"],html[data-creator-planner] [data-view="framework"],html[data-creator-planner] [data-action="handoff-video"],html[data-creator-planner] [data-action="mark-published"],html[data-creator-planner] [data-action="mark-ready"]{display:none!important}
    html[data-creator-planner] .flow-side,html[data-creator-planner] .top-actions,html[data-creator-planner] [data-creator-share-video],html[data-creator-planner] .flow-top-row>.actions{display:none!important}
    html[data-creator-planner] .flow-shell{display:block!important;max-width:1100px;margin:24px auto!important}
    .creator-coach-brief{padding:20px;margin:16px 0;border:1px solid var(--line,#d7e0e3);border-radius:14px;background:var(--surface,#fff)}.creator-coach-brief summary{font-weight:800;cursor:pointer}.creator-coach-brief p{white-space:pre-wrap;line-height:1.65}.creator-coach-brief h3{font-size:14px;margin:18px 0 10px}.creator-assigned-tasks label{display:flex;gap:10px;align-items:flex-start;margin:10px 0}.creator-assigned-tasks input{width:18px;height:18px;flex:0 0 18px;margin-top:3px}.creator-feedback{border-left:3px solid #568b78;padding-left:14px}.creator-video-context{margin-top:16px}.creator-save-actions{display:flex;gap:8px;flex-wrap:wrap}.creator-step-track{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.creator-step-track button{border:1px solid var(--line,#d7e0e3);border-radius:8px;padding:8px 12px;background:var(--surface,#fff);color:var(--muted,#66737a)}.creator-step-track [aria-current]{color:var(--ink,#17212b);font-weight:800;border-color:var(--ink,#17212b)}.creator-stage-track{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));overflow:visible!important}.creator-stage-track button{white-space:normal!important}.creator-step-count{flex:1;font-size:13px;color:var(--muted,#66737a)}html[data-creator-planner] .flow-footer{position:sticky;bottom:0;background:var(--bg,#fff);padding:16px 0;z-index:5}
    @media(max-width:640px){.creator-stage-track{grid-template-columns:1fr 1fr}.creator-save-actions{width:100%}.creator-save-actions .btn{flex:1}.creator-coach-brief{padding:14px}}
    @media(max-width:640px){.creator-planner-banner{align-items:flex-start;flex-direction:column}.creator-planner-banner .btn{width:100%}}
  `;document.head.appendChild(s);document.documentElement.dataset.creatorPlanner='true'}
  function renderError(message){document.body.innerHTML='<main class="shell"><section class="page"><div class="empty-state"><h2>Video planner unavailable</h2><p>'+esc(message)+'</p></div></section></main>'}
  const STEPS=['Video goal','Why this video','Viewer','Research','Video format','Promise','Title & thumbnail','Opening','Outline','Next action','Filming plan','Publishing','Review'];
  const STAGES=[['Video brief',0,5],['Title & thumbnail',6,6],['Script',7,9],['Production',10,11],['Review',12,12]];
  function activeVideo(){return get('state')?.creators?.[0]?.videos?.[0];}
  function step(){return Math.min(12,Math.max(0,Number(activeVideo()?.flowStep)||0));}
  function stage(){return STAGES.findIndex(s=>step()>=s[1]&&step()<=s[2]);}
  function draftPayload(ready=false){
    const video=activeVideo();if(!video)return null;
    if(ready)localCreator.readyForReview=true;
    const next=clone(video),base=clone(baseVideo);
    for(const key of ['flowStep','visitedFlow']){delete next[key];delete base[key];}
    return {videos:[{id:String(baseVideo.id),creator:{...localCreator,plannerDraft:diff(next,base)||{},status:localCreator.readyForReview?'Ready for coach review':'Working in planner'}}]};
  }
  function saveDraft(ready=false,immediate=false){if(!doc||!saver)return;const payload=draftPayload(ready);if(payload)saver.enqueue(payload,ready||immediate);}
  function updateBanner(status='saved',message=''){
    lastStatus=status;lastError=message;
    const host=document.querySelector('.page');if(!host)return;
    let el=document.getElementById('creator-planner-banner');
    if(!el){el=document.createElement('div');el.id='creator-planner-banner';el.className='creator-planner-banner';host.prepend(el);}
    const labels={saving:['Saving your work…','Keep working. New edits will be saved too.'],saved:['Your draft is saved','Your coach reviews your changes before applying them.'],ready:['Sent to your coach for review','You can keep refining this video.'],error:['Your latest changes have not saved',message||'Check your connection, then choose Retry save.']};
    const pair=labels[status]||labels.saved;el.dataset.state=status;
    el.innerHTML='<div role="status" aria-live="polite"><strong>'+esc(pair[0])+'</strong><span>'+esc(pair[1])+'</span></div><div class="creator-save-actions"><button class="btn" type="button" data-creator-save>'+ (status==='error'?'Retry save':'Save now')+'</button><button class="btn dark" type="button" data-creator-send>Send for coach review</button></div>';
  }
  function coachBrief(){
    const host=document.querySelector('.page');if(!host)return;
    let el=document.getElementById('creator-coach-brief');
    if(!el){el=document.createElement('section');el.id='creator-coach-brief';el.className='creator-coach-brief';const banner=document.getElementById('creator-planner-banner');banner?.after(el);}
    const coach=doc.document.payload.videos[0].coach||{},tasks=coach.tasks||[],done=new Set(localCreator.completedTaskIds||[]);
    el.innerHTML='<details '+(step()===0?'open':'')+'><summary>Your coach’s brief</summary><p>'+esc(coach.direction||'Work through this video one step at a time. You can revisit any step before sending it for review.')+'</p>'+(tasks.length?'<div class="creator-assigned-tasks"><h3>Your next steps</h3>'+tasks.map(t=>'<label><input type="checkbox" data-creator-task="'+esc(t.id)+'" '+(done.has(t.id)?'checked':'')+'><span>'+esc(t.text)+'</span></label>').join('')+'</div>':'')+(coach.feedback?'<div class="creator-feedback"><h3>Coach feedback</h3><p>'+esc(coach.feedback)+'</p></div>':'')+'<details class="creator-video-context"><summary>Video context</summary><p><b>Goal:</b> '+esc(coach.job||activeVideo()?.job||'Not set')+'</p><p><b>Viewer:</b> '+esc(coach.viewer||activeVideo()?.promise?.viewer||'Not set')+'</p><p><b>Promise:</b> '+esc(coach.promiseResult||activeVideo()?.promise?.result||'Not set')+'</p></details></details>';
  }
  function decorate(){
    const video=activeVideo(),host=document.querySelector('.page');if(!doc||!video||!host)return;
    updateBanner(lastStatus,lastError);coachBrief();
    const track=host.querySelector('.phase-track');
    if(track){track.classList.add('creator-stage-track');track.innerHTML=STAGES.map((s,i)=>'<button type="button" class="phase-pill '+(i===stage()?'active':'')+'" data-creator-step="'+s[1]+'" '+(i===stage()?'aria-current="step"':'')+'>'+ (i+1)+'. '+s[0]+'</button>').join('');}
    const top=host.querySelector('.flow-top');
    if(top){const current=STAGES[stage()];const sub=document.createElement('nav');sub.className='creator-step-track';sub.setAttribute('aria-label','Steps in '+current[0]);sub.innerHTML=STEPS.slice(current[1],current[2]+1).map((label,i)=>'<button type="button" data-creator-step="'+(i+current[1])+'" '+(i+current[1]===step()?'aria-current="step"':'')+'>'+esc(label)+'</button>').join('');top.appendChild(sub);}
    const footer=host.querySelector('.flow-footer');
    if(footer)footer.innerHTML='<span class="creator-step-count">Step '+(step()+1)+' of '+STEPS.length+' · '+STEPS[step()]+'</span><button class="btn" type="button" data-creator-step="'+Math.max(0,step()-1)+'" '+(step()===0?'disabled':'')+'>Back</button>'+(step()===12?'<button class="btn dark" type="button" data-creator-send>Send for coach review</button>':'<button class="btn dark" type="button" data-creator-step="'+(step()+1)+'">Save & continue →</button>');
    if(step()===12){const panel=document.createElement('section');panel.className='creator-coach-brief';panel.innerHTML='<h2>Anything your coach should know?</h2><label for="creator-review-notes">Questions, decisions or help you need</label><textarea id="creator-review-notes" data-creator-note rows="5">'+esc(localCreator.notes||'')+'</textarea>';footer?.before(panel);}
  }
  function navigate(index){const v=activeVideo();if(!v)return;saveDraft();v.flowStep=Math.max(0,Math.min(12,Number(index)||0));v.visitedFlow=Math.max(v.visitedFlow||0,v.flowStep);try{sessionStorage.setItem('accelerator-creator-step:'+baseVideo.id,String(v.flowStep));}catch{}get('render')?.();window.scrollTo({top:0,behavior:'smooth'});}
  function lockNavigation(){document.addEventListener('click',event=>{const target=event.target.closest('[data-view],[data-action]');if(!target)return;const view=target.dataset.view,action=target.dataset.action;if(view&&view!=='planner'||['handoff-video','mark-published','mark-ready','add-video','delete-video','switch-creator','open-session','video-ai-context','v152-client-resources'].includes(action)){event.preventDefault();event.stopImmediatePropagation();}},true);}
  function buildState(payload){const shared=payload?.videos?.[0],coach=shared?.coach||{},flow=coach.workflow||{};const planner=coach.planner?.video?coach.planner:{creator:{id:payload.creator?.id||'',name:payload.creator?.name||'Creator',channelName:payload.creator?.channelName||'',strategy:{audience:coach.viewer||flow.brief?.viewer||''}},video:{id:shared?.id||'',title:coach.title||'Shared video',job:coach.job||flow.brief?.job||'',stage:coach.stage||'Planning',package:{workingTitle:coach.title||flow.package?.title||'',thumbnailText:coach.thumbnailText||flow.package?.thumbnailText||'',thumbnailConcept:coach.thumbnailConcept||flow.package?.thumbnailConcept||''},viewer:{problem:coach.viewer||flow.brief?.viewer||''},promise:{viewer:coach.viewer||flow.brief?.viewer||'',result:coach.promiseResult||flow.brief?.promise||''},hook:{draft:coach.hookDraft||flow.script?.hook||''},structure:{notes:coach.outlineNotes||flow.script?.outline||''},handoff:{owner:coach.handoffOwner||flow.production?.owner||'',date:coach.handoffDate||flow.production?.date||'',assets:coach.handoffAssets||flow.production?.assets||''},cta:{endDraft:coach.cta||flow.script?.cta||'',publishDate:coach.publishDate||''}}};const seed=get('seed'),normalize=get('normalize');if(typeof seed!=='function'||typeof normalize!=='function')throw new Error('The planner did not finish loading. Please refresh this page.');const state=seed();const creator=state.creators?.[0];const blank=value=>Array.isArray(value)?[]:value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,blank(v)])):typeof value==='string'?'':typeof value==='number'?0:typeof value==='boolean'?false:null;Object.assign(creator,blank(creator));merge(creator,planner.creator||{});creator.id=String(payload.creator?.id||creator.id);creator.name=payload.creator?.name||creator.name;creator.videos=[];const video=clone(planner.video);video.id=String(payload.videos?.[0]?.id||video.id);creator.videos=[video];state.currentCreatorId=creator.id;state.currentVideoId=video.id;state.view='planner';state.theme='light';return normalize(state)}
  async function boot(){
    try{
      if(!token)throw new Error('This link is incomplete. Ask your coach for a new one.');
      doc=await request({action:'portal-get',token});
      const shared=doc.document?.payload;if(!shared?.videos?.length)throw new Error('This shared video is not available.');
      const scoped=buildState(shared);baseVideo=clone(scoped.creators[0].videos[0]);
      localCreator=clone(shared.videos[0].creator||{});
      const legacy={};const put=(key,path)=>{if(typeof localCreator[key]!=='string'||!localCreator[key].trim())return;const parts=path.split('.');legacy[parts[0]] ||= {};legacy[parts[0]][parts[1]]=localCreator[key];};put('titleDraft','package.workingTitle');put('thumbnailTextDraft','package.thumbnailText');put('thumbnailConceptDraft','package.thumbnailConcept');put('hookDraft','hook.draft');put('viewerDraft','promise.viewer');put('promiseResultDraft','promise.result');put('outlineNotesDraft','structure.notes');merge(scoped.creators[0].videos[0],legacy);merge(scoped.creators[0].videos[0],localCreator.plannerDraft||{});
      delete localCreator.plannerDraft;
      scoped.creators[0].videos[0].flowStep=0;try{const saved=Number(sessionStorage.getItem('accelerator-creator-step:'+baseVideo.id));if(Number.isInteger(saved)&&saved>=0&&saved<13)scoped.creators[0].videos[0].flowStep=saved;}catch{}
      set('state',scoped);style();lockNavigation();
      saver=window.createCreatorSaveQueue({initial:draftPayload(),send:async payload=>{
        let out;
        try{out=await request({action:'portal-save',token,version:doc.document.version,payload});}
        catch(error){if(!String(error.message).includes('VERSION_CONFLICT'))throw error;doc=await request({action:'portal-get',token});out=await request({action:'portal-save',token,version:doc.document.version,payload});}
        doc.document.version=out.version;
        doc.document.payload.videos[0].creator=clone(payload.videos[0].creator);
      },onState:updateBanner});
      const render=get('render');if(typeof render!=='function')throw new Error('The planner did not finish loading. Please refresh this page.');
      set('render',function(){render();decorate();});
      lastStatus=localCreator.readyForReview?'ready':'saved';get('render')();
      document.addEventListener('input',event=>{if(event.target.matches('[data-creator-note]'))localCreator.notes=event.target.value;saveDraft();});
      document.addEventListener('change',event=>{const t=event.target;if(t.matches('[data-creator-task]')){const done=new Set(localCreator.completedTaskIds||[]);t.checked?done.add(t.dataset.creatorTask):done.delete(t.dataset.creatorTask);localCreator.completedTaskIds=[...done];}saveDraft();});
      setInterval(()=>saveDraft(),1800);
      window.addEventListener('beforeunload',event=>{if(saver.pending){event.preventDefault();event.returnValue='';}});
    }catch(error){renderError(error.message||'Could not load this shared video.');}
  }
  document.addEventListener('click',event=>{
    const t=event.target.closest('[data-creator-step],[data-creator-send],[data-creator-save]');if(!t)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(t.hasAttribute('data-creator-step'))navigate(t.dataset.creatorStep);
    else saveDraft(t.hasAttribute('data-creator-send'),true);
  },true);
  setTimeout(boot,0);
})();
