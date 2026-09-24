const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('legacy imported baselines can display raw unknown-definition Views without claiming verified comparison',()=>{
 const ws=read('analytics/workspace.js');
 assert.match(ws,/function engineDisplayMetric/);
 assert.match(ws,/definitionVerified:false/);
 assert.match(ws,/raw same-cohort Views median is shown descriptively/);
 assert.match(ws,/verified cross-definition comparison still stays blocked/);
});
