export const EVENT_SCHEMA = 'halveth.world-event.v1';
export const SUPPORT_RECIPIENT = '0x6416FDCfe74978Be4787A4e65E53090A7C9Eb5ca';
export const ITEMS = Object.freeze([
  Object.freeze({ id: 'chocolate', de: 'Schokoladentafel', en: 'Chocolate bar', exampleEuroCents: 300 }),
  Object.freeze({ id: 'book', de: 'Geschichtenbuch', en: 'Storybook', exampleEuroCents: 700 }),
  Object.freeze({ id: 'beacon', de: 'Leuchtzeichen', en: 'Beacon', exampleEuroCents: 1000 })
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CONTROLS = /[\u0000-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || CONTROLS.test(value)) throw new TypeError('INVALID_TEXT');
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) { const next = value.charCodeAt(++i); if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError('INVALID_UNICODE'); }
    else if (unit >= 0xdc00 && unit <= 0xdfff) throw new TypeError('INVALID_UNICODE');
  }
  return value;
}
export function validateWorldEvent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('INVALID_EVENT');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !('value' in descriptors[key]) || !descriptors[key].enumerable)) throw new TypeError('INVALID_EVENT');
  const fields = ['schema', 'id', 'kind', 'createdAt', 'displayName', 'paymentState'];
  if (value.kind === 'GIFT_DEMO') fields.push('item', 'exampleEuroCents');
  else if (value.kind === 'CHAT') fields.push('text');
  else throw new TypeError('INVALID_KIND');
  if (Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))) throw new TypeError('INVALID_FIELDS');
  if (value.schema !== EVENT_SCHEMA || value.paymentState !== 'NOT_A_PAYMENT') throw new TypeError('NOT_A_PAYMENT_REQUIRED');
  if (typeof value.id !== 'string' || value.id.length !== 36 || !UUID.test(value.id)) throw new TypeError('INVALID_ID');
  if (typeof value.createdAt !== 'string' || value.createdAt.length !== 24 || !Number.isFinite(Date.parse(value.createdAt)) || new Date(value.createdAt).toISOString() !== value.createdAt) throw new TypeError('INVALID_TIME');
  const event = { schema: EVENT_SCHEMA, id: value.id, kind: value.kind, createdAt: value.createdAt, displayName: text(value.displayName, 32), paymentState: 'NOT_A_PAYMENT' };
  if (value.kind === 'CHAT') event.text = text(value.text, 280);
  else {
    const item = ITEMS.find(item => item.id === value.item);
    if (!item || value.exampleEuroCents !== item.exampleEuroCents) throw new TypeError('INVALID_ITEM');
    event.item = item.id; event.exampleEuroCents = item.exampleEuroCents;
  }
  return Object.freeze(event);
}
export function makeWorldEvent({ id, createdAt, displayName, kind, item, message }) {
  const event = { schema: EVENT_SCHEMA, id, createdAt, displayName, kind, paymentState: 'NOT_A_PAYMENT' };
  if (kind === 'GIFT_DEMO') Object.assign(event, { item, exampleEuroCents: ITEMS.find(entry => entry.id === item)?.exampleEuroCents });
  else event.text = message;
  return validateWorldEvent(event);
}
export function createEventJournal(limit = 100) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new TypeError('INVALID_LIMIT');
  const entries = [], byId = new Map();
  return {
    append(input) {
      const event = validateWorldEvent(input), bytes = JSON.stringify(event);
      if (byId.has(event.id)) {
        if (byId.get(event.id) !== bytes) throw new TypeError('EVENT_ID_CONFLICT');
        return false;
      }
      entries.push(event); byId.set(event.id, bytes);
      if (entries.length > limit) byId.delete(entries.shift().id);
      return true;
    },
    values() { return [...entries]; }
  };
}
