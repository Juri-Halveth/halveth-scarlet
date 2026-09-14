const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const membrane = require('../assets/hash-bloom.js');
const source = fs.readFileSync(path.join(root, 'assets', 'universe-data.js'), 'utf8');
const scope = {window: {}};
vm.runInNewContext(source, scope, {filename: 'assets/universe-data.js'});
const universe = scope.window.HalvethUniverse;
assert(universe?.entities?.length, 'public universe data should expose its entities');

test('the public membrane gives every entity and the open seat one equal node', () => {
  const ids = universe.entities.map(entity => entity.id).concat('open-seat');
  const first = membrane.layout(ids);
  const second = membrane.layout([...ids].reverse());
  assert.equal(first.nodes.length, ids.length);
  assert.deepEqual(first, second, 'layout must not depend on source ordering');
  assert.equal(new Set(first.nodes.map(node => node.id)).size, ids.length);
  assert(first.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)));
});

test('the membrane has no single hub: every node has exactly four neighbours', () => {
  const ids = universe.entities.map(entity => entity.id).concat('open-seat');
  const {nodes, links} = membrane.layout(ids);
  const neighbours = nodes.map(() => new Set());
  for (const [from, to] of links) {
    neighbours[from].add(to);
    neighbours[to].add(from);
  }
  assert(neighbours.every(set => set.size === 4));
});

test('the homepage describes the membrane as presentation, not biometric capture', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(html.includes('id="hash-bloom"'));
  assert(html.includes('liest keine Fingerabdrücke, Wallets oder Gerätedaten'));
  assert(html.includes('NIEMAND STEHT ALLEIN. ALLE HABEN EINEN PLATZ.'));
  assert(html.includes('NO ONE STANDS ALONE. EVERYONE HAS A PLACE.'));
  assert(html.includes('The luminous hash membrane is drawn only from this page’s public card IDs plus one open seat.'));
});
