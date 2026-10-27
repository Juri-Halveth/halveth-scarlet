# Das Forschungsatelier

Ein neuer Einstieg verbindet die 68 bestehenden Scarlet-Profile mit einer Forschungslandkarte und drei ausführbaren Erklärungsmodellen. Der Atlas umfasst 26 Hauptäste, 18 Nebenäste, acht Arbeitsströme und 14 vom bereitgestellten Dokument angegebene Phasen.

Die Oberfläche beginnt mit einer Frage und einem unmittelbar bedienbaren Modell. Verbindungen, vollständige Profilinventur und ein eigener Forschungsfaden sind jeweils als eigener Bereich erreichbar. Quellen, Gegenprobe und der Umfang des Modells stehen beim jeweiligen Thema.

## Ausprobieren

- **Pulsar:** Derselbe rotierende Strahl wird aus verschiedenen Richtungen betrachtet. Die vier Projektionen verwenden benannte geometrische Operatoren. Alle Größen sind normiert. Das Modell ist keine gemessene Lichtkurve.
- **Wachstum und Wirbel:** Das erste Modell fügt Konturen hinzu und erhält frühere Punkte. Das zweite bewegt dieselben Marker auf Kreisbahnen. Die Konturen bilden einen geometrischen Vergleich; sie simulieren weder Holzfasern noch die Navier-Stokes-Gleichungen.
- **Vier Wellen:** Vier gleichfrequente skalare ebene Wellen überlagern sich linear. Modellzeit und eine relative Phase verändern die momentane Amplitude. Polarisation, Teilchenwinde, Plasmaprozesse und astrophysikalische Kohärenz sind getrennte offene Fragen.

Ein Durchlauf endet bei Modellzeit 1. Ein weiterer Start beginnt wieder bei 0. Verborgene Tabs halten die Animation an. Der Regler bleibt im Bereich 0 bis 1.

## Daten und Herkunft

`catalog.mjs` enthält die redaktionellen Fragen und Quellenhinweise. Die bereitgestellte Mindmap war selbst eine Gesprächszusammenfassung. Ihre Formulierungen werden daher als abgeleitete Forschungsansätze geführt. Eine Deutung der Nutzerabsicht ist als redaktionell gekennzeichnet. Die lokalen Originaldateien und Monitorfotos werden nicht in dieses öffentliche Verzeichnis kopiert.

`../../tools/build_entity_research.mjs` erstellt daraus:

- `catalog.json`, `sources.json` und `contracts.json`;
- `../INVENTORY_20261027.json` für jedes Mitglied des bestehenden Registers;
- `../relations.json` mit vollständigen Endpunktadressen und Definitionsdigests.

Die Inventur bindet die Profil-, Dossier-, gemeinsamen Code- und Testdateien mit SHA-256. Ein Testverweis benennt den gemeinsamen Kernel oder Generator; er behauptet keinen individuellen autonomen Prozess. Die fachliche Prüfung aller Profilrollen bleibt eine eigene Aufgabe.

Die Relationslinien sind redaktionell begründete Suchverbindungen. Sie sind ungerichtet und nichttransitiv; ihre Definition weist ihnen keine Kausalität oder Autorität zu. Beim Laden werden die Endpunktdigests gegen den Katalog geprüft. Diese Prüfung belegt die Konsistenz des gebundenen Datenstands.

Die Phasen enthalten ausdrücklich unbekannte Ereigniszeiten. Die aktuelle Korrektur zum inzwischen gemergten Molekül-PR 11 ergänzt den abgeleiteten Stand; sie überschreibt die ursprüngliche Mindmap nicht.

## Quellenumfang

Das Quellenregister unterscheidet gelesene Auszüge, Suchauszüge, Forschungsmodelle, Konferenzbeiträge und einen gebundenen Softwarestand. Es bildet die ausgewählten Fragen dieses Ateliers ab. Eine vollständige Literaturübersicht aller 44 Gedanken ist ein weiterführender Auftrag.

Die drei mitgelieferten Monitorfotos zeigen Illustrationen mit den Beschriftungen TON 618, OJ 287 und Cygnus A. Sie waren ein Forschungsanstoß; die astronomischen Aussagen des Ateliers binden eigene Fachquellen.

## Forschungsfaden und NOVA

Eigene Notizen werden in der geöffneten Sitzung angehängt. Der Download nimmt beim Klick einen festen Stand einschließlich Modellparametern auf. Der Export enthält einen UTF-8-Payload und dessen SHA-256. Der Digest prüft die Datenintegrität innerhalb dieses Exports; er authentisiert weder den Autor noch die äußere Wahrheit einer Notiz.

Die exportierte JSON-Datei kann mit NOVA als neue Quelle eingelesen werden:

```text
python nova/nova.py --workspace MEIN_FORSCHUNGSRAUM ingest NOVA-Faden.json --tag research-atelier
python nova/nova.py --workspace MEIN_FORSCHUNGSRAUM verify
```

## Reproduzieren

```text
node tools/build_profiles.mjs
node tools/build_entity_research.mjs
node tools/build_entity_research.mjs --check
node --test tests/entity-research.test.mjs
node tools/build_site.mjs
```

Für die lokalen JSON-Abrufe benötigt die Seite einen HTTP-Server. Starte im Repository `python tools/serve_research.py --port 41878` und öffne `http://127.0.0.1:41878/entities/research/`. Der Starter bindet Loopback, liefert `.mjs` mit JavaScript-MIME aus und sperrt Verzeichnislisten sowie interne Werkzeuge.

## Rechte

Neue eigene Texte, Code, Auswahl und Anordnung: HALVETH PIRL 2.0 gemäß `../../LICENSES.md`. Verlinkte Arbeiten und zugrunde liegende Tatsachen behalten ihre eigenen Rechte und Bedingungen.

## Figurenpilot

Das Figurenatelier lädt zwei Quaternius-Varianten erst beim Öffnen: einen abgeleiteten Basiskopf mit vollständigem Waldläuferinnen- beziehungsweise Reisenden-Outfit. Die Bibliothek umfasst 43 Animationen. Jede der getrennt gehäuteten Figurenkomponenten erhält einen eigenen Mixer; der Adapter überträgt lokale Positions-, Quaternion- und Skalentracks relativ zur jeweiligen Bindepose. Gehen und Laufen verwenden die Variante ohne Root Motion. Die Anpassung ist ein gebundener Vorschauadapter und keine allgemeine Garantie für alle Rigs.

Scheitert das erste Laden, erscheint „Figuren erneut laden“. Erneutes Öffnen startet ebenfalls einen neuen Versuch. Fehlgeschlagene Initialisierungen geben ihre Listener, Grafikressourcen und das Canvas frei. Bei einem späteren Variantenfehler bleibt die bisherige Figur bedienbar. Einmalige Manifest- und Teilefehler wurden auf getrennten Loopback-Vorschauen durchgespielt; eine zuvor gespeicherte Sitzungsnotiz blieb beim Retry erhalten.

Die Quelldateien der drei gelieferten Standard-Pakete sind CC0-1.0. `characters/manifest.json` bindet Archivhashes, genaue Quelldateien, den Kopf-Dreiecksfilter und die ausgelassenen Normal-/ORM-Kanäle. Behaltene Farbtexturen werden unverändert eingebettet; die Originalpakete bleiben separat. Das öffentliche Pilotpaket umfasst rund 33 MB. Es enthält stilisierte Spielfiguren; Realismus oder anatomische beziehungsweise biomechanische Validität werden dadurch nicht gemessen.

Die Ableitungen können aus den drei Original-ZIPs neu erzeugt werden:

```text
python tools/prepare_research_characters.py PFAD_ZU_DEN_DREI_ZIPS
```

Die zusätzlich verwendeten Three.js-Loader stammen aus der zur vorhandenen Runtime passenden Version 0.186.0 und behalten ihre MIT-Lizenz. `vendor/NOTICE.json` hält die originale Quelle und die angepassten Importpfade mit Digests fest.
