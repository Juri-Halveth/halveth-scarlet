import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { createRoom, validateInput, PROFILES, MAX_MODEL_MS } from '../assets/capability-room-model.mjs';
const require = createRequire(import.meta.url);
const core = require('../forschung/weltkeimwerk/core.js');
const living = require('../forschung/weltkeimwerk/live-core.js');
const create = (options = {}) => createRoom({ core, living, text: 'Quelle 🥚', label: 'Keim', seed: 555, runId: 'ROOM_TEST', clock: () => '2026-10-24T15:00:00.000Z', ...options });

test('the entry executes the existing state kernel and preserves exact input', async () => {
  const room = await create();
  assert.equal(room.view().counts.events, 2);
  assert.equal(room.selected().text, 'Quelle 🥚');
  assert.equal(room.selected().phase, 'MATERIALIZED');
  assert.equal((await room.verify()).valid, true);
});

test('a new variant retains the parent, exact content and a bound derivation', async () => {
  const room = await create(), original = room.selected();
  await room.branch('Andere Fassung <script>kein ausführbarer Code</script>');
  const view = room.view();
  assert.equal(view.counts.states, 2);
  assert.equal(view.states[0].text, original.text);
  assert.equal(view.states[0].digest, original.digest);
  assert.equal(room.selected().text, 'Andere Fassung <script>kein ausführbarer Code</script>');
  assert.equal(view.relations[0].leftEndpoint.id, original.id);
  assert.equal(view.relations[0].rightEndpoint.id, room.selected().id);
  assert.equal((await room.verify()).valid, true);
});

test('unchanged and invalid variants are rejected before a ledger event', async () => {
  const room = await create(), before = room.export().contentLedger;
  await assert.rejects(room.branch(room.selected().text), /REQUIRES_CHANGE/);
  await assert.rejects(room.branch(''), /INVALID_SEED_TEXT/);
  assert.deepEqual(room.export().contentLedger, before);
});

test('observations and snapshots have distinct records and survive exact replay', async () => {
  const room = await create();
  await room.observe(); await room.snapshot();
  assert.equal(room.view().counts.observations, 1);
  assert.equal(room.view().counts.snapshots, 1);
  assert.equal(room.view().snapshots[0].prefixLength, 3);
  assert.equal((await room.verify()).events, 4);
});

test('same simulation seed and step duration reproduce ecology across text inputs', async () => {
  const a = await create(), b = await create({ text: 'Anderer Text' });
  a.advance(10000); b.advance(5000); b.advance(5000);
  assert.deepEqual(a.ecology('full'), b.ecology('full'));
  assert.equal(a.ecology().counts.sourceProfiles, PROFILES.length);
  assert.equal(a.ecology().counts.roots, 16);
});

test('automatic model transitions do not silently author text or mutate its ledger', async () => {
  const room = await create(), content = room.export().contentLedger;
  room.advance(60000);
  assert.ok(room.ecology().counts.transitions > 0);
  assert.deepEqual(room.export().contentLedger, content);
});

test('simulation reaches a finite time limit and records display gaps separately', async () => {
  const room = await create();
  for (let i = 0; i < 8; i++) room.advance(60000);
  assert.equal(room.ecology().modelMs, MAX_MODEL_MS);
  room.gap(2300);
  assert.equal(room.ecology().modelMs, MAX_MODEL_MS);
  assert.equal(room.ecology().timing.displayGapMs, 2300);
  assert.ok(room.ecology('full').events.length <= living.LIMITS.events);
});

test('text state capacity stops a new branch without a partially added event', async () => {
  const room = await create();
  for (let i = 1; i < core.LIMITS.maxStates; i++) await room.branch('Variante ' + i);
  const before = room.export().contentLedger;
  await assert.rejects(room.branch('Noch eine Variante'), /ROOM_CAPACITY/);
  assert.deepEqual(room.export().contentLedger, before);
});

test('an exported packet separates executed text operations from simulated ecology', async () => {
  const room = await create(); room.advance(1000);
  const packet = JSON.parse(JSON.stringify(room.export()));
  assert.equal(packet.execution.externalActions, 'NONE');
  assert.equal(packet.execution.generatedProgram, 'NONE');
  assert.equal(packet.ecology.model, 'LOCAL_MOVING_CELL_ECOLOGY');
  assert.equal(packet.verificationScope, 'CONTENT_LEDGER_REPLAY_AND_SELF_CONSISTENCY');
  assert.equal((await core.verify(packet.contentLedger)).valid, true);
  packet.contentLedger.events[0].command.text = 'Manipuliert';
  await assert.rejects(core.verify(packet.contentLedger), /MISMATCH/);
});

test('invalid input is not silently truncated or given a replacement seed', () => {
  for (const seed of [0, -1, 1.5, NaN, 0x100000000, '555']) assert.throws(() => validateInput('x', 'x', seed), /INVALID_MODEL_SEED/);
  for (const text of ['', ' ', '\ud800', '😀'.repeat(385)]) assert.throws(() => validateInput(text, 'x', 555), /INVALID_SEED_TEXT/);
});

test('the public entry replaces the game shell and confines execution to local code', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /assets\/capability-room\.mjs/);
  assert.match(html, /forschung\/weltkeimwerk\/core\.js/);
  assert.doesNotMatch(html, /assets\/(?:portal-shell|events|universe|hash-bloom)\.(?:js|css)/);
  assert.doesNotMatch(html, /SPIELCOUNTDOWN|PORTAL CHESS|16\/16|data-figure=/);
  assert.match(html, /id="event-trace"/);
  assert.match(html, /id="export"/);
});
