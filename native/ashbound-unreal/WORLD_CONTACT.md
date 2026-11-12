# ASHBOUND · Boden, Bezugspunkte und erreichbare Übergänge

## Nutzerbeobachtung · 14. Oktober 2026

Im bisherigen Bild wirken Boden, Steine und Architektur wie getrennte Flächen,
die aus verschiedenen Richtungen in einen 3D-Raum gezogen wurden. Auch Schatten
machen daraus noch keine räumliche Einheit. Der Stil hat eine erkennbare Form,
wirkt aber weiterhin alt und stellenweise wie eine frühe Konsolenspielwelt.

Der Nutzer erinnert sich an ein Spyro-Spiel aus der Kindheit: Vor einem späten
Portal fehlte offenbar etwas, obwohl er lange gesucht und weitere Gegenstände
gefunden hatte. Titel, Plattform, Jahr und Ursache sind nicht geklärt. Für
ASHBOUND ist daran wichtig: Ein Übergang muss seinen fehlenden Zustand
verständlich zeigen und durch überprüfbar erreichbare Handlungen öffnen.

"Fest" beschreibt hier keinen absoluten Wesenszustand. Eine Ruine bleibt durch
Tragwerk und Untergrund an Ort und Stelle; Geröll kann verrutschen, Pflanzen
geben im Wind nach und Metall kann altern. Die Spielwelt soll diese Beziehungen
sichtbar und spielbar machen, statt bloß Z-Koordinaten gleichzusetzen.

## Bauvertrag für die nächste Weltiteration

- Gelände und Weg besitzen eine gemeinsame, exakt abtastbare Höhenreferenz.
  Der Tal-Kollider darf die Fahrspur und ihre Rinnen nicht verdecken.
- Große Objekte werden über mehrere Punkte ihrer Standfläche gesetzt. Ein
  Mittelpunkt allein belegt keinen Bodenkontakt an einer geneigten Kante.
- Gebäude brauchen lesbare Lastpfade: Fundamente, Fugen, Materialübergänge,
  angesammelten Schutt und Kontakt zum umgebenden Boden. Schatten sind nur ein
  ergänzender Hinweis.
- Licht hat eine Quelle oder einen sichtbaren Auslöser; Vegetation hat Wurzeln
  und eine plausible Bewegungsursache. Veränderung über Zeit braucht einen
  eigenen Zustand, nicht nur ein statisches Aussehen.
- Das Archivtor zeigt die drei Anforderungen im Spiel. Die Kette vom Finden
  über Zauber und Siegel bis zum Öffnen wird spielend geprüft, einschließlich
  Speichern und Wiederaufnahme. Ein unerreichbares Ziel ist ein Fehler.

## Aktueller technischer Schritt

`tools/surface_reference.py` definiert das gemeinsame Dreiecksnetz für Tal und
Weg. Der Talboden wird unter der Wegmitte abgesenkt; der Weg mischt an den
Rändern in das Tal. Die Weltplatzierung verwendet die sichtbare Oberseite und
für große Steine mehrere Stützpunkte. Das ist eine Geometrie- und
Platzierungskorrektur, keine Behauptung vollständiger Physiksimulation.

## Offene visuelle Abnahme

Im frischen Development-Build wurden Eingang und Festungsfuß bei 2560 × 1440
aufgenommen. Das Hauptportal und die vordere Festungsmauer haben an diesen
Blickpunkten keine erkennbare Trennspalte mehr. Die Wandflächen wirken aber
weiterhin zu eben und modular. Der Geometrie-Pass allein löst die beobachtete
Kulissenwirkung nicht. Kontaktmaterial, Schutt- und Wurzelübergänge brauchen
gezielte Gestaltung an den sichtbaren Baukörpern; weitere Blickwinkel und
Bewegung sind noch zu prüfen.

Der Development-Test erreichte mit drei passenden Zaubern das Öffnen des
Osttors. Eine zweite Sitzung stellte alle drei geladenen Siegel wieder her.
Das prüft den technischen Zustandsweg; ob Spieler die Anforderungen ohne
Testbefehle verständlich finden, benötigt einen eigenen Spieltest.
