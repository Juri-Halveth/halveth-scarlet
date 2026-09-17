const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = new Map([
  ['index.html', 'assets/'],
  ['room/index.html', '../assets/'],
  ['snapshot/index.html', '../assets/'],
  ['collage/index.html', '../assets/'],
  ['forschung/figuren-und-perspektiven/index.html', '../../assets/'],
  ['forschung/formen-und-verbindungen/index.html', '../../assets/'],
  ['forschung/transaktionsfluss/index.html', '../../assets/'],
  ['forschung/q-notizen/index.html', '../../assets/'],
  ['forschung/tagesstand-2026-09-13/index.html', '../../assets/'],
  ['forschung/usdai-sabr-kontext/index.html', '../../assets/'],
  ['forschung/brightcast-starlight/index.html', '../../assets/']
  ,['forschung/pi-treffpunkte/index.html', '../../assets/']
  ,['forschung/de-anker-hela/index.html', '../../assets/']
]);

test('every published page loads one shared portal shell from the correct root', () => {
  for (const [relative, prefix] of pages) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    const css = `${prefix}portal-shell.css?v=choice-atelier-20260914`;
    const js = `${prefix}portal-shell.js?v=choice-atelier-20260914`;
    assert.equal(html.split(css).length - 1, 1, `${relative} CSS`);
    assert.equal(html.split(js).length - 1, 1, `${relative} JS`);
    assert.equal(html.split(`${prefix}portal-mark.svg`).length - 1, 1, `${relative} icon`);
  }
});

test('every published page declares canonical, bilingual and social-preview metadata', () => {
  const publicRoot = 'https://juri-halveth.github.io/halveth-scarlet/';
  for (const [relative] of pages) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    const route = relative === 'index.html' ? '' : relative.replace(/index\.html$/, '');
    const canonical = publicRoot + route;
    assert(html.includes(`<link rel="canonical" href="${canonical}">`), relative);
    assert(html.includes(`<link rel="alternate" hreflang="de" href="${canonical}?lang=de">`), relative);
    assert(html.includes(`<link rel="alternate" hreflang="en" href="${canonical}?lang=en">`), relative);
    assert(html.includes(`<link rel="alternate" hreflang="x-default" href="${canonical}">`), relative);
    for (const property of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']) {
      assert(html.includes(`<meta property="${property}"`), `${relative} ${property}`);
    }
    assert(html.includes('<meta name="twitter:card" content="summary_large_image">'), relative);
  }
  const favicon = fs.statSync(path.join(root, 'favicon.ico'));
  assert(favicon.size > 1_000 && favicon.size < 100_000);
});

test('portal artwork is optimized, local and complete', () => {
  const artwork = [
    'portal-cosmic-gate.webp',
    'portal-machine.webp',
    'portal-nexus.webp',
    'portal-scarlet-room.webp',
    'scarlet-dual-state-v1.webp',
    'choice-atelier-wide-v1.webp',
    'choice-atelier-pin-v1.webp'
  ];
  for (const file of artwork) {
    const stat = fs.statSync(path.join(root, 'assets', file));
    assert(stat.size > 100_000, `${file} should contain the intended artwork`);
    assert(stat.size < 250_000, `${file} should remain web-sized`);
  }
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(homepage.includes('src="assets/scarlet-dual-state-v1.webp"'));
  assert(!homepage.includes('src="assets/scarlet-dual-state-v1.png"'));
});

test('homepage layout styles retain their keys and the shell carries the veil fix', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const file of ['events.css', 'universe.css', 'q-entry.css']) {
    assert(homepage.includes(`assets/${file}?v=full-audit-20260914`), file);
  }
  assert(homepage.includes('assets/hash-bloom.css?v=membrane-20260914'), 'hash-bloom.css');
  assert(homepage.includes('assets/portal-shell.css?v=choice-atelier-20260914'), 'portal-shell.css');
  assert(homepage.includes('assets/portal-shell.js?v=choice-atelier-20260914'), 'portal-shell.js');
});

test('responsive layout has no fractional pixel gap below desktop', () => {
  for (const file of ['events.css', 'universe.css']) {
    const style = fs.readFileSync(path.join(root, 'assets', file), 'utf8');
    assert(!style.includes('@media(max-width:999px)'), file);
    assert(style.includes('@media(max-width:999.98px)'), file);
  }
});

test('portal shell exposes all routes and motion-safe controls', () => {
  const script = fs.readFileSync(path.join(root, 'assets/portal-shell.js'), 'utf8');
  const style = fs.readFileSync(path.join(root, 'assets/portal-shell.css'), 'utf8');
  for (const route of ['./', 'room/', 'snapshot/', 'collage/', 'entities/', 'news/', 'forschung/usdai-sabr-kontext/', 'forschung/figuren-und-perspektiven/', 'forschung/formen-und-verbindungen/', 'forschung/transaktionsfluss/', 'forschung/q-notizen/', 'forschung/tagesstand-2026-09-13/', 'forschung/brightcast-starlight/', 'forschung/pi-treffpunkte/', 'forschung/de-anker-hela/', './#team']) {
    assert(script.includes(`path:'${route}'`), route);
  }
  assert(script.includes("routes.length+(english?"), 'portal count follows the actual route registry');
  assert(script.includes("69 public cards: perspectives, characters, projects and sources"));
  assert(script.includes("route.id!=='team'"), 'team hash must retain the home route styling');
  assert(script.includes("class=\"portal-motion-button\""));
  assert(script.includes("prefers-reduced-motion: reduce"));
  assert(style.includes('min-width:44px'));
  assert(style.includes('height:44px'));
  assert(style.includes('outline:3px solid'));
  assert(style.includes('body.portal-motion-paused .entity-dialog[open]{animation:none!important;opacity:1;transform:none}'), 'paused deep-link dialogs must remain visible');
  assert(!style.includes('infinite'), 'shared shell must not add endless motion');
});

test('research CSP permits only the local portal presentation assets', () => {
  for (const relative of [
    'forschung/figuren-und-perspektiven/index.html',
    'forschung/formen-und-verbindungen/index.html',
    'forschung/transaktionsfluss/index.html',
    'forschung/q-notizen/index.html',
    'forschung/tagesstand-2026-09-13/index.html',
    'forschung/usdai-sabr-kontext/index.html',
    'forschung/brightcast-starlight/index.html',
    'forschung/pi-treffpunkte/index.html',
    'forschung/de-anker-hela/index.html',
    'collage/index.html'
  ]) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    assert(html.includes("default-src 'none'"), relative);
    assert(html.includes("style-src 'self'"), relative);
    assert(html.includes("img-src 'self'"), relative);
  }
  const brightcast = fs.readFileSync(path.join(root, 'forschung/brightcast-starlight/index.html'), 'utf8');
  assert(brightcast.includes("media-src 'self'"));
  assert(brightcast.includes('<track kind="captions"'));
});
