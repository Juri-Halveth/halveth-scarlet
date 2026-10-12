export const QUEST_VERSION = '1.0.0';

export const QUEST_STEPS = Object.freeze([
  Object.freeze({ id: 'observe', character: 'halveth', relation: '=', region: 'archive' }),
  Object.freeze({ id: 'relate', character: 'lucinet', relation: '!', region: 'garden' }),
  Object.freeze({ id: 'weave', character: 'scarlet', relation: '=', region: 'gate' })
]);

const RELATIONS = new Set(['=', '!']);

function cleanSteps(value) {
  if (!Array.isArray(value) || value.length > QUEST_STEPS.length) throw new Error('quest-steps');
  const expected = QUEST_STEPS.slice(0, value.length).map(step => step.id);
  if (value.some((step, index) => step !== expected[index])) throw new Error('quest-order');
  return [...value];
}

export function createQuest() {
  return Object.freeze({ version: QUEST_VERSION, steps: Object.freeze([]) });
}

export function validateQuest(value) {
  if (value === undefined) return createQuest();
  if (!value || typeof value !== 'object' || value.version !== QUEST_VERSION) throw new Error('quest-schema');
  return Object.freeze({ version: QUEST_VERSION, steps: Object.freeze(cleanSteps(value.steps)) });
}

export function currentStep(quest) {
  const safe = validateQuest(quest);
  return QUEST_STEPS[safe.steps.length] ?? null;
}

export function questProgress(quest) {
  return validateQuest(quest).steps.length;
}

export function attemptStep(quest, relation) {
  const safe = validateQuest(quest);
  if (!RELATIONS.has(relation)) throw new Error('quest-relation');
  const step = currentStep(safe);
  if (!step) return Object.freeze({ accepted: false, reason: 'complete', quest: safe, step: null });
  if (step.relation !== relation) return Object.freeze({ accepted: false, reason: 'relation', quest: safe, step });
  const next = Object.freeze({ version: QUEST_VERSION, steps: Object.freeze([...safe.steps, step.id]) });
  return Object.freeze({ accepted: true, reason: 'accepted', quest: next, step });
}
