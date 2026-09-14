const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'assets', 'universe.js'), 'utf8');

class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.listeners = {};
    this.open = false;
    this.textContent = '';
    this.style = {setProperty: (name, value) => { (this.styles ||= {})[name] = value; }};
  }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  emit(type, event = {}) { for (const callback of this.listeners[type] || []) callback(event); }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; this.textContent = ''; }
  focus() { this.focused = true; }
  setAttribute(name, value) { this[name] = String(value); }
  showModal() { this.open = true; }
  close() { if (!this.open) return; this.open = false; this.emit('close'); }
}

function harness(initialHash = '') {
  const selectors = [
    '.scene', '#entity-dialog', '#entity-title', '#entity-kind', '#entity-role',
    '#entity-body', '#entity-source', '#entity-read', '#entity-reddit', '#entity-list',
    '#reddit-note', '.entity-directory', '#entity-filter', '#garden-open',
    '#entity-close', '#directory-count', '#empty-directory', '#verachel-name-field',
    '#verachel-name-eyebrow', '#verachel-name-title', '#verachel-name-description',
    '#verachel-signal-grid', '#verachel-micro-label', '#verachel-micro-field',
    '#verachel-list-label', '#verachel-list', '#verachel-name-note',
    '.constellation-left', '.constellation-right'
  ];
  const elements = Object.fromEntries(selectors.map(selector => [selector, new Element()]));
  const hashListeners = [];
  const microtasks = [];
  const location = {
    hash: initialHash,
    href: `https://example.test/?lang=en${initialHash}`
  };
  const history = {
    state: null,
    replacements: [],
    replaceState(state, title, url) {
      this.replacements.push(String(url));
      location.href = String(url);
      location.hash = new URL(String(url)).hash;
    }
  };
  const document = {
    querySelector: selector => elements[selector] || null,
    querySelectorAll: () => [],
    createElement: tag => { const element = new Element(); element.tagName = tag.toUpperCase(); return element; }
  };
  const entities = ['juri', 'mira', 'verachel'].map(id => ({
    id,
    label: id.toUpperCase(),
    role: `${id} role`,
    kind: 'PROJECT ROLE',
    section: 'garden',
    sourceLabel: `${id} source`,
    en: {}
  }));
  const window = {
    HalvethLanguage: { t: value => value, get: () => 'en', link: value => value },
    HalvethUniverse: {
      entities,
      featured: ['verachel', 'juri'],
      verachelNameField: {
        highlights: Array.from({length: 10}, (_, index) => ({label: index ? `SIGNAL ${index}` : 'ANDREA BOTEZ', code: index ? `S·${index}` : 'A·N·D·R·E·A / B·O·T·E·Z', tone: '#ff9acb', sourceState: 'OPEN_DISPLAY_TOKEN'})),
        microNames: ['ADA', 'MIRA', 'A', 'Z', '∞'],
        en: {eyebrow: 'VERACHEL · OPEN NAME FIELD', title: 'Every letter may glow.', description: 'Ten signals.', doorLabel: 'Open name field', microLabel: 'Open field', listLabel: 'Show all', sourceNote: 'No identity claim.'},
        de: {eyebrow: '', title: '', description: '', doorLabel: '', microLabel: '', listLabel: '', sourceNote: ''}
      },
      site: 'https://example.test/',
      redditDestination: 'https://www.reddit.com/user/Halveth-Juri/'
    },
    HalvethRedditTunnel: { validDestination: value => value || null, bind() {} },
    addEventListener(type, callback) { if (type === 'hashchange') hashListeners.push(callback); }
  };
  vm.runInNewContext(script, {
    window, document, location, history, URL,
    queueMicrotask: callback => microtasks.push(callback)
  });
  return {
    elements, location, history,
    flush: () => { while (microtasks.length) microtasks.shift()(); },
    hashchange: hash => { location.hash = hash; for (const callback of hashListeners) callback(); }
  };
}

test('the team deep link opens JURI and all existing cards, then Back closes it', () => {
  const h = harness('#team');
  h.flush();
  assert.equal(h.elements['#entity-dialog'].open, true);
  assert.equal(h.elements['#entity-title'].textContent, 'JURI');
  assert.equal(h.elements['.entity-directory'].open, true);
  assert.equal(h.elements['#entity-list'].children.length, 3);

  h.hashchange('');
  assert.equal(h.elements['#entity-dialog'].open, false);
});

test('closing the team deep link clears its hash so the same link can open again', () => {
  const h = harness('#team');
  h.flush();
  h.elements['#entity-close'].emit('click');
  assert.equal(h.location.hash, '');
  assert.equal(h.history.replacements.length, 1);

  h.hashchange('#team');
  assert.equal(h.elements['#entity-dialog'].open, true);
  assert.equal(h.elements['#entity-title'].textContent, 'JURI');
});

test('the existing Garden button still opens MIRA without changing the URL', () => {
  const h = harness();
  h.elements['#garden-open'].emit('click');
  assert.equal(h.elements['#entity-dialog'].open, true);
  assert.equal(h.elements['#entity-title'].textContent, 'MIRA');
  assert.equal(h.location.hash, '');
  assert.equal(h.history.replacements.length, 0);
});

test('VERACHEL opens a ten-signal name field and other entities hide it', () => {
  const h = harness();
  h.elements['#entity-list'].children.find(button => button.textContent === 'VERACHEL').emit('click');
  assert.equal(h.elements['#entity-title'].textContent, 'VERACHEL');
  assert.equal(h.elements['#verachel-name-field'].hidden, false);
  assert.equal(h.elements['#verachel-signal-grid'].children.length, 10);
  assert.equal(h.elements['#verachel-signal-grid'].children[0].textContent, 'ANDREA BOTEZ');
  assert.equal(h.elements['#verachel-signal-grid'].children[0].dataset.code, 'A·N·D·R·E·A / B·O·T·E·Z');
  assert.match(h.elements['#verachel-micro-field'].textContent, /ADA · MIRA · A · Z · ∞/);
  assert.equal(h.elements['#verachel-list'].children.length, 5);
  h.elements['#entity-list'].children.find(button => button.textContent === 'MIRA').emit('click');
  assert.equal(h.elements['#verachel-name-field'].hidden, true);
});

test('the floating VERACHEL bubble is the dialog door while other bubbles remain links', () => {
  const h = harness();
  const door = h.elements['.constellation-left'].children[0];
  const tunnel = h.elements['.constellation-right'].children[0];
  assert.equal(door.tagName, 'BUTTON');
  assert.equal(door['aria-haspopup'], 'dialog');
  assert.equal(door['aria-controls'], 'entity-dialog');
  assert.equal(door['aria-label'], 'VERACHEL · Open name field');
  door.emit('click');
  assert.equal(h.elements['#entity-title'].textContent, 'VERACHEL');
  assert.equal(h.elements['#entity-dialog'].open, true);
  assert.equal(tunnel.tagName, 'A');
  assert.equal(tunnel.href, 'https://www.reddit.com/user/Halveth-Juri/');
});

test('searching Andrea keeps only the VERACHEL card visible', () => {
  const h = harness();
  h.elements['#entity-filter'].emit('input', {target: {value: 'Andrea'}});
  const cards = h.elements['#entity-list'].children;
  assert.equal(cards.find(button => button.textContent === 'VERACHEL').hidden, false);
  assert.equal(cards.find(button => button.textContent === 'JURI').hidden, true);
  assert.equal(cards.find(button => button.textContent === 'MIRA').hidden, true);
  assert.equal(h.elements['#empty-directory'].hidden, true);
});
