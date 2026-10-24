import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutStates,phaseAmount,membranePoint} from '../assets/capability-room-visual.mjs';

test('each retained state has one stable body and links use bound parent IDs',()=>{
  const states=Array.from({length:48},(_,i)=>({id:'state-'+i,parents:i?[{id:'state-'+(i-1)}]:[]}));
  const before=structuredClone(states);
  for(const [w,h] of [[300,420],[375,506],[768,560],[1400,640]]){
    const scene=layoutStates(states,w,h,'state-47');
    assert.equal(new Set(scene.bodies.map(b=>b.id)).size,48);
    assert.equal(scene.links.length,47);
    assert.equal(scene.bodies.filter(b=>b.selected).length,1);
    for(const b of scene.bodies){assert.ok(b.x-b.radius>=0&&b.x+b.radius<=w);assert.ok(b.y-b.radius>=0&&b.y+b.radius<=h);}
    assert.deepEqual(layoutStates(states.slice(0,4),w,h,'state-47').bodies,scene.bodies.slice(0,4));
  }
  assert.deepEqual(states,before);
});
test('the renderer does not invent a missing parent or accept duplicate states',()=>{
  assert.deepEqual(layoutStates([{id:'a',parents:[{id:'absent'}]}],390,500,'a').links,[]);
  assert.throws(()=>layoutStates([{id:'a'},{id:'a'}],390,500,'a'),/INVALID_VISUAL_STATE/);
  assert.throws(()=>layoutStates([],0,500,''),/INVALID_VISUAL_INPUT/);
});
test('phase transitions settle and reduced motion chooses a static final form',()=>{
  assert.equal(phaseAmount('unfold',.14,0),.14);
  assert.equal(phaseAmount('unfold',.14,1400),1);
  assert.equal(phaseAmount('unfold',.14,0,true),1);
  assert.equal(phaseAmount('shell',1,1400),.48);
  assert.throws(()=>phaseAmount('other',0,0),/INVALID_VISUAL_PHASE/);
});
test('a paused model produces identical finite display geometry',()=>{
  for(const strand of [0,7,23])for(const u of [0,.25,.5,.75,1]){
    const p=membranePoint(u,strand,100,12,.66);
    assert.deepEqual(p,membranePoint(u,strand,100,12,.66));
    assert.ok(Object.values(p).every(Number.isFinite));
  }
  assert.notDeepEqual(membranePoint(.4,7,100,12,.66),membranePoint(.4,7,100,13,.66));
});
