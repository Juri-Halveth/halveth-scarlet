import * as runtime from './vendor/runtime.mjs';
import { REGIONS, VERSION, MODES, fall, sampleHits, replay, validateSave } from './core.mjs';
import { COPY, BOOKS } from './content.mjs';
import { createWorld } from './scene.mjs';

const $ = id => document.getElementById(id);
const el = (tag, text, className) => { const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n; };
const ICONS = Object.fromEntries(['ArrowLeft','ArrowRight','BookOpen','Compass','Download','Eye','FlaskConical','Globe','History','House','Minus','Pause','Play','Plus','RotateCcw','Search','Settings','Sparkles','Users','Volume2','VolumeX','X','Check','ExternalLink'].map(k=>[k,runtime[k]]));
const icons=()=>runtime.createIcons({icons:ICONS,attrs:{'aria-hidden':'true','stroke-width':1.6}});
const icon=name=>{const n=el('i');n.dataset.lucide=name;return n;};
const safeStorage={get(key){try{return localStorage.getItem(key);}catch{return null;}},set(key,value){try{localStorage.setItem(key,value);return true;}catch{return false;}}};
const langParam=new URLSearchParams(location.search).get('lang');
let lang=['de','en'].includes(langParam)?langParam:(safeStorage.get('ashbound-language')|| (navigator.language.startsWith('de')?'de':'en'));
if(!COPY[lang])lang='de';
const t=key=>COPY[lang][key];
const entities=window.HalvethUniverse.entities;
const ids=new Set(entities.map(e=>e.id));
const initial=()=>({schema:'halveth.ashbound.save.v1',version:VERSION,choices:[],region:'haven',party:['scarlet','lucinet','rachel'],books:[]});
let state=initial(), compiled, current, world, activeTab='world', activeBook=null, mode='pause', audio=null, sound=false;
let motion=!matchMedia('(prefers-reduced-motion: reduce)').matches, fallTime=0,fallRunning=false,fallLast=null;
try{const saved=safeStorage.get('ashbound-save-v1');if(saved)state=validateSave(JSON.parse(saved),ids);}catch{/* Invalid local data does not replace the playable default. */}
const tabs=[['world','compass'],['story','book-open'],['lab','flask-conical'],['books','book-open'],['council','users'],['journal','history']];
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function save(){if(!safeStorage.set('ashbound-save-v1',JSON.stringify(state)))toast(t('storageError'));}
function chime(){
  if(!sound||document.hidden)return;
  try{audio??=new AudioContext();audio.resume();const gain=audio.createGain();gain.connect(audio.destination);gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.55);
    for(const f of [220,330,440]){const osc=audio.createOscillator();osc.type='sine';osc.frequency.value=f;osc.connect(gain);osc.start();osc.stop(audio.currentTime+.6);}
  }catch{sound=false;$('sound').checked=false;}
}
function translate(){
  document.documentElement.lang=lang;$('language').textContent=lang==='de'?'EN':'DE';
  document.querySelectorAll('[data-t]').forEach(n=>n.textContent=t(n.dataset.t));
  document.querySelectorAll('[data-title]').forEach(n=>{n.title=t(n.dataset.title);n.setAttribute('aria-label',t(n.dataset.title));});
  document.querySelectorAll('[data-placeholder]').forEach(n=>n.placeholder=t(n.dataset.placeholder));
  $('tabs').replaceChildren(...tabs.map(([key,name])=>{const b=el('button');b.append(icon(name),el('span',t(key)));b.type='button';b.dataset.tab=key;if(key===activeTab)b.setAttribute('aria-current','page');b.onclick=()=>show(key);return b;}));
  $('places').replaceChildren(...REGIONS.map((r,i)=>{const b=el('button');b.append(el('span',String(i+1).padStart(2,'0')),el('span',r[lang]));b.dataset.region=r.id;b.onclick=()=>selectPlace(r.id);return b;}));
  renderPlace();renderBooks();renderCouncil();renderModes();renderJournal();if(compiled)renderStory();
  if(activeBook!==null)openBook(activeBook,false);
  drawFall();sample();icons();
}
function show(tab){
  if(!tabs.some(([key])=>key===tab))tab='world';activeTab=tab;
  for(const [key]of tabs)$(key).hidden=key!==tab;
  for(const b of $('tabs').children){if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
  history.replaceState(null,'',`${location.pathname}?lang=${lang}#${tab}`);
  world?.visible(tab==='world');
  if(tab!=='lab'){fallRunning=false;fallLast=null;}
  if(tab==='lab'){drawFall();sample();}
  if(tab==='journal')renderJournal();window.scrollTo({top:0,behavior:'instant'});
}
function renderPlace(){
  const index=REGIONS.findIndex(r=>r.id===state.region),r=REGIONS[index];
  $('location-number').textContent=`${String(index+1).padStart(2,'0')} / 06`;$('location-name').textContent=r[lang];$('location-note').textContent=t('placeNote')[index];
  for(const b of $('places').children)b.setAttribute('aria-pressed',String(b.dataset.region===state.region));world?.select(state.region);
}
function selectPlace(id){if(!REGIONS.some(r=>r.id===id))return;state.region=id;renderPlace();save();chime();}
function renderStory(){
  try{current=replay(runtime.Story,compiled[lang],state.choices);}catch{state.choices=[];current=replay(runtime.Story,compiled[lang],[]);toast(t('invalid'));}
  const {frame}=current,host=$('story-content');host.replaceChildren();
  const title=el('h2',frame.lines[frame.headingIndex]);host.append(title);
  frame.lines.forEach((line,i)=>{if(i!==frame.headingIndex)host.append(el('p',line));});
  const choices=el('div',undefined,'choices');
  frame.choices.forEach((text,index)=>{
    const b=el('button');b.append(el('span',String(index+1).padStart(2,'0')),el('span',text),icon('arrow-right'));
    b.onclick=()=>{state.choices.push(index);renderStory();const region=current.frame.tags.find(s=>s.startsWith('region:'))?.split(':')[1].trim();if(REGIONS.some(r=>r.id===region))state.region=region;save();renderPlace();renderJournal();chime();host.scrollIntoView({block:'start',behavior:motion?'smooth':'instant'});};choices.append(b);
  });host.append(choices);
  const stats=el('div',undefined,'story-values');
  const labels=lang==='de'?['Wissen','Freiheit','Fuersorge']:['Knowledge','Freedom','Care'];
  Object.values(frame.values).forEach((value,i)=>stats.append(el('span',`${labels[i]} ${value}`)));host.append(stats);
  if(!frame.choices.length)host.append(el('p',t('ending'),'quiet'));
  $('chapter-list').replaceChildren(...REGIONS.map((r,i)=>el('li',`${i+1} / ${r[lang]}`,i===state.choices.length?'current':i<state.choices.length?'done':'')));
  $('undo').disabled=state.choices.length===0;
  $('story-party').replaceChildren(...state.party.map(id=>{const e=entities.find(e=>e.id===id),n=el('div');n.append(el('strong',e.label),el('p',lang==='de'?e.role:e.en.role,'quiet'));return n;}));
  icons();
}
function partyChange(id){
  if(state.party.includes(id))state.party=state.party.filter(v=>v!==id);
  else if(state.party.length<3)state.party.push(id);else{toast(t('partyFull'));return;}
  save();renderCouncil();if(compiled)renderStory();
}
function renderCouncil(){
  const query=$('entity-search').value.toLocaleLowerCase(lang).trim();
  const matches=entities.filter(e=>`${e.label} ${e.role} ${e.en.role}`.toLocaleLowerCase(lang).includes(query));
  $('entity-count').textContent=`${matches.length} / ${entities.length} ${t('results')}`;
  $('party-strip').replaceChildren(...state.party.map(id=>{const e=entities.find(e=>e.id===id),b=el('button');b.append(el('span',e.label),icon('x'));b.setAttribute('aria-label',`${e.label}: ${t('remove')}`);b.onclick=()=>partyChange(id);return b;}));
  if(!state.party.length)$('party-strip').append(el('p',t('empty'),'quiet'));
  $('entity-grid').replaceChildren(...matches.map(e=>{
    const card=el('article',undefined,'entity');card.dataset.entity=e.id;card.dataset.active=state.party.includes(e.id);
    card.append(el('span',String(entities.indexOf(e)+1).padStart(2,'0')+' / 69','entity-number'),el('h3',e.label),el('p',lang==='de'?e.role:e.en.role));
    const actions=el('div',undefined,'entity-actions'),a=el('a',t('dossier'));a.href=`../../${e.profilePath}?lang=${lang}`;
    const b=el('button',state.party.includes(e.id)?t('remove'):t('choose'));b.onclick=()=>partyChange(e.id);b.setAttribute('aria-pressed',String(state.party.includes(e.id)));actions.append(a,b);card.append(actions);return card;
  }));icons();
}
function renderBooks(){
  $('book-count').textContent=`${state.books.length} / 6 ${t('read')}`;
  $('bookshelf').replaceChildren(...BOOKS.map((book,i)=>{const b=el('button',undefined,'book'),cover=el('span',['I','II','III','IV','V','VI'][i],'book-spine'),copy=el('span');
    copy.append(el('strong',book[lang][0]),el('small',book[lang][1]),el('em',state.books.includes(i)?t('read'):t('bookRead')));b.append(cover,copy);b.onclick=()=>openBook(i);return b;}));
}
function openBook(i,showDialog=true){activeBook=i;const book=BOOKS[i][lang];$('book-name').textContent=book[0];$('book-author').textContent=book[1];$('book-text').replaceChildren(...book[2].split('\n').map(p=>el('p',p)));
  if(showDialog){if(!state.books.includes(i)){state.books.push(i);save();renderBooks();}$('book-dialog').showModal();}}
function renderJournal(){
  const host=$('journey-record');host.replaceChildren();
  if(!state.choices.length)host.append(el('li',t('noDecisions')));
  else if(compiled){const result=replay(runtime.Story,compiled[lang],state.choices);state.choices.forEach((choice,i)=>{const frame=result.history[i];host.append(el('li',`${i+1}. ${frame.lines[frame.headingIndex]}: ${frame.choices[choice]}`));});}
}
function renderModes(){
  $('mode-switch').replaceChildren(...MODES.map(m=>{const b=el('button',t(m));b.dataset.mode=m;b.setAttribute('aria-pressed',String(m===mode));b.onclick=()=>{mode=m;fallTime=0;fallRunning=false;renderModes();drawFall();};return b;}));
  $('mode-note').textContent=t(mode==='pause'?'pausedNote':mode==='stop'?'stopNote':'restoreNote');
  $('energy-label').textContent=t(mode==='restore'?'restoreEnergy':'energy');
}
const params=()=>({height:Number($('height').value),velocity:Number($('speed').value),mass:Number($('mass').value),mode,time:fallTime});
function drawFall(){
  const input=params(),result=fall(input),c=$('fall-canvas'),ctx=c.getContext('2d');
  $('height-value').textContent=`${input.height} m`;$('speed-value').textContent=`${input.velocity} m/s`;$('mass-value').textContent=`${input.mass} kg`;
  $('energy-value').textContent=`${(mode==='restore'?result.restoredEnergy:result.removedEnergy).toLocaleString(lang,{maximumFractionDigits:1})} J`;
  ctx.fillStyle='#17231f';ctx.fillRect(0,0,800,500);ctx.strokeStyle='#334a3d';ctx.lineWidth=1;
  for(let i=0;i<6;i++){const y=65+i*68;ctx.beginPath();ctx.moveTo(65,y);ctx.lineTo(745,y);ctx.stroke();ctx.fillStyle='#91bba0';ctx.font='17px monospace';ctx.fillText(`${Math.round(input.height*(1-i/5))}m`,12,y+5);}
  ctx.fillStyle='#243f30';ctx.fillRect(65,410,680,40);
  ctx.setLineDash([7,9]);ctx.beginPath();ctx.moveTo(340,65);ctx.lineTo(340,405);ctx.strokeStyle='#678875';ctx.stroke();ctx.setLineDash([]);
  const y=65+(1-result.height/input.height)*340;
  ctx.fillStyle=mode==='pause'?'#8dc7e5':mode==='stop'?'#b7e8c5':'#e9b496';ctx.beginPath();ctx.moveTo(340,y-24);ctx.lineTo(365,y-7);ctx.lineTo(357,y+21);ctx.lineTo(327,y+27);ctx.lineTo(313,y+2);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e5efde';ctx.font='22px monospace';ctx.fillText(`${result.velocity.toFixed(2)} m/s`,405,Math.min(400,y+7));
  ctx.fillStyle='#9cb5a1';ctx.font='17px monospace';ctx.fillText(`g = 9.81 m/s2`,505,470);
  $('fall-status').textContent=`t = ${result.elapsed.toFixed(2)} s | h = ${result.height.toFixed(2)} m | v = ${result.velocity.toFixed(2)} m/s`;
  return result;
}
function stepFall(now){
  if(!fallRunning)return;
  if(document.hidden||activeTab!=='lab'){fallRunning=false;fallLast=null;return;}
  if(fallLast!==null)fallTime+=Math.min((now-fallLast)/1000,.08);fallLast=now;
  const result=drawFall();if(result.landed||mode==='pause'||fallTime>=30){fallRunning=false;fallLast=null;return;}requestAnimationFrame(stepFall);
}
function sample(){
  if(!$('probability').checkValidity()||!$('seed').checkValidity())return;
  const result=sampleHits(Number($('probability').value),Number($('count').value),Number($('seed').value));
  const values=[[t('expected'),result.expected.toLocaleString(lang,{maximumFractionDigits:2})],[t('observed'),`${result.total} / ${result.count}`],[t('any'),`${(result.atLeastOne*100).toLocaleString(lang,{maximumFractionDigits:3})}%`]];
  $('hit-results').replaceChildren(...values.map(([label,value])=>{const d=el('div');d.append(el('span',label),el('strong',value));return d;}));
  const c=$('hit-canvas'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);const cols=100,rows=Math.ceil(result.count/cols),w=c.width/Math.min(result.count,cols),h=c.height/rows;
  result.hits.forEach((hit,i)=>{ctx.fillStyle=hit?'#a6d9b4':'#46584c';ctx.fillRect((i%cols)*w,Math.floor(i/cols)*h,Math.max(1,w-2),Math.max(1,h-2));});
}
function exportSave(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='ASHBOUND-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('language').onclick=()=>{lang=lang==='de'?'en':'de';safeStorage.set('ashbound-language',lang);translate();show(activeTab);};
$('enter-story').onclick=()=>show('story');$('undo').onclick=()=>{state.choices.pop();renderStory();state.region=current.frame.tags.find(s=>s.startsWith('region:'))?.split(':')[1].trim()||'haven';save();renderPlace();renderJournal();};
$('restart').onclick=()=>{if(confirm(t('resetConfirm'))){exportSave();state=initial();save();translate();show('story');}};
$('entity-search').oninput=renderCouncil;$('export').onclick=exportSave;
$('import').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>16384)throw new Error('size');const next=validateSave(JSON.parse(await file.text()),ids);if(!compiled)throw new Error('loading');replay(runtime.Story,compiled[lang],next.choices);state=next;save();translate();toast(t('imported'));}catch{toast(t('invalid'));}finally{e.target.value='';}
};
for(const id of ['height','speed','mass'])$(id).oninput=()=>{fallTime=0;fallRunning=false;drawFall();};
$('fall-run').onclick=()=>{fallTime=0;fallLast=null;if(!fallRunning){fallRunning=true;requestAnimationFrame(stepFall);}chime();};
$('sample').onclick=()=>{if(!$('probability').reportValidity()||!$('seed').reportValidity())return;sample();chime();};
$('model-max').onclick=()=>{$('probability').value='1';sample();};
$('settings-open').onclick=()=>$('settings-dialog').showModal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
$('book-dialog').onclose=()=>{activeBook=null;};
$('motion').checked=motion;$('motion').onchange=()=>{motion=$('motion').checked;world?.motion(motion);};
$('sound').onchange=()=>{sound=$('sound').checked;if(sound)chime();else audio?.suspend();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio?.suspend();fallRunning=false;fallLast=null;}});
$('quality').onchange=()=>world?.quality($('quality').value);
$('zoom-in').onclick=()=>world?.zoom(.88);$('zoom-out').onclick=()=>world?.zoom(1.12);$('fit').onclick=()=>world?.reset();
translate();show(location.hash.slice(1));
try{world=createWorld($('scene'),{onSelect:selectPlace,reducedMotion:!motion,onError:()=>{$('scene-status').hidden=false;$('scene-status').textContent=t('fallback');}});world.select(state.region);world.visible(activeTab==='world');$('scene-status').hidden=true;}catch{$('scene-status').textContent=t('fallback');for(const id of ['zoom-in','zoom-out','fit'])$(id).disabled=true;}
try{
  const de=await fetch('story.de.json'),en=await fetch('story.en.json');if(!de.ok||!en.ok)throw new Error('story-fetch');
  compiled={de:await de.json(),en:await en.json()};renderStory();renderJournal();document.body.dataset.ready='true';
}catch{$('story-content').replaceChildren(el('p',t('error')));document.body.dataset.ready='error';}
Object.defineProperty(window,'AshboundDiagnostics',{get:()=>({version:VERSION,entities:entities.length,region:state.region,choices:[...state.choices],party:[...state.party],books:[...state.books],tab:activeTab,scene:world?.stats??null})});
