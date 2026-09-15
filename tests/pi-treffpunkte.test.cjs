'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const pageDir = path.join(root, 'forschung', 'pi-treffpunkte');
const modelBytes = fs.readFileSync(path.join(pageDir, 'data', 'public-model.json'));
const model = JSON.parse(modelBytes);
const html = fs.readFileSync(path.join(pageDir, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(pageDir, 'pi.js'), 'utf8');
const style = fs.readFileSync(path.join(pageDir, 'pi.css'), 'utf8');

test('Scarlet consumes the byte-bound public canonical model only', () => {
  assert.equal(crypto.createHash('sha256').update(modelBytes).digest('hex').toUpperCase(), '8DCDCAA984074D87D7BA7167E00153E2CAFE17B46441BCB02929E23916051E98');
  assert.equal(model.schema, 'geometry-model.v1');
  assert.equal(model.source.classification, 'PUBLIC_ROUNDED');
  assert.equal(model.source.locality, 'Brühl-Vochem');
  assert.equal(model.source.precisionDecimals, 2);
  assert.equal(model.publicProjection.exactLocationRetained, false);
  assert.equal(model.publicProjection.locationCodeRetained, false);
  assert.equal(model.publicProjection.privateSourcePathsRetained, false);
});

test('P/Z/E/A and antipodal path representations retain their contracts', () => {
  assert.deepEqual(Object.keys(model.points), ['P', 'Z', 'E', 'A']);
  assert.equal(new Set(Object.values(model.points).map(point => `${point.latitude},${point.longitude}`)).size, 4);
  assert.equal(model.paths.surface.centralAngleRadians, Math.PI);
  assert.equal(model.paths.chord.lengthMeters, 2 * model.earthModel.radiusMeters);
  assert.equal(model.paths.surface.lengthMeters, Math.PI * model.earthModel.radiusMeters);
  assert.equal(model.paths.chord.passesThroughSphereCenter, true);
  assert.equal(4 * 3 / 2, 6);
});

test('interactive controls keep three referents and two path views separate', () => {
  for (const value of ['surface', 'chord', 'wrap', 'short']) assert(html.includes(`data-view="${value}"`), value);
  for (const value of ['P', 'Z', 'E', 'A']) assert(html.includes(`data-operator="${value}"`), value);
  for (const value of ['PHYSICAL_EARTH', 'WORLD_WRAP_REPETITION', 'SHORT_CODE_PREFIX_AMBIGUITY']) assert(html.includes(value), value);
  assert(html.includes('πR · Oberfläche'));
  assert(html.includes('2R · Sehne'));
  assert(script.includes("crypto.subtle.digest('SHA-256', bytes)"));
  assert(style.includes('@media(prefers-reduced-motion:reduce)'));
});

test('public adapter excludes the private source surface', () => {
  const publicText = [html, script, style, modelBytes.toString('utf8')].join('\n');
  assert.equal(/\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/.test(publicText), false, 'no full or shortened location code');
  assert.equal(/[A-Za-z]:\\/.test(publicText), false, 'no absolute Windows path');
  assert.equal(/(?:^|[\\/])Users[\\/]/i.test(publicText), false, 'no user-profile path');
  assert.equal(/Screenshot\s+\d{4}-\d{2}-\d{2}/i.test(publicText), false, 'no timestamped source-image name');
  const binarySourceCopies = fs.readdirSync(pageDir, { recursive: true })
    .filter((name) => /\.(?:bmp|gif|jpe?g|png|tiff?)$/i.test(String(name)));
  assert.deepEqual(binarySourceCopies, []);
});
