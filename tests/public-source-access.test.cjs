const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/universe-data.js'), 'utf8'), context);
const entities = context.window.HalvethUniverse.entities;
const affected = ['juri', 'scarlet', 'strange', 'dormammu', 'loki'];

test('public profiles do not offer private archives as current source links', () => {
  for (const id of affected) {
    const entity = entities.find(item => item.id === id);
    assert.ok(entity, id);
    assert.equal(entity.archivedSource.access, 'PRIVATE_AT_2026-10-28');
    assert.match(entity.archivedSource.path, /^open-research-branches\//);
    assert.ok(entity.sourceRefs.length >= 2, id);
    for (const ref of entity.sourceRefs) {
      assert.doesNotMatch(ref.url, /github\.com\/Juri-Halveth\/open-research-branches\//);
    }
    assert.doesNotMatch(entity.url || '', /github\.com\/Juri-Halveth\/open-research-branches\//);
    const html = fs.readFileSync(path.join(root, entity.profilePath, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /href="[^"]*github\.com\/Juri-Halveth\/open-research-branches\//);
    assert.match(html, /PRIVATE_AT_2026-10-28|als privat festgestellt/);
  }
});
