window.V74_GUIDES_READY=(async()=>{
  const bytes=Uint8Array.from(atob(window.V74_GUIDE_B64||''),char=>char.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  window.V74_SOURCE_GUIDES=JSON.parse(await new Response(stream).text());
  delete window.V74_GUIDE_B64;
  return window.V74_SOURCE_GUIDES;
})();
