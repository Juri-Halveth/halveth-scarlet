'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function element(tag='div'){
 const nodes=new Map(),listeners=new Map(),attributes=new Map();
 return {tagName:tag.toUpperCase(),textContent:'',value:'',hidden:false,dataset:{},children:[],checked:false,id:'',
  style:{setProperty(){}},classList:{add(){},toggle(){}},
  querySelector(selector){if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);},
  querySelectorAll(){return[];},setAttribute(key,value){attributes.set(key,String(value));},getAttribute:key=>attributes.get(key),removeAttribute:key=>attributes.delete(key),
  addEventListener(type,callback){listeners.set(type,callback);},trigger(type){listeners.get(type)?.();},
  append(...children){this.children.push(...children);},prepend(...children){this.children.unshift(...children);},replaceChildren(...children){this.children=children;},focus(){},
 };
}
test('Russian portal routes stay labelled and keep their exact route IDs, links and notes',()=>{
 let language='ru';const main=element('main'),body=element('body'),documentElement=element('html');documentElement.lang='ru';
 const document={currentScript:{src:'https://juri-halveth.github.io/halveth-scarlet/assets/portal-shell.js'},documentElement,body,querySelector:s=>s==='main'?main:null,createElement:element,addEventListener(){}};
 const observerCallbacks=[];
 const window={HalvethLanguage:{get:()=>language},HalvethHubLanguage:{t:source=>'RU: '+source}};
 vm.runInNewContext(read('assets/portal-shell.js'),{window,document,location:new URL('https://juri-halveth.github.io/halveth-scarlet/room/?lang=ru'),URL,URLSearchParams,localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:false}),MutationObserver:class{constructor(callback){observerCallbacks.push(callback);}observe(){}},setTimeout,Event:class{}});
 const shell=body.children.find(n=>n.className==='portal-shell'),map=body.children.find(n=>n.className==='portal-map');
 assert.equal(shell.querySelector('.portal-route-name').textContent,'RU: Raum der Spuren');
 const grid=map.querySelector('.portal-grid');assert.equal(grid.children.length,19);
 const ids=grid.children.map(n=>n.dataset.portalRoute);
 for(const node of grid.children){assert.match(node.children[1].textContent,/^RU: .+/);assert.match(node.children[2].textContent,/^RU: .+/);assert.equal(new URL(node.href).searchParams.get('lang'),'ru');}
 assert.equal(new URL(grid.children.find(n=>n.dataset.portalRoute==='team').href).hash,'#team');
 language='en';documentElement.lang='en';observerCallbacks[0]();
 assert.equal(shell.querySelector('.portal-route-name').textContent,'Room of traces');assert.deepEqual(grid.children.map(n=>n.dataset.portalRoute),ids);
 language='de';documentElement.lang='de';observerCallbacks[0]();assert.equal(shell.querySelector('.portal-route-name').textContent,'Raum der Spuren');
});
test('Russian profile searches match localized descriptions without rewriting bound search data or names',()=>{
 let language='ru';const input=element('input'),status=element(),label=element('span');label.textContent='Kraft, die zuhören kann.';
 const entry=element('li');entry.dataset.search='thor kraft, die zuhören kann. strength that can listen.';entry.querySelectorAll=()=>[label];
 const original=entry.dataset.search;
 const document={documentElement:{lang:'ru'},getElementById:id=>id==='profile-search'?input:id==='profile-results'?status:null,querySelectorAll:()=>[entry]};
 const window={HalvethLanguage:{get:()=>language},HalvethHubLanguage:{searchable:source=>source+' Сила, которая умеет слушать.'},addEventListener(){}};
 vm.runInNewContext(read('assets/entity-profile.js'),{window,document});
 input.value='слушать';input.trigger('input');assert.equal(entry.hidden,false);assert.equal(status.textContent,'1 из 1 записей');assert.equal(entry.dataset.search,original);
 input.value='неизвестное';input.trigger('input');assert.equal(entry.hidden,true);
 language='de';input.value='thor';input.trigger('input');assert.equal(entry.hidden,false);assert.equal(status.textContent,'1 von 1 Einträgen');assert.equal(entry.dataset.search,original);
});
test('Russian collage choices and status have readable labels while retaining caption and lane state',()=>{
 let language='ru';const elements=new Map();for(const id of ['atelier-canvas','atelier-files','atelier-status','atelier-caption','local-file-note'])elements.set('#'+id,element());
 elements.get('#atelier-caption').value='My own caption / мой текст';const originalCaption=elements.get('#atelier-caption').value;
 const context=new Proxy({},{get:()=>()=>{}});elements.get('#atelier-canvas').getContext=()=>context;
 const button=element('button');button.dataset.choiceLane='mine';const events=new Map();
 const document={querySelector:s=>elements.get(s)||null,querySelectorAll:s=>s==='[data-choice-lane]'?[button]:[],createElement:element};
 const window={HalvethLanguage:{get:()=>language},HalvethHubLanguage:{t:source=>'RU: '+source},ChoiceAtelierCore:{cycleLane:()=> 'ask'},addEventListener:(type,callback)=>events.set(type,callback)};
 vm.runInNewContext(read('assets/collage.js'),{window,document,Image:class{set src(value){}},URL,Promise});
 assert.equal(button.querySelector('small').textContent,'RU: Meine Wahl');
 assert.match(elements.get('#atelier-status').textContent,/^RU: Die Originalmotive/);
 button.trigger('click');assert.equal(button.dataset.choiceLane,'ask');assert.equal(button.querySelector('small').textContent,'RU: Erst fragen');
 language='en';events.get('halveth:language')();assert.equal(button.querySelector('small').textContent,'Ask first');
 language='ru';events.get('halveth:language')();assert.equal(button.querySelector('small').textContent,'RU: Erst fragen');
 assert.equal(elements.get('#atelier-caption').value,originalCaption);assert.equal(button.dataset.choiceLane,'ask');
});
