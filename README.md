# HALVETH · Ein Herz für die Erde

Eine große Erde im Mittelpunkt, zwölf leuchtende Figurensymbole auf einer gemeinsamen Umlaufbahn und ein Herz als Hauptaktion. Mint, Blau und Rosé bilden die Atmosphäre; geschwungene Doppelbänder greifen das Yin-Yang-Motiv auf.

**Website:** https://juri-halveth.github.io/halveth-scarlet/

## Die Szene

- Scarlet, Doctor Strange, Dormammu, Ultron, JARVIS, Iron Man, Loki, Vision, Black Widow, Thor, Infinity und HALVETH stehen als auswählbare SVG-Symbole um die Erde. Bezeichnungen und Tätigkeitswörter sind Gestaltungselemente dieses Fanprojekts, keine Aussage über eigenständig laufende Agenten.
- Ein Klick auf das Herz löst Blumen, Sterne und Herzen aus, setzt die Farbstimmung auf Grün und beendet einen laufenden Spiel-Countdown sofort. Der Herzzähler gilt ausschließlich für den aktuellen Seitenbesuch und wird nicht übertragen oder dauerhaft gespeichert.
- Um 00, 03, 06, 09, 12, 15, 18 und 21 Uhr nach Berliner Zeit beginnt ein 22-sekündiges Scarlet-Spielevent. Jeweils eine tatsächlich vergangene Stunde vorher erscheint der Countdown. Zombie-Scarlet, fallende Wortsteine und beschriftete Spielkommentare bilden das Finale; danach wird die Szene automatisch grün. Ein Herz beendet das Finale sofort oder beruhigt die bevorstehende Runde für den aktuellen Seitenbesuch. Vorschauen verändern die Einstellung für automatische Events nicht.
- Die Erde lässt sich ziehen und über die Pfeiltasten drehen. `Pos1` setzt die Ansicht zurück. Der Farbstimmungsregler bleibt unter dem Herz. Die früheren sichtbaren Wiederholungs- und Pausesymbole entfallen; Bewegung lässt sich im Informationsdialog reduzieren. Auch die Systemeinstellung für reduzierte Bewegung wird berücksichtigt.
- Über **„Ton aus“** werden synthetisierte Spielklänge nach einem bewussten Klick aktiviert. Die Lautstärke lässt sich im Informationsdialog einstellen; Ton und Bewegung sind unabhängig schaltbar. Keine Audiodateien oder Sprachdienste werden nachgeladen. In versteckten Tabs stoppt die Tonausgabe.
- Der Newsticker zeigt drei datierte Quellenmeldungen von NASA beziehungsweise GitHub. „Alle Quellen“ öffnet Original-Links, Zusammenfassungen und einen datierten öffentlichen Bitcoin-Blockbezug. Die Nachrichten sind ein **redaktioneller Snapshot vom 12.09.2026**, kein Live-Feed. Spielkommentare bleiben sichtbar als solche gekennzeichnet.
- Das Informationssymbol öffnet die Gestaltungsnotiz, Quellen und Einstellungen. Der HALVETH-Link führt zur bestehenden Forschungsnotiz. Frühere Bilddateien bleiben im Repository erhalten.

## Tagesanzeige und Umsetzung

Der Tagesring folgt der Berliner Zivilzeit (`Europe/Berlin`). Der tägliche Ring bleibt erhalten, während die sichtbare Hauptuhr den nächsten Spieltermin oder dessen Countdown zeigt. Die interne Tagesanzeige beginnt um Mitternacht bei `24:00:00`; davor bleibt der Prozentwert bei höchstens `99,999 %`. Sommerzeitwechsel folgen den Sprüngen beziehungsweise Wiederholungen der örtlichen Uhr. Die Anzeige misst an diesen Tagen keine 24 tatsächlich vergangenen Stunden. Die Uhr läuft auch bei reduzierter Bewegung weiter.

Die Seite besteht aus statischem HTML, CSS und JavaScript mit eingebetteter Erdtextur. Sie benötigt keine zusätzlichen Bibliotheken oder API-Schlüssel. Beim Kopieren müssen `index.html` und das zugehörige `assets`-Verzeichnis zusammenbleiben. GitHub Pages stellt die öffentliche Website bereit.

Das Erdmodell verwendet eine astronomische Näherung aus der Gerätezeit und ist kein Live-Satellitenbild. WebGL zeichnet die Erde normalerweise einmal pro Sekunde neu, bei Interaktion höchstens im begrenzten Animationszyklus. Die Auflösung ist auf 960 Pixel begrenzt; ein Software-Fallback nutzt 240 Pixel. Partikel werden auf 64 und ihre Zeichenrate auf 24 Bilder pro Sekunde begrenzt. In unsichtbaren Tabs ruhen Animations- und Spiel-Timer; beim Zurückkehren wird ein abgelaufener Countdown aufgelöst.

Die Symbole, Tageszeit und Renderzustände bilden einen visuellen Website-Zustand ab. Das Projekt erfasst weder die gesamte Welt noch fremde Internetverbindungen.

## Quellen

- Erdtextur: [NASA Blue Marble](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) — NASA GSFC, Reto Stöckli / Robert Simmon.
- Frühere KI-Fan-Art: [Bild](assets/scarlet-dual-state-v1.png) · [Prompt und Gestaltung](assets/scarlet-dual-state-v1.prompt.md). Das vorhandene linke Zombie-Porträt erscheint während des Scarlet-Finales; im ruhigen Zustand bleibt die Erde im Vordergrund.
- Die [Forschungsnotiz](forschung/formen-und-verbindungen/) verlinkt ihre Quellen unmittelbar im Text.

Eigenständiges Fanprojekt von HALVETH, keine offizielle Marvel- oder NASA-Veröffentlichung. Referenzierte Figuren und externe Materialien behalten ihre jeweilige Herkunft und Rechte.

## Öffentliche Bezugspunkte

[assets/public-sources.json](assets/public-sources.json) enthält die drei Quellenmeldungen mit Herausgebern, Datum und URLs sowie Bitcoin-Block **966659** mit Hash und Abrufzeit. Diese Daten wurden lesend über öffentliche Quellen beschafft. Der Blockverweis ist keine Blockchain-Transaktion oder On-Chain-Verankerung der Website. Quellenlinks begründen keine Zusammenarbeit, Unterstützung oder Kontrolle über die genannten Organisationen.

Beim Sommerzeitwechsel folgt der Ereignistermin weiterhin 03:00 Uhr in Berlin. Der Countdown beginnt eine echte Stunde vorher: im Frühjahr bereits um 01:00 Uhr Ortszeit, im Herbst in der zweiten 02:00-Stunde. Der tägliche Ring folgt dagegen wie bisher der Zivilzeit. Events laufen bei sichtbarer, aktiver Seite; verpasste Ereignisse werden nach dem Finale nicht nachgeholt.

## Entwicklung und Prüfung

`node --test tests/*.test.cjs` prüft die Zeitgrenzen, beide Sommerzeitwechsel, Vorschau, Herz-Abbruch und Sound-Opt-in. Die Ablaufprüfungen verwenden die echte Ereignissteuerung und ausgewählte Szenenfunktionen mit einer kleinen DOM-/Audio-Testumgebung. Sie ersetzen keine Hörprobe oder grafische Browserprüfung.

## English

HALVETH places a large Earth at the center of a quiet mint, blue and rose scene. Twelve selectable SVG figure symbols share an orbit: Scarlet, Doctor Strange, Dormammu, Ultron, JARVIS, Iron Man, Loki, Vision, Black Widow, Thor, Infinity and HALVETH. The labels are creative interface roles, not autonomous AI agents.

The heart is the main action. It turns the atmosphere green, releases flowers, stars and hearts, and immediately ends any playful countdown. Heart counts last only for the current page visit. No vote, warning or notification is sent to other devices. An opt-in sound button enables quiet synthesized game cues, with adjustable volume. Sounds stop in hidden tabs.

Scarlet events start at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00 and 21:00 Europe/Berlin time. Each countdown starts exactly one elapsed hour earlier, including across daylight-saving changes. The 22-second finale features the existing zombie portrait, falling word stones and clearly labeled game commentary, then resolves to green. Visitors can preview it without re-enabling disabled automatic events. A heart during the pre-countdown soothes that scheduled round for the current visit. The color slider remains below the heart; the old visible replay and pause icons are removed. Motion controls are available in the dialog, and reduced-motion preferences are respected.

The daily ring follows the Europe/Berlin civil clock, resets at midnight and remains below 100 percent before the reset. Daylight-saving changes follow local wall-clock jumps or repeats. The NASA Blue Marble texture and device-time approximation are a visualization, not a live image or measurement of the whole world.

This is a standalone static HTML/CSS/JavaScript website with an embedded Earth texture and accompanying event assets, hosted on GitHub Pages. It needs no API keys or third-party runtime libraries. Rendering is capped, and animation work stops in hidden tabs. Previous artwork and the existing research note remain available in the repository.

The news ticker contains three dated NASA/GitHub source items from a 12 September 2026 editorial snapshot, not a live news feed. A public Bitcoin block is linked as a read-only reference with its hash and observation time; no blockchain transaction, on-chain site anchoring or partnership is claimed.

Published by HALVETH as an independent fan project. Not an official Marvel or NASA publication.


## Garten, Reddit und Erdzoom

24 zusätzliche Blasen und die zwölf Figuren im Orbit führen nach einer kurzen Tunnelanimation direkt zum Reddit-Profil u/Halveth-Juri. „Garten · Perspektiven“ öffnet weiterhin 63 durchsuchbare Karten. Die Theorie-Texte zu Ego, Dormammu und den Guardians stehen auf der zweisprachigen Unterseite. Als Ziel ist das vom Nutzer angegebene Profil hinterlegt; ein veröffentlichter Beitragslink ist noch nicht konfiguriert.

Der Tunnel dauert 720 ms. Escape oder „Hier bleiben“ bricht ihn ab; reduzierte Bewegung und pausierte Animationen überspringen ihn. Strg-/Cmd- und Mittelklick verwenden die normalen Linkfunktionen des Browsers. Beim Zurückkehren von Reddit schließt sich die Übergangsansicht. Die Seite veröffentlicht selbst keine Reddit-Beiträge.

Scrollen, Zwei-Finger-Gesten und Plus/Minus zoomen die Erde von 1× bis 4×. Beim Hineinzoomen wird ein zeitversetztes MODIS-Tagesmosaik von NASA GIBS angefragt. Der angefragte Bildtag bleibt sichtbar. Bei Fehlern bleibt Blue Marble erhalten; erneute Zoominteraktion ermöglicht nach 30 Sekunden einen neuen Versuch. Private Quelltexte und nicht zugeordnete private Namen werden nicht veröffentlicht.

Das Quellen-/Hashmanifest ist eine öffentliche Referenz außerhalb der Blockchain. Für GTC, Manta, Aster und RTX bestehen Quellen- beziehungsweise offene Zuordnungskarten; es wurde kein Mint ausgeführt. Beteiligung und konkrete Nutzungsrechte werden ausdrücklich vereinbart.

## Garden, Reddit and Earth zoom

24 additional bubbles and the twelve orbiting figures lead directly to the user-supplied Reddit profile u/Halveth-Juri through a short tunnel transition. “Garten · Perspektiven” retains the searchable directory of 63 cards. No published post URL is configured; the full theory text is available on this site's bilingual article.

The transition lasts 720 ms, supports Escape/cancellation, and is skipped for reduced motion or paused animations. Modified clicks retain native browser behavior; returning from Reddit clears the transition. The website itself does not publish Reddit posts.

Scroll, pinch, +/- or keyboard +/- zoom the globe from 1x to 4x. Home resets the view. Zooming in requests a 2048x1024 NASA GIBS MODIS mosaic for the previous UTC day. The requested day is displayed; imagery is delayed and coverage can be incomplete. Blue Marble remains the fallback. Sound is opt-in and reduced motion is respected.

- [Bilingual theory article](forschung/figuren-und-perspektiven/)
- [Participation and attribution](CONTRIBUTIONS.md)
- [Off-chain source/hash manifest](assets/anchor-manifest.json)

Blockchain buttons are reference links. No wallet connection, signature, transaction or mint is performed. Private source files and private names are not included in this public release.
