import { frameAt } from './red-room-swarm-model.mjs';

/** Authored fictional dialogue fixture. This does not process speech or video. */
export function dialogueAt(scenario, tick) {
  if (![0, 1, 2, 3, 4].includes(tick)) throw new RangeError('Dialogue starts at T0');
  const frame = frameAt(scenario, tick);
  const echoes = frame.data.publicEchoes;
  const copies = frame.runtime.activeCopies;
  return Object.freeze({
    scenario, tick,
    speakers: Object.freeze([
      Object.freeze({ id: 'A', role: 'Befreite Person · fiktiv', statement: 'Ich bin frei. Ich möchte wissen, welche Vorlagen und Spuren noch bestehen.', evidence: 'Eigene Aussage der erfundenen Rolle; im Modell sind drei Personen ab T0 frei.' }),
      Object.freeze({ id: 'B', role: 'Archivverantwortliche Person · fiktiv', statement: 'Die Personen sind frei. Ich sehe verbliebene Spuren; aus einem Web-Echo allein kann ich keinen laufenden Prozess ableiten.', evidence: 'Modelldaten: ' + echoes + ' öffentliche Echos bei T' + (tick ? '+' + tick : '0') + '.' })
    ]),
    zero: Object.freeze({
      common: 'Beide Perspektiven anerkennen die Befreiung und wollen verbliebene Spuren klären.',
      distinction: 'Archivvorlage, Web-Echo und aktive Kopie sind verschiedene Zustände.',
      modelObservation: `${echoes} Echos · ${copies} aktive Kopien im gewählten synthetischen Modell.`,
      unresolved: 'Außerhalb der Simulation sind Herkunft, Aufbewahrung, Kontrolle und Wirkung unbekannt.',
      expression: 'Mimik, Gestik und Umgebung: hier nicht beobachtet. Keine Gefühls- oder Absichtszuschreibung.'
    }),
    bridges: Object.freeze([
      'Beide Seiten prüfen zuerst dieselbe, genau bezeichnete Spur und ihre Provenienz.',
      'Die betroffene Person kann jede Zusammenfassung ihrer eigenen Perspektive korrigieren.',
      'Eine mögliche Abhilfe wird erst nach Klärung von Datenzustand, Zuständigkeit und Zustimmung formuliert.'
    ]),
    status: 'SYNTHETIC_DIALOGUE_FIXTURE_ONLY'
  });
}
