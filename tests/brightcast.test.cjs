const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const assetRoot = path.join(root, 'assets', 'brightcast');
const manifest = JSON.parse(fs.readFileSync(path.join(assetRoot, 'halveth-brightcast-001-manifest.json'), 'utf8'));

test('Brightcast master, captions and thumbnail match the published build manifest', () => {
  const required = [
    'halveth-brightcast-001-starlight-third-route-de-1080p.mp4',
    'halveth-brightcast-001-starlight-thumbnail.webp',
    'halveth-brightcast-001-starlight-de.vtt',
    'halveth-brightcast-001-starlight-en.vtt',
    'halveth-brightcast-001-starlight-de.srt',
    'halveth-brightcast-001-starlight-en.srt'
  ];
  const records = new Map(manifest.files.map((record) => [record.name, record]));
  for (const name of required) {
    const bytes = fs.readFileSync(path.join(assetRoot, name));
    assert.equal(bytes.length, records.get(name).bytes, name);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), records.get(name).sha256, name);
  }
});

test('Brightcast page keeps canon, counterfactual and publication state explicit', () => {
  const html = fs.readFileSync(path.join(root, 'forschung', 'brightcast-starlight', 'index.html'), 'utf8');
  assert.match(html, /SOURCE_BOUND/u);
  assert.match(html, /EXPLICIT_FAN_COUNTERFACTUAL/u);
  assert.match(html, /Beccas Aussage wird nicht umgeschrieben/u);
  assert.match(html, /keine gemeinsame Kanonwelt/u);
  assert.match(html, /kind="captions"/u);
  assert.doesNotMatch(html, /youtube\.com\/watch/u);
});
