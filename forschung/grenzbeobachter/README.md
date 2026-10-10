# Grenzbeobachter · Boundary observers

[Demo öffnen / Open the demo](./) · [Lizenzkarte / License map](../../LICENSES.md)

## Deutsch

Ein endlicher, synthetischer Vergleich zweier Messpläne. Beide beobachten denselben erzeugten Verlauf mit demselben Budget pro Modellschritt. Die 25 Ringpositionen sind Messorte; sie sind keine rekursiven VOID-25-Ports.

**Regelmäßig** geht zyklisch durch die Orte. **Adaptiv** verwendet mindestens die aufgerundete Hälfte seines Budgets zur zufälligen Erkundung. Die übrigen Orte wählt es nach vergangenen eigenen Aktivitätsmessungen, deren direkten Nachbarn und der Zeit seit der letzten Messung. Alte Aktivität verliert Gewicht. Beide Entscheidungen fallen vor der aktuellen Messung. Weltgenerator und Policies verwenden getrennte deterministische Zufallsströme; die Policy erhält den Welttrace nicht.

Die Szenarien unterscheiden sich: `drift` erzeugt länger anhaltende, wandernde Aktivität; `scatter` kurze Aktivität an einzelnen Orten. Modell-Ticks besitzen keine physikalische Einheit. Wiedergabetakt und aktive Browserlaufdauer sind davon getrennt. Rauschen und Messausfälle sind in Version 1.0.0 nicht modelliert; jeder Versuch liefert einen Wert.

Ein **Ereignistreffer** entsteht durch die nachgelagerte Oracle-Auswertung: Ein gemessener Ort überschneidet sich während eines Ereignisses mit dessen Modellspur. Die Kennzahl ist keine eigenständige Ereignisklassifikation des Beobachters. Trefferlatenz gilt nur für getroffene Ereignisse. Noch aktive, ungetroffene Ereignisse werden separat von beendeten, verpassten Ereignissen gezählt.

### Gebundener Vergleich

Für Version 1.0.0 wurden 32 feste Läufe ausgewertet: Seeds 0–15, beide Szenarien, 25 Orte, 160 Ticks, Budget 4 pro Tick; das sind jeweils 640 Messversuche je Policy.

| Szenario / Scenario | Adaptiv mehr Treffer / Adaptive more hits | Gleichstand / Tie | Adaptiv weniger Treffer / Adaptive fewer hits |
| --- | ---: | ---: | ---: |
| drift | 0 | 16 | 0 |
| scatter | 8 | 0 | 8 |

Bei `scatter`, Seed 10, trifft regelmäßig 20 Ereignisse und adaptiv 12. Diese endliche Stichprobe belegt keine allgemeine Überlegenheit.

### Export, Replay und Fortsetzung

Start, Pause, Einzelschritt und Reset steuern den endlichen Versuch. Der JSON-Export enthält Konfiguration, Versionen, Welttrace, Messentscheidungen, Werte und Ergebnisvertrag. SHA-256 bindet die kanonischen Snapshotbytes; Gerätezeit und aktive Browserdauer stehen getrennt daneben. Der Hash ist kein unabhängiger Herkunfts- oder Zeitnachweis.

`HalvethBoundary.replay(snapshot)` rekonstruiert den vollständigen oder partiellen Lauf und verwirft abweichende Messungen, Modellwerte, Verträge oder Zusammenfassungen. Im Browserexport ist der eigentliche Snapshot das Feld `snapshot`; ein Importformular gehört nicht zu dieser Ausgabe.

Ein möglicher nächster Baustein wäre ein kleines, versioniertes Wissensledger mit getrennten Zustandsrevisionen, adressierten offenen Fragen und ausdrücklich ausgelöster Wiederprüfung. Diese rekursive Wissensfunktion ist hier noch nicht implementiert.

## English

This bounded synthetic demo compares two sampling plans on the same generated trace with equal per-tick budgets. The 25 ring positions are observation sites, not recursive VOID-25 ports.

**Regular** visits sites cyclically. **Adaptive** reserves at least half its budget, rounded up, for random exploration. It assigns the remainder using its own past positive readings, their immediate neighbours and time since observation. Older activity decays. Both plans choose before receiving the current reading. Separate deterministic random streams keep world generation and policy selection distinct.

`drift` produces longer moving activity; `scatter` produces short events at single sites. Ticks have no physical units. Playback speed, active browser duration and model time are separate. Version 1.0.0 models no noise or dropped measurements: all attempts succeed.

A hit is an evaluator result: a sampled site intersects an active model-event footprint. It is not independent event classification by the policy. Latency includes detected events only. Pending events and ended misses remain separate. The fixed 32-run comparison above includes adaptive gains, ties and losses; it supports no universal superiority claim.

Export includes the model, decisions, readings, versions and contracts. Its SHA-256 covers the canonical snapshot, while local device time and browser duration are recorded separately. `replay(snapshot)` checks the recorded full or partial run. The downloadable envelope stores that snapshot in its `snapshot` field; there is no import form.

A future component may add a small versioned knowledge ledger with state revisions, typed unresolved questions and explicit revisit triggers. That recursive knowledge feature is not implemented in this demo.

## Development / Entwicklung

### Übergangswerkstatt / Transition workshop · 1.0.0

[Werkstatt öffnen / Open workshop](./#werkstatt)

Die Werkstatt ergänzt den Messplanvergleich als getrenntes lokales Text- und
Warteschlangenmodell. Der Nutzer bindet den exakten Quelltext (UTF-8, Bytezahl,
SHA-256) und wählt die Lesart des ganzen Textes selbst. Auch eine verneinte oder
nur zitierte Aussage bleibt als `ADDRESSED` erhalten; ihr Ausführungsstatus ist
separat `SEALED_NOT_EXECUTABLE`. Es gibt keine automatische Sprachdeutung.

Zwei eingegebene Sichtweisen bekommen verschiedene Frame- und Observer-IDs.
Sie gehören zum gleichen deklarierten Eingabecluster. Gleiche Zeit oder gleicher
Text setzt ihre Ereignisidentität nicht gleich. `observedAt` und `eventTime`
bleiben `UNKNOWN`; `recordedAt` stammt von der Geräteuhr.

Jede der drei Relationen enthält zwei Endpunkte mit `kind`, `id`, `digest`,
`semanticAddress` und `binding`. Lokale Digests werden über die vollständigen
referenzierten Records neu berechnet. Relationdefinition, Richtung, Scope, Zeit,
Quelle, Evidenz, Autorität und Schreibbereich bleiben eigene Felder. Ein als
ROOT, LOCAL, GITHUB oder EXTERNAL vorgemerktes Ziel bleibt `UNBOUND`, sein Digest
`UNKNOWN`. Ein Name oder eine Adresse löst keine Verbindung aus.

Der Lastversuch verwendet bewusst **Modelleinträge**, keine physikalischen
Druck-, Temperatur- oder medizinischen Größen. Ausgangslast: 30, Annahmegrenze:
80, Kapazität: 100. Die Projektion ist
`max(0, vorher + neueEinträge - Bearbeitungskapazität)`. Bis einschließlich 80
wird sie übernommen; darüber bleibt der vorherige Stand erhalten. Jede Anfrage
erzeugt einen neuen Record mit vorherigem, projiziertem und übernommenem Wert,
Zeit und Digest-Verknüpfung. Die Quelltexte steuern den Versuch nicht.
Wiederherstellen hängt einen neuen Eintrag mit Ausgangswert 30 an; es löscht
keine früheren Schritte. Maximal 128 Einträge gehören zu einem Entwurf.

Export enthält die eingegebenen Texte und den Verlauf. Ein Import bis 256 KiB
prüft den Hash, den geschlossenen Datenvertrag, lokale Endpunkte und jeden
Modellschritt erneut. Der Hash ist selbst berechnet: Er beweist weder externe
Herkunft noch Vollständigkeit einer historischen Aufzeichnung. Ein neu
konstruierter, in sich gültiger Datensatz bleibt eine Selbstauskunft. Die Seite
speichert Formulardaten nicht automatisch. Vor dem Schließen exportieren.
Sprachwechsel erhält den Entwurf, Änderungen an Quellenfeldern erfordern eine
neue Bindung. Bestehende Raum-, Snapshot- und Messplanformate bleiben unverändert.

The workshop is a separate local text and bounded-queue teaching model. Exact
source text is byte-hashed; its whole-source reading is selected by the user.
Addressed content remains separate from execution. Two declared viewpoints keep
distinct frame IDs and unresolved event identity. All relations carry complete
endpoint addresses; external target proposals stay unbound.

Each queue step checks its projected load before applying it. Above 80 the old
state is retained. Restore appends a return to the initial load of 30 while
preserving prior entries. Export/import rechecks hashes, endpoint bindings and
every transition, with a 128-entry / 256-KiB limit. This validates the declared
model, not authorship, trusted time, outside observations or external authority.
Download before closing; input text is not automatically persisted or uploaded.

Focused checks:

```sh
node --test tests/transition-workshop.test.cjs
```

Recovery: revert the workshop-only commit and rebuild the site. The original
sampling experiment and its v1 export remain unchanged. Original local source
attachments are not included in the public build.

From the repository root:

```sh
node --test tests/boundary-observers.test.cjs tests/portal-shell.test.cjs tests/language-controls.test.cjs
node tools/build_site.mjs
node tools/serve_site.mjs 8841
```

Open `http://127.0.0.1:8841/forschung/grenzbeobachter/`. All experiment calculation stays in the browser after local page assets load.

For programmatic replay of a downloaded envelope from the repository root:

```js
const fs = require('node:fs');
const model = require('./forschung/grenzbeobachter/core.js');
const envelope = JSON.parse(fs.readFileSync('your-export.json', 'utf8'));
const verifiedSnapshot = model.replay(envelope.snapshot);
console.log(verifiedSnapshot.summary);
```

Original demo contributions use **LicenseRef-HALVETH-PIRL-2.0**, as assigned by the repository [license map](../../LICENSES.md). This is source-available software. Third-party resources retain their own terms.

