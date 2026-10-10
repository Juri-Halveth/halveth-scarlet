# Scarlet · wissenschaftlicher Erdzoom

**Projektleitung und benannte Entwicklung:** Juri Janovski (Juri Halveth), 2026. Diese Scarlet-Fassung adaptiert den lokalen HALVETH-V2.5-Forschungskandidaten. Der Git-Commit und die SHA-256-Werte dokumentieren die veröffentlichten Bytes und den Versionsstand; sie sind kein amtlicher Urheber- oder Patentnachweis.

## Was die Seite zeigt

Die drei umschaltbaren Darstellungen nutzen NASA Blue Marble Next Generation (Oktober 2004) sowie NASAs Relief- und Bathymetrievisualisierungen. Die beiden Grauwertkarten werden grafisch mit dem Farbbild kombiniert; die Pixel sind **keine** auswertbaren numerischen Höhen- oder Tiefenwerte. Der normalisierte Reglerwert `u` ergibt `zoom = exp(u · ln 16)`; eine zeitabhängige Annäherung bewegt die Ansicht zu diesem Wert. Die 2048 × 1024-Vorschau ist beim Start aktiv. Die 8192 × 4096-Textur wird erst nach ausdrücklichem Klick geladen und danach weich eingeblendet. Ein weiterer Klick gibt sie aus dem WebGL-Kontext frei und stellt die Vorschau wieder her. Der 8K-Standbildexport setzt die geladene Detailtextur voraus. Ein optionaler Klick lädt ein zeitversetztes MODIS/GIBS-Mosaik direkt im Browser von NASA. Das Tagesmosaik ist kein Live-Bild und kein 8K-Quellbild.

Der FPS-Knopf misst die Browser-`requestAnimationFrame`-Kadenz ab dem ersten Bildzeitpunkt über mindestens drei Sekunden bei einer konstanten, sichtbar angegebenen Canvas-Renderfläche. Tabwechsel, Größenwechsel und ein beginnender 8K-Export brechen die Messung ab; ohne mindestens zwei gültige Bildzeitpunkte erscheint kein FPS-Wert. Das ist weder GPU-Framezeit noch ein Beleg für die Monitorausgabe. Der 8K-Knopf exportiert nur auf geeigneter Hardware ein Standbild von 7680 × 4320 Pixeln. Weder 120 FPS noch 8K-Echtzeit oder ein begehbarer Geländeaufbau sind mit diesem Release belegt. Bei 16× bleibt die globale Quellauflösung endlich; regionale Kacheln und echte Messraster sind spätere, getrennt zu prüfende Arbeiten. Lange Ziehgesten bleiben aktiv, solange der Zeiger erfasst ist; ein einzelner unplausibler Positionssprung wird übersprungen, ohne die Geste abzubrechen. Bei aktivierter Betriebssystemeinstellung für reduzierte Bewegung wechseln Blick und Zoom ohne Animation.

Die FPS-Ausgabe zählt Abstände ab 250 ms als lange Pausen. Das ist eine
beobachtete Unstetigkeit, keine Diagnose ihrer Ursache und kein Beleg für
stabile Renderleistung. Sichtbarkeit und Fokus des Browserdokuments
beweisen nicht, dass die Betriebssystem-Komposition ungedrosselt arbeitet.
Die lokale Anzeige nennt 120 rAF/s nur dann beobachtet, wenn der
Mittelwert mindestens 120/s beträgt, das p95-Intervall höchstens
`1000/120 ms` misst und keine langen Pausen vorkommen. Auch dann bleibt
die tatsächliche Monitorausgabe ungeprüft.

## Herkunft und Rechte

Die offiziellen Quellen, Original- und Anzeige-Digests sowie Ableitungsschritte stehen in [SCIENCE_ASSET_RECEIPT.json](SCIENCE_ASSET_RECEIPT.json). Die SHA-256-Werte der Release-Dateien stehen im [Release-Manifest](RELEASE_SHA256.json). Die drei 21.600 × 10.800-Originaldateien verbleiben im lokalen Forschungsbestand und sind hier nicht eingebettet; die sechs abgeleiteten Anzeige- und Vorschaubilder sind im Ordner `assets/` byteweise prüfbar. [NASA-Nutzungsregeln](https://www.nasa.gov/nasa-brand-center/images-and-media/) gelten für NASA-Material. NASA wird als Quelle genannt; weder Unterstützung durch NASA noch Eigentum an deren Bildinhalt wird behauptet.

Für den neu veröffentlichten eigenen HTML-/JavaScript-Beitrag gilt die repo-spezifische [Lizenzzuordnung](../../LICENSES.md) zu [HALVETH PIRL 2.0](../../LICENSE-HALVETH-PIRL-2.0.md), soweit entsprechende Rechte bestehen. NASA-Bilder und Tatsachen sind davon ausgenommen. Diese Veröffentlichung ist **keine Patentanmeldung** und gibt keine Patentnummer oder Priorität vor. Wer einen Patentschutz prüfen will, muss vor weiterer technischer Offenlegung gesondert die Neuheit und den Stand der Technik beurteilen lassen.

## Prüfung

`node --test viewer.test.mjs` prüft Log-Zoom, Inverse, Monotonie, zeitabhängige Glättung und die Gültigkeit einer FPS-Zusammenfassung. `python verify_assets.py` vergleicht die sechs veröffentlichten Dateien mit den SHA-256-Werten und Abmessungen im Receipt. Ein grüner Test beweist nur diese lokalen Verträge. Für die Browserdarstellung und ihre FPS sind Gerät, Browser, Ausgabe und erneute Live-Messung maßgeblich.
