'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const live = require('../forschung/weltkeimwerk/live-core.js');
const root = path.join(__dirname, '..');
const registry = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/universe-data.js'), 'utf8'), registry);
const profiles = JSON.parse(JSON.stringify(registry.window.HalvethUniverse.entities));
const create = (list = profiles, seed = 123) => live.create(list, {seed});
const run = (engine, milliseconds) => { while (milliseconds > 0) { const part = Math.min(milliseconds, 60000); engine.advance(part); milliseconds -= part; } return engine.snapshot(); };

test('the automatic space starts immediately with real public profile IDs', () => {
  const snapshot = create().snapshot();
  assert.equal(snapshot.counts.sourceProfiles, 69);
  assert.equal(snapshot.counts.roots, 7);
  assert(snapshot.nodes.some(node => node.id === 'lucinet'));
  assert(snapshot.nodes.some(node => node.id === 'rachel'));
  for (const node of snapshot.nodes) assert(profiles.some(profile => profile.id === node.profileId && profile.role === node.role));
});
test('all 69 profiles enter automatically and inner cells retain exact ancestry', () => {
  const snapshot = run(create(), 180000);
  assert.equal(snapshot.counts.roots, profiles.length);
  assert(snapshot.counts.cells > profiles.length);
  assert.equal(new Set(snapshot.nodes.map(node => node.id)).size, snapshot.nodes.length);
  for (const child of snapshot.nodes.filter(node => node.depth)) {
    const parent = snapshot.nodes.find(node => node.id === child.parentId);
    assert(parent); assert.equal(child.depth, parent.depth + 1); assert.equal(child.profileId, parent.profileId);
    assert(parent.children.includes(child.id)); assert.equal(child.ancestry.parentId, parent.id);
    assert(child.ancestry.parentRevision >= 2); assert(child.bornAt >= parent.bornAt);
  }
});
test('signals actually change cores and membranes; they are not only moving particles', () => {
  const snapshot = run(create(profiles.slice(0, 3)), 15000);
  assert(snapshot.counts.transitions > 0); assert(snapshot.counts.emitted > 0);
  assert(snapshot.nodes.some(node => node.genome !== node.initialGenome && node.revision > 0));
  for (const node of snapshot.nodes) assert.equal(node.membrane.revisions, node.revision);
  const transition = snapshot.events.find(event => event.type === 'CORE_TRANSITION');
  assert(transition); assert.notEqual(transition.genome, transition.previousGenome);
  const phases = snapshot.events.filter(event => event.signalId === transition.signalId && event.subject === transition.subject);
  assert.deepEqual(phases.map(event => event.type), ['PORT_RECEIVE','MEMBRANE_TRANSFER','CORE_TRANSITION']);
  assert(phases[0].modelMs < phases[1].modelMs && phases[1].modelMs < phases[2].modelMs);
});
test('the same seed and time produce the same result across frame partitions', () => {
  const once = create(), framed = create(); once.advance(12000);
  for (let i = 0; i < 240; i++) { framed.advance(17); framed.advance(33); }
  assert.deepEqual(framed.snapshot(), once.snapshot());
});
test('different seeds change the model while profile identity remains the same', () => {
  const a = create(profiles, 1).snapshot(), b = create(profiles, 2).snapshot();
  assert.deepEqual(a.nodes.map(node => node.id), b.nodes.map(node => node.id));
  assert.notDeepEqual(a.nodes.map(node => node.genome), b.nodes.map(node => node.genome));
});
test('one virtual hour stays bounded and continues transitioning after full population', () => {
  const engine = create(), before = run(engine, 180000), after = run(engine, 3420000);
  assert(after.counts.transitions > before.counts.transitions + 1000);
  assert.equal(after.counts.roots, 69); assert(after.counts.cells <= 69 * 3);
  assert(after.nodes.some(node => node.depth === 2));
  assert(after.nodes.every(node => node.depth <= 2 && node.children.length <= 1 && node.inbox.length <= live.LIMITS.inbox));
  assert(after.signals.length <= live.LIMITS.signals); assert.equal(after.events.length, live.LIMITS.events);
  assert(after.coverage.firstSequence > 1); assert.equal(after.coverage.lastSequence - after.coverage.firstSequence + 1, after.events.length);
  assert.equal(after.modelMs, 3600000);
});
test('clock gaps remain gaps and do not fabricate hidden simulation steps', () => {
  const engine = create(); engine.advance(1200); const before = engine.snapshot();
  engine.gap(15000); const after = engine.snapshot();
  assert.equal(after.modelMs, before.modelMs); assert.deepEqual(after.nodes, before.nodes);
  assert.equal(after.timing.displayGapMs, 15000); assert.equal(after.events.at(-1).type, 'DISPLAY_GAP');
});
test('zero elapsed time is passive and invalid time fails without mutation', () => {
  const engine = create(), before = engine.snapshot(); engine.advance(0); assert.deepEqual(engine.snapshot(), before);
  for (const time of [-1, NaN, Infinity, '20', 60001]) { assert.throws(() => engine.advance(time)); assert.deepEqual(engine.snapshot(), before); }
  for (const time of [-1, NaN, Infinity]) { assert.throws(() => engine.gap(time)); assert.deepEqual(engine.snapshot(), before); }
});
test('sub-tick elapsed time is retained and snapshots cannot write back into the model', () => {
  const engine = create(); engine.advance(49); assert.equal(engine.snapshot().tick, 0); engine.advance(1); assert.equal(engine.snapshot().tick, 1);
  const external = engine.snapshot(); external.nodes[0].genome = -1; external.nodes.length = 0; external.limits.depth = 500;
  assert.equal(engine.snapshot().nodes.length, 7); assert.equal(engine.snapshot().limits.depth, 2);
});
test('invalid seeds, duplicate IDs, sparse input and malformed Unicode are rejected', () => {
  for (const seed of [0, -1, 1.2, Infinity, '1', 4294967296]) assert.throws(() => create(profiles, seed));
  assert.throws(() => create([])); assert.throws(() => create([profiles[0], profiles[0]])); assert.throws(() => create(Array(2)));
  assert.throws(() => create([{...profiles[0],id:'../x'}])); assert.throws(() => create([{...profiles[0],label:'\ud800'}]));
});
test('a single profile unfolds through explicitly addressed self signals', () => {
  const result = run(create(profiles.slice(0, 1)), 60000);
  assert.equal(result.counts.roots, 1); assert(result.counts.transitions > 0); assert(result.counts.cells >= 2);
  assert(result.events.some(event => event.type === 'SIGNAL_EMIT' && event.target === event.subject));
});
test('the main entry has no forms, imports, inspector, or start action and retains one pause', () => {
  const html = fs.readFileSync(path.join(root, 'forschung/weltkeimwerk/index.html'), 'utf8');
  assert(!/<(?:form|input|select|textarea|table|details)\b/i.test(html));
  assert.equal((html.match(/<button\b/g) || []).length, 1); assert(html.includes('id="pause"'));
  assert(html.includes('data-gstar-live="true"')); assert(html.includes('data-language-static'));
  assert(html.includes('live-core.js')); assert(html.includes('live.js')); assert(html.includes('universe-data.js'));
  assert(!html.includes('src="ui.js')); assert(!html.includes('id="demo"'));
  assert(fs.readFileSync(path.join(root,'forschung/weltkeimwerk/werkstatt.html'),'utf8').includes('id="demo"'));
});
test('the immersive page opts out of portal chrome before touching the DOM', () => {
  const document = { documentElement: { dataset: {gstarLive:'true'} } };
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/portal-shell.js'),'utf8'), {document});
});
