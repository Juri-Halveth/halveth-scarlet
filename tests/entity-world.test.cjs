const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const moduleURL = file => pathToFileURL(path.join(root, file)).href;
const modelPromise = import(moduleURL('assets/entity-world-model.mjs'));
const templatePromise = import(moduleURL('tools/entity-world-template.mjs'));
const context = { window: {} };
vm.runInNewContext(read('assets/universe-data.js'), context);
const registry = context.window.HalvethUniverse;
const entities = registry.entities;
const ids = new Set(entities.map(entity => entity.id));
const snapshot = JSON.stringify(registry);
const iso = '2026-10-02T12:34:56.789Z';
const entityIds = list => Array.from(list, entity => entity.id);

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}
freezeDeep(registry);

function directoryParts(html) {
  const section = /<section\b[^>]*\bid="profile-directory"[^>]*>([\s\S]*?)<\/section>/.exec(html);
  assert.ok(section, 'static profile directory exists');
  assert.doesNotMatch(section[0].split('>')[0], /\bhidden(?:\s|=|$)/);
  const grid = /<ul\b[^>]*\bclass="profile-grid"[^>]*>([\s\S]*?)<\/ul>/.exec(section[1]);
  assert.ok(grid, 'static profile list exists');
  return { section: section[0], cards: grid[1] };
}

function assertStaticProfiles(html) {
  const { cards } = directoryParts(html);
  const links = [...cards.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match => match[1]);
  assert.equal(links.length, 69);
  assert.equal(new Set(links).size, 69);
  assert.deepEqual(links.slice().sort(), Array.from(entities, entity => `${entity.id}/`).sort());
  assert.equal([...cards.matchAll(/<li\b/g)].length, 69);
  assert.doesNotMatch(cards, /\bhidden(?:\s|=|>)/);
  for (const entity of entities) {
    assert.equal(entity.profilePath, `entities/${entity.id}/`);
    assert.ok(fs.existsSync(path.join(root, entity.profilePath, 'index.html')), entity.id);
  }
}

test('the actual registry has 69 unique IDs and ordering preserves every source object', async () => {
  const { orderedEntities } = await modelPromise;
  assert.equal(entities.length, 69);
  assert.equal(ids.size, 69);
  const ordered = orderedEntities(entities);
  assert.notStrictEqual(ordered, entities);
  assert.equal(ordered.length, 69);
  assert.deepEqual(entityIds(ordered).sort(), Array.from(ids).sort());
  assert.equal(ordered[0].id, 'scarlet');
  assert.deepEqual(entityIds(orderedEntities(entities)), entityIds(ordered));
  assert.deepEqual(entityIds(orderedEntities(ordered)), entityIds(ordered));
  for (const entity of ordered) {
    const source = entities.find(item => item.id === entity.id);
    assert.strictEqual(entity, source, entity.id);
    assert.strictEqual(entity.en, source.en, entity.id);
    assert.strictEqual(entity.sourceRefs, source.sourceRefs, entity.id);
    assert.ok(entity.sourceRefs.length > 0, entity.id);
  }
  assert.equal(JSON.stringify(registry), snapshot);
});

test('Mira and Mita retain separate identities, source references and profile destinations', async () => {
  const { orderedEntities, matchingEntities } = await modelPromise;
  const ordered = orderedEntities(entities);
  const mira = ordered.find(entity => entity.id === 'mira');
  const mita = ordered.find(entity => entity.id === 'mita');
  assert.ok(mira && mita);
  assert.notStrictEqual(mira, mita);
  assert.notDeepEqual(mira.sourceRefs, mita.sourceRefs);
  assert.notEqual(mira.profilePath, mita.profilePath);
  assert.notEqual(mira.role, mita.role);
  assert.ok(matchingEntities(ordered, 'MIRA').includes(mira));
  assert.ok(matchingEntities(ordered, 'MITA').includes(mita));
  assert.equal(JSON.stringify(registry), snapshot);
});

test('ordering rejects duplicate IDs and malformed ID tokens without modifying input', async () => {
  const { orderedEntities } = await modelPromise;
  for (const list of [
    [...entities, entities[0]],
    ...['', 'MIRA', 'mira mita', '../mira', 'mira/mita', '-mira', 'mira--mita'].map(id => [{ ...entities[0], id }])
  ]) {
    const before = JSON.stringify(list);
    assert.throws(() => orderedEntities(list), /Invalid entity registry/);
    assert.equal(JSON.stringify(list), before);
  }
});

test('search supports zero results, all results, whitespace, case and both role languages', async () => {
  const { orderedEntities, matchingEntities } = await modelPromise;
  const ordered = orderedEntities(entities);
  for (const query of ['', ' \t\n ']) {
    assert.deepEqual(entityIds(matchingEntities(ordered, query)), entityIds(ordered));
  }
  assert.deepEqual(entityIds(matchingEntities(ordered, '__no_such_profile_20261002__')), []);
  assert.deepEqual(entityIds(matchingEntities([], 'mira')), []);
  for (const entity of entities) {
    for (const query of [entity.id, entity.label, entity.role, entity.en.role]) {
      const results = matchingEntities(ordered, query);
      assert.ok(results.includes(entity), `${entity.id}: ${query}`);
      assert.deepEqual(entityIds(matchingEntities(ordered, `  ${query.toUpperCase()}  `)), entityIds(results),
        `${entity.id}: uppercase search must preserve matches for ${JSON.stringify(query)}`);
    }
  }
  assert.equal(JSON.stringify(registry), snapshot);
});

test('Russian role search retains original profile objects and source references', async () => {
  const { matchingEntities } = await modelPromise;
  const catalog = JSON.parse(read('languages/catalog.json')).strings;
  const searchable = value => [value, ...Object.values(catalog[value] || {})].join(' ');
  let translatedRoles = 0;
  for (const entity of entities) {
    const role = catalog[entity.role]?.ru;
    if (!role) continue;
    translatedRoles++;
    assert.ok(matchingEntities(entities, role, searchable).includes(entity), entity.id);
  }
  assert.ok(translatedRoles > 0);
  assert.equal(JSON.stringify(registry), snapshot);
});

test('neighbors remain distinct source objects in the selected section and obey the limit', async () => {
  const { orderedEntities, neighbors } = await modelPromise;
  const ordered = orderedEntities(entities);
  for (const selected of ordered) {
    for (const limit of [0, 1, 4]) {
      const related = neighbors(ordered, selected, limit);
      assert.ok(related.length <= limit, selected.id);
      assert.equal(new Set(entityIds(related)).size, related.length);
      for (const entity of related) {
        assert.notEqual(entity.id, selected.id);
        assert.equal(entity.section, selected.section);
        assert.ok(entities.includes(entity));
      }
    }
  }
});

test('gallery coordinates are deterministic, finite and unique for all 69 profiles', async () => {
  const { galleryPosition } = await modelPromise;
  for (const count of [1, 2, entities.length]) {
    const positions = Array.from({ length: count }, (_, index) => galleryPosition(index, count));
    assert.deepEqual(positions, Array.from({ length: count }, (_, index) => galleryPosition(index, count)));
    assert.equal(new Set(positions.map(position => JSON.stringify(position))).size, count);
    for (const position of positions) {
      assert.equal(position.length, 3);
      assert.ok(position.every(Number.isFinite));
      assert.equal(position[1], 0);
    }
  }
  const first = galleryPosition(0, 69);
  const second = galleryPosition(1, 69);
  const nextRow = galleryPosition(10, 69);
  assert.ok(Math.abs(first[0] + 14.85) < 1e-10);
  assert.ok(Math.abs(first[2] + 12.6) < 1e-10);
  assert.ok(Math.abs(second[0] - first[0] - 3.3) < 1e-10);
  assert.ok(Math.abs(nextRow[2] - first[2] - 4.2) < 1e-10);
  assert.equal(nextRow[0], first[0]);
});

test('browser moments round-trip for every actual profile without mutating prior moments', async () => {
  const { appendMoment, readMoments, MOMENT_SCHEMA, TIMELINE_KEY, MAX_MOMENTS } = await modelPromise;
  assert.equal(MAX_MOMENTS, 80);
  assert.equal(TIMELINE_KEY, 'halveth-character-moments-v1');
  assert.deepEqual(readMoments(null, ids), { moments: [], state: 'EMPTY' });
  let moments = Object.freeze([]);
  for (const entity of entities) {
    const previous = moments;
    const before = JSON.stringify(previous);
    moments = appendMoment(previous, entity.id, iso, ids);
    assert.notStrictEqual(moments, previous);
    assert.equal(JSON.stringify(previous), before);
    assert.deepEqual(moments.at(-1), { entityId: entity.id, recordedAt: iso });
    freezeDeep(moments);
  }
  const raw = JSON.stringify({ schema: MOMENT_SCHEMA, moments });
  assert.deepEqual(readMoments(raw, ids), { moments, state: 'LOADED' });
});

test('the 80-moment bound retains the most recent selections in their original order', async () => {
  const { appendMoment, readMoments, MAX_MOMENTS, MOMENT_SCHEMA } = await modelPromise;
  let moments = [];
  const all = [];
  for (let index = 0; index < MAX_MOMENTS + 17; index++) {
    const moment = { entityId: entities[index % entities.length].id, recordedAt: new Date(Date.parse(iso) + index * 1000).toISOString() };
    all.push(moment);
    moments = appendMoment(moments, moment.entityId, moment.recordedAt, ids);
    assert.ok(moments.length <= MAX_MOMENTS);
  }
  assert.deepEqual(moments, all.slice(17));
  assert.deepEqual(readMoments(JSON.stringify({ schema: MOMENT_SCHEMA, moments }), ids), { moments, state: 'LOADED' });
});

test('moments reject unknown profiles, invalid dates and noncanonical browser timestamps', async () => {
  const { appendMoment } = await modelPromise;
  const previous = freezeDeep([{ entityId: 'mira', recordedAt: iso }]);
  for (const [entityId, recordedAt] of [
    ['missing-profile', iso], ['MIRA', iso], ['', iso], ['mira', 'not-a-date'],
    ['mira', '2026-02-30T12:34:56.789Z'], ['mira', '2026-10-02'],
    ['mira', '2026-10-02T12:34:56Z'], ['mira', '2026-10-02T14:34:56.789+02:00'],
    ['mira', null], ['mira', Date.parse(iso)]
  ]) assert.throws(() => appendMoment(previous, entityId, recordedAt, ids), /Invalid moment/);
  assert.deepEqual(previous, [{ entityId: 'mira', recordedAt: iso }]);
});

test('malformed stored timelines are INVALID_PRESERVED, never silently normalized', async () => {
  const { readMoments, MOMENT_SCHEMA, MAX_MOMENTS } = await modelPromise;
  const valid = { entityId: 'mita', recordedAt: iso };
  const wrap = moments => JSON.stringify({ schema: MOMENT_SCHEMA, moments });
  const cases = [
    '', '{broken', 'null', '[]', '42', '{}', JSON.stringify({ schema: 'wrong', moments: [] }),
    JSON.stringify({ schema: MOMENT_SCHEMA, moments: {} }), wrap([null]), wrap([{}]),
    wrap([{ ...valid, entityId: 'unknown' }]), wrap([{ ...valid, recordedAt: 'yesterday' }]),
    wrap([{ ...valid, recordedAt: '2026-10-02T12:34:56Z' }]),
    wrap([{ ...valid, recordedAt: 0 }]), wrap([{ ...valid, extra: true }]),
    wrap(Array.from({ length: MAX_MOMENTS + 1 }, () => valid)),
    ' '.repeat(20001) + wrap([])
  ];
  for (const raw of cases) assert.deepEqual(readMoments(raw, ids), { moments: [], state: 'INVALID_PRESERVED' });
  assert.deepEqual(readMoments(wrap([]), ids), { moments: [], state: 'LOADED' });
});

test('the generator check verifies the current 69-profile world without writing artifacts', () => {
  const before = read('entities/index.html');
  const output = execFileSync(process.execPath, ['tools/build_profiles.mjs', '--check'], {
    cwd: root, encoding: 'utf8', timeout: 20000
  });
  assert.match(output, /Verified 69 bilingual entity profiles/);
  assert.equal(read('entities/index.html'), before);
});

test('generated HTML and the ES-module template preserve 69 static links before enhancement', async () => {
  const { entityWorldBody } = await templatePromise;
  const html = read('entities/index.html');
  assertStaticProfiles(html);
  const rendered = entityWorldBody({ cards: directoryParts(html).cards, languageButtons: '', count: entities.length });
  assertStaticProfiles(rendered);
  for (const page of [html, rendered]) {
    assert.match(page, /<noscript>[\s\S]*69[\s\S]*<\/noscript>/);
    const loader = /<script\b[^>]*src="\.\.\/assets\/entity-world-loader\.js"[^>]*>/.exec(page)?.[0];
    assert.ok(loader, 'the classic loader is the world entry point');
    assert.match(loader, /\bdefer\b/);
    assert.doesNotMatch(loader, /type="module"/);
    for (const id of ['entity-role', 'entity-kind', 'entity-source', 'entity-note', 'entity-profile', 'world-error', 'world-fallback']) {
      assert.ok(page.includes(`id="${id}"`), id);
    }
    const elementIds = [...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(elementIds).size, elementIds.length, 'DOM IDs must remain unique');
    assert.match(page, /API \/[\s\S]*Not connected/);
  }
});

test('world assets stay local and the page disables external API connections', () => {
  const html = read('entities/index.html');
  const policy = /<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"/.exec(html)?.[1];
  assert.ok(policy);
  const directives = new Map(policy.split(';').map(value => value.trim().split(/\s+/)).filter(parts => parts[0]).map(([name, ...values]) => [name, values]));
  assert.deepEqual(directives.get('connect-src'), ["'self'"]);
  assert.deepEqual(directives.get('script-src'), ["'self'"]);
  for (const [, src] of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
    assert.ok(src.startsWith('../assets/') || /^\.\.\/languages\/(?:catalog|hub-language)\.js$/.test(src), src);
    assert.ok(fs.existsSync(path.resolve(root, 'entities', src)), src);
  }
  for (const file of ['assets/entity-world-loader.js', 'assets/entity-world.mjs', 'assets/entity-world-scene.mjs', 'assets/entity-world-model.mjs', 'assets/entity-figures.mjs', 'assets/entity-profile.js', 'assets/language.js']) {
    const source = read(file);
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/, file);
    assert.doesNotMatch(source, /https?:\/\//, file);
    for (const [, dependency] of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      assert.ok(dependency.startsWith('./'), `${file}: ${dependency}`);
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), dependency)), dependency);
    }
  }
});

test('the bundled local runtime and scene import in Node without constructing a browser renderer', async () => {
  const runtime = await import(moduleURL('assets/entity-vendor/runtime.mjs'));
  const scene = await import(moduleURL('assets/entity-world-scene.mjs'));
  assert.equal(typeof runtime.THREE.WebGLRenderer, 'function');
  assert.equal(typeof runtime.OrbitControls, 'function');
  assert.equal(typeof runtime.createIcons, 'function');
  assert.equal(typeof scene.createCharacterWorld, 'function');
  for (const name of ['Orbit', 'Focus', 'Users', 'Search', 'Pause', 'Play', 'BookOpen', 'History', 'Download', 'X']) {
    assert.ok(runtime[name], name);
  }
});

// Run the unmodified controller in a separate VM: only DOM and renderer boundaries are substitutes.
async function controllerRegression() {
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const root = process.cwd();
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const registryContext = { window: {} };
  vm.runInNewContext(read('assets/universe-data.js'), registryContext);
  const registry = registryContext.window.HalvethUniverse;
  const { TIMELINE_KEY, MOMENT_SCHEMA, MAX_MOMENTS, readMoments } = await import(require('node:url').pathToFileURL(path.join(root, 'assets/entity-world-model.mjs')).href);
  const ids = new Set(registry.entities.map(entity => entity.id));
  const snapshot = JSON.stringify(registry);
  const html = read('entities/index.html');

  async function load(raw, storageUnavailable = false) {
    const nodes = new Map();
    function element() {
      return {
        value: '', hidden: false, dataset: {}, handlers: {}, attributes: {}, children: [],
        classList: { add() {} },
        addEventListener(type, fn) { this.handlers[type] = fn; },
        setAttribute(name, value) { this.attributes[name] = value; },
        getAttribute(name) { return this.attributes[name]; },
        replaceChildren(...children) { this.children = children; },
        append(...children) { this.children.push(...children); },
        scrollIntoView() {}, focus() {}, showModal() {}, close() {}
      };
    }
    for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) nodes.set(id, element());
    nodes.get('moment-slider').value = '0';
    const storage = new Map(raw === null ? [] : [[TIMELINE_KEY, raw]]);
    const writes = [], networkCalls = [], events = {};
    const blockedNetwork = (...args) => { networkCalls.push(args); throw new Error('Unexpected network request'); };
    const sandbox = vm.createContext({
      window: { HalvethUniverse: registry, HalvethLanguage: { get: () => 'en' }, addEventListener(type, fn) { events[type] = fn; } },
      document: { body: element(), getElementById: id => nodes.get(id), createElement: element },
      location: { href: 'http://localhost/entities/', hash: '' },
      history: { state: null, replaceState() {} },
      matchMedia: () => ({ matches: true, addEventListener() {} }),
      localStorage: {
        getItem(key) { if (storageUnavailable) throw new Error('Storage unavailable'); return storage.get(key) ?? null; },
        setItem(key, value) { writes.push([key, value]); if (storageUnavailable) throw new Error('Storage unavailable'); storage.set(key, value); },
        removeItem() { assert.fail('Stored data must not be removed'); },
        clear() { assert.fail('Stored data must not be cleared'); }
      },
      fetch: blockedNetwork, XMLHttpRequest: blockedNetwork, WebSocket: blockedNetwork, EventSource: blockedNetwork,
      navigator: { sendBeacon: blockedNetwork }, URL, Blob, console, setTimeout
    });
    const model = new vm.SourceTextModule(read('assets/entity-world-model.mjs'), { context: sandbox });
    const runtime = new vm.SyntheticModule(['createIcons'], function () { this.setExport('createIcons', () => {}); }, { context: sandbox });
    const scene = new vm.SyntheticModule(['createCharacterWorld'], function () {
      this.setExport('createCharacterWorld', () => ({ select() {}, setMode() {}, pause() {}, dispose() {} }));
    }, { context: sandbox });
    const controller = new vm.SourceTextModule(read('assets/entity-world.mjs'), { context: sandbox });
    const dependencies = { './entity-vendor/runtime.mjs': runtime, './entity-world-scene.mjs': scene, './entity-world-model.mjs': model };
    await controller.link(specifier => { assert.ok(dependencies[specifier], specifier); return dependencies[specifier]; });
    await controller.evaluate();
    return { nodes, storage, writes, networkCalls, events, sandbox };
  }

  const valid = { entityId: 'mira', recordedAt: '2026-10-02T12:34:56.789Z' };
  for (const raw of ['{broken', 'null', JSON.stringify({ schema: MOMENT_SCHEMA, moments: [{ ...valid, entityId: 'absent' }] }), JSON.stringify({ schema: MOMENT_SCHEMA, moments: Array(MAX_MOMENTS + 1).fill(valid) })]) {
    const run = await load(raw);
    run.nodes.get('moment-save').handlers.click();
    assert.equal(run.storage.get(TIMELINE_KEY), raw);
    assert.equal(run.writes.length, 0);
    assert.equal(run.nodes.get('moment-count').textContent, '0');
    assert.match(run.nodes.get('world-status').textContent, /invalid.*preserved unchanged/i);
    assert.equal(run.networkCalls.length, 0);
  }

  const run = await load(null);
  for (const entity of registry.entities) {
    run.sandbox.location.hash = `#${entity.id}`;
    run.events.hashchange();
    assert.equal(run.nodes.get('entity-name').textContent, entity.label);
    assert.equal(run.nodes.get('entity-role').textContent, entity.en.role);
    assert.equal(run.nodes.get('entity-source').textContent, entity.en.sourceLabel);
    assert.equal(run.nodes.get('entity-note').textContent, entity.en.note);
    assert.equal(run.nodes.get('entity-profile').href, `${entity.id}/?lang=en`);
  }
  for (let index = 0; index < MAX_MOMENTS + 2; index++) run.nodes.get('moment-save').handlers.click();
  const stored = readMoments(run.storage.get(TIMELINE_KEY), ids);
  assert.equal(stored.state, 'LOADED');
  assert.equal(stored.moments.length, MAX_MOMENTS);
  assert.equal(run.nodes.get('moment-count').textContent, String(MAX_MOMENTS));
  assert.equal(run.nodes.get('moment-slider').max, String(MAX_MOMENTS - 1));
  assert.equal(run.nodes.get('moment-slider').disabled, false);
  assert.equal(run.nodes.get('moment-export').disabled, false);
  assert.equal(run.networkCalls.length, 0);
  assert.equal(JSON.stringify(registry), snapshot);

  const unavailable = await load(null, true);
  unavailable.nodes.get('moment-save').handlers.click();
  assert.equal(unavailable.nodes.get('moment-count').textContent, '1');
  assert.match(unavailable.nodes.get('world-status').textContent, /session only.*storage unavailable/i);
  assert.equal(unavailable.storage.size, 0);
  assert.equal(unavailable.networkCalls.length, 0);

  for (const failed of [false, true]) {
    let imports = 0, reloads = 0, scrolls = 0;
    const nodes = {
      'world-loading': { hidden: false }, 'world-error': { hidden: true },
      'profile-directory': { hidden: failed, scrollIntoView() { scrolls++; } },
      'world-retry': {}, 'world-fallback': {}
    };
    const sandbox = vm.createContext({
      document: { getElementById: id => nodes[id] },
      location: { reload() { reloads++; } }, console: { warn() {} }
    });
    const imported = new vm.SyntheticModule([], function () {}, { context: sandbox });
    await imported.link(() => assert.fail('Unexpected fixture import'));
    await imported.evaluate();
    const loader = new vm.Script(read('assets/entity-world-loader.js'), {
      importModuleDynamically(specifier) {
        assert.equal(specifier, './entity-world.mjs');
        imports++;
        if (failed) throw new Error('Simulated module-load failure');
        return imported;
      }
    });
    await loader.runInContext(sandbox);
    assert.equal(imports, 1);
    assert.equal(nodes['profile-directory'].hidden, false);
    assert.equal(nodes['world-loading'].hidden, failed);
    assert.equal(nodes['world-error'].hidden, !failed);
    if (failed) {
      nodes['world-retry'].onclick();
      nodes['world-fallback'].onclick();
      assert.equal(reloads, 1);
      assert.equal(scrolls, 1);
    }
  }
  process.stdout.write('Controller regression checks passed.\n');
}

test('the controller preserves invalid storage and bounded moments; loader failure restores static profiles', () => {
  const output = execFileSync(process.execPath, [
    '--experimental-vm-modules', '--no-warnings', '-e',
    `(${controllerRegression.toString()})().catch(error => { console.error(error); process.exitCode = 1; });`
  ], { cwd: root, encoding: 'utf8', timeout: 20000 });
  assert.match(output, /Controller regression checks passed/);
});
