export const VERSION = '1.0.0';
export const REGIONS = [
  { id: 'haven', de: 'Aschenhafen', en: 'Ash harbour', position: [-17, 2, 13], color: 0x51dec6 },
  { id: 'archive', de: 'Archiv der Stimmen', en: 'Archive of voices', position: [15, 5, 11], color: 0xe6d89b },
  { id: 'crater', de: 'Der Rote Berg', en: 'Red Mountain', position: [0, 8, -17], color: 0xff6b61 },
  { id: 'stasis', de: 'Vivecs Versuch', en: "Vivec's trial", position: [-17, 5, -9], color: 0x81caff },
  { id: 'garden', de: 'Garten der 69', en: 'Garden of 69', position: [0, 3, 8], color: 0x97e38a },
  { id: 'gate', de: 'Dormammus Pforte', en: "Dormammu's gate", position: [19, 5, -9], color: 0xff9bc9 }
];
export const MODES = ['pause', 'stop', 'restore'];
export function finite(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new RangeError(label);
  return value;
}
export function fall({ height, velocity, mass, mode, time }) {
  finite(height, 1, 100, 'height'); finite(velocity, 0, 50, 'velocity');
  finite(mass, 0.1, 100, 'mass'); finite(time, 0, 30, 'time');
  if (!MODES.includes(mode)) throw new RangeError('mode');
  const g = 9.81, initial = mode === 'stop' ? 0 : velocity;
  const impactTime = (Math.sqrt(initial * initial + 2 * g * height) - initial) / g;
  const t = mode === 'pause' ? 0 : Math.min(time, impactTime);
  const distance = initial * t + 0.5 * g * t * t;
  return { height: mode !== 'pause' && time >= impactTime ? 0 : Math.max(0, height - distance), velocity: mode === 'pause' ? velocity : initial + g * t,
    removedEnergy: mode === 'stop' ? 0.5 * mass * velocity * velocity : 0,
    restoredEnergy: mode === 'restore' ? 0.5 * mass * velocity * velocity : 0,
    impactVelocity: Math.sqrt(initial * initial + 2 * g * height), impactTime,
    elapsed: t, landed: mode !== 'pause' && time >= impactTime };
}
// Reproducible teaching RNG, not a cryptographic or gambling implementation.
export function rng(seed) {
  let state = (seed >>> 0) || 0x6d2b79f5;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
export function sampleHits(p, count, seed) {
  finite(p, 0, 1, 'p'); finite(count, 1, 10000, 'count');
  if (!Number.isInteger(count) || !Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new RangeError('integer');
  const random = rng(seed), hits = Array.from({ length: count }, () => random() < p);
  const total = hits.filter(Boolean).length;
  return { p, count, seed, total, observed: total / count, expected: count * p,
    atLeastOne: p === 1 ? 1 : -Math.expm1(count * Math.log1p(-p)), hits };
}
export function validateSave(value, ids) {
  if (!value || value.schema !== 'halveth.ashbound.save.v1' || value.version !== VERSION) throw new Error('save-schema');
  if (!Array.isArray(value.choices) || value.choices.length > 5 || value.choices.some(v => !Number.isInteger(v) || v < 0 || v > 2)) throw new Error('save-choices');
  if (!REGIONS.some(r => r.id === value.region)) throw new Error('save-region');
  if (!Array.isArray(value.party) || value.party.length > 3 || new Set(value.party).size !== value.party.length || value.party.some(id => !ids.has(id))) throw new Error('save-party');
  if (!Array.isArray(value.books) || value.books.length > 6 || value.books.some(id => !Number.isInteger(id) || id < 0 || id > 5)) throw new Error('save-books');
  return { schema: value.schema, version: VERSION, choices: [...value.choices], region: value.region,
    party: [...value.party], books: [...new Set(value.books)] };
}
export function replay(Story, compiled, choices) {
  const story = new Story(compiled), history = [];
  const read = () => {
    const lines = [], tags = []; let headingIndex = 0;
    while (story.canContinue) {
      const line = story.Continue().trim();
      if (story.currentTags.some(tag => tag.startsWith('chapter:'))) headingIndex = lines.length;
      if (line) lines.push(line); tags.push(...story.currentTags);
    }
    return { lines, tags, headingIndex, choices: story.currentChoices.map(c => c.text),
      values: { wissen: story.variablesState.wissen, freiheit: story.variablesState.freiheit, fuersorge: story.variablesState.fuersorge } };
  };
  let frame = read(); history.push(frame);
  for (const index of choices) {
    if (!Number.isInteger(index) || index < 0 || index >= story.currentChoices.length) throw new Error('unreachable-choice');
    story.ChooseChoiceIndex(index); frame = read(); history.push(frame);
  }
  return { story, frame, history };
}
