// Run the actual tunnel script against a small DOM/timer boundary model.
// Dialog close events are queued separately so a stale close can be delivered
// after reopening. This is a regression test, not browser/render verification;
// location.assign is recorded locally and no network navigation is performed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/reddit-tunnel.js'), 'utf8');
const destination = 'https://www.reddit.com/user/Halveth-Juri/';

function harness({reducedMotion = false, paused = false} = {}) {
  let now = 0, sequence = 0;
  const timers = new Map(), closeEvents = [], navigations = [];

  class Element extends EventTarget {
    constructor(tagName) {
      super();
      this.tagName = tagName;
      this.children = [];
      this.attributes = new Map();
      this.open = false;
      this.target = '';
      this.dataset = {};
    }
    append(...nodes) { this.children.push(...nodes); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    showModal() { this.open = true; }
    close() {
      if (!this.open) return;
      this.open = false;
      closeEvents.push(() => this.dispatchEvent(new Event('close')));
    }
  }

  const body = new Element('body');
  const scene = {dataset: {motion: paused ? 'paused' : 'running'}};
  const window = new EventTarget();
  window.location = {assign(url) { navigations.push({url, at: now}); }};
  const context = vm.createContext({
    URL, window,
    document: {
      body,
      createElement(tagName) { return new Element(tagName); },
      querySelector(selector) {
        assert.equal(selector, '.scene', 'Unexpected DOM query');
        return scene;
      }
    },
    matchMedia(query) {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return {matches: reducedMotion};
    },
    setTimeout(fn, delay) {
      const id = ++sequence;
      timers.set(id, {fn, at: now + delay});
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(source, context, {filename: 'assets/reddit-tunnel.js'});
  const overlay = body.children.find(node => node.tagName === 'dialog');
  assert(overlay, 'The production script creates its dialog');
  const cancelButton = overlay.children.find(node => node.tagName === 'button');
  const heading = overlay.children.find(node => node.tagName === 'h2');
  const targetLink = overlay.children.find(node => node.tagName === 'a');

  function link(label = 'MIRA', options = {}) {
    const element = new Element('a');
    element.href = options.href || destination;
    element.target = options.target || '';
    window.HalvethRedditTunnel.bind(element, label);
    return element;
  }
  function click(element, options = {}) {
    const event = new Event(options.type || 'click', {cancelable: true});
    Object.assign(event, {
      button: options.button ?? 0,
      metaKey: options.metaKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false
    });
    if (options.defaultPrevented) event.preventDefault();
    element.dispatchEvent(event);
    return event;
  }
  function flushCloseEvents() {
    while (closeEvents.length) closeEvents.shift()();
  }
  function advance(ms) {
    const goal = now + ms;
    for (let count = 0; count < 100; count++) {
      const next = [...timers].filter(([, timer]) => timer.at <= goal)
        .sort(([idA, a], [idB, b]) => a.at - b.at || idA - idB)[0];
      if (!next) { now = goal; return; }
      const [id, timer] = next;
      now = timer.at;
      timers.delete(id);
      timer.fn();
    }
    throw new Error('Unexpected timer runaway');
  }

  return {overlay, cancelButton, heading, targetLink, window, timers,
    navigations, link, click, flushCloseEvents, advance};
}

test('An ordinary click opens the tunnel and navigates in the same window after exactly 720 ms', () => {
  const h = harness();
  const event = h.click(h.link('MIRA'));
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.overlay.open, true);
  assert.equal(h.heading.textContent, 'MIRA');
  assert.equal(h.targetLink.href, destination);
  assert.equal(h.timers.size, 1);
  h.advance(719);
  assert.deepEqual(h.navigations, []);
  h.advance(1);
  assert.deepEqual(h.navigations, [{url: destination, at: 720}]);
  h.advance(2000);
  assert.equal(h.navigations.length, 1, 'The delayed navigation occurs only once');
});

test('A queued close from an earlier opening cannot cancel a reopened tunnel', () => {
  const h = harness();
  h.click(h.link('MIRA'));
  h.advance(100);
  h.click(h.cancelButton);
  assert.equal(h.overlay.open, false);
  assert.equal(h.timers.size, 0);

  h.click(h.link('ROSA'));
  assert.equal(h.overlay.open, true);
  assert.equal(h.heading.textContent, 'ROSA');
  h.flushCloseEvents();
  assert.equal(h.timers.size, 1, 'The new opening retains its navigation timer');
  h.advance(719);
  assert.deepEqual(h.navigations, []);
  h.advance(1);
  assert.deepEqual(h.navigations, [{url: destination, at: 820}]);
});

for (const cancellation of ['Escape/cancel event', 'Hier bleiben button', 'dialog close event']) {
  test(cancellation + ' stops pending navigation', () => {
    const h = harness();
    h.click(h.link());
    h.advance(300);
    if (cancellation === 'Escape/cancel event') {
      h.overlay.dispatchEvent(new Event('cancel', {cancelable: true}));
    } else if (cancellation === 'Hier bleiben button') {
      h.click(h.cancelButton);
    } else {
      h.overlay.close();
    }
    h.flushCloseEvents();
    assert.equal(h.overlay.open, false);
    assert.equal(h.timers.size, 0);
    h.advance(2000);
    assert.deepEqual(h.navigations, []);
  });
}

for (const [name, settings] of [
  ['reduced motion', {reducedMotion: true}],
  ['paused scene', {paused: true}]
]) {
  test(name + ' leaves the native anchor click unmodified', () => {
    const h = harness(settings), anchor = h.link();
    const event = h.click(anchor);
    assert.equal(event.defaultPrevented, false);
    assert.equal(anchor.href, destination);
    assert.equal(h.overlay.open, false);
    assert.equal(h.timers.size, 0);
    h.advance(2000);
    assert.deepEqual(h.navigations, [], 'The script defers navigation to the native anchor');
  });
}

test('Modified clicks, middle clicks, existing prevention and new-tab anchors retain native handling', () => {
  for (const options of [
    {ctrlKey: true}, {metaKey: true}, {shiftKey: true}, {altKey: true},
    {button: 1}, {button: 1, type: 'auxclick'}, {button: 2},
    {defaultPrevented: true}, {target: '_blank'}
  ]) {
    const h = harness(), anchor = h.link('MIRA', options);
    const event = h.click(anchor, options);
    assert.equal(event.defaultPrevented, options.defaultPrevented === true, JSON.stringify(options));
    assert.equal(anchor.href, destination);
    assert.equal(anchor.target, options.target || '');
    assert.equal(h.overlay.open, false);
    assert.equal(h.timers.size, 0);
    h.advance(2000);
    assert.deepEqual(h.navigations, []);
  }
});

test('pageshow clears a pending tunnel and allows a fresh navigation', () => {
  const h = harness();
  h.click(h.link());
  h.advance(300);
  h.window.dispatchEvent(new Event('pageshow'));
  h.flushCloseEvents();
  assert.equal(h.overlay.open, false);
  assert.equal(h.timers.size, 0);
  h.advance(2000);
  assert.deepEqual(h.navigations, []);
  h.click(h.link('ASTER'));
  h.advance(720);
  assert.deepEqual(h.navigations, [{url: destination, at: 3020}]);
});

test('pageshow closes the cached overlay after returning from a completed navigation', () => {
  const h = harness();
  h.click(h.link());
  h.advance(720);
  assert.equal(h.navigations.length, 1);
  assert.equal(h.overlay.open, true, 'The model preserves page state across navigation');
  h.window.dispatchEvent(new Event('pageshow'));
  h.flushCloseEvents();
  assert.equal(h.overlay.open, false);
  assert.equal(h.timers.size, 0);
  h.advance(2000);
  assert.equal(h.navigations.length, 1, 'Restoring the page does not replay navigation');
});
