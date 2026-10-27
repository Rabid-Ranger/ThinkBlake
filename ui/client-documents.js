/* Private PDF attachments live in Storage; only their metadata enters workspace state. */
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
  async function validate(file) {
    if (!file || !/\.pdf$/i.test(file.name)) throw new Error('Choose a PDF document.');
    if (!file.size || file.size > LIMIT) throw new Error('Choose a PDF smaller than 20 MB.');
    const head = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
    if (head !== '%PDF-') throw new Error('This file is not a valid PDF document.');
  }
  async function upload(c, wid, file, fields) {
    await validate(file);
    if (!wid || wid !== workspace()) throw new Error('Cloud workspace is still loading. Try again in a moment.');
    const id = crypto.randomUUID();
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const path = wid+'/'+encodeURIComponent(String(c.id))+'/'+id+'/'+filename;
    await request('object/'+BUCKET+'/'+objectPath(path), {method: 'POST', headers: {'Content-Type':'application/pdf','x-upsert':'false'}, body: file});
    if (wid !== workspace()) throw new Error('The workspace changed during upload. Return to the original workspace and upload again.');
    const resource = {id:'cr_'+id, label:fields.label.trim() || file.name, note:fields.note.trim(), pinned:fields.pinned, type:'PDF', storagePath:path, fileName:file.name, fileSize:file.size, createdAt:new Date().toISOString()};
    c.clientResources ||= [];
    c.clientResources.push(resource);
    bind('save')();
    return resource;
  }
  function action(r, download = false) {
    return '<button class="tinybtn" data-document-action="'+(download?'download':'view')+'" data-id="'+esc(r.id)+'">'+(download?'Download':'View PDF ↗')+'</button>';
  }
  function openResources() {
    const c = current(); if (!c) return;
    const all = c.clientResources || [];
    const rows = list => list.map(r => '<div class="v152-resource-row"><div class="v152-resource-icon">'+(r.storagePath?'PDF':'↗')+'</div><div><h4>'+esc(r.label || 'Untitled resource')+'</h4><p>'+esc(r.type || 'Other')+(r.fileSize?' · '+(r.fileSize/1024/1024).toFixed(1)+' MB':'')+(r.note?' · '+esc(r.note):'')+'</p></div><div class="actions">'+(r.storagePath?action(r)+action(r,true):'<a class="tinybtn" target="_blank" rel="noopener noreferrer" href="'+esc(bind('v152SafeUrl')(r.url)||'#')+'">Open ↗</a>')+'<button class="tinybtn" data-action="v152-edit-resource" data-id="'+esc(r.id)+'">Edit</button></div></div>').join('');
    const pinned = all.filter(r=>r.pinned), rest = all.filter(r=>!r.pinned);
    bind('openDrawer')(c.name+' · Resources', '<div class="drawer-section"><div class="v152-panel-head"><div><h3>Client resources</h3><p>Keep links and PDF documents for this creator in one place.</p></div><div class="actions"><button class="btn" data-document-action="upload">Upload PDF</button><button class="btn dark" data-action="v152-add-resource">+ Add link</button></div></div></div>'+(pinned.length?'<div class="v152-resource-group"><h3>Pinned</h3>'+rows(pinned)+'</div>':'')+'<div class="v152-resource-group"><h3>Saved resources</h3>'+(rest.length?rows(rest):'<p>No other resources saved yet.</p>')+'</div>', '<button class="btn" data-action="close-drawer">Close</button>');
  }
  let uploadContext = null, busy = false;
  function modal(r) {
    const c = current(); if (!c) return;
    uploadContext = {c, wid:workspace(), resource:r};
    bind('openModal')(r?'Edit PDF resource':'Upload PDF', '<div class="fields"><div class="field"><label for="doc-label">Label</label><input id="doc-label" value="'+esc(r?.label || '')+'"></div>'+(!r?'<div class="field"><label for="doc-file">PDF document</label><input id="doc-file" type="file" accept=".pdf,application/pdf"><p>PDF files up to 20 MB. View in a new tab or download anytime.</p></div>':'<p>'+esc(r.fileName)+'</p>')+'<div class="field"><label for="doc-note">Note</label><textarea id="doc-note">'+esc(r?.note || '')+'</textarea></div><label><input type="checkbox" id="doc-pin" '+(r?.pinned?'checked':'')+'> Pin this resource</label><p id="doc-status" role="status" aria-live="polite"></p></div>', '<button class="btn" data-action="close-modal">Cancel</button><button class="btn dark" data-document-action="save">'+(r?'Save changes':'Upload PDF')+'</button>');
  }
  async function saveDocument(button) {
    if (busy || !uploadContext) return;
    const context = uploadContext;
    const fields = {label:document.getElementById('doc-label').value, note:document.getElementById('doc-note').value, pinned:document.getElementById('doc-pin').checked};
    const file = document.getElementById('doc-file')?.files[0];
    const status = document.getElementById('doc-status');
    const cancels = [...document.querySelectorAll('[data-action="close-modal"]')];
    busy = true; button.disabled = true; cancels.forEach(b=>b.disabled=true);
    status.textContent = context.resource?'Saving…':'Uploading PDF…';
    try {
      if (context.resource) { Object.assign(context.resource, fields); bind('save')(); }
      else await upload(context.c, context.wid, file, fields);
      bind('closeModal')(); bind('render')();
      if (current() === context.c) openResources();
      bind('toast')('PDF resource saved');
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; button.disabled = false; cancels.forEach(b=>b.disabled=false); }
  }
  async function openDocument(r, download) {
    // Reserve the tab during the click so popup protection cannot block the async fetch.
    const tab = download ? null : window.open('about:blank', '_blank');
    if (!download && !tab) { bind('toast')('Allow popups to view this PDF in a new tab.'); return; }
    if (tab) { tab.opener = null; tab.document.title = r.fileName || 'Loading PDF'; tab.document.body.textContent = 'Loading PDF…'; }
    try {
      const wid = workspace();
      if (!wid || !r.storagePath.startsWith(wid+'/')) throw new Error('This document belongs to another workspace.');
      const res = await request('object/authenticated/'+BUCKET+'/'+objectPath(r.storagePath));
      const blob = new Blob([await res.arrayBuffer()], {type:'application/pdf'});
      const url = URL.createObjectURL(blob);
      if (download) { const a = document.createElement('a'); a.href=url; a.download=r.fileName || 'document.pdf'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),60000); }
      else { tab.location.replace(url); const timer = setInterval(()=>{if(tab.closed){URL.revokeObjectURL(url);clearInterval(timer);}},30000); }
    } catch (error) { tab?.close(); bind('toast')(error.message); }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-document-action], [data-action="v152-client-resources"], [data-action="v152-edit-resource"]');
    if (!b) return;
    const r = current()?.clientResources?.find(r=>r.id===b.dataset.id);
    if (b.dataset.action === 'v152-edit-resource' && !r?.storagePath) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (b.dataset.action === 'v152-client-resources') openResources();
    else if (b.dataset.action === 'v152-edit-resource') modal(r);
    else if (b.dataset.documentAction === 'upload') modal();
    else if (b.dataset.documentAction === 'save') saveDocument(b);
    else if (r?.storagePath) openDocument(r,b.dataset.documentAction === 'download');
  }, true);
  function decorate() {
    if (!current()) return;
    document.querySelectorAll('.v152-panel').forEach(panel=>{
      const manage = panel.querySelector('[data-action="v152-client-resources"]');
      if (manage && !panel.querySelector('[data-document-action="upload"]')) {
        manage.insertAdjacentHTML('beforebegin','<button class="tinybtn" data-document-action="upload">Upload PDF</button>');
        const h = panel.querySelector('h3'); if (h) h.textContent='Resources for '+current().name;
        const p = panel.querySelector('.v152-panel-head p'); if(p) p.textContent='Links and PDF documents, ready to view whenever you need them.';
      }
    });
    const all = current().clientResources || [], ordered = [...all.filter(r=>r.pinned),...all.filter(r=>!r.pinned)].slice(0,4);
    document.querySelectorAll('.v152-resource-mini').forEach((row,i)=>{
      const r = ordered[i], link = row.querySelector('.v152-open-link');
      if (r?.storagePath && link) link.outerHTML=action(r)+action(r,true);
    });
  }
  let scheduled = false;
  new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate();});}}).observe(document.documentElement,{childList:true,subtree:true});
  window.AcceleratorClientDocuments = {validate, upload, openDocument, openResources};
  // The existing link editor also reopens this drawer after saving a link.
  if (bind('v152OpenResources')) (0, eval)('v152OpenResources = window.AcceleratorClientDocuments.openResources');
  decorate();
})();
