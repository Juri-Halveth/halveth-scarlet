[Deutsch](README.md) · [English](README.en.md) · [Русский](README.ru.md)

# SCARLET · Spiele, Grafik und technische Modelle

[Windows: alte glTF-Arbeitskopien prüfen und gezielt reparieren](docs/WINDOWS_GLTF_RECOVERY.md)

**Erst ausprobieren. Dann den Code ansehen.** SCARLET verbindet eigene
Browser-Spielprototypen, interaktive Grafik und synthetische Lehrmodelle.

[Technische Demos öffnen](https://juri-halveth.github.io/halveth-scarlet/forschung/wegweiser/)
· [Erdszene](https://juri-halveth.github.io/halveth-scarlet/)
· [Portfolio](https://juri-halveth.github.io/)

## Ausgewählte Einstiege

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
selbstständig handelnder externer Entitäten. Historische, persönliche und
politische Kontextseiten wurden privat gesichert und aus dieser öffentlichen
Fassung entfernt. Der Redaktionscommit schreibt keine Git-Historie um.

Projektleitung: **Juri Halveth / HALVETH**. Entwicklung mit KI-Unterstützung.
[Lizenzen und Herkunft](LICENSES.md) · Kontakt: **security@halveth.de**.

[Portal Chess direkt öffnen](https://juri-halveth.github.io/halveth-scarlet/forschung/portal-chess/)
