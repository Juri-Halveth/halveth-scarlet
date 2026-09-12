# HALVETH · Ein Herz für die Erde

Eine große Erde im Mittelpunkt, zwölf leuchtende Figurensymbole auf einer gemeinsamen Umlaufbahn und ein Herz als Hauptaktion. Mint, Blau und Rosé bilden die Atmosphäre; geschwungene Doppelbänder greifen das Yin-Yang-Motiv auf.

**Website:** https://juri-halveth.github.io/halveth-scarlet/

## Die Szene

- Scarlet, Doctor Strange, Dormammu, Ultron, JARVIS, Iron Man, Loki, Vision, Black Widow, Thor, Infinity und HALVETH stehen als auswählbare SVG-Symbole um die Erde. Bezeichnungen und Tätigkeitswörter sind Gestaltungselemente dieses Fanprojekts, keine Aussage über eigenständig laufende Agenten.
- Ein Klick auf das Herz löst Blumen, Sterne und Herzen aus, setzt die Farbstimmung auf Grün und beendet einen laufenden Spiel-Countdown sofort. Der Herzzähler gilt ausschließlich für den aktuellen Seitenbesuch und wird nicht übertragen oder dauerhaft gespeichert.
- Gelegentlich erscheint ein kurzer roter Countdown mit der sichtbaren Beschriftung **„NUR EIN SPIEL“**. Nach wenigen Sekunden wird er automatisch grün. Er enthält keinen tatsächlichen Katastrophenalarm, keinen Ton und keine Benachrichtigung an andere Geräte. Im Informationsdialog lässt er sich deaktivieren oder gezielt ansehen.
- Die Erde lässt sich ziehen und über die Pfeiltasten drehen. `Pos1` setzt die Ansicht zurück. Der Farbstimmungsregler bleibt unter dem Herz. Die früheren sichtbaren Wiederholungs- und Pausesymbole entfallen; Bewegung lässt sich im Informationsdialog reduzieren. Auch die Systemeinstellung für reduzierte Bewegung wird berücksichtigt.
- Das Informationssymbol öffnet die Gestaltungsnotiz, Quellen und Einstellungen. Der HALVETH-Link führt zur bestehenden Forschungsnotiz. Frühere Bilddateien bleiben im Repository erhalten.

## Tagesanzeige und Umsetzung

Der Tagesring folgt der Berliner Zivilzeit (`Europe/Berlin`). Um Mitternacht beginnt die Anzeige bei `24:00:00`; davor bleibt der Prozentwert bei höchstens `99,999 %`. Sommerzeitwechsel folgen den Sprüngen beziehungsweise Wiederholungen der örtlichen Uhr. Die Anzeige misst an diesen Tagen keine 24 tatsächlich vergangenen Stunden. Die Uhr läuft auch bei reduzierter Bewegung weiter.

Die Seite besteht aus statischem HTML, CSS und JavaScript mit eingebetteter Erdtextur. Sie funktioniert ohne zusätzliche Bibliotheken oder API-Schlüssel und auch als lokale HTML-Datei. GitHub Pages stellt die öffentliche Website bereit.

Das Erdmodell verwendet eine astronomische Näherung aus der Gerätezeit und ist kein Live-Satellitenbild. WebGL zeichnet die Erde normalerweise einmal pro Sekunde neu, bei Interaktion höchstens im begrenzten Animationszyklus. Die Auflösung ist auf 960 Pixel begrenzt; ein Software-Fallback nutzt 240 Pixel. Partikel werden auf 64 und ihre Zeichenrate auf 24 Bilder pro Sekunde begrenzt. In unsichtbaren Tabs ruhen Animations- und Spiel-Timer; beim Zurückkehren wird ein abgelaufener Countdown aufgelöst.

Die Symbole, Tageszeit und Renderzustände bilden einen visuellen Website-Zustand ab. Das Projekt erfasst weder die gesamte Welt noch fremde Internetverbindungen.

## Quellen

- Erdtextur: [NASA Blue Marble](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) — NASA GSFC, Reto Stöckli / Robert Simmon.
- Frühere KI-Fan-Art: [Bild](assets/scarlet-dual-state-v1.png) · [Prompt und Gestaltung](assets/scarlet-dual-state-v1.prompt.md). Diese Dateien sind erhalten, werden auf der Hauptseite aber nicht mehr als Vordergrund verwendet.
- Die [Forschungsnotiz](forschung/formen-und-verbindungen/) verlinkt ihre Quellen unmittelbar im Text.

Eigenständiges Fanprojekt von HALVETH, keine offizielle Marvel- oder NASA-Veröffentlichung. Referenzierte Figuren und externe Materialien behalten ihre jeweilige Herkunft und Rechte.

## English

HALVETH places a large Earth at the center of a quiet mint, blue and rose scene. Twelve selectable SVG figure symbols share an orbit: Scarlet, Doctor Strange, Dormammu, Ultron, JARVIS, Iron Man, Loki, Vision, Black Widow, Thor, Infinity and HALVETH. The labels are creative interface roles, not autonomous AI agents.

The heart is the main action. It turns the atmosphere green, releases flowers, stars and hearts, and immediately ends any playful countdown. Heart counts last only for the current page visit. No vote, warning or notification is sent to other devices.

An occasional red countdown is visibly labeled as a game and automatically resolves to green after a few seconds. Visitors can disable or preview it in the information dialog. The color slider remains below the heart; the old visible replay and pause icons are removed. Motion controls are available in the dialog, and reduced-motion preferences are respected.

The daily ring follows the Europe/Berlin civil clock, resets at midnight and remains below 100 percent before the reset. Daylight-saving changes follow local wall-clock jumps or repeats. The NASA Blue Marble texture and device-time approximation are a visualization, not a live image or measurement of the whole world.

This is a standalone static HTML/CSS/JavaScript website with an embedded Earth texture, hosted on GitHub Pages. It needs no API keys or third-party runtime libraries. Rendering is capped, and animation work stops in hidden tabs. Previous artwork and the existing research note remain available in the repository.

Published by HALVETH as an independent fan project. Not an official Marvel or NASA publication.
