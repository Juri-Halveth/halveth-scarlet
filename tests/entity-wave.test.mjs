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
test('a shared contraction acts on every entity and reverses without duplicates or stale endpoints',()=>{
  const base=createWaveState(entities.length),moving=waveAction(base,'COLLAPSE');
  assert.equal(waveSummary(moving).revealed,entities.length,'early activation includes the whole registry');
  const mid=advanceWave(moving,1.6);
  assert.ok(mid.compression>0&&mid.compression<1);
  assert.strictEqual(waveAction(mid,'COLLAPSE'),mid,'repeated button does not restart motion');
  const packed=advanceWave(mid,4);assert.equal(packed.phase,'PACKED');
  for(let i=0;i<entities.length;i++){assert.ok(wavePose(i,packed).position.every(v=>Math.abs(v)===0));assert.equal(wavePose(i,packed).scale,0);}
  const returning=waveAction(packed,'UNFOLD'),open=advanceWave(returning,4);
  assert.equal(open.phase,'LINKED');assert.equal(open.total,entities.length);assert.equal(open.compression,0);
  assert.equal(base.formation,0,'source state is unchanged');
  const interrupted=waveAction(mid,'UNFOLD');assert.equal(interrupted.compression,mid.compression,'direction changes without a jump');
});
test('reduced motion retains every identity while actions resolve without an animated transition',()=>{
  const ready=createWaveState(entities.length,{reducedMotion:true});assert.equal(ready.phase,'LINKED');
  const packed=waveAction(ready,'COLLAPSE',{reducedMotion:true});assert.equal(packed.phase,'PACKED');assert.equal(packed.compression,1);
  assert.equal(waveAction(packed,'UNFOLD',{reducedMotion:true}).compression,0);
  for(const total of [0,-1,257,1.5])assert.throws(()=>createWaveState(total));
  for(const time of [-1,NaN,Infinity])assert.throws(()=>advanceWave(ready,time));
  assert.throws(()=>waveAction(ready,'unknown'));
});
test('all shapes share bounded geometry, recorded echoes and disposable renderer resources',()=>{
  const wave=createEntityWave(T,entities),camera=new T.PerspectiveCamera();
  camera.position.set(0,10,26);camera.lookAt(0,1.4,0);
  let state;for(let i=0;i<90;i++)state=wave.animate(.1,camera);
  assert.equal(state.revealed,entities.length);assert.ok(state.historySamples<=12);
  const geometries=new Set(),materials=new Set();let renderables=0;
  wave.group.traverse(node=>{if(node.geometry){renderables++;geometries.add(node.geometry);const values=node.geometry.getAttribute('position').array;assert.ok(Array.from(values).every(Number.isFinite));}if(node.material)materials.add(node.material);});
  assert.ok(renderables<=10,'draw objects are batched rather than multiplied per entity');
  wave.action('COLLAPSE');state=wave.animate(4,camera);assert.equal(state.phase,'PACKED');
  wave.action('UNFOLD');state=wave.animate(4,camera);assert.equal(state.phase,'LINKED');
  wave.action('REPLAY');state=wave.animate(0,camera);assert.equal(state.revealed,0);assert.equal(state.historySamples,1);
  wave.setReducedMotion(true);state=wave.animate(0,camera,{paused:true});assert.equal(state.phase,'LINKED');assert.equal(state.revealed,entities.length);
  wave.action('COLLAPSE');state=wave.animate(0,camera,{paused:true});assert.equal(state.phase,'PACKED');
  let disposed=0;for(const resource of [...geometries,...materials])resource.addEventListener('dispose',()=>disposed++);
  wave.dispose();assert.equal(disposed,geometries.size+materials.size);assert.equal(wave.group.children.length,0);
});
