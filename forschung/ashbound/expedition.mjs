import { REGIONS } from './regions.mjs';

export const EXPEDITION_VERSION = '1.0.0';
export const ROADS = Object.freeze([
  ['haven', 'garden'], ['garden', 'archive'], ['garden', 'crater'],
  ['garden', 'stasis'], ['archive', 'gate']
]);
const ids = REGIONS.map(region => region.id);
const validId = id => ids.includes(id);

export function createExpedition() {
  return { version: EXPEDITION_VERSION, choices: ids.map(() => null), visits: [] };
}

export function validateExpedition(value) {
  if (value === undefined) return createExpedition();
  if (!value || typeof value !== 'object' || value.version !== EXPEDITION_VERSION) throw new Error('expedition-schema');
  if (!Array.isArray(value.choices) || value.choices.length !== ids.length ||
      value.choices.some(choice => choice !== null && choice !== 0 && choice !== 1)) throw new Error('expedition-choices');
  if (!Array.isArray(value.visits) || value.visits.length > ids.length ||
      new Set(value.visits).size !== value.visits.length || value.visits.some(id => !validId(id))) throw new Error('expedition-visits');
  if (value.choices.some((choice, index) => choice !== null && !value.visits.includes(ids[index]))) throw new Error('expedition-unvisited-choice');
  if (value.choices[ids.indexOf('gate')] !== null && value.choices.slice(0, -1).some(choice => choice === null)) throw new Error('expedition-gate');
  return { version: EXPEDITION_VERSION, choices: [...value.choices], visits: [...value.visits] };
}

export function visitRegion(expedition, id) {
  const safe = validateExpedition(expedition);
  if (!validId(id)) throw new Error('expedition-region');
  if (!safe.visits.includes(id)) safe.visits.push(id);
  return safe;
}

export function canChoose(expedition, id) {
  const safe = validateExpedition(expedition);
  if (!validId(id)) throw new Error('expedition-region');
  return id !== 'gate' || safe.choices.slice(0, -1).every(choice => choice !== null);
}

export function chooseRegion(expedition, id, choice) {
  const safe = validateExpedition(expedition);
  if (!validId(id) || (choice !== 0 && choice !== 1)) throw new Error('expedition-choice');
  if (!canChoose(safe, id)) return { accepted: false, reason: 'locked', expedition: safe };
  const index = ids.indexOf(id);
  if (safe.choices[index] === choice) return { accepted: false, reason: 'unchanged', expedition: safe };
  safe.choices[index] = choice;
  if (!safe.visits.includes(id)) safe.visits.push(id);
  return { accepted: true, reason: 'chosen', expedition: safe };
}

export function expeditionProgress(expedition) {
  const safe = validateExpedition(expedition);
  const resolved = safe.choices.filter(choice => choice !== null).length;
  return { resolved, total: ids.length, open: safe.choices.filter(choice => choice === 0).length,
    shelter: safe.choices.filter(choice => choice === 1).length, complete: resolved === ids.length };
}

export function expeditionOutcome(expedition) {
  const progress = expeditionProgress(expedition);
  if (!progress.complete) return null;
  return progress.open > progress.shelter ? 'open' : progress.shelter > progress.open ? 'shelter' : 'woven';
}

export function routeBetween(start, destination) {
  if (!validId(start) || !validId(destination)) throw new Error('expedition-route');
  if (start === destination) return [start];
  const queue = [[start]], seen = new Set([start]);
  for (const path of queue) {
    const last = path.at(-1);
    for (const [a, b] of ROADS) {
      const next = a === last ? b : b === last ? a : null;
      if (!next || seen.has(next)) continue;
      const candidate = [...path, next];
      if (next === destination) return candidate;
      seen.add(next); queue.push(candidate);
    }
  }
  throw new Error('expedition-disconnected');
}
