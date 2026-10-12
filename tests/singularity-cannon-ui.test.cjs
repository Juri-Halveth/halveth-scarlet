'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'forschung', 'singularity-cannon', 'index.html'), 'utf8');

test('singularity cannon keeps desktop controls separate while mobile is a direct-touch field', () => {
  const fire = html.indexOf('id="fire"');
  const details = html.indexOf('id="hud-details" class="hud-details" hidden');
  assert.ok(fire >= 0);
  assert.ok(details > fire, 'desktop secondary controls stay behind the compact HUD action');
  assert.match(html, /id="hud-toggle"[^>]*aria-controls="hud-details"[^>]*aria-expanded="false"/);
  assert.match(html, /function setHudExpanded\(expanded\)/);
  assert.match(html, /setHudExpanded\(false\)/);
  assert.match(html, /<details class="legend field-reactive">/);
  assert.match(html, /<body class="singularity-cannon-scene">/);
  assert.match(html, /\.top,\.legend,\.hud\{display:none!important\}/);
  assert.match(html, /body\.singularity-cannon-scene \.hub-navigation,\.portal-shell,\.portal-atmosphere,\.portal-skip\{display:none!important\}/);
  assert.match(html, /Auf Mobilgeräten direkt auf das Feld tippen/);
  assert.match(html, /canvas\.addEventListener\('pointerdown',e=>\{getPointer\(e\);fire\(\)\}\)/);
});
