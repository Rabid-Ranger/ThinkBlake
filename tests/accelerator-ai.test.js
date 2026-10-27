const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
if(!global.crypto)global.crypto=webcrypto;
const source=fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/accelerator-ai/index.ts'),'utf8');
const modulePromise=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const SITE='https://accelerator-os-rho.vercel.app',RESOURCE=SITE+'/api/accelerator-ai';
const CLIENT='https://chatgpt.com/oauth/client.json',REDIRECT='https://chatgpt.com/connector_platform_oauth_redirect';
async function fixture() {
  const {createHandler}=await modulePromise;
  const tables={accelerator_ai_settings:[{id:1,owner_user_id:'u1',oauth_client_id:CLIENT}],workspace_members:[{workspace_id:'w1',user_id:'u1',role:'owner'}],workspace_states:[{workspace_id:'w1',version:7,state:{creators:[{id:'c1',name:'Client one',strategy:{goal:'Trusted growth'},videos:[{id:'v1',title:'Approved title',job:'Trust'}],clientResources:[{id:'r1',label:'Selected research',fileName:'research.txt',storagePath:'w1/c1/file/research.txt'},{id:'r2',label:'Not selected',storagePath:'w1/c1/other/secret.txt',fileName:'secret.txt'}]},{id:'c2',name:'Other client',videos:[{title:'Private other client'}]}]}}],accelerator_ai_connections:[],accelerator_ai_codes:[],accelerator_ai_drafts:[]};
  let readFiles=0,writes=[];
  const fetcher=async (input,options={})=>{
    const u=new URL(input),method=options.method||'GET';
    if(input===CLIENT)return new Response(JSON.stringify({redirect_uris:[REDIRECT]}));
    if(u.pathname==='/auth/v1/user')return options.headers.Authorization==='Bearer owner-session'?Response.json({id:'u1'}):options.headers.Authorization==='Bearer other-session'?Response.json({id:'u2'}):Response.json({}, {status:401});
    if(u.pathname.startsWith('/storage/')){readFiles++;return new Response('Research fact with a source.');}
    const table=u.pathname.split('/').pop();if(!tables[table])throw Error('Unexpected table '+table);
    let rows=tables[table].filter(row=>[...u.searchParams].every(([k,v])=>{
      if(['select','order','limit'].includes(k))return true;
      if(k==='or')return v.slice(1,-1).split(',').some(term=>{const [key,op,...rest]=term.split('.');return op==='eq'&&String(row[key])===rest.join('.');});
      const [op,...rest]=v.split('.'),value=rest.join('.');
      if(op==='eq')return String(row[k])===value;
      if(op==='is')return value==='null'&&row[k]==null;
      if(op==='gt')return row[k]>value;
      throw Error('Unhandled filter '+op);
    }));
    if(method==='DELETE'){tables[table]=tables[table].filter(r=>!rows.includes(r));writes.push([table,method]);}
    if(method==='PATCH'){const patch=JSON.parse(options.body);rows.forEach(row=>Object.assign(row,patch));writes.push([table,method]);}
    if(method==='POST'){const row={id:crypto.randomUUID(),status:'pending',created_at:new Date().toISOString(),...JSON.parse(options.body)};tables[table].push(row);rows=[row];writes.push([table,method]);}
    return Response.json(rows);
  };
  const handler=createHandler({base:'https://test.supabase.co',secret:'server-secret',fetcher});
  const request=async(route,body,token='')=>{
    const response=await handler(new Request(RESOURCE+(route?'?route='+route:''),{method:'POST',headers:{'Content-Type':'application/json',Origin:SITE,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));
    return {status:response.status,headers:response.headers,data:await response.json()};
  };
  const verifier='a'.repeat(43),challenge=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url');
  const authorization={client_id:CLIENT,redirect_uri:REDIRECT,response_type:'code',code_challenge:challenge,code_challenge_method:'S256',resource:RESOURCE,state:'state-123',scope:'accelerator:read accelerator:draft offline_access'};
  const approve=async(extra={})=>request('dashboard',{action:'approve',workspaceId:'w1',creatorId:'c1',resourceIds:['r1'],authorization,...extra},'owner-session');
  const login=async(extra={})=>{
    const approval=await approve(extra);assert.equal(approval.status,200);
    const code=new URL(approval.data.redirectUrl).searchParams.get('code');
    const exchange={grant_type:'authorization_code',code,client_id:CLIENT,redirect_uri:REDIRECT,code_verifier:verifier,resource:RESOURCE};
    const token=await request('token',exchange);assert.equal(token.status,200);
    return {...token.data,exchange};
  };
  const call=(name,args,token)=>request('',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}},token);
  return {handler,request,tables,authorization,approve,login,call,writes,get readFiles(){return readFiles;}};
}
test('OAuth discovery and public MCP discovery expose no client data',async()=>{
  const f=await fixture();const r=await f.handler(new Request(RESOURCE+'?route=oauth-metadata'));
  const metadata=await r.json();assert.equal(metadata.code_challenge_methods_supported[0],'S256');assert.equal(metadata.client_id_metadata_document_supported,true);
  const list=await f.request('',{jsonrpc:'2.0',id:1,method:'tools/list'});assert.equal(list.data.result.tools.length,6);
  const denied=await f.call('get_client_context',{},'');assert.equal(denied.status,401);assert.match(denied.headers.get('www-authenticate'),/resource_metadata/);
});
test('consent cannot select another client’s file or send codes to an unregistered destination',async()=>{
  const f=await fixture();assert.equal((await f.approve({resourceIds:['outside']})).status,400);
  assert.equal((await f.approve({authorization:{...f.authorization,redirect_uri:'https://evil.example/callback'}})).status,400);
  assert.equal(f.tables.accelerator_ai_codes.length,0);assert.equal(f.tables.accelerator_ai_connections.length,0);
});
test('authorization codes are PKCE-bound and single use; raw tokens never enter storage',async()=>{
  const f=await fixture();const approved=await f.approve();const code=new URL(approved.data.redirectUrl).searchParams.get('code');
  const body={grant_type:'authorization_code',code,client_id:CLIENT,redirect_uri:REDIRECT,code_verifier:'b'.repeat(43)};
  assert.equal((await f.request('token',body)).status,400);assert.equal(f.tables.accelerator_ai_codes.length,1);
  body.code_verifier='a'.repeat(43);const token=await f.request('token',body);assert.equal(token.status,200);
  assert.equal((await f.request('token',body)).status,400);
  const stored=JSON.stringify(f.tables);assert.ok(!stored.includes(code));assert.ok(!stored.includes(token.data.access_token));assert.ok(!stored.includes(token.data.refresh_token));
});
test('read tools stay with the authorized client and explicitly selected resources',async()=>{
  const f=await fixture(),token=await f.login();
  const context=await f.call('get_client_context',{},token.access_token);const value=JSON.parse(context.data.result.content[0].text);
  assert.equal(value.creator.id,'c1');assert.equal(value.resources.length,1);assert.equal(value.resources[0].id,'r1');assert.ok(!JSON.stringify(value).includes('Private other client'));assert.ok(!JSON.stringify(value).includes('storagePath'));
  const denied=await f.call('read_resource',{resourceId:'r2'},token.access_token);assert.equal(denied.data.result.isError,true);assert.equal(f.readFiles,0);
  const allowed=await f.call('read_resource',{resourceId:'r1'},token.access_token);assert.match(allowed.data.result.content[0].text,/Research fact/);assert.equal(f.readFiles,1);
});
test('draft submission is idempotent and cannot change approved videos or workspace state',async()=>{
  const f=await fixture(),token=await f.login(),before=JSON.stringify(f.tables.workspace_states);
  const args={requestId:'draft-request-1',plan:{title:'Candidate plan',sourceResourceIds:['r1'],videos:[{title:'Candidate video',job:'Reach',rationale:'Evidence from selected resource',sources:[{title:'Example',url:'javascript:alert(1)',note:'Unsafe URLs removed'}]}]}};
  const first=await f.call('submit_plan_draft',args,token.access_token);assert.equal(first.data.result.isError,false);
  const second=await f.call('submit_plan_draft',args,token.access_token);assert.equal(second.data.result.isError,false);
  assert.equal(f.tables.accelerator_ai_drafts.length,1);assert.equal(f.tables.accelerator_ai_drafts[0].status,'pending');assert.equal(f.tables.accelerator_ai_drafts[0].payload.videos[0].sources[0].url,'');
  assert.equal(JSON.stringify(f.tables.workspace_states),before);assert.ok(!f.writes.some(([name])=>name==='workspace_states'));
  args.plan.sourceResourceIds=['r2'];assert.equal((await f.call('submit_plan_draft',args,token.access_token)).data.result.isError,true);
});
test('refresh rotation invalidates the previous tokens and disconnect immediately denies access',async()=>{
  const f=await fixture(),token=await f.login();
  const refresh={grant_type:'refresh_token',client_id:CLIENT,refresh_token:token.refresh_token};
  const rotated=await f.request('token',refresh);assert.equal(rotated.status,200);assert.equal((await f.request('token',refresh)).status,400);
  assert.equal((await f.call('get_client_context',{},token.access_token)).status,401);
  assert.equal((await f.call('get_client_context',{},rotated.data.access_token)).status,200);
  await f.request('dashboard',{action:'disconnect',workspaceId:'w1',creatorId:'c1',connectionId:f.tables.accelerator_ai_connections[0].id},'owner-session');
  assert.equal((await f.call('get_client_context',{},rotated.data.access_token)).status,401);
});
test('expired grants and removed workspace membership deny existing connections',async()=>{
  const f=await fixture(),token=await f.login();
  f.tables.accelerator_ai_connections[0].expires_at='2000-01-01T00:00:00Z';assert.equal((await f.call('get_client_context',{},token.access_token)).status,401);
  f.tables.accelerator_ai_connections[0].expires_at='2099-01-01T00:00:00Z';f.tables.workspace_members=[];
  assert.equal((await f.call('get_client_context',{},token.access_token)).status,403);
});
test('untrusted browser origins cannot create a consent grant',async()=>{
  const f=await fixture();const r=await f.handler(new Request(RESOURCE+'?route=dashboard',{method:'POST',headers:{Origin:'https://evil.example',Authorization:'Bearer owner-session'},body:JSON.stringify({action:'approve'})}));assert.equal(r.status,403);assert.equal(f.tables.accelerator_ai_connections.length,0);
});
test('workspace consent exposes every current client and new resources while requiring an explicit target',async()=>{
  const f=await fixture(),token=await f.login({accessScope:'workspace'});
  const conn=f.tables.accelerator_ai_connections[0];assert.equal(conn.creator_id,'*');assert.deepEqual(conn.resource_ids,['*']);
  const clients=JSON.parse((await f.call('list_clients',{},token.access_token)).data.result.content[0].text);assert.equal(clients.clients.length,2);
  assert.equal((await f.call('get_client_context',{},token.access_token)).data.result.isError,true);
  const second=JSON.parse((await f.call('get_client_context',{creatorId:'c2'},token.access_token)).data.result.content[0].text);assert.equal(second.creator.id,'c2');
  const first=f.tables.workspace_states[0].state.creators[0];first.clientResources.push({id:'new-resource',label:'Added after connecting',fileName:'new.txt',storagePath:'w1/c1/new/new.txt'});
  const context=JSON.parse((await f.call('get_client_context',{creatorId:'c1'},token.access_token)).data.result.content[0].text);assert.equal(context.resources.length,3);
  assert.equal((await f.call('read_resource',{creatorId:'c1',resourceId:'new-resource'},token.access_token)).data.result.isError,false);
  const overview=await f.request('dashboard',{action:'overview',workspaceId:'w1',creatorId:'c2'},'owner-session');assert.equal(overview.data.connections.length,1);
});
test('client-specific grants never expand and workspace access stays inside the authorized workspace',async()=>{
  const f=await fixture(),one=await f.login();
  const names=JSON.parse((await f.call('list_clients',{},one.access_token)).data.result.content[0].text);assert.equal(names.clients.length,1);
  assert.equal((await f.call('get_client_context',{creatorId:'c2'},one.access_token)).data.result.isError,true);
  const all=await f.login({accessScope:'workspace'});
  assert.equal((await f.call('get_client_context',{creatorId:'another-workspace-client'},all.access_token)).data.result.isError,true);
  f.tables.workspace_states[0].state.creators[0].clientResources[0].storagePath='different-workspace/c1/private.txt';
  assert.equal((await f.call('read_resource',{creatorId:'c1',resourceId:'r1'},all.access_token)).data.result.isError,true);assert.equal(f.readFiles,0);
});
test('workspace-wide drafts are attached to the chosen client and retries cannot mix clients',async()=>{
  const f=await fixture(),token=await f.login({accessScope:'workspace'});
  const args={creatorId:'c2',requestId:'client-two-draft',plan:{videos:[{title:'Client two idea',job:'Trust',rationale:'Specific to client two'}]}};
  assert.equal((await f.call('submit_plan_draft',args,token.access_token)).data.result.isError,false);
  assert.equal(f.tables.accelerator_ai_drafts[0].creator_id,'c2');
  args.creatorId='c1';assert.equal((await f.call('submit_plan_draft',args,token.access_token)).data.result.isError,true);
  const rejected=await f.approve({resourceIds:['*']});assert.equal(rejected.status,400);
});
test('another authenticated workspace editor cannot use or authorize the private plugin',async()=>{
  const f=await fixture();f.tables.workspace_members.push({workspace_id:'w1',user_id:'u2',role:'editor'});
  const r=await f.request('dashboard',{action:'approve',workspaceId:'w1',creatorId:'c1',resourceIds:['r1'],authorization:f.authorization},'other-session');
  assert.equal(r.status,403);assert.equal(f.tables.accelerator_ai_connections.length,0);
  const token=await f.login();f.tables.accelerator_ai_connections[0].user_id='u2';
  assert.equal((await f.call('list_clients',{},token.access_token)).status,403);
});
test('missing owner settings fail closed and another OAuth app cannot reuse this owner',async()=>{
  const f=await fixture();f.tables.accelerator_ai_settings[0].oauth_client_id='another-app';
  assert.equal((await f.approve()).status,403);assert.equal(f.tables.accelerator_ai_codes.length,0);
  f.tables.accelerator_ai_settings=[];assert.equal((await f.approve()).status,403);
});
test('shared research is available across clients while file paths stay inside the shared folder',async()=>{
  const f=await fixture(),token=await f.login({accessScope:'workspace'});
  f.tables.workspace_states[0].state.workspaceResources=[{id:'shared-1',label:'Common framework',fileName:'framework.txt',storagePath:'w1/_shared/file/framework.txt'}];
  const list=await f.call('list_workspace_resources',{},token.access_token);assert.equal(JSON.parse(list.data.result.content[0].text).resources.length,1);
  const read=await f.call('read_resource',{resourceId:'shared-1',resourceScope:'workspace'},token.access_token);assert.equal(read.data.result.isError,false);
  const context=await f.call('get_client_context',{creatorId:'c2'},token.access_token);assert.equal(JSON.parse(context.data.result.content[0].text).workspaceResources[0].id,'shared-1');
  const draft=await f.call('submit_plan_draft',{creatorId:'c2',requestId:'shared-source-draft',plan:{sourceResourceIds:['shared-1'],videos:[{title:'Idea using a shared framework',job:'Trust',rationale:'From shared source'}]}},token.access_token);assert.equal(draft.data.result.isError,false);
  f.tables.workspace_states[0].state.workspaceResources[0].storagePath='w1/c1/private/research.txt';
  assert.equal((await f.call('read_resource',{resourceId:'shared-1',resourceScope:'workspace'},token.access_token)).data.result.isError,true);
});
test('a client-only grant does not inherit shared library access',async()=>{
  const f=await fixture(),token=await f.login();
  assert.equal((await f.call('list_workspace_resources',{},token.access_token)).data.result.isError,true);
  assert.equal((await f.call('read_resource',{resourceId:'shared-1',resourceScope:'workspace'},token.access_token)).data.result.isError,true);
});
test('Word extraction preserves text while excluding macros and document instructions',async()=>{
  const {officeText}=await modulePromise;const encode=s=>new TextEncoder().encode(s);
  const result=officeText({'word/document.xml':encode('<w:document><w:p><w:r><w:t>First &amp; useful</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p></w:document>'),'word/vbaProject.bin':encode('never execute')},'docx');
  assert.match(result[0],/First & useful\nSecond paragraph/);assert.ok(!result[0].includes('never execute'));
});
test('Excel extraction keeps sheet names, cell references and cached values without evaluating formulas',async()=>{
  const {officeText}=await modulePromise;const encode=s=>new TextEncoder().encode(s);
  const result=officeText({'xl/workbook.xml':encode('<workbook><sheets><sheet name="Research &amp; evidence" r:id="rId1"/></sheets></workbook>'),'xl/_rels/workbook.xml.rels':encode('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),'xl/sharedStrings.xml':encode('<sst><si><t>Video title</t></si></sst>'),'xl/worksheets/sheet1.xml':encode('<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1"><f>2+2</f><v>4</v></c><c r="C1"><f>HYPERLINK("https://evil.test")</f></c></row></sheetData></worksheet>')},'xlsx');
  assert.match(result[0],/Research & evidence/);assert.match(result[0],/A1: Video title/);assert.match(result[0],/B1: 4/);assert.match(result[0],/cached value/);assert.ok(!result[0].includes('evil.test'));
});

test('planning context includes capacity, roadmap and commitments; selected video includes the actual script fields',async()=>{
  const f=await fixture(),token=await f.login(),c=f.tables.workspace_states[0].state.creators[0];
  Object.assign(c,{capacity:{videosPerMonth:2},roadmap:{destination:'Qualified viewers'},commitments:[{what:'Film the approved video',who:'Client',when:'Friday'}]});
  Object.assign(c.videos[0],{hook:{draft:'The approved opening'},structure:{notes:'Evidence then demonstration'},cta:{endDraft:'Watch the next lesson'},handoff:{owner:'Client'},package:{thumbnailConcept:'One clear comparison',storagePath:'private/file',accessToken:'hidden'},script:'Actual script text'});
  const before=JSON.stringify(f.tables.workspace_states);
  const r=await f.call('get_client_context',{videoId:'v1'},token.access_token),v=JSON.parse(r.data.result.content[0].text);
  assert.equal(v.creator.capacity.videosPerMonth,2);assert.equal(v.creator.roadmap.destination,'Qualified viewers');assert.equal(v.commitments[0].who,'Client');
  assert.equal(v.selectedVideo.hook.draft,'The approved opening');assert.equal(v.selectedVideo.script,'Actual script text');assert.equal(v.selectedVideo.cta.endDraft,'Watch the next lesson');
  assert.ok(!JSON.stringify(v).includes('private/file'));assert.ok(!JSON.stringify(v).includes('hidden'));assert.equal(JSON.stringify(f.tables.workspace_states),before);
  assert.equal((await f.call('get_client_context',{videoId:'another-client-video'},token.access_token)).data.result.isError,true);
});

test('large plans are paged so later videos remain accessible without sending every script',async()=>{
  const f=await fixture(),token=await f.login(),c=f.tables.workspace_states[0].state.creators[0];
  c.videos=Array.from({length:45},(_,i)=>({id:'v'+i,title:'Video '+i,hook:{draft:'Long script '+i}}));
  const first=JSON.parse((await f.call('get_client_context',{},token.access_token)).data.result.content[0].text);
  assert.equal(first.videos.length,20);assert.equal(first.videoPage.nextOffset,20);assert.equal(first.videoPage.total,45);assert.equal(first.selectedVideo,null);assert.ok(!JSON.stringify(first).includes('Long script'));
  const last=JSON.parse((await f.call('get_client_context',{videoOffset:40},token.access_token)).data.result.content[0].text);
  assert.equal(last.videos[0].id,'v40');assert.equal(last.videoPage.nextOffset,null);
  assert.equal((await f.call('get_client_context',{videoLimit:1000},token.access_token)).data.result.isError,true);
});

test('saved analytics preserve exact windows, units, missing values and revisions, with no data writes',async()=>{
  const f=await fixture(),token=await f.login(),c=f.tables.workspace_states[0].state.creators[0];
  c.analyticsFoundation={observations:[{id:'o1',revisionId:'rev1',creatorId:'c1',videoId:'yt1',internalVideoId:'v1',windowHours:168,capturedAt:'2026-10-20T00:00:00Z',coverage:'exact',definitionId:'unknown',paid:'organic',source:'Actual source report',metrics:{views:123,engagedViews:null,ctr:0.062,apv:1.12,retention30:null}}, {id:'o2',creatorId:'c1',videoId:'yt1',internalVideoId:'v1',windowHours:24,metrics:{views:50}}, {id:'private',creatorId:'c2',videoId:'private-video',windowHours:168,metrics:{views:999999}}]};
  const before=JSON.stringify(f.tables.workspace_states),writes=f.writes.length;
  const r=await f.call('get_client_analytics',{section:'observations',videoId:'v1',windowHours:168},token.access_token),v=JSON.parse(r.data.result.content[0].text);
  assert.equal(v.total,1);assert.equal(v.items[0].metrics.engagedViews,null);assert.equal(v.items[0].metrics.ctr,0.062);assert.equal(v.items[0].metrics.apv,1.12);assert.equal(v.items[0].units.ctr,'ratio');assert.equal(v.items[0].definitionId,'unknown');assert.equal(v.items[0].source,'Actual source report');assert.equal(v.items[0].revisionId,'rev1');
  assert.ok(!JSON.stringify(v).includes('private-video'));assert.equal(JSON.stringify(f.tables.workspace_states),before);assert.equal(f.writes.length,writes);
});

test('baseline cohorts and channel/audience windows stay separate from native manual percentages',async()=>{
  const f=await fixture(),token=await f.login(),c=f.tables.workspace_states[0].state.creators[0];
  c.analyticsFoundation={policies:[{id:'p1',windowHours:168,definitionId:'known',format:'edited-long-form'}],baselines:[{id:'b1',policyId:'p1',kind:'operating',effectiveAt:'2026-10-20T00:00:00Z',memberVideoIds:['earlier-video'],metrics:{ctr:{median:0.05,n:1,definitionVerified:true}}}]};
  c.coachOS={baseline:{sets:[{id:'manual',window:'_7d',ctr:6.2,n:3,metricDefinitionId:'unknown'}]},analytics:{snapshots:[{period:'90d',periodStart:'2026-07-01T00:00:00Z',periodEndExclusive:'2026-09-29T00:00:00Z',sourceRef:'90-day report',watchTime:300,views:1000}],audienceSnapshots:[{asOf:'2026-10-20',windowDays:28,monthlyAudience:500,sourceRef:'Audience report'}]}};
  c.videos[0].analytics={_7d:{views:'',ctr:6.2,ret30:''}};
  const read=async section=>JSON.parse((await f.call('get_client_analytics',{section},token.access_token)).data.result.content[0].text);
  const b=await read('baselines');assert.deepEqual(b.items[0].memberVideoIds,['earlier-video']);assert.equal(b.items[0].policy.windowHours,168);assert.equal(b.items[1].saved.ctr,6.2);
  const channel=await read('channel');assert.equal(channel.items[0].saved.watchTime,300);assert.equal(channel.items[0].saved.periodEndExclusive,'2026-09-29T00:00:00Z');assert.ok(!JSON.stringify(channel.items).includes('monthlyAudience'));
  const audience=await read('audience');assert.equal(audience.items[0].saved.windowDays,28);assert.equal(audience.items[0].saved.monthlyAudience,500);
  const manual=await read('manual_video_results');assert.equal(manual.items[0].saved.views,'');assert.equal(manual.items[0].saved.ctr,6.2);assert.match(manual.items[0].units,/not zero/);
});

test('analytics pagination, unknown sections and client isolation are enforced on the server',async()=>{
  const f=await fixture(),token=await f.login(),c=f.tables.workspace_states[0].state.creators[0];
  c.analyticsFoundation={observations:Array.from({length:41},(_,i)=>({id:'o'+i,windowHours:168,videoId:'yt'+i,metrics:{views:i}}))};
  const first=JSON.parse((await f.call('get_client_analytics',{section:'observations',limit:40},token.access_token)).data.result.content[0].text);assert.equal(first.items.length,40);assert.equal(first.nextOffset,40);
  const last=JSON.parse((await f.call('get_client_analytics',{section:'observations',offset:40,limit:40},token.access_token)).data.result.content[0].text);assert.equal(last.items.length,1);assert.equal(last.nextOffset,null);
  for(const args of [{section:'everything'},{section:'observations',offset:-1},{section:'observations',limit:1000},{section:'observations',windowHours:72},{section:'channel',windowHours:168},{section:'baselines',videoId:'v1'},{creatorId:'c2'}])assert.equal((await f.call('get_client_analytics',args,token.access_token)).data.result.isError,true);
  assert.equal((await f.call('get_client_analytics',{},'')).status,401);
  const all=await f.login({accessScope:'workspace'});assert.equal((await f.call('get_client_analytics',{},all.access_token)).data.result.isError,true);
  const second=JSON.parse((await f.call('get_client_analytics',{creatorId:'c2'},all.access_token)).data.result.content[0].text);assert.equal(second.counts.observationRevisions,0);
});
