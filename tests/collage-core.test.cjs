const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const core = require(path.join(root, 'assets', 'collage-core.js'));

test('cover crop preserves the target ratio and centres the discarded axis', () => {
  assert.deepEqual(core.coverCrop(1600, 900, 500, 500), {sx: 350, sy: 0, sw: 900, sh: 900});
  assert.deepEqual(core.coverCrop(900, 1600, 1600, 900), {sx: 0, sy: 546.875, sw: 900, sh: 506.25});
});

test('every layout returns one finite positive frame for each supported image', () => {
  for (const preset of core.PRESETS) {
    for (let count = 1; count <= 8; count += 1) {
      const frames = core.layoutFrames(count, preset, 1200, 1200);
      assert.equal(frames.length, count, `${preset}/${count}`);
      for (const frame of frames) {
        for (const key of ['x', 'y', 'width', 'height', 'rotation']) assert(Number.isFinite(frame[key]), `${preset}/${count}/${key}`);
        assert(frame.width > 0 && frame.height > 0, `${preset}/${count}/size`);
      }
    }
  }
  assert.deepEqual(core.layoutFrames(0, 'portal', 1200, 1200), []);
  assert.equal(core.layoutFrames(99, 'unknown', 1200, 1200).length, 8);
});

test('caption, lane and file rules keep the local interface bounded', () => {
  assert.equal(core.normalizeCaption('  Meine   Wahl.  '), 'Meine Wahl.');
  assert.equal(core.normalizeCaption('x'.repeat(80)).length, 48);
  assert.equal(core.cycleLane('mine'), 'ask');
  assert.equal(core.cycleLane('ask'), 'no');
  assert.equal(core.cycleLane('no'), 'mine');
  assert.equal(core.fileAllowed({type: 'image/webp', size: 42}), true);
  assert.equal(core.fileAllowed({type: 'image/svg+xml', size: 42}), false);
  assert.equal(core.fileAllowed({type: 'image/png', size: 16 * 1024 * 1024}), false);
});

test('published collage page stays local and exposes both language routes and release receipts', () => {
  const html = fs.readFileSync(path.join(root, 'collage', 'index.html'), 'utf8');
  assert(html.includes("connect-src 'none'"));
  assert(html.includes("form-action 'none'"));
  assert(html.includes('id="atelier-files"'));
  assert(html.includes('id="atelier-download"'));
  assert(html.includes('PINTEREST-RESEARCH.md'));
  assert(html.includes('sources.json'));
  assert(html.includes('HALVETH-Choice-Atelier-1.0.0.torrent'));
  assert(!html.includes('http://'));
});

test('published release links, bytes, receipt and embedded magnet form one contract', () => {
  const html = fs.readFileSync(path.join(root, 'collage', 'index.html'), 'utf8');
  const releaseDir = path.join(root, 'releases', 'choice-atelier-v1.0.0');
  const receiptName = 'HALVETH-Choice-Atelier-1.0.0.receipt.json';
  const receipt = JSON.parse(fs.readFileSync(path.join(releaseDir, receiptName), 'utf8'));
  const artifactKeys = ['zip', 'torrent', 'magnet'];

  for (const key of artifactKeys) {
    const artifact = receipt.artifacts[key];
    const bytes = fs.readFileSync(path.join(releaseDir, artifact.filename));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), artifact.sha256, key);
  }

  assert(html.includes(receipt.artifacts.zip.filename));
  assert(html.includes(receipt.artifacts.torrent.filename));
  assert(html.includes(receiptName));
  assert(!html.includes('MAGNET_PENDING_BUILD'));

  const magnetMatch = html.match(/<code id="magnet-value"[^>]*>([^<]+)<\/code>/);
  assert(magnetMatch, 'embedded magnet');
  const embeddedMagnet = magnetMatch[1].replaceAll('&amp;', '&');
  const magnetFile = fs.readFileSync(path.join(releaseDir, receipt.artifacts.magnet.filename), 'utf8').trim();
  assert.equal(embeddedMagnet, receipt.artifacts.magnet.uri);
  assert.equal(magnetFile, receipt.artifacts.magnet.uri);
  assert(embeddedMagnet.includes(receipt.artifacts.torrent.infohash_sha1));
});
