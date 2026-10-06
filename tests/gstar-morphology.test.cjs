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
const close = (a, b, message) => assert(Math.abs(a - b) <= 1e-9, message || `${a} != ${b}`);

// A bounded deterministic fixture, with every event read before its ring expires.
// It witnesses this synthetic model only; elapsed CI wall time is not an oracle.
let fixture;
function sample() {
  if (fixture) return fixture;
  const engine = create(); engine.reshape(.25);
  const states = [], events = []; let sequence = 0;
  for (let elapsed = 0; elapsed < 60000; elapsed += 100) {
    engine.advance(100);
    const state = engine.snapshot(), fresh = state.events.filter(event => event.sequence > sequence);
    if (fresh.length) assert.equal(fresh[0].sequence, sequence + 1, 'bounded fixture lost an event');
    events.push(...fresh); sequence = state.coverage.lastSequence;
    states.push(engine.snapshot('render'));
  }
  fixture = { engine, states, events };
  return fixture;
}

function checkAssemblies(state) {
  const nodes = new Map(roots(state).map(node => [node.id, node]));
  const graph = new Map();
  for (const bond of state.bonds) {
    for (const [from, to] of [[bond.source, bond.target], [bond.target, bond.source]]) {
      if (!graph.has(from)) graph.set(from, new Set());
      graph.get(from).add(to);
    }
  }
  const expected = [], visited = new Set();
  for (const id of graph.keys()) {
    if (visited.has(id)) continue;
    const queue = [id]; visited.add(id);
    for (let i = 0; i < queue.length; i++) for (const other of graph.get(queue[i])) {
      if (!visited.has(other)) { visited.add(other); queue.push(other); }
    }
    expected.push(queue.sort().join('|'));
  }
  assert.deepEqual(state.assemblies.map(a => a.members.slice().sort().join('|')).sort(), expected.sort(), 'assemblies describe the current bond components');
  for (const assembly of state.assemblies) {
    assert.equal(assembly.observedAt, state.modelMs, 'geometry is bound to the current model tick');
    assert.equal(new Set(assembly.members).size, assembly.members.length);
    const members = assembly.members.map(id => nodes.get(id));
    assert(members.every(Boolean));
    close(assembly.center.x, members.reduce((sum, node) => sum + node.position.x, 0) / members.length, 'assembly x matches current member geometry');
    close(assembly.center.y, members.reduce((sum, node) => sum + node.position.y, 0) / members.length, 'assembly y matches current member geometry');
    close(assembly.coherence, members.reduce((sum, node) => sum + node.morphology.corners, 0) / members.length, 'coherence matches current shape parameters');
  }
}

test('morphology starts as a seed and changes actual shape parameters on existing nodes', () => {
  const engine = create(), before = engine.snapshot();
  assert(roots(before).every(node => node.morphology.form === 'SEED'));
  engine.advance(5000); const after = engine.snapshot();
  const old = new Map(before.nodes.map(node => [node.id, node]));
  assert(roots(after).every(node => node.morphology.form !== 'SEED'));
  assert(roots(after).some(node => node.morphology.elongation !== old.get(node.id).morphology.elongation));
  assert(roots(after).some(node => node.body.radius !== old.get(node.id).body.radius));
  assert(after.counts.morphologyChanges > 0);
  assert.equal(after.counts.morphologyChanges, roots(after).reduce((sum, node) => sum + node.morphology.revision, 0));
  assert(sample().events.filter(event => event.type === 'FORM_CHANGE').some(event => event.revision > 1), 'the same node can change form again');
});

test('finite morphology preserves positive conservative bodies and nested containment', () => {
  const forms = new Set(['SEED', 'FILAMENT', 'TILE', 'PETAL', 'SHELL']);
  for (const state of sample().states) {
    const nodes = new Map(state.nodes.map(node => [node.id, node]));
    for (const node of state.nodes) {
      const m = node.morphology;
      assert(forms.has(m.form));
      for (const value of [m.angle, m.elongation, m.corners, m.scale, node.body.radius, node.body.baseRadius]) assert(Number.isFinite(value));
      assert(m.elongation >= .4 - 1e-9 && m.elongation <= 1);
      assert(m.corners >= 0 && m.corners <= 1);
      assert(m.scale >= .72 - 1e-9 && m.scale <= 1.08 + 1e-9);
      assert(Number.isInteger(m.revision) && m.revision >= 0 && m.symbol.length > 0);
      assert(node.body.radius > 0 && node.body.baseRadius > 0);
      if (!node.depth) {
        close(node.body.radius, node.body.baseRadius * m.scale);
        assert(Math.abs(node.position.x) + node.body.radius <= state.world.width / 2 + 1e-9);
        assert(Math.abs(node.position.y) + node.body.radius <= state.world.height / 2 + 1e-9);
      } else {
        const parent = nodes.get(node.parentId); assert(parent);
        assert(Math.hypot(node.position.x - parent.position.x, node.position.y - parent.position.y) + node.body.radius <= parent.body.radius + 1e-9);
      }
    }
  }
});

test('morphology, bonds and habitat are deterministic across time partitions and the same reshape', () => {
  const whole = create(12), divided = create(12);
  whole.advance(12345);
  for (let i = 0; i < 123; i++) divided.advance(100);
  divided.advance(45);
  whole.reshape(.75); divided.reshape(.75);
  whole.advance(17655);
  for (let i = 0; i < 176; i++) divided.advance(100);
  divided.advance(55);
  assert.deepEqual(divided.snapshot(), whole.snapshot());
});

test('bonds have distinct root endpoints, finite lifetimes, degree and population bounds', () => {
  assert(sample().states.some(state => state.bonds.length > 0));
  for (const state of sample().states) {
    const ids = new Set(roots(state).map(node => node.id)), pairs = new Set(), degree = new Map();
    assert(state.bonds.length <= state.counts.roots * 2);
    assert.equal(state.counts.bondsFormed - state.counts.bondsReleased, state.bonds.length);
    for (const bond of state.bonds) {
      assert(ids.has(bond.source) && ids.has(bond.target)); assert.notEqual(bond.source, bond.target);
      const pair = [bond.source, bond.target].sort().join('|'); assert(!pairs.has(pair)); pairs.add(pair);
      for (const id of [bond.source, bond.target]) degree.set(id, (degree.get(id) || 0) + 1);
      assert(bond.bornAt <= state.modelMs && bond.expiresAt > state.modelMs);
      assert(Number.isFinite(bond.restLength) && bond.restLength > 0);
      assert(['ARCH', 'LATTICE'].includes(bond.mode));
    }
    assert([...degree.values()].every(value => value <= 3));
  }
});

test('observed bond releases reference prior formation and lifetime releases meet their deadline', () => {
  const formed = new Map(), released = new Set(); let lifetime = 0;
  for (const event of sample().events) {
    if (event.type === 'BOND_FORM') { assert(!formed.has(event.id)); formed.set(event.id, event); }
    if (event.type === 'BOND_RELEASE') {
      const original = formed.get(event.id); assert(original); assert(!released.has(event.id));
      assert(event.modelMs >= original.modelMs); assert(['LIFETIME', 'SEPARATION'].includes(event.reason));
      if (event.reason === 'LIFETIME') { lifetime++; assert(event.modelMs >= original.expiresAt); assert(event.modelMs - original.expiresAt < live.LIMITS.stepMs); }
      released.add(event.id);
    }
  }
  assert(formed.size > 0 && released.size > 0 && lifetime > 0);
  const last = sample().states.at(-1);
  assert.equal(last.counts.bondsFormed, formed.size); assert.equal(last.counts.bondsReleased, released.size);
  assert(last.bonds.every(bond => !released.has(bond.id)));
});

test('assemblies describe the current bond graph and current member geometry on every sampled tick', () => {
  for (const state of sample().states) checkAssemblies(state);
});

test('reshape refreshes assembly geometry with the same model time', () => {
  const engine = create(); engine.reshape(.25); engine.advance(10000);
  assert(engine.snapshot().assemblies.length > 0);
  const time = engine.snapshot().modelMs; engine.reshape(4);
  const reshaped = engine.snapshot(); assert.equal(reshaped.modelMs, time);
  checkAssemblies(reshaped);
});

test('shared habitat deposits, changes over time and provides position-bound nonconstant sensor traces', () => {
  const engine = create(); assert(engine.snapshot().habitat.values.every(value => value === 0));
  engine.advance(250); const first = engine.snapshot();
  assert.equal(first.habitat.policy, 'DECAYING_SHARED_TRACE');
  assert(first.habitat.values.some(value => value > 0));
  engine.advance(250); assert.notDeepEqual(engine.snapshot().habitat.values, first.habitat.values);
  let nonzeroGradient = false, variedTrace = false;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  for (const state of sample().states) {
    const h = state.habitat;
    assert.equal(h.columns, 32); assert.equal(h.rows, 20); assert.equal(h.values.length, 640);
    assert.equal(h.revision, Math.floor(state.tick / 5));
    assert(h.values.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    variedTrace ||= new Set(roots(state).map(node => node.sensors.trace)).size > 1;
    for (const node of roots(state)) {
      const x = clamp(Math.floor((node.position.x / state.world.width + .5) * h.columns), 1, h.columns - 2);
      const y = clamp(Math.floor((node.position.y / state.world.height + .5) * h.rows), 1, h.rows - 2);
      const i = y * h.columns + x;
      close(node.sensors.trace, h.values[i], 'trace is bound to current position');
      close(node.sensors.traceDx, (h.values[i + 1] - h.values[i - 1]) * h.columns / state.world.width);
      close(node.sensors.traceDy, (h.values[i + h.columns] - h.values[i - h.columns]) * h.rows / state.world.height);
      assert.equal(node.sensors.observedAt, state.modelMs);
      nonzeroGradient ||= Math.abs(node.sensors.traceDx) + Math.abs(node.sensors.traceDy) > 1e-6;
    }
  }
  assert(nonzeroGradient && variedTrace);
});

test('render projection is detached through morphology, habitat, bonds and assembly members', () => {
  const engine = sample().engine, before = engine.snapshot(), render = engine.snapshot('render');
  assert(render.bonds.length > 0 && render.assemblies.length > 0);
  assert.equal(render.coverage.history, 'OMITTED_FROM_RENDER_PROJECTION');
  assert.equal(render.events.length, 0);
  assert(render.nodes.every(node => !('inbox' in node) && !('role' in node) && !('memory' in node)));
  render.habitat.values.fill(-100); render.habitat.columns = 1;
  render.bonds[0].source = 'mutated'; render.bonds.push({ id: 'extra' });
  render.assemblies[0].members.push('mutated'); render.assemblies[0].center.x = Infinity;
  render.nodes[0].morphology.form = 'mutated'; render.nodes[0].body.radius = -1;
  render.nodes[0].sensors.trace = -1; render.nodes[0].position.x = Infinity;
  render.counts.channelTransitions.CONTACT = -1; render.world.width = -1;
  assert.deepEqual(engine.snapshot(), before);
  const full = engine.snapshot(); full.habitat.values[0] = -1; full.nodes[0].morphology.scale = -1;
  assert.deepEqual(engine.snapshot(), before);
});

test('advance returns only detached model timing and partial frames do not advance morphology', () => {
  const engine = create(); const before = engine.snapshot(), timing = engine.advance(17);
  assert.deepEqual(timing, { tick: 0, modelMs: 0, remainderMs: 17 });
  assert.deepEqual(engine.snapshot().nodes, before.nodes);
  assert.equal(engine.snapshot().habitat.revision, 0);
  timing.tick = -1; assert.equal(engine.snapshot().tick, 0);
  const completed = engine.advance(33);
  assert.deepEqual(completed, { tick: 1, modelMs: 50, remainderMs: 0 });
});
