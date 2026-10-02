const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..'),dir=path.join(root,'forschung/morrowind-lernwelt');
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
  for(const change of [{choices:[-1]},{choices:[3]},{party:['missing']},{party:['scarlet','scarlet']},{region:'remote'},{books:[6]},{version:'2.0.0'}])assert.throws(()=>validateSave({...value,...change},ids));
});
test('all 69 existing identities are reused, and all six bilingual books and UI dictionaries are complete',async()=>{
  const {COPY,BOOKS}=await load('content.mjs'),{REGIONS}=await load('core.mjs');
  assert.equal(ids.size,69);for(const id of ['scarlet','dormammu','lucinet','halveth','rachel','verachel','mira','mita'])assert.ok(ids.has(id));
  assert.deepEqual(Object.keys(COPY.de).sort(),Object.keys(COPY.en).sort());
  assert.equal(BOOKS.length,6);assert.equal(REGIONS.length,6);
  for(const b of BOOKS)for(const l of ['de','en'])assert.ok(b[l][2].length>160);
});
test('public world uses local dependencies and is connected to the existing portal',()=>{
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.mjs'),'utf8');
  assert.match(html,/universe-data\.js/);assert.match(html,/Content-Security-Policy/);assert.doesNotMatch(html,/<script[^>]+src="https:/);
  assert.match(fs.readFileSync(path.join(root,'assets/portal-shell.js'),'utf8'),/morrowind-lernwelt/);
  assert.doesNotMatch(app,/sendTransaction|eth_requestAccounts|fetch\(['"]https:/);
  for(const file of ['three.LICENSE.txt','inkjs.LICENSE.txt','lucide.LICENSE.txt'])assert.ok(fs.existsSync(path.join(dir,'vendor',file)),file);
});
