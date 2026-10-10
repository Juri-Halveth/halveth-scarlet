'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const api=require('../forschung/grenzbeobachter/workshop-core.js');
const t0='2026-10-10T17:10:00.000Z',t1='2026-10-10T17:10:01.000Z';
const input=()=>({sourceText:'Die Schleuse öffnen. 🌌\nOriginal bleibt.',reading:'NEGATED',nearText:'Sicht A',farText:'Sicht B',targetKind:'GITHUB',targetAddress:'UNKNOWN'});
const copy=value=>JSON.parse(JSON.stringify(value));
const hash=value=>createHash('sha256').update(value,'utf8').digest('hex');
const step=(incoming=25,processed=5)=>({kind:'STEP',incoming,processed});

test('source bytes, UTF16 span and selected reading survive without granting execution',async()=>{
  for(const reading of ['UNKNOWN','AFFIRMED','NEGATED','QUOTED_ONLY']){
    const value=input();value.reading=reading;const record=await api.create(value,t0);
    assert.equal(record.source.text,value.sourceText);
    assert.equal(record.source.byteLength,Buffer.byteLength(value.sourceText,'utf8'));
    assert.equal(record.source.sha256,hash(value.sourceText));
    assert.equal(record.candidate.sourceSpan.end,value.sourceText.length);
    assert.equal(record.candidate.selectedReading,reading);
    assert.equal(record.candidate.contentStatus,'ADDRESSED');
    assert.equal(record.candidate.executionStatus,'SEALED_NOT_EXECUTABLE');
    assert.equal(record.candidate.authority,'UNBOUND');
    assert.equal(record.source.eventTime,'UNKNOWN');
  }
});
test('two viewpoints keep separate IDs even with equal times and identical words',async()=>{
  const value=input();value.farText=value.nearText;
  const record=await api.create(value,t0),[a,b]=record.frames;
  assert.notEqual(a.id,b.id);assert.notEqual(a.observerId,b.observerId);
  assert.equal(a.eventIdentity,'UNKNOWN');assert.equal(b.eventIdentity,'UNKNOWN');
  assert.equal(a.provenanceCluster,b.provenanceCluster);
  assert.equal(record.relations[1].direction,'UNKNOWN');
  assert.equal(a.observedAt,'UNKNOWN');assert.equal(a.recordedAt,t0);
});
test('local endpoint digests bind exact records; every target kind remains unbound',async()=>{
  for(const targetKind of ['ROOT','LOCAL','GITHUB','EXTERNAL']){
    const record=await api.create({...input(),targetKind},t0);
    const nodes=new Map([record.source,record.candidate,...record.frames].map(node=>[node.id,node]));
    for(const relation of record.relations){
      for(const name of ['relationDefinition','direction','scope','time','source','evidence','authority','writeDomain'])assert.ok(Object.hasOwn(relation,name));
      assert.equal(relation.authority,'NONE');assert.equal(relation.writeDomain,'RELATIONS_ONLY');
      for(const endpoint of [relation.left,relation.right]){
        assert.deepEqual(Object.keys(endpoint),['kind','id','digest','semanticAddress','binding']);
        if(endpoint.binding==='LOCAL_RECORD_HASHED')assert.equal(endpoint.digest,hash(api.canonical(nodes.get(endpoint.id))));
        else{assert.equal(endpoint.kind,targetKind);assert.equal(endpoint.digest,'UNKNOWN');assert.equal(endpoint.binding,'UNBOUND');}
      }
    }
  }
});
test('prepare rejects extra authority, invalid Unicode, invalid dates and unsupported readings',async()=>{
  for(const change of [{execute:true},{sourceText:''},{sourceText:'\ud800'},{reading:'EXECUTE'},{targetKind:'ADMIN'},{targetAddress:'x'.repeat(301)}]){
    await assert.rejects(api.create({...input(),...change},t0));
  }
  await assert.rejects(api.create(input(),'2026-02-30T00:00:00.000Z'));
  await assert.rejects(api.create(input(),t0+'\n'));
});
test('accessors, sparse arrays and non-JSON values are rejected without running getters',async()=>{
  let called=false;const value=input();Object.defineProperty(value,'sourceText',{enumerable:true,get(){called=true;return 'x';}});
  await assert.rejects(api.create(value,t0));assert.equal(called,false);
  for(const v of [new Date(),NaN,Infinity,-0,undefined,[,1],{a:()=>1}])assert.throws(()=>api.canonical(v));
});
test('input and transition request are detached before asynchronous work',async()=>{
  const value=input(),original=value.sourceText,promise=api.create(value,t0);value.sourceText='changed';
  const record=await promise;assert.equal(record.source.text,original);
  const request=step(),pending=api.transition(record,request,t1);request.incoming=99;
  const next=await pending;assert.equal(next.simulation.load,50);assert.equal(record.simulation.load,30);
  assert.ok(Object.isFrozen(next.relations[0].left));
});
test('threshold accepts exactly 80, holds above 80, and allows a later relieving step',async()=>{
  const base=await api.create(input(),t0);
  const full=await api.transition(base,step(50,0),t1);assert.equal(full.simulation.load,80);
  const held=await api.transition(full,step(1,0),t1);assert.equal(held.simulation.load,80);
  assert.equal(held.simulation.records.at(-1).projected,81);assert.equal(held.simulation.records.at(-1).decision,'HELD');
  const relief=await api.transition(held,step(0,30),t1);assert.equal(relief.simulation.load,50);
  assert.deepEqual(relief.simulation.records.slice(0,2),held.simulation.records);
  assert.equal(base.simulation.records.length,0);
});
test('restoration appends a receipt instead of deleting previous steps',async()=>{
  const base=await api.create(input(),t0),changed=await api.transition(base,step(),t1);
  const restored=await api.transition(changed,{kind:'RESTORE',incoming:0,processed:0},t1);
  assert.equal(restored.simulation.load,30);assert.deepEqual(restored.simulation.records[0],changed.simulation.records[0]);
  assert.equal(restored.simulation.records[1].restoredFrom,'MODEL_INITIAL_30');
  assert.equal(restored.simulation.records[1].previousDigest,hash(api.canonical(changed.simulation.records[0])));
  assert.deepEqual(restored.source,base.source);assert.deepEqual(restored.frames,base.frames);
});
test('invalid requests and backwards device time preserve the input state',async()=>{
  const record=await api.create(input(),t0),before=api.canonical(record);
  for(const request of [step(-1),step(101),step(1.5),step('2'),{...step(),code:'run'}, {kind:'RESTORE',incoming:1,processed:0}])await assert.rejects(api.transition(record,request,t1));
  await assert.rejects(api.transition(record,step(),'2026-10-09T00:00:00.000Z'),/CLOCK_ORDER/);
  assert.equal(api.canonical(record),before);
});
test('modified source, endpoint, direction, authority and observer identity fail replay',async()=>{
  const record=await api.create(input(),t0);
  const changes=[r=>r.source.text+='!',r=>r.candidate.executionStatus='EXECUTABLE',r=>r.relations[0].left.digest='0'.repeat(64),r=>r.relations[1].direction='LEFT_TO_RIGHT',r=>r.relations[2].authority='GRANTED',r=>r.frames[1].eventIdentity='same-event',r=>r.frames[1].id=r.frames[0].id];
  for(const change of changes){const bad=copy(record);change(bad);await assert.rejects(api.verify(bad));}
});
test('changed results, reordered receipts and removed intermediate records fail replay',async()=>{
  let record=await api.create(input(),t0);record=await api.transition(record,step(),t1);record=await api.transition(record,step(),t1);
  for(const change of [r=>r.simulation.load=99,r=>r.simulation.records[0].after=7,r=>r.simulation.records.reverse(),r=>r.simulation.records.shift(),r=>r.simulation.model.threshold=100]){
    const bad=copy(record);change(bad);await assert.rejects(api.verify(bad));
  }
  assert.deepEqual(await api.verify(record),record);
});
test('export/import roundtrip checks bytes and semantic contract even if outer digest is recomputed',async()=>{
  const record=await api.transition(await api.create(input(),t0),step(),t1),envelope=await api.exportRecord(record);
  assert.equal(envelope.sha256,hash(envelope.canonicalRecord));
  assert.deepEqual(await api.importRecord(JSON.stringify(envelope)),record);
  await assert.rejects(api.importRecord(JSON.stringify({...envelope,sha256:'0'.repeat(64)})),/DIGEST/);
  const changed=JSON.parse(envelope.canonicalRecord);changed.candidate.authority='ALLOW';
  const badCanonical=api.canonical(changed);
  await assert.rejects(api.importRecord(JSON.stringify({...envelope,canonicalRecord:badCanonical,sha256:hash(badCanonical)})),/CONTRACT/);
  await assert.rejects(api.importRecord('x'.repeat(api.MAX_IMPORT_BYTES+1)),/SIZE/);
});
test('same source and clock create deterministic records; a later clock is a new record version',async()=>{
  const a=await api.create(input(),t0),b=await api.create(input(),t0),c=await api.create(input(),t1);
  assert.equal(api.canonical(a),api.canonical(b));assert.notEqual(api.canonical(a),api.canonical(c));
  assert.equal(a.source.sha256,c.source.sha256);
});
test('bounded history stays exportable and rejects a 129th transition',async()=>{
  let record=await api.create(input(),t0);
  for(let i=0;i<api.MAX_RECORDS;i++)record=await api.transition(record,step(0,0),t1);
  await assert.rejects(api.transition(record,step(0,0),t1),/RECORD_LIMIT/);
  const envelope=await api.exportRecord(record),raw=JSON.stringify(envelope,null,2)+'\n';
  assert.ok(Buffer.byteLength(raw)<api.MAX_IMPORT_BYTES);
  assert.deepEqual(await api.importRecord(raw),record);
});
test('workshop is integrated into the existing bilingual page with no input network route',()=>{
  const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const html=read('forschung/grenzbeobachter/index.html'),ui=read('forschung/grenzbeobachter/workshop-ui.js');
  assert.match(html,/href="#werkstatt"/);assert.match(html,/id="werkstatt"/);
  for(const asset of ['workshop-core.js','workshop-ui.js','workshop.css'])assert.ok(html.includes(asset+'?v=1.0.0'));
  for(const directive of ["connect-src 'none'","form-action 'none'","script-src 'self'"])assert.ok(html.includes(directive));
  assert.doesNotMatch(ui,/\b(?:fetch|eval|WebSocket|Function|XMLHttpRequest)\s*\(|\.innerHTML\s*=/);
  assert.match(ui,/textContent=JSON\.stringify\(draft/);
  assert.match(ui,/window\.addEventListener\('halveth:language',language\)/);
});
