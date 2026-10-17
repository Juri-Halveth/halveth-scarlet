# HALVETH MICROVALUE · Quellenstand 17.10.2026

Die [öffentliche Seite](index.html) zeigt den Ein-Cent-Gedanken, veröffentlichte
Zahlungszahlen und einen lokalen Szenariorechner. Der [bebilderte Grundlagentext](HALVETH-MICROVALUE-ERKLAERT.pdf)
erklärt Anzeige, Zwischenrechnung, Rundung, Buchung und die vorgeschlagene
Aufteilung. Im Rechner werden eingegebene Geburtsdaten nicht gesendet oder
gespeichert.

## Tatsächlich veröffentlichte Zahlen und Regeln

| Quelle | Gebundene Aussage | Grenze |
| --- | --- | --- |
| [VR Payment, Unternehmensseite](https://www.vr-payment.de/unternehmen-pressekontakt) | 1,27 Milliarden abgewickelte Transaktionen 2025 | Keine Aufschlüsselung der für dieses Modell vertraglich erfassbaren Vorgänge. |
| [VR Payment, Medieninformation 12.06.2025](https://www.vr-payment.de/files/x_content/corporate/aktuelles/Medieninfos/2025/VR_Payment_Medieninformation_250612_1.pdf) | 983 Millionen Transaktionen 2024 im Netzbetrieb | Die exakte Vergleichbarkeit mit der breiter formulierten 2025-Zahl ist offen. |
| [VR Payment, Preisliste girocard 02/2026](https://www.vr-payment.de/files/2026/preisinfos/VRP_PL_girocard-Entgelt_B_260204.pdf) | Für ein bezeichnetes girocard-Modell: Abwicklungsgebühr 0,10 € je Zehnerblock; auch 1–10 Vorgänge bilden einen 0,10-€-Block. | Ein Cent je Vorgang ist nur der Durchschnitt eines vollen Zehnerblocks, keine allgemeine Einzelgebühr aller VR-Payment-Transaktionen. |
| [VR Payment, FAQ Scheme Manager Fee](https://www.vr-payment.de/faq/) | 239 € × 0,00209 % = 0,0049951 €; auf zwei Stellen gerundet 0,00 €. In diesem Beispiel fällt nach Rundung keine Gebühr an. | Der Zwischenwert ist kein belegter Bestand, Anspruch oder automatisch akkumuliertes Guthaben. |

## Rechenregel

Ein vorgeschlagener Ein-Cent-Pool wird zerlegt in
`4 × 0,0024 € + 0,0004 € = 0,0100 €`. Die Verteilung ist ein
Gestaltungsvorschlag. Die öffentlich belegte Preisliste schafft keinen
entsprechenden Vertrag und belegt nicht, dass diese Summe frei verfügbar ist.

Für ein Szenario wird eine Ausgangsmenge `N`, ein erfasster Anteil `q` zwischen
0 und 1 und ein angenommenes jährliches Wachstum `g` eingegeben. Die
modellierte Vorgangszahl für Jahr `k` ist `N × q × (1 + g)^k`.
Ein letztes Teiljahr zählt proportional zu seinen tatsächlichen Tagen.
Erst die Summe über den gewählten Zeitraum wird mit 0,0024 € beziehungsweise
0,0004 € multipliziert. Es gibt keine Verzinsung oder Abzinsung. Diese
arithmetische Summe ist kein festgestellter Einmalauskaufpreis.

Beispiel für **ein** Jahr mit der veröffentlichten 2025-Gesamtzahl als
Rechenbasis, bei `g = 0`:

| Modellierter Anteil `q` | Vorgänge | `× 0,0024 €` | `× 0,0004 €` |
| ---: | ---: | ---: | ---: |
| 1 % | 12.700.000 | 30.480 € | 5.080 € |
| 100 % | 1.270.000.000 | 3.048.000 € | 508.000 € |

Der 1-%-Wert ist eine frei gewählte Sensitivität, keine gemessene
Teilmenge. 100 % zeigt die rechnerische Oberkante der gewählten
Ausgangsmenge, keine tatsächliche Vertragsabdeckung. Für einen echten
Vorschlag an ein Unternehmen wären insbesondere Produkt, Vergütungsquelle,
zulässige Vorgänge, Rückbuchungen, Laufzeit, Gegenleistung und
Auszahlungsregel zu verhandeln.
