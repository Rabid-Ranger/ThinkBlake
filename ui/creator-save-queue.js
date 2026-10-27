/* Serialize creator saves, retaining edits and review requests made in flight. */
(function(root){
  function createCreatorSaveQueue({send,onState=()=>{},delay=750,initial=null}) {
    let pending=null,timer=null,running=false,acknowledged=initial?JSON.stringify(initial):'',failed='';
    async function flush(){
      clearTimeout(timer);timer=null;
      if(running||!pending)return;
      running=true;
      try {
        while(pending){
          const item=pending;pending=null;
          if(item.serial===acknowledged)continue;
          onState('saving');
          try {
            await send(item.payload);
            acknowledged=item.serial;failed='';
            onState(item.payload.videos[0].creator.readyForReview?'ready':'saved');
          } catch(error){
            failed=item.serial;if(pending?.serial===failed)pending=null;onState('error',error.message);break;
          }
        }
      } finally {running=false;if(pending)timer=setTimeout(flush,delay);}
    }
    return {
      enqueue(payload,immediate=false){
        const serial=JSON.stringify(payload);
        if(!immediate&&(serial===acknowledged||serial===failed))return;
        pending={payload:JSON.parse(serial),serial};
        clearTimeout(timer);
        if(immediate)flush();else timer=setTimeout(flush,delay);
      },
      flush,
      get pending(){return running||!!pending;}
    };
  }
  if(typeof module==='object'&&module.exports)module.exports=createCreatorSaveQueue;
  else root.createCreatorSaveQueue=createCreatorSaveQueue;
})(typeof window==='object'?window:globalThis);
