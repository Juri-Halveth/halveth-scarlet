(function(root){
  'use strict';
  function latest(data,now=Date.now()){
    if(!data||data.schemaVersion!==1||!Array.isArray(data.items)||!Array.isArray(data.sources))return null;
    const items=data.items.filter(item=>{
      try{return typeof item.title==='string'&&item.title.trim()&&new URL(item.url).protocol==='https:'&&Number.isFinite(Date.parse(item.sourcePublishedAt))&&Date.parse(item.sourcePublishedAt)<=now&&data.sources.some(source=>source.id===item.sourceId);}catch{return false;}
    }).sort((a,b)=>Date.parse(b.sourcePublishedAt)-Date.parse(a.sourcePublishedAt));
    if(!items.length)return null;
    const item=items[0],source=data.sources.find(source=>source.id===item.sourceId);
    const age=now-Date.parse(source.lastSuccessAt);
    return {item,source,stale:source.status!=='fresh'||!Number.isFinite(age)||age<0||age>180*60*1000};
  }
  if(typeof module==='object'&&module.exports){module.exports={latest};return;}
  const title=document.getElementById('news-title'),meta=document.getElementById('news-meta');
  if(!title||!meta)return;
  const script=document.currentScript;
  let snapshot=null;
  const render=()=>{
    const selected=latest(snapshot);if(!selected)return;
    const english=root.HalvethLanguage?.get()==='en';
    const {item,source,stale}=selected;
    title.textContent=item.title;title.href=item.url;
    const date=new Intl.DateTimeFormat(english?'en-GB':'de-DE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Berlin'});
    const timestamp=Date.parse(source.lastSuccessAt);
    const fetched=Number.isFinite(timestamp)?date.format(timestamp)+' Berlin':(english?'unknown':'unbekannt');
    meta.textContent=item.publisher+' · '+item.sourcePublishedAt.slice(0,10)+' · '+(english?'Fetched ':'Abruf ')+fetched+(stale?(english?' · Previous snapshot':' · Vorheriger Stand'):'');
  };
  root.addEventListener('halveth:language',render);
  fetch(new URL('news-data.json',script.src),{credentials:'omit',cache:'no-cache'})
    .then(response=>{if(!response.ok)throw new Error('NEWS_UNAVAILABLE');return response.json();})
    .then(data=>{snapshot=data;render();})
    .catch(()=>{meta.textContent=root.HalvethLanguage?.get()==='en'?'Archive: 12 September 2026 · current feed unavailable':'Archiv: 12.09.2026 · aktueller Feed nicht abrufbar';});
})(typeof window==='undefined'?globalThis:window);
