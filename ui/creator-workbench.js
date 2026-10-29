/* Stable editing sections: audience → choices → draft. Existing video fields stay canonical. */
(function(root){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ctaStarters(cta={},mid=true){
    const prefix=mid?'mid':'end',type=String(cta[prefix+'Type']||'').toLowerCase();
    const asset=cta[prefix+'Destination']||'[name the real next step]';
    const benefit=cta[prefix+'Benefit']||'[the concrete help it provides]';
    const bridge=cta[prefix+'Bridge']||'[the specific obstacle this part of the video exposes]';
    if(/video|playlist/.test(type))return mid?[
      ['Follow the question',bridge+'. '+asset+' covers '+benefit+'. It is linked below. For now, [return to the next point in this video].'],
      ['Connect the two demonstrations','The missing piece here is [the related question]. '+asset+' shows '+benefit+'. Keep it for your next step; first, [finish the current demonstration].'],
      ['Give the next video a job','Use '+asset+' for [the next practical decision]: '+benefit+'. Right now, [the remaining useful point in this video].']
    ]:[
      ['Leave the next question alive',bridge+'. That is what '+asset+' walks through: '+benefit+'. Watch that next.'],
      ['Move from understanding to doing','The next step is [the specific action the viewer now needs]. '+asset+' shows '+benefit+'. Start with [the relevant demonstration in that video].'],
      ['Expose the next obstacle','[The next obstacle] changes how this works in practice. In '+asset+', [the concrete example] makes '+benefit+' clear. Go there next.']
    ];
    if(/business|service|consult|booking|call/.test(type))return mid?[
      ['Bridge into real application',bridge+'. That is the work we do in '+asset+': '+benefit+'. [Describe the real first step and point to its link.] Now, [return to the next teaching point].'],
      ['Demonstrate the service naturally','[Show the real tool, diagnostic or process used in the work.] This is part of '+asset+', where we work on '+benefit+'. [Explain the actual next action.] Here is how to use this first piece on your own.'],
      ['Name the decision that needs help','The harder decision is [the specific problem beyond the demonstration]. '+asset+' is where we work through '+benefit+'. [State the next action and what happens afterwards.] First, [continue the promised lesson].']
    ]:[
      ['Make the next step tangible',bridge+'. '+asset+' is where we work through '+benefit+'. [Explain exactly what happens after the next action, including the real commitment.] [Point to the link and ask for that one action.]'],
      ['Continue the work, not the pitch','The practical next decision is [the decision the viewer needs help making]. In '+asset+', we work on '+benefit+'. [Name the actual first step.] Details are below.'],
      ['Show what working together changes','[The unresolved constraint] is the part we tackle in '+asset+': '+benefit+'. [Describe the actual deliverable or first conversation.] [Make one clear invitation.]']
    ];
    return mid?[
      ['Use the resource inside the demonstration',bridge+'. The [tool or page being demonstrated] is from '+asset+', which gives you '+benefit+'. [Point to the actual link.] Now, [the next useful point].'],
      ['Remove the friction just exposed','[The specific step] is easier with [the actual aid]. '+asset+' gives you '+benefit+'. [Say where to get it and what to do with it.] Let us use that on [the next example].'],
      ['Let the viewer try the same process','Here is the [tool] I used for [the result just shown]. It is in '+asset+' with '+benefit+'. [Point to the link.] [Continue the demonstration without restarting the introduction.]']
    ]:[
      ['Turn the insight into a real next action',bridge+'. '+asset+' gives you '+benefit+'. [Name the first useful action inside it and point to the actual link.]'],
      ['Hand over the tool used on screen','Take the [tool just demonstrated] into your own [situation]. '+asset+' includes '+benefit+'. [Give the actual access instruction.]'],
      ['Make the next decision easier','[The next practical decision] is easier with [the relevant aid]. '+asset+' gives you '+benefit+'. [Give one clear action to get and use it.]']
    ];
  }
  function productionStatus(v={}){const h=v.handoff||{};return {format:h.format||'Long-form',layout:h.layout||'Talking Head + B-roll',formatSelected:h.formatManual===true,layoutSelected:h.layoutManual===true,approach:v.archetype||''};}
  function validImage(file){return /^image\/(png|jpeg|webp|gif)$/i.test(file?.type||'')&&file.size>0&&file.size<=10*1024*1024;}
  function previewData(image,makeCanvas=()=>document.createElement('canvas')){
    if(!image.width||!image.height)throw Error('Invalid image dimensions');
    for(const width of [640,480,360,240]){const scale=Math.min(1,width/Math.max(image.width,image.height)),canvas=makeCanvas();canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const src=canvas.toDataURL('image/jpeg',.65);if(src.length<=18000)return src;}
    throw Error('Image is too detailed for a preview');
  }
  const api={ctaStarters,productionStatus,validImage,previewData};if(typeof module==='object'&&module.exports){module.exports=api;return;}
  const get=n=>{try{return(0,eval)('typeof '+n+'!=="undefined"?'+n+':undefined')}catch{return null}};
  const saveWork=()=>{get('save')?.();get('render')?.();document.dispatchEvent(new Event('accelerator-video-edited'));};
  const original=get('renderVideoDecision');if(typeof original!=='function')return;
  const field=(label,path,value,help='')=>'<label class="workbench-field">'+esc(label)+'<textarea aria-label="'+esc(label)+'" data-scope="video" data-bind="'+path+'" placeholder="'+esc(help)+'">'+esc(value)+'</textarea></label>';
  const audience=v=>'<aside class="workbench-audience"><b>Keep this viewer in mind</b><p><strong>Who:</strong> '+esc(v.promise?.viewer||v.exactViewer||'Not specified yet')+'<br><strong>They want:</strong> '+esc(v.viewer?.desire||v.promise?.result||'Not specified yet')+'<br><strong>They are stuck on:</strong> '+esc(v.viewer?.problem||v.promise?.problem||'Not specified yet')+'</p>'+(window.__acceleratorCreatorPlannerMode?'<button class="btn" type="button" data-creator-step="2">Review audience</button>':'')+'</aside>';
  function ctaPanel(v,mid){
    const cta=v.cta||{},prefix=mid?'mid':'end',options=mid?['No mid-roll CTA','Lead magnet / resource','Business / service','Next video']:['Next video','Lead magnet / resource','Business / service','No end CTA'];
    if(cta[prefix+'Type']&&!options.includes(cta[prefix+'Type']))options.unshift(cta[prefix+'Type']);
    return '<section class="workbench-section workbench-cta-panel"><h2>'+(mid?'1. In-video CTA':'2. End CTA')+'</h2><p>'+(mid?'Optional. Aim near the first third only after giving real value; use the moment where the resource genuinely helps, not an arbitrary timestamp. Make one relevant invitation, then return to the next useful point.':'Deliver the promised value, then bridge to one natural next action: another video, a useful resource or relevant help. Avoid a recap followed by a pile of unrelated asks.')+'</p><label class="workbench-field">'+(mid?'In-video':'End')+' next step<select aria-label="'+(mid?'In-video':'End')+' next step" data-scope="video" data-bind="cta.'+prefix+'Type"><option value="">Choose when the destination is known</option>'+options.map(x=>'<option '+(cta[prefix+'Type']===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>'+field((mid?'In-video':'End')+' destination','cta.'+prefix+'Destination',cta[prefix+'Destination'],'Name the actual guide, lead magnet, offer or next video')+field((mid?'In-video':'End')+' link','cta.'+prefix+'Url',cta[prefix+'Url'],'Paste the actual destination URL; do not guess')+field((mid?'In-video':'End')+' viewer benefit','cta.'+prefix+'Benefit',cta[prefix+'Benefit'],'What specific help does this give this viewer?')+field((mid?'In-video':'End')+' content bridge','cta.'+prefix+'Bridge',cta[prefix+'Bridge'],'What happened in the video that makes this next step useful?')+(mid?field('Placement in the video','cta.midPlacement',cta.midPlacement,'After which example or first useful payoff? Around one third if appropriate.'):'')+'<h3>Starting points to adapt</h3><p>Choose the destination category first. Build the invitation from the exact moment in your video, the useful next step and one concrete action. Replace brackets with true details; read it aloud.</p><div class="workbench-starters">'+ctaStarters(cta,mid).map(([label,script],i)=>'<article><h4>'+esc(label)+'</h4><p>'+esc(script)+'</p><button type="button" class="btn" data-workbench-cta="'+prefix+'" data-index="'+i+'">Insert this starting point</button></article>').join('')+'</div>'+field((mid?'In-video CTA':'End CTA')+' wording','cta.'+prefix+'Draft',cta[prefix+'Draft'],'Write the version you will actually say')+'</section>';
  }
  const wrapped=function(c,v,id){
    let html=original(c,v,id);
    if(id==='cta')return audience(v)+'<h2>Plan both calls to action</h2><p>Use the real destination your coach has chosen. If it is missing, flag it for review instead of inventing an offer.</p>'+ctaPanel(v,true)+ctaPanel(v,false);
    if(id==='handoff'&&window.__acceleratorCreatorPlannerMode){
      const p=productionStatus(v),tpl=document.createElement('template');tpl.innerHTML=html;
      const allowed=['handoff.owner','handoff.date','handoff.dueDate','handoff.assets','handoff.checklist','handoff.notes'];
      const groups=[...new Set([...tpl.content.querySelectorAll('[data-bind]')].filter(e=>allowed.includes(e.getAttribute('data-bind'))).map(e=>e.closest('.fields')).filter(Boolean))];
      const select=(label,path,value,values)=>{if(!values.includes(value))values.unshift(value);return '<label class="workbench-field">'+label+'<select aria-label="'+label+'" data-scope="video" data-bind="'+path+'">'+values.map(x=>'<option '+(x===value?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>';};
      return audience(v)+'<section class="workbench-section"><h2>Choose how this video will be filmed</h2><p><b>Video approach:</b> '+esc(p.approach||'Not chosen yet')+'</p><p>'+(p.formatSelected&&p.layoutSelected?'These are saved production selections. Change them when the video needs a different treatment.':'These are suggestions, not confirmed choices. The app derives them from the video approach and story structure; without those, it falls back to Long-form and Talking Head + B-roll.')+'</p><button class="btn" type="button" data-creator-step="4">Review video approach</button>'+select('Video format','handoff.format',p.format,['Long-form','Shorts','Live','Podcast','Series / Show','Premiere / Event'])+'<p>'+ (p.formatSelected?'Format: saved selection.':'Format: suggested default; confirm or change it.')+'</p>'+select('Filming style','handoff.layout',p.layout,['Talking Head + B-roll','Talking Head','Screen Recording','Whiteboard / Annotation','Slides / Presentation','Interview / Dual Cam','Roundtable / Panel','On-location / Field','Hybrid by Beat','Documentary / VO + B-roll'])+'<p>'+(p.layoutSelected?'Filming style: saved selection.':'Filming style: suggested default; confirm or change it.')+'</p><button class="btn dark" type="button" data-confirm-production>Confirm production choices</button></section><h2>Plan the actual shoot</h2><p>Choose the people, demonstrations and assets needed to deliver this particular video.</p>'+groups.map(e=>e.outerHTML).join('');
    }
    if(id==='viewer'&&window.__acceleratorCreatorPlannerMode)return '<h2>Audience: who is watching, and what do they want?</h2><p>Start with your coach’s prep. Add what you know about the person, the moment and the result they need.</p>'+field('Who is this video for?','promise.viewer',v.promise?.viewer||v.exactViewer)+field('What makes them click today?','viewer.moment',v.viewer?.moment)+field('What are they struggling with?','viewer.problem',v.viewer?.problem)+field('What do they want instead?','viewer.desire',v.viewer?.desire,'Keep it specific to this video')+field('Their words, doubts or objections','viewer.language',v.viewer?.language)+audience(v);
    const tpl=document.createElement('template');tpl.innerHTML=html;
    if(id==='type'&&window.__acceleratorCreatorPlannerMode){const intro=tpl.content.querySelector('.decision-head p');if(intro)intro.textContent='Choose the kind of video: tutorial, comparison, story, demonstration or another approach. This informs the story and production suggestions. Length and filming style are chosen separately in Production.';}
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
    if(id==='structure'){
      const fields=tpl.content.querySelector('[data-bind="structure.notes"]')?.closest('.fields');
      const details=[...tpl.content.querySelectorAll('details')].find(d=>/structure|organising/.test(d.querySelector('summary')?.textContent||''));
      if(fields&&details){details.querySelector(':scope > summary')?.remove();const section=document.createElement('section');section.className='workbench-section';section.innerHTML='<h2>1. Choose the story progression</h2><p>Choose how the viewer moves from their question to the payoff. This is a starting structure, not a script to copy.</p>';section.append(...details.childNodes);section.querySelector('.decision-head')?.remove();details.remove();fields.before(section);}
      fields?.insertAdjacentHTML('beforebegin','<h2>2. Plan the outline in bullet points</h2><p>For each point: the viewer’s question → the useful answer or action → a real example or proof → the next unresolved question. Write the actual content in your voice.</p>');
      [...tpl.content.querySelectorAll('h2')].filter(h=>h.textContent==='Your outline').forEach(h=>h.remove());
    }
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
    const button=event.target.closest('[data-workbench-cta],[data-remove-thumbnail-option],[data-confirm-production]');if(!button)return;const v=get('video')?.();if(!v)return;event.preventDefault();event.stopImmediatePropagation();
    if(button.hasAttribute('data-confirm-production')){const p=productionStatus(v);v.handoff ||= {};Object.assign(v.handoff,{format:p.format,layout:p.layout,formatManual:true,layoutManual:true});saveWork();return;}
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
