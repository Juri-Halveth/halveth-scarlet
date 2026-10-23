[Deutsch](README.md) · [English](README.en.md) · [Русский](README.ru.md)

# SCARLET · Spiele, Grafik und technische Modelle

[Windows: alte glTF-Arbeitskopien prüfen und gezielt reparieren](docs/WINDOWS_GLTF_RECOVERY.md)

**Erst ausprobieren. Dann den Code ansehen.** SCARLET verbindet eigene
Browser-Spielprototypen, interaktive Grafik und synthetische Lehrmodelle.

[Technische Demos öffnen](https://juri-halveth.github.io/halveth-scarlet/forschung/wegweiser/)
· [Erdszene](https://juri-halveth.github.io/halveth-scarlet/)
· [Portfolio](https://juri-halveth.github.io/)

## Ausgewählte Einstiege

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
**Nacheinander** lässt sie in Reihenfolge erscheinen. **Alle ins Zentrum**
zieht die gesamte Kette gleichzeitig zusammen; **Wieder entfalten** öffnet
dieselben Formen erneut. Kleine Spiegelflächen zeigen verzögerte
Rotationsstände und die feinen Spuren gespeicherte Positionen dieser Animation.
Der freiwillig aktivierte Klang wird lokal erzeugt. Die Einstellung für
reduzierte Bewegung wird berücksichtigt. Bestehende Modellkoordinaten bleiben erhalten.

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

Projektleitung: **Juri Halveth / HALVETH**. Entwicklung mit KI-Unterstützung.
[Lizenzen und Herkunft](LICENSES.md) · Kontakt: **security@halveth.de**.

[Portal Chess direkt öffnen](https://juri-halveth.github.io/halveth-scarlet/forschung/portal-chess/)
