'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'forschung', 'singularity-cannon', 'index.html'), 'utf8');

test('singularity cannon keeps its primary action visible while secondary controls start collapsed', () => {
  const fire = html.indexOf('id=\"fire\"');
  const details = html.indexOf('id=\"hud-details\" class=\"hud-details\" hidden');
  assert.ok(fire >= 0);
  assert.ok(details > fire, 'the fire button must remain outside collapsed secondary controls');
  assert.match(html, /id=\"hud-toggle\"[^>]*aria-controls=\"hud-details\"[^>]*aria-expanded=\"false\"/);
  assert.match(html, /function setHudExpanded\(expanded\)/);
  assert.match(html, /setHudExpanded\(false\)/);
  assert.match(html, /<details class=\"legend field-reactive\">/);
});
