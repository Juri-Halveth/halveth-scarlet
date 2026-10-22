const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('technical news tile remains technical even when historical stories exist',()=>{
 const source=read('assets/events.js').split('\n').find(line=>line.startsWith('function renderNews('));
 const wire={dataset:{newsSource:'technical'},matches:()=>false,contains:()=>false};
 const title={textContent:'Technical demos',href:'forschung/wegweiser/'},meta={textContent:'Nine entries'};
 const context=vm.createContext({stories:[{title:'Old news',url:'https://example.invalid',publisher:'Old',date:'2000-01-01'}],document:{querySelector:()=>wire,activeElement:null},newsTitle:title,newsMeta:meta,newsIndex:-1,L:{t:x=>x}});
 vm.runInContext(source+';renderNews(15000);',context);assert.equal(title.textContent,'Technical demos');assert.equal(meta.textContent,'Nine entries');
});
test('all localized guides expose nine real demo routes and preserve local-preview URLs',()=>{
 for(const [file,lang]of [['index.html','de'],['en.html','en'],['ru.html','ru']]){
  const html=read('forschung/wegweiser/'+file);assert.ok(html.includes(`<html lang="${lang}">`));assert.equal((html.match(/class="work-card"/g)||[]).length,9);
  for(const [,url]of html.matchAll(/href="(\.\.\/[^"#]+)"/g)){const target=path.resolve(root,'forschung/wegweiser',url);assert.ok(fs.existsSync(target),url);}
 }
 const source=read('tools/build_profiles.mjs');assert.doesNotMatch(source,/\/halveth-scarlet\/forschung\/wegweiser/);
 const registry={window:{}};vm.runInNewContext(read('assets/universe-data.js'),registry);
 for(const entity of registry.window.HalvethUniverse.entities){
  for(const item of [...entity.sourceRefs,{url:entity.url||''}])assert.doesNotMatch(item.url,/forschung\/(?:q-notizen|usdai-sabr-kontext|brightcast-starlight)\//);
 }
});
test('chronicle saves wait for story admission and healthy kernel is required for encounter advancement',()=>{
 const source=read('forschung/ashbound/app.mjs'),writes=[];
 const save=source.split('\n').find(line=>line.startsWith('function save(){'));
 const context=vm.createContext({writes,storyStatus:'loading',pendingSave:false,saveProtected:false,state:{choices:[999]},safeStorage:{set:(key,value)=>{writes.push([key,value]);return true;}},toast(){},t:x=>x});
 vm.runInContext(save+';save();',context);assert.equal(writes.length,0);assert.equal(context.pendingSave,true);
 vm.runInContext("storyStatus='ready';save();",context);assert.equal(writes.length,1);
 const begin=source.indexOf('function advanceEncounter(){'),end=source.indexOf('\nfunction renderStory()',begin);
 for(const values of [{kernelBusy:true,kernelError:false,kernelLedger:{},kernelAnchorId:'anchor'},{kernelBusy:false,kernelError:true,kernelLedger:{},kernelAnchorId:'anchor'},{kernelBusy:false,kernelError:false,kernelLedger:null,kernelAnchorId:null}]){
  let calls=0;const gate=vm.createContext({...values,renderEncounter(){},attemptStep(){calls++;throw Error('unavailable kernel must not progress');}});
  vm.runInContext(source.slice(begin,end)+';advanceEncounter();',gate);assert.equal(calls,0);
 }
});
test('interrupted travel returns to the actually reached node before choosing another graph route',async()=>{
 const {routeBetween}=await import('../forschung/ashbound/expedition.mjs');
 const source=read('forschung/ashbound/scene.mjs'),begin=source.indexOf("  let currentRegion='haven'"),end=source.indexOf('  const selector=',begin);
 class Vector{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}clone(){return new Vector(this.x,this.y,this.z);}copy(v){Object.assign(this,v);return this;}}
 const positions=new Map(['haven','garden','archive','crater','stasis','gate'].map((id,i)=>[id,new Vector(i,0,0)]));
 const context=vm.createContext({routeBetween,pilgrimPosition:id=>positions.get(id),pilgrim:{position:new Vector(),rotation:{y:0}},motion:true,invalid:false});
 const complete=source.split('\n').find(line=>line.trim().startsWith('if(travelT===1){'));
 vm.runInContext(source.slice(begin,end)+";travel('gate');globalThis.snapshot=()=>({currentRegion,targetRegion,next:travelTo?.id,remaining:travelNodes.map(x=>x.id)});globalThis.redirect=travel;globalThis.complete=()=>{travelT=1;"+complete+"};",context);
 assert.equal(context.snapshot().currentRegion,'haven');assert.equal(context.snapshot().targetRegion,'gate');
 context.complete();assert.equal(context.snapshot().currentRegion,'garden');assert.equal(context.snapshot().next,'archive');
 context.redirect('stasis');const state=context.snapshot();assert.equal(state.currentRegion,'garden');assert.equal(state.next,'garden');assert.equal(state.remaining.at(-1),'stasis');
});
