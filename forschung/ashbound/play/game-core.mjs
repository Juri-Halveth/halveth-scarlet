export const GAME_SAVE_KEY = 'ashbound-first-person-v1';
export const BOOK_COUNT = 3;

export const SEALS = [
  { id: 'ember', name: 'Glutsiegel', x: -9, z: -5, color: 0xff8b59 },
  { id: 'veil', name: 'Schleiersiegel', x: 0, z: -15, color: 0x93e7d4 },
  { id: 'hour', name: 'Zeitsiegel', x: 9, z: -5, color: 0xa4b9ff },
];

export function freshGame() {
  return { schema: 'ashbound.first-person.v1', seals: [false, false, false],
    revealed: false, wardUntil: 0, completed: false, x: 0, z: 17,
    booksSolved: [false, false, false], relicFound: false, mana: 100, lastManaAt: 0 };
}

export function loadGame(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== 'ashbound.first-person.v1' ||
      !Array.isArray(raw.seals) || raw.seals.length !== 3 || raw.seals.some(value => typeof value !== 'boolean') ||
      typeof raw.revealed !== 'boolean' || typeof raw.completed !== 'boolean' ||
      !Array.isArray(raw.booksSolved) || raw.booksSolved.length !== BOOK_COUNT || raw.booksSolved.some(value => typeof value !== 'boolean') ||
      typeof raw.relicFound !== 'boolean' || !Number.isFinite(raw.mana) || raw.mana < 0 || raw.mana > 600 ||
      !Number.isFinite(raw.x) || !Number.isFinite(raw.z) || Math.abs(raw.x) > 100 || Math.abs(raw.z) > 100) {
    throw new Error('Invalid ASHBOUND save');
  }
  const seals = [...raw.seals];
  return { schema: 'ashbound.first-person.v1', seals, revealed: raw.revealed,
    wardUntil: 0, completed: raw.completed && seals.every(Boolean), x: raw.x, z: raw.z,
    booksSolved: [...raw.booksSolved], relicFound: raw.relicFound && raw.booksSolved[2],
    mana: Math.min(raw.mana, raw.booksSolved[0] ? 600 : 100), lastManaAt: 0 };
}

export function progress(state) { return state.seals.filter(Boolean).length; }
export function maxMana(state) { return state.booksSolved[0] ? 600 : 100; }
export function moveFactor(state) { return state.booksSolved[1] ? 1.35 : 1; }
export function stillDuration(state) { return state.relicFound ? 12000 : 7000; }
export function studyBook(state, index, answer) {
  if (!Number.isInteger(index) || index < 0 || index >= BOOK_COUNT) throw new Error('Unknown book');
  if (answer !== index) return { state, ok: false, message: 'Lies die letzte Seite noch einmal: Ihre Spur zeigt auf etwas anderes.' };
  const next = { ...state, booksSolved: [...state.booksSolved] }; next.booksSolved[index] = true;
  if (index === 0) next.mana = 600;
  return { state: next, ok: true, message: [
    'Die Schrift wird Teil deiner Magie. Manareserve +500 % (100 → 600).',
    'Du erkennst die Wegzeichen. Bewegung +35 %.',
    'Die Zeitscherbe ruht beim Nordstein jenseits der dritten Säule.',
  ][index] };
}
export function findRelic(state) {
  if (!state.booksSolved[2]) return { state, ok: false };
  return { state: { ...state, relicFound: true }, ok: true, message: 'Zeitscherbe gefunden. Stille hält jetzt zwölf Sekunden.' };
}

export function cast(state, spell, target, now) {
  if (!Number.isFinite(now) || now < 0) throw new Error('Invalid game time');
  if (!['pulse', 'echo', 'still'].includes(spell)) throw new Error('Unknown spell');
  const next = { ...state, seals: [...state.seals] };
  next.mana = Math.min(maxMana(next), next.mana + Math.max(0, now - next.lastManaAt) * .018);
  next.lastManaAt = now;
  const cost = { pulse: 10, echo: 20, still: 30 }[spell];
  if (next.mana < cost) return { state: next, ok: false, message: 'Mana sammelt sich. Warte einen Moment.' };
  next.mana -= cost;
  if (spell === 'echo') {
    next.revealed = true;
    return { state: next, ok: true, message: 'Resonanz: verborgene Wege werden sichtbar.' };
  }
  if (spell === 'still') {
    next.wardUntil = now + stillDuration(next);
    return { state: next, ok: true, message: `Stille: der Zeitring hält für ${stillDuration(next) / 1000} Sekunden.` };
  }
  const index = SEALS.findIndex(seal => seal.id === target);
  if (index < 0) return { state: next, ok: false, message: 'Richte den Impuls auf ein Siegel.' };
  if (next.seals[index]) return { state: next, ok: false, message: 'Dieses Siegel trägt bereits Licht.' };
  if (index === 1 && !next.revealed) return { state: next, ok: false, message: 'Das Schleiersiegel braucht zuerst Resonanz [2].' };
  if (index === 2 && next.wardUntil <= now) return { state: next, ok: false, message: 'Der Zeitring ist aktiv. Halte ihn mit Stille [3] an.' };
  next.seals[index] = true;
  return { state: next, ok: true, message: `${SEALS[index].name} erwacht. ${progress(next)} / 3` };
}

export function canCross(state) { return progress(state) === SEALS.length; }

export function cross(state) {
  if (!canCross(state)) return { state, ok: false, message: 'Drei Siegel halten das Aschentor geschlossen.' };
  return { state: { ...state, completed: true }, ok: true, message: 'Du betrittst den offenen Aschenpfad.' };
}
