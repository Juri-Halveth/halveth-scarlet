const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('the new workspace removes the game challenge and keeps games in the application guide', () => {
  const home = read('index.html');
  assert.doesNotMatch(home, /portal-chess-feature|home-chess-entry|SPIELCOUNTDOWN/);
  assert.match(home, /href="forschung\/wegweiser\/"/);
  assert.match(read('forschung/wegweiser/index.html'), /href="\.\.\/portal-chess\/"/);
});

test('Portal Chess exposes a replayable three-pawn milestone without presenting the open 16/16 challenge as solved', () => {
  const route = read('forschung/portal-chess/index.html');
  const core = read('forschung/portal-chess/portal-chess-core.mjs');
  const app = read('forschung/portal-chess/portal-chess-app.mjs');
  assert.match(route, /16 \/ 16 · OFFENE CHALLENGE/);
  assert.match(route, /id="load-three-pawns"/);
  assert.match(route, /41-Halbzug-Spur/);
  assert.match(core, /export const THREE_PAWN_TRACE/);
  assert.match(core, /threePawns:/);
  assert.match(app, /THREE_PAWN_TRACE_TEXT/);
  assert.match(app, /DREI PFORTE VERIFIZIERT/);
  assert.doesNotMatch(route, /LÖSUNGSLINIE/);
});

test('shared navigation exposes state and signature tools as direct shortcuts while retaining application routes', () => {
  const shell = read('assets/portal-shell.js');
  assert.match(shell, /path:'forschung\/portal-chess\/'/);
  assert.match(shell, /data-portal-quick="gstar">◎/);
  assert.match(shell, /data-portal-quick="entities">⌘/);
  assert.match(shell, /const quickIds=\['home','gstar','entities'\]/);
  const routeIndexes = [...shell.matchAll(/index:'(\d+)'/g)].map(match => match[1]);
  assert.deepEqual(routeIndexes, Array.from({length: 15}, (_, index) => String(index).padStart(2, '0')));
});

test('public portfolio and sitemap point to the actual Portal Chess route', () => {
  const url = 'https://juri-halveth.github.io/halveth-scarlet/forschung/portal-chess/';
  assert(read('README.md').includes(url));
  assert(read('README.en.md').includes(url));
  assert(read('README.ru.md').includes(url));
  assert(read('sitemap.xml').includes(url));
});
