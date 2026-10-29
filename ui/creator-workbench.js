/* Stable editing sections: audience → choices → draft. Existing video fields stay canonical. */
(function(root){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ctaStarters(cta={},mid=true){
    const asset=cta[mid?'midDestination':'endDestination']||'[specific resource or next step]';
    const benefit=cta[mid?'midBenefit':'endBenefit']||'[the practical help it provides]';
    return mid?[
      ['Remove the next obstacle',`If [the specific part you just demonstrated] is the bit you want beside you when you try this, ${asset} gives you ${benefit}. It is linked below. Now, here is [the next obstacle we still need to solve].`],
      ['Use the tool in the demonstration',`The [worksheet or checklist] I am using here is ${asset}. You can get it below if you want to work through this with your own [situation]. Let us use it on [the next real example].`],
      ['Offer help when the situation calls for it',`If [specific fit condition] and you want help with [the harder decision], ${asset} is designed to help with ${benefit}. Details are below. First, let me show you [the next useful point].`]
    ]:[
      ['Continue into the next useful video',`You can now [do the thing this video promised]. The next decision is [the unresolved problem that follows]. In ${asset}, I show you ${benefit}, so start there.`],
      ['Turn the lesson into action',`To put [the specific lesson] into practice, ${asset} gives you ${benefit}. It is linked below, so you can [the concrete next action].`],
      ['Make a relevant business invitation',`If [specific fit condition] and you want help with [the next outcome], ${asset} is the next step. [Explain what actually happens after clicking.] Details are below.`]
    ];
  }
  function validImage(file){return /^image\/(png|jpeg|webp|gif)$/i.test(file?.type||'')&&file.size>0&&file.size<=10*1024*1024;}
  function previewData(image,makeCanvas=()=>document.createElement('canvas')){
    if(!image.width||!image.height)throw Error('Invalid image dimensions');
    for(const width of [640,480,360,240]){const scale=Math.min(1,width/Math.max(image.width,image.height)),canvas=makeCanvas();canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const src=canvas.toDataURL('image/jpeg',.65);if(src.length<=18000)return src;}
    throw Error('Image is too detailed for a preview');
  }
  const api={ctaStarters,validImage,previewData};if(typeof module==='object'&&module.exports){module.exports=api;return;}
  const get=n=>{try{return(0,eval)('typeof '+n+'!=="undefined"?'+n+':undefined')}catch{return null}};
  const saveWork=()=>{get('save')?.();get('render')?.();document.dispatchEvent(new Event('accelerator-video-edited'));};
  const original=get('renderVideoDecision');if(typeof original!=='function')return;
  const field=(label,path,value,help='')=>'<label class="workbench-field">'+esc(label)+'<textarea aria-label="'+esc(label)+'" data-scope="video" data-bind="'+path+'" placeholder="'+esc(help)+'">'+esc(value)+'</textarea></label>';
  const audience=v=>'<aside class="workbench-audience"><b>Keep this viewer in mind</b><p><strong>Who:</strong> '+esc(v.promise?.viewer||v.exactViewer||'Not specified yet')+'<br><strong>They want:</strong> '+esc(v.viewer?.desire||v.promise?.result||'Not specified yet')+'<br><strong>They are stuck on:</strong> '+esc(v.viewer?.problem||v.promise?.problem||'Not specified yet')+'</p>'+(window.__acceleratorCreatorPlannerMode?'<button class="btn" type="button" data-creator-step="2">Review audience</button>':'')+'</aside>';
  function ctaPanel(v,mid){
    const cta=v.cta||{},prefix=mid?'mid':'end',options=mid?['No mid-roll CTA','Lead magnet / resource','Business / service','Next video']:['Next video','Lead magnet / resource','Business / service','No end CTA'];
    if(cta[prefix+'Type']&&!options.includes(cta[prefix+'Type']))options.unshift(cta[prefix+'Type']);
    return '<section class="workbench-section workbench-cta-panel"><h2>'+(mid?'1. In-video CTA':'2. End CTA')+'</h2><p>'+(mid?'Optional. Aim near the first third only after giving real value; use the moment where the resource genuinely helps, not an arbitrary timestamp. Make one relevant invitation, then return to the next useful point.':'Deliver the promised value, then bridge to one natural next action: another video, a useful resource or relevant help. Avoid a recap followed by a pile of unrelated asks.')+'</p><label class="workbench-field">'+(mid?'In-video':'End')+' next step<select aria-label="'+(mid?'In-video':'End')+' next step" data-scope="video" data-bind="cta.'+prefix+'Type"><option value="">Choose when the destination is known</option>'+options.map(x=>'<option '+(cta[prefix+'Type']===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>'+field((mid?'In-video':'End')+' destination','cta.'+prefix+'Destination',cta[prefix+'Destination'],'Name the actual guide, lead magnet, offer or next video')+field((mid?'In-video':'End')+' link','cta.'+prefix+'Url',cta[prefix+'Url'],'Paste the actual destination URL; do not guess')+field((mid?'In-video':'End')+' viewer benefit','cta.'+prefix+'Benefit',cta[prefix+'Benefit'],'What specific help does this give this viewer?')+(mid?field('Placement in the video','cta.midPlacement',cta.midPlacement,'After which example or first useful payoff? Around one third if appropriate.'):'')+'<h3>Starting points to adapt</h3><p>Replace bracketed gaps with true details. An unspecified offer stays unspecified.</p><div class="workbench-starters">'+ctaStarters(cta,mid).map(([label,script],i)=>'<article><h4>'+esc(label)+'</h4><p>'+esc(script)+'</p><button type="button" class="btn" data-workbench-cta="'+prefix+'" data-index="'+i+'">Insert this starting point</button></article>').join('')+'</div>'+field((mid?'In-video CTA':'End CTA')+' wording','cta.'+prefix+'Draft',cta[prefix+'Draft'],'Write the version you will actually say')+'</section>';
  }
  const wrapped=function(c,v,id){
    let html=original(c,v,id);
    if(id==='cta')return audience(v)+'<h2>Plan both calls to action</h2><p>Use the real destination your coach has chosen. If it is missing, flag it for review instead of inventing an offer.</p>'+ctaPanel(v,true)+ctaPanel(v,false);
    if(id==='viewer'&&window.__acceleratorCreatorPlannerMode)return '<h2>Audience: who is watching, and what do they want?</h2><p>Start with your coach’s prep. Add what you know about the person, the moment and the result they need.</p>'+field('Who is this video for?','promise.viewer',v.promise?.viewer||v.exactViewer)+field('What makes them click today?','viewer.moment',v.viewer?.moment)+field('What are they struggling with?','viewer.problem',v.viewer?.problem)+field('What do they want instead?','viewer.desire',v.viewer?.desire,'Keep it specific to this video')+field('Their words, doubts or objections','viewer.language',v.viewer?.language)+audience(v);
    const tpl=document.createElement('template');tpl.innerHTML=html;
    // Main work sections stay visible; choosing a pattern cannot collapse them.
    tpl.content.querySelectorAll('details').forEach(details=>{
      const summary=details.querySelector(':scope > summary');
      if(!summary||!/^Optional opening/.test(summary.textContent.trim()))return;
      const section=document.createElement('section');section.className='workbench-section';const heading=document.createElement('h3');heading.textContent=summary.textContent;section.appendChild(heading);summary.remove();section.append(...details.childNodes);details.replaceWith(section);
    });
    tpl.content.querySelectorAll('details > summary').forEach(s=>{if(s.textContent==='Optional approaches and image uploads')s.textContent='Browse title and thumbnail starting points';if(s.textContent==='Optional structure patterns and examples')s.textContent='Need help organising the outline? Browse structures';});
    if(id==='hook'){
      const draft=tpl.content.querySelector('[data-bind="hook.draft"]')?.closest('.fields');
      const help=tpl.content.querySelector('.workbench-section');
      if(draft&&help){help.querySelector('h3').textContent='1. Choose a starting point (optional)';help.querySelector('.decision-head')?.remove();help.querySelectorAll('.grid > div').forEach(box=>{if(box.querySelector('b')?.textContent==='Recommended runway')box.remove();});draft.before(help);draft.insertAdjacentHTML('beforebegin','<h3>2. Write or refine your opening</h3>');}
    }
    if(id==='structure'){const fields=tpl.content.querySelector('[data-bind="structure.notes"]')?.closest('.fields');fields?.insertAdjacentHTML('beforebegin','<p>Bullet points are enough: what does the viewer need first, what example or proof makes it clear, and what question pulls them into the next point?</p>');}
    if(id==='package'){
      const options=Array.from({length:3},(_,i)=>v.package?.thumbnailOptions?.[i]||{});
      const cards='<section class="workbench-section"><h2>Your thumbnail options</h2><p>Upload previews for options 1, 2 and 3. Compare them with the working title. A written concept is optional when the images explain the idea.</p><div class="workbench-thumbnails">'+options.map((o,i)=>'<article><h3>Option '+(i+1)+'</h3>'+(o.src?'<img src="'+esc(o.src)+'" alt="Thumbnail option '+(i+1)+'">':'<div class="workbench-image-empty">No image yet</div>')+'<label>Upload preview<input type="file" aria-label="Upload thumbnail option '+(i+1)+'" accept="image/png,image/jpeg,image/webp,image/gif" data-thumbnail-option="'+i+'"></label>'+(o.src?'<button class="btn" type="button" data-remove-thumbnail-option="'+i+'">Remove image</button>'+field('Notes for option '+(i+1),'package.thumbnailOptions.'+i+'.note',o.note):'')+'</article>').join('')+'</div><p data-thumbnail-status role="status"></p></section>';
      const concept=tpl.content.querySelector('[data-bind="package.thumbnailConcept"]')?.closest('.fields');
      if(concept)concept.insertAdjacentHTML('beforebegin',cards);else tpl.content.appendChild(document.createRange().createContextualFragment(cards));
      tpl.content.querySelectorAll('[data-remove-thumbnail-option]').forEach(button=>{const i=Number(button.dataset.removeThumbnailOption);button.insertAdjacentHTML('afterend','<label><input type="radio" name="preferred-thumbnail" data-scope="video" data-bind="package.preferredThumbnail" value="'+(i+1)+'" '+(String(v.package?.preferredThumbnail)===String(i+1)?'checked':'')+'> Preferred option</label>');});
    }
    if(id==='final'&&window.__acceleratorCreatorPlannerMode){
      const cta=v.cta||{};const urlLink=url=>{const safe=window.AcceleratorReferenceMedia?.safeUrl(url);return safe?'<a href="'+esc(safe)+'" target="_blank" rel="noopener noreferrer">Open destination ↗</a>':'<p>Destination link not supplied.</p>';};
      const ctaReview='<section class="creator-coach-brief"><h3>Calls to action</h3><h4>In-video invitation</h4><p>'+esc(cta.midDraft||'Not drafted / not needed')+'</p><p>'+esc(cta.midPlacement||'Placement not chosen')+'</p>'+urlLink(cta.midUrl)+'<h4>Ending</h4><p>'+esc(cta.endDraft||'Not drafted yet')+'</p>'+urlLink(cta.endUrl)+'<button class="btn" type="button" data-creator-step="9">Review both CTAs</button></section>';
      const old=[...tpl.content.querySelectorAll('.creator-coach-brief')].find(s=>s.querySelector('h3')?.textContent==='Next action');
      if(old)old.replaceWith(document.createRange().createContextualFragment(ctaReview));
      const options=(v.package?.thumbnailOptions||[]).filter(o=>o?.src);
      if(options.length)tpl.content.appendChild(document.createRange().createContextualFragment('<section class="creator-coach-brief"><h3>Thumbnail options</h3><p>Preferred option: '+esc(v.package?.preferredThumbnail||'Not chosen')+'</p><div class="workbench-thumbnails">'+(v.package.thumbnailOptions||[]).map((o,i)=>o?.src?'<figure><img src="'+esc(o.src)+'" alt="Thumbnail option '+(i+1)+'"><figcaption>Option '+(i+1)+'</figcaption></figure>':'').join('')+'</div></section>'));
    }
    return (['hook','structure','package'].includes(id)?audience(v):'')+tpl.innerHTML;
  };
  window.__workbenchDecision=wrapped;(0,eval)('renderVideoDecision=window.__workbenchDecision');delete window.__workbenchDecision;
  // Preserve native disclosure state and viewport through the base app's full rerenders.
  const render=get('render');
  if(typeof render==='function'){
    const context=()=>{const v=get('video')?.();return v?String(v.id)+':'+v.flowStep:''};
    window.__workbenchRender=function(...args){
      const host=document.querySelector('.flow-main'),before=host?.dataset.workbenchContext,top=window.scrollY;
      const disclosures=[...document.querySelectorAll('.flow-main details')].map((d,i)=>({key:d.querySelector('summary')?.textContent.trim(),i,open:d.open}));
      const out=render(...args),after=context(),next=document.querySelector('.flow-main');if(next)next.dataset.workbenchContext=after;
      if(before&&before===after){const list=[...document.querySelectorAll('.flow-main details')];for(const item of disclosures){const d=list[item.i];if(d?.querySelector('summary')?.textContent.trim()===item.key)d.open=item.open;}requestAnimationFrame(()=>{if(context()===after)window.scrollTo(0,top);});}
      return out;
    };(0,eval)('render=window.__workbenchRender');delete window.__workbenchRender;
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-workbench-cta],[data-remove-thumbnail-option]');if(!button)return;const v=get('video')?.();if(!v)return;event.preventDefault();event.stopImmediatePropagation();
    if(button.hasAttribute('data-workbench-cta')){const prefix=button.dataset.workbenchCta,script=ctaStarters(v.cta,prefix==='mid')[Number(button.dataset.index)]?.[1];if(!script)return;v.cta ||= {};const key=prefix+'Draft';v.cta[key]=v.cta[key]?.trim()?v.cta[key]+'\n\n'+script:script;}
    else{const i=Number(button.dataset.removeThumbnailOption);if(i<0||i>2)return;v.package.thumbnailOptions ||= [];v.package.thumbnailOptions[i]={};}
    saveWork();
  },true);
  // A text field's blur must not replace the button the user is about to click.
  document.addEventListener('change',event=>{const el=event.target;if(!el.matches?.('textarea[data-bind],input[data-bind]:not([type=file]):not([type=checkbox]):not([type=radio])'))return;get('handleInput')?.(event);event.stopImmediatePropagation();},true);
  document.addEventListener('input',()=>{if(window.__acceleratorCreatorPlannerMode)queueMicrotask(()=>{const next=document.querySelector('.flow-footer .btn.dark[data-creator-step]');if(next)next.disabled=false;});});
  document.addEventListener('change',event=>{
    const input=event.target;if(!input.matches('[data-thumbnail-option]'))return;const file=input.files?.[0],v=get('video')?.(),i=Number(input.dataset.thumbnailOption);if(!file||!v)return;
    const status=message=>{const el=document.querySelector('[data-thumbnail-status]');if(el)el.textContent=message;};
    if(!validImage(file)){status('Choose a PNG, JPG, WebP or GIF image up to 10 MB.');return;}status('Preparing preview…');
    const reader=new FileReader();reader.onerror=()=>status('This image could not be read.');reader.onload=()=>{const image=new Image();image.onerror=()=>status('This image could not be opened.');image.onload=()=>{
      try{const src=previewData(image);if(get('video')?.id!==v.id)return;
        const old=v.package.thumbnailOptions;v.package.thumbnailOptions=Array.from({length:3},(_,j)=>old?.[j]||{});v.package.thumbnailOptions[i]={...v.package.thumbnailOptions[i],name:file.name.slice(0,200),src};saveWork();status('Thumbnail preview added. Keep the original image for production.');
      }catch{status('The image preview could not be prepared.');}
    };image.src=String(reader.result);};reader.readAsDataURL(file);
  });
  const style=document.createElement('style');style.textContent='.workbench-cta-panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.workbench-cta-panel>h2,.workbench-cta-panel>h3,.workbench-cta-panel>p,.workbench-cta-panel>.workbench-starters,.workbench-cta-panel>.workbench-field:has([data-bind$=Draft]){grid-column:1/-1}@media(max-width:760px){.workbench-cta-panel{grid-template-columns:1fr}}.workbench-section{margin:24px 0;padding:20px;border:1px solid var(--line,#dce3e6);border-radius:12px}.workbench-section h2,.workbench-section h3{margin-top:0}.workbench-audience{border-left:3px solid #527c70;background:var(--soft,#f4f7f8);padding:14px 18px;margin-bottom:20px}.workbench-audience p{line-height:1.7}.workbench-field{display:grid;gap:7px;margin:18px 0;font-weight:700}.workbench-field textarea,.workbench-field select{width:100%;padding:12px;border:1px solid var(--line,#ccd3d8);border-radius:8px;background:var(--surface,#fff);color:inherit;font:inherit}.workbench-field textarea{min-height:85px;resize:vertical}.workbench-thumbnails,.workbench-starters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.workbench-thumbnails article,.workbench-starters article{min-width:0;padding:14px;border:1px solid var(--line,#dce3e6);border-radius:10px}.workbench-thumbnails img{width:100%;aspect-ratio:16/9;object-fit:contain;background:var(--soft,#eee)}.workbench-thumbnails input[type=file]{max-width:100%;margin:12px 0}.workbench-image-empty{aspect-ratio:16/9;display:grid;place-items:center;background:var(--soft,#eee)}.workbench-starters p{line-height:1.6;font-size:13px}@media(max-width:760px){.workbench-thumbnails,.workbench-starters{grid-template-columns:1fr}}';document.head.appendChild(style);
})(typeof window==='object'?window:globalThis);
