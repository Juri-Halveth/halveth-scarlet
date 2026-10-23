import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameLedger} from '../assets/entity-wave-ledger.mjs';
test('render receipts share frame time, preserve copies, count retention and expose unobserved intervals',()=>{
 const ledger=createFrameLedger({capacity:2,timeOrigin:123});
 const poses=[{entityId:'a',position:[1,2,3]},{entityId:'b',position:[3,2,1]}];
 const record=(t)=>ledger.record({startedAt:t,submittedAt:t+2,recordedAt:'2026-10-23T21:00:00Z',modelTime:7,captureId:'snapshot-1',phase:'CAPTURED',poses,camera:{position:[0,1,20]}});
 record(0);poses[0].position[0]=99;assert.equal(ledger.export().frames[0].poses[0].position[0],1);record(20);record(10000);
 const result=ledger.export();assert.equal(result.coverage.totalRecorded,3);assert.equal(result.coverage.evicted,1);assert.equal(result.frames.length,2);
 assert.deepEqual(result.frames.map(f=>f.frameId),[2,3]);assert.equal(result.frames[1].intervalBefore.durationMs,9978);
 assert.equal(result.frames[1].intervalBefore.intermediateStates,'UNOBSERVED');assert.equal(result.coverage.physicalPresentation,'UNOBSERVED');
 assert.ok(result.frames.every(f=>f.captureId==='snapshot-1'&&f.modelTime===7&&f.poses.length===2));
 result.frames[0].poses[0].position[0]=888;assert.equal(ledger.export().frames[0].poses[0].position[0],99);
 assert.throws(()=>record(3));assert.throws(()=>createFrameLedger({capacity:0}));
});
