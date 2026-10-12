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

test('the published prologue has local assets and an actual playable entry point', () => {
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
