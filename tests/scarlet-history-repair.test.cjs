const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const thesis = 'forschung/juri-thesis/';
function fakeDocument() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', children: [], setAttribute() {}, addEventListener() {}, append(...items) { this.children.push(...items); }, replaceChildren(...items) { this.children = items; } });
    return nodes.get(id);
  };
  return { nodes, node, document: { getElementById: node, querySelectorAll: () => [], createElement: () => ({ textContent: '', append() {} }) } };
}
test('explicitly open funds stay outside allocation and both totals still balance', async () => {
  const { cases, summarizeBudget } = await import('../forschung/juri-thesis/wirkungswege-model.mjs');
  assert.deepEqual(summarizeBudget(cases.initiator), { allocated: 1000000, localPayments: 1000000, unallocated: 1000000 });
  for (const key of ['mother', 'young', 'older']) {
    const result = summarizeBudget(cases[key]);
    assert.equal(result.allocated, cases[key].budget);
    assert.equal(result.unallocated, 0);
  }
  // An open line must not inflate local allocation either.
  assert.deepEqual(summarizeBudget({ budget: 15, lines: [{ amount: 5, local: true }, { amount: 10, local: true, allocated: false }] }), { allocated: 5, localPayments: 5, unallocated: 10 });
});
test('actual life-path renderer discloses allocated and open amounts separately', async () => {
  const { cases, summarizeBudget } = await import('../forschung/juri-thesis/wirkungswege-model.mjs');
  const dom = fakeDocument();
  vm.runInNewContext(read(thesis + 'wirkungswege.js').replace(/^import[^\n]+\n/, ''), { cases, summarizeBudget, Intl, document: dom.document }, { timeout: 1000 });
  const label = dom.node('story-ledger-total').textContent;
  assert.match(label, /zugeordnet: 1\.000\.000/);
  assert.match(label, /offen: 1\.000\.000/);
  assert.equal(dom.node('story-ledger').children.length, cases.initiator.lines.length);
});
test('initial HTML provides the same readable scenario when the module is absent', async () => {
  const { cases } = await import('../forschung/juri-thesis/wirkungswege-model.mjs');
  const html = read(thesis + 'wirkungswege.html');
  const text = id => {
    const match = html.match(new RegExp('<([a-z0-9]+)\\b[^>]*\\bid="' + id + '"[^>]*>([\\s\\S]*?)<\\/\\1>'));
    assert.ok(match, id);
    return match[2].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  };
  for (const [field, key] of [['hook', 'hook'], ['before', 'before'], ['action', 'action'], ['outcome', 'open'], ['human', 'human'], ['measure', 'measure']]) assert.equal(text('story-' + field), cases.initiator[key]);
  assert.match(text('story-budget'), /2\.000\.000/);
  assert.match(text('story-ledger-total'), /offen: 1\.000\.000/);
});
test('economic controller keeps each selected scenario and exception in the scaling label', async () => {
  const { scenarios, calculate } = await import('../forschung/juri-thesis/wirtschaftslabor-model.mjs');
  const dom = fakeDocument();
  let exceptional = false;
  const buttons = Object.keys(scenarios).map(key => ({ dataset: { scenario: key }, setAttribute() {}, addEventListener(_type, fn) { this.click = fn; } }));
  const exception = { get checked() { return exceptional; }, addEventListener(_type, fn) { this.change = fn; } };
  const document = { querySelectorAll: () => buttons, querySelector: selector => selector === '#exceptional' ? exception : dom.node(selector) };
  vm.runInNewContext(read(thesis + 'wirtschaftslabor.js').replace(/^import[^\n]+\n/, ''), { scenarios, calculate, Intl, document }, { timeout: 1000 });
  for (const enabled of [false, true]) {
    exceptional = enabled;
    for (const button of buttons) {
      button.click();
      const selected = scenarios[button.dataset.scenario];
      const label = dom.node('#scale-scenario-label').textContent;
      assert.ok(label.includes(selected.title), label);
      assert.equal(label.includes('großem Einzelfall'), enabled);
      assert.equal(dom.node('#pilots').textContent, new Intl.NumberFormat('de-DE').format(calculate(selected, { exceptional: enabled }).billionPilotCount));
    }
  }
  assert.match(read(thesis + 'wirtschaftslabor.html'), /id="scale-scenario-label"/);
});
function initialLanguage({ saved = null, query = '', browser = 'de-DE', blocked = false, hub } = {}) {
  const source = read('forschung/red-room-swarm/app.mjs');
  const prefix = source.slice(source.indexOf('const requestedLanguage'), source.indexOf('const words ='));
  const context = { URLSearchParams, location: { search: query }, navigator: { language: browser }, window: hub ? { HalvethHubLanguage: { language: hub } } : {}, localStorage: { getItem(key) { if (blocked) throw Error('Storage blocked'); return key === 'halveth-hub-language' ? saved : null; } } };
  return vm.runInNewContext(prefix + ';lang;', context, { timeout: 1000 });
}
test('swarm entry honors shared English preference with German browser and explicit query overrides', () => {
  assert.equal(initialLanguage({ saved: 'en', browser: 'de-DE' }), 'en');
  assert.equal(initialLanguage({ saved: 'en', query: '?lang=de', hub: 'en' }), 'de');
  assert.equal(initialLanguage({ saved: 'de', query: '?lang=en', hub: 'de' }), 'en');
  assert.equal(initialLanguage({ saved: 'en', hub: 'de' }), 'en');
  assert.equal(initialLanguage({ saved: 'de', hub: 'en' }), 'de');
  assert.equal(initialLanguage({ hub: 'en' }), 'en');
});
test('swarm language fallback remains usable with blocked or invalid storage', () => {
  assert.equal(initialLanguage({ blocked: true, browser: 'en-GB' }), 'en');
  assert.equal(initialLanguage({ blocked: true, browser: 'de-DE' }), 'de');
  assert.equal(initialLanguage({ saved: 'invalid', query: '?lang=invalid', browser: 'en-US' }), 'en');
  assert.equal(initialLanguage({ saved: 'invalid', browser: 'de-DE' }), 'de');
});
test('source and disclosure links resolve to the actual requested content', () => {
  assert.match(read(thesis + 'index.html'), /href="QUELLEN-UND-GRENZEN\.md">Quellen und Grenzen ansehen/);
  const html = read(thesis + 'rechtslabor.html');
  const detail = html.match(/<details class="move"[^>]*>[\s\S]*?id="anrechnung"[\s\S]*?<\/details>/)?.[0];
  assert.ok(detail);
  assert.doesNotMatch(detail.split('>')[0], /id="anrechnung"/);
  assert.match(detail, /class="move-body" id="anrechnung"/);
  assert.equal((html.match(/id="anrechnung"/g) || []).length, 1);
});
