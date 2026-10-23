const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const build = path.join(__dirname, '..', '.site-build', 'forschung', 'juri-thesis');

test('public JURI-THESIS pages version their local CSS and JS by published bytes', {
  skip: !fs.existsSync(path.join(build, 'bruehl-atlas.html'))
}, () => {
  for (const page of ['bruehl-atlas.html', 'wirtschaftslabor.html', 'wirkungswege.html']) {
    const html = fs.readFileSync(path.join(build, page), 'utf8');
    const assets = [...html.matchAll(/(?:src|href)="([^"?:]+\.(?:css|js))(?:\?v=([a-f0-9]+))?"/g)];
    assert.ok(assets.length > 0, `${page}: no local styles or scripts found`);
    for (const [, asset, version] of assets) {
      const bytes = fs.readFileSync(path.resolve(build, asset));
      const digest = createHash('sha256').update(bytes).digest('hex');
      assert.equal(version, digest, `${page}: ${asset} has stale cache key`);
    }
  }
});

test('versioned module entries import the matching model bytes', {
  skip: !fs.existsSync(path.join(build, 'wirtschaftslabor.js'))
}, () => {
  for (const [entry, model] of [
    ['wirtschaftslabor.js', 'wirtschaftslabor-model.mjs'],
    ['wirkungswege.js', 'wirkungswege-model.mjs']
  ]) {
    const entryText = fs.readFileSync(path.join(build, entry), 'utf8');
    const digest = createHash('sha256').update(fs.readFileSync(path.join(build, model))).digest('hex');
    assert.ok(entryText.includes(`'./${model}?v=${digest}'`), `${entry}: ${model} has stale import key`);
  }
});
