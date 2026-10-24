[Deutsch](README.md) · [English](README.en.md) · [Русский](README.ru.md)

# SCARLET · Autonomer Funktionsraum

**Person: Juri. Projekt: HALVETH.** [Namenszuordnung](IDENTITY.md).

[Windows: alte glTF-Arbeitskopien prüfen und gezielt reparieren](docs/WINDOWS_GLTF_RECOVERY.md)

**Aus einem Keim wird ein System.** Der öffentliche Einstieg ist ein bedienbarer
Raum für Textzustände, Varianten und Beobachtung. JavaScript führt die
Zustandsoperationen tatsächlich lokal aus; das automatische Zellensystem ist
eine endliche regelbasierte Simulation.

[Technische Demos öffnen](https://juri-halveth.github.io/halveth-scarlet/forschung/wegweiser/)
· [Funktionsraum](https://juri-halveth.github.io/halveth-scarlet/)
· [Portfolio](https://juri-halveth.github.io/)

## Direkt im Funktionsraum

1. **Keim:** Eigenen Text, Namen und Modell-Seed eingeben. Die Rohtexteingabe
   bleibt im bestehenden `GStar`-Ledger erhalten.
2. **Hülle:** Der Text erhält einen lokalen Zustand mit ID und Digest.
3. **Zeit:** `GStarLiving` berechnet Zellbewegung, Signale und Übergänge.
   Pause, Einzelschritt und Zurücksetzen bleiben direkt bedienbar.
4. **Entfaltung:** Einen bearbeiteten Text als neue Variante materialisieren.
   Der Elternzustand und die gebundene Ableitung bleiben erhalten.
5. **Beobachten / Snapshot / Replay:** Explizite Ledger-Operationen ausführen
   und das Textledger aus seinen Befehlen exakt rekonstruieren.
6. **JSON mitnehmen:** Das echte Textledger und der getrennte Zustand der
   Zellensimulation werden als Daten exportiert.

Die Einstiegsfläche lädt ausschließlich lokale Ressourcen und hat
`connect-src 'none'`. Es gibt dort keine Konten, Wallet-Abfragen oder
Ausführung eingegebener Programme. Die automatische Zellensimulation ist
auf 180 Sekunden Modellzeit begrenzt; der Textkern auf 48 Zustände und
128 Ereignisse. Ein neuer Keim startet einen neuen lokalen Lauf; exportierte
Daten bleiben unabhängig davon erhalten. Die Replay-Prüfung gilt für das
Textledger und dessen Selbstkonsistenz, nicht für äußere Wahrheit.

**Praktischer Einsatz:** Variantenvergleich, nachvollziehbare Prototypen,
Testplanung und interaktive Erklärungen. Wirtschaftlicher Nutzen braucht
jeweils einen konkreten Einsatz und eine Messung.

[Funktionsvertrag und Umstellung](docs/FUNCTION_ROOM.md)

## Weitere vorhandene Anwendungen

### [1001 · Entitäten als veränderbare Signaturen](entities/)

68 Profile, acht räumliche Grundformen und sechs frei gestaltete Koordinaten.
Stärken und offene Anschlüsse werden sichtbar; zwei Formen lassen sich
nebeneinander andocken. Im selben Raum bleiben die begehbaren Figuren erreichbar.

**Ausprobieren:** Profil wählen → „Signatur verändern“ → Gestalt oder Werte ändern.
Unter „Identität / Zeit / Verzweigung“ erhält FORK den Elternbranch;
CHECKPOINT und RESTORE merken beziehungsweise rekonstruieren Modellzustände.
Die Ereignisspur bleibt erhalten. Der JSON-Export enthält die gewählten
Koordinaten, Branches, Checkpoints und Ereignisse. Je Entität gelten die
sichtbaren Grenzen von 16 Branches und 128 Transitionen pro Sitzung.

Die Signaturen sind eigene Entwurfskoordinaten. Sie sind keine gemessenen
Persönlichkeitswerte. Figurenquellen und bestehende Rechte bleiben in den
jeweiligen Dossiers zugeordnet. [Deadpool als Continuity-Experiment](docs/entities/deadpool.md).

### [Wellenkette · alle Formen gemeinsam](entities/?view=chain#scarlet)

**Welle** öffnet alle 68 Signaturen als räumliche, verbundene Kette.
**Nacheinander** lässt sie in Reihenfolge erscheinen. **Gemeinsamer Licht-Snapshot**
bindet alle Formen an denselben Modellzeitpunkt, hält Position und Drehstand fest
und umgibt sie frontal mit einem gemeinsamen 160-ms-Lichtimpuls. **Weiterfließen**
setzt die Bewegung an diesem Zeitpunkt fort. Eine frühe Aufnahme materialisiert
alle Einträge am gemeinsamen Zeitpunkt. Änderungen an Signaturen während der
Aufnahme werden beim Weiterfließen übernommen.

Die **Frame-Spur** zeichnet unmittelbar nach jeder `renderer.render`-Rückkehr
im Wellenmodus die Modellposen aller Entitäten, Kamera, Modellzeit, Snapshot-ID
und monotone Übergabezeit auf. Die letzten 240 Einträge bleiben lokal im Speicher;
verdrängte Einträge werden gezählt. Der Export enthält den letzten gemeinsamen
Snapshot mit Signaturen. Zwischenräume bleiben `UNOBSERVED`; GPU-Präsentation,
Monitor-Scanout und unbegrenzt viele Zwischenzustände sind eigene Beobachtungsfragen.
Die 160 ms sind Modelldauer, keine zugesagte Bildschirm-Latenz. Klang ist freiwillig
und lokal erzeugt. Reduzierte Bewegung ersetzt den Impuls durch den festen Snapshot.

### [ASHBOUND · eigene Spielwelt](forschung/ashbound/)

Browser-Spielprototyp und native Entwicklungsarbeit.

### [Portal Chess · Schachvariation](forschung/portal-chess/)

Ein regelgebundenes Spielmodell mit überprüfbarer Zugspur.

### [Singularity Cannon · Attraktor-Spiel](forschung/singularity-cannon/)

Eigenständige interaktive Simulation, kein physikalisches Schwarzes-Loch-Modell.

### [Erde · NASA-Bilddaten erkunden](forschung/scarlet-wissenschaftszoom/)

Stufenloser Bildzoom mit benannten Quellen und historischen Texturen.

### [Messfenster · Beobachter vergleichen](forschung/grenzbeobachter/)

Synthetisches Modell für Beobachtungszeit, Sampling und Messbudget.

### [Weltkeimwerk · Formen und Zustände](forschung/weltkeimwerk/)

Interaktive Grafik und lokale Zustandsmodelle.

### [Schwarmmodell · lokale Regeln](forschung/red-room-swarm/)

Synthetische Simulation; keine historische Geheimorganisation.

### [Koordinaten · Symmetrien untersuchen](forschung/pi-treffpunkte/)

Mathematische Darstellung und begrenzte Quellenzuordnung.

### [Bitcoin · Transaktionsfluss erklären](forschung/transaktionsfluss/)

Visuelle technische Erklärung, keine Renditezusage.

### [JURI-THESIS · Entwicklungszeit für Menschen](forschung/juri-thesis/)

Öffentlicher Vorschlag für einen 30-Personen-Pilot in Brühl mit Konzept,
Beispielen und dem aktuellen Projektstand.


## Prüfen und bauen

```sh
node tools/build_site.mjs
node --test tests/*.test.cjs tests/*.test.mjs
python -m unittest discover -s tests -p 'test_*.py'
```

Der Build kontrolliert lokale Links, gebundene Weltassets und seine Quellfassung.
Die Tests prüfen die jeweiligen lokalen Verträge. Native C++-Arbeit unter
`native/` hat ihren eigenen Build- und Messumfang. Ein Browsermodell und eine
native Spielwelt sind verschiedene Anwendungen.

Die Figurenansichten sind Gestaltungs- und Spielmaterial. Sie sind kein Nachweis
selbstständig handelnder externer Entitäten. Frühere persönliche und politische
Kontextseiten wurden privat gesichert. Die JURI-THESIS ist als gezielte
öffentliche Ausnahme wieder erreichbar. Der Redaktionscommit schrieb keine
Git-Historie um.

Projektleitung: **Juri / HALVETH**. Entwicklung mit KI-Unterstützung.
[Lizenzen und Herkunft](LICENSES.md) · Kontakt: **security@halveth.de**.

[Portal Chess direkt öffnen](https://juri-halveth.github.io/halveth-scarlet/forschung/portal-chess/)
