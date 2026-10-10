# HALVETH // Singularity Cannon · Forschungsdemo

**Projektleitung und benannte Entwicklung:** Juri Janovski (Juri Halveth), 2026. [Demo öffnen](./) · [Paket herunterladen](HALVETH_SINGULARITY_CANNON_2026-10-10.zip) · [HTML-Quelltext](index.html) · [kleines Bewegungsmodul](singularity-core.mjs) · [Quellreceipt](SOURCE_RECEIPT.json).

Diese Veröffentlichung ist eine eigenständige, offline lauffähige **Spielsimulation** eines beweglichen Attraktors. Sie ist von einer Erinnerung an *Unreal II: The Awakening* und dessen Singularity-Cannon-Motiv angeregt. Sie enthält keine Originaldateien, Grafiken, Musik, Modelle oder Skripte des Spiels. Die historischen Eigenschaften werden hier nicht als exakte Rekonstruktion behauptet. Das [offizielle Spielhandbuch](https://cdn.akamai.steamstatic.com/steam/apps/13200/manuals/Manual_english.pdf) bindet den Spieltitel und das Entwicklerteam; die [UnrealWiki-Klassenreferenz](https://wiki.beyondunreal.com/UE2%3AWeaponInvSingularityCannon_%28U2XMP%29) nennt `projectileBlackHole` für die XMP-Waffenklasse. Letztere ist eine Community-Quelle zum Codekontext und keine Freigabe der Originalsoftware.

## Start und Bedienung

`index.html` direkt im Browser öffnen. Beim Laden ist kein Feld vorhanden. Zeiger bewegen und klicken/tippen: Jeder Schuss folgt einer stetigen Geraden vom Emitter zum Zeigerziel und zieht sich dort als Projektion in die Bildtiefe zurück. Bis zu vier Felder laufen gleichzeitig; weitere Schüsse werden gezählt und sichtbar in eine Warteschlange gelegt, bis ein Rechenplatz frei wird. Kein Klick setzt Treffer- oder Zeitspur zurück. Die Schaltflächen steuern einströmende Objekte, Sogstärke, Pause, bewusste Rücksetzung und einen lokalen PNG-Export. Die Zeichenfläche ist per Tab erreichbar; Leertaste startet dort den Schuss. `P` pausiert und `R` setzt zurück, wenn kein Formelement fokussiert ist. Die Seite lädt keine externen Bibliotheken oder Telemetrie. Der PNG-Export bleibt auf dem eigenen Gerät.

## Gebundenes Modell

Das Feld berechnet in zwei Dimensionen eine weiche, begrenzte Beschleunigung aus Distanz, Stärke und Masse. Sein Radius ist ein Weitenmaß der Abnahme, keine harte Wirkungsgrenze; der Beitrag wird in der Ferne kleiner, aber nicht abrupt null. Die HTML-Demo ergänzt absichtlich eine tangentiale Komponente, damit Umlaufbahnen visuell erkennbar werden. Ein kleiner kontinuierlicher Fluss bewegt auch ohne Schuss den Sternhintergrund, Staub und Objekte. Ein aktives Feld krümmt die Darstellung des Hintergrunds und lenkt Staub und Objekte zusätzlich. Die projizierte Bildtiefe verkleinert Weitenmaß, Leuchtscheibe und Einfluss bis zum Abklingen des Schusses. Die Bedienoberfläche ist kein Teil des simulierten Raums. `singularity-core.mjs` ist ein kleines separates Referenzmodell: Es integriert Geschwindigkeit **und Position** einmal pro Schritt; ein Aufrufer darf die Position danach nicht ein zweites Mal fortschreiben. Die HTML-Demo verwendet dieses Modul nicht, damit ihre einzelne HTML-Datei auch per `file://` offline funktioniert. Ihre Parameter sind für den Spieleffekt gewählt und stimmen nicht vollständig mit dem Referenzmodul überein.

Der dunkle Kern und die Linsenverzerrung bleiben als Spielmodell bestehen. Die helle Scheibe startet bei null und reagiert auf nahe Staub- und Objekttracer sowie kurze Aufnahmeimpulse; sie nimmt bei fehlender Zufuhr wieder ab. Ihre fleckigen Lichtanteile bewegen sich mit unterschiedlichen Winkelgeschwindigkeiten. Das ist eine sichtbare, zustandsabhängige Kopplung, aber **keine** astrophysikalische Akkretions- oder Strahlungssimulation. Die Lichtverzerrung und das Zurückziehen in die Bildtiefe sind künstlerische WebGL/Canvas-Darstellungen. Die Tiefenvariable ist ein Projektionsparameter, keine gemessene räumliche Koordinate. Weder Schwarzschild- noch Kerr-Geodäten, Energieerhaltung, reale Materie oder astronomische Messwerte werden berechnet. Insbesondere wird **kein Photonenring berechnet**. „Zeitspur“ ist Simulationszeit. Die Bildrate hängt von Gerät und Browser ab; **120 FPS oder 8K sind mit diesem Paket nicht gemessen**.

## Physikalischer Bezug und offene Forschungsfrage

Ein Schwarzes Loch selbst ist keine leuchtende feste Kugel mit einem immer gleichen Ring. Licht kann aus heißem Material in der Umgebung kommen; starke Gravitation verändert dessen sichtbare Form. Die [NASA-Anatomie Schwarzer Löcher](https://science.nasa.gov/universe/black-holes/anatomy/) trennt Akkretionsscheibe, Schatten und durch Lichtablenkung entstehende Ringbilder. In einer [NASA-Visualisierung einer Akkretionsscheibe](https://svs.gsfc.nasa.gov/13326) bilden und verlieren sich helle Gasstrukturen; unterschiedliche Umlaufgeschwindigkeiten verzerren sie. Diese Quellen motivieren die bewegten Flecken und die Abhängigkeit von Materialzufuhr. Die Demo verwendet keine zu diesen Quellen kalibrierten Größen.

Planetenringe sind eine andere Objektklasse: Viele einzelne Partikel umkreisen einen Planeten, statt eine feste Oberfläche zu bilden. [Cassini-Daten bei NASA](https://science.nasa.gov/mission/cassini/science/rings/) beschreiben überwiegend eisige Saturnringe und Material aus den Fontänen des Mondes Enceladus im E-Ring. Solche Ringe können Spuren von Materialtransport oder Mondaktivität tragen. Ein Ring allein ist kein Nachweis für Leben; dafür wären unabhängige chemische und geophysikalische Beobachtungen sowie Kontrollen gegen unbelebte Prozesse nötig. Das bleibt eine getrennte Forschungshypothese, nicht ein Effekt dieser Demo.

Das sichtbare Fenster ist ein endlicher Ausschnitt. Objekte, die ihn verlassen, werden nicht an einer unsichtbaren Wand zurückgeworfen; die Demo entfernt sie außerhalb des Ausschnitts und lässt neue Objekte am Rand einströmen. Aufgenommene Staub-Tracer werden dort als Darstellungsbestand erneut eingesetzt. Das ist ein offener Bildfluss, kein persistent berechnetes, unendliches Weltmodell. Die Obergrenze von vier gleichzeitig aktiven Feldern ist ein Rechenbudget. Die Warteschlange bewahrt zusätzliche Klicks; aktive Felder, wartende Schüsse und gesamte Schusszahl bleiben unterscheidbar. Nur „Alles zurücksetzen“ beziehungsweise `R` setzt diese Zähler auf null.

## Patch gegenüber dem angelieferten Paket

- Der zuvor längenlose Partikelpfad zeichnet jetzt tatsächlich kurze elliptische Lichtspuren.
- Bei deaktiviertem WebGL bleibt der dunkle Canvas-Hintergrund sichtbar, weil er nach dem Löschen gezeichnet wird.
- Objekt-, Funken- und Strahlzahlen sind begrenzt; wiederholte Klicks erhöhen sie nicht unbegrenzt.
- Die Seite startet ohne festes Feld. Jeder Klick wird als Schuss behalten; WebGL und Canvas zeichnen alle aktiven Felder, während weitere Schüsse bei vier aktiven Feldern sichtbar warten.
- Schüsse erreichen ihr Zeigerziel auf einer stetigen Geraden und verkleinern sich danach als Tiefenprojektion. Hintergrund, Staub und Objekte besitzen einen sanften Grundfluss; aktive Felder beeinflussen ihre sichtbare Bewegung zusätzlich, ohne scharfe Radiuskante.
- Die Bildränder reflektieren Objekte nicht mehr. Ausgetretene Objekte werden außerhalb des Ausschnitts entfernt und neue Objekte strömen vom Rand ein.
- Die leuchtende Scheibe ist nicht mehr als vollständige Ellipse vorgezeichnet: Ihre Helligkeit folgt der aktuellen Materiezufuhr, Flecken bewegen sich differenziell und sie klingt ohne Zufuhr ab. Dunkler Kern und gravitative Spielwirkung sind davon getrennt.
- Tastenkürzel greifen nicht in fokussierte Schaltflächen, Links oder Formelemente ein.
- „Alles zurücksetzen“ hebt auch einen vorherigen Pausenzustand auf.
- Der PNG-Export nutzt einen lokalen Blob-Download und meldet den gestarteten Export sichtbar.
- Die öffentliche Scarlet-Navigation bleibt neben dem Referenzlabel frei; die Tastaturhilfe verwendet „Leertaste“, damit die globale Sprachlogik sie nicht als anderes Wort ersetzt.
- Das Referenzmodul prüft numerische Eingaben und dokumentiert seine Mutationsgrenze.

Diese Änderungen begrenzen einige Last- und Bedienungsfehler. Sie sind keine hardwareübergreifende Leistungs- oder Barrierefreiheitszertifizierung.

## Quellen, Rechte, offene Front

Die drei vom Nutzer gelieferten Dateien sind in `SOURCE_RECEIPT.json` mit Dateiname, Umfang und SHA-256 gebunden. Das lange Textprotokoll enthält Gesprächs- und Recherchematerial und wird **nicht** mitveröffentlicht. Darin zitierte Foren, Gerüchte und alte Antworten belegen allenfalls, dass Aussagen kursierten; sie belegen weder die Originalimplementierung noch reale Physik. Weitere historische Detailclaims benötigen die entsprechende Primärquelle oder eine ausdrücklich begrenzte Community-Attribution.

Für den neuen eigenen HTML-, JavaScript-, Test- und Dokumentationsbeitrag gilt die [repo-spezifische Lizenzzuordnung](../../LICENSES.md) zu [HALVETH PIRL 2.0](LICENSE-HALVETH-PIRL-2.0.md), **nur soweit Juri Janovski die jeweiligen Rechte tatsächlich hält**. Spieltitel und fremde Werke bleiben bei ihren Rechteinhabern. Eine Git-Version und Hashwerte dokumentieren Dateien und Zeitpunkt im jeweiligen System, nicht allein Urheberschaft, Erfindungshöhe, Patentpriorität oder eine amtliche Anerkennung. Es wird keine Patentanmeldung vorgenommen oder behauptet. Die Grundidee eines fiktiven schwarzen Lochs, naturwissenschaftliche Gesetze und Methoden als solche werden nicht exklusiv beansprucht; vgl. [§ 69a UrhG](https://www.gesetze-im-internet.de/urhg/__69a.html) für die Unterscheidung zwischen Programmausdruck und zugrunde liegenden Ideen.

## Prüfung

`node --test singularity-core.test.mjs` prüft den sanften Einfluss außerhalb des Referenzradius, Horizont, einen inneren Bewegungsschritt und ungültige Eingaben. Browserprüfung muss zusätzlich Darstellung, WebGL-Fallback, Bedienung und Export auf einem konkreten Gerät beobachten. Ein grüner Test bestätigt nur diese lokalen Fälle.

`python package_release.py` erzeugt das SHA-256-Manifest und ein sortiertes ZIP mit festem ZIP-Zeitstempel. Das ZIP enthält weder das Gesprächsprotokoll noch Originaldateien des Spiels.
