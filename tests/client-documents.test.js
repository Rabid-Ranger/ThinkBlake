const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../ui/client-documents.js'),'utf8');
function harness(fetch) {
  const creator = {id:'creator-a',clientResources:[]};
  const calls = [], saved = [];
  const context = vm.createContext({
    TextDecoder, Blob, crypto:require('node:crypto').webcrypto,
    window:{__acceleratorSaveDiagnostics:()=>({workspaceId:'workspace-a'})},
    localStorage:{getItem:()=>JSON.stringify({access_token:'test-token'})},
    document:{documentElement:{},head:{appendChild(){}},createElement:()=>({}),addEventListener(){},querySelectorAll:()=>[]},
    MutationObserver:class {observe(){}},
    fetch:async(...args)=>{calls.push(args);return fetch(...args);},
    creator:()=>creator,save:()=>saved.push(true)
  });
  vm.runInContext(source,context);
  return {api:context.window.AcceleratorClientDocuments,creator,calls,saved,context};
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
test('private preview rejects references from another workspace and closes its reserved tab',async()=>{
  const h=harness(()=>{throw Error('must not fetch');});let closed=false,message='';
  h.context.window.open=()=>({document:{body:{}},close(){closed=true;}});
  h.context.toast=t=>{message=t;};
  await h.api.openDocument({storagePath:'other-workspace/file.pdf'},false);
  assert.equal(h.calls.length,0);assert.equal(closed,true);assert.match(message,/another workspace/);
});
test('PDF preview fetches privately and opens a PDF blob without triggering a download',async()=>{
  const h=harness(()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode('%PDF-1.7').buffer}));
  let destination='',openedBlob;
  h.context.window.open=()=>({document:{body:{}},location:{replace:url=>{destination=url;}}});
  h.context.URL={createObjectURL:blob=>{openedBlob=blob;return 'blob:test-pdf';}};
  h.context.setInterval=()=>1;
  await h.api.openDocument({storagePath:'workspace-a/creator-a/guide.pdf',fileName:'guide.pdf'},false);
  assert.equal(destination,'blob:test-pdf');assert.equal(openedBlob.type,'application/pdf');
  assert.match(h.calls[0][0],/object\/authenticated\/client-documents\/workspace-a/);
  assert.equal(h.calls[0][1].headers.Authorization,'Bearer test-token');
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
