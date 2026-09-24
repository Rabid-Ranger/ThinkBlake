const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('sharing stays attached to the specific video',()=>{const share=read('ui/creator-sharing.js');assert.match(share,/\.slot-row/);assert.match(share,/video-heading/);assert.match(share,/Share with creator/);assert.match(share,/data-creator-share-video/);assert.doesNotMatch(share,/creator-share-launch/)});
test('planned rows remain usable across responsive breakpoints',()=>{const share=read('ui/creator-sharing.js');assert.match(share,/slot-row:has\(\.creator-share-row-actions\)/);assert.match(share,/@media\(max-width:1200px\)/);assert.match(share,/@media\(max-width:760px\)/);assert.match(share,/display:flex!important/)});
test('shared and review states are visible without opening each link',()=>{const share=read('ui/creator-sharing.js'),edge=read('supabase/functions/creator-portal/index.ts');assert.match(edge,/actionName === "owner-list"/);assert.match(share,/action:'owner-list'/);assert.match(share,/Creator updates ready/);assert.match(share,/Shared with creator/);assert.match(share,/setInterval/);});
test('one-click creation tries to copy the new private link',()=>{const share=read('ui/creator-sharing.js');assert.match(share,/Create & copy private link/);assert.match(share,/Private link created and copied/);});
test('creator autosave queues edits made while a save is already running',()=>{const portal=read('ui/creator-portal.js');assert.match(portal,/changeSeq/);assert.match(portal,/savedSeq/);assert.match(portal,/saveQueued/);assert.match(portal,/changeSeq>savedSeq/);});
test('each link is still scoped to one video and creator page stays no-login',()=>{const share=read('ui/creator-sharing.js'),edge=read('supabase/functions/creator-portal/index.ts'),portal=read('ui/creator-portal.js');assert.match(share,/videoId:String\(v\.id\)/);assert.match(edge,/VIDEO_SCOPE_MISMATCH/);assert.match(portal,/location\.hash/);assert.doesNotMatch(portal,/Authorization/);});
test('shared modal is intentionally small: direction plus next steps, not duplicate instruction layers',()=>{const share=read('ui/creator-sharing.js');assert.match(share,/What should they work on/);assert.match(share,/Next steps, one per line/);assert.doesNotMatch(share,/cshare-instructions/);});


test('queued autosave is not reported as a failure and failed saves do not retry forever',()=>{
 const portal=read('ui/creator-portal.js');
 assert.match(portal,/if\(saving\)\{saveQueued=true;.*return true/);
 assert.match(portal,/if\(ok&&\(queued\|\|changeSeq>savedSeq\)\)/);
 assert.doesNotMatch(portal,/finally\{saving=false;if\(saveQueued\|\|changeSeq>savedSeq\)/);
});


test('Open creator view is a native secure link, not a popup-dependent window.open button',()=>{
  const share=read('ui/creator-sharing.js');
  assert.match(share,/class="cshare-open-link"/);
  assert.match(share,/target="_blank"/);
  assert.match(share,/rel="noopener noreferrer"/);
  assert.match(share,/title="Open the creator view in a new tab"/);
  assert.match(share,/>Preview<\/a>/);
  assert.doesNotMatch(share,/window\.open\(linkUrl/);
  assert.doesNotMatch(share,/data-cshare="open"/);
});
