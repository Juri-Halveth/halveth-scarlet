'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const live = require('../forschung/weltkeimwerk/live-core.js');
const registry = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/universe-data.js'), 'utf8'), registry);
const profiles = JSON.parse(JSON.stringify(registry.window.HalvethUniverse.entities));
const create = (count = 7, seed = 123) => live.create(profiles.slice(0, count), { seed });
const roots = view => view.nodes.filter(node => node.depth === 0);
const close = (a, b, message) => assert(Math.abs(a - b) <= 1e-8, message || `${a} != ${b}`);
const worldEdgeDistance = (position, world) => Math.min(
  world.width / 2 - position.x, world.width / 2 + position.x,
  world.height / 2 - position.y, world.height / 2 + position.y
);

function bounded(view) {
  const byId = new Map(view.nodes.map(node => [node.id, node]));
  close(view.world.width * view.world.height, view.world.area, 'world area is retained');
  assert(view.nodes.length <= view.counts.sourceProfiles * 3);
  assert(view.signals.length <= live.LIMITS.signals);
  assert(view.events.length <= live.LIMITS.events);
  assert(view.waves.length <= live.LIMITS.waves);
  for (const node of view.nodes) {
    for (const value of [node.position.x, node.position.y, node.velocity.x, node.velocity.y, node.body.radius]) assert(Number.isFinite(value));
    assert(node.body.radius > 0);
    assert(node.inbox.length <= live.LIMITS.inbox);
    assert(node.children.length <= 1 && node.depth <= live.LIMITS.depth);
    assert(node.memory.avoidance >= 0 && node.memory.avoidance <= 1.4);
    assert(Number.isFinite(node.memory.meanImpulse));
    assert(Math.hypot(node.velocity.x, node.velocity.y) <= live.LIMITS.speed + 1e-8, `${node.id}: bounded velocity`);
    if (node.depth === 0) {
      assert(Math.abs(node.position.x) + node.body.radius <= view.world.width / 2 + 1e-8, `${node.id}: horizontal boundary`);
      assert(Math.abs(node.position.y) + node.body.radius <= view.world.height / 2 + 1e-8, `${node.id}: vertical boundary`);
      close(node.sensors.boundaryDistance, worldEdgeDistance(node.position, view.world), `${node.id}: sensor is bound to the final center position`);
    } else {
      const parent = byId.get(node.parentId);
      assert(parent);
      assert(Math.hypot(node.position.x - parent.position.x, node.position.y - parent.position.y) + node.body.radius <= parent.body.radius + 1e-8, `${node.id}: contained in its parent`);
    }
  }
  for (const wave of view.waves) {
    assert(Number.isFinite(wave.radius) && wave.radius >= 0);
    assert(wave.expiresAt > view.modelMs);
    assert.equal(new Set(wave.hits).size, wave.hits.length);
  }
}

// One fixed, synthetic narrow-world fixture supplies contact and wave witnesses.
// Every retained event is read once; this is not an independent real-world trace.
let contactFixture;
function contacts() {
  if (contactFixture) return contactFixture;
  const engine = create(); engine.reshape(.25);
  const events = [], waves = new Map(); let sequence = 0;
  for (let time = 0; time < 30000; time += live.LIMITS.stepMs) {
    engine.advance(live.LIMITS.stepMs);
    const view = engine.snapshot();
    const fresh = view.events.filter(event => event.sequence > sequence);
    if (fresh.length) assert.equal(fresh[0].sequence, sequence + 1, 'the fixture did not lose its event prefix');
    events.push(...fresh); sequence = view.coverage.lastSequence;
    for (const wave of view.waves) if (!waves.has(wave.id)) waves.set(wave.id, wave);
  }
  contactFixture = { view: engine.snapshot(), events, waves };
  return contactFixture;
}

test('the moving model owns actual position, prior position, velocity and spatial observations', () => {
  const engine = create(), before = engine.snapshot(); engine.advance(5000); const after = engine.snapshot();
  assert.equal(after.version, '2.0.0');
  assert.equal(after.world.units, 'MODEL_UNITS');
  assert(roots(after).some(node => {
    const old = before.nodes.find(candidate => candidate.id === node.id);
    return Math.hypot(node.position.x - old.position.x, node.position.y - old.position.y) > .05;
  }));
  assert(roots(after).some(node => Math.hypot(node.position.x - node.previousPosition.x, node.position.y - node.previousPosition.y) > 0));
  for (const node of roots(after)) {
    assert.equal(node.sensors.observedAt, after.modelMs);
    assert(node.sensors.temperature >= 0 && node.sensors.temperature <= 1);
    assert(Number.isInteger(node.sensors.density) && node.sensors.density >= 0);
    assert(node.sensors.boundaryDistance >= 0);
    assert(Number.isFinite(node.sensors.flowX) && Number.isFinite(node.sensors.flowY));
  }
  bounded(after);
});

test('physics, contact memory and wave histories are deterministic across elapsed-time partitions and reshapes', () => {
  const whole = create(), framed = create();
  whole.reshape(.5); framed.reshape(.5);
  whole.advance(6000);
  for (let i = 0; i < 120; i++) { framed.advance(13); framed.advance(37); }
  whole.reshape(2); framed.reshape(2);
  whole.advance(9000);
  for (let i = 0; i < 180; i++) { framed.advance(17); framed.advance(33); }
  assert.deepEqual(framed.snapshot(), whole.snapshot());
  assert(whole.snapshot().counts.contacts > 0);
});

test('all 69 profile roots can send to every other root, including ASTER and RACHEL after full admission', () => {
  const engine = create(profiles.length); const profileIds = profiles.map(profile => profile.id);
  let atFull;
  // Two 68-peer sweeps at <=6 s per pulse, plus 62 s admission, fit within 900 s.
  // This is a finite model-time check, not a measured fifteen-minute browser observation.
  for (let elapsed = 0; elapsed < 900000; elapsed += 60000) {
    engine.advance(60000); const view = engine.snapshot(); bounded(view);
    if (!atFull && view.counts.roots === profiles.length) atFull = Math.max(...roots(view).map(node => node.bornAt));
  }
  const view = engine.snapshot();
  assert.equal(view.counts.roots, 69);
  assert.equal(view.routing.eligiblePairs, 69 * 68);
  for (const node of roots(view)) for (const id of profileIds) if (id !== node.id) {
    assert(node.memory.peers[id]?.sent > 0, `${node.id} can send to ${id}`);
  }
  const aster = view.nodes.find(node => node.id === 'aster'), rachel = view.nodes.find(node => node.id === 'rachel');
  assert(aster.memory.peers.rachel.lastSentAt > atFull);
  assert(rachel.memory.peers.aster.lastSentAt > atFull);
  assert(view.counts.channelTransitions.SIGNAL > 0);
});

test('contacts retain non-self pairs, bilateral memory and real equal-and-opposite velocity impulses', () => {
  const { view, events } = contacts();
  const touches = events.filter(event => event.type === 'CONTACT_EVENT');
  assert(touches.length > 0);
  assert.equal(touches.length, view.counts.contacts);
  assert.equal(roots(view).reduce((sum, node) => sum + node.memory.contacts, 0), 2 * view.counts.contacts);
  assert(touches.some(event => event.impulse > 0));
  for (const event of touches) {
    assert.notEqual(event.subject, event.target);
    assert.equal(event.geometryPhase, 'PRE_CORRECTION_CONTACT');
    close(event.distance, Math.hypot(event.targetPosition.x - event.sourcePosition.x, event.targetPosition.y - event.sourcePosition.y), 'contact distance uses the recorded pre-correction positions');
    assert.equal(event.correctedPositions.length, 2);
    assert(event.correctedPositions.every(position => Number.isFinite(position.x) && Number.isFinite(position.y)));
    assert(event.distance <= event.radii + 1e-8);
    assert(event.impulse >= 0 && Number.isFinite(event.impulse));
    const [beforeA, beforeB] = event.velocitiesBefore, [afterA, afterB] = event.velocitiesAfter;
    close(afterA.x + afterB.x, beforeA.x + beforeB.x, 'horizontal pair impulse balances');
    close(afterA.y + afterB.y, beforeA.y + beforeB.y, 'vertical pair impulse balances');
    if (event.impulse > 0) {
      assert(Math.hypot(afterA.x - beforeA.x, afterA.y - beforeA.y) > 0);
      assert(Math.hypot(afterB.x - beforeB.x, afterB.y - beforeB.y) > 0);
    }
    for (let i = 0; i < 2; i++) assert(event.avoidanceAfter[i] >= event.avoidanceBefore[i] && event.avoidanceAfter[i] <= 1.4);
  }
  for (const node of roots(view)) for (const [id, peer] of Object.entries(node.memory.peers)) if (peer.contacts) {
    const other = view.nodes.find(candidate => candidate.id === id);
    assert(other); assert.equal(peer.contacts, other.memory.peers[node.id].contacts);
  }
});

test('a contact delivers both directions through PORT, MEMBRANE and a changed CORE with the same witness', () => {
  const { events, view } = contacts();
  const first = events.find(event => event.type === 'CONTACT_EVENT');
  const transitions = events.filter(event => event.type === 'CORE_TRANSITION' && event.channel === 'CONTACT' && event.witnessId === first.id);
  assert.equal(transitions.length, 2, 'both first-contact inputs reach a core in the fixture');
  assert.deepEqual(new Set(transitions.map(event => event.subject)), new Set([first.subject, first.target]));
  for (const transition of transitions) {
    assert.notEqual(transition.genome, transition.previousGenome);
    const phases = events.filter(event => event.subject === transition.subject && event.signalId === transition.signalId && ['PORT_RECEIVE', 'MEMBRANE_TRANSFER', 'CORE_TRANSITION'].includes(event.type));
    assert.deepEqual(phases.map(event => event.type), ['PORT_RECEIVE', 'MEMBRANE_TRANSFER', 'CORE_TRANSITION']);
    assert(phases.every(event => event.channel === 'CONTACT'));
    assert(phases[0].modelMs < phases[1].modelMs && phases[1].modelMs < phases[2].modelMs);
  }
  assert(view.counts.channelTransitions.CONTACT >= 2);
});

test('contact experience is retained cumulatively and saturates without leaving its declared bounds', () => {
  const { view, events } = contacts();
  const previous = new Map();
  for (const event of events.filter(event => event.type === 'CONTACT_EVENT')) {
    for (const [i, id] of [event.subject, event.target].entries()) {
      if (previous.has(id)) close(event.avoidanceBefore[i], previous.get(id), 'previous contact memory is retained');
      assert(event.avoidanceAfter[i] > event.avoidanceBefore[i] || event.avoidanceAfter[i] === 1.4);
      previous.set(id, event.avoidanceAfter[i]);
    }
  }
  for (const node of roots(view)) if (previous.has(node.id)) close(node.memory.avoidance, previous.get(node.id));
  assert(roots(view).some(node => node.memory.contacts > 1 && node.memory.avoidance > .12));
  // Source review separately binds this memory to spacing/force. A count alone is not a learning-quality claim.
});

test('wave receptions occur on an intersecting front only once per wave and root', () => {
  const { view, events, waves } = contacts();
  const receives = events.filter(event => event.type === 'WAVE_RECEIVE'), pairs = new Set();
  assert(receives.length > 0);
  for (const event of receives) {
    const key = `${event.waveId}:${event.subject}`;
    assert(!pairs.has(key), 'one receipt per wave and root'); pairs.add(key);
    assert(event.distance <= event.radius + event.bodyRadius + 1e-8);
    assert(event.distance >= event.previousRadius - event.bodyRadius - 1e-8);
    const wave = waves.get(event.waveId); assert(wave);
    assert.notEqual(event.subject, wave.source); assert.notEqual(event.subject, wave.partner);
    assert(event.modelMs < wave.expiresAt);
    assert(event.strength > 0 && Number.isFinite(event.strength));
  }
  assert.equal(receives.length, view.counts.waveReceipts);
  assert.equal(roots(view).reduce((sum, node) => sum + node.memory.waves, 0), view.counts.waveReceipts);
  assert(events.some(event => event.type === 'CORE_TRANSITION' && event.channel === 'WAVE' && pairs.has(`${event.witnessId}:${event.subject}`)));
  assert(!view.waves.some(wave => wave.id === receives[0].waveId), 'the early wave expired');
  bounded(view);
});

test('environment samples bind a spatial observation to actual later input transitions', () => {
  const { events, view } = contacts();
  const samples = new Map(events.filter(event => event.type === 'ENVIRONMENT_SAMPLE').map(event => [event.id, event]));
  assert(samples.size > 0); assert.equal(samples.size, view.counts.environmentInputs);
  for (const sample of samples.values()) {
    assert(Number.isFinite(sample.position.x) && Number.isFinite(sample.position.y));
    assert.equal(sample.sensors.observedAt, sample.modelMs);
    close(sample.sensors.boundaryDistance, worldEdgeDistance(sample.position, view.world), 'environment distance uses the recorded sample position');
    assert(sample.sensors.temperature >= 0 && sample.sensors.temperature <= 1);
    assert(sample.sensors.density >= 0 && Number.isFinite(sample.sensors.flowX));
  }
  const transitions = events.filter(event => event.type === 'CORE_TRANSITION' && event.channel === 'ENVIRONMENT');
  assert(transitions.length > 0);
  for (const transition of transitions) {
    const sample = samples.get(transition.witnessId); assert(sample);
    assert.equal(transition.subject, sample.subject); assert(sample.modelMs < transition.modelMs);
    assert.notEqual(transition.genome, transition.previousGenome);
  }
});

test('reshaping preserves area and immediately contains roots and nested cells, before another tick', () => {
  const engine = create(); engine.advance(30000); const before = engine.snapshot();
  assert(before.nodes.some(node => node.depth === 2));
  for (const aspect of [.25, 4, 1.6, .6, 2.5]) {
    const counts = engine.snapshot().counts; engine.reshape(aspect); const view = engine.snapshot();
    close(view.world.width / view.world.height, aspect);
    close(view.world.area, before.world.area); assert.deepEqual(view.counts, counts);
    bounded(view);
    assert.equal(view.waves.length, 0);
    assert.equal(view.events.at(-1).type, 'WORLD_RESHAPE');
    assert(view.events.at(-1).endedWavefronts);
    engine.advance(50);
  }
});

test('invalid geometry and elapsed inputs are atomic; an unchanged aspect is passive', () => {
  const engine = create(); engine.advance(5000);
  for (const aspect of [0, -.1, .249, 4.001, NaN, Infinity, -Infinity, '1', null, {}]) {
    const before = engine.snapshot(); assert.throws(() => engine.reshape(aspect)); assert.deepEqual(engine.snapshot(), before);
  }
  for (const delta of [-1, NaN, Infinity, '50', 60001]) {
    const before = engine.snapshot(); assert.throws(() => engine.advance(delta)); assert.deepEqual(engine.snapshot(), before);
  }
  const before = engine.snapshot(); engine.reshape(before.world.width / before.world.height); assert.deepEqual(engine.snapshot(), before);
});

test('display gaps preserve mechanical and informational state while recording missing display time', () => {
  const engine = create(); engine.reshape(.25); engine.advance(2000); const before = engine.snapshot(); engine.gap(12000); const after = engine.snapshot();
  for (const key of ['nodes', 'signals', 'waves', 'world', 'counts', 'tick', 'modelMs']) assert.deepEqual(after[key], before[key]);
  assert.equal(after.timing.displayGapMs, 12000); assert.equal(after.events.at(-1).type, 'DISPLAY_GAP');
});

test('detached snapshots cannot modify position, sensor memory, waves or pair history', () => {
  const engine = create(); engine.reshape(.25); engine.advance(1000); const expected = engine.snapshot(); const external = engine.snapshot();
  external.nodes[0].position.x = 1e99; external.nodes[0].velocity.x = 1e99;
  external.nodes[0].memory.avoidance = 100; external.nodes[0].memory.peers.synthetic = {sent: 1e99};
  external.nodes[0].sensors.temperature = 100; external.waves.length = 0; external.world.width = 0;
  assert.deepEqual(engine.snapshot(), expected);
});

test('the render projection preserves model geometry while declaring omitted history and leaving the full view intact', () => {
  const engine = create(); engine.reshape(.25); engine.advance(12000);
  const full = engine.snapshot(), render = engine.snapshot('render');
  assert.equal(render.coverage.projection, 'render');
  assert.equal(render.coverage.history, 'OMITTED_FROM_RENDER_PROJECTION');
  assert.equal(full.coverage.projection, 'full');
  assert.equal(full.coverage.history, 'BOUNDED_RECENT_EVENTS');
  assert(full.events.length > 0); assert.deepEqual(render.events, []);
  for (const key of ['counts', 'world', 'timing', 'signals', 'waves', 'routing']) assert.deepEqual(render[key], full[key]);
  for (const node of render.nodes) {
    const original = full.nodes.find(candidate => candidate.id === node.id);
    for (const key of ['position', 'previousPosition', 'velocity', 'body', 'sensors', 'genome', 'revision']) assert.deepEqual(node[key], original[key]);
    assert(!Object.hasOwn(node, 'memory'), 'peer history is omitted from the render projection');
  }
  render.nodes[0].position.x = 1e99; render.nodes[0].children.length = 0;
  assert.deepEqual(engine.snapshot(), full);
  for (const projection of ['summary', null, true, {}]) {
    assert.throws(() => engine.snapshot(projection)); assert.deepEqual(engine.snapshot(), full);
  }
});
