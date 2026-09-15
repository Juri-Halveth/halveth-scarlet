const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('context prism is featured and keeps the four referents separated', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'universe-data.js'), 'utf8');
  const window = {};
  vm.runInNewContext(source, {window});
  const universe = window.HalvethUniverse;
  const prism = universe.entities.find((entity) => entity.id === 'context-prism');
  assert.ok(prism);
  assert.ok(universe.featured.includes('context-prism'));
  assert.equal(prism.localDialog, true);
  assert.match(prism.note, /Diagnosemarker/u);
  assert.match(prism.note, /eigene Knoten/u);
  assert.match(prism.en.note, /separate nodes/u);
});

test('context page exposes bilingual source and claim boundaries', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'forschung', 'usdai-sabr-kontext', 'index.html'), 'utf8');
  assert.match(html, /YouTube · USDAI/u);
  assert.match(html, /YouTube · SABR/u);
  assert.match(html, /SABR · Derivate/u);
  assert.match(html, /USD\.AI · USDai \/ sUSDai/u);
  assert.match(html, /data-lang="en"/u);
  assert.match(html, /Player observer/u);
  assert.match(html, /Term router/u);
  assert.match(html, /developers\.google\.com\/ad-manager\/dynamic-ad-insertion/u);
  assert.match(html, /Claim ceiling/u);
});
