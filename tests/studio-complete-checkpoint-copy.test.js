const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('completed Studio checkpoints explain short no-op responses',()=>{
 const live=read('analytics/live.js');
 assert.match(live,/This checkpoint is already 15\/15/);
 assert.match(live,/observations: \[\]/);
 assert.match(live,/does not replace or erase the saved 15-video baseline/);
});
