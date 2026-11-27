'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function walkthrough() {
  const focusEvents = [], reveals = [], nodes = new Map();
  let focused = null;
  function element(id) {
    return {
      id, disabled: false, hidden: false, dataset: {}, top: -300, events: {},
      addEventListener(type, callback) { this.events[type] = callback; },
      focus(options) {
        focused = this; focusEvents.push({ id: this.id, options });
        if (!options?.preventScroll) this.top = 0;
      },
      scrollIntoView() { this.top = 0; reveals.push(this.id); },
      click() { if (!this.disabled && !this.hidden) this.events.click?.(); },
    };
  }
  const stage = element('stage');
  let heading;
  Object.defineProperty(stage, 'innerHTML', {
    set(html) { this.html = html; heading = element('heading'); },
  });
  stage.querySelector = selector => selector === 'h3' ? heading : element(selector);
  nodes.set('stage', stage);
  for (const id of ['progress', 'round-label', 'step-label', 'back', 'next']) nodes.set(id, element(id));
  const document = { getElementById: id => nodes.get(id) };
  const source = fs.readFileSync(path.join(__dirname, '../forschung/juri-thesis/chancenreise.js'), 'utf8');
  vm.runInNewContext(source, { document });
  return {
    nodes, focusEvents, reveals,
    get heading() { return heading; },
    get focused() { return focused; },
    choose(attribute, value = '') {
      const target = element(attribute); target.dataset[attribute] = value;
      stage.events.click({ target: { closest: selector => selector === `[data-${attribute.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}]` ? target : null } });
    },
  };
}

function visibleHeading(ui) {
  assert.equal(ui.focused, ui.heading, 'the newly rendered heading receives focus');
  assert.ok(ui.heading.top >= 0, 'the next heading is revealed when the previous controls were below it');
}

test('initial entry and incidental choices do not acquire scroll authority', () => {
  const ui = walkthrough();
  assert.equal(ui.focusEvents.length, 0);
  assert.equal(ui.reveals.length, 0);
  ui.nodes.get('next').click();
  const reveals = ui.reveals.length;
  ui.choose('path', 'lernen');
  assert.equal(ui.reveals.length, reveals);
  assert.equal(ui.focusEvents.at(-1).options.preventScroll, true);
  ui.nodes.get('next').click();
  ui.nodes.get('next').click();
  ui.nodes.get('next').click();
  ui.choose('outcome', 'warten');
  assert.equal(ui.focusEvents.at(-1).options.preventScroll, true);
  ui.nodes.get('next').click();
  const beforeShare = ui.reveals.length;
  ui.choose('share', 'toggle');
  assert.equal(ui.reveals.length, beforeShare);
  assert.equal(ui.focusEvents.at(-1).options.preventScroll, true);
});

test('explicit forward, back and new-round navigation reveal their replacement heading', () => {
  const ui = walkthrough();
  ui.nodes.get('next').click(); visibleHeading(ui);
  ui.choose('path', 'lernen');
  for (let i = 0; i < 3; i++) { ui.nodes.get('next').click(); visibleHeading(ui); }
  ui.choose('outcome', 'warten');
  ui.nodes.get('next').click(); visibleHeading(ui);
  ui.nodes.get('back').click(); visibleHeading(ui);
  ui.nodes.get('next').click(); visibleHeading(ui);
  ui.nodes.get('next').click(); visibleHeading(ui);
  ui.choose('newRound'); visibleHeading(ui);
  assert.match(ui.nodes.get('round-label').textContent, /Runde 2/);
});
