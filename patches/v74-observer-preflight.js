(()=>{
  const NativeMutationObserver=window.MutationObserver;
  window.MutationObserver=class V74NoopMutationObserver{
    constructor(){this.records=[]}
    observe(){}
    disconnect(){}
    takeRecords(){return this.records}
  };
  setTimeout(()=>{window.MutationObserver=NativeMutationObserver},0);
})();
