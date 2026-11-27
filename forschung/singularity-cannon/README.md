# HALVETH // Singularity Cannon

**Projektleitung und benannte Entwicklung:** Juri Janovski (Projekt HALVETH), 2026.
[Demo öffnen](./) · [Aktuelles Offline-Paket](HALVETH_SINGULARITY_CANNON.zip) · [Lizenz](LICENSE-HALVETH-PIRL-2.0.md)

Eine eigenständige WebGL-/Canvas-Spielsimulation, angeregt vom Singularity-Cannon-Motiv aus *Unreal II: The Awakening*. Sie enthält keine Originaldateien des Spiels. Der aktuelle Stand umfasst schwarze Kerne, unterschiedlich geneigte helle Scheiben, begrenzte Zeichenbudgets, Rücknahme und den örtlichen Strömungseinzug beim Selbsttreffer.

## Start und Bedienung

Die Webseite öffnen oder das aktuelle ZIP entpacken und `index.html` im Browser öffnen. Es sind keine Installation, externen Bibliotheken, Konten oder Telemetrie nötig.

- **Klicken / tippen:** Ein Feld vom kleinen Emitter links zum gewählten Punkt schicken. Vier Felder laufen gleichzeitig; zusätzliche Schüsse warten in einer sichtbaren Warteschlange.
- **Direkt auf den Emitter klicken:** Den Selbsttreffer auslösen.
- **Z / Zurück:** Den Zustand vor dem letzten Schuss wiederherstellen. Bis zu acht Zustände werden vorgehalten.
- **P:** Pause. **R:** Einen neuen Spielraum erzeugen. Auf dem Desktop liegen weitere Einstellungen unter **Steuerung**.
- **Mobil:** Direkt ins Feld tippen. Die großen Desktop-Bedienfelder sind ausgeblendet.

## Selbsttreffer: 3,6 Sekunden Strömungseinzug

Ein dichtes, texturiertes Netz zieht einzelne Bildbereiche örtlich in den Emitter. Nahe Quellpunkte erreichen den Kern zuerst; entfernte Punkte folgen später. Die Winkelbewegung nimmt nach innen zu. Stetig unterschiedliche Strömungswege und die örtliche Auflösung dunkler Flächen machen helle Schrift- und Materiespuren als Fäden sichtbar.

Die eigene Szene wird beim Start einmal lokal abgebildet: die frisch gezeichneten Canvas-Ebenen sowie sichtbare Beschriftungen und vereinfachte Bedienfelder. Dieser Quellstand wird räumlich verformt, während die ursprüngliche Szene wartet. Es wird keine gemeinsame Drehung oder Verkleinerung auf die gesamte Seite angewendet.

Der Einzug dauert **3,6 Sekunden vergangene Animationszeit**. Mit Scharfschaltmoment und anschließendem visuellen **„BLUB.“** erscheint nach ungefähr 4,6 Sekunden der gestaltete Spielzustand **EH-000 / EMITTER_ABSORBED**. „BLUB.“ enthält keinen Ton.

**Z, Escape oder „Schuss zurücknehmen“** stellen die Szene wieder her. **R** erzeugt einen neuen Raum. **„Neu laden“** lädt die Seite erst nach dem bewussten Klick neu. Bei reduzierter Bewegung gibt es eine kurze Ausblendung. Die ursprünglichen DOM-Elemente erhalten nach der Rückkehr ihren Eingabezustand zurück; Textur und Zeichenpuffer werden freigegeben. Der Effekt bleibt in dieser Webseite.

## Darstellung und Leistungsbudgets

- Der schwarze Kern verdeckt auch Vordergrundobjekte. Helle Strukturen erhalten pro Schuss eine zufällige, danach stabile Orientierung.
- Einmal erzeugte Sterntextur und wiederverwendete Uniform-Puffer begrenzen wiederholte Arbeit.
- Die normale WebGL-Zeichenfläche ist auf 1,6 Millionen Pixel begrenzt; **Mehr Details** erlaubt bis zu 4 Millionen. Der Canvas-Vordergrund besitzt ein separates Budget von ungefähr 3,6 Millionen Pixeln.
- Der Strömungseinzug verwendet höchstens 1,6 Millionen Ausgabepixel und 113 × 73 Netzpunkte. Sein gröberer Canvas-Fallback verwendet höchstens 800.000 Pixel, 27 × 19 Punkte und höchstens etwa 24 Zeichenaufrufe pro Sekunde.

Dies sind Rechenbudgets, keine zugesicherte Bildrate. Der angezeigte rAF-Takt zählt Browser-Callbacks und belegt keine vollständig angezeigten Frames oder Monitorfrequenz.

## Modell und Rechte

Die Demo verwendet künstlerische 2D-Felder und eine projizierte Bildtiefe. `fluidPoint` definiert den örtlichen Einzug. Es werden keine relativistischen Geodäten, realen Wasserströmungen oder astronomischen Messwerte berechnet. Browserrahmen und Betriebssystem gehören nicht zur simulierten Szene.

`singularity-core.mjs` ist ein separates Referenzmodell für eine weiche, begrenzte Beschleunigung. Die einzelne HTML-Datei besitzt ihre eigene eingebettete Laufzeit, damit sie auch offline funktioniert. Parameter und Wirkung der beiden Modelle sind nicht vollständig identisch.

Für die eigenen Beiträge gilt [HALVETH PIRL 2.0](LICENSE-HALVETH-PIRL-2.0.md), soweit Juri Janovski die jeweiligen Rechte hält. Spieltitel und fremde Werke bleiben bei ihren Rechteinhabern. [SOURCE_RECEIPT.json](SOURCE_RECEIPT.json) bindet die Metadaten der gelieferten Ausgangsdateien; private Gesprächsprotokolle werden nicht ausgeliefert. Hashwerte binden Bytes, nicht allein Urheberschaft oder eine amtliche Anerkennung.

## Pflege im Repository

Die aktuellen automatisierten Prüfungen liegen ausschließlich unter `tests/`. Vom Repository-Stamm aus:

```text
node --test tests/singularity-cannon-core.test.mjs tests/singularity-cannon-runtime.test.mjs tests/singularity-cannon-ui.test.cjs
python forschung/singularity-cannon/package_release.py
```

Die Tests prüfen unter anderem Zustandswiederherstellung, Pixelbudgets, örtliche Verformung, nahe Ankunft vor ferner Ankunft, endliche Werte und das Zeitfenster. Sie ersetzen keine visuelle Browserprüfung.

Der Paketbau erzeugt genau **HALVETH_SINGULARITY_CANNON.zip** und das zugehörige [SHA-256-Manifest](RELEASE_SHA256.json). Das ZIP enthält die aktuelle Demo, das Referenzmodul, diese Anleitung, Lizenz, Quellmetadaten und Manifest. Testdateien, Testaufnahmen, Versuchsskripte und alte Varianten werden nicht mitgeliefert. Textdateien werden als UTF-8 mit LF-Zeilenenden paketiert.
