const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../ui/client-documents.js'),'utf8');
function element(tag) {
  const handlers={},parts={};
  return {tag,children:[],open:false,textContent:'',style:{},
    appendChild(child){this.children.push(child);},replaceChildren(){this.children=[];this.textContent='';},
    querySelector(selector){return parts[selector] ||= element(selector);},
    addEventListener(event,handler){handlers[event]=handler;},
    showModal(){this.open=true;},close(){this.open=false;handlers.close?.();},click(){}
  };
}
function harness(fetch) {
  const creator = {id:'creator-a',clientResources:[]};
  const calls = [], saved = [];
  const modals=[],drawers=[],elements={};let click;
  const context = vm.createContext({
    TextDecoder, Blob, URL, crypto:require('node:crypto').webcrypto,
    window:{__acceleratorSaveDiagnostics:()=>({workspaceId:'workspace-a'})},
    localStorage:{getItem:()=>JSON.stringify({access_token:'test-token'})},
    document:{documentElement:{},head:{appendChild(){}},body:element('body'),createElement:element,addEventListener:(type,handler)=>{if(type==='click')click=handler;},querySelectorAll:()=>[],getElementById:id=>elements[id]},
    MutationObserver:class {observe(){}},
    fetch:async(...args)=>{calls.push(args);return fetch(...args);},
    creator:()=>creator,save:()=>saved.push(true),openModal:(...args)=>modals.push(args),openDrawer:(...args)=>drawers.push(args),closeModal(){},render(){},toast(){},confirm:()=>true
  });
  vm.runInContext(source,context);
  return {api:context.window.AcceleratorClientDocuments,creator,calls,saved,context,modals,drawers,elements,click:dataset=>click({target:{closest:()=>({dataset})},preventDefault(){},stopImmediatePropagation(){}})};
}
function pdf(name='guide.pdf',body='%PDF-1.7\ncontent') { const b=new Blob([body]);b.name=name;return b; }
const fields = {label:'Client guide',note:'Notes',pinned:true};
test('rejects missing, renamed invalid PDF and oversized files before upload',async()=>{
  const h=harness(()=>{throw Error('must not upload');});
  await assert.rejects(h.api.upload(h.creator,'workspace-a',null,fields),/Choose a file/);
  await assert.rejects(h.api.upload(h.creator,'workspace-a',pdf('guide.pdf','<html>'),fields),/not a valid PDF/);
  await assert.rejects(h.api.validate({name:'guide.pdf',size:21*1024*1024}),/20 MB/);
  assert.equal(h.calls.length,0);assert.equal(h.creator.clientResources.length,0);
});
test('failed cloud upload never adds a broken resource or reports it saved',async()=>{
  const h=harness(()=>({ok:false,status:400,json:async()=>({message:'Bucket not found'})}));
  await assert.rejects(h.api.upload(h.creator,'workspace-a',pdf(),fields),/not been set up/);
  assert.equal(h.creator.clientResources.length,0);assert.equal(h.saved.length,0);
});
test('successful upload saves metadata under its original creator with no PDF bytes in workspace state',async()=>{
  const h=harness(()=>({ok:true}));
  const r=await h.api.upload(h.creator,'workspace-a',pdf(),fields);
  assert.equal(h.creator.clientResources[0],r);assert.equal(h.saved.length,1);
  assert.match(r.storagePath,/^workspace-a\/creator-a\//);
  assert.equal(r.fileName,'guide.pdf');assert.equal(r.type,'PDF');assert.equal(r.pinned,true);
  assert.doesNotMatch(JSON.stringify(r),/%PDF|base64|test-token/);
  assert.equal(h.calls[0][1].headers['x-upsert'],'false');
});
test('workspace changes prevent attaching a PDF to the wrong workspace',async()=>{
  const h=harness(()=>{throw Error('must not upload');});
  await assert.rejects(h.api.upload(h.creator,'old-workspace',pdf(),fields),/still loading/);
  assert.equal(h.calls.length,0);
});
test('shared research uploads use a separate workspace folder and never attach to the current client',async()=>{
  const h=harness(()=>({ok:true})),shared={id:'_shared',clientResources:[]};
  const r=await h.api.upload(shared,'workspace-a',pdf(),fields);
  assert.match(r.storagePath,/^workspace-a\/_shared\//);assert.equal(shared.clientResources.length,1);
  assert.equal(h.creator.clientResources.length,0);assert.equal(h.saved.length,1);
  assert.doesNotMatch(JSON.stringify(r),/%PDF|test-token/);
});
test('private preview rejects references from another workspace',async()=>{
  const h=harness(()=>{throw Error('must not fetch');});
  h.context.window.open=()=>{throw Error('must not open popups');};
  await h.api.openDocument({storagePath:'other-workspace/file.pdf'},false);
  assert.equal(h.calls.length,0);
  const dialog=h.context.document.body.children[0];
  assert.match(dialog.querySelector('.client-resource-preview-body').textContent,/another workspace/);
});
test('PDF preview opens inside the dashboard without any popup and releases its URL on close',async()=>{
  const h=harness(()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode('%PDF-1.7').buffer}));
  let openedBlob,revoked='';
  h.context.window.open=()=>{throw Error('must not open popups');};
  h.context.URL={createObjectURL:blob=>{openedBlob=blob;return 'blob:test-pdf';},revokeObjectURL:url=>{revoked=url;}};
  await h.api.openDocument({storagePath:'workspace-a/creator-a/guide.pdf',fileName:'guide.pdf'},false);
  const dialog=h.context.document.body.children[0],body=dialog.querySelector('.client-resource-preview-body');
  assert.equal(dialog.open,true);assert.equal(body.children[1].tag,'iframe');assert.equal(body.children[1].src,'blob:test-pdf');
  assert.equal(openedBlob.type,'application/pdf');
  assert.match(h.calls[0][0],/object\/authenticated\/client-documents\/workspace-a/);
  assert.equal(h.calls[0][1].headers.Authorization,'Bearer test-token');
  dialog.close();assert.equal(revoked,'blob:test-pdf');
});
test('closing a loading preview prevents a stale file from reopening it',async()=>{
  let respond,created=0;
  const h=harness(()=>new Promise(resolve=>{respond=resolve;}));
  h.context.URL={createObjectURL:()=>{created++;return 'blob:test';}};
  const loading=h.api.openDocument({storagePath:'workspace-a/creator-a/guide.pdf',fileName:'guide.pdf'},false);
  h.context.document.body.children[0].close();
  respond({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});await loading;
  assert.equal(created,0);assert.equal(h.context.document.body.children[0].open,false);
});

test('signed-out uploads do not send a file or create metadata',async()=>{
  const h=harness(()=>{throw Error('must not fetch');});
  h.context.localStorage.getItem=()=>null;
  await assert.rejects(h.api.upload(h.creator,'workspace-a',pdf(),fields),/Sign in/);
  assert.equal(h.calls.length,0);assert.equal(h.creator.clientResources.length,0);
});

test('uploads arbitrary files and retains their original MIME type and name',async()=>{
  const h=harness(()=>({ok:true}));
  for(const name of ['notes.docx','budget.xlsx','archive.zip','photo.png','notes.txt','file.unknown']) {
    const file=new Blob(['example'],{type:'application/octet-stream'});file.name=name;
    const r=await h.api.upload(h.creator,'workspace-a',file,fields);
    assert.equal(r.fileName,name);assert.equal(r.contentType,'application/octet-stream');
  }
  assert.equal(h.creator.clientResources.length,6);
});
test('active formats never render as executable web documents',()=>{
  const h=harness(()=>({ok:true}));
  for(const fileName of ['page.html','icon.svg','script.js','macro.docm','file.unknown']) assert.equal(h.api.previewType({fileName}),'');
  assert.equal(h.api.previewType({fileName:'notes.txt'}),'text/plain');
  assert.equal(h.api.previewType({fileName:'photo.PNG'}),'image/png');
});
test('Add resource choices open both forms without relying on legacy private functions',()=>{
  const h=harness(()=>({ok:true}));
  h.click({action:'v152-add-resource'});assert.equal(h.modals.at(-1)[0],'Add resource');
  h.click({documentAction:'link'});assert.equal(h.modals.at(-1)[0],'Add a link');
  h.click({documentAction:'choose'});h.click({documentAction:'upload'});
  assert.equal(h.modals.at(-1)[0],'Upload a file');
});
test('saving a link updates the creator and reopens a working resources drawer',async()=>{
  const h=harness(()=>({ok:true}));
  h.click({documentAction:'link'});
  Object.assign(h.elements,{'doc-url':{value:'https://example.com/guide'},'doc-label':{value:'Guide'},'doc-note':{value:'Notes'},'doc-pin':{checked:true},'doc-status':{textContent:''}});
  h.click({documentAction:'save'});await new Promise(setImmediate);
  assert.equal(h.creator.clientResources.length,1);assert.equal(h.creator.clientResources[0].url,'https://example.com/guide');
  assert.equal(h.saved.length,1);assert.match(h.drawers.at(-1)[1],/href="https:\/\/example.com\/guide"/);
});
test('invalid and executable links cannot be saved',async()=>{
  const h=harness(()=>({ok:true}));h.click({documentAction:'link'});
  Object.assign(h.elements,{'doc-url':{value:'javascript:alert(1)'},'doc-label':{value:''},'doc-note':{value:''},'doc-pin':{checked:false},'doc-status':{textContent:''}});
  h.click({documentAction:'save'});await new Promise(setImmediate);
  assert.equal(h.creator.clientResources.length,0);assert.match(h.elements['doc-status'].textContent,/valid web link/);
  assert.equal(h.api.safeUrl('example.com'),'https://example.com/');
});
test('editing existing links uses the unified form and preserves their details',()=>{
  const h=harness(()=>({ok:true}));
  h.creator.clientResources.push({id:'existing',url:'https://example.com/',label:'Existing link',note:'Keep me',type:'Drive'});
  h.click({action:'v152-edit-resource',id:'existing'});
  assert.equal(h.modals.at(-1)[0],'Edit link resource');
  assert.match(h.modals.at(-1)[1],/Existing link/);assert.match(h.modals.at(-1)[1],/Keep me/);
});
