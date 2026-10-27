/* Private resource files live in Storage; only metadata enters workspace state. */
(() => {
  if (window.__acceleratorCreatorPlannerMode || window.AcceleratorClientDocuments) return;
  const BASE = 'https://pqggobwpazihraeqvspc.supabase.co';
  const KEY = 'sb_publishable_VgGebMpW9tBcCiQlRdnzpA__rbATAaT';
  const BUCKET = 'client-documents', LIMIT = 20 * 1024 * 1024;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function bind(n) { try { return (0, eval)('typeof '+n+'!=="undefined"?'+n+':undefined'); } catch { return null; } }
  function current() { return bind('creator')?.(); }
  function workspace() { return window.__acceleratorSaveDiagnostics?.().workspaceId; }
  function tokenIn(v) { if (!v || typeof v !== 'object') return null; if (v.access_token) return v.access_token; return Object.values(v).map(tokenIn).find(Boolean); }
  function auth() { try { return tokenIn(JSON.parse(localStorage.getItem('sb-pqggobwpazihraeqvspc-auth-token') || 'null')); } catch { return null; } }
  async function request(path, options = {}) {
    const token = auth();
    if (!token) throw new Error('Sign in to cloud saving before using uploaded documents.');
    const res = await fetch(BASE+'/storage/v1/'+path, {...options, headers: {apikey: KEY, Authorization: 'Bearer '+token, ...options.headers}});
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (/bucket.*not found/i.test(d.message || d.error || '')) throw new Error('Document storage has not been set up yet. Please contact the workspace owner.');
      if (res.status === 401) throw new Error('Your sign-in expired. Reconnect cloud saving and try again.');
      throw new Error(d.message || d.error || 'Document request failed. Please try again.');
    }
    return res;
  }
  function objectPath(path) { return path.split('/').map(encodeURIComponent).join('/'); }
  function safeUrl(value) {
    let text=String(value || '').trim();
    if (!text || /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^https?:/i.test(text)) return '';
    if (!/^https?:\/\//i.test(text)) text='https://'+text;
    try {const url=new URL(text);return ['http:','https:'].includes(url.protocol) && url.hostname.includes('.') ? url.href : '';} catch {return '';}
  }
  function extension(name) { return String(name || '').split('.').pop().toLowerCase(); }
  function previewType(r) {
    return ({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',txt:'text/plain',csv:'text/plain',md:'text/plain',json:'text/plain',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',mp4:'video/mp4',webm:'video/webm'})[extension(r.fileName)] || '';
  }
  async function validate(file) {
    if (!file || !file.name) throw new Error('Choose a file to upload.');
    if (file.size > LIMIT) throw new Error('Choose a file no larger than 20 MB.');
    if (/\.pdf$/i.test(file.name)) {
      const head = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (head !== '%PDF-') throw new Error('This file is not a valid PDF document.');
    }
  }
  async function upload(c, wid, file, fields) {
    await validate(file);
    if (!wid || wid !== workspace()) throw new Error('Cloud workspace is still loading. Try again in a moment.');
    const id = crypto.randomUUID();
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const path = wid+'/'+encodeURIComponent(String(c.id))+'/'+id+'/'+filename;
    const contentType = file.type || 'application/octet-stream';
    await request('object/'+BUCKET+'/'+objectPath(path), {method: 'POST', headers: {'Content-Type':contentType,'x-upsert':'false'}, body: file});
    if (wid !== workspace()) throw new Error('The workspace changed during upload. Return to the original workspace and upload again.');
    const resource = {id:'cr_'+id, label:fields.label.trim() || file.name, note:fields.note.trim(), pinned:fields.pinned, type:extension(file.name).slice(0,12).toUpperCase() || 'File', contentType, storagePath:path, fileName:file.name, fileSize:file.size, createdAt:new Date().toISOString()};
    c.clientResources ||= [];
    c.clientResources.push(resource);
    bind('save')();
    return resource;
  }
  function action(r, download = false) {
    return '<button class="tinybtn" data-document-action="'+(download?'download':'view')+'" data-id="'+esc(r.id)+'">'+(download?'Download':previewType(r)?'View ↗':'Open ↗')+'</button>';
  }
  function openResources() {
    const c = current(); if (!c) return;
    const all = c.clientResources || [];
    const rows = list => list.map(r => '<div class="v152-resource-row"><div class="v152-resource-icon">'+(r.storagePath?'▤':'↗')+'</div><div><h4>'+esc(r.label || 'Untitled resource')+'</h4><p>'+esc(r.type || 'Other')+(r.fileSize?' · '+(r.fileSize/1024/1024).toFixed(1)+' MB':'')+(r.note?' · '+esc(r.note):'')+'</p></div><div class="actions client-file-actions">'+(r.storagePath?action(r)+action(r,true):'<a class="tinybtn" target="_blank" rel="noopener noreferrer" href="'+esc(safeUrl(r.url)||'#')+'">Open ↗</a>')+'<button class="tinybtn" data-action="v152-edit-resource" data-id="'+esc(r.id)+'">Edit</button></div></div>').join('');
    const pinned = all.filter(r=>r.pinned), rest = all.filter(r=>!r.pinned);
    bind('openDrawer')(c.name+' · Resources', '<div class="drawer-section"><div class="v152-panel-head"><div><h3>Client resources</h3><p>Links, documents and files for '+esc(c.name)+'.</p></div><button class="btn dark" data-document-action="choose">+ Add resource</button></div></div>'+(pinned.length?'<div class="v152-resource-group"><h3>Pinned</h3>'+rows(pinned)+'</div>':'')+'<div class="v152-resource-group"><h3>Saved resources</h3>'+(rest.length?rows(rest):all.length?'<p>No other resources saved yet.</p>':'<div class="v152-resource-empty">No resources here yet. <button class="side-action" data-document-action="choose">Add the first one →</button></div>')+'</div>', '<button class="btn" data-action="close-drawer">Close</button>');
  }
  function choose() {
    bind('openModal')('Add resource', '<p class="resource-intro">What would you like to add for '+esc(current()?.name)+'?</p><div class="resource-choices"><button class="resource-choice" data-document-action="link"><span class="resource-choice-icon" aria-hidden="true">↗</span><strong>Add a link</strong><span>A document, folder, dashboard or any web page.</span></button><button class="resource-choice" data-document-action="upload"><span class="resource-choice-icon" aria-hidden="true">↑</span><strong>Upload a file</strong><span>Documents, PDFs, images, spreadsheets and more. Up to 20 MB.</span></button></div>', '<button class="btn" data-action="close-modal">Cancel</button>');
  }
  let uploadContext = null, busy = false;
  const pinField = r => '<label class="client-resource-pin"><input type="checkbox" id="doc-pin" '+(r?.pinned?'checked':'')+'><span>Pin this resource</span></label>';
  function linkModal(r) {
    const c=current();if(!c)return;
    uploadContext={c,wid:workspace(),resource:r,kind:'link'};
    bind('openModal')(r?'Edit link resource':'Add a link','<div class="fields"><div class="field"><label for="doc-url">URL</label><input id="doc-url" type="url" placeholder="https://" value="'+esc(r?.url || '')+'"></div><div class="field"><label for="doc-label">Name</label><input id="doc-label" placeholder="What would you like to call this link?" value="'+esc(r?.label || '')+'"></div><div class="field"><label for="doc-note">Note</label><textarea id="doc-note">'+esc(r?.note || '')+'</textarea></div>'+pinField(r)+'<p id="doc-status" role="status" aria-live="polite"></p></div>',(r?'<button class="btn" data-action="close-modal">Cancel</button>':'<button class="btn" data-document-action="choose">Back</button>')+(r?'<button class="btn ghost" data-document-action="remove">Remove resource</button>':'')+'<button class="btn dark" data-document-action="save">Save link</button>');
  }
  function modal(r) {
    const c = current(); if (!c) return;
    uploadContext = {c, wid:workspace(), resource:r,kind:'file'};
    bind('openModal')(r?'Edit file resource':'Upload a file', '<div class="fields">'+(!r?'<div class="field"><label for="doc-file">File</label><input id="doc-file" type="file"><p>Any file up to 20 MB. PDFs, images and other supported formats open in your browser. Other files can be downloaded.</p></div>':'<p>'+esc(r.fileName)+'</p>')+'<div class="field"><label for="doc-label">Name (optional)</label><input id="doc-label" placeholder="Use the file name" value="'+esc(r?.label || '')+'"></div><div class="field"><label for="doc-note">Note</label><textarea id="doc-note">'+esc(r?.note || '')+'</textarea></div>'+pinField(r)+'<p id="doc-status" role="status" aria-live="polite"></p></div>', (r?'<button class="btn" data-action="close-modal">Cancel</button>':'<button class="btn" data-document-action="choose">Back</button>')+(r?'<button class="btn ghost" data-document-action="remove">Remove resource</button>':'')+'<button class="btn dark" data-document-action="save">'+(r?'Save changes':'Upload file')+'</button>');
  }
  async function saveDocument(button) {
    if (busy || !uploadContext) return;
    const context = uploadContext;
    const fields = {label:document.getElementById('doc-label').value, note:document.getElementById('doc-note').value, pinned:document.getElementById('doc-pin').checked};
    const file = document.getElementById('doc-file')?.files[0];
    const status = document.getElementById('doc-status');
    const cancels = [...document.querySelectorAll('[data-action="close-modal"], [data-document-action="choose"]')];
    busy = true; button.disabled = true; cancels.forEach(b=>b.disabled=true);
    status.textContent = context.resource?'Saving…':'Uploading file…';
    try {
      if (context.kind === 'link') {
        const url=safeUrl(document.getElementById('doc-url').value);
        if(!url) throw new Error('Enter a valid web link, such as https://example.com.');
        const r=context.resource || {id:'cr_'+crypto.randomUUID(),createdAt:new Date().toISOString(),type:'Link'};
        Object.assign(r,fields,{url,label:fields.label.trim() || new URL(url).hostname});
        if(!context.resource){context.c.clientResources ||= [];context.c.clientResources.push(r);}
        bind('save')();
      } else if (context.resource) { Object.assign(context.resource, fields); bind('save')(); }
      else await upload(context.c, context.wid, file, fields);
      bind('closeModal')(); bind('render')();
      if (String(current()?.id) === String(context.c.id)) openResources();
      bind('toast')('Resource saved');
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; button.disabled = false; cancels.forEach(b=>b.disabled=false); }
  }
  let previewDialog=null, previewUrl=null, previewGeneration=0;
  function releasePreview() {
    previewGeneration++;
    if(previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl=null;
    previewDialog?.querySelector('.client-resource-preview-body').replaceChildren();
  }
  function viewer(r) {
    if(!previewDialog) {
      previewDialog=document.createElement('dialog');
      previewDialog.className='client-resource-viewer';
      previewDialog.innerHTML='<header><h2></h2><button type="button" aria-label="Close file preview">Close</button></header><div class="client-resource-preview-body"></div>';
      previewDialog.querySelector('button').addEventListener('click',()=>previewDialog.close());
      previewDialog.addEventListener('close',releasePreview);
      document.body.appendChild(previewDialog);
    }
    releasePreview();
    previewDialog.querySelector('h2').textContent=r.label || r.fileName || 'File preview';
    const body=previewDialog.querySelector('.client-resource-preview-body');
    body.textContent='Loading file…';
    if(!previewDialog.open) previewDialog.showModal();
    return {body,generation:previewGeneration};
  }
  async function openDocument(r, download) {
    const preview=download?null:viewer(r);
    try {
      const wid = workspace();
      if (!wid || !r.storagePath.startsWith(wid+'/')) throw new Error('This document belongs to another workspace.');
      const res = await request('object/authenticated/'+BUCKET+'/'+objectPath(r.storagePath));
      const type = previewType(r);
      const blob = new Blob([await res.arrayBuffer()], {type:type || 'application/octet-stream'});
      if(preview && (preview.generation!==previewGeneration || !previewDialog.open)) return;
      const url = URL.createObjectURL(blob);
      if (download) {
        const a=document.createElement('a');a.href=url;a.download=r.fileName || 'resource';a.click();
        setTimeout(()=>URL.revokeObjectURL(url),60000);
        return;
      }
      previewUrl=url;
      const body=preview.body;
      body.replaceChildren();
      const link=document.createElement('a');link.href=url;link.download=r.fileName || 'resource';link.textContent='Download file';link.className='btn';
      body.appendChild(link);
      if(type==='text/plain') {
        const text=await blob.text();
        if(preview.generation!==previewGeneration || !previewDialog.open) return;
        const pre=document.createElement('pre');pre.textContent=text;body.appendChild(pre);
      } else if(type) {
        const tag=type==='application/pdf'?'iframe':type.startsWith('image/')?'img':type.startsWith('audio/')?'audio':'video';
        const media=document.createElement(tag);media.src=url;
        if(tag==='iframe') media.title=r.fileName || 'PDF preview';
        if(tag==='img') media.alt=r.fileName || r.label;
        if(tag==='audio'||tag==='video') media.controls=true;
        body.appendChild(media);
      } else {
        const note=document.createElement('p');note.textContent='This file is saved in your resources. Download it to open it in its app.';body.appendChild(note);
      }
    } catch (error) {
      if(preview && preview.generation===previewGeneration && previewDialog.open) preview.body.textContent=error.message;
      else if(download) bind('toast')(error.message);
    }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-document-action], [data-action="v152-client-resources"], [data-action="v152-edit-resource"], [data-action="v152-add-resource"]');
    if (!b) return;
    const r = current()?.clientResources?.find(r=>r.id===b.dataset.id);
    e.preventDefault(); e.stopImmediatePropagation();
    if (b.dataset.action === 'v152-client-resources') openResources();
    else if (b.dataset.action === 'v152-add-resource' || b.dataset.documentAction === 'choose') choose();
    else if (b.dataset.action === 'v152-edit-resource') r?.storagePath ? modal(r) : linkModal(r);
    else if (b.dataset.documentAction === 'link') linkModal();
    else if (b.dataset.documentAction === 'upload') modal();
    else if (b.dataset.documentAction === 'save') saveDocument(b);
    else if (b.dataset.documentAction === 'remove' && uploadContext?.resource && !busy) {
      const {c,resource}=uploadContext;
      if (confirm(resource.storagePath?'Remove this file from this creator’s resources? The stored file is kept.':'Remove this link from this creator’s resources?')) {
        c.clientResources=c.clientResources.filter(item=>item.id!==resource.id);
        bind('save')();bind('closeModal')();bind('render')();openResources();
      }
    }
    else if (r?.storagePath) openDocument(r,b.dataset.documentAction === 'download');
  }, true);
  function decorate() {
    if (!current()) return;
    document.querySelectorAll('.v152-panel').forEach(panel=>{
      const manage = panel.querySelector('[data-action="v152-client-resources"]');
      if (manage && !panel.dataset.resourceDecorated) {
        panel.dataset.resourceDecorated='true';
        manage.insertAdjacentHTML('beforebegin','<button class="tinybtn" data-document-action="choose">+ Add resource</button>');
        const h = panel.querySelector('h3'); if (h) h.textContent='Resources for '+current().name;
        const p = panel.querySelector('.v152-panel-head p'); if(p) p.textContent='Links, documents and files, all in one place.';
        const empty=panel.querySelector('.v152-resource-empty');
        if(empty) empty.innerHTML='No resources here yet. <button class="side-action" data-document-action="choose">Add the first one →</button>';
      }
    });
    const all = current().clientResources || [], ordered = [...all.filter(r=>r.pinned),...all.filter(r=>!r.pinned)].slice(0,4);
    document.querySelectorAll('.v152-resource-mini').forEach((row,i)=>{
      const r = ordered[i], link = row.querySelector('.v152-open-link');
      if (r?.storagePath && link) link.outerHTML='<div class="client-file-actions">'+action(r)+action(r,true)+'</div>';
    });
  }
  let scheduled = false;
  new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate();});}}).observe(document.documentElement,{childList:true,subtree:true});
  const style=document.createElement('style');
  style.textContent='.client-resource-viewer{width:min(1100px,calc(100vw - 32px));height:min(88vh,950px);max-width:none;max-height:92vh;box-sizing:border-box;border:1px solid var(--line,#ddd);border-radius:14px;padding:0;background:var(--surface,#fff);color:var(--ink,#243244)}.client-resource-viewer[open]{display:flex;flex-direction:column}.client-resource-viewer::backdrop{background:#0009}.client-resource-viewer header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 20px;border-bottom:1px solid var(--line,#ddd)}.client-resource-viewer h2{font-size:18px;margin:0;overflow-wrap:anywhere}.client-resource-viewer header button{padding:8px 14px;border:1px solid var(--line,#ddd);border-radius:8px;background:var(--surface,#fff);color:inherit;cursor:pointer}.client-resource-preview-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px;padding:16px;overflow:auto}.client-resource-preview-body>.btn{align-self:flex-start;text-decoration:none}.client-resource-preview-body iframe{width:100%;flex:1;min-height:300px;border:0}.client-resource-preview-body img,.client-resource-preview-body video{max-width:100%;min-height:0;flex:1;object-fit:contain}.client-resource-preview-body audio{width:100%}.client-resource-preview-body pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 ui-monospace,monospace}.resource-intro{color:var(--muted);margin:0 0 18px}.resource-choices{display:grid;grid-template-columns:1fr 1fr;gap:14px}.resource-choice{display:flex;flex-direction:column;align-items:flex-start;gap:10px;text-align:left;padding:22px;border:1px solid var(--line,#ddd);border-radius:14px;background:var(--surface,#fff);color:var(--ink,#243244);font:inherit;cursor:pointer}.resource-choice:hover,.resource-choice:focus-visible{border-color:var(--accent,#326ad7);outline:2px solid var(--accent,#326ad7);outline-offset:2px}.resource-choice strong{font-size:17px}.resource-choice>span:last-child{color:var(--muted);font-size:13px;line-height:1.5}.resource-choice-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:var(--soft,#eef2f6);font-size:24px}.client-resource-pin{display:flex!important;align-items:center;gap:10px;cursor:pointer}.client-resource-pin input{width:18px!important;height:18px!important;min-height:0!important;margin:0!important;flex:0 0 18px}.client-resource-pin span{font-weight:500}#doc-file::file-selector-button{padding:8px 14px;border:1px solid var(--line,#ddd);border-radius:7px;margin-right:12px;background:var(--soft,#eef2f6);color:var(--ink,#243244);font:inherit;cursor:pointer}.client-file-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.v152-resource-row>div:nth-child(2){min-width:0}.v152-resource-row h4,.v152-resource-mini b{overflow-wrap:anywhere}#doc-file{max-width:100%}@media(max-width:600px){.resource-choices{grid-template-columns:1fr}.v152-panel-head{flex-wrap:wrap}.v152-resource-row{grid-template-columns:32px minmax(0,1fr)}.v152-resource-row>.actions{grid-column:2}.v152-resource-mini{grid-template-columns:32px minmax(0,1fr)}.v152-resource-mini>.client-file-actions{grid-column:2}}';
  document.head.appendChild(style);
  window.AcceleratorClientDocuments = {validate, upload, openDocument, openResources, previewType, safeUrl};
  // The existing link editor also reopens this drawer after saving a link.
  if (bind('v152OpenResources')) (0, eval)('v152OpenResources = window.AcceleratorClientDocuments.openResources');
  decorate();
})();
