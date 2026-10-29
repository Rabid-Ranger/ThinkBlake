const {test}=require('node:test');
const assert=require('node:assert/strict');
const {progress,key}=require('../ui/research-progress');
test('source ledger follows saved videos after acceptance, renaming and publishing',()=>{
 const client={videos:[{id:'v1',title:'Renamed title',stage:'Published',aiPlanDraftId:'d1'},{id:'v2',title:'Future idea',aiSourceResourceIds:['r2']}]};
 const drafts=[{id:'d1',status:'accepted',payload:{sourceResourceIds:['r1'],videos:[{title:'Original title'}]}},{id:'d2',status:'pending',payload:{sourceResourceIds:['r1'],videos:[{title:'Renamed title'},{title:'Next idea'}]}}];
 const result=progress(client,[{resourceId:'r1'},{resourceId:'r2'}],drafts);
 assert.deepEqual(result[0].saved,[{id:'v1',title:'Renamed title',stage:'Published'}]);assert.deepEqual(result[0].pending,['Next idea']);assert.equal(result[1].saved[0].id,'v2');
});
test('removing a video does not falsely mark a source idea as saved or exhausted',()=>{
 const result=progress({videos:[]},[{resourceId:'r1'}],[{id:'d1',status:'accepted',payload:{sourceResourceIds:['r1'],videos:[{title:'Removed idea'}]}}]);
 assert.deepEqual(result[0].saved,[]);assert.equal('remaining' in result[0],false);
 assert.equal(key('  Creator’s   Guide '),key("creator's guide"));
});
