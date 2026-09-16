(()=>{'use strict';
const L=window.HalvethLanguage||{t:value=>value,get:()=>'de',link:path=>path};
const raw=window.HalvethUniverse;
const entities=raw.entities.map(entity=>L.get()==='en'?{...entity,...entity.en}:entity);
const byId=new Map(entities.map(entity=>[entity.id,entity]));
const dialog=document.querySelector('#entity-dialog'),directory=document.querySelector('#entity-list');
const target=entity=>L.link(entity.profilePath);
const profileLabel=entity=>entity.label+(L.get()==='en'?' · Open profile':' · Profil öffnen');
const tones=['#b7ffe1','#b5c9ff','#efb0d8','#e5d8a5'];
raw.featured.forEach((id,index)=>{
  const entity=byId.get(id);if(!entity)return;
  const link=document.createElement('a');link.className='entity-bubble';link.dataset.entity=id;
  link.textContent=entity.label;link.href=target(entity);link.setAttribute('aria-label',profileLabel(entity));
  link.title=profileLabel(entity);link.style.setProperty('--bubble-tone',tones[index%4]);link.style.setProperty('--delay',(-index*.73)+'s');
  document.querySelector(index<raw.featured.length/2?'.constellation-left':'.constellation-right').append(link);
});
for(const entity of entities){
  const link=document.createElement('a');link.href=target(entity);link.textContent=entity.label;link.dataset.entity=entity.id;
  const fieldNames=entity.id==='verachel'?[...raw.verachelNameField.highlights.map(item=>item.label),...raw.verachelNameField.microNames].join(' '):'';
  link.dataset.search=(entity.label+' '+entity.role+' '+fieldNames).toLocaleLowerCase(L.get());
  link.setAttribute('aria-label',profileLabel(entity));directory.append(link);
}
for(const link of document.querySelectorAll('.figure')){
  const entity=byId.get(link.dataset.figure);if(!entity)continue;
  link.href=target(entity);link.setAttribute('aria-label',profileLabel(entity));link.title=profileLabel(entity);
}
document.querySelector('#directory-count').textContent=entities.length+(L.get()==='en'?' profiles & sources':' Profile & Quellen');
let openedFromHash=false;
const hashId=()=>{try{return decodeURIComponent(location.hash.slice(1));}catch{return '';}};
function openDirectory(fromHash=false){
  openedFromHash=fromHash;if(!dialog.open)dialog.showModal();document.querySelector('#entity-filter').focus();
}
function syncHash(){
  const id=hashId();if(id==='team'){openDirectory(true);return;}
  if(byId.has(id)){window.location.replace(target(byId.get(id)));return;}
  if(openedFromHash&&dialog.open)dialog.close();openedFromHash=false;
}
document.querySelector('#garden-open').addEventListener('click',()=>openDirectory(false));
document.querySelector('#entity-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{
  if(!openedFromHash)return;openedFromHash=false;
  if(hashId()==='team'){const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);}
});
document.querySelector('#entity-filter').addEventListener('input',event=>{
  const query=event.target.value.toLocaleLowerCase(L.get());let count=0;
  for(const link of directory.children){link.hidden=!link.dataset.search.includes(query);if(!link.hidden)count++;}
  document.querySelector('#empty-directory').hidden=count>0;
});
for(const button of document.querySelectorAll('[data-chain]'))button.addEventListener('click',()=>{
  const entity=byId.get(button.dataset.chain);if(entity)window.location.assign(target(entity));
});
window.addEventListener('hashchange',syncHash);if(location.hash)queueMicrotask(syncHash);
})();
