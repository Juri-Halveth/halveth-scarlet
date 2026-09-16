(()=>{'use strict';
let snapshot=null,drafts=[];
const $=id=>document.getElementById(id);
const english=()=>window.HalvethLanguage?.get()==='en';
const say=(de,en)=>english()?en:de;
const format=value=>value?new Intl.DateTimeFormat(english()?'en-GB':'de-DE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(value))+' · Berlin':say('Noch kein erfolgreicher Abruf','No successful fetch yet');
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
function render(){
  if(!snapshot)return;
  const view=window.HalvethNews.snapshotState(snapshot);
  $('news-updated').textContent=say('Snapshot erstellt: ','Snapshot created: ')+format(view.generatedAt);
  $('news-health').textContent=view.stale?say('Mindestens eine Quelle ist verzögert. Der letzte erfolgreiche Stand bleibt sichtbar.','At least one source is delayed. Its last successful snapshot remains visible.'):say('Beide Quellen wurden erfolgreich abgerufen.','Both sources were fetched successfully.');
  $('news-health').className='health '+(view.stale?'delayed':'fresh');
  $('news-sources').replaceChildren(...view.sources.map(source=>{
    const article=node('article','source-card'),heading=node('h2','',source.label),link=node('a','',say('Offizieller RSS-Feed ↗','Official RSS feed ↗'));
    link.href=source.feedUrl;link.rel='noreferrer';
    article.append(heading,node('span','badge '+source.currentStatus,source.currentStatus==='fresh'?say('Aktuell abgerufen','Fetched recently'):source.currentStatus==='stale'?say('Abruf verzögert','Fetch delayed'):say('Quelle nicht erreichbar','Source unavailable')),node('p','',say('Letzter Erfolg: ','Last success: ')+format(source.lastSuccessAt)),node('p','',say('Letzter Versuch: ','Last attempt: ')+format(source.lastAttemptAt)),link);return article;
  }));
  $('news-items').replaceChildren(...view.items.map(item=>{
    const article=node('article','news-item'),title=node('h3'),link=node('a','',item.title);link.href=item.url;link.rel='noreferrer';link.lang=item.titleLanguage;title.append(link);
    article.append(node('p','eyebrow',item.publisher),title,node('p','original',say('Originalüberschrift · Englisch','Original headline · English')),node('p','dates',say('Veröffentlicht: ','Published: ')+format(item.sourcePublishedAt)),node('p','dates',say('Zuletzt im Feed abgerufen: ','Last fetched from feed: ')+format(item.fetchedAt)));return article;
  }));
  $('news-empty').hidden=view.items.length>0;
  $('news-drafts').replaceChildren(...drafts.slice(0,7).map(draft=>{const li=node('li'),link=node('a','',draft.title+' · '+say('Entwurf ansehen','View draft'));link.href='drafts/'+draft.file;li.append(link);return li;}));
  $('draft-empty').hidden=drafts.length>0;
}
window.addEventListener('halveth:language',render);
Promise.all([fetch('../assets/news-data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('snapshot');return r.json();}),fetch('drafts/index.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{drafts:[]}).catch(()=>({drafts:[]}))]).then(([data,index])=>{snapshot=window.HalvethNews.snapshotState(data);drafts=Array.isArray(index.drafts)?index.drafts.filter(d=>/^\d{4}-\d{2}-\d{2}\.md$/.test(d.file)):[];render();}).catch(()=>{$('news-health').textContent=say('Der Quellenstand konnte gerade nicht geladen werden. Die offiziellen Feeds bleiben direkt erreichbar.','The source snapshot could not be loaded. The official feeds remain available directly.');$('news-health').className='health delayed';});
})();
