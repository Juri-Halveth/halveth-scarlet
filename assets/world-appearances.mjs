import { validateWorldEvent } from './world-events.mjs';

// One source impulse can have many deliveries. Transport acknowledgements may
// reference the same delivery; a new delivery always gets its own appearance.
export function createAppearanceLog() {
  const entries = [], byDelivery = new Map(), occurrences = new Map();
  return {
    append(raw, deliveryId, observedAt, origin) {
      const event = validateWorldEvent(raw);
      validateWorldEvent({ ...event, id: deliveryId, createdAt: observedAt });
      if (event.kind !== 'GIFT_DEMO' || !['BROWSER_PREVIEW', 'LOOPBACK_DEMO'].includes(origin)) throw new TypeError('INVALID_APPEARANCE');
      const previous = byDelivery.get(deliveryId);
      if (previous) {
        if (JSON.stringify(previous.event) !== JSON.stringify(event) || previous.origin !== origin) throw new TypeError('DELIVERY_ID_CONFLICT');
        return null;
      }
      const occurrence = (occurrences.get(event.id) || 0) + 1;
      const appearance = Object.freeze({ id: deliveryId, event, observedAt, origin, occurrence });
      entries.push(appearance); byDelivery.set(deliveryId, appearance); occurrences.set(event.id, occurrence);
      return appearance;
    },
    since(index) { return entries.slice(index); },
    tail(count) { return entries.slice(-count); },
    values() { return [...entries]; },
    get length() { return entries.length; }
  };
}
