# G^* · Weltkeimwerk — Live

[Raum öffnen / Open space](./) · [Frühere Werkstatt / Earlier workshop](werkstatt.html)

## Deutsch

Die Hauptseite beginnt automatisch. Die 69 öffentlichen Profile aus `assets/universe-data.js` bewegen sich in einem gemeinsamen zweidimensionalen Modellraum. Ein Strömungsfeld und ein gespeicherter Temperaturwert erzeugen eine Bewegung nach dem Lavalampenprinzip. Position und Geschwindigkeit werden im Kern berechnet und direkt dargestellt. Die Membranen treffen aufeinander, federn ab und senden räumlich fortschreitende Berührungswellen aus. Die dargestellte Bewegung verändert damit auch Begegnungen und Kontaktwahl.

Alle Profile können einander Signale senden. Die Auswahl bedient zunächst die bisher am seltensten angesprochenen Empfänger; die aktuelle Entfernung entscheidet zwischen gleich häufig angesprochenen Empfängern. Es gibt keine feste Vierer-Nachbarschaft mehr. Bei 69 Profilen sind 4.692 gerichtete Profilpaare möglich; diese werden über Zeit bedient und nicht gleichzeitig als Tausende Linien gezeichnet.

Vier äußere Eingabekanäle sind getrennt: `SIGNAL`, `CONTACT`, `WAVE` und `ENVIRONMENT`. Ihre Eingaben durchlaufen Port, Membran und Kern; innere Zellen erhalten zusätzlich `CONTAINED`-Signale ihres Parents. Berührungen speichern Partner, Impuls, Zeit und eine begrenzte Anpassung des Abstandverhaltens. Die Kontakterfahrung vergrößert den wahrgenommenen Abstand und die Abstoßungsstärke bei späteren Begegnungen. Raumdaten binden Modelltemperatur, Strömungsvektor, Nachbardichte und Randabstand. Das ist eine definierte numerische Anpassung; semantisches Verstehen oder ein trainiertes neuronales Modell ist nicht implementiert.

Es gibt keine Formulare, Startschritte oder Inspektoren. Die einzige Schaltfläche pausiert den Lauf. Die lokale Geräteuhr bleibt dabei sichtbar. Der alte manuelle Textkern und seine Werkstatt sind weiterhin unter `werkstatt.html` erreichbar; bestehende Exporte gehören zu diesem unveränderten Kern.

`live-core.js` führt das automatische Modell in Version 3.0.0. Ein Seed, derselbe Profilstand, dieselbe Folge von Raumformaten und dieselbe Modellzeit erzeugen denselben Zustand. Der Renderer nutzt `performance.now()` und 50-ms-Modellschritte mit zwei physikalischen Unterschritten zu je 25 ms. Die Darstellung interpoliert die beiden letzten Modellpositionen. `reshape(aspect)` erhält die Fläche des Modellraums, bindet den Formatwechsel als Ereignis und ordnet innere Zellen sofort wieder innerhalb ihres Parents an. Laufende Wellen enden beim Formatwechsel; sie werden nicht still als dieselbe kreisförmige Ausbreitung in einem verzerrten Raum weitergeführt.

Die Form entsteht aus dem lokalen Zustand: Bewegung, Kontaktnachbarn und Raumspuren steuern schlanke, kantige, blütenartige oder schalenartige Konturen. Wiederholte Kontakte können zeitweilige elastische Bindungen erzeugen; pro Zelle höchstens drei. Zusammenhängende Bindungen bilden Ketten und Gitteransätze. Das erzeugt geometrische Formationen; ein Verfahren zum zielgerichteten Bauen fertiger Häuser ist nicht implementiert. Bindungen enden bei großer Entfernung oder nach 22 bis 39 Modellsekunden. Ein gemeinsames Raster mit 32 × 20 Feldern speichert abklingende, sich verteilende Spuren. Zellen schreiben in dieses Raster und reagieren auf seinen Gradienten: Die Umgebung wirkt auf spätere Bewegung zurück. Der Lauf bleibt flüchtig.

Für Kollision und Verschachtelung bleibt ein konservativer Kreis um jede gezeichnete Kontur maßgeblich. Die Konturen liegen innerhalb dieses Kreises. Ein Kontakt bedeutet daher Berührung dieser Hüllen, nicht eine exakt berechnete Kollision zweier verformbarer Oberflächen. Die kleineren inneren Zellen sind innerhalb der Elternhülle enthalten; ihre sichtbaren Formen können bei schmalen Eltern über deren gezeichnete Kontur ragen.

`live-shapes.js` speichert wiederverwendbare Konturpfade und Leuchtsprites. Der Renderer übernimmt Zustände nur nach einem neuen Modellschritt, aktualisiert Beschriftungen höchstens rund 15-mal pro Sekunde und zeichnet höchstens 60 Bilder pro Sekunde. Bei hoher gemessener Zeichenzeit senkt er auf 30; dies ändert weder Modellschritte noch Nachrichten. Die Pixeldichte ist auf 1,5 und insgesamt 3,2 Millionen Canvaspixel begrenzt. Von bis zu 64 Modellwellen werden höchstens die letzten 24 gleichzeitig gezeichnet; ihre Modellwirkungen bleiben erhalten. Die 16 sichtbaren Genommarken sind eine Teilprojektion des unveränderten 32-Bit-Werts. `GStarLiveView.timing()` trennt Zeichen-, Modell- und Kopierzeit. Browserdrosselung und tatsächliche Bildrate bleiben geräteabhängig.

Die angezeigte Uhr verwendet getrennt `Date`. Ein Hintergrund-Tab pausiert die Entfaltung; fehlende Anzeigezeit wird als Lücke gezählt. Ein Frame verarbeitet höchstens 250 ms und erfindet keine lückenlose Hintergrundbeobachtung. Die Geräteuhr ist nicht extern kalibriert. Siehe [MDN: monotone Zeitbasis](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now) und [MDN: Animationszyklen und Hintergrund-Tabs](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Fundamentals).

Rekursion endet bei Tiefe zwei: pro Profil höchstens eine innere Zelle und deren innere Zelle. Der 69-Profil-Stand umfasst damit höchstens 207 Modellzellen. Nach Erreichen der Population laufen Zustandswechsel weiter. Eingangsqueues sind auf acht Einträge, gleichzeitig fliegende Signale auf 512, Wellen auf 64 und die lesbare Ereignishistorie auf die letzten 256 Ereignisse begrenzt; Kapazitätsverluste und der erhaltene Sequenzbereich werden ausdrücklich gezählt. Berührungseingaben desselben Paars haben eine Mindestpause von 2,2 Modellsekunden. Eine Welle trifft jeden Empfänger höchstens einmal; ihre mechanische Wirkung und die höchstens alle sechs Sekunden zugelassene Kerneingabe sind getrennt gezählt. Wellen bewegen sich mit 1,35 Modelllängeneinheiten pro Modellsekunde und enden nach 3,6 Sekunden. Diese Werte definieren eine Softwaregestaltung, keinen gemessenen Naturmechanismus.

Die Seite speichert diesen flüchtigen Lauf nicht und startet beim Neuladen neu. Reduzierte Bewegung zeigt höchstens eine aktuelle Modellansicht je Sekunde und unterdrückt wandernde Wellen sowie Membranschwingungen. `window.GStarLiveView.snapshot()` liefert eine vollständige abgetrennte Leseansicht für Entwicklung und Tests. Die interne `snapshot('render')`-Projektion lässt Partnergedächtnis und Ereignisliste ausdrücklich weg, damit die Darstellung nicht pro Animationsframe Tausende Partnerrecords kopiert.

Die Profile sind veröffentlichte Perspektiven, Figuren und Projekte. Ihre Zellinstanzen führen lokale Regeln aus; Profilnamen behaupten weder unabhängige KI-Agenten noch Beteiligung realer Personen. Signale sind interne Softwarenachrichten. Farben, X, X* und X′ stellen definierte Modellphasen dar. Der 32-Bit-Genomwert steuert die Darstellung und Transformation; er ist kein kryptografischer Beleg. Es gibt keine Netzabfrage, externe Selbstmodifikation oder biologische Wirkungsmessung. Der private Ausgangstext und die gelieferten Bilder gehören nicht zum öffentlichen Release.

## English

The main route starts by itself. The 69 published profiles move through a common 2D model space, exchange signals with every other profile, rebound on membrane contact, and emit spatial touch waves. Position, contact detection, local flow and rendering share the same model. Contact experience adjusts subsequent spacing behavior; temperature memory and local flow affect movement. This is defined numerical adaptation, not semantic understanding or a trained neural model. There are no forms or start steps. One button pauses the unfolding; the separate local wall clock remains live. The earlier manual text ledger is preserved at `werkstatt.html`.

Model version 3.0.0 is deterministic for a fixed profile snapshot, seed, sequence of world aspect ratios and model time. It uses 50-ms steps with two 25-ms motion substeps, driven by monotonic active elapsed time. Rendering interpolates actual model coordinates. Resizing preserves model area, immediately restores child containment and explicitly ends active wavefront observations. Hidden tabs pause; display gaps are counted. The local wall clock is uncalibrated. Recursion is bounded to two nested levels, giving at most 207 cells for the current 69 profiles. States continue changing at that limit. Input queues, in-flight signals, waves and recent history are bounded, with explicit loss counts and sequence coverage. Reduced-motion rendering uses one refresh per second and suppresses traveling wavefronts and membrane oscillations. Reloading starts a new ephemeral run. The read-only developer snapshot is `window.GStarLiveView.snapshot()`.

Version 3 adds state-driven thin, angular, petal and shell forms, bounded temporary bonds and connected formations. A decaying 32 × 20 spatial trace changes later movement through its gradient. Collision and containment use conservative circles enclosing the drawn shapes; this is not exact soft-body contact. These formations do not implement goal-directed house construction. Cached paths and sprites, a detached projection at model-step frequency, bounded pixel density and measured drawing-cost adaptation reduce repeated work. At most 24 of the 64 model wavefronts are displayed simultaneously; all model effects are retained.

These are local software cells based on published project profiles, not evidence of independent AI agents, real-person participation, biological effects or self-modifying external systems. No runtime network calls are made. Private source material is excluded from the release.

## Validation

```sh
node --test tests/gstar-live.test.cjs tests/gstar-membrane.test.cjs tests/gstar-morphology.test.cjs tests/gstar-shapes.test.cjs tests/mobile-shell.test.cjs
node tools/build_site.mjs
```

The test suite covers frame-partition equivalence, port/membrane/core transitions, all 69 profile identities, inherited child state, detached read views, input rejection, display gaps, finite all-pair routing, contact impulses, adaptive spacing, wavefront encounters, shared geometry, resize containment and a virtual one-hour run. Virtual runs are not measured hours of browser operation.

## Typed core and directional sign / Typisierter Kern und Richtungszeichen

The project may define its own envelope `B_theta^D[z] = {core: z, coreType: D, ports, geometry, operatorRef, definitionVersion}`. A separate operator `T_theta: D × I_theta → D_prime` specifies any actual state change. G, X or another Unicode text can share a text envelope; numbers, images and graphs require their declared type and a compatible operator. The current live renderer uses a finite eight-glyph catalogue. It does not execute arbitrary content.

Planar directions can be addressed by `u(phi) = (cos(phi), sin(phi))`; finitely drawn rays are samples of the direction circle, not every possible spatial direction. Incoming, outgoing and bidirectional ports are distinct. Equal response in every direction is an additional isotropy property. A project star has its own definition; it does not inherit the rules of the [Kleene star](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Algebra/Order/Kleene.html) or an [involutive star operation](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Algebra/Star/Basic.html).

`observation.status = OBSERVED`, `evaluation.result = FALSIFIED_UNDER_BOUND_ORACLE` and `inquiry.status = OPEN` can coexist when bound to an observation, a particular evaluated claim and a follow-up question respectively. OPEN is a workflow state, not a halfway truth value. A graphical boundary, red ray or star alone establishes no physical radiation mechanism.

## Design references

- [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) describes caching repeated drawing work; the renderer reuses contour paths and glow sprites.

- [Craig Reynolds: Boids](https://www.red3d.com/cwr/boids/) explains movement governed by local position and velocity. This implementation combines bounded local movement with a separate fair signal scheduler over all profiles.
- [Box2D: Simulation](https://box2d.org/documentation/md_simulation.html) and [contact events](https://box2d.org/documentation/group__events.html) motivate separating physical response from event processing. No Box2D dependency is bundled; this page has a small custom circle model.
- [Growing Neural Cellular Automata](https://distill.pub/2020/growing-ca/) and [Lenia](https://arxiv.org/abs/1812.05433) are research references for local state rules and artificial-life patterns. Their trained models and results are not claimed as implemented here.

---

## Earlier manual ledger · retained API documentation

# G^* · Weltkeimwerk

[Öffnen / Open](./) · [Grenzbeobachter / Boundary observers](../grenzbeobachter/) · [Lizenzkarte / License map](../../LICENSES.md)

## Deutsch

G^* ist ein lokaler Arbeitsraum für **synthetische Textzustände und ihre Geschichte**. Ein Keim kann einen Vorschlag hervorbringen; dessen Übernahme in die Modellwelt, eine spätere Beobachtung und die Verwendung eines Snapshots als neuer lokaler Ursprung sind getrennte Ereignisse. Graph, Inspektor und Zeitspur zeigen verschiedene Ansichten desselben Ledgers.

Das Zeichen **G^*** und seine Deutungen mit Halo, Stern und Schweif sind nutzerdefinierte Projektgestaltung. Die neue SVG ist eine eigenständige Zeichnung. Begriffe wie Keim, Genesis und Welt beziehen sich hier auf das deklarierte Softwaremodell. Weitergehende biologische, physikalische oder metaphysische Deutungen bleiben Hypothesen beziehungsweise ausdrücklich benannte Analogien; die Demo liefert dafür keinen Messbeleg.

### Tatsächliche Operationen

| Befehl | Wirkung im Modell |
| --- | --- |
| `SEED` | Bewahrt den eingegebenen Text als UTF-8-gebundenen Rohtextrecord, registriert einen Keim und legt einen lokalen Anker an. Der Keim ist noch keine aktive Weltversion. |
| `PROPOSE` | Erzeugt einen adressierten Kandidaten und Herkunftsrelationen. Die aktive Modellwelt bleibt unverändert. |
| `MATERIALIZE` | Übernimmt einen bestehenden Keim oder Kandidaten als aktive Version seiner Entität. |
| `OBSERVE` | Liest genau eine bereits materialisierte lokale Version und speichert eine eigene Beobachtung. Frühere Beobachtungen bleiben an ihre damalige Version gebunden. |
| `OPEN_UNKNOWN` | Bindet eine offene Frage und einen Wiederaufnahmeauslöser an einen Zustand. |
| `REVISIT` | Ergänzt einen als nutzerdeklariert und ungeprüft bezeichneten Hinweis. Die Frage bleibt offen. |
| `SNAPSHOT` | Bindet das bisherige Ereignispräfix, dessen Digest und die vorhandenen Zustands-, Beobachtungs- und Fragenreferenzen. |
| `REANCHOR` | Verwendet einen ausdrücklich ausgewählten Snapshot als neuen lokalen Anker und erhält die gesamte Vorgeschichte. |

`PROPOSE` besitzt vier Modi:

- **`DERIVE_CHILD`**: ein Parent, neue Entität. Exakt gleicher Text liefert `NO_CHANGE`.
- **`REVISE`**: ein Parent, dieselbe Entitäts-ID, neue Zustandsversion. Der Parent muss der aktuell materialisierte Head sein. Gleicher Text liefert `NO_CHANGE`; eine zwischenzeitlich überholte Revision wird bei der Materialisierung abgelehnt.
- **`CLONE_INSTANCE`**: ein Parent und exakt derselbe Text, bewusst neue historische Instanz. `IDENTICAL_TO_PARENT` kennzeichnet die Inhaltsgleichheit.
- **`COMPOSE`**: zwei bis acht Parents mit verschiedenen Entitäts-IDs. Der Ergebnistext wird ausdrücklich angegeben; die Funktion verfasst ihn nicht selbst. Der Record benennt seine Textgleichheit oder Textabweichung gegenüber den Parents.

Ein Parent ist ein **bereits registrierter State-Record**. Außer bei `REVISE` kann er selbst noch Keim oder Kandidat sein. Elternzahl und Zahl der Eingaben sind verschieden: ein Triggertext wird nicht als weiterer Parent gezählt. Die Gleichheitsdefinition lautet **exakte Unicode-Textgleichheit**, einschließlich Zeilenenden. Neue ID bedeutet neue historische Adresse, nicht automatisch neuen Inhalt. Semantische Gleichheit wird nicht bewertet.

### Zeit, Grenzen und Belegumfang

Die Modellzeit ist die **Ordinalzahl eines angenommenen Ereignisses**. Auch `NO_CHANGE` ist ein aufgezeichnetes Ereignis. `recordedAt` stammt getrennt davon aus der lokalen Geräteuhr; deren Kalibrierung bleibt unbekannt. Die historische Ansicht `view(sequence)` projiziert ein vorhandenes Präfix, ohne die laufende Geschichte zurückzuschreiben. Ein neuer lokaler T0-Anker überschreibt keine frühere Zeit.

Version 1.0.0 begrenzt eine Sitzung auf 128 Ereignisse, 48 Zustandsrecords und 64 offene Fragen. Ein Keimtext darf 8.192 UTF-8-Bytes, ein vorgeschlagener Zustandstext 2.048 Bytes enthalten; der kanonische Export ist auf **4 MiB** begrenzt. Ungültige Eingaben werden abgelehnt. Es gibt keinen allgemeinen Solver für 999 Fragen, keine reservierten 25-Port-Adressräume und keinen externen Beobachter in diesem Kern.

SHA-256 bindet die Records und ihre Ereigniskette. `verify` spielt die Befehle erneut ab und prüft die vollständige Exportkonsistenz. Das belegt Selbstkonsistenz des lokalen Modells; es authentisiert weder Autorenschaft noch Gerätezeit oder eine Aussage über die Außenwelt. `restore` setzt nur einen erfolgreich geprüften Export fort. Wiederholte Dispatches sind eigene Ereignisse; die API besitzt keinen Command-ID-Deduplikationsvertrag.

## English

G^* is a local workspace for **synthetic text states and their history**. Seed registration, a proposed successor, materialization into the active model, observation and explicit snapshot reanchoring are separate events. The graph, inspector and timeline project one ledger.

The **G^*** sign, halo, star and trail are user-defined project imagery. The SVG is an original drawing. Seed, genesis and world name software concepts here. Biological, physical or metaphysical readings remain hypotheses or identified analogies; this demo provides no measurements supporting those readings.

`SEED` records the exact UTF-8 input, a germ state and a local anchor. `PROPOSE` creates a candidate and ancestry records while leaving the active model unchanged. `MATERIALIZE` makes a state active. `OBSERVE` reads a specific materialized version into a separate record. `OPEN_UNKNOWN` registers a question and reopen trigger; `REVISIT` appends an unverified user-declared note and leaves that question open. `SNAPSHOT` binds the existing event prefix. `REANCHOR` explicitly selects a snapshot as a new local origin while preserving its history.

Proposal modes are `DERIVE_CHILD`, `REVISE`, `CLONE_INSTANCE` and `COMPOSE`. Derivation creates a new entity; revision preserves its entity ID and requires the currently materialized head. Identical text produces `NO_CHANGE` in either mode. Cloning intentionally creates a new historical instance with identical text and labels it accordingly. Composition requires two to eight distinct entity parents and an explicitly supplied result text; it does not generate prose. Existing germ or candidate records can be parents except where revision requires the active head. Trigger inputs are not counted as extra parents.

Equality means **exact Unicode text equality**, including line endings. A new ID is not proof of new content or meaning. Model time is an accepted event's ordinal number; local device UTC is a separate, uncalibrated record. Historical views and new local anchors preserve earlier events.

The limits are 128 events, 48 states, 64 unresolved questions, 8,192 UTF-8 bytes per seed, 2,048 bytes per proposed text and **4 MiB per canonical export**. The kernel implements no generic question solver, reserved 25-port address space or external collector. `verify` replays the complete export; `restore` continues a verified export. SHA-256 proves byte binding and local self-consistency, not authorship, trusted time or external truth. Repeated dispatches are separate events rather than automatically deduplicated commands.

## API and development / API und Entwicklung

The browser global is `GStar`; CommonJS exposes the same API from `core.js`:

| API | Result |
| --- | --- |
| `create({runId?, clock?})` | New session. The optional clock returns an ISO UTC timestamp with milliseconds. |
| `app.dispatch(command)` | Promise of `{event, outcome}`; invalid commands reject. |
| `app.view(sequence?)` | Detached current or historical projection. |
| `app.export()` | Detached ledger envelope. |
| `verify(envelope)` | Promise of a replay verification receipt; inconsistent input rejects. |
| `restore(envelope, {clock?})` | Promise of a verified session that can continue. |
| `canonical(value)`, `digest(value)` | Canonical JSON and asynchronous SHA-256 helpers. |

The eight-event example below mirrors the finite demo. It produces four states, two active entities, one snapshot and three local anchors. Observation remains a separate explicit action.

```js
const GStar = require('./forschung/weltkeimwerk/core.js');

(async () => {
  const app = GStar.create({ runId: 'README_DEMO' });
  async function state(command) {
    const { event } = await app.dispatch(command);
    return event.records.find(record => record.kind === 'STATE').id;
  }

  const a = await state({ type: 'SEED', label: 'A', text: 'Alpha' });
  const b = await state({ type: 'SEED', label: 'B', text: 'Beta' });
  const c = await state({
    type: 'PROPOSE', parents: [a, b], mode: 'COMPOSE',
    text: 'Alpha + Beta', trigger: 'Explicit local composition'
  });
  await app.dispatch({ type: 'MATERIALIZE', stateId: c });
  const d = await state({
    type: 'PROPOSE', parents: [c], mode: 'DERIVE_CHILD',
    text: 'Alpha + Beta + Delta', trigger: 'Explicit local derivation'
  });
  await app.dispatch({ type: 'MATERIALIZE', stateId: d });
  await app.dispatch({ type: 'SNAPSHOT' });
  await app.dispatch({ type: 'REANCHOR', snapshotId: app.view().snapshots.at(-1).id });

  const envelope = app.export();
  console.log(app.view().counts);
  console.log(await GStar.verify(envelope));
})().catch(error => { console.error(error); process.exitCode = 1; });
```

From the repository root:

```sh
node --test tests/gstar-core.test.cjs tests/portal-shell.test.cjs tests/language-controls.test.cjs
node tools/build_site.mjs
node tools/serve_site.mjs 8841
```

Open `http://127.0.0.1:8841/forschung/weltkeimwerk/`. The model runs locally after its page resources load. DE/EN are the supported interface languages. The existing boundary-observer demo remains a separate finite sampling model.

Original contributions use **LicenseRef-HALVETH-PIRL-2.0** under the repository [license map](../../LICENSES.md). This is source-available software; third-party resources retain their own terms.
