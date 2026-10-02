import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeWorldEvent } from '../assets/world-events.mjs';

const html = fs.readFileSync(new URL('../entities/index.html', import.meta.url), 'utf8');
let moduleId = 0;
const event = (n, kind = 'GIFT_DEMO') => makeWorldEvent({
  id: `abcdef01-2345-4678-9abc-${String(n).padStart(12, '0')}`,
  createdAt: '2026-10-02T12:34:56.789Z', displayName: 'Synthetic viewer',
  kind, item: 'chocolate', message: `Synthetic message ${n}`
});

// Exercise the production controller with a minimal DOM and synthetic transport.
// No real browser, wallet, listener or network request is created by these tests.
class Element {
  constructor() {
    this.children = []; this.listeners = new Map(); this.attributes = new Map();
    this.hidden = false; this.value = ''; this.textContent = ''; this.dataset = {};
    const classes = new Set();
    this.classList = { toggle(name, active) { active ? classes.add(name) : classes.delete(name); } };
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  async fire(type, extra = {}) {
    for (const callback of this.listeners.get(type) || []) await callback({ preventDefault() {}, ...extra });
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  querySelector(selector) { return this.parts?.[selector] || null; }
  click() {}
}

async function setup(t) {
  const ids = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], new Element()]));
  const get = id => { assert.ok(ids.has(id), `real page contains ${id}`); return ids.get(id); };
  get('world-canvas').dataset.state = 'READY';
  get('world-canvas').parts = { canvas: new Element() };
  get('studio-chat-form').parts = { button: new Element() };
  get('studio-name').value = 'Synthetic viewer';
  const window = new Element(), gifts = [], requests = [], streams = [], blobs = [], timers = new Map();
  window.HalvethLanguage = { get: () => 'en' };
  window.matchMedia = () => ({ matches: false });
  window.dispatchEvent = message => { if (message.type === 'halveth:world-gift') gifts.push(message.detail); };
  class EventSource extends Element {
    constructor(url) { super(); this.url = url; streams.push(this); }
    close() { this.closed = true; }
    emit(type, data) { return this.fire(type, { data: JSON.stringify(data) }); }
  }
  class ExportURL extends URL {
    static createObjectURL(blob) { blobs.push(blob); return 'blob:synthetic'; }
    static revokeObjectURL() {}
  }
  let respond = async () => { throw new Error('Unexpected POST'); };
  const replacements = {
    document: { getElementById: get, createElement: () => new Element(), body: new Element() },
    window, location: new URL('http://127.0.0.1:8842/entities/'), EventSource, URL: ExportURL,
    MutationObserver: class { observe() {} disconnect() {} },
    setTimeout: callback => { const id = timers.size + 1; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
    fetch: async (...args) => { requests.push(args); return respond(...args); }
  };
  const originals = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(async () => {
    try { await window.fire('pagehide'); }
    finally {
      for (const [key, descriptor] of Object.entries(originals)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  await import(`../assets/entity-world-studio.mjs?flow-test=${++moduleId}`);
  return {
    get, gifts, requests, streams,
    setResponse(handler) { respond = handler; },
    async connect() { await get('studio-relay').fire('click'); return streams.at(-1); },
    async export() { await get('studio-export').fire('click'); return JSON.parse(await blobs.at(-1).text()); }
  };
}

const snapshot = (instanceId, events) => ({
  instanceId, sequence: events.length,
  events: events.map((event, index) => ({ sequence: index + 1, deliveryId: event.id, receivedAt: event.createdAt, event }))
});

test('connecting retains preview events and adds room events to one shared view without uploading the preview', async t => {
  const ui = await setup(t);
  await ui.get('studio-create').fire('click');
  ui.get('studio-message').value = 'Synthetic preview message';
  await ui.get('studio-chat-form').fire('submit');
  const preview = await ui.export();
  assert.equal(preview.mode, 'BROWSER_PREVIEW'); assert.equal(preview.events.length, 2);
  const stream = await ui.connect(), room = [event(1), event(2, 'CHAT')];
  await stream.emit('snapshot', snapshot('room-one', room));
  const combined = await ui.export();
  assert.equal(combined.mode, 'LOOPBACK_DEMO');
  assert.deepEqual(combined.events, [...preview.events, ...room]);
  assert.equal(ui.get('studio-mode').textContent, 'LOCAL ROOM');
  assert.equal(ui.get('studio-events').children.length, 2);
  assert.equal(ui.get('studio-messages').children.length, 2);
  assert.equal(ui.gifts.length, 2); assert.equal(ui.requests.length, 0);
});

test('reconnect restores existing appearances and adds new deliveries to the same shared view', async t => {
  const ui = await setup(t), stream = await ui.connect(), first = event(1);
  await stream.emit('snapshot', snapshot('room-one', [first]));
  await stream.emit('world-event', { event: first, deliveryId: first.id });
  await stream.emit('snapshot', snapshot('room-one', [first]));
  assert.equal(ui.gifts.length, 1);
  stream.onerror();
  assert.equal(ui.get('studio-create').disabled, true);
  assert.deepEqual((await ui.export()).events, [first]);
  // A restarted relay adds its retained events; it does not reset the browser view.
  await stream.emit('snapshot', snapshot('room-two', [event(2)]));
  assert.deepEqual((await ui.export()).events, [first, event(2)]);
  assert.equal(ui.get('studio-create').disabled, false);
  assert.equal(ui.gifts.length, 2); assert.equal(ui.streams.length, 1);
});

test('one user action with both an SSE echo and a POST receipt creates one gift', async t => {
  const ui = await setup(t), stream = await ui.connect();
  await stream.emit('snapshot', snapshot('room-one', []));
  ui.setResponse(async (url, request) => {
    assert.equal(url, '/api/studio/events'); assert.equal(request.method, 'POST');
    const sent = JSON.parse(request.body);
    await stream.emit('world-event', { event: sent, deliveryId: sent.id });
    return { ok: true, json: async () => ({ state: 'RECEIVED_DEMO', eventId: sent.id, deliveryId: sent.id }) };
  });
  await ui.get('studio-create').fire('click');
  assert.equal(ui.requests.length, 1); assert.equal(ui.gifts.length, 1);
  assert.equal((await ui.export()).events.length, 1);
  assert.equal(ui.get('studio-create').disabled, false);
});

test('repeat button creates another appearance of the original impulse in the shared preview', async t => {
  const ui = await setup(t);
  assert.equal(ui.get('studio-repeat').disabled, true);
  await ui.get('studio-create').fire('click');
  await ui.get('studio-repeat').fire('click');
  await ui.get('studio-repeat').fire('click');
  const exported = await ui.export();
  assert.equal(exported.schema, 'halveth.studio-session.v2');
  assert.equal(exported.events.length, 1); assert.equal(exported.appearances.length, 3);
  assert.equal(ui.gifts.length, 3);
  assert.equal(new Set(ui.gifts.map(g => g.event.id)).size, 1);
  assert.equal(new Set(ui.gifts.map(g => g.appearanceId)).size, 3);
  assert.deepEqual(exported.appearances.map(a => a.occurrence), [1, 2, 3]);
  assert.equal(ui.get('studio-events').children.length, 3);
  assert.equal(ui.requests.length, 0);
});

test('new relay deliveries of the same impulse create more objects without splitting the journal', async t => {
  const ui = await setup(t), stream = await ui.connect(), source = event(1);
  await stream.emit('snapshot', snapshot('room-one', []));
  for (const n of [2, 3, 4]) await stream.emit('world-event', { event: source, deliveryId: event(n).id });
  assert.equal(ui.gifts.length, 3);
  const exported = await ui.export();
  assert.equal(exported.events.length, 1); assert.equal(exported.appearances.length, 3);
  assert.ok(exported.appearances.every(a => a.origin === 'LOOPBACK_DEMO'));
});
