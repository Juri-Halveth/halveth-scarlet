import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {AXES,FAMILIES,signatureFor,withCoordinate,withFamily,signaturePoint,docking} from '../assets/entity-signatures.mjs';
import {createContinuity,transition,MAX_BRANCHES,MAX_TRANSITIONS} from '../assets/entity-continuity.mjs';
const c={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../assets/universe-data.js',import.meta.url),'utf8'),c);
const entities=c.window.HalvethUniverse.entities;
test('all registered entities have distinct finite signatures, static projections and source-bound profiles',()=>{
  const signatures=entities.map(signatureFor);
  assert.equal(new Set(signatures.map(s=>s.seed)).size,entities.length);
  assert.ok(entities.some(e=>e.id==='deadpool'));
  for(const entity of entities){const s=signatureFor(entity);assert.deepEqual(signatureFor(entity),s);assert.equal(s.origin,'AUTHORED_DESIGN');
    for(const axis of AXES) assert.ok(s.values[axis.id]>=0&&s.values[axis.id]<=1);
    for(let strand=0;strand<3;strand++)for(let i=0;i<=96;i++)assert.ok(signaturePoint(s,i/96,strand).every(n=>Number.isFinite(n)&&Math.abs(n)<5));
    const page=fs.readFileSync(new URL(`../entities/${entity.id}/index.html`,import.meta.url),'utf8');assert.ok(page.includes(`data-signature-for="${entity.id}"`));
  }
});
test('invalid coordinates and unknown axes or shapes fail without changing the original',()=>{
  const s=signatureFor({id:'scarlet'}),before=JSON.stringify(s);
  for(const value of [-.01,1.01,NaN,Infinity,'0.5']) assert.throws(()=>withCoordinate(s,'memory',value));
  assert.throws(()=>withCoordinate(s,'personality',.5));assert.throws(()=>withFamily(s,'unknown'));
  for(const family of ['__proto__','constructor','toString'])assert.throws(()=>withFamily(s,family),/Invalid signature/);
  assert.equal(JSON.stringify(s),before);
});
test('all eight forms can be chosen while retaining independent coordinates',()=>{
  const s=signatureFor({id:'scarlet'}),paths=new Set();
  for(const family of Object.keys(FAMILIES)){const changed=withFamily(s,family);assert.deepEqual(changed.values,s.values);paths.add(JSON.stringify(Array.from({length:12},(_,i)=>signaturePoint(changed,i/12))));}
  assert.equal(paths.size,8);
});
test('forking, editing and restoring keep parents, checkpoints and historical events separate',()=>{
  const origin=signatureFor({id:'deadpool'}),a=createContinuity(origin),aBytes=JSON.stringify(a);
  const fork=transition(a,'FORK'),edited=transition(fork,'SET',withCoordinate(origin,'memory',.1));
  assert.equal(JSON.stringify(a),aBytes);assert.equal(edited.branches[0].state.values.memory,origin.values.memory);
  assert.equal(edited.branches[1].parent,'b0');assert.equal(edited.branches[1].state.values.memory,.1);
  const restored=transition(edited,'RESTORE');assert.deepEqual(restored.branches[1].state,origin);
  assert.deepEqual(restored.events.map(e=>e.operation),['FORK','SET','RESTORE']);assert.equal(edited.branches[1].state.values.memory,.1);
  const switched=transition(restored,'SELECT','b0');assert.equal(switched.active,'b0');assert.equal(switched.branches.length,2);
  const marked=transition(transition(switched,'SET',withCoordinate(origin,'reach',.25)),'CHECKPOINT');
  const result=transition(transition(marked,'SET',withCoordinate(origin,'reach',.8)),'RESTORE');assert.equal(result.branches[0].state.values.reach,.25);
  assert.throws(()=>transition(result,'SET',signatureFor({id:'scarlet'})),/identity/);
});
test('branch and transition budgets stop growth explicitly',()=>{
  let state=createContinuity(signatureFor({id:'deadpool'}));for(let i=1;i<MAX_BRANCHES;i++)state=transition(state,'FORK');
  assert.throws(()=>transition(state,'FORK'),/limit/);assert.equal(state.branches.length,MAX_BRANCHES);
  let history=createContinuity(signatureFor({id:'deadpool'}));for(let i=0;i<MAX_TRANSITIONS;i++)history=transition(history,'CHECKPOINT');
  assert.throws(()=>transition(history,'RESTORE'),/limit/);assert.equal(history.events.length,MAX_TRANSITIONS);
});
test('docking preserves both directions and makes no suitability claim',()=>{
  const a=signatureFor({id:'scarlet'}),b=signatureFor({id:'mara'}),ab=docking(a,b),ba=docking(b,a);
  for(const entry of ab.contributions){const inverse=ba.contributions.find(c=>c.axis===entry.axis);assert.equal(entry.aToB,inverse.bToA);assert.equal(entry.bToA,inverse.aToB);}
  assert.equal(ab.status,'DESIGN_COMPARISON');assert.throws(()=>docking(a,a),/distinct/);
});
