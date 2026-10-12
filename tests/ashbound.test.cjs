const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..'),dir=path.join(root,'forschung/ashbound');
const load=name=>import(pathToFileURL(path.join(dir,name)).href);
const registry={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/universe-data.js'),'utf8'),registry);
const ids=new Set(registry.window.HalvethUniverse.entities.map(e=>e.id));

test('all 108 Ink paths complete in both languages with matching decisions and variables',async()=>{
  const {Story}=await load('vendor/runtime.mjs'),{replay}=await load('core.mjs');
  const stories=Object.fromEntries(['de','en'].map(l=>[l,JSON.parse(fs.readFileSync(path.join(dir,`story.${l}.json`),'utf8'))]));
  const endings=new Set();let count=0;
  function visit(choices){const de=replay(Story,stories.de,choices),en=replay(Story,stories.en,choices);
    assert.equal(de.frame.choices.length,en.frame.choices.length);assert.deepEqual(de.frame.values,en.frame.values);
    assert.deepEqual(de.frame.tags,en.frame.tags);assert.ok(de.frame.lines.length>=3);assert.ok(en.frame.lines.length>=3);
    if(!de.frame.choices.length){count++;endings.add(de.frame.lines[de.frame.headingIndex+1]);assert.equal(choices.length,5);return;}
    de.frame.choices.forEach((_,i)=>visit([...choices,i]));
  }
  visit([]);assert.equal(count,108);assert.equal(endings.size,3);
  assert.throws(()=>replay(Story,stories.de,[2]),/unreachable/);
});
test('paused time, braking and restored velocity remain distinct and conserve declared energy',async()=>{
  const {fall}=await load('core.mjs'),p={height:40,velocity:15,mass:10,time:1};
  const a=fall({...p,mode:'pause'}),b=fall({...p,mode:'stop'}),c=fall({...p,mode:'restore'});
  assert.equal(a.height,40);assert.equal(a.velocity,15);assert.equal(a.elapsed,0);
  assert.equal(b.removedEnergy,1125);assert.equal(c.restoredEnergy,1125);assert.ok(c.height<b.height);
  assert.equal(b.height,40-4.905);assert.equal(b.velocity,9.81);
  const landed=fall({...p,time:30,mode:'stop'});assert.equal(landed.height,0);assert.ok(landed.landed);
  assert.ok(Math.abs(.5*p.mass*landed.velocity**2-p.mass*9.81*p.height)<1e-8);
  for(const bad of [NaN,Infinity,-1,101])assert.throws(()=>fall({...p,height:bad,mode:'stop'}));
  assert.throws(()=>fall({...p,mode:'magic'}));
});
test('probability teaching model has exact endpoints and reproducible results',async()=>{
  const {sampleHits}=await load('core.mjs');
  assert.equal(sampleHits(0,1000,2026).total,0);assert.equal(sampleHits(1,1000,2026).total,1000);
  const a=sampleHits(.5,1000,2026);assert.deepEqual(a,sampleHits(.5,1000,2026));
  assert.ok(a.total>430&&a.total<570);assert.equal(sampleHits(.5,2,1).atLeastOne,.75);
  for(const args of [[1.1,10,1],[NaN,10,1],[.5,0,1],[.5,1.5,1],[.5,10001,1],[.5,10,-1]])assert.throws(()=>sampleHits(...args));
});
test('save validation strips unrelated properties, rejects malformed states and does not mutate input',async()=>{
  const {validateSave}=await load('core.mjs');
  const value={schema:'halveth.ashbound.save.v1',version:'1.0.0',choices:[0,2],region:'garden',party:['scarlet','dormammu'],books:[1,1],private:'not exported'};
  const before=JSON.stringify(value),safe=validateSave(value,ids);assert.equal(JSON.stringify(value),before);assert.equal(safe.private,undefined);assert.deepEqual(safe.books,[1]);
  assert.deepEqual(safe.quest.steps,[]);
  for(const change of [{choices:[-1]},{choices:[3]},{party:['missing']},{party:['scarlet','scarlet']},{region:'remote'},{books:[6]},{quest:{version:'1.0.0',steps:['weave']}},{version:'2.0.0'}])assert.throws(()=>validateSave({...value,...change},ids));
});
test('all current identities are reused, and all six bilingual books and UI dictionaries are complete',async()=>{
  const {COPY,BOOKS}=await load('content.mjs'),{REGIONS}=await load('core.mjs');
  assert.equal(ids.size,registry.window.HalvethUniverse.entities.length);for(const id of ['scarlet','dormammu','lucinet','halveth','rachel','verachel','mira','mita','portal-chess'])assert.ok(ids.has(id));
  assert.deepEqual(Object.keys(COPY.de).sort(),Object.keys(COPY.en).sort());
  assert.equal(BOOKS.length,6);assert.equal(REGIONS.length,6);
  for(const b of BOOKS)for(const l of ['de','en'])assert.ok(b[l][2].length>160);
});
test('ASHBOUND keeps its local dependencies and is a public game route',()=>{
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.mjs'),'utf8'),qa=fs.readFileSync(path.join(root,'tools/ashbound/qa.cjs'),'utf8');
  assert.equal(path.basename(dir),'ashbound');
  assert.match(html,/universe-data\.js/);assert.match(html,/Content-Security-Policy/);assert.doesNotMatch(html,/<script[^>]+src="https:/);
  assert.doesNotMatch(html,/hub-language\.js/);
  assert.match(html,/weltkeimwerk\/core\.js/);
  const portal=fs.readFileSync(path.join(root,'assets/portal-shell.js'),'utf8');assert.match(portal,/forschung\/ashbound/);assert.doesNotMatch(portal,/morrowind-lernwelt/);
  assert.doesNotMatch(qa,/ashbound-entry/);
  assert.doesNotMatch(app,/sendTransaction|eth_requestAccounts|fetch\(['"]https:/);
  for(const file of ['three.LICENSE.txt','inkjs.LICENSE.txt','lucide.LICENSE.txt'])assert.ok(fs.existsSync(path.join(dir,'vendor',file)),file);
});
test('equality core is exact at the anchor and records bit differences separately',async()=>{
  const {bitGroups,compareWords,createKernel,hexWord,toggleBit}=await load('kernel.mjs');
  const anchor=createKernel(0x4a555249);assert.equal(hexWord(anchor.word),'0x4A555249');assert.equal(bitGroups(anchor.word).join('').length,32);
  assert.deepEqual(compareWords(anchor.seed,anchor.word),{equal:true,relation:'=',delta:0,changedBits:0});
  const changed=toggleBit(anchor,7);assert.equal(changed.comparison.relation,'!');assert.equal(changed.comparison.changedBits,1);assert.notEqual(changed.word,anchor.word);
  const returned=toggleBit(changed,7);assert.equal(returned.comparison.relation,'=');assert.equal(returned.word,anchor.seed);
  assert.throws(()=>toggleBit(anchor,32));
});
test('the local encounter makes equality and difference into a bounded three-step game loop',async()=>{
  const {attemptStep,createQuest,currentStep,questProgress,validateQuest}=await load('quest.mjs');
  let quest=createQuest();assert.equal(currentStep(quest).id,'observe');
  assert.equal(attemptStep(quest,'!').accepted,false);
  let result=attemptStep(quest,'=');assert.equal(result.accepted,true);quest=result.quest;
  result=attemptStep(quest,'!');assert.equal(result.accepted,true);quest=result.quest;
  result=attemptStep(quest,'=');assert.equal(result.accepted,true);quest=result.quest;
  assert.equal(questProgress(quest),3);assert.equal(currentStep(quest),null);assert.equal(attemptStep(quest,'=').reason,'complete');
  assert.throws(()=>validateQuest({version:'1.0.0',steps:['relate']}));
});

test('all six original places form a connected, revisitable expedition with a final gate',async()=>{
  const {REGIONS}=await load('core.mjs');
  const {createExpedition,validateExpedition,visitRegion,chooseRegion,canChoose,expeditionProgress,expeditionOutcome,routeBetween}=await load('expedition.mjs');
  let expedition=createExpedition();assert.equal(canChoose(expedition,'gate'),false);
  for(const from of REGIONS)for(const to of REGIONS){const route=routeBetween(from.id,to.id);assert.equal(route[0],from.id);assert.equal(route.at(-1),to.id);}
  const blocked=chooseRegion(expedition,'gate',0);assert.equal(blocked.accepted,false);assert.equal(blocked.reason,'locked');
  for(const region of REGIONS.filter(region=>region.id!=='gate')){
    expedition=visitRegion(expedition,region.id);
    const result=chooseRegion(expedition,region.id,0);assert.equal(result.accepted,true);expedition=result.expedition;
  }
  assert.equal(canChoose(expedition,'gate'),true);
  let result=chooseRegion(expedition,'gate',1);assert.equal(result.accepted,true);expedition=result.expedition;
  assert.deepEqual(expeditionProgress(expedition),{resolved:6,total:6,open:5,shelter:1,complete:true});
  assert.equal(expeditionOutcome(expedition),'open');
  result=chooseRegion(expedition,'haven',1);assert.equal(result.accepted,true);
  assert.equal(result.expedition.choices[0],1);assert.equal(expedition.choices[0],0);
  let woven=result.expedition;
  woven=chooseRegion(woven,'archive',1).expedition;
  assert.equal(expeditionOutcome(woven),'woven');
  assert.equal(expeditionOutcome(chooseRegion(woven,'crater',1).expedition),'shelter');
  assert.equal(chooseRegion(result.expedition,'haven',1).reason,'unchanged');
  assert.deepEqual(validateExpedition(JSON.parse(JSON.stringify(result.expedition))),result.expedition);
  for(const invalid of [
    {choices:[0,null,null,null,null,null],visits:[]},
    {choices:[null,null,null,null,null,0],visits:['gate']},
    {choices:[2,null,null,null,null,null],visits:['haven']},
    {choices:[null,null,null,null,null,null],visits:['haven','haven']}
  ])assert.throws(()=>validateExpedition({version:'1.0.0',...invalid}));
});

test('older saves gain an empty expedition and each resident has distinct bilingual choices',async()=>{
  const {validateSave,REGIONS}=await load('core.mjs');
  const {COPY}=await load('content.mjs');
  const older={schema:'halveth.ashbound.save.v1',version:'1.0.0',choices:[],region:'haven',party:[],books:[]};
  const migrated=validateSave(older,ids);assert.deepEqual(migrated.expedition.choices,[null,null,null,null,null,null]);
  const roundTrip=validateSave(JSON.parse(JSON.stringify(migrated)),ids);assert.deepEqual(roundTrip.expedition,migrated.expedition);
  for(const region of REGIONS){
    const de=COPY.de.expeditionResidents[region.id],en=COPY.en.expeditionResidents[region.id];
    for(const resident of [de,en]){assert.ok(resident.name.length>1);assert.equal(resident.options.length,2);assert.equal(resident.results.length,2);assert.notEqual(resident.options[0],resident.options[1]);}
  }
});
