import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorldEvent } from '../assets/world-events.mjs';
import { createAppearanceLog } from '../assets/world-appearances.mjs';

const id = n => `abcdef01-2345-4678-9abc-${String(n).padStart(12, '0')}`;
const time = '2026-10-02T12:34:56.789Z';
const gift = () => makeWorldEvent({ id: id(1), createdAt: time, displayName: 'Synthetic viewer', kind: 'GIFT_DEMO', item: 'chocolate' });

test('repeated deliveries of one impulse create distinct appearances with their shared source intact', () => {
  const log = createAppearanceLog(), source = gift();
  const first = log.append(source, id(2), time, 'LOOPBACK_DEMO');
  const second = log.append(source, id(3), time, 'LOOPBACK_DEMO');
  assert.equal(log.length, 2);
  assert.equal(first.event.id, second.event.id); assert.notEqual(first.id, second.id);
  assert.deepEqual(log.values().map(a => a.occurrence), [1, 2]);
  assert.deepEqual(log.since(1), [second]); assert.deepEqual(log.tail(1), [second]);
  assert.ok(Object.isFrozen(first)); assert.ok(Object.isFrozen(first.event));
  log.values().pop(); assert.equal(log.length, 2);
});

test('stream and acknowledgement of the same delivery reference the same existing appearance', () => {
  const log = createAppearanceLog();
  log.append(gift(), id(2), time, 'LOOPBACK_DEMO');
  assert.equal(log.append(gift(), id(2), '2026-10-02T12:35:00.000Z', 'LOOPBACK_DEMO'), null);
  assert.equal(log.length, 1);
  assert.throws(() => log.append({ ...gift(), item: 'book', exampleEuroCents: 700 }, id(2), time, 'LOOPBACK_DEMO'), /DELIVERY_ID_CONFLICT/);
  assert.throws(() => log.append(gift(), id(2), time, 'BROWSER_PREVIEW'), /DELIVERY_ID_CONFLICT/);
  assert.equal(log.length, 1);
});

test('one combined log preserves preview and relay appearance origins', () => {
  const log = createAppearanceLog();
  log.append(gift(), id(2), time, 'BROWSER_PREVIEW');
  log.append(gift(), id(3), time, 'LOOPBACK_DEMO');
  assert.deepEqual(log.values().map(a => a.origin), ['BROWSER_PREVIEW', 'LOOPBACK_DEMO']);
  assert.deepEqual(log.values().map(a => a.occurrence), [1, 2]);
});

test('malformed appearance metadata leaves the log unchanged', () => {
  const log = createAppearanceLog();
  for (const [delivery, observed, origin] of [[null, time, 'LOOPBACK_DEMO'], ['', time, 'LOOPBACK_DEMO'], [id(2), 'yesterday', 'LOOPBACK_DEMO'], [id(2), time, 'PAYMENT']]) {
    assert.throws(() => log.append(gift(), delivery, observed, origin), TypeError);
    assert.equal(log.length, 0);
  }
});
