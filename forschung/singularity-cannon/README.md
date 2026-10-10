# HALVETH // Singularity Cannon · Forschungsdemo

**Projektleitung und benannte Entwicklung:** Juri Janovski (Juri Halveth), 2026. [Demo öffnen](./) · [Paket herunterladen](HALVETH_SINGULARITY_CANNON_2026-10-10.zip) · [HTML-Quelltext](index.html) · [kleines Bewegungsmodul](singularity-core.mjs) · [Quellreceipt](SOURCE_RECEIPT.json).

Diese Veröffentlichung ist eine eigenständige, offline lauffähige **Spielsimulation** eines beweglichen Attraktors. Sie ist von einer Erinnerung an *Unreal II: The Awakening* und dessen Singularity-Cannon-Motiv angeregt. Sie enthält keine Originaldateien, Grafiken, Musik, Modelle oder Skripte des Spiels. Die historischen Eigenschaften werden hier nicht als exakte Rekonstruktion behauptet. Das [offizielle Spielhandbuch](https://cdn.akamai.steamstatic.com/steam/apps/13200/manuals/Manual_english.pdf) bindet den Spieltitel und das Entwicklerteam; die [UnrealWiki-Klassenreferenz](https://wiki.beyondunreal.com/UE2%3AWeaponInvSingularityCannon_%28U2XMP%29) nennt `projectileBlackHole` für die XMP-Waffenklasse. Letztere ist eine Community-Quelle zum Codekontext und keine Freigabe der Originalsoftware.

## Start und Bedienung

`index.html` direkt im Browser öffnen. Zeiger bewegen und klicken/tippen, um weitere Attraktoren zu starten. Bis zu vier Felder laufen gleichzeitig; ein weiterer Schuss wartet sichtbar auf einen freien Platz, statt ein Feld oder den Verlauf heimlich zu ersetzen. Die Schaltflächen steuern zusätzliche Objekte, Sogstärke, Pause, bewusste Rücksetzung und einen lokalen PNG-Export. Die Zeichenfläche ist per Tab erreichbar; Leertaste startet dort den Schuss. `P` pausiert und `R` setzt zurück, wenn kein Formelement fokussiert ist. Die Seite lädt keine externen Bibliotheken oder Telemetrie. Der PNG-Export bleibt auf dem eigenen Gerät.

## Gebundenes Modell

Das Feld berechnet in zwei Dimensionen eine weiche, begrenzte Beschleunigung aus Distanz, Stärke, Masse und Randgewichtung. Die HTML-Demo ergänzt absichtlich eine tangentiale Komponente, damit Umlaufbahnen visuell erkennbar werden. `singularity-core.mjs` ist ein kleines separates Referenzmodell: Es integriert Geschwindigkeit **und Position** einmal pro Schritt; ein Aufrufer darf die Position danach nicht ein zweites Mal fortschreiben. Die HTML-Demo verwendet dieses Modul nicht, damit ihre einzelne HTML-Datei auch per `file://` offline funktioniert. Ihre Parameter sind für den Spieleffekt gewählt und stimmen nicht vollständig mit dem Referenzmodul überein.

Die Lichtverzerrung, die Akkretionsscheibe und der Ring sind künstlerische WebGL/Canvas-Darstellungen. Weder Schwarzschild- noch Kerr-Geodäten, Energieerhaltung, reale Materie oder astronomische Messwerte werden berechnet. „Feldradius“ und „Zeitspur“ sind Pixel- und Simulationszeitwerte. Die Bildrate hängt von Gerät und Browser ab; **120 FPS oder 8K sind mit diesem Paket nicht gemessen**.

Das sichtbare Fenster ist ein endlicher Ausschnitt. Objekte, die ihn verlassen, werden nicht an einer unsichtbaren Wand zurückgeworfen; die Demo entfernt sie außerhalb des Ausschnitts und ergänzt neue Objekte. Das ist ein offener Bildfluss, kein persistent berechnetes, unendliches Weltmodell. Die Obergrenze von vier gleichzeitig aktiven Feldern ist ein sichtbares Rechenbudget und begrenzt nicht die kumulative Treffer- oder Zeitspur. Nur „Alles zurücksetzen“ beziehungsweise `R` setzt diese Zähler auf null.

## Patch gegenüber dem angelieferten Paket

- Der zuvor längenlose Partikelpfad zeichnet jetzt tatsächlich kurze elliptische Lichtspuren.
- Bei deaktiviertem WebGL bleibt der dunkle Canvas-Hintergrund sichtbar, weil er nach dem Löschen gezeichnet wird.
- Objekt-, Funken- und Strahlzahlen sind begrenzt; wiederholte Klicks erhöhen sie nicht unbegrenzt.
- Weitere Klicks fügen laufende Felder hinzu, statt das bisherige Feld und den Trefferzähler zu ersetzen. WebGL und Canvas zeichnen alle aktiven Felder; bei vier Feldern wird ein zusätzlicher Schuss mit einer sichtbaren Meldung zurückgestellt.
- Die Bildränder reflektieren Objekte nicht mehr. Ausgetretene Objekte werden außerhalb des Ausschnitts entfernt und laufend ergänzt.
- Tastenkürzel greifen nicht in fokussierte Schaltflächen, Links oder Formelemente ein.
- „Neustart“ hebt auch einen vorherigen Pausenzustand auf.
- Der PNG-Export nutzt einen lokalen Blob-Download und meldet den gestarteten Export sichtbar.
- Die öffentliche Scarlet-Navigation bleibt neben dem Referenzlabel frei; die Tastaturhilfe verwendet „Leertaste“, damit die globale Sprachlogik sie nicht als anderes Wort ersetzt.
- Das Referenzmodul prüft numerische Eingaben und dokumentiert seine Mutationsgrenze.

Diese Änderungen begrenzen einige Last- und Bedienungsfehler. Sie sind keine hardwareübergreifende Leistungs- oder Barrierefreiheitszertifizierung.

## Quellen, Rechte, offene Front

Die drei vom Nutzer gelieferten Dateien sind in `SOURCE_RECEIPT.json` mit Dateiname, Umfang und SHA-256 gebunden. Das lange Textprotokoll enthält Gesprächs- und Recherchematerial und wird **nicht** mitveröffentlicht. Darin zitierte Foren, Gerüchte und alte Antworten belegen allenfalls, dass Aussagen kursierten; sie belegen weder die Originalimplementierung noch reale Physik. Weitere historische Detailclaims benötigen die entsprechende Primärquelle oder eine ausdrücklich begrenzte Community-Attribution.

Für den neuen eigenen HTML-, JavaScript-, Test- und Dokumentationsbeitrag gilt die [repo-spezifische Lizenzzuordnung](../../LICENSES.md) zu [HALVETH PIRL 2.0](LICENSE-HALVETH-PIRL-2.0.md), **nur soweit Juri Janovski die jeweiligen Rechte tatsächlich hält**. Spieltitel und fremde Werke bleiben bei ihren Rechteinhabern. Eine Git-Version und Hashwerte dokumentieren Dateien und Zeitpunkt im jeweiligen System, nicht allein Urheberschaft, Erfindungshöhe, Patentpriorität oder eine amtliche Anerkennung. Es wird keine Patentanmeldung vorgenommen oder behauptet. Die Grundidee eines fiktiven schwarzen Lochs, naturwissenschaftliche Gesetze und Methoden als solche werden nicht exklusiv beansprucht; vgl. [§ 69a UrhG](https://www.gesetze-im-internet.de/urhg/__69a.html) für die Unterscheidung zwischen Programmausdruck und zugrunde liegenden Ideen.

## Prüfung

`node --test singularity-core.test.mjs` prüft Außenradius, Horizont, einen inneren Bewegungsschritt und ungültige Eingaben. Browserprüfung muss zusätzlich Darstellung, WebGL-Fallback, Bedienung und Export auf einem konkreten Gerät beobachten. Ein grüner Test bestätigt nur diese lokalen Fälle.

`python package_release.py` erzeugt das SHA-256-Manifest und ein sortiertes ZIP mit festem ZIP-Zeitstempel. Das ZIP enthält weder das Gesprächsprotokoll noch Originaldateien des Spiels.
