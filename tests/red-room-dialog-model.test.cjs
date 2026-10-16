const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const model = import(pathToFileURL(resolve(__dirname, '../assets/red-room-dialog-model.mjs')).href);

test('two perspectives remain distinct from model observation and bridge options', async () => {
  const { dialogueAt } = await model;
  const d = dialogueAt('blocked', 2);
  assert.equal(d.speakers.length, 2);
  assert.notEqual(d.speakers[0].statement, d.speakers[1].statement);
  assert.match(d.zero.modelObservation, /3 Echos · 0 aktive Kopien/);
  assert.equal(d.bridges.length, 3);
  assert.match(d.zero.expression, /nicht beobachtet/);
});

test('same visible echoes do not collapse blocked and active model states', async () => {
  const { dialogueAt } = await model;
  const blocked = dialogueAt('blocked', 2);
  const active = dialogueAt('active', 2);
  assert.equal(blocked.speakers[1].evidence, active.speakers[1].evidence);
  assert.notEqual(blocked.zero.modelObservation, active.zero.modelObservation);
  assert.deepEqual(blocked.bridges, active.bridges);
});

test('English fixture preserves the same model quantities and scope', async () => {
  const { dialogueAt } = await model;
  const german = dialogueAt('active', 2, 'de');
  const english = dialogueAt('active', 2, 'en');
  assert.match(english.zero.modelObservation, /3 echoes · 3 active copies/);
  assert.equal(english.speakers.length, german.speakers.length);
  assert.equal(english.bridges.length, german.bridges.length);
  assert.match(english.zero.unresolved, /unknown/);
});

test('invalid synthetic inputs fail explicitly', async () => {
  const { dialogueAt } = await model;
  assert.throws(() => dialogueAt('missing', 2), RangeError);
  assert.throws(() => dialogueAt('blocked', -1), RangeError);
  assert.throws(() => dialogueAt('blocked', 2.5), RangeError);
  assert.throws(() => dialogueAt('blocked', 2, 'fr'), RangeError);
});
