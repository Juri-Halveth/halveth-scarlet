const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const dir = path.join(__dirname, '../forschung/ashbound/play');
const core = () => import(pathToFileURL(path.join(dir, 'game-core.mjs')).href);

test('three distinct abilities solve the in-world gate in order', async () => {
  const { freshGame, cast, progress, canCross, cross } = await core();
  let state = freshGame();
  assert.equal(progress(state), 0);
  assert.equal(canCross(state), false);
  assert.equal(cross(state).ok, false);
  let result = cast(state, 'pulse', 'veil', 1000);
  assert.equal(result.ok, false);
  assert.deepEqual(result.state.seals, [false, false, false]);
  result = cast(state, 'pulse', 'hour', 1000);
  assert.equal(result.ok, false);
  state = cast(state, 'pulse', 'ember', 1000).state;
  state = cast(state, 'echo', null, 1100).state;
  state = cast(state, 'pulse', 'veil', 1200).state;
  assert.equal(progress(state), 2);
  state = cast(state, 'still', null, 1300).state;
  assert.equal(cast(state, 'pulse', 'hour', 8300).ok, false, 'the ward resumes after seven seconds');
  state = cast(state, 'pulse', 'hour', 2000).state;
  assert.equal(progress(state), 3);
  assert.equal(canCross(state), true);
  state = cross(state).state;
  assert.equal(state.completed, true);
});

test('save validation preserves game state but drops transient ward and rejects malformed input', async () => {
  const { freshGame, loadGame } = await core();
  const state = { ...freshGame(), x: 4, z: -11, seals: [true, false, true], revealed: true, wardUntil: 9000, extra: 'ignored' };
  const restored = loadGame(state);
  assert.deepEqual(restored.seals, [true, false, true]);
  assert.equal(restored.wardUntil, 0);
  assert.equal(restored.extra, undefined);
  assert.equal(restored.completed, false);
  for (const raw of [null, {}, { ...state, x: Infinity }, { ...state, seals: [true] }, { ...state, seals: [1, false, false] }, { ...state, x: 1000 }]) {
    assert.throws(() => loadGame(raw));
  }
});

test('attentive reading grants persistent abilities and a discoverable item', async () => {
  const { freshGame, studyBook, findRelic, maxMana, moveFactor, stillDuration, loadGame } = await core();
  let state = freshGame();
  assert.equal(studyBook(state, 0, 2).ok, false);
  assert.equal(maxMana(state), 100);
  state = studyBook(state, 0, 0).state;
  assert.equal(maxMana(state), 600);
  assert.equal(state.mana, 600);
  state = studyBook(state, 1, 1).state;
  assert.equal(moveFactor(state), 1.35);
  assert.equal(findRelic(state).ok, false);
  state = studyBook(state, 2, 2).state;
  state = findRelic(state).state;
  assert.equal(stillDuration(state), 12000);
  assert.equal(stillDuration(loadGame(JSON.parse(JSON.stringify(state)))), 12000);
});

test('the published prologue has local assets and an interactive prototype entry point', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(dir, 'game.mjs'), 'utf8');
  const desktop = fs.readFileSync(path.join(__dirname, '../desktop/ashbound/main.cjs'), 'utf8');
  assert.match(html, /id="start-button"/);
  assert.match(html, /id="stage"/);
  assert.match(game, /new T\.WebGLRenderer/);
  assert.match(game, /requestPointerLock/);
  assert.match(game, /function collide/);
  assert.match(desktop, /ashbound\/play\//);
  assert.doesNotMatch(html, /<script[^>]+src="https:/);
});

test('Stille keeps its visual field centred on the moving player until it expires', async () => {
  const originalDocument = global.document;
  global.document = { createElement: () => ({ getContext: () => ({
    createRadialGradient: () => ({ addColorStop() {} }), fillRect() {},
  }) }) };
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
    copy(other) { return this.set(other.x, other.y, other.z); }
  }
  class Object3 {
    constructor() {
      this.position = new Vector3();
      this.scale = { setScalar() {} };
      this.rotation = { z: 0, set() {} };
    }
  }
  class Resource { dispose() {} }
  class Mesh extends Object3 {
    constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); }
  }
  class PointLight extends Object3 {}
  const T = { CanvasTexture: Resource, SphereGeometry: Resource, RingGeometry: Resource,
    MeshBasicMaterial: Resource, Mesh, PointLight, AdditiveBlending: 1, BackSide: 1, DoubleSide: 2 };
  const objects = [];
  const scene = { add(object) { objects.push(object); }, remove(object) { objects.splice(objects.indexOf(object), 1); } };
  const player = { x: 1, z: 2 };
  try {
    const { createSpellVfx } = await import(pathToFileURL(path.join(dir, 'spell-vfx.mjs')).href);
    const vfx = createSpellVfx({ T, scene, camera: {}, reducedMotion: false, playerPosition: () => player });
    vfx.still({ x: 1, z: 2 }, 100, 1100);
    assert.equal(objects.length, 5);
    player.x = 7; player.z = -4;
    vfx.tick(400);
    for (const object of objects) assert.deepEqual(object.position, new Vector3(7, 1.7, -4));
    vfx.tick(1100);
    assert.equal(objects.length, 0);
    vfx.dispose();
  } finally {
    global.document = originalDocument;
  }
});

test('invalid prologue saves retain their exact raw text before a fresh game starts', async () => {
  const { GAME_SAVE_KEY, freshGame } = await core();
  const { restoreGame } = await import(pathToFileURL(path.join(dir, 'save-recovery.mjs')).href);
  const values = new Map([[GAME_SAVE_KEY, '{"schema":"ashbound.first-person.v1",broken']]);
  const storage = { getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); } };
  const restored = restoreGame(storage, () => 12345);
  assert.deepEqual(restored.game, freshGame());
  assert.equal(restored.recovery.raw, values.get(GAME_SAVE_KEY));
  assert.equal(values.get(restored.recovery.backupKey), restored.recovery.raw);
  assert.equal(restored.saveProtected, false);
  assert.notEqual(restored.recovery.backupKey, GAME_SAVE_KEY);

  const fresh = restoreGame({ getItem() { return null; }, setItem() { throw new Error('unexpected write'); } });
  assert.deepEqual(fresh.game, freshGame());
  assert.equal(fresh.recovery, null);
  assert.equal(fresh.saveProtected, false);
});

test('a failed backup leaves the original save key protected from replacement', async () => {
  const { GAME_SAVE_KEY, freshGame } = await core();
  const { restoreGame } = await import(pathToFileURL(path.join(dir, 'save-recovery.mjs')).href);
  const raw = '{damaged';
  const storage = { getItem(key) { return key === GAME_SAVE_KEY ? raw : null; },
    setItem() { throw new Error('quota exceeded'); } };
  const result = restoreGame(storage, () => 12345);
  assert.deepEqual(result.game, freshGame());
  assert.equal(result.recovery.raw, raw);
  assert.equal(result.recovery.backupKey, null);
  assert.equal(result.saveProtected, true);
  assert.equal(storage.getItem(GAME_SAVE_KEY), raw);

  const validStorage = { getItem(key) { return key === GAME_SAVE_KEY ? JSON.stringify({ ...freshGame(), x: 4 }) : null; },
    setItem() { throw new Error('unexpected backup write'); } };
  const valid = restoreGame(validStorage);
  assert.equal(valid.game.x, 4);
  assert.equal(valid.recovery, null);
  assert.equal(valid.saveProtected, false);
});

test('prologue writes require a matching storage readback and report failed writes', async () => {
  const { GAME_SAVE_KEY, freshGame } = await core();
  const { writeGameSave } = await import(pathToFileURL(path.join(dir, 'save-recovery.mjs')).href);
  const game = { ...freshGame(), x: 4 };
  const values = new Map();
  const writable = { getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); } };
  assert.equal(writeGameSave(writable, game), true);
  assert.equal(JSON.parse(values.get(GAME_SAVE_KEY)).x, 4);
  assert.equal(writeGameSave({ getItem() { return null; }, setItem() {} }, game), false, 'a silent no-op is not a verified save');
  assert.equal(writeGameSave({ getItem() { return null; }, setItem() { throw new Error('quota'); } }, game), false);
  assert.equal(writeGameSave({ getItem() { throw new Error('unreadable'); }, setItem() {} }, game), false);
});
