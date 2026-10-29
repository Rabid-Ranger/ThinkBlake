/* Public YouTube reference cards. No metadata API, model calls or stored embeds. */
(function(root){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function youtubeId(value){
    try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))return null;const host=u.hostname.toLowerCase();let id;
      if(host==='youtu.be')id=u.pathname.split('/')[1];
      else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com','youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):['embed','shorts','live'].includes(u.pathname.split('/')[1])?u.pathname.split('/')[2]:null;
      return /^[\w-]{11}$/.test(id||'')?id:null;
    }catch{return null;}
  }
  function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
  function cards(refs,{compact=false}={}){
    const valid=(refs||[]).map(r=>({...r,url:safeUrl(r.url)})).filter(r=>r.url);
    if(!valid.length)return '<p>No references supplied yet. Ask your coach if you need examples.</p>';
    return '<div class="reference-media-grid '+(compact?'is-compact':'')+'">'+valid.map(r=>{const id=youtubeId(r.url);return '<article class="reference-media-card">'+(id?'<button type="button" class="reference-media-thumb" data-play-reference="'+id+'" aria-label="Watch '+esc(r.title||'reference video')+' here"><img src="https://i.ytimg.com/vi/'+id+'/hqdefault.jpg" alt="Thumbnail for '+esc(r.title||'reference video')+'" loading="lazy" referrerpolicy="no-referrer"><span>▶ Watch here</span></button>':'')+'<div class="reference-media-copy"><a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.title||r.url)+'</a>'+(!compact&&r.note?'<p>'+esc(r.note)+'</p>':'')+'<a class="reference-external" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+(id?'Open on YouTube ↗':'Open reference ↗')+'</a></div></article>';}).join('')+'</div>';
  }
  const api={youtubeId,safeUrl,cards};if(typeof module==='object'&&module.exports){module.exports=api;return;}root.AcceleratorReferenceMedia=api;
  document.addEventListener('input',event=>{
    const input=event.target;if(!input.matches('input[data-bind^="research.refs."]'))return;
    const row=input.closest('.video-row');if(!row)return;
    const url=row.querySelector('[data-bind$=".url"]')?.value||'',title=row.querySelector('[data-bind$=".title"]')?.value||'Video reference';
    let preview=row.querySelector('.reference-inline-preview');
    if(!preview){preview=document.createElement('div');preview.className='reference-inline-preview';preview.style.gridColumn='1 / -1';row.appendChild(preview);}
    preview.innerHTML=youtubeId(url)?cards([{title,url}],{compact:true}):'';
  });
  let activeReference=null;
  document.addEventListener('click',event=>{const button=event.target.closest('[data-play-reference]');if(!button)return;const id=button.dataset.playReference;if(!/^[\w-]{11}$/.test(id))return;event.preventDefault();event.stopImmediatePropagation();
    if(activeReference?.host.isConnected)activeReference.host.replaceWith(activeReference.button);
    const host=document.createElement('div');host.className='reference-media-player';const frame=document.createElement('iframe');frame.title=button.getAttribute('aria-label')||'Reference video';frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin';host.appendChild(frame);button.replaceWith(host);activeReference={host,button};
  },true);
  const style=document.createElement('style');style.textContent='.reference-media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:14px 0}.reference-media-card{border:1px solid var(--line,#dce3e6);border-radius:12px;overflow:hidden;background:var(--surface,#fff)}.reference-media-thumb,.reference-media-player{display:block;width:100%;aspect-ratio:16/9;border:0;padding:0;position:relative;background:#14191d;overflow:hidden}.reference-media-thumb{cursor:pointer}.reference-media-thumb img{width:100%;height:100%;object-fit:cover}.reference-media-thumb span{position:absolute;bottom:12px;left:12px;background:#17212be8;color:#fff;padding:8px 12px;border-radius:8px;font-weight:750}.reference-media-player iframe{border:0;width:100%;height:100%}.reference-media-copy{padding:14px}.reference-media-copy>a:first-child{font-weight:750;line-height:1.45}.reference-media-copy p{font-size:13px;line-height:1.55;color:var(--muted,#65717a)}.reference-external{display:block;margin-top:12px;font-size:12px}.reference-media-grid.is-compact{grid-template-columns:repeat(3,minmax(0,1fr))}.package-reference-images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0}.package-reference-images img{width:100%;aspect-ratio:16/9;object-fit:contain;background:var(--soft,#eee);border-radius:8px}@media(max-width:680px){.reference-media-grid,.reference-media-grid.is-compact,.package-reference-images{grid-template-columns:1fr}}';document.head.appendChild(style);
})(typeof window==='object'?window:globalThis);
