import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createWaveState,waveAction,advanceWave,wavePose,waveSummary} from '../assets/entity-wave-model.mjs';
import {createEntityWave} from '../assets/entity-wave-scene.mjs';
import {THREE as T} from '../assets/entity-vendor/runtime.mjs';
const c={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../assets/universe-data.js',import.meta.url),'utf8'),c);
const entities=c.window.HalvethUniverse.entities;

test('the complete registry arrives sequentially and becomes one finite linked population',()=>{
  let state=createWaveState(entities.length);assert.equal(waveSummary(state).revealed,0);
  state=advanceWave(state,.3);assert.ok(waveSummary(state).revealed<entities.length);
  assert.ok(wavePose(0,state).scale>0);assert.equal(wavePose(entities.length-1,state).scale,0);
  state=advanceWave(state,12);assert.equal(state.phase,'LINKED');assert.equal(waveSummary(state).revealed,entities.length);
  const positions=entities.map((_,i)=>wavePose(i,state).position);
  assert.equal(new Set(positions.map(JSON.stringify)).size,entities.length);
  assert.ok(positions.flat().every(Number.isFinite));
});
test('one capture freezes all 68 poses at one model instant without translation or rotation',()=>{
  const base=advanceWave(createWaveState(entities.length),12),poses=entities.map((_,i)=>wavePose(i,base));
  const captured=waveAction(base,'CAPTURE'),later=advanceWave(captured,4);
  assert.equal(captured.captureTime,base.time);assert.equal(later.time,base.time);
  assert.equal(captured.phase,'CAPTURING');assert.equal(later.phase,'CAPTURED');
  assert.deepEqual(entities.map((_,i)=>wavePose(i,later)),poses);
  assert.strictEqual(waveAction(later,'CAPTURE'),later,'repeat capture preserves the snapshot');
  const resumed=waveAction(later,'RESUME');assert.equal(resumed.time,base.time);
  assert.deepEqual(entities.map((_,i)=>wavePose(i,resumed)),poses);
  assert.notDeepEqual(wavePose(0,advanceWave(resumed,.1)),poses[0]);
  assert.equal(base.captureSequence,0);assert.equal(waveAction(resumed,'CAPTURE').captureSequence,2);
});
test('early capture materializes the full population together and reduced motion has a steady light',()=>{
  const early=advanceWave(createWaveState(entities.length),.2),captured=waveAction(early,'CAPTURE');
  assert.equal(waveSummary(captured).revealed,entities.length);assert.equal(captured.time,early.time);
  assert.ok(entities.every((_,i)=>wavePose(i,captured).scale===1));
  const ready=createWaveState(entities.length,{reducedMotion:true});
  const fixed=waveAction(ready,'CAPTURE',{reducedMotion:true});assert.equal(fixed.phase,'CAPTURED');assert.equal(waveSummary(fixed).pulse,0);
  assert.equal(advanceWave(captured,.2,{paused:true}).phase,'CAPTURED','light settles even when model motion is paused');
  assert.equal(waveAction(fixed,'RESUME').phase,'LINKED');
  for(const total of [0,-1,257,1.5])assert.throws(()=>createWaveState(total));
  for(const time of [-1,NaN,Infinity])assert.throws(()=>advanceWave(ready,time));
  assert.throws(()=>waveAction(ready,'unknown'));
});
test('all shapes share bounded geometry, recorded echoes and disposable renderer resources',()=>{
  const wave=createEntityWave(T,entities),camera=new T.PerspectiveCamera();
  camera.position.set(0,10,26);camera.lookAt(0,1.4,0);
  let state;for(let i=0;i<90;i++){state=wave.animate(.1,camera);wave.recordFrame({startedAt:i*100,submittedAt:i*100+2,recordedAt:'2026-10-23T00:00:00Z'},camera);}
  assert.equal(state.revealed,entities.length);assert.ok(state.historySamples<=12);
  const geometries=new Set(),materials=new Set();let renderables=0;
  wave.group.traverse(node=>{if(node.geometry){renderables++;geometries.add(node.geometry);const values=node.geometry.getAttribute('position').array;assert.ok(Array.from(values).every(Number.isFinite));}if(node.material)materials.add(node.material);});
  assert.ok(renderables<=10,'draw objects are batched rather than multiplied per entity');
  wave.action('CAPTURE');state=wave.animate(.2,camera);assert.equal(state.phase,'CAPTURED');
  const snapshot=wave.export().capture;assert.equal(snapshot.poses.length,entities.length);assert.equal(snapshot.signatures.length,entities.length);
  snapshot.poses[0].position[0]=12345;assert.notEqual(wave.export().capture.poses[0].position[0],12345);
  wave.action('RESUME');state=wave.animate(4,camera);assert.equal(state.phase,'LINKED');
  wave.action('REPLAY');state=wave.animate(0,camera);assert.equal(state.revealed,0);assert.equal(state.historySamples,0);
  wave.setReducedMotion(true);state=wave.animate(0,camera,{paused:true});assert.equal(state.phase,'LINKED');assert.equal(state.revealed,entities.length);
  wave.action('CAPTURE');state=wave.animate(0,camera,{paused:true});assert.equal(state.phase,'CAPTURED');
  let disposed=0;for(const resource of [...geometries,...materials])resource.addEventListener('dispose',()=>disposed++);
  wave.dispose();assert.equal(disposed,geometries.size+materials.size);assert.equal(wave.group.children.length,0);
});

test('signature edits wait behind the shared snapshot and resume applies the current pending value',()=>{
 const wave=createEntityWave(T,entities,{reducedMotion:true}),camera=new T.PerspectiveCamera();
 wave.animate(0,camera);wave.action('CAPTURE');wave.animate(0,camera);
 const original=wave.export().currentSignatures[0],changed=structuredClone(original);
 changed.values.memory=original.values.memory===0?1:0;
 wave.setSignature(changed);assert.equal(wave.export().pendingSignatureCount,1);
 assert.deepEqual(wave.export().currentSignatures[0],original);
 assert.deepEqual(wave.export().capture.signatures[0],original);
 wave.setSignature(original);assert.equal(wave.export().pendingSignatureCount,0,'returning to the captured value cancels the queued edit');wave.setSignature(changed);
 wave.action('RESUME');assert.deepEqual(wave.export().currentSignatures[0],changed);
 assert.deepEqual(wave.export().capture.signatures[0],original,'the retained capture remains historical');
 wave.dispose();
});
