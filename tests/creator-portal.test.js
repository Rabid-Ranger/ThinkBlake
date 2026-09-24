const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('creator workspace is a no-login capability-link page',()=>{const html=read('creator.html'),portal=read('ui/creator-portal.js');assert.match(html,/noindex,nofollow/);assert.match(html,/no-referrer/);assert.match(portal,/location\.hash/);assert.match(portal,/portal-get/);assert.match(portal,/portal-save/);assert.doesNotMatch(portal,/AUTH_KEY|Authorization.*Bearer/)});
test('coach share UI publishes only an explicit creator-safe snapshot',()=>{const share=read('ui/creator-sharing.js');assert.match(share,/Creator workspace/);assert.match(share,/titleDraft/);assert.match(share,/thumbnailTextDraft/);assert.match(share,/hookDraft/);assert.match(share,/promiseResultDraft/);assert.match(share,/Applied .*creator edit/);assert.doesNotMatch(share,/analyticsFoundation|diagnosis|businessScorecard|decisionHistory/)});
test('creator link can be copied, rotated and revoked without creator accounts',()=>{const share=read('ui/creator-sharing.js');assert.match(share,/Private link copied/);assert.match(share,/Rotate private link/);assert.match(share,/Revoke link/);assert.match(share,/creator\.html#/)});
