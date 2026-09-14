const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const assets = name => fs.readFileSync(path.join(__dirname, '../assets', name), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '../snapshot/index.html'), 'utf8');
const ACCOUNT = '0x' + 'Aa'.repeat(20);
const NEXT_ACCOUNT = '0x' + 'bB'.repeat(20);
const SOURCE = 'EXPLICIT_LOCAL_SOURCE_BYTES_7a391b — not an exported payload';
const SOURCE_NAME = 'private-source-name-7a391b.txt';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

// A deliberately small DOM supports the production scripts' observed surface.
// IDs and declared attributes come from the real page; no browser or extension runs.
class Element {
  constructor(tag = 'div', attrs = {}, text = '') {
    this.tag = tag; this.attrs = {}; this.children = []; this.listeners = {};
    this.dataset = {}; this.value = ''; this.hidden = false; this.disabled = false;
    this.files = []; this.textContent = text;
    const classes = new Set();
    this.classList = {add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name)};
    for (const [key, value] of Object.entries(attrs)) this.setAttribute(key, value);
  }
  get textContent() { return this.children.map(node => node.textContent).join(''); }
  set textContent(value) {
    this.children = [];
    if (value) this.append({nodeValue: String(value), get textContent() { return this.nodeValue; }});
  }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(key, value) {
    this.attrs[key] = String(value);
    if (key === 'hidden' || key === 'disabled') this[key] = true;
    if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }
  getAttribute(key) { return this.attrs[key] ?? null; }
  hasAttribute(key) { return Object.hasOwn(this.attrs, key); }
  removeAttribute(key) { delete this.attrs[key]; if (key === 'hidden' || key === 'disabled') this[key] = false; }
  get href() { return this.getAttribute('href'); }
  set href(value) { this.setAttribute('href', value); }
  get options() { return this.tag === 'select' ? this.children : undefined; }
  matches(selectors) {
    return selectors.split(',').some(selector => {
      const match = selector.trim().match(/^([\w-]+)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/);
      return match && (!match[1] || this.tag === match[1]) && (!match[2] || (this.hasAttribute(match[2]) && (match[3] === undefined || this.getAttribute(match[2]) === match[3])));
    });
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); }
  addEventListener(name, callback) { (this.listeners[name] ??= []).push(callback); }
  emit(name, options = {}) { return Promise.all((this.listeners[name] ?? []).map(callback => callback({type: name, target: this, preventDefault() {}, ...options}))); }
}

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([\w-]+)="([^"]*)"/g)) result[match[1]] = match[2];
  for (const name of ['hidden', 'disabled', 'data-language-in-place']) if (new RegExp('(?:^|\\s)' + name + '(?:\\s|$)').test(source)) result[name] = '';
  return result;
}

function setup({pause = null, secure = true, providerAvailable = true} = {}) {
  const ids = {}, html = new Element('html', attributes(page.match(/<html\b([^>]*)>/)[1]));
  const body = new Element('body'); html.append(body);
  for (const match of page.matchAll(/<([a-z][\w-]*)\b([^>]*\bid="([^"]+)"[^>]*)>([^<]*)/g)) {
    assert.equal(Object.hasOwn(ids, match[3]), false, 'fixture requires unique page IDs');
    const node = new Element(match[1], attributes(match[2]), match[4]);
    ids[match[3]] = node; body.append(node);
  }
  for (const match of page.matchAll(/<button\b([^>]*\bdata-set-lang="[^"]+"[^>]*)>([^<]*)/g)) body.append(new Element('button', attributes(match[1]), match[2]));
  const all = () => {
    const result = [];
    function visit(node) { result.push(node); for (const child of node.children ?? []) visit(child); }
    visit(html); return result;
  };
  const ready = [], windowListeners = {}, providerListeners = {};
  const calls = {requests: [], digest: [], random: 0, fileReads: 0, fetch: 0, discovered: 0};
  const blobs = new Map(), created = [], revoked = [], assigned = [];
  const entered = deferred(), release = deferred();
  let paused = false;
  async function boundary(name) {
    if (name === pause && !paused) { paused = true; entered.resolve(); await release.promise; }
  }
  const provider = {
    async request({method}) {
      calls.requests.push(method);
      if (method === 'eth_requestAccounts') return [ACCOUNT];
      if (method === 'eth_chainId') return '0xA';
      throw new Error('Unexpected provider method: ' + method);
    },
    on(name, callback) { (providerListeners[name] ??= new Set()).add(callback); },
    removeListener(name, callback) { providerListeners[name]?.delete(callback); },
    emit(name, value) { for (const callback of [...(providerListeners[name] ?? [])]) callback(value); }
  };
  class SyntheticURL extends URL {
    static createObjectURL(blob) { const url = 'blob:https://juri-halveth.github.io/snapshot-' + (created.length + 1); blobs.set(url, blob); created.push(url); return url; }
    static revokeObjectURL(url) { revoked.push(url); blobs.delete(url); }
  }
  class SyntheticEvent { constructor(type, options = {}) { this.type = type; Object.assign(this, options); } }
  const document = {
    documentElement: html, body, readyState: 'loading', baseURI: 'https://juri-halveth.github.io/halveth-scarlet/snapshot/',
    addEventListener(type, callback) { assert.equal(type, 'DOMContentLoaded'); ready.push(callback); },
    getElementById: id => ids[id] ?? null,
    querySelectorAll: selector => all().filter(node => node instanceof Element && (selector === '*' || node.matches(selector))),
    createElement: tag => new Element(tag),
    createTreeWalker() {
      const texts = all().filter(node => !(node instanceof Element)); let index = 0;
      return {nextNode() { this.currentNode = texts[index++]; return Boolean(this.currentNode); }};
    }
  };
  const window = {
    isSecureContext: secure, Event: SyntheticEvent,
    ethereum: providerAvailable ? provider : undefined,
    location: {href: document.baseURI + '?lang=de', assign: url => assigned.push(url)},
    addEventListener(name, callback) { (windowListeners[name] ??= new Set()).add(callback); },
    removeEventListener(name, callback) { windowListeners[name]?.delete(callback); },
    dispatchEvent(event) {
      if (event.type === 'eip6963:requestProvider') calls.discovered++;
      for (const callback of [...(windowListeners[event.type] ?? [])]) callback(event);
      return true;
    }
  };
  window.history = {state: {}, replaceState(state, unused, url) { window.location.href = url; }};
  const localCrypto = {
    subtle: {async digest(algorithm, bytes) {
      const index = calls.digest.push(Buffer.from(bytes));
      await boundary(index === 1 ? 'sourceHash' : index === 2 ? 'recordHash' : 'laterHash');
      return crypto.webcrypto.subtle.digest(algorithm, bytes);
    }},
    getRandomValues(bytes) { calls.random++; return bytes.fill(calls.random); }
  };
  window.crypto = localCrypto;
  const context = vm.createContext({window, document, URL: SyntheticURL, Event: SyntheticEvent, CustomEvent: SyntheticEvent,
    NodeFilter: {SHOW_TEXT: 4}, localStorage: {getItem: () => null, setItem() {}}, navigator: {language: 'de-DE'},
    crypto: localCrypto, TextEncoder, Blob, Uint8Array, Date,
    fetch() { calls.fetch++; throw new Error('Unexpected network access'); }});
  for (const name of ['english.js', 'language.js', 'snapshot-core.js', 'wallet-connection.js', 'snapshot.js']) vm.runInContext(assets(name), context, {filename: name});
  for (const callback of ready) callback();
  function file(text = SOURCE, options = {}) {
    const bytes = Buffer.from(text);
    return {name: SOURCE_NAME, size: bytes.length, type: 'text/plain', ...options,
      async arrayBuffer() { calls.fileReads++; await boundary('file'); return Uint8Array.from(bytes).buffer; }};
  }
  return {ids, document, window, provider, calls, blobs, created, revoked, assigned, entered: entered.promise, release: release.resolve, file,
    async choose(chosen = file()) { ids['snapshot-file'].files = [chosen]; await ids['snapshot-file'].emit('change'); },
    submit: () => ids['snapshot-form'].emit('submit'),
    async select() { ids['wallet-provider'].value = 'legacy'; await ids['wallet-provider'].emit('change'); },
    async connect() { ids['wallet-provider'].value = 'legacy'; await ids['wallet-provider'].emit('change'); await ids['wallet-connect'].emit('click'); },
    language: lang => window.HalvethLanguage.set(lang),
    pageEvent: type => window.dispatchEvent(new SyntheticEvent(type, {persisted: true})),
    receipt: () => JSON.parse(ids['receipt-json'].textContent)
  };
}

function assertCleared(h) {
  assert.equal(h.ids['download-receipt'].href, '#receipt-title');
  assert.equal(h.ids['receipt-content'].hidden, true);
  assert.equal(h.ids['receipt-empty'].hidden, false);
  assert.equal(h.ids['receipt-json'].textContent, '');
  assert.equal(h.document.body.classList.contains('receipt-ready'), false);
}

const changes = {
  async label(h) { h.ids['snapshot-label'].value = 'Changed label'; await h.ids['snapshot-label'].emit('input'); },
  async file(h) { await h.choose(h.file('Different explicitly chosen source')); },
  async account(h) { h.provider.emit('accountsChanged', [NEXT_ACCOUNT]); },
  async chain(h) { h.provider.emit('chainChanged', '0x2a'); }
};

test('page loading, discovery, selection and local hashing make no account request before Connect', async () => {
  const h = setup();
  assert.equal(h.calls.discovered, 1); assert.deepEqual(h.calls.requests, []);
  assert.equal(h.ids['prepare-snapshot'].disabled, true);
  await h.ids['wallet-refresh'].emit('click'); await h.select(); await h.choose(); await h.submit();
  assert.deepEqual(h.calls.requests, []); assert.equal(h.calls.fetch, 0);
  assert.equal(h.receipt().record.wallet.account, null); assert.equal(h.receipt().record.wallet.chainId, null);
  await h.ids['wallet-connect'].emit('click');
  assert.deepEqual(h.calls.requests, ['eth_requestAccounts', 'eth_chainId']);
  assertCleared(h); assert.equal(h.ids['wallet-account'].textContent, ACCOUNT);
  await h.submit();
  assert.equal(h.receipt().record.wallet.account, ACCOUNT.toLowerCase());
  assert.equal(h.receipt().record.wallet.chainId, '0xa');
  assert.deepEqual(h.calls.requests, ['eth_requestAccounts', 'eth_chainId']);
});

test('download is the displayed local receipt, commits both exact byte sequences and omits source contents and filename', async () => {
  const h = setup({providerAvailable: false}); await h.choose(); await h.submit();
  const link = h.ids['download-receipt'], blob = h.blobs.get(link.href), json = await blob.text(), receipt = JSON.parse(json);
  assert.equal(blob.type, 'application/json'); assert.equal(json, h.ids['receipt-json'].textContent);
  assert.equal(receipt.status, 'LOCAL_SNAPSHOT_NOT_MINTED'); assert.equal(receipt.statement, receipt.status);
  assert.equal(receipt.record.status, receipt.status); assert.equal(receipt.record.stage, 'LOCAL_DRAFT');
  assert.deepEqual(receipt.record.mint, {contract: null, tokenId: null, txHash: null});
  assert.equal(receipt.sourceSha256, hash(Buffer.from(SOURCE)));
  assert.equal(receipt.recordSha256, hash(Buffer.from(receipt.canonicalRecord, 'utf8')));
  assert.equal(receipt.record.source.byteLength, Buffer.byteLength(SOURCE));
  assert.equal(json.includes(SOURCE), false); assert.equal(json.includes(Buffer.from(SOURCE).toString('base64')), false); assert.equal(json.includes(SOURCE_NAME), false);
  assert.deepEqual(Object.keys(receipt.record.source).sort(), ['byteLength', 'label', 'mediaType', 'sha256']);
  assert.equal(h.calls.digest.length, 2); assert.equal(h.calls.random, 1);
  assert.equal(h.calls.digest[0].equals(Buffer.from(SOURCE)), true);
  assert.equal(h.calls.digest[1].equals(Buffer.from(receipt.canonicalRecord, 'utf8')), true);
  assert.equal(link.download, 'halveth-snapshot-' + receipt.recordSha256.slice(0, 12) + '.json');
  assert.equal(h.calls.fetch, 0); assert.deepEqual(h.calls.requests, []);
});

for (const [name, change] of Object.entries(changes)) {
  test(name + ' change clears a completed receipt and revokes its download', async () => {
    const h = setup(); await h.connect(); await h.choose(); await h.submit();
    const oldURL = h.ids['download-receipt'].href;
    await change(h); assertCleared(h); assert.deepEqual(h.revoked, [oldURL]);
    assert.equal(h.ids['prepare-snapshot'].disabled, false);
    await h.submit();
    const record = h.receipt().record;
    if (name === 'label') assert.equal(record.source.label, 'Changed label');
    if (name === 'file') assert.equal(record.source.sha256, hash(Buffer.from('Different explicitly chosen source')));
    if (name === 'account') assert.equal(record.wallet.account, NEXT_ACCOUNT.toLowerCase());
    if (name === 'chain') assert.equal(record.wallet.chainId, '0x2a');
    assert.notEqual(h.ids['download-receipt'].href, oldURL);
  });
  for (const pause of ['file', 'sourceHash', 'recordHash']) {
    test(name + ' change invalidates work pending at ' + pause, async () => {
      const h = setup({pause}); await h.connect(); await h.choose();
      const pending = h.submit(); await h.entered;
      assert.equal(h.ids['prepare-snapshot'].disabled, true);
      await change(h); assertCleared(h); assert.equal(h.ids['prepare-snapshot'].disabled, false);
      h.release(); await pending; assertCleared(h);
      assert.equal(h.created.length, 0); assert.equal(h.ids['prepare-snapshot'].disabled, false);
      assert.match(h.ids['snapshot-status'].textContent, name === 'file' ? /Datei gewählt/ : /Angaben geändert/);
    });
  }
}

test('an older hash completion cannot replace a newer finished receipt', async () => {
  const h = setup({pause: 'sourceHash'}); await h.choose();
  const old = h.submit(); await h.entered;
  await changes.label(h); await h.submit();
  const receipt = h.ids['receipt-json'].textContent, url = h.ids['download-receipt'].href;
  h.release(); await old;
  assert.equal(h.ids['receipt-json'].textContent, receipt); assert.equal(h.ids['download-receipt'].href, url);
  assert.equal(h.created.length, 1); assert.deepEqual(h.revoked, []);
  assert.equal(h.ids['prepare-snapshot'].disabled, false); assert.equal(h.receipt().record.source.label, 'Changed label');
});

test('language changes preserve the exact receipt, download and literal user label', async () => {
  const h = setup(); await h.connect(); await h.choose();
  h.ids['snapshot-label'].value = 'Hallo · <b>literal label</b>'; await h.ids['snapshot-label'].emit('input'); await h.submit();
  const json = h.ids['receipt-json'].textContent, url = h.ids['download-receipt'].href;
  for (const lang of ['en', 'de', 'en']) {
    h.language(lang); assert.equal(h.ids['receipt-json'].textContent, json); assert.equal(h.ids['download-receipt'].href, url);
    assert.equal(h.ids['receipt-title'].textContent, 'Hallo · <b>literal label</b>');
    assert.equal(h.ids['snapshot-label'].value, 'Hallo · <b>literal label</b>');
  }
  assert.match(h.ids['snapshot-status'].textContent, /Your receipt is ready/);
  assert.equal(h.calls.digest.length, 2); assert.equal(h.created.length, 1); assert.deepEqual(h.revoked, []); assert.deepEqual(h.assigned, []);
});

test('language changes preserve pending work and render the eventual status in the selected language', async () => {
  const h = setup({pause: 'recordHash'}); await h.choose();
  const pending = h.submit(); await h.entered;
  const canonical = h.calls.digest[1].toString('utf8');
  h.language('en'); assert.match(h.ids['snapshot-status'].textContent, /Creating your imprint/); assert.equal(h.ids['prepare-snapshot'].disabled, true);
  h.release(); await pending;
  assert.equal(h.receipt().canonicalRecord, canonical); assert.equal(h.receipt().recordSha256, hash(Buffer.from(canonical)));
  assert.match(h.ids['snapshot-status'].textContent, /Your receipt is ready/); assert.equal(h.ids['record-wallet'].textContent, 'Without wallet');
  assert.equal(h.calls.digest.length, 2); assert.equal(h.created.length, 1);
});

test('disconnect clears the receipt and keeps the explicit disconnected message across languages', async () => {
  const h = setup(); await h.connect(); await h.choose(); await h.submit();
  const oldURL = h.ids['download-receipt'].href;
  await h.ids['wallet-disconnect'].emit('click'); assertCleared(h); assert.deepEqual(h.revoked, [oldURL]);
  assert.match(h.ids['wallet-status'].textContent, /Seitenzuordnung getrennt/);
  h.language('en'); assert.match(h.ids['wallet-status'].textContent, /Page association cleared/);
  h.language('de'); assert.match(h.ids['wallet-status'].textContent, /Seitenzuordnung getrennt/);
  await h.submit(); assert.equal(h.receipt().record.wallet.account, null); assert.equal(h.receipt().record.wallet.chainId, null);
  assert.deepEqual(h.calls.requests, ['eth_requestAccounts', 'eth_chainId']);
});

test('BFCache pagehide invalidates a wallet-free pending hash and allows a fresh receipt after pageshow', async () => {
  const h = setup({pause: 'sourceHash', providerAvailable: false}); await h.choose();
  const old = h.submit(); await h.entered;
  h.pageEvent('pagehide'); h.pageEvent('pageshow'); assertCleared(h);
  assert.equal(h.ids['prepare-snapshot'].disabled, false);
  h.release(); await old; assertCleared(h); assert.equal(h.created.length, 0);
  await h.submit(); assert.equal(h.receipt().status, 'LOCAL_SNAPSHOT_NOT_MINTED'); assert.equal(h.calls.requests.length, 0);
});

test('BFCache pagehide revokes a finished receipt and allows a new one on return', async () => {
  const h = setup({providerAvailable: false}); await h.choose(); await h.submit();
  const oldURL = h.ids['download-receipt'].href;
  h.pageEvent('pagehide'); h.pageEvent('pageshow'); assertCleared(h); assert.deepEqual(h.revoked, [oldURL]);
  assert.equal(h.ids['prepare-snapshot'].disabled, false);
  h.language('en'); await h.submit(); assert.notEqual(h.ids['download-receipt'].href, oldURL);
  assert.match(h.ids['snapshot-status'].textContent, /Your receipt is ready/);
});

test('oversized and mismatched file lengths cannot produce a receipt; unavailable crypto disables creation', async () => {
  const h = setup({providerAvailable: false});
  await h.choose(h.file('small', {size: 10 * 1024 * 1024 + 1})); await h.submit();
  assert.equal(h.calls.fileReads, 0); assert.equal(h.ids['prepare-snapshot'].disabled, true); assertCleared(h);
  await h.choose(h.file('small', {size: 99})); await h.submit();
  assert.equal(h.calls.digest.length, 0); assertCleared(h); assert.match(h.ids['snapshot-status'].textContent, /konnte nicht erstellt/);
  const insecure = setup({secure: false, providerAvailable: false}); await insecure.choose(); await insecure.submit();
  assert.equal(insecure.calls.fileReads, 0); assert.equal(insecure.ids['prepare-snapshot'].disabled, true); assertCleared(insecure);
  assert.match(insecure.ids['snapshot-status'].textContent, /nicht verfügbar/);
});
