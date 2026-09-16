const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.join(__dirname, '..');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/universe-data.js'), 'utf8'), context);
const registry = context.window.HalvethUniverse;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

test('generated profile artifacts match the current registry and editorial source dossiers', () => {
  const output = execFileSync(process.execPath, ['tools/build_profiles.mjs', '--check'], {cwd: root, encoding: 'utf8'});
  assert.match(output, new RegExp(`Verified ${registry.entities.length} bilingual entity profiles`));
});
test('all entities have a distinct static bilingual profile, editable dossier and real source links', () => {
  const destinations = new Set();
  for (const entity of registry.entities) {
    assert.equal(entity.profilePath, `entities/${entity.id}/`);
    destinations.add(entity.profilePath);
    const html = read(`${entity.profilePath}index.html`);
    const dossier = read(`docs/entities/${entity.id}.md`);
    assert.ok(html.includes(`data-entity-id="${entity.id}"`));
    assert.ok(decode(html).includes(`<h1>${entity.label}</h1>`));
    assert.match(html, /<div data-lang="de" lang="de">/);
    assert.match(html, /<div data-lang="en" lang="en">/);
    assert.ok(decode(html).includes(entity.role));
    assert.ok(decode(html).includes(entity.en.role));
    assert.match(dossier, /## Deutsch[\s\S]+### Geschichte und These[\s\S]+## English[\s\S]+### Story and thesis/);
    assert.match(dossier, /### Weiterlesen[\s\S]+### Read more/);
    assert.doesNotMatch(html, /<h2>(?:Weiterlesen|Read more|Further reading)<\/h2>/);
    assert.equal([...html.matchAll(/class="profile-sources"/g)].length, 1);
    assert.ok(html.includes(`https://github.com/Juri-Halveth/halveth-scarlet/blob/main/docs/entities/${entity.id}.md`));
    assert.ok(entity.sourceRefs.length >= 2);
  }
  assert.equal(destinations.size, registry.entities.length);
});
test('directory and static home orbiters reach their exact entity destinations without JavaScript', () => {
  const directory = read('entities/index.html');
  for (const entity of registry.entities) assert.ok(directory.includes(`href="${entity.id}/"`), entity.id);
  const tags = [...read('index.html').matchAll(/<a class="figure"[^>]+>/g)];
  assert.equal(tags.length, 12);
  for (const [tag] of tags) {
    const id = /data-figure="([^"]+)"/.exec(tag)[1];
    assert.ok(tag.includes(`href="entities/${id}/"`));
  }
});
test('every local profile asset, companion route and source fragment exists', () => {
  const files = ['entities/index.html', ...registry.entities.map(entity => entity.profilePath + 'index.html')];
  const base = new URL(registry.site);
  for (const file of files) {
    const html = read(file);
    for (const [, encoded] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(decode(encoded), new URL(file, base));
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) continue;
      let relative = decodeURIComponent(url.pathname.slice(base.pathname.length));
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      assert.ok(fs.existsSync(path.join(root, relative)), `${file}: ${relative}`);
      if (url.hash && url.hash !== '#team' && relative.endsWith('.html')) {
        assert.ok(read(relative).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${file}: ${relative}${url.hash}`);
      }
    }
  }
});
test('VERACHEL retains its interactive field and Mira has its documented history rather than a fabricated biography', () => {
  const verachel = read('entities/verachel/index.html');
  assert.match(verachel, /<details class="profile-names" id="name-field">/);
  assert.match(verachel, /id="name-search"/);
  assert.equal([...verachel.matchAll(/class="profile-signal"/g)].length, registry.verachelNameField.highlights.length);
  assert.ok(verachel.includes('assets/entity-profile.js'));
  const mira = read('docs/entities/mira.md');
  assert.match(mira, /neun historischen Projektlinsen/);
  assert.match(mira, /Mita aus MiSide/);
  assert.match(read('docs/entities/ironman.md'), /Redaktioneller Ansatz/);
});
test('profile and name search update visible entries and accessible counts', () => {
  const entries = [
    {dataset: {search: 'mira transitions'}, hidden: false},
    {dataset: {search: 'dormammu questions'}, hidden: false}
  ];
  const nameEntries = [{dataset:{name:'MIRA'},hidden:false},{dataset:{name:'ROSA'},hidden:false}];
  const inputs = Object.fromEntries(['profile-search','name-search'].map(id => [id,{value:'',addEventListener(type,fn){this[type]=fn;}}]));
  const statuses = {'profile-results':{},'name-results':{}};
  const events = [];
  const document = {documentElement:{lang:'en'},getElementById:id=>inputs[id]||statuses[id],querySelectorAll:selector=>selector==='.profile-grid > li'?entries:nameEntries};
  const window = {HalvethLanguage:{get:()=>'en'},addEventListener(_type,fn){events.push(fn);}};
  vm.runInNewContext(read('assets/entity-profile.js'),{window,document});
  inputs['profile-search'].value='MIRA';inputs['profile-search'].input();
  assert.deepEqual(entries.map(entry=>entry.hidden),[false,true]);
  assert.equal(statuses['profile-results'].textContent,'1 of 2 entries');
  inputs['name-search'].value='rosa';inputs['name-search'].input();
  assert.deepEqual(nameEntries.map(entry=>entry.hidden),[true,false]);
  inputs['profile-search'].value='unknown';inputs['profile-search'].input();
  assert.equal(statuses['profile-results'].textContent,'0 of 2 entries');
});
