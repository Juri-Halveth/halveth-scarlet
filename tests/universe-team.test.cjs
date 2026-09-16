const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'assets/universe.js'),'utf8');
const registryContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/universe-data.js'),'utf8'),registryContext);
const registry=registryContext.window.HalvethUniverse;
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.listeners={};this.open=false;this.style={setProperty(){}};}
 addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
 emit(type,event={}){for(const fn of this.listeners[type]||[])fn(event);}
 append(child){this.children.push(child);}
 setAttribute(name,value){this[name]=String(value);}
 focus(){this.focused=true;}
 showModal(){this.open=true;}
 close(){if(this.open){this.open=false;this.emit('close');}}
}
function harness(hash='',language='en'){
 const selectors=['#entity-dialog','#entity-list','#directory-count','#entity-filter','#garden-open','#entity-close','#empty-directory','.constellation-left','.constellation-right'];
 const elements=Object.fromEntries(selectors.map(selector=>[selector,new Element()]));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const figures=[...html.matchAll(/data-figure="([^"]+)"/g)].map(([,id])=>{const e=new Element('a');e.dataset.figure=id;return e;});
 const chain=new Element('button');chain.dataset.chain='gitcoin';const microtasks=[],hashListeners=[],replacements=[],assignments=[];
 const location={hash,href:`https://example.test/halveth-scarlet/?lang=${language}${hash}`,replace:url=>replacements.push(url),assign:url=>assignments.push(url)};
 const history={state:null,replaceState(_state,_title,url){location.href=String(url);location.hash=new URL(url).hash;}};
 const document={querySelector:selector=>elements[selector]||null,querySelectorAll:selector=>selector==='.figure'?figures:selector==='[data-chain]'?[chain]:[],createElement:tag=>new Element(tag)};
 const link=value=>{const url=new URL(value,location.href);url.searchParams.set('lang',language);return url.href;};
 const window={location,HalvethUniverse:registry,HalvethLanguage:{get:()=>language,t:value=>value,link},addEventListener(type,fn){if(type==='hashchange')hashListeners.push(fn);}};
 vm.runInNewContext(source,{window,document,location,history,URL,queueMicrotask:fn=>microtasks.push(fn)});
 return{elements,figures,chain,location,replacements,assignments,link,flush(){while(microtasks.length)microtasks.shift()();},hashchange(value){location.hash=value;for(const fn of hashListeners)fn();}};
}
test('all real featured cards and orbiters use native profile links without tunnel listeners',()=>{
 const h=harness();const bubbles=[...h.elements['.constellation-left'].children,...h.elements['.constellation-right'].children];
 assert.equal(bubbles.length,registry.featured.length);assert.equal(h.figures.length,12);
 for(const link of [...bubbles,...h.figures]){const id=link.dataset.entity||link.dataset.figure;assert.equal(link.tagName,'A');assert.equal(link.href,h.link(`entities/${id}/`));assert.equal(link.listeners.click,undefined);assert.doesNotMatch(link.href,/reddit/i);}
 assert.doesNotMatch(source,/HalvethRedditTunnel/);
});
test('the complete directory uses separate native destinations for every actual registry entity',()=>{
 const h=harness();const links=h.elements['#entity-list'].children;
 assert.equal(links.length,registry.entities.length);assert.equal(new Set(links.map(link=>link.href)).size,registry.entities.length);
 for(const link of links){assert.equal(link.tagName,'A');assert.equal(link.listeners.click,undefined);}
});
test('team deep links retain directory behavior and closing permits reopening',()=>{
 const h=harness('#team');h.flush();assert.equal(h.elements['#entity-dialog'].open,true);assert.equal(h.elements['#entity-filter'].focused,true);
 h.elements['#entity-close'].emit('click');assert.equal(h.location.hash,'');h.hashchange('#team');assert.equal(h.elements['#entity-dialog'].open,true);
 h.hashchange('');assert.equal(h.elements['#entity-dialog'].open,false);
});
test('garden button opens the directory without rewriting the URL',()=>{
 const h=harness();h.elements['#garden-open'].emit('click');assert.equal(h.elements['#entity-dialog'].open,true);assert.equal(h.location.hash,'');
});
test('every legacy entity hash redirects directly with the selected language',()=>{
 for(const language of ['de','en'])for(const entity of registry.entities){const h=harness('#'+entity.id,language);h.flush();assert.deepEqual(h.replacements,[h.link(entity.profilePath)]);assert.equal(h.elements['#entity-dialog'].open,false);}
});
test('unknown and malformed hashes are left untouched',()=>{
 for(const hash of ['#unknown','#%E0%A4%A']){const h=harness(hash);h.flush();assert.deepEqual(h.replacements,[]);assert.equal(h.elements['#entity-dialog'].open,false);}
});
test('directory search retains the VERACHEL name field search tokens',()=>{
 const h=harness();h.elements['#entity-filter'].emit('input',{target:{value:'Andrea'}});
 const visible=h.elements['#entity-list'].children.filter(link=>!link.hidden);assert.deepEqual(visible.map(link=>link.dataset.entity),['verachel']);
 h.elements['#entity-filter'].emit('input',{target:{value:'zz-no-match'}});assert.equal(h.elements['#empty-directory'].hidden,false);
});
test('chain references open their own profiles before external documentation',()=>{
 const h=harness();h.chain.emit('click');assert.deepEqual(h.assignments,[h.link('entities/gitcoin/')]);
});
