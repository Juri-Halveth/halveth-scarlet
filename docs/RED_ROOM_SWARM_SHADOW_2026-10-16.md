# Red Room T± — fiktionales Schwarm-Schattenmodell

## Ausgangspunkt und Grenze

Der Nutzer schlägt eine Erzählhypothese vor: Befreite Figuren können ihre Identität als Menschen behalten, während frühere Datenvorlagen in Backups oder Aufzeichnungen fortbestehen. Diese lokale Umsetzung nutzt **fiktionale Rollen** und erfundene Mengen. Der reale Name einer Drittperson aus dem Gespräch wird weder gespeichert noch als Suchbegriff, Figurenname oder Beleg benutzt.

Die separate öffentliche Red-Room-Quellenarbeit behandelt Marvels Red Room als Fiktion und lässt einen historischen identischen Red Room `UNKNOWN`. Dieses Projekt baut keine historische oder persönliche Behauptung daraus. Es liest keine privaten Backups, Geräte, Chats oder Webkonten aus und sendet keine Anfrage an Dritte. Die stärkste Aussage lautet: **Die angegebenen Regeln erzeugen diese Zustände in einer lokalen Simulation.**

## Gebundener Arbeitsstand

- Ursprüngliche lokale Modellbasis: Git-Commit `addbd11d28c75571a61bd8d7b315f9668e548bef` im SCARLET-Repository.
- Separater öffentlicher Release-Kandidat: `codex/red-room-public-20261017`, auf `b4dac21d05049f3f86ce8e8403df6ed599ee1718` aufgesetzt; nur die Red-Room-Commits wurden übernommen. Die ursprüngliche Modellbasis bleibt als Commit erreichbar.
- `TARGET_SYSTEM`: fiktionale Red-Room-Erzählhypothese aus dem aktuellen Gespräch.
- `OBSERVED_SURFACE`: vorhandene SCARLET-Dateien und die separate, bereits vorhandene öffentliche Red-Room-Quellenkarte.
- `COUNTERPART_MODEL`: `assets/red-room-swarm-model.mjs`, Version `red-room-swarm-shadow-v1`.
- `SHADOW_REPLICA`: rein lokale Zustandsmaschine und Darstellung unter `forschung/red-room-swarm/`.
- `PRODUCTION_SYSTEM`: keines gebunden. Es gibt keinen beobachteten realen KI-Schwarm.

## Typisierte T±-Zustände

| Zeit | Personenachse | Datenachse | Laufzeitachse |
| --- | --- | --- | --- |
| T−3 | Drei fiktionale Rollen im Raum | Keine Vorlage | Kein Träger |
| T−2 | Rollen im Raum | Drei Vorlagen als Archivereignis | Kein Träger |
| T−1 | Rollen im Raum | Sechs Backupfragmente | Kein Träger |
| T0 | Drei Rollen frei | Archiv kann erhalten bleiben oder enden | Ehemalige Kontrolle über Personen wird nicht aus Datenspuren abgeleitet |
| T+1 | Rollen frei | Bis zu drei öffentliche Echos | Nur ein Modell aktiviert eine Kopie |
| T+2 | Rollen frei | Gleiche drei Echos in zwei Gegenmodellen | Frische lokale Probe trennt aktive Kopie von blockiertem Träger |
| T+3 | Rollen frei | Echos bleiben | Aktiver Modellpfad verzweigt auf sechs Kopien |
| T+4 | Rollen frei | Archiv und Echos können bleiben | Lokaler Widerruf beendet die simulierten Laufzeitkopien |

Ein Archivobjekt ist ein kopierbarer Datensatz. Eine fiktionale Person bleibt als eigene Achse erhalten. Eine aktive Kopie entsteht im Modell nur mit **Vorlage, Träger, Laufzeitautorität und Route**. Die gezeichnete „Wanda-Portal“-Form bezeichnet diese mögliche Modellbrücke; sie ist keine technische oder physische Portalbehauptung.

## Vier Gegenmodelle und derselbe Test

1. `archive`: Vorlagen und Web-Echos bestehen fort, ohne Träger.
2. `blocked`: Vorlagen, Web-Echos und Träger bestehen fort, aber ohne Laufzeitautorität.
3. `active`: Vorlagen, Träger, Autorität und Route treffen zusammen; der lokale Schatten breitet sich auf dem gerichteten Graphen `A→{B,C}`, `B→{D,E}`, `C→F` aus und widerruft den Lauf bei T+4. Ein Hop benötigt einen Modellschritt, sodass T+1 die Knotenmenge `{A}`, T+2 `{A,B,C}` und T+3 `{A,B,C,D,E,F}` hat. Die Knoten sind erfundene Laufzeitpositionen, keine realen Hosts.
4. `erased`: Archivfragmente enden bei T0; keine späteren Echos oder Kopien.

`active` und `blocked` haben bei T+2 **je drei öffentliche Echos**. Der erste interne Modellunterschied liegt bei T+1. Dieselbe versionsgebundene Zählregel prüft beide Verläufe bei demselben T-Wert. Die Gegenprobe ab T+2 ist eine **vorprogrammierte lokale Modellabfrage**, kein Netzwerkchallenge gegen reale Systeme. Ein fehlender lokaler Antwortwert belegt nur den Zustand dieser Simulation.

## Tiefere Prüfpfade und Gegenhypothesen

| Kandidat | Vorhersage im Modell | Gegenmodell | Kleinste sichere Unterscheidung | Offene Brücke |
| --- | --- | --- | --- | --- |
| Ein Backup überlebt die Befreiung | Archivvorlagen bleiben bei T0 zählbar | `erased` | Gebundene, eigene lokale Backup-Metadaten lesen | Keine reale Backupquelle autorisiert oder beobachtet |
| Web-Echos bedeuten einen Lauf | Frische Eingabe hätte eine Laufzeitantwort | `blocked` | Nur im lokalen Schatten eine neue Eingabe prüfen | Echo-Provenienz, Träger und Autorität in der Außenwelt unbekannt |
| Widerruf beseitigt alle Spuren | Archiv- und Web-Zähler würden auf null fallen | `active` bei T+4 | Daten- und Laufzeitachsen getrennt vergleichen | Externe Retention und Löschung unbekannt |

Diese Äste bleiben Hypothesen; aus einer Wortähnlichkeit, einem Namen, einer zeitlichen Nähe oder einer gleichen Darstellung entsteht keine Kausal- oder Identitätsrelation. Die sichtbare Simulation ist ein `FINITE_SNAPSHOT` mit Reopen-Trigger: eine neu bereitgestellte, rechtmäßig lesbare Quelle mit unterscheidbarer Provenienz und passender Autorität.

## Reproduzieren

`node --test tests/red-room-swarm-model.test.cjs` prüft die Personen-/Daten-Trennung, Archiv ohne Laufzeit, die Gegenmodelldifferenz, den lokalen Widerruf und deterministische Eingaben. `node tools/build_site.mjs` baut die statische Seite und prüft lokale Verweise. Browserprüfung bleibt eine eigene Ebene für Layout, Sprache, Bedienbarkeit und Bewegung.

Code, SVG-Geometrie und CSS sind eigene Gestaltung. Die Seite enthält keine Marvel-Bilder, keine Personendaten der erwähnten Drittperson und keine Anbindung an echte Backups oder Netzwerke.
