/* HALVETH PIRL 2.0. Interface adapter for the existing local GStar kernels. */
export const VERSION = '1.0.0';
export const MAX_MODEL_MS = 180000;
export const PROFILES = Object.freeze([
  ['source', 'Quelle', 'Unveränderte Eingabe'], ['capsule', 'Hülle', 'Gebundener Zustand'],
  ['clock', 'Zeit', 'Diskrete Modellschritte'], ['variant', 'Variante', 'Explizite Ableitung'],
  ['observer', 'Beobachter', 'Lokalen Zustand lesen'], ['snapshot', 'Snapshot', 'Einen Präfix erhalten'],
  ['relation', 'Relation', 'Endpunkte verbinden'], ['membrane', 'Membran', 'Lokale Übergangsregel'],
  ['signal', 'Signal', 'Nachricht im Regelmodell'], ['trace', 'Spur', 'Begrenzte Ereignisgeschichte'],
  ['question', 'Frage', 'Offene Verbindung'], ['return', 'Rückkehr', 'Erhaltene Referenz'],
  ['form', 'Form', 'Berechnete Darstellung'], ['compare', 'Vergleich', 'Versionen unterscheiden'],
  ['export', 'Export', 'Strukturierte Ausgabe'], ['anchor', 'Anker', 'Benannter Ausgangszustand'],
].map(([id, label, role]) => Object.freeze({ id, label, role })));

export function validateInput(text, label, seed) {
  if (typeof text !== 'string' || !text.trim() || new TextEncoder().encode(text).length > 1536 ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(text)) throw Error('INVALID_SEED_TEXT');
  if (typeof label !== 'string' || !label.trim() || new TextEncoder().encode(label).length > 100) throw Error('INVALID_SEED_LABEL');
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > 0xffffffff) throw Error('INVALID_MODEL_SEED');
}

export async function createRoom({ core, living, text, label, seed = 555, runId, clock }) {
  validateInput(text, label, seed);
  const ledger = core.create({ runId, ...(clock ? { clock } : {}) });
  const ecology = living.create(PROFILES, { seed });
  const initial = await ledger.dispatch({ type: 'SEED', label, text });
  let selectedId = initial.event.records.find(record => record.kind === 'STATE').id;
  await ledger.dispatch({ type: 'MATERIALIZE', stateId: selectedId });
  let branches = 0;
  return Object.freeze({
    advance(deltaMs) {
      if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 60000) throw Error('INVALID_DELTA');
      const remaining = MAX_MODEL_MS - ecology.snapshot('render').modelMs;
      return ecology.advance(Math.min(deltaMs, remaining));
    },
    gap(deltaMs) { ecology.gap(deltaMs); },
    view() { return ledger.view(); },
    ecology(projection = 'render') { return ecology.snapshot(projection); },
    selected() { return ledger.view().states.find(state => state.id === selectedId); },
    async branch(replacement) {
      const parent = ledger.view().states.find(state => state.id === selectedId);
      const next = replacement === undefined ? parent.text + '\n\n[Variante ' + (branches + 1) + ']' : replacement;
      validateInput(next, label, seed);
      if (next === parent.text) throw Error('VARIANT_REQUIRES_CHANGE');
      // Both events must fit before proposing a new state.
      if (ledger.view().counts.events > core.LIMITS.maxEvents - 2 || ledger.view().counts.states >= core.LIMITS.maxStates) throw Error('ROOM_CAPACITY');
      const result = await ledger.dispatch({ type: 'PROPOSE', parents: [selectedId], mode: 'DERIVE_CHILD', text: next, trigger: 'EXPLICIT_VISITOR_BRANCH' });
      const childId = result.event.records.find(record => record.kind === 'STATE').id;
      await ledger.dispatch({ type: 'MATERIALIZE', stateId: childId });
      selectedId = childId;
      branches++;
      return selectedId;
    },
    async observe() { return ledger.dispatch({ type: 'OBSERVE', stateId: selectedId }); },
    async snapshot() { return ledger.dispatch({ type: 'SNAPSHOT' }); },
    async verify() { return core.verify(ledger.export()); },
    export() {
      return { schema: 'halveth.capability-room.v1', adapterVersion: VERSION,
        contentLedger: ledger.export(), ecology: ecology.snapshot('full'),
        ecologyInputs: { profiles: PROFILES, seed },
        execution: { content: 'LOCAL_TEXT_STATE_OPERATIONS', ecology: 'FINITE_RULE_BASED_SIMULATION',
          externalActions: 'NONE', generatedProgram: 'NONE' },
        verificationScope: 'CONTENT_LEDGER_REPLAY_AND_SELF_CONSISTENCY',
        modelLimitMs: MAX_MODEL_MS };
    },
  });
}
