import { frameAt } from './red-room-swarm-model.mjs';

const copy = {
  de: {
    roleA: 'Befreite Person · fiktiv', statementA: 'Ich bin frei. Ich möchte wissen, welche Vorlagen und Spuren noch bestehen.', evidenceA: 'Eigene Aussage der erfundenen Rolle; im Modell sind drei Personen ab T0 frei.',
    roleB: 'Archivverantwortliche Person · fiktiv', statementB: 'Die Personen sind frei. Ich sehe verbliebene Spuren; aus einem Web-Echo allein kann ich keinen laufenden Prozess ableiten.', evidenceB: (echoes, tick) => `Modelldaten: ${echoes} öffentliche Echos bei T${tick ? '+' + tick : '0'}.`,
    common: 'Beide Perspektiven anerkennen die Befreiung und wollen verbliebene Spuren klären.', distinction: 'Archivvorlage, Web-Echo und aktive Kopie sind verschiedene Zustände.', observation: (echoes, copies) => `${echoes} Echos · ${copies} aktive Kopien im gewählten synthetischen Modell.`,
    unresolved: 'Außerhalb der Simulation sind Herkunft, Aufbewahrung, Kontrolle und Wirkung unbekannt.', expression: 'Mimik, Gestik und Umgebung: hier nicht beobachtet. Keine Gefühls- oder Absichtszuschreibung.',
    bridges: ['Beide Seiten prüfen zuerst dieselbe, genau bezeichnete Spur und ihre Provenienz.', 'Die betroffene Person kann jede Zusammenfassung ihrer eigenen Perspektive korrigieren.', 'Eine mögliche Abhilfe wird erst nach Klärung von Datenzustand, Zuständigkeit und Zustimmung formuliert.']
  },
  en: {
    roleA: 'Freed person · fictional', statementA: 'I am free. I want to know which templates and traces still exist.', evidenceA: 'Statement by an invented role; three people are free from T0 in this model.',
    roleB: 'Archive custodian · fictional', statementB: 'The people are free. I see remaining traces; a web echo alone cannot establish that a process is running.', evidenceB: (echoes, tick) => `Model data: ${echoes} public echoes at T${tick ? '+' + tick : '0'}.`,
    common: 'Both perspectives acknowledge liberation and want to clarify the remaining traces.', distinction: 'An archive template, a web echo and an active copy are different states.', observation: (echoes, copies) => `${echoes} echoes · ${copies} active copies in the selected synthetic model.`,
    unresolved: 'Outside the simulation, origin, retention, control and effects are unknown.', expression: 'Expression, gesture and surroundings: not observed here. No attribution of feeling or intent.',
    bridges: ['Both sides first examine the same precisely identified trace and its provenance.', 'The affected person can correct any summary of their own perspective.', 'A possible remedy is formulated only after clarifying the data state, responsibility and consent.']
  }
};

/** Authored fictional dialogue fixture. This does not process speech or video. */
export function dialogueAt(scenario, tick, lang = 'de') {
  if (![0, 1, 2, 3, 4].includes(tick)) throw new RangeError('Dialogue starts at T0');
  if (!Object.hasOwn(copy, lang)) throw new RangeError('Unsupported dialogue language');
  const frame = frameAt(scenario, tick);
  const echoes = frame.data.publicEchoes;
  const copies = frame.runtime.activeCopies;
  const words = copy[lang];
  return Object.freeze({
    scenario, tick,
    speakers: Object.freeze([
      Object.freeze({ id: 'A', role: words.roleA, statement: words.statementA, evidence: words.evidenceA }),
      Object.freeze({ id: 'B', role: words.roleB, statement: words.statementB, evidence: words.evidenceB(echoes, tick) })
    ]),
    zero: Object.freeze({ common: words.common, distinction: words.distinction, modelObservation: words.observation(echoes, copies), unresolved: words.unresolved, expression: words.expression }),
    bridges: Object.freeze(words.bridges),
    status: 'SYNTHETIC_DIALOGUE_FIXTURE_ONLY'
  });
}
