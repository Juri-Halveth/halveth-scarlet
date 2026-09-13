const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = new Map([
  ['index.html', 'assets/'],
  ['room/index.html', '../assets/'],
  ['snapshot/index.html', '../assets/'],
  ['forschung/figuren-und-perspektiven/index.html', '../../assets/'],
  ['forschung/formen-und-verbindungen/index.html', '../../assets/'],
  ['forschung/transaktionsfluss/index.html', '../../assets/'],
  ['forschung/q-notizen/index.html', '../../assets/'],
  ['forschung/tagesstand-2026-09-13/index.html', '../../assets/']
]);

test('every published page loads one shared portal shell from the correct root', () => {
  for (const [relative, prefix] of pages) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    const css = `${prefix}portal-shell.css?v=portal-20260914`;
    const js = `${prefix}portal-shell.js?v=portal-20260914`;
    assert.equal(html.split(css).length - 1, 1, `${relative} CSS`);
    assert.equal(html.split(js).length - 1, 1, `${relative} JS`);
    assert.equal(html.split(`${prefix}portal-mark.svg`).length - 1, 1, `${relative} icon`);
  }
});

test('portal artwork is optimized, local and complete', () => {
  const artwork = [
    'portal-cosmic-gate.webp',
    'portal-machine.webp',
    'portal-nexus.webp',
    'portal-scarlet-room.webp'
  ];
  for (const file of artwork) {
    const stat = fs.statSync(path.join(root, 'assets', file));
    assert(stat.size > 100_000, `${file} should contain the intended artwork`);
    assert(stat.size < 250_000, `${file} should remain web-sized`);
  }
});

test('portal shell exposes all routes and motion-safe controls', () => {
  const script = fs.readFileSync(path.join(root, 'assets/portal-shell.js'), 'utf8');
  const style = fs.readFileSync(path.join(root, 'assets/portal-shell.css'), 'utf8');
  for (const route of ['./', 'room/', 'snapshot/', 'forschung/figuren-und-perspektiven/', 'forschung/formen-und-verbindungen/', 'forschung/transaktionsfluss/', 'forschung/q-notizen/', 'forschung/tagesstand-2026-09-13/', './#team']) {
    assert(script.includes(`path:'${route}'`), route);
  }
  assert(script.includes("Nine portals. One constellation."));
  assert(script.includes("64 public cards: perspectives, characters, projects and sources"));
  assert(script.includes("route.id!=='team'"), 'team hash must retain the home route styling');
  assert(script.includes("class=\"portal-motion-button\""));
  assert(script.includes("prefers-reduced-motion: reduce"));
  assert(style.includes('min-width:44px'));
  assert(style.includes('height:44px'));
  assert(style.includes('outline:3px solid'));
  assert(!style.includes('infinite'), 'shared shell must not add endless motion');
});

test('research CSP permits only the local portal presentation assets', () => {
  for (const relative of ['forschung/figuren-und-perspektiven/index.html', 'forschung/transaktionsfluss/index.html']) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    assert(html.includes("style-src 'self' 'unsafe-inline'"), relative);
    assert(html.includes("img-src 'self'"), relative);
  }
});
