const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const read=name=>fs.readFileSync(path.join(__dirname,'../assets/'+name),'utf8');
const core=require('../assets/room-core.js');

// A small DOM fixture exercises the two production scripts together without network access.
class Element{
  constructor(tag='div',attrs={},text=''){this.tag=tag;this.attrs={...attrs};this.children=[];this.listeners={};this.dataset={};this.value='';this.hidden=false;this.textContent=text;for(const [key,value] of Object.entries(attrs))this.setAttribute(key,value);}
  get textContent(){return this.children.map(node=>node.textContent).join('');}
  set textContent(value){this.children=[];if(value)this.append({nodeValue:value,get textContent(){return this.nodeValue;}});}
  append(...nodes){for(const node of nodes){if(node.tag==='#fragment'){this.append(...node.children);continue;}node.parentElement=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(key,value){this.attrs[key]=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=String(value);}
  getAttribute(key){return this.attrs[key]??null;}
  hasAttribute(key){return Object.hasOwn(this.attrs,key);}
  removeAttribute(key){delete this.attrs[key];}
  get href(){return this.getAttribute('href');}
  set href(value){this.setAttribute('href',value);}
  matches(selectors){return selectors.split(',').some(selector=>{const m=selector.trim().match(/^([\w-]+)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/);return m&&(!m[1]||this.tag===m[1])&&(!m[2]||(this.hasAttribute(m[2])&&(m[3]===undefined||this.getAttribute(m[2])===m[3])));});}
  closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector);}
  addEventListener(name,callback){(this.listeners[name]??=[]).push(callback);}
  emit(name){return Promise.all((this.listeners[name]??[]).map(callback=>callback({preventDefault(){}})));}
  reportValidity(){return true;}
  focus(){}
  select(){}
}
function setup({initial='de',inPlace=true,clipboard,fetcher}={}){
  const html=new Element('html',inPlace?{'data-language-in-place':''}:{}),ids={},assigned=[],writes=[],events=[],replaced=[],calls={fetch:0,digest:0};
  const add=(id,tag='div',attrs={},text='')=>{const node=new Element(tag,attrs,text);ids[id]=node;html.append(node);return node;};
  add('title','title',{'data-en':'Room of traces'},'Raum der Spuren');
  add('intent','textarea',{'placeholder':'Ein Gedanke','data-en-placeholder':'A thought'}).value='Mein unveränderter Text';
  add('only-en-attr','span',{'data-en-title':'English tooltip'},'Label');
  add('dictionary','span',{},' Hallo ');
  add('german-only','p',{'data-lang':'de'},'Hallo');
  add('home','a',{href:'../index.html?v=1#earth'});
  add('external','a',{href:'https://github.com/Juri-Halveth/halveth-scarlet/issues/1'});
  add('de','button',{'data-set-lang':'de'});add('en','button',{'data-set-lang':'en'});
  for(const id of ['room-gate','room-content','gate-skip','github-comment','stamp-form','stamp-preview','preview-panel','form-status','copy-status','copy-stamp','trace-feed','feed-status','load-traces'])add(id);
  const all=()=>{const out=[];function visit(node){out.push(node);for(const child of node.children??[])visit(child);}visit(html);return out;};
  const ready=[];
  const document={documentElement:html,baseURI:'https://juri-halveth.github.io/halveth-scarlet/room/',readyState:'loading',
    addEventListener:(type,callback)=>ready.push(callback),getElementById:id=>ids[id],
    querySelectorAll:selector=>all().filter(node=>node instanceof Element&&(selector==='*'||node.matches(selector))),
    createTreeWalker(){const texts=all().filter(node=>!(node instanceof Element));let index=0;return {nextNode(){this.currentNode=texts[index++];return !!this.currentNode;}};},
    createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('#fragment'),
    createTextNode:value=>({nodeValue:value,get textContent(){return this.nodeValue;}})};
  const listeners={},window={HalvethEnglish:{Hallo:'Hello',Danke:'Thank you'},HalvethRoomCore:core,
    location:{href:document.baseURI+'?v=release&lang='+initial+'#traces',assign:url=>assigned.push(url)},
    addEventListener:(type,callback)=>(listeners[type]??=[]).push(callback),
    dispatchEvent(event){events.push(event.detail.language);for(const callback of listeners[event.type]??[])callback(event);}};
  window.history={state:{keep:true},replaceState(state,unused,url){replaced.push({state,url});window.location.href=url;}};
  const context={window,document,URL,NodeFilter:{SHOW_TEXT:4},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    localStorage:{getItem:()=>null,setItem:(key,value)=>writes.push([key,value])},navigator:{language:'de-DE',clipboard:{writeText:clipboard??(async()=>{})}},
    FormData:class{*[Symbol.iterator](){yield*Object.entries({role:'human',entity:'RACHEL',source:'',intent:'Hallo, this stays literal.',thanks:'Danke'});}},
    TextEncoder,Intl,Date,AbortController,setTimeout,clearTimeout,
    crypto:{subtle:{digest(...args){calls.digest++;return crypto.webcrypto.subtle.digest(...args);}}},
    async fetch(...args){calls.fetch++;return fetcher?fetcher(...args):{ok:true,json:async()=>[{id:123,body:'Danke',user:{login:'visitor'},created_at:'2026-09-12T14:00:00Z',updated_at:'2026-09-12T14:01:00Z',html_url:core.issueUrl+'#issuecomment-123'}]};}};
  vm.runInNewContext(read('language.js'),context);vm.runInNewContext(read('room.js'),context);ready.forEach(callback=>callback());
  return {ids,window,document,assigned,writes,events,replaced,calls,switch:lang=>window.HalvethLanguage.set(lang)};
}
test('Room language switches restore original static text and attributes while preserving values and navigation',()=>{
  for(const initial of ['de','en']){
    const h=setup({initial});h.switch('en');
    assert.equal(h.ids.title.textContent,'Room of traces');assert.equal(h.ids.dictionary.textContent,' Hello ');
    assert.equal(h.ids.intent.getAttribute('placeholder'),'A thought');assert.equal(h.ids['only-en-attr'].getAttribute('title'),'English tooltip');
    assert.equal(h.ids['german-only'].textContent,'Hallo');assert.equal(h.ids.en.getAttribute('aria-pressed'),'true');
    h.switch('de');
    assert.equal(h.ids.title.textContent,'Raum der Spuren');assert.equal(h.ids.dictionary.textContent,' Hallo ');
    assert.equal(h.ids.intent.getAttribute('placeholder'),'Ein Gedanke');assert.equal(h.ids['only-en-attr'].hasAttribute('title'),false);
    assert.equal(h.ids.intent.value,'Mein unveränderter Text');assert.equal(h.document.documentElement.lang,'de');
    assert.equal(h.window.HalvethLanguage.get(),'de');assert.equal(h.ids.de.getAttribute('aria-pressed'),'true');
    assert.equal(h.ids.home.href,'https://juri-halveth.github.io/halveth-scarlet/index.html?v=1&lang=de#earth');
    assert.equal(h.ids.external.href,core.issueUrl);assert.equal(h.window.location.href,'https://juri-halveth.github.io/halveth-scarlet/room/?v=release&lang=de#traces');
    assert.deepEqual(h.assigned,[]);assert.deepEqual(h.replaced.at(-1).state,{keep:true});assert.equal(h.ids.en.listeners.click.length,1);assert.deepEqual(h.events.slice(-2),['en','de']);
    assert.deepEqual(h.writes.slice(-2),[['halveth-language','en'],['halveth-language','de']]);assert.equal(h.calls.fetch,0);
  }
});
test('Pages without the opt-in retain navigation-based language switching',()=>{
  const h=setup({inPlace:false});h.switch('en');
  assert.equal(h.assigned[0],'https://juri-halveth.github.io/halveth-scarlet/room/?v=release&lang=en#traces');
  assert.equal(h.replaced.length,0);assert.equal(h.window.HalvethLanguage.get(),'de');
});
test('Prepared and copied drafts keep their exact hash while loaded card metadata and statuses switch languages',async()=>{
  const h=setup();await h.ids['stamp-form'].emit('submit');await h.ids['copy-stamp'].emit('click');await h.ids['load-traces'].emit('click');
  const draft=h.ids['stamp-preview'].value;assert.match(draft,/SHA-256: [0-9a-f]{64}/);
  assert.match(h.ids['feed-status'].textContent,/1 öffentlicher Kommentar geladen/);
  for(const language of ['en','de','en'])h.switch(language);
  assert.equal(h.ids['stamp-preview'].value,draft);assert.equal(h.calls.digest,1);assert.equal(h.calls.fetch,1);
  assert.match(h.ids['form-status'].textContent,/Your draft is ready/);assert.match(h.ids['copy-status'].textContent,/Copied/);
  assert.match(h.ids['feed-status'].textContent,/1 public comment loaded/);
  assert.match(h.ids['trace-feed'].textContent,/edited/);assert.match(h.ids['trace-feed'].textContent,/Original on GitHub/);
  assert.match(h.ids['trace-feed'].textContent,/Danke/);assert.doesNotMatch(h.ids['trace-feed'].textContent,/Thank you/);
  await h.ids['stamp-form'].emit('input');h.switch('de');
  assert.equal(h.ids['form-status'].textContent,'');assert.equal(h.ids['copy-status'].textContent,'');assert.equal(h.ids['stamp-preview'].value,'');
});
test('Pending clipboard and fetch operations keep their state across a language change and discard stale copy status',async()=>{
  let finishCopy,finishFetch;
  const h=setup({clipboard:()=>new Promise(resolve=>{finishCopy=resolve;}),fetcher:()=>new Promise(resolve=>{finishFetch=resolve;})});
  await h.ids['stamp-form'].emit('submit');const copying=h.ids['copy-stamp'].emit('click'),loading=h.ids['load-traces'].emit('click');
  h.switch('en');assert.match(h.ids['feed-status'].textContent,/Loading public comments/);assert.equal(h.ids['load-traces'].disabled,true);
  await h.ids['stamp-form'].emit('input');finishCopy();await copying;assert.equal(h.ids['copy-status'].textContent,'');
  finishFetch({ok:false,status:429});await loading;assert.match(h.ids['feed-status'].textContent,/GitHub is limiting requests/);
  h.switch('de');assert.match(h.ids['feed-status'].textContent,/GitHub begrenzt/);assert.equal(h.calls.fetch,1);assert.equal(h.ids['copy-status'].textContent,'');
});
