const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('video sharing is attached to planned videos and the video planner',()=>{
 const share=read('ui/creator-sharing.js');
 assert.match(share,/\.slot-row/);
 assert.match(share,/video-heading/);
 assert.match(share,/Share with creator/);
 assert.match(share,/data-creator-share-video/);
 assert.doesNotMatch(share,/creator-share-launch/);
});

test('each share request is scoped to one specific video',()=>{
 const share=read('ui/creator-sharing.js');
 const edge=read('supabase/functions/creator-portal/index.ts');
 assert.match(share,/videoId:String\(v\.id\)/);
 assert.match(share,/videos:\[\{id:String\(v\.id\)/);
 assert.match(edge,/requestedVideoId/);
 assert.match(edge,/scope", requestedVideoId \? "video" : "creator"/);
 assert.match(edge,/VIDEO_SCOPE_MISMATCH/);
});

test('creator video page remains no-login and token is kept in the URL fragment',()=>{
 const portal=read('ui/creator-portal.js');
 const html=read('creator.html');
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/no-referrer/);
 assert.match(portal,/location\.hash/);
 assert.match(portal,/Shared Video/);
 assert.doesNotMatch(portal,/Authorization/);
});

test('creator edits cannot overwrite coach-only fields in the browser payload',()=>{
 const share=read('ui/creator-sharing.js');
 assert.match(share,/titleDraft/);
 assert.match(share,/thumbnailTextDraft/);
 assert.match(share,/hookDraft/);
 assert.match(share,/promiseResultDraft/);
 assert.doesNotMatch(share,/analyticsFoundation|businessScorecard|decisionHistory/);
});
