const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/universe-data.js'), 'utf8'), ctx);
const entities = ctx.window.HalvethUniverse.entities;
const load = file => import(pathToFileURL(path.join(root, 'assets', file)).href);

test('all 66 characters translate through the world rather than only changing an idle pose', async () => {
  const { createRoamingPaths, sampleRoamingPath } = await load('entity-world-motion.mjs');
  const routes = createRoamingPaths(entities);
  assert.equal(routes.length, 66);
  const positions = new Set();
  for (const route of routes) {
    const first = sampleRoamingPath(route, 0), later = sampleRoamingPath(route, 8);
    assert.ok(first.position.distanceTo(later.position) > 1, `${route.id}: actual translation`);
    positions.add(first.position.toArray().join(','));
    assert.equal(first.position.y, 0);
    assert.ok(Number.isFinite(first.heading));
  }
  assert.equal(positions.size, 66);
});

test('world time is reproducible in both directions and identity paths survive registry reordering', async () => {
  const { createRoamingPaths, sampleRoamingPath } = await load('entity-world-motion.mjs');
  const forward = createRoamingPaths(entities), reverse = createRoamingPaths([...entities].reverse());
  for (const route of forward) {
    const other = reverse.find(item => item.id === route.id);
    for (const time of [-1000, -30, -.01, 0, 21.99, 22, 24.99, 25, 50000]) {
      const a = sampleRoamingPath(route, time), b = sampleRoamingPath(other, time);
      assert.deepEqual(a.position.toArray(), b.position.toArray());
      assert.ok(a.position.toArray().every(Number.isFinite));
      assert.ok(Number.isFinite(a.phase));
    }
    const before = sampleRoamingPath(route, 17).position.toArray();
    sampleRoamingPath(route, 100);
    assert.deepEqual(sampleRoamingPath(route, 17).position.toArray(), before);
    assert.throws(() => sampleRoamingPath(route, NaN), /finite/);
    const stop = 22 - route.offset;
    assert.equal(sampleRoamingPath(route, stop + 1).walking, false);
    assert.ok(sampleRoamingPath(route, stop - .001).position.distanceTo(sampleRoamingPath(route, stop + .001).position) < .02);
  }
});

test('walking changes leg joints without rewriting figure placement or identity', async () => {
  const { THREE: T } = await load('entity-vendor/runtime.mjs');
  const { createEntityFigure } = await load('entity-figures.mjs');
  for (const entity of entities) {
    const figure = createEntityFigure(T, entity, 0);
    figure.group.position.set(3, 2, 7); figure.group.rotation.y = .6;
    const rootState = [figure.group.position.toArray(), figure.group.rotation.toArray(), figure.group.scale.toArray()];
    const pose = () => {
      const result = [];
      figure.group.traverse(node => { if (node.isGroup && node !== figure.group) result.push([...node.position.toArray(), ...node.rotation.toArray()]); });
      return result;
    };
    figure.animate(0, true, false, { walking: true, speed: 1, phase: 0 });
    const a = pose();
    figure.animate(0, true, false, { walking: true, speed: 1, phase: 1.2 });
    assert.notDeepEqual(pose(), a);
    assert.deepEqual([figure.group.position.toArray(), figure.group.rotation.toArray(), figure.group.scale.toArray()], rootState);
    figure.animate(100, true, true, { walking: true, speed: 1, phase: 9 });
    const still = pose();
    figure.animate(200, true, true, { walking: true, speed: 1, phase: 33 });
    assert.deepEqual(pose(), still);
    figure.dispose(); figure.dispose();
  }
});

test('environment streams distant sectors with a bounded active set and releases resources', async () => {
  const { THREE: T } = await load('entity-vendor/runtime.mjs');
  const { createWorldEnvironment } = await load('entity-world-environment.mjs');
  const env = createWorldEnvironment(T);
  let initial;
  for (const [x, z] of [[0,0], [300,-300], [-1500,5000], [96000,-96000], [0,0]]) {
    env.update(new T.Vector3(x, 0, z), 20);
    assert.ok(env.chunkCount > 0 && env.chunkCount <= 25);
    const counts = { meshes: 0, geometry: new Set(), materials: new Set() };
    env.group.traverse(node => {
      if (!node.isMesh) return;
      counts.meshes++; counts.geometry.add(node.geometry); counts.materials.add(node.material);
      assert.ok(node.position.toArray().every(Number.isFinite));
    });
    const shape = [counts.meshes, counts.geometry.size, counts.materials.size];
    if (!initial) initial = shape;
    assert.deepEqual(shape, initial);
  }
  env.dispose(); env.dispose();
});
