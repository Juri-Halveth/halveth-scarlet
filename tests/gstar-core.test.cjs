'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const imported = require('../forschung/weltkeimwerk/core.js');
const GStar = imported.GStar || imported;
const clone = value => JSON.parse(JSON.stringify(value));
const ledgerContent = view => { const {isHistorical,totalEvents,...content}=view; return content; };
const APP_PREFIX = 'GST_TEST';
let appSequence = 0;

function app() {
  let tick = 0;
  return GStar.create({runId: `${APP_PREFIX}_${++appSequence}`, clock: () => new Date(Date.UTC(2026, 9, 6, 0, 0, tick++)).toISOString()});
}
function id(record) {
  const value = record.id ?? record.stateId ?? record.unknownId ?? record.snapshotId;
  assert.equal(typeof value, 'string', 'public records must expose their address');
  return value;
}
function count(run) { return run.view().events.length; }
async function seed(run, text = 'Raw source\r\r\nwith exact line endings.\nG^* 🧬') {
  const before = new Set(run.view().states.map(id));
  await run.dispatch({type:'SEED',label:'Root input',text});
  const created = run.view().states.filter(s => !before.has(id(s)));
  assert.equal(created.length, 1);
  return id(created[0]);
}
async function materializedSeed(run, text) {
  const stateId = await seed(run, text);
  await run.dispatch({type:'MATERIALIZE',stateId});
  return stateId;
}
async function propose(run, parents, mode, text, trigger = 'Bound local model input') {
  const before = new Set(run.view().states.map(id));
  const result = await run.dispatch({type:'PROPOSE',parents,mode,text,trigger});
  return {result,states:run.view().states.filter(s => !before.has(id(s)))};
}
async function rejectsWithoutChange(run, command) {
  const before = run.view();
  await assert.rejects(async () => run.dispatch(command));
  assert.deepEqual(run.view(), before, 'rejected commands must leave the prior prefix intact');
}

test('GStar exposes the versioned public ledger API', () => {
  assert.equal(GStar.VERSION, '1.0.0');
  for (const key of ['create','verify','restore']) assert.equal(typeof GStar[key], 'function', key);
  const run = app();
  for (const key of ['dispatch','view','export']) assert.equal(typeof run[key], 'function', key);
  const initial = run.view();
  for (const key of ['states','relations','observations','unknowns','snapshots','roots','events']) assert.ok(Array.isArray(initial[key]), key);
  assert.equal(initial.events.length, 0);
  assert.equal(initial.states.length, 0);
});

test('a proposal preserves every pre-existing state and creates only its own candidate', async () => {
  const run = app();
  const parent = await materializedSeed(run, 'parent content');
  const before = run.view();
  const proposed = await propose(run,[parent],'DERIVE_CHILD','child content');
  assert.equal(proposed.states.length,1);
  for (const original of before.states) assert.deepEqual(run.view().states.find(s=>id(s)===id(original)),original);
  assert.equal(count(run),before.events.length+1);
});

test('a materialization can be applied only once', async () => {
  const run = app();
  const stateId = await seed(run, 'state to materialize');
  await run.dispatch({type:'MATERIALIZE',stateId});
  await rejectsWithoutChange(run,{type:'MATERIALIZE',stateId});
});

test('observing an exact materialized version adds a record without creating or revising a state', async () => {
  const run=app();
  const stateId=await materializedSeed(run,'visible state');
  const before=run.view();
  await run.dispatch({type:'OBSERVE',stateId});
  const after=run.view();
  assert.deepEqual(after.states,before.states);
  assert.deepEqual(after.relations,before.relations);
  assert.equal(after.observations.length,before.observations.length+1);
  assert.equal(after.events.length,before.events.length+1);
});

test('a latent state cannot be silently observed as materialized', async () => {
  const run=app();const stateId=await seed(run,'latent');
  await rejectsWithoutChange(run,{type:'OBSERVE',stateId});
});

test('same-content revision produces an event without manufacturing another state', async () => {
  const run=app();const text='unchanged content';const parent=await materializedSeed(run,text);
  const before=run.view();await propose(run,[parent],'REVISE',text);
  const after=run.view();assert.deepEqual(after.states,before.states);assert.deepEqual(after.relations,before.relations);
  assert.equal(after.events.length,before.events.length+1);
});

test('same-content child derivation records NO_CHANGE without adding an entity', async () => {
  const run=app();const text='same bytes';const parent=await materializedSeed(run,text);
  const before=run.view();const proposed=await propose(run,[parent],'DERIVE_CHILD',text);
  assert.equal(proposed.states.length,0);assert.deepEqual(run.view().states,before.states);
  assert.equal(count(run),before.events.length+1);
});

test('an explicit clone creates another candidate while preserving identical content provenance', async () => {
  const run=app();const text='same bytes, deliberately distinct instance';const parent=await materializedSeed(run,text);
  const proposed=await propose(run,[parent],'CLONE_INSTANCE',text);
  assert.equal(proposed.states.length,1);assert.notEqual(id(proposed.states[0]),parent);
  assert.equal(proposed.states[0].textRelation,'IDENTICAL_TO_PARENT');
  await rejectsWithoutChange(run,{type:'PROPOSE',parents:[parent],mode:'CLONE_INSTANCE',text:'different bytes',trigger:'not a clone'});
});

test('a revision candidate cannot silently rebase after another revision becomes current', async () => {
  const run=app();const parent=await materializedSeed(run,'version one');
  const first=await propose(run,[parent],'REVISE','version two A');
  const second=await propose(run,[parent],'REVISE','version two B');
  assert.equal(first.states.length,1);assert.equal(second.states.length,1);
  await run.dispatch({type:'MATERIALIZE',stateId:id(first.states[0])});
  await rejectsWithoutChange(run,{type:'MATERIALIZE',stateId:id(second.states[0])});
});

test('parent arity is bound to unique parent states, not trigger words or duplicate addresses', async () => {
  const run=app();const parent=await materializedSeed(run,'first parent');
  for(const command of [
    {type:'PROPOSE',parents:[],mode:'DERIVE_CHILD',text:'child',trigger:'signal'},
    {type:'PROPOSE',parents:[parent,parent],mode:'COMPOSE',text:'child',trigger:'two words'},
    {type:'PROPOSE',parents:[parent,'STATE_MISSING'],mode:'COMPOSE',text:'child',trigger:'signal'},
    {type:'PROPOSE',parents:[parent],mode:'COMPOSE',text:'child',trigger:'signal'}
  ]) await rejectsWithoutChange(run,command);
});

test('two different entities can produce one composition candidate', async () => {
  const run=app();const left=await materializedSeed(run,'left');const right=await materializedSeed(run,'right');
  const before=run.view().states;const proposed=await propose(run,[left,right],'COMPOSE','combined','two inputs, one trigger');
  assert.equal(proposed.states.length,1);
  for(const original of before)assert.deepEqual(run.view().states.find(s=>id(s)===id(original)),original);
});

test('composition accepts eight different entities and rejects nine atomically', async () => {
  const run=app();const parents=[];
  for(let i=0;i<8;i++)parents.push(await materializedSeed(run,'parent '+i));
  const proposed=await propose(run,parents,'COMPOSE','eight-parent composition');assert.equal(proposed.states.length,1);
  parents.push(await materializedSeed(run,'ninth parent'));
  await rejectsWithoutChange(run,{type:'PROPOSE',parents,mode:'COMPOSE',text:'nine-parent composition',trigger:'arity limit'});
});

test('unknown revisit records new evidence without creating a state', async () => {
  const run=app();const stateId=await materializedSeed(run,'state with open question');
  await run.dispatch({type:'OPEN_UNKNOWN',stateId,question:'Welche Beobachtung fehlt?',reopenTrigger:'A new bound observation'});
  const before=run.view();assert.equal(before.unknowns.length,1);
  await run.dispatch({type:'REVISIT',unknownId:id(before.unknowns[0]),evidence:'A local supplied note, still unverified'});
  const after=run.view();assert.deepEqual(after.states,before.states);assert.equal(after.unknowns.length,before.unknowns.length);
  assert.equal(after.events.length,before.events.length+1);
});

test('reanchoring creates a root role without copying historical states', async () => {
  const run=app();await materializedSeed(run,'local anchor');
  await run.dispatch({type:'SNAPSHOT'});
  const before=run.view();assert.equal(before.snapshots.length,1);
  await run.dispatch({type:'REANCHOR',snapshotId:id(before.snapshots[0])});
  const after=run.view();assert.deepEqual(after.states,before.states);assert.deepEqual(after.observations,before.observations);
  assert.equal(after.roots.length,before.roots.length+1);
});

test('past views stay exactly bound to their prefix after later operations', async () => {
  const run=app();const empty=run.view(0);const parent=await materializedSeed(run,'past');
  const prefix=run.view();const sequence=prefix.events.length;
  await propose(run,[parent],'DERIVE_CHILD','later');await run.dispatch({type:'OBSERVE',stateId:parent});await run.dispatch({type:'SNAPSHOT'});
  const historical=run.view(sequence);
  assert.deepEqual(ledgerContent(historical),ledgerContent(prefix));assert.deepEqual(ledgerContent(run.view(0)),ledgerContent(empty));
  assert.equal(historical.isHistorical,true);assert.equal(historical.totalEvents,count(run));
  assert.equal(run.view().isHistorical,false);
  for(const bad of [-1,0.5,count(run)+1,NaN,Infinity,'0'])assert.throws(()=>run.view(bad));
});

test('returned view mutations cannot rewrite the ledger', async () => {
  const run=app();await materializedSeed(run,'alias boundary');const expected=run.view();
  const changed=run.view();changed.states.length=0;changed.events.length=0;changed.roots.push({id:'INJECTED'});
  assert.deepEqual(run.view(),expected);
});

test('closed JSON commands reject unknown fields, non-JSON values and broken Unicode atomically', async () => {
  const run=app();
  for(const command of [
    {type:'SEED',label:'x',text:'x',unexpected:true},
    {type:'SEED',label:'x',text:undefined},
    {type:'SEED',label:'x',text:'\uD800'},
    {type:'SEED',label:'x',text:'\uDC00'},
    {type:'SEED',label:'x',text:new String('x')},
    {type:'SEED',label:'x',text:NaN},
    Object.assign(Object.create({inherited:true}),{type:'SEED',label:'x',text:'x'}),
    {type:'UNKNOWN_COMMAND'}
  ]) await rejectsWithoutChange(run,command);
});

test('sparse or adorned parent arrays cannot bypass the command contract', async () => {
  const run=app();const parent=await materializedSeed(run,'dense parents');
  const sparse=new Array(1);const adorned=[parent];adorned.extra='not JSON array data';
  for(const parents of [sparse,adorned])await rejectsWithoutChange(run,{type:'PROPOSE',parents,mode:'DERIVE_CHILD',text:'candidate',trigger:'trigger'});
});

test('raw and derivation limits use UTF-8 bytes, including multibyte symbols', async () => {
  const run=app();const parent=await seed(run,'é'.repeat(4096));
  await rejectsWithoutChange(run,{type:'SEED',label:'too large',text:'é'.repeat(4097)});
  await run.dispatch({type:'MATERIALIZE',stateId:parent});
  const candidate=await propose(run,[parent],'DERIVE_CHILD','é'.repeat(1024));assert.equal(candidate.states.length,1);
  await rejectsWithoutChange(run,{type:'PROPOSE',parents:[parent],mode:'DERIVE_CHILD',text:'é'.repeat(1025),trigger:'limit'});
});

test('concurrent dispatch rejects BUSY without interleaving two events', async () => {
  const run=app();const first=run.dispatch({type:'SEED',label:'first',text:'first'});
  const second=run.dispatch({type:'SEED',label:'second',text:'second'});
  await assert.rejects(async()=>second,/BUSY/i);await first;assert.equal(count(run),1);assert.equal(run.view().states.length,1);
});

test('state capacity is enforced at 48 without dropping or replacing prior states', async () => {
  const run=app();for(let i=0;i<48;i++)await seed(run,'bounded state '+i);
  assert.equal(run.view().states.length,48);
  await rejectsWithoutChange(run,{type:'SEED',label:'overflow',text:'forty-ninth state'});
});

test('unknown capacity is enforced at 64 without silently resolving an older question', async () => {
  const run=app();const stateId=await materializedSeed(run,'unknown capacity');
  for(let i=0;i<64;i++)await run.dispatch({type:'OPEN_UNKNOWN',stateId,question:'Welche Lücke '+i+'?',reopenTrigger:'specific future evidence '+i});
  assert.equal(run.view().unknowns.length,64);
  await rejectsWithoutChange(run,{type:'OPEN_UNKNOWN',stateId,question:'Welche zusätzliche Lücke?',reopenTrigger:'more evidence'});
});

test('event capacity is enforced at 128 with the accepted prefix preserved', async () => {
  const run=app();const stateId=await materializedSeed(run,'event capacity');
  while(count(run)<128)await run.dispatch({type:'OBSERVE',stateId});
  assert.equal(count(run),128);
  await rejectsWithoutChange(run,{type:'SNAPSHOT'});
});

test('export verifies, restores and preserves a mixed ledger exactly', async () => {
  const run=app();const stateId=await materializedSeed(run,'raw\r\r\nG^* 🧬');
  const child=await propose(run,[stateId],'DERIVE_CHILD','derived state');
  await run.dispatch({type:'MATERIALIZE',stateId:id(child.states[0])});
  await run.dispatch({type:'OBSERVE',stateId});
  await run.dispatch({type:'OPEN_UNKNOWN',stateId,question:'Was fehlt?',reopenTrigger:'new evidence'});
  await run.dispatch({type:'SNAPSHOT'});await run.dispatch({type:'REANCHOR',snapshotId:id(run.view().snapshots[0])});
  const envelope=await run.export();const verified=await GStar.verify(envelope);assert.equal(verified.valid,true);
  const restored=await GStar.restore(envelope);assert.deepEqual(restored.view(),run.view());
  assert.deepEqual(await restored.export(),envelope);
  const safeCopy=clone(envelope);safeCopy.unexpected='must reject';await assert.rejects(async()=>GStar.verify(safeCopy));
});

test('the raw receipt preserves CRCRLF, Unicode and exact UTF-8 digest independently of state projection', async () => {
  const run=app();const raw='G^*\r\r\nÄ 🧬\r\nnext\nlast';const stateId=await seed(run,raw);
  const view=run.view();const receipt=view.rawRecords[0];const state=view.states.find(s=>s.id===stateId);
  assert.equal(receipt.kind,'RAW_TEXT');assert.equal(receipt.text,raw);assert.equal(receipt.encoding,'UTF-8');
  assert.equal(receipt.byteLength,Buffer.byteLength(raw,'utf8'));
  assert.equal(receipt.utf8Sha256,createHash('sha256').update(Buffer.from(raw,'utf8')).digest('hex'));
  assert.notEqual(receipt.utf8Sha256,createHash('sha256').update(raw.replace(/\r\r\n/g,'\r\n')).digest('hex'));
  assert.equal(state.text,raw);assert.equal(state.entityParentCount,0);assert.equal(state.parentStateCount,0);
  assert.equal(state.parentKnowledge,'EXPLICIT_INITIALIZATION_NO_ENTITY_PARENT');assert.deepEqual(state.parents,[]);
  assert.equal(state.inputRefs[0].id,receipt.id);assert.equal(state.inputRefs[0].digest,receipt.digest);
  const restored=await GStar.restore(run.export());assert.equal(restored.view().rawRecords[0].text,raw);
});

test('revision changes the active head of one entity, while a clone has a new identity', async () => {
  const run=app();const parentId=await materializedSeed(run,'old text');
  const old=run.view().states.find(s=>s.id===parentId);const originalRecord=clone(run.export().events.flatMap(e=>e.records).find(r=>r.id===parentId));
  const proposal=await propose(run,[parentId],'REVISE','revised text');const next=proposal.states[0];
  assert.equal(next.entityId,old.entityId);assert.equal(next.phase,'CANDIDATE');assert.equal(next.entityParentCount,1);
  assert.equal(run.view().activeHeads[old.entityId],old.id);
  await run.dispatch({type:'MATERIALIZE',stateId:next.id});
  assert.equal(run.view().activeHeads[old.entityId],next.id);
  assert.equal(run.view().states.find(s=>s.id===old.id).phase,'SUPERSEDED');
  assert.deepEqual(run.export().events.flatMap(e=>e.records).find(r=>r.id===old.id),originalRecord,'projected supersession must not rewrite the original record');
  const cloneCandidate=(await propose(run,[next.id],'CLONE_INSTANCE','revised text')).states[0];
  assert.notEqual(cloneCandidate.entityId,next.entityId);assert.equal(cloneCandidate.textRelation,'IDENTICAL_TO_PARENT');
  await run.dispatch({type:'OBSERVE',stateId:old.id});assert.equal(run.view().observations.at(-1).observedText,'old text');
});

test('two state versions of one entity do not masquerade as two entity parents', async () => {
  const run=app();const first=await materializedSeed(run,'v1');const second=(await propose(run,[first],'REVISE','v2')).states[0];
  await run.dispatch({type:'MATERIALIZE',stateId:second.id});
  await rejectsWithoutChange(run,{type:'PROPOSE',parents:[first,second.id],mode:'COMPOSE',text:'combined',trigger:'same entity twice'});
});

test('composition reports exact text relationships without asserting semantic novelty', async () => {
  const run=app();const a=await materializedSeed(run,'alpha');const b=await materializedSeed(run,'beta');const a2=await materializedSeed(run,'alpha');
  for(const [parents,text,expected]of [[[a,b],'alpha','MATCHES_ONE_PARENT'],[[a,a2],'alpha','IDENTICAL_TO_ALL_PARENTS'],[[a,b],'gamma','DIFFERS_FROM_ALL_PARENTS']]){
    const state=(await propose(run,parents,'COMPOSE',text)).states[0];assert.equal(state.textRelation,expected);assert.equal(state.entityParentCount,2);
    assert.deepEqual(state.parents.map(p=>p.id),parents);assert.equal(state.phase,'CANDIDATE');
  }
});

test('revisit preserves an OPEN obligation and identifies supplied evidence as unverified', async () => {
  const run=app();const stateId=await seed(run,'latent question');
  await run.dispatch({type:'OPEN_UNKNOWN',stateId,question:'What is absent?',reopenTrigger:'a bound observation'});
  const unknown=run.view().unknowns[0];await run.dispatch({type:'REVISIT',unknownId:unknown.id,evidence:'A caller supplied claim'});
  const view=run.view();assert.equal(view.unknowns[0].status,'OPEN');assert.equal(view.unknowns[0].revisitCount,1);
  assert.equal(view.revisits[0].evidenceStatus,'USER_DECLARED_NOT_VERIFIED');assert.equal(view.revisits[0].resolution,'OPEN_PENDING_REVIEW');
  assert.equal(view.unknowns[0].stateRef.id,stateId);assert.equal(view.counts.materializations,0);
});

test('relations and snapshots bind exact existing record digests and prior log prefix', async () => {
  const run=app();const parent=await materializedSeed(run,'relation parent');const child=(await propose(run,[parent],'DERIVE_CHILD','child')).states[0];
  const view=run.view();const relation=view.relations[0];const parentState=view.states.find(s=>s.id===parent);
  assert.equal(relation.leftEndpoint.id,parent);assert.equal(relation.leftEndpoint.digest,parentState.digest);
  assert.equal(relation.rightEndpoint.id,child.id);assert.equal(relation.rightEndpoint.digest,child.digest);
  assert.equal(relation.leftEndpoint.kind,'STATE');assert.equal(relation.rightEndpoint.kind,'STATE');
  assert.equal(relation.algebra.transitive,false);assert.equal(relation.authorityEffect,'LOCAL_MODEL_ONLY');
  const prefix=run.export();await run.dispatch({type:'SNAPSHOT'});const snapshot=run.view().snapshots[0];
  assert.equal(snapshot.prefixLength,prefix.events.length);assert.equal(snapshot.prefixHeadDigest,prefix.headDigest);
  for(const ref of snapshot.stateRefs)assert.equal(ref.digest,view.states.find(s=>s.id===ref.id).digest);
  await run.dispatch({type:'REANCHOR',snapshotId:snapshot.id});const root=run.view().roots.at(-1);
  assert.equal(root.anchorRef.kind,'SNAPSHOT');assert.equal(root.anchorRef.id,snapshot.id);assert.equal(root.anchorRef.digest,snapshot.digest);
  assert.equal(root.absoluteOriginClaim,false);
});

test('relation definitions and the triggering command have independently checkable digest bindings', async () => {
  const run=app();const parent=await materializedSeed(run,'bound definition');await propose(run,[parent],'DERIVE_CHILD','bound child');
  const relation=run.view().relations[0];
  assert.equal(relation.definitionDigest,'sha256:'+await GStar.digest(relation.definitionContract));
  assert.deepEqual(relation.algebra,relation.definitionContract.algebra);
  assert.equal(typeof relation.definitionContract.meaning,'string');
  assert.equal(relation.definitionContract.inputDomain,'BOUND_LOCAL_TEXT_STATE');
  assert.equal(relation.definitionContract.outputDomain,'BOUND_LOCAL_TEXT_STATE');
  assert.ok(relation.definitionContract.claimCeiling);
  const envelope=run.export();const commandEvent=envelope.events.find(e=>e.records.some(r=>r.id===relation.id));
  assert.equal(relation.sourceCommandRef.kind,'LOCAL_COMMAND');
  assert.equal(relation.sourceCommandRef.id,commandEvent.id+':COMMAND');
  assert.equal(relation.sourceCommandRef.semanticAddress,'/events/'+(commandEvent.sequence-1)+'/command');
  assert.equal(relation.sourceCommandRef.digest,'sha256:'+await GStar.digest(commandEvent.command));
  for(const alter of [r=>{r.definitionDigest='sha256:'+'0'.repeat(64);},r=>{r.definitionContract.meaning='another relation';},r=>{r.sourceCommandRef.digest='sha256:'+'0'.repeat(64);},r=>{r.sourceCommandRef.semanticAddress='/events/0/command';}]){
    const changed=clone(envelope);const target=changed.events.flatMap(e=>e.records).find(r=>r.id===relation.id);alter(target);
    await assert.rejects(async()=>GStar.verify(changed));
  }
});

test('tampering with records, projection, time, definitions, order or log head invalidates an export', async () => {
  const run=app();const parent=await materializedSeed(run,'original');await propose(run,[parent],'DERIVE_CHILD','later');await run.dispatch({type:'SNAPSHOT'});
  const envelope=run.export();
  const mutations=[
    e=>{e.events[0].command.text='changed raw';},
    e=>{e.events[0].records[0].text='changed receipt';},
    e=>{e.projection.states[0].text='fictional projection';},
    e=>{e.events[1].recordedAt='2026-10-05T00:00:00.000Z';},
    e=>{e.definitions.equality='DIFFERENT_RULE';},
    e=>{e.events.reverse();},
    e=>{e.headDigest='sha256:'+'0'.repeat(64);},
    e=>{e.events.pop();},
    e=>{e.events[0].records[1].entityParentCount=99;},
    e=>{e.projection.counts.entities+=1;},
    e=>{e.events[0].records[0].unexpected=true;}
  ];
  for(const mutate of mutations){const changed=clone(envelope);mutate(changed);await assert.rejects(async()=>GStar.verify(changed));}
  assert.equal((await GStar.verify(envelope)).valid,true);
});

test('restore binds import bytes before awaiting and caller mutation cannot alter the restored ledger', async () => {
  const run=app();await materializedSeed(run,'import alias');const imported=run.export();const expected=clone(imported);
  const restoring=GStar.restore(imported);imported.events[0].command.text='modified after restore began';imported.projection.states.length=0;
  const restored=await restoring;assert.deepEqual(restored.export(),expected);
  const exported=restored.export();exported.events.length=0;assert.deepEqual(restored.export(),expected);
});

test('invalid and backwards clock values fail atomically while event ordinals remain separate', async () => {
  for(const value of ['not an ISO date','2026-02-30T00:00:00.000Z','2026-10-06T00:00:00Z']){
    const run=GStar.create({runId:'GST_BAD_CLOCK',clock:()=>value});await rejectsWithoutChange(run,{type:'SEED',label:'clock',text:'text'});
  }
  let clockValue='2026-10-06T00:01:00.000Z';const run=GStar.create({runId:'GST_CLOCK',clock:()=>clockValue});await seed(run,'time');
  clockValue='2026-10-06T00:00:00.000Z';await rejectsWithoutChange(run,{type:'SNAPSHOT'});
  clockValue='2026-10-06T00:01:00.000Z';await run.dispatch({type:'SNAPSHOT'});
  assert.deepEqual(run.view().events.map(e=>e.modelTime.value),[1,2]);
  assert.equal(run.view().clock.calibration,'UNKNOWN');assert.equal(run.view().clock.eventTimeOutsideModel,'UNKNOWN');
});

test('accessors, cycles, symbol keys and negative zero are rejected without invoking hidden getters', async () => {
  const run=app();let reads=0;const accessor={type:'SEED',label:'accessor'};
  Object.defineProperty(accessor,'text',{enumerable:true,get(){reads++;return 'hidden';}});
  await rejectsWithoutChange(run,accessor);assert.equal(reads,0);
  const cycle={type:'SEED',label:'cycle'};cycle.text=cycle;await rejectsWithoutChange(run,cycle);
  const symbol={type:'SEED',label:'symbol',text:'text'};symbol[Symbol('hidden')]='value';await rejectsWithoutChange(run,symbol);
  assert.throws(()=>GStar.canonical({n:-0}));assert.throws(()=>GStar.canonical({n:Infinity}));
});

test('oversized imported JSON exceeds the explicit four MiB envelope limit', async () => {
  assert.equal(GStar.LIMITS.maxExportBytes,4*1024*1024);
  const run=app();const envelope=run.export();envelope.excess='x'.repeat(GStar.LIMITS.maxExportBytes);
  await assert.rejects(async()=>GStar.verify(envelope),/EXPORT_LIMIT/);
});
