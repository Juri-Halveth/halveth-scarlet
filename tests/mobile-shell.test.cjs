'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const {createHash}=require('node:crypto');
function fixture({mobile=true,hub=true,embedded=false}={}){
  const all=[],windowEvents=new Map(),documentEvents=new Map(),mediaEvents=new Map();
  function element(tag='div'){
    const queries=new Map(),attributes=new Map(),classes=new Set(),events=new Map();
    const node={tagName:tag.toUpperCase(),children:[],dataset:{},style:{setProperty(){}},parentNode:null,isConnected:true,
      classList:{add(...names){names.forEach(n=>classes.add(n));},toggle(name,on){on?classes.add(name):classes.delete(name);},contains:n=>classes.has(n)},
      querySelector(key){if(!queries.has(key))queries.set(key,element());return queries.get(key);},
      setAttribute(k,v){attributes.set(k,v);},getAttribute:k=>attributes.get(k),removeAttribute:k=>attributes.delete(k),
      addEventListener(k,v){events.set(k,v);},trigger:k=>events.get(k)?.(),focus(){},
      append(...nodes){for(const child of nodes){child.remove();child.parentNode=this;this.children.push(child);}},
      prepend(...nodes){for(const child of [...nodes].reverse()){child.remove();child.parentNode=this;this.children.unshift(child);}},
      insertBefore(child,next){child.remove();child.parentNode=this;const i=this.children.indexOf(next);this.children.splice(i<0?this.children.length:i,0,child);},
      replaceChildren(...nodes){for(const child of [...this.children])child.remove();this.append(...nodes);},
      remove(){if(this.parentNode){const a=this.parentNode.children;a.splice(a.indexOf(this),1);this.parentNode=null;}},
      get nextSibling(){if(!this.parentNode)return null;return this.parentNode.children[this.parentNode.children.indexOf(this)+1]||null;},
    };all.push(node);return node;
  }
  const body=element('body'),main=element('main'),html=element('html'),profile=element('div');html.lang='de';
  body.append(main);main.append(profile);
  let nav=null;let selected=null;
  function createNav(){
    nav?.remove();nav=element('nav');nav.dataset.hubNavigation='';
    for(const lang of ['de','en','ru']){const link=element('a');link.hreflang=lang;link.addEventListener('click',()=>{selected=lang;});nav.append(link);}
    (embedded?profile:body).prepend(nav);return nav;
  }
  if(hub)createNav();
  const media={matches:mobile,addEventListener:(type,callback)=>mediaEvents.set(type,callback)};
  const document={currentScript:{src:'https://example.test/assets/portal-shell.js'},documentElement:html,body,
    querySelector:s=>s==='main'?main:s==='[data-hub-navigation]'?nav:null,createElement:element,
    addEventListener:(type,callback)=>documentEvents.set(type,callback)};
  const window={HalvethLanguage:{get:()=> 'de'},addEventListener:(type,callback)=>windowEvents.set(type,callback)};
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/portal-shell.js'),'utf8'),{
    document,window,location:new URL('https://example.test/room/'),URL,URLSearchParams,
    matchMedia:q=>q.includes('700px')?media:{matches:false},localStorage:{getItem(){return null;},setItem(){}},
    MutationObserver:class{observe(){}},setTimeout:fn=>fn(),Event:class{},
  });
  return {body,main,profile,all,get nav(){return nav;},get selected(){return selected;},
    createNav,resize(value){media.matches=value;mediaEvents.get('change')();},
    languageChanged(){windowEvents.get('halveth:language')();},
    loaded(){documentEvents.get('DOMContentLoaded')();},
  };
}
test('phone header precedes content and reuses all three working language links',()=>{
  const f=fixture(),shell=f.body.children.find(n=>n.className==='portal-shell');
  assert.ok(f.body.children.indexOf(shell)<f.body.children.indexOf(f.main));
  assert.equal(f.nav.parentNode.className,'portal-language-slot');
  for(const link of f.nav.children){link.trigger('click');assert.equal(f.selected,link.hreflang);}
  assert.equal(f.nav.children.length,3);assert.ok(f.body.classList.contains('portal-language-integrated'));
});
test('desktop restoration retains embedded ownership and language regeneration works',()=>{
  const f=fixture({embedded:true}),first=f.nav;
  f.resize(false);assert.equal(first.parentNode,f.profile);assert.equal(f.body.classList.contains('portal-language-integrated'),false);
  f.resize(true);assert.equal(first.parentNode.className,'portal-language-slot');
  const next=f.createNav();f.languageChanged();assert.equal(next.parentNode.className,'portal-language-slot');
  assert.equal(first.parentNode,null);f.resize(false);assert.equal(next.parentNode,f.profile);
});
test('source pages without a hub keep their original controls; a delayed hub can join later',()=>{
  const f=fixture({hub:false});assert.equal(f.body.classList.contains('portal-language-integrated'),false);
  const nav=f.createNav();f.loaded();assert.equal(nav.parentNode.className,'portal-language-slot');
});
test('desktop initial load leaves the existing navigation in place',()=>{
  const f=fixture({mobile:false});assert.equal(f.nav.parentNode,f.body);
  assert.equal(f.body.classList.contains('portal-language-integrated'),false);
});
test('every built HTML receives one local mobile stylesheet after its page styles',{skip:!fs.existsSync(path.join(root,'.site-build/build-info.json'))},()=>{
  const build=path.join(root,'.site-build');let count=0;
  function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);if(entry.isDirectory()){walk(file);continue;}
    if(!file.endsWith('.html'))continue;count++;
    const html=fs.readFileSync(file,'utf8'),head=html.slice(0,html.indexOf('</head>'));
    const links=[...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
    const mobile=links.filter(m=>m[1].includes('assets/mobile.css?'));
    assert.equal(mobile.length,1,file);assert.equal(links.at(-1)[1],mobile[0][1],file);
    assert.ok(fs.existsSync(path.resolve(path.dirname(file),mobile[0][1].split('?')[0])),file);
    assert.ok(/name="viewport"/.test(head),file);
    const source=fs.readFileSync(path.join(root,path.relative(build,file)),'utf8');
    const assetRefs=(text,name)=>[...text.matchAll(/\b(?:src|href)=(["'])([^"']+)\1/g)].filter(m=>m[2].split('?')[0].endsWith(name));
    for(const name of ['assets/portal-shell.css','assets/portal-shell.js','languages/hub-language.css','assets/mobile.css']){
      const refs=assetRefs(html,name);
      // Portal resources are optional page inputs; the two CSS layers are
      // injected into every page. A build must preserve the actual input set.
      const expectedCount=name.startsWith('assets/portal-shell.')?assetRefs(source,name).length:1;
      assert.equal(refs.length,expectedCount,file+' '+name);
      const expected=createHash('sha256').update(fs.readFileSync(path.join(build,name))).digest('hex');
      for(const ref of refs)assert.equal(new URL(ref[2],'https://local.test/').searchParams.get('v'),expected,file+' '+name);
    }
  }}walk(build);
  assert.equal(count,JSON.parse(fs.readFileSync(path.join(build,'build-info.json'),'utf8')).htmlPages);
  assert.ok(count>=89,'expected the whole current site');
});
