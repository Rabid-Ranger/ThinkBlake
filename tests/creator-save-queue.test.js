const {test}=require('node:test');
const assert=require('node:assert/strict');
const createQueue=require('../ui/creator-save-queue');
const payload=(title,ready=false)=>({videos:[{id:'video-a',creator:{plannerDraft:{title},readyForReview:ready}}]});
const turn=()=>new Promise(setImmediate);
test('edits and review submission made during an active save are retained',async()=>{
  let release;const sent=[];
  const queue=createQueue({delay:0,send:async p=>{sent.push(p);if(sent.length===1)await new Promise(r=>{release=r;});}});
  queue.enqueue(payload('first'),true);await turn();
  queue.enqueue(payload('latest',true),true);
  assert.equal(sent.length,1);release();await turn();
  assert.equal(sent.length,2);assert.equal(sent[1].videos[0].creator.plannerDraft.title,'latest');
  assert.equal(sent[1].videos[0].creator.readyForReview,true);
});
test('opening a creator link does not mark an unchanged draft as edited',async()=>{
  let calls=0;const initial=payload('original');
  const queue=createQueue({initial,send:async()=>calls++});
  queue.enqueue(initial);await queue.flush();assert.equal(calls,0);
});
test('a failed save remains retryable but does not repeatedly retry unchanged polling',async()=>{
  let calls=0;const states=[];
  const queue=createQueue({delay:0,send:async()=>{calls++;if(calls===1)throw Error('Offline');},onState:s=>states.push(s)});
  queue.enqueue(payload('draft'),true);await turn();
  assert.equal(states.at(-1),'error');
  assert.equal(queue.pending,true);
  queue.enqueue(payload('draft'));await queue.flush();assert.equal(calls,1);
  queue.enqueue(payload('draft'),true);await turn();assert.equal(calls,2);assert.equal(states.at(-1),'saved');assert.equal(queue.pending,false);
});
test('unchanged polling while saving cannot duplicate a successful save',async()=>{
  let release;const sent=[];
  const queue=createQueue({delay:0,send:async p=>{sent.push(p);await new Promise(r=>{release=r;});}});
  queue.enqueue(payload('same'),true);await turn();queue.enqueue(payload('same'));release();await turn();
  assert.equal(sent.length,1);
});
