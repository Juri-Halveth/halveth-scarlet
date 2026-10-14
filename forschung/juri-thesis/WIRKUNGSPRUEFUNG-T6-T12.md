# JURI-THESIS: Wirtschaftliche Wirkungsprüfung für 30 Plätze

**Prüffassung vom 14.10.2026 · Brühl · erste sechsmonatige Kohorte, dieselben Personen nach zwölf Monaten.** Dieses Dokument ergänzt das ältere [Wirtschaftsmodell](WIRTSCHAFTSMODELL.md) und die vier [Lebenswege](wirkungswege.html). Die [öffentliche Darstellung](wirtschaftslabor.html) und der [ausführbare Rechenvertrag](wirtschaftslabor-model.mjs) verwenden dieselben Szenariowerte. Eine tatsächliche Bewilligung, Partnerschaft oder gemessene Programmauswirkung liegt diesem Modell nicht zugrunde.

## 1. Die wirtschaftliche Frage

Wenn 30 Erwachsene sechs Monate Zeit und individuell vereinbarte Mittel erhalten, können regionale Betriebe Aufträge gewinnen, Menschen Qualifikationen erwerben und neue versicherungspflichtige Arbeitsmonate entstehen. T+6 erfasst die erste Phase, T+12 sechs Monate später den Fortbestand. Die Prüfung fragt **welcher Anteil gegenüber einem glaubwürdigen Vergleich zusätzlich entsteht**. Eine Zahlung, ein Kauf, ein Umsatz, Bruttowertschöpfung, ein Steuerzufluss und ein Rentenbeitrag sind verschiedene Ereignisse.

Eine Stadt kann einen solchen Versuch als Dialograum und möglicher Mitträger prüfen. Für die vorgeschlagene Nichtanrechnung auf bestehende Leistungen sind die betroffenen Bundes- und Landesregeln gesondert zu gestalten. Auf kommunaler Ebene gehört ein Finanzierungs- und Wirtschaftlichkeitsbeschluss dazu. [Stadt Brühl: Wirtschaftsförderung](https://www.bruehl.de/wmv/wirtschaftsfoerderung.php), [SGB II § 11a](https://www.gesetze-im-internet.de/sgb_2/__11a.html), [GO NRW § 75](https://recht.nrw.de/system/files/BH/6784-20620.htm).

## 2. Buchungslogik und Zeitfenster

| Variable | Inhalt | Im Modell |
| --- | --- | ---: |
| `N` | Personen der ersten Kohorte | 30 |
| `M` | Teilnahmezeit je Person | 6 Monate |
| `Z_ref` | rein illustrativer direkter Referenzbetrag je Person | 30.000 € |
| `C_coord` | frei gesetzte Koordination und Evaluation | 180.000 € |
| `C_ref` | `N × Z_ref + C_coord` | 1.080.000 € |
| `t6` | sechs Monate nach Beginn | Ende der ersten Runde |
| `t12` | zwölf Monate nach Beginn | Nachbeobachtung derselben 30 |

`Z_ref` ist **keine** Pauschale, Obergrenze, bewilligte Auszahlung oder Prognose des individuellen Bedarfs. Der eigentliche Vorschlag hält persönliche Rahmen offen; Kinderbetreuung, Mobilität, Arbeit, Projektmittel und größere Einmalanträge können sehr verschieden ausfallen. Ein realer Haushalt braucht Zahlungspläne, Personal, Steuern, Versicherungen, Reserve, Sach- und Projektkosten je Person. In der Modellrechnung ist die Koordinationszahl frei gesetzt. Sie ist weder Personalplanung noch belegter Marktpreis.

Eine spätere zweite Runde mit neuen oder erneut teilnehmenden Personen benötigt einen neuen Haushalt und eine eigene Kohorten-ID. T+12 im vorliegenden Modell zählt keine solche Runde und addiert keine weiteren Programmzahlungen.

## 3. Die Formeln

Für jeden Szenariosatz gelten lokale Anteile `l`, zusätzlicher Nachfrageanteil gegenüber der Vergleichsentwicklung `a`, örtlicher Wertschöpfungsanteil am geeigneten Umsatz `v`, Verdrängungsanteil `d`, neue Arbeitsmonate **nach** T+6 `m_post`, Wertschöpfung je solchem Monat `g`, örtlicher Anteil `j` und Verdrängung der neuen Arbeit `d_j`.

```
R_local = (N × Z_ref) × l
GVA_T6 = R_eligible × a × v × (1 − d)
GVA_new_work_T6_T12 = m_post × g × j × (1 − d_j)
GVA_T12 = GVA_T6 + GVA_new_work_T6_T12
Pension_T6 = m_during × wage × 0.186
Pension_T12 = (m_during + m_post) × wage × 0.186
Entgeltpunkte_T12 = (m_during + m_post) × wage / 51,944
```

`R_eligible` ist im gewöhnlichen Referenzfall `R_local`. Der große Einzelfall verändert es wie in Abschnitt 5. Die Arbeitswertschöpfung innerhalb der ersten sechs Monate wird **nicht zusätzlich** zur T+6-Rechnung addiert: Aufträge und bezahlte Tätigkeiten könnten bereits in deren Umsätzen stecken. Nach T+6 werden nur neue Arbeitsmonate angesetzt; auch dort müssten in einer realen Auswertung bereits anderweitig erfasste Umsätze herausgerechnet werden. Das Modell behauptet keine vollständige volkswirtschaftliche Kontierung.

Der lokale Wertschöpfungsproxy ist **kein amtliches „BIP der Stadt Brühl“**. Die amtliche regionale VGR wird auf Kreisebene veröffentlicht; BIP umfasst Bruttowertschöpfung zuzüglich Gütersteuern abzüglich Gütersubventionen. Importierte Vorleistungen und weitergeleitete Zahlungen sind herauszurechnen. [Destatis: BIP-Methode](https://www.destatis.de/DE/Themen/Wirtschaft/Volkswirtschaftliche-Gesamtrechnungen-Inlandsprodukt/Methoden/bip.html), [Destatis: Input-Output](https://www.destatis.de/DE/Themen/Wirtschaft/Volkswirtschaftliche-Gesamtrechnungen-Inlandsprodukt/Methoden/input-output-rechnung.html), [Destatis: regionale VGR](https://www.destatis.de/DE/Themen/Wirtschaft/Volkswirtschaftliche-Gesamtrechnungen-Inlandsprodukt/_inhalt.html).

## 4. Drei Rechenwelten – keine Wahrscheinlichkeiten

| Parameter | Vorsichtig | Prüffall | Chancenfall |
| --- | ---: | ---: | ---: |
| Anteil gewöhnlicher Direktmittel an örtlichen Rechnungen `l` | 35 % | 50 % | 70 % |
| zusätzliche Nachfrage `a` | 15 % | 35 % | 65 % |
| örtlicher Wertschöpfungsanteil `v` | 40 % | 50 % | 60 % |
| Verdrängung `d` | 30 % | 15 % | 10 % |
| zusätzliche versicherungspflichtige Arbeitsmonate bis T+6 | 6 | 12 | 24 |
| weitere solche Arbeitsmonate T+6 bis T+12 | 6 | 18 | 48 |
| angenommener Bruttolohn je Monat | 2.800 € | 3.000 € | 3.300 € |
| Wertschöpfung je neuem Arbeitsmonat | 5.500 € | 6.000 € | 7.000 € |
| örtlicher Anteil dieser neuen Arbeit | 50 % | 70 % | 75 % |
| Verdrängung dieser Arbeit | 30 % | 15 % | 10 % |

Diese Werte sind **bewusst gesetzte Annahmen**, keine aus IAB-Studien übertragenen Wirkungsquoten. Arbeitsmonate sind über die Kohorte summiert: 30 Menschen können in einem Sechsmonatsfenster höchstens 180 volle Personenmonate erzeugen. „Zusätzlich“ verlangt später einen plausiblen kontrafaktischen Vergleich. Mitnahme liegt vor, wenn ein beobachteter Schritt auch ohne Pilot geschehen wäre; Verdrängung, wenn neue Nachfrage oder Arbeit andere verdrängt. Beide können das Ergebnis stark reduzieren. [IAB, Kosten-Nutzen-Analyse und Definitionen](https://doku.iab.de/forschungsbericht/2024/fb2124.pdf).

| Ergebnis gewöhnliche 30er-Referenz | Vorsichtig | Prüffall | Chancenfall |
| --- | ---: | ---: | ---: |
| Modellbedarf | 1.080.000 € | 1.080.000 € | 1.080.000 € |
| Brühler Rechnungen bis T+6 | 315.000 € | 450.000 € | 630.000 € |
| zusätzlicher örtlicher Wertschöpfungsproxy T+6 | 13.230 € | 66.938 € | 221.130 € |
| weitere Wertschöpfung durch modellierte Arbeit T+6 bis T+12 | 11.550 € | 64.260 € | 226.800 € |
| kumulierter örtlicher Wertschöpfungsproxy T+12 | 24.780 € | 131.198 € | 447.930 € |
| zusätzliche RV-Beiträge bis T+12 | 6.250 € | 16.740 € | 44.194 € |

Euro-Werte in der Tabelle sind gerundet. Beispiel Prüffall: `900.000 × .50 × .35 × .50 × .85 = 66.937,50 €` bis T+6; `18 × 6.000 × .70 × .85 = 64.260 €` danach; Summe `131.197,50 €`. Die T+12-Zahl ist deshalb nicht „Rendite“ oder Haushaltsüberschuss. Teilnehmende können wertvolle nichtmonetäre Veränderungen erreichen, die außerhalb dieser Euro-Spur liegen. Umgekehrt braucht die Ausgabe von 1,08 Mio. € eine echte Finanzierungsentscheidung.

## 5. Belastungstest: ein Antrag über zwei Millionen Euro

Die vier [illustrierten Lebenswege](wirkungswege.html) beschreiben unter anderem einen großen Antrag über **2.000.000 €**. Für diese Sensitivität ersetzt er **einen** 30.000-€-Referenzplatz. 29 × 30.000 € + 2.000.000 € + 180.000 € ergeben einen Modellbedarf von **3.050.000 €**. Weder die Summe noch eine Auszahlung sind bewilligt.

Die erzählte erste Million an Brühler Zahlungsempfänger besteht aus 450.000 € Kaufpreis einer **bestehenden** Wohnung, 150.000 € Renovierung, 100.000 € Auto/Mobilität beim örtlichen Anbieter, 200.000 € Team/Dienstleistungen und 100.000 € Lernen/Alltag. Die übrige Million bleibt zunächst unverplant. Der Kaufpreis ist zunächst eine Vermögensübertragung; nur tatsächlich örtlich erbrachte Dienste oder Umbauten erzeugen neue Produktion. Deshalb zieht das Modell diese 450.000 € vor der pauschalen Wertschöpfungsformel ab. Der Automobilverkauf zählt ebenfalls nicht vollständig als lokale Produktion: Der hier pauschal angenommene Wertschöpfungsanteil muss bei einer echten Auswertung nach Warengruppe und Lieferkette ersetzt werden.

Im Prüffall ergeben 435.000 € angenommene örtliche Rechnungen der 29 gewöhnlichen Plätze plus die erste Million des großen Falls **1.435.000 € örtliche Rechnungen**. Davon sind nach Abzug des bestehenden Wohnungswertes 985.000 € für die pauschale Rechnung geeignet. `985.000 × .35 × .50 × .85 = 146.518,75 €` T+6-Proxy. Bei denselben 18 zusätzlichen Arbeitsmonaten danach ergeben sich `210.778,75 €` bis T+12. Diese Zahl darf weder die verbleibende unverplante Million als Ausgabe noch den Kaufpreis als neue Brühler Produktion verbuchen. Auch 2 Mio. € für eine Person sind kein Beweis, dass in Brühl 1 Mio. € BIP entsteht.

## 6. Rente, Kleinkauf und ältere Teilnehmende

Für 2026 nennt die Deutsche Rentenversicherung **18,6 %** Rentenbeitragssatz und ein vorläufiges Durchschnittsentgelt von **51.944 €**; der aktuelle Rentenwert beträgt **42,52 €** je Entgeltpunkt. Eine zusätzliche versicherungspflichtige Bruttolohnsumme von 90.000 € im Prüffall bis T+12 erzeugt rechnerisch `90.000 × .186 = 16.740 €` Beiträge über Arbeitnehmer- und Arbeitgeberanteil zusammen und `90.000 / 51.944 ≈ 1,733` Entgeltpunkte **über mehrere Personen verteilt**. Das ist kein gemeinsamer Rentenanspruch und keine kommunale Haushaltseinnahme. [DRV Zahlen 2026](https://www.deutsche-rentenversicherung.de/Schwaben/DE/Presse-und-Fachinformationen/Experten/Zahlen-und-Tabellen/ZuT_2026_1.pdf?__blob=publicationFile&v=3), [DRV Entgeltpunkte](https://www.deutsche-rentenversicherung.de/SharedDocs/Glossareintraege/DE/E/entgeltpunkte.html), [DRV Rentenformel](https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Allgemeine-Informationen/Wie-wird-meine-Rente-berechnet/wie-wird-meine-rente-berechnet_node).

Ein individuelles Beispiel: sechs neue Monate à 3.000 € ergeben 18.000 € rentenversicherungspflichtiges Entgelt, nach der vereinfachten 2026er Rechnung rund `0,3465` Entgeltpunkte und `14,73 €` monatliche Bruttorente beim heutigen Rentenwert und Faktoren 1. Das illustriert **ein zusätzliches halbes Jahr**, nicht die Gesamtrente. Um eine niedrige Rente spürbar zu verändern, braucht es meist einen längeren Erwerbs- und Versicherungsverlauf; Einkommen, Gesundheit und individuelle Ansprüche sind gesondert zu prüfen. Freiwillige Beiträge stehen nur unter individuellen gesetzlichen Voraussetzungen offen. Bei weiterhin unzureichendem Alterseinkommen bleibt Grundsicherung ein Schutz. [DRV freiwillige Versicherung](https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Allgemeine-Informationen/Wissenswertes-zur-Rente/FAQs/Versicherung/Freiwillige_Versicherung_Liste.html?nn=721338d1-d60e-4a62-8d85-c7437e305512), [DRV Grundsicherung](https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Allgemeine-Informationen/Wissenswertes-zur-Rente/FAQs/Grundsicherung/Grundsicherung_Liste.html).

Ein Kaugummikauf kann – je nach Ware und Steuerrecht – Umsatzsteuer im Preis enthalten. Die Umsatzsteuer fließt in öffentliche Haushalte nach Verteilungsregeln; **der Einkauf erzeugt keine persönlichen Rentenpunkte**. Rentenbeiträge entstehen aus versicherungspflichtigem Entgelt oder anderen gesetzlich geregelten Beitragswegen. Die gesetzliche Rentenversicherung arbeitet im Umlageverfahren. [BMF: Umsatzsteuerverteilung](https://www.bundesfinanzministerium.de/Monatsberichte/Ausgabe/2026/04/Inhalte/Kapitel-2-Analysen/2-3-bundesstaatlicher-finanzausgleich-2025.html), [DRV: Umlageverfahren](https://www.deutsche-rentenversicherung.de/SharedDocs/Glossareintraege/DE/U/umlageverfahren.html).

Für die **Stadt Brühl** sind vier Zuordnungen zu trennen. Der Gemeindeanteil an der Einkommensteuer knüpft im Verteilungsschlüssel an den statistischen Wohnsitz an ([§ 3 GemFinRefG](https://www.gesetze-im-internet.de/gemfinrefg/__3.html)). Gewerbesteuer knüpft an Betriebsstätte und Gewerbeertrag, bei mehreren Gemeinden anteilig ([§§ 4, 6 GewStG](https://www.gesetze-im-internet.de/gewstg/__4.html)). Der Gemeindeanteil an der Umsatzsteuer folgt einem Schlüssel unter anderem aus örtlichem Gewerbesteueraufkommen, Beschäftigten und Entgelten am Arbeitsort, nicht der einzelnen Ladenrechnung ([§ 5a GemFinRefG](https://www.gesetze-im-internet.de/gemfinrefg/__5a.html)). Dagegen erhebt Brühl seit April 2026 eine **eigene Beherbergungssteuer von 5 %** des steuerpflichtigen Beherbergungsentgelts inklusive Umsatzsteuer: Gast als Steuerschuldner, Betrieb als Einziehender und Abführender. Ein modellierter Zuwachs um 20 Nächte à 100 € Entgelt ergäbe rechnerisch 100 € Stadtsteuer, nur soweit diese Nächte gegenüber der Vergleichsentwicklung wirklich neu in Brühl sind. [Brühler Satzung §§ 1–4, 7](https://www.bruehl.de/buergeramt-und-service/beherbergungssteuer/Satzung-Erhebung-Beherbergungssteuer.pdf).

Für den kommunalen **Nettohaushalt** kommt ein weiterer Schritt hinzu: Das [NRW-Gemeindefinanzierungsgesetz 2026, §§ 7–9, 23–24, 27](https://recht.nrw.de/gvnrw/2025-s1182/) verbindet Beschäftigung am Arbeitsort mit dem Zentralitätsansatz und definierte Steuern mit der Steuerkraftmesszahl. Höhere Steuerkraft kann spätere Schlüsselzuweisungen verringern; die Kreisumlage folgt einer eigenen Umlagebasis. Der 2026er Rechenstand nutzt Daten vor diesem vorgeschlagenen Pilot. Deshalb werden Brühls eigene Einnahmen, Zuweisungen, Umlagen, Koordinationskosten und Förderausgaben in getrennten Jahren gebucht; ein Marginalbetrag wird erst mit echten Bescheiden und der im Folgejahr geltenden Regel bestimmt. Die 5%ige Beherbergungssteuer ist in § 9 nicht Teil der Steuerkraftliste.

Die [IT.NRW-Stadtstatistik 2026, S. 12](https://statistik.nrw/sites/default/files/municipalprofiles/l05362012.pdf) weist für den 30.06.2024 15.242 sozialversicherungspflichtig Beschäftigte am **Arbeitsort** Brühl und 18.429 am **Wohnort** Brühl aus. Ein zusätzlicher Vertrag kann eine Brühler Person fördern, einen örtlichen Betrieb stärken oder beides; die Konten fallen nicht automatisch zusammen. Die Stadtseite benennt dieselben 18.429 als Stand Dezember 2024, während IT.NRW den 30. Juni ausweist. Dieser Datumswiderspruch ist vor einer amtlichen Vorher-Nachher-Rechnung aufzulösen. Auch eine positive Unternehmensrechnung darf nicht zugleich als identische Stadt- oder Sozialversicherungsrendite gebucht werden.

## 7. Partner, politische Zuständigkeiten und Gegenfragen

Der [öffentliche Wirkungsatlas](bruehl-atlas.html#entscheidung) bindet sechs Aufgaben: Brühler Wirtschaftsförderung als möglicher lokaler Koordinator, den gemeinsamen BA-/Jobcenter-Arbeitgeber-Service für Stellen, freiwillige Betriebe für bezahlte Praxis, das Land NRW mit einem bestehenden Gründerinstrument, einen noch zu benennenden Finanzierer und eine unabhängige T+6/T+12-Prüfung. Der [Arbeitgeber-Service](https://www.jobcenter-rhein-erft.de/arbeit/arbeitgeber.html) kann bestehende Stellenvermittlung und Förderfragen bearbeiten. Das [Gründungsstipendium.NRW nach der Richtlinie vom 01.10.2026](https://recht.nrw.de/lrmb/verwaltungsvorschrift/01102026-richtlinie-ueber-die-gewaehrung-von-stipendien-zur-foerderung/) beträgt 1.200 € pro Monat und Person, regulär bis zu zwölf Monate, setzt eine geeignete innovative Gründung voraus und schließt eine zeitgleiche andere Lebensunterhaltsförderung aus (Nr. 4.7). Ein zusätzliches JURI-THESIS-Budget muss deshalb als neues, rechtlich passendes Instrument gestaltet werden; das Stipendium wird weder als gesicherter Zahler noch als automatisch kumulierbare Leistung eingerechnet.

**Mögliche Partnerrollen, noch ohne Zusage:** Stadt Brühl als Gesprächspartnerin und mögliche Pilotkommune; kommunale Wirtschaftsförderung für Betriebe und lokale Rechnungswege; Bildungs- und Sozialträger für Zugänge; Betriebe für freiwillige Praxis- und Arbeitsplätze; Rentenversicherung für Information über individuelle Versicherungsverläufe; unabhängige Forschung für Evaluation; Land NRW und Bund für Finanzierung und gegebenenfalls rechtsförmige Zusätzlichkeit. Jede Rolle benötigt einen eigenen Auftrag, Datenschutzrahmen und Kostenbeitrag. Es gibt aus dieser Ausarbeitung keine Vollmacht, Partnerschaft, Förderung oder Rechtsänderung. Brühl meldete am [31.07.2026 die Absage einer geplanten Kulturreihe wegen der angespannten Haushaltslage](https://www.bruehl.de/rp/news/absage-kunst-gegen-bares.php); ein kommunaler Eigenanteil benötigt daher eine aktuelle haushaltsrechtliche Prüfung und darf nicht aus vermuteten künftigen Steuern vorfinanziert erscheinen.

| Gegenfrage eines Wirtschaftsprüfers / Gremiums | Prüffähige Antwort |
| --- | --- |
| Warum gerade 30, nicht 300? | 30 sind ein begrenzter erster Organisations- und Lernversuch. Eine kleine Kohorte kann Einzelfälle und Prozesse zeigen, aber kleine Arbeitsmarkteffekte statistisch kaum sicher nachweisen. Skalierung folgt erst aus mehreren geprüften Runden. |
| Entstehen nur Käufe, die ohnehin stattgefunden hätten? | Freiwillige, datensparsame Ausgangserhebung, Vergleichsentwicklung und Belegketten zu Art/Ort/Zeit der Ausgaben. Mitnahmeparameter wird ex ante ausgewiesen und ex post geprüft. |
| Verdrängt ein geförderter Arbeitsplatz andere? | Vergleich bei beteiligten und ähnlichen Betrieben, Neu- versus Bestandskunden, Arbeitsstunden und Lieferkette; Verdrängung separat buchen. |
| Wer zahlt, wer profitiert? | Kosten und Rückflüsse pro Kommune, Land, Bund, Versicherung und Privaten statt einer einzigen „Staatskasse“. Mögliches Auseinanderfallen ist eine Finanzierungsfrage. |
| Ist ein 2-Mio.-€-Fall vertretbar? | Separater Antrag, Zweck- und Alternativenprüfung, Phasenbewilligung, Finanzierungsnachweis, Konfliktregeln und Bericht. Der Betrag ist keine automatische Förderhöhe. |
| Was, wenn die wirtschaftliche Wirkung gering bleibt? | T+6/T+12 erfassen auch Wohnstabilität, Lernen, Selbstbestimmung, Schutz und unerwünschte Folgen. Eine Folgeentscheidung wägt Menschenrechte, individuelle Nutzen und Kosten sichtbar ab. |

Die Evaluationsarchitektur sollte vor Aufnahme der ersten Person feststehen: Rekrutierung und freiwillige Einwilligung; Ausgangslage; begründete und anfechtbare Auswahl; Wartelisten- oder andere faire Vergleichsoption bei Übernachfrage; vorregistrierte Endpunkte; unabhängige Rechnungsprüfung; T+6 und T+12 mit Ausfallquoten und fehlenden Daten. Erwerbseffekte aus anderen Qualifizierungsprogrammen sind **Kontext**, keine JURI-THESIS-Prognose. IAB-Untersuchungen zeigen je nach Maßnahme kurzzeitige Verdrängung von Arbeitssuche („Lock-in“) und teils spätere positive Beschäftigungseffekte, aber andere Populationen und Instrumente. [IAB, Weiterbildung älterer Menschen](https://fdz.iab.de/publikation/?id=9841902), [IAB, längerfristige Bildungseffekte](https://fdz.iab.de/en/publication/?id=12372761).

## 8. Milliardenfrage als überprüfbare Skala

Für einen positiven, tatsächlich attribuierten Wertschöpfungsbeitrag `G` pro Kohorte gilt rein arithmetisch `K = ceil(1.000.000.000 / G)` gleich wirksame 30-Personen-Kohorten für eine Milliarde Euro. Im **Prüffall** mit angenommenen `G = 131.197,50 €` sind das `7.623` Kohorten beziehungsweise 228.690 Platzereignisse, sofern die Wirkung überall identisch und zusätzlich wäre. Bereits deren Referenzbudgets betrügen `7.623 × 1,08 Mio. € = 8,233 Mrd. €`. Im Chancenfall mit `447.930 €` wären rechnerisch `2.233` Kohorten nötig. Das sind keine verfügbaren Programme, Städte, Nettoerträge oder belastbaren Hochrechnungen: Preise, Arbeitskräfte, Finanzierung, regionale Überlappung und Verdrängung verändern sich bei Skalierung. Eine „Milliardenbewegung“ kann als Forschungsfrage stehen; der erste Pilot beweist sie nicht.

## 9. Mindestbelege und Reopen-Trigger

| Kontospur | Benötigte Daten | Claim bei T+6 / T+12 |
| --- | --- | --- |
| Budget | bewilligt, ausgezahlt, reserviert, Verwaltung, Kostenträger | tatsächlicher Aufwand statt Szenario |
| Rechnungen | freiwillig belegte Zahlung, Ort, Branche, Vorleistungen, bestehendes Gut | regionale Bruttoströme, sauber getrennt |
| Wertschöpfung | Betriebe, Produktionsort, Vorleistungen, Vergleich, Mitnahme, Verdrängung | zusätzliche örtliche Produktion, mit Bandbreite |
| Arbeit/Rente | Einwilligung, anonymisierte Beschäftigungsmonate, beitragspflichtige Löhne | zusätzliche Arbeit und Beiträge, keine Personendaten im öffentlichen Dashboard |
| Leben | von Teilnehmenden gesetzte Ziele, Wohnen, Lernen, Gesundheit nur bei geeigneter Messung, unerwünschte Folgen | Verlauf ohne Reduktion auf Geld |

**Reopen:** Sobald ein Träger, ein konkreter Finanzierungsrahmen, eine echte Bewerbungsregel oder erste geprüfte Pilotdaten vorliegen, werden die betreffenden Annahmen ersetzt. Jede Änderung erhält Version, Quelle, Zeitpunkt und Vergleich mit dieser Prüffassung. Bis dahin bleibt der Status `MODEL_ASSUMPTION`; die Quelle ist sichtbar, der Effekt offen.
