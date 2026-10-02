import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_SCHEMA, ITEMS, validateWorldEvent, makeWorldEvent, createEventJournal } from '../assets/world-events.mjs';

const createdAt = '2026-10-02T12:34:56.789Z';
const id = n => `abcdef01-2345-4678-9abc-${n.toString(16).padStart(12, '0')}`;
const base = n => ({ schema: EVENT_SCHEMA, id: id(n), createdAt, displayName: 'Local viewer', paymentState: 'NOT_A_PAYMENT' });
const gift = (n = 1, extra = {}) => ({ ...base(n), kind: 'GIFT_DEMO', item: 'chocolate', exampleEuroCents: 300, ...extra });
const chat = (n = 1, extra = {}) => ({ ...base(n), kind: 'CHAT', text: 'Hello plaza', ...extra });
const rejects = (input, message) => assert.throws(() => validateWorldEvent(input), { name: 'TypeError' }, message);

test('the demo schema and item catalog are stable and deeply frozen', () => {
  assert.equal(EVENT_SCHEMA, 'halveth.world-event.v1');
  assert.deepEqual(ITEMS.map(({ id, exampleEuroCents }) => [id, exampleEuroCents]), [
    ['chocolate', 300], ['book', 700], ['beacon', 1000]
  ]);
  assert.ok(Object.isFrozen(ITEMS));
  for (const item of ITEMS) {
    assert.ok(Object.isFrozen(item));
    assert.throws(() => { item.exampleEuroCents = 1; }, TypeError);
  }
  assert.throws(() => ITEMS.push({}), TypeError);
});

test('valid events become independent frozen copies without mutating or freezing inputs', () => {
  for (const input of [gift(), gift(2, { item: 'book', exampleEuroCents: 700 }), gift(3, { item: 'beacon', exampleEuroCents: 1000 }), chat(4)]) {
    const before = Object.getOwnPropertyDescriptors(input);
    const result = validateWorldEvent(input);
    assert.deepEqual(result, input);
    assert.notStrictEqual(result, input);
    assert.ok(Object.isFrozen(result));
    assert.equal(Object.isFrozen(input), false);
    assert.deepEqual(Object.getOwnPropertyDescriptors(input), before);
    assert.throws(() => { result.displayName = 'Changed'; }, TypeError);
    input.displayName = 'Changed';
    assert.equal(result.displayName, 'Local viewer');
    assert.deepEqual(validateWorldEvent(Object.freeze({ ...result })), result);
  }
});

test('plain and null-prototype records canonicalize field order without changing values', () => {
  const input = gift();
  const reverse = Object.fromEntries(Object.entries(input).reverse());
  const bare = Object.assign(Object.create(null), input);
  for (const value of [reverse, bare]) {
    const before = Object.getOwnPropertyDescriptors(value), prototype = Object.getPrototypeOf(value);
    assert.equal(JSON.stringify(validateWorldEvent(value)), JSON.stringify(validateWorldEvent(input)));
    assert.deepEqual(Object.getOwnPropertyDescriptors(value), before);
    assert.equal(Object.getPrototypeOf(value), prototype);
  }
});

test('invalid record types, inherited fields, symbols and accessors are rejected without invoking getters', () => {
  for (const value of [null, undefined, false, 1, 'event', [], new Date(), new Map(), new String('event'), Object.create(gift())]) rejects(value);
  const custom = Object.assign(Object.create({ label: 'custom prototype' }), gift());
  rejects(custom);
  const symbolic = gift(); symbolic[Symbol('extra')] = 'unused'; rejects(symbolic);
  for (const key of ['kind', 'displayName', 'unused']) {
    let calls = 0;
    const value = gift();
    Object.defineProperty(value, key, { enumerable: key !== 'unused', get() { calls++; return 'GIFT_DEMO'; } });
    rejects(value, key);
    assert.equal(calls, 0, key);
  }
});

test('every required field and enumerable extra is checked for each event kind', () => {
  for (const input of [gift(), chat()]) {
    for (const key of Object.keys(input)) {
      const value = { ...input }; delete value[key];
      const before = Object.getOwnPropertyDescriptors(value);
      rejects(value, `missing ${key}`);
      assert.deepEqual(Object.getOwnPropertyDescriptors(value), before);
    }
    for (const extra of [{ extra: true }, { extra: undefined }, { amount: 1 }, { transactionHash: 'demo' }, { wallet: 'demo' }]) rejects({ ...input, ...extra });
  }
  rejects({ ...gift(), text: 'Wrong kind' });
  rejects({ ...chat(), item: 'book' });
  rejects({ ...chat(), exampleEuroCents: 700 });
});

test('strict schema rejects non-enumerable extra own fields as well', () => {
  for (const input of [gift(), chat()]) {
    Object.defineProperty(input, 'extra', { value: 'synthetic extra', enumerable: false });
    rejects(input, `${input.kind}: hidden extra field`);
  }
});

test('only the declared schema, event kinds and NOT_A_PAYMENT state are accepted', () => {
  for (const schema of [undefined, null, 1, '', 'halveth.world-event.v2']) rejects(gift(1, { schema }));
  for (const kind of [undefined, null, 1, '', 'gift_demo', 'PAYMENT', 'GIFT', 'NFT']) rejects(gift(1, { kind }));
  for (const paymentState of [undefined, null, false, '', 'PAID', 'PENDING', 'NOT_A_PAYMENT ']) rejects(gift(1, { paymentState }));
});

test('IDs must be canonical lowercase UUID v4 strings', () => {
  for (const value of [null, 7, '', 'not-a-uuid', id(1).toUpperCase(), ` ${id(1)}`, `${id(1)}\n`, id(1).replace('-4678-', '-1678-'), id(1).replace('-9abc-', '-7abc-'), '00000000-0000-0000-0000-000000000000']) rejects(gift(1, { id: value }), String(value));
  for (const variant of ['8', '9', 'a', 'b']) assert.equal(validateWorldEvent(gift(1, { id: id(1).replace('-9abc-', `-${variant}abc-`) })).id[19], variant);
});

test('timestamps require exact UTC millisecond ISO formatting and a real date', () => {
  for (const value of [null, 0, '', 'yesterday', '2026-10-02', '2026-10-02T12:34:56Z', '2026-10-02T14:34:56.789+02:00', '2026-02-30T12:34:56.789Z', '2026-10-02T24:00:00.000Z', '2026-10-02T12:34:60.000Z', '2026-10-02t12:34:56.789z']) rejects(chat(1, { createdAt: value }), String(value));
  assert.equal(validateWorldEvent(chat(1, { createdAt: '2024-02-29T00:00:00.000Z' })).createdAt, '2024-02-29T00:00:00.000Z');
});

test('gift kinds require the exact matching numeric example price', () => {
  for (const item of [null, 3, '', 'Chocolate', 'constructor', 'toString', 'unknown']) rejects(gift(1, { item }));
  for (const exampleEuroCents of [null, '300', 0, -1, 300.1, 700, NaN, Infinity]) rejects(gift(1, { exampleEuroCents }));
  rejects(gift(1, { item: 'book' }));
  rejects(gift(1, { item: { id: 'chocolate' } }));
});

test('Unicode scalar strings preserve spaces, combining forms and supplementary characters', () => {
  for (const text of ['  Viewer  ', 'Gr\u00fc\u00dfe', '\u65e5\u672c\u8a9e', '\u0645\u0631\u062d\u0628\u0627', 'Cafe\u0301', 'Caf\u00e9', '\u{1f4d6}', '\u{1f469}\u200d\u{1f4bb}', '\ufffd']) {
    const value = Object.freeze(chat(1, { displayName: text, text }));
    const result = validateWorldEvent(value);
    assert.equal(result.displayName, text);
    assert.equal(result.text, text);
    assert.deepEqual(result, value);
  }
});

test('text limits apply to UTF-16 length, with blank and non-string values rejected', () => {
  for (const [field, limit] of [['displayName', 32], ['text', 280]]) {
    for (const value of ['a'.repeat(limit), '\u{1f4d6}'.repeat(limit / 2)]) assert.equal(validateWorldEvent(chat(1, { [field]: value }))[field], value);
    for (const value of ['a'.repeat(limit + 1), '\u{1f4d6}'.repeat(limit / 2 + 1), '', '   ', '\u00a0', null, 1, {}, [], new String('name')]) rejects(chat(1, { [field]: value }), field);
  }
});

test('text rejects control characters, bidi overrides and unpaired surrogates in either field', () => {
  const controls = [...Array.from({ length: 32 }, (_, i) => i), 0x7f, 0x61c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];
  for (const field of ['displayName', 'text']) {
    for (const code of controls) rejects(chat(1, { [field]: `a${String.fromCharCode(code)}b` }), `${field}: U+${code.toString(16)}`);
    for (const value of ['\ud800', '\udfff', '\ud800a', '\ud800\ud800', '\udc00\ud800', 'a\ud800']) assert.throws(() => validateWorldEvent(chat(1, { [field]: value })), { name: 'TypeError', message: 'INVALID_UNICODE' });
  }
});

test('makeWorldEvent derives demo prices and freezes valid events without changing caller input', () => {
  for (const [item, price] of [['chocolate', 300], ['book', 700], ['beacon', 1000]]) {
    const input = Object.freeze({ id: id(1), createdAt, displayName: 'Local viewer', kind: 'GIFT_DEMO', item });
    const before = { ...input }, result = makeWorldEvent(input);
    assert.deepEqual(result, gift(1, { item, exampleEuroCents: price }));
    assert.ok(Object.isFrozen(result)); assert.deepEqual(input, before);
  }
  const input = Object.freeze({ id: id(2), createdAt, displayName: 'Local viewer', kind: 'CHAT', message: 'Hello plaza' });
  assert.deepEqual(makeWorldEvent(input), chat(2));
  assert.ok(Object.isFrozen(makeWorldEvent(input)));
  for (const extra of [{ kind: 'PAYMENT' }, { kind: 'GIFT_DEMO', item: 'unknown' }, { message: '' }, { id: 'bad' }]) assert.throws(() => makeWorldEvent({ ...input, ...extra }), TypeError);
});

test('journal limits are integral and bounded, with a default of 100 retained events', () => {
  for (const limit of [null, 0, -1, .5, 501, Infinity, NaN, '2']) assert.throws(() => createEventJournal(limit), { name: 'TypeError', message: 'INVALID_LIMIT' });
  for (const limit of [1, 3, 100, 500]) {
    const journal = limit === 100 ? createEventJournal() : createEventJournal(limit);
    assert.deepEqual(journal.values(), []);
    for (let n = 1; n <= limit + 2; n++) {
      assert.equal(journal.append(chat(n)), true);
      assert.equal(journal.values().length, Math.min(n, limit));
    }
    assert.deepEqual(journal.values().map(event => event.id), Array.from({ length: limit }, (_, i) => id(i + 3)));
  }
});

test('journal duplicates are idempotent despite key order and do not refresh retention order', () => {
  const journal = createEventJournal(2);
  assert.equal(journal.append(gift(1)), true);
  assert.equal(journal.append(chat(2)), true);
  const before = journal.values();
  assert.equal(journal.append(Object.fromEntries(Object.entries(gift(1)).reverse())), false);
  assert.deepEqual(journal.values(), before);
  journal.append(chat(3));
  assert.deepEqual(journal.values().map(event => event.id), [id(2), id(3)]);
  // The journal's ID retention window is bounded together with its entries.
  assert.equal(journal.append(gift(1)), true);
  assert.deepEqual(journal.values().map(event => event.id), [id(3), id(1)]);
});

test('journal conflicts and invalid appends preserve prior entries and their order', () => {
  const journal = createEventJournal(2);
  journal.append(gift(1)); journal.append(chat(2));
  const before = journal.values();
  for (const conflicting of [gift(1, { displayName: 'Different viewer' }), gift(1, { item: 'book', exampleEuroCents: 700 }), chat(1)]) {
    assert.throws(() => journal.append(conflicting), { name: 'TypeError', message: 'EVENT_ID_CONFLICT' });
    assert.deepEqual(journal.values(), before);
  }
  for (const invalid of [null, gift(3, { paymentState: 'PAID' }), chat(2, { text: '' }), { ...chat(3), extra: true }]) {
    assert.throws(() => journal.append(invalid), TypeError);
    assert.deepEqual(journal.values(), before);
  }
});

test('journal snapshots and frozen records cannot mutate the retained journal', () => {
  const journal = createEventJournal(2), input = chat();
  journal.append(input);
  input.text = 'Changed input';
  const snapshot = journal.values();
  assert.notStrictEqual(snapshot[0], input);
  assert.equal(snapshot[0].text, 'Hello plaza');
  assert.ok(Object.isFrozen(snapshot[0]));
  assert.throws(() => { snapshot[0].text = 'Changed snapshot'; }, TypeError);
  snapshot.splice(0, 1, gift(2));
  assert.deepEqual(journal.values(), [chat()]);
});
