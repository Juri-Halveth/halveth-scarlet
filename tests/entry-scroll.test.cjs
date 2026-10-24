const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/entry-scroll.js'), 'utf8');

function entry({ type = 'navigate', hash = '', application = false } = {}) {
  const windowEvents = {}, documentEvents = {}, scrolls = [];
  const history = { scrollRestoration: 'auto' };
  const context = {
    performance: { getEntriesByType: () => [{ type }] }, location: { hash }, history,
    document: {
      currentScript: { dataset: application ? { entryFragments: 'application' } : {} },
      addEventListener(name, fn) { documentEvents[name] = fn; }
    },
    window: {
      addEventListener(name, fn) { windowEvents[name] = fn; },
      scrollTo(value) { scrolls.push(value); }
    }
  };
  vm.runInNewContext(source, context);
  return { history, scrolls, emit(name, event = {}) { (windowEvents[name] || documentEvents[name])?.(event); } };
}

test('new entries and reloads reset restored scroll at bounded browser lifecycle points', () => {
  for (const type of ['navigate', 'reload']) {
    const page = entry({ type });
    assert.equal(page.history.scrollRestoration, 'manual');
    for (const name of ['DOMContentLoaded', 'load', 'pageshow']) page.emit(name);
    assert.equal(page.scrolls.length, 3);
    for (const value of page.scrolls) assert.equal(value.top, 0);
  }
});

test('application hashes select state without acquiring a document scroll destination', () => {
  const page = entry({ hash: '#rachel', application: true });
  page.emit('load');
  assert.equal(page.scrolls.length, 1);
  assert.equal(page.scrolls[0].top, 0);
});

test('real content anchors and history returns retain native navigation', () => {
  for (const options of [{ hash: '#experiment' }, { type: 'back_forward' }]) {
    const page = entry(options);
    for (const name of ['DOMContentLoaded', 'load', 'pageshow']) page.emit(name);
    assert.equal(page.history.scrollRestoration, 'auto');
    assert.equal(page.scrolls.length, 0);
  }
});

test('user input cancels later resets instead of dragging a reader back to the top', () => {
  for (const name of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
    const page = entry();
    page.emit('DOMContentLoaded'); page.emit(name);
    for (const later of ['load', 'pageshow']) page.emit(later);
    assert.equal(page.scrolls.length, 1);
    assert.equal(page.history.scrollRestoration, 'auto');
  }
});

test('leaving and returning through bfcache does not reset the previous reading position', () => {
  const page = entry();
  page.emit('DOMContentLoaded'); page.emit('pagehide'); page.emit('pageshow', { persisted: true });
  assert.equal(page.history.scrollRestoration, 'auto');
  assert.equal(page.scrolls.length, 1);
});

test('entry policy is idempotent, precedes other scripts and hash-pins restrictive CSP', async () => {
  const { entryPolicy } = await import(pathToFileURL(path.join(root, 'tools/entry_policy.mjs')));
  const html = '<html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'"><script src="app.js" defer></script></head><body></body></html>';
  const result = entryPolicy(html, 'entities/index.html');
  assert.equal(entryPolicy(result, 'entities/index.html'), result);
  assert.match(result, /src="\.\.\/assets\/entry-scroll\.js" data-entry-fragments="application"/);
  assert.ok(result.indexOf('entry-scroll.js') < result.indexOf('app.js'));
  assert.ok(result.indexOf('entry-scroll.js') > result.indexOf('Content-Security-Policy'));
  const scriptFree = html.replace("; script-src 'self'", '').replace('<script src="app.js" defer></script>', '');
  const pinned = entryPolicy(scriptFree, 'forschung/wegweiser/index.html');
  assert.match(pinned, /default-src 'none'; script-src 'sha256-[A-Za-z0-9+/=]+'/);
  assert.doesNotMatch(pinned, /script-src 'self'|unsafe-inline|<script src=/);
  assert.equal(entryPolicy(pinned, 'forschung/wegweiser/index.html'), pinned);
  const { createHash } = require('node:crypto');
  const inline = /<!-- ENTRY_SCROLL_START --><script>([\s\S]*?)<\/script>/.exec(pinned)[1];
  const digest = createHash('sha256').update(inline).digest('base64');
  assert.ok(pinned.includes("'sha256-" + digest + "'"));
});

test('all entity state fragments are unique anchors before the scene, apart from the profile cards', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/universe-data.js'), 'utf8'), context);
  const html = fs.readFileSync(path.join(root, 'entities/index.html'), 'utf8');
  const header = html.indexOf('<header class="world-header">');
  for (const { id } of context.window.HalvethUniverse.entities) {
    const needle = `id="${id}"`;
    assert.equal(html.split(needle).length - 1, 1, id);
    assert.ok(html.indexOf(needle) < header, id);
    assert.ok(html.includes(`<li id="profile-${id}"`), id);
  }
});
