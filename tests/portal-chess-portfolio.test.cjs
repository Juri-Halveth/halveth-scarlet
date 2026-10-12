const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('home leads to Portal Chess without placing the portfolio challenge over the Earth scene', () => {
  const home = read('index.html');
  const css = read('assets/portal-chess-feature.css');
  const sceneEnd = home.indexOf('</footer></div>');
  const feature = home.indexOf('<section class="portal-chess-feature"');
  assert(sceneEnd >= 0, 'home scene closing seam');
  assert(feature > sceneEnd, 'challenge follows the scene in document flow');
  assert.match(home, /assets\/portal-chess-feature\.css\?v=portfolio-challenge-20261012/);
  assert.match(home, /class="portal-chess-quicklink" href="forschung\/portal-chess\/"/);
  assert.match(home, /16 BAUERN\. 16 DAMEN\?/);
  assert.match(home, /CHALLENGE ÖFFNEN/);
  assert.match(home, /Zugspur-Prüfer/);
  assert.match(css, /\.portal-chess-feature\{[\s\S]*?position:relative/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.doesNotMatch(css, /\.portal-chess-feature\{[\s\S]*?position:fixed/);
});

test('Portal Chess is the first public destination after Nexus and gets a direct shortcut', () => {
  const shell = read('assets/portal-shell.js');
  const chess = shell.indexOf("id:'portal-chess'");
  const room = shell.indexOf("id:'room'");
  assert(chess > 0 && chess < room, 'Portal Chess follows Nexus before the prior room route');
  assert.match(shell, /path:'forschung\/portal-chess\/'/);
  assert.match(shell, /index:'01'/);
  assert.match(shell, /data-portal-quick="portal-chess">♟/);
  assert.match(shell, /const quickIds=\['home','portal-chess','room'\]/);
  const routeIndexes = [...shell.matchAll(/index:'(\d+)'/g)].map(match => match[1]);
  assert.deepEqual(routeIndexes, Array.from({length: 20}, (_, index) => String(index).padStart(2, '0')));
});

test('public portfolio and sitemap point to the actual Portal Chess route', () => {
  const url = 'https://juri-halveth.github.io/halveth-scarlet/forschung/portal-chess/';
  assert(read('README.md').includes(url));
  assert(read('README.en.md').includes(url));
  assert(read('README.ru.md').includes(url));
  assert(read('sitemap.xml').includes(url));
});
