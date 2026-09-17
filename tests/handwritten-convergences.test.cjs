const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'forschung', 'handschriftliche-konvergenzen', 'index.html'), 'utf8');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'forschung', 'handschriftliche-konvergenzen', 'sources.json'), 'utf8'));

test('handwritten convergence page keeps source, model and claim distinct', () => {
  assert.match(page, /SOURCE_BOUND/);
  assert.match(page, /CLAIM_CEILING_ENFORCED/);
  assert.match(page, /Prophetie, externe Informationsquelle/);
  assert.match(page, /prophecy, an external information source/);
  assert.match(page, /STERILE A/);
  assert.match(page, /Hela × Ultron: Liebespaar/);
  assert.equal(sources.fictionBranch.status, 'USER_AUTHORED_FICTION');
  assert.equal(sources.fictionBranch.canonClaim, false);
  assert.deepEqual(sources.operators.members, ['P', 'H', 'V', 'R180']);
});

test('public research edition excludes private source material', () => {
  assert.doesNotMatch(page, /[A-Za-z]:\\/);
  assert.doesNotMatch(page, /file:\/\//i);
  assert.doesNotMatch(page, /\+\d{2}[\s-]?\d{3}/);
  assert.doesNotMatch(page, /\b\d{12,}\b/);
  assert.equal(page.includes('<img'), false);
  assert.ok(sources.excluded.includes('Data Matrix payloads'));
  assert.ok(sources.excluded.includes('patient data'));
});
