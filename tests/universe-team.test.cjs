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
  }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  emit(type, event = {}) { for (const callback of this.listeners[type] || []) callback(event); }
  append(child) { this.children.push(child); }
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
    '#entity-close', '#directory-count', '#empty-directory'
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
    createElement: () => new Element()
  };
  const entities = ['juri', 'mira'].map(id => ({
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
      featured: [],
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
  assert.equal(h.elements['#entity-list'].children.length, 2);

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
