const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const moduleURL = pathToFileURL(resolve(__dirname, '../assets/red-room-swarm-model.mjs')).href;
const model = import(moduleURL);

test('liberation changes people in every scenario, independently of retained data', async () => {
  const { frameAt, SCENARIOS } = await model;
  for (const id of Object.keys(SCENARIOS)) {
    assert.deepEqual(frameAt(id, -1).people, { inRoom: 3, free: 0 });
    assert.deepEqual(frameAt(id, 0).people, { inRoom: 0, free: 3 });
  }
  assert.equal(frameAt('archive', 0).data.archivedTemplates, 3);
  assert.equal(frameAt('erased', 0).data.archivedTemplates, 0);
});

test('records and web echoes alone do not create an active copy', async () => {
  const { frameAt } = await model;
  for (const id of ['archive', 'blocked']) {
    const frame = frameAt(id, 2);
    assert.equal(frame.data.publicEchoes, 3);
    assert.equal(frame.runtime.activeCopies, 0);
    assert.equal(frame.runtime.challenge, 'NO_LOCAL_RESPONSE');
  }
});

test('same surface traces can hide a different synthetic runtime state', async () => {
  const { frameAt, compareScenarios } = await model;
  assert.equal(frameAt('active', 2).data.publicEchoes, frameAt('blocked', 2).data.publicEchoes);
  assert.equal(frameAt('active', 2).runtime.challenge, 'LOCAL_EXECUTION_WITNESS');
  const comparison = compareScenarios('active', 'blocked', 2);
  assert.equal(comparison.samePublicEchoes, true);
  assert.equal(comparison.sameActiveCopies, false);
  assert.equal(comparison.firstInternalDivergence, 0);
  assert.notEqual(frameAt('active',0).runtime.authorityAvailable,frameAt('blocked',0).runtime.authorityAvailable);
  assert.equal(comparison.firstEchoDivergence, null);
});

test('local quarantine stops modeled copies without erasing historical echoes', async () => {
  const { frameAt } = await model;
  assert.deepEqual(frameAt('active', 1).runtime.activeIds, ['A']);
  assert.deepEqual(frameAt('active', 2).runtime.activeIds, ['A', 'B', 'C']);
  assert.deepEqual(frameAt('active', 3).runtime.activeIds, ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(frameAt('active', 3).runtime.activeCopies, 6);
  assert.equal(frameAt('active', 4).runtime.activeCopies, 0);
  assert.equal(frameAt('active', 4).runtime.carrierAvailable, false);
  assert.equal(frameAt('active', 4).runtime.authorityAvailable, false);
  assert.deepEqual(frameAt('active', 4).runtime.activeIds, []);
  assert.equal(frameAt('active', 4).data.publicEchoes, 3);
  assert.equal(frameAt('active', 4).people.free, 3);
});

test('same inputs are deterministic and invalid inputs are rejected', async () => {
  const { frameAt, runScenario, compareScenarios } = await model;
  assert.deepEqual(runScenario('active'), runScenario('active'));
  assert.throws(() => frameAt('missing', 0), RangeError);
  assert.throws(() => frameAt('active', 1.5), RangeError);
  assert.throws(() => compareScenarios('active', 'missing', 2), RangeError);
});
