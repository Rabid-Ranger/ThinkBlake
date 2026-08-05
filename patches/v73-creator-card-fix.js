(()=>{
if(window.__v73CreatorCardFixInstalled)return;
window.__v73CreatorCardFixInstalled=true;
const text=value=>String(value??'').replace(/\s+/g,' ').trim();
function rosterRows(){
  const rows=new Set(document.querySelectorAll('.creator-row-v14,.creator-row-v13,.creator-row,.v303-creator-row,.v16-creator-row,.creator-card,[data-creator-item]'));
  document.querySelectorAll('[data-open-creator]').forEach(open=>{
    const host=open.closest('[data-creator-item],article,.creator-row-v14,.creator-row-v13,.creator-row,.v303-creator-row,.v16-creator-row,.creator-card,li,section');
    if(host)rows.add(host);
  });
  return[...rows].filter(row=>row.closest('.content')&&!row.closest('.v70-portfolio-attention,.v72-guide-drawer,[role="dialog"]'));
}
function decorate(){
  for(const row of rosterRows()){
    if(row.tagName==='ARTICLE')row.classList.add('v73-creator-card');
    if(row.querySelector(':scope > .v73-creator-avatar'))continue;
    const name=row.querySelector('h2,h3,h4,[class*="creator-name"],[class*="name"],strong,b');
    const label=text(name?.textContent||row.querySelector('[data-open-creator]')?.textContent||'');
    if(!label)continue;
    const words=label.split(/\s+/).filter(Boolean);
    const avatar=document.createElement('span');
    avatar.className='v73-creator-avatar';
    avatar.setAttribute('aria-hidden','true');
    avatar.textContent=words.slice(0,2).map(word=>word[0]||'').join('').toUpperCase();
    row.insertBefore(avatar,row.firstChild);
  }
}
let frame=0;
const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;decorate()})};
const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{subtree:true,childList:true});
const prior=window.render;if(typeof prior==='function')window.render=function(...args){const result=prior.apply(this,args);decorate();setTimeout(decorate,0);return result};
decorate();
})();
