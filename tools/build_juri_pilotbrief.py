"""Build the public JURI-THESIS pilot brief from reviewed, source-linked copy."""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "forschung" / "juri-thesis" / "assets" / "JURI-THESIS-Pilotbrief.pdf"
AGE_DATA = json.loads((OUT.parent / "alterskurve-16.json").read_text(encoding="utf-8"))
assert AGE_DATA["schema"] == "juri-thesis.age-discussion.v1"
W, H = A4
INK = colors.HexColor("#132d43")
GREEN = colors.HexColor("#20624f")
GOLD = colors.HexColor("#c89b40")
PAPER = colors.HexColor("#fbfaf5")
MUTED = colors.HexColor("#476276")
PALE = colors.HexColor("#e8f2ec")
WHITE = colors.white

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Georgia", r"C:\Windows\Fonts\georgia.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Bold", r"C:\Windows\Fonts\georgiab.ttf"))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold")

BODY = ParagraphStyle("body", fontName="Arial", fontSize=11, leading=16.3, textColor=INK, spaceAfter=0)
LEAD = ParagraphStyle("lead", parent=BODY, fontSize=12.8, leading=18.5, textColor=MUTED)
TITLE = ParagraphStyle("title", parent=BODY, fontName="Georgia-Bold", fontSize=28, leading=31, textColor=INK)
SUB = ParagraphStyle("sub", parent=BODY, fontName="Arial-Bold", fontSize=12, leading=16.3, textColor=GREEN)
REF = ParagraphStyle("ref", parent=BODY, fontSize=8.2, leading=11.5, textColor=MUTED)

SITE = "https://juri-halveth.github.io/halveth-scarlet/forschung/juri-thesis/"
CODE = "https://github.com/Juri-Halveth/halveth-scarlet/blob/main/"
SOURCES = {
    "GG Art. 2": "https://www.gesetze-im-internet.de/gg/art_2.html",
    "GG Art. 3": "https://www.gesetze-im-internet.de/gg/art_3.html",
    "GG Art. 20": "https://www.gesetze-im-internet.de/gg/art_20.html",
    "GG Art. 28": "https://www.gesetze-im-internet.de/gg/art_28.html",
    "GG Art. 74": "https://www.gesetze-im-internet.de/gg/art_74.html",
    "GG Art. 104a": "https://www.gesetze-im-internet.de/gg/art_104a.html",
    "SGB II § 11": "https://www.gesetze-im-internet.de/sgb_2/__11.html",
    "SGB II § 11a": "https://www.gesetze-im-internet.de/sgb_2/__11a.html",
    "SGB XII § 83": "https://www.gesetze-im-internet.de/sgb_12/__83.html",
    "WoGG § 14": "https://www.gesetze-im-internet.de/wogg/__14.html",
    "BKGG § 6a": "https://www.gesetze-im-internet.de/bkgg_1996/__6a.html",
    "AGG § 10": "https://www.gesetze-im-internet.de/agg/__10.html",
    "DSGVO": "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679",
    "GO NRW 2026": "https://recht.nrw.de/lrgv/gesetz/01012026-gemeindeordnung-fuer-das-land-nordrhein-westfalen-bekanntmachung-der/",
    "Destatis Alleinerziehende": "https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Einkommen-Konsum-Lebensbedingungen/Lebensbedingungen-Armutsgefaehrdung/Tabellen/armutsgef-typ-1-zvgl.html",
    "BMAS junge Menschen": "https://www.bmas.de/DE/Arbeit/Grundsicherung-fuer-Arbeitsuchende/Leistungen-und-Bedarfe-in-der-Grundsicherung-fuer-Arbeitsuchende/Informationen-nach-Zielgruppen/zielgruppe-sgb-2-junge-menschen.html",
    "StGB § 261": "https://www.gesetze-im-internet.de/stgb/__261.html",
    "StGB § 201": "https://www.gesetze-im-internet.de/stgb/__201.html",
    "StPO § 136": "https://www.gesetze-im-internet.de/stpo/__136.html",
    "StPO § 136a": "https://www.gesetze-im-internet.de/stpo/__136a.html",
    "Konzept im Web": SITE + "konzept.html",
    "Rechtslabor": SITE + "rechtslabor.html",
    "Chancenreise": SITE + "chancenreise.html",
    "Altersmodell Code": CODE + "tools/juri_age_model.mjs",
    "Altersmodell Test": CODE + "tests/juri-age-model.test.mjs",
    "Budgetquelle": CODE + "forschung/juri-thesis/WIRTSCHAFTSMODELL.md",
    "Zugang und Auswahl": CODE + "forschung/juri-thesis/ZUGANG-UND-AUSWAHL.md",
}

def page(label, title, lead, blocks, refs=(), diagram=None):
    return dict(label=label, title=title, lead=lead, blocks=blocks, refs=refs, diagram=diagram)

PAGES = []
PAGES.extend([
    page("01 / Entscheidung in einer Minute", "Die Bitte an Brühl",
         "Bitte prüfen Sie mit Juri Janovski, ob Brühl einen freiwilligen Pilot für sechs Monate persönliche Entwicklungszeit fachlich vorbereiten kann.",
         [("Das konkrete Bild", "Eine erste Runde umfasst <b>30 ganze Plätze</b> für Erwachsene aus Brühl und einem vorab definierten regionalen Einzugsgebiet. Ein Platz gibt einer Person sechs Monate für einen selbst gewählten Entwicklungsweg. Finanzielle Absicherung und gegebenenfalls Projektmittel müssen nach transparenten Kriterien individuell begründet werden."),
          ("Der erste Entscheidungspunkt", "Erbeten wird ein <b>unverbindliches Fachgespräch</b> über Rechtsform, Haushalt, Sozialleistungsfolgen, barrierefreien Zugang, unabhängige Auswahl und Evaluation. Eine Einladung ist weder Förderzusage noch Beginn eines Bewerbungsverfahrens."),
          ("Die größere These", "Langfristig soll jeder erwachsene Mensch im Leben zwei freiwillige Phasen von je sechs Monaten nutzen können. Der örtliche Pilot kann nur eine begrenzte Versuchsanordnung sein; er schafft keinen allgemeinen Anspruch.")],
         ("Konzept im Web", "GO NRW 2026"), "seats"),
    page("02 / Problem und öffentlicher Zweck", "Entwicklungszeit vor der Krise",
         "Menschen brauchen manchmal Zeit, bevor ein Lebenslauf zusammenbricht. Die These ist eine neue freiwillige Möglichkeit, kein Urteil über Defizite.",
         [("Welchen Unterschied soll die Leistung machen?", "Lernen, berufliche Neuorientierung, Sorgearbeit, Wohn- und Alltagsorganisation, Gründung, künstlerische Arbeit oder ein Wechsel der Lebensrichtung sollen als legitime Zwecke prüfbar werden. Niemand muss eine Krise, Diagnose oder außergewöhnliche Leistung vorführen, um Menschenwert zu beweisen."),
          ("Was wird nicht behauptet?", "Der Brief belegt noch keine gemessene Entlastung, keine neuen Arbeitsplätze und keine Kosteneinsparung. Solche Wirkungen sind Hypothesen. Ein Pilot muss unerwünschte Folgen ebenso ernsthaft suchen wie positive."),
          ("Warum eine Kommune?", "Eine Stadt kann Menschen, Einrichtungen und lokale Wirtschaft an einen Tisch bringen. Sie kann dabei keine bundesrechtliche Nichtanrechnung oder einen bundesweiten Freistellungsanspruch allein schaffen.")],
         ("GG Art. 2", "GG Art. 28", "Konzept im Web")),
    page("03 / Leistungseinheit", "Was ein Platz tatsächlich bedeuten würde",
         "Ein Platz ist eine sechsmonatige, freiwillige und begleitete Phase. Er ist weder eine neue Arbeitsstelle noch eine bloße Medaille.",
         [("Zeit", "Eine Person wählt einen Entwicklungsweg und vereinbart mit dem künftigen Träger ein erreichbares Vorhaben, passende Begleitung und eine Rückkehr- oder Übergangsperspektive. Ein Erfolgszwang wäre mit dem menschlichen Kern des Programms unvereinbar."),
          ("Geld", "Eine eigene monatliche Entwicklungszahlung soll das Vorhaben ermöglichen. Ihre Höhe folgt einem vorab veröffentlichten Verfahren, das Lebenslage, Wohnkosten, Sorgeverantwortung und andere relevante Bedingungen berücksichtigen kann. <b>Es gibt in diesem Konzept weder eine 3.000-Euro-Obergrenze noch einen bewilligten Betrag.</b>"),
          ("Zusätzliche Hilfen", "Barrierefreiheit, Kinderbetreuung, Lernmittel oder Vorhabenskosten können eigene Budgetlinien erfordern. Direkte Zahlung, Sachleistung, Vergütung für Teamarbeit und Projektmittel dürfen nicht still zusammengerechnet werden.")],
         ("Budgetquelle", "Konzept im Web"), "money"),
    page("04 / Lebensmodell", "Erste Phase ab 18, zweite ab 50",
         "Die Altersfenster sind Juris aktueller politischer Entwurf und keine bestehende Leistung.",
         [("Phase A", "Ein erster sechsmonatiger Abschnitt soll ab 18 möglich sein. Die Gelegenheit soll nicht mit dem 30. Geburtstag verfallen: Wer ihn mit 32, 47 oder 68 noch nicht genutzt hat, bleibt im Vorschlag erreichbar."),
          ("Phase B", "Ein zweiter sechsmonatiger Abschnitt soll ab 50 möglich werden. Er kann ein früheres Vorhaben vertiefen oder eine ganz andere Richtung eröffnen. Eine echte Regel müsste festlegen, welchen Mindestabstand, welche Wiederbewerbung und welche Finanzierung sie verlangt."),
          ("Pilotgrenze", "Eine erste Brühler Runde prüft höchstens sechs Monate je belegtem Platz. Die universelle 2-mal-6-Monate-These und die konkrete 30-Personen-Runde sind verschiedene Maßstäbe; ein Erfolg des einen beweist das andere nicht.")],
         ("Konzept im Web", "Zugang und Auswahl"), "phases"),
    page("05 / Pilotraum", "Brühl als prüfbarer Anfang",
         "Brühl 50321 ist der vorgeschlagene Gesprächsort. Das regionale Einzugsgebiet muss vor jeder echten Ausschreibung festgelegt werden.",
         [("Örtlicher Bezug", "Die Stadt, mögliche Bildungsträger, soziale Einrichtungen, Unternehmen und Teilnehmende könnten einen lokal erreichbaren Versuch entwickeln. Alle Kooperationen sind Vorschläge; bisher ist keine dieser Stellen als Partnerin zugesagt."),
          ("Region ohne Scheinkarte", "Köln, Bonn, Aachen und Euskirchen stehen im Konzept für mögliche Verbindungen, nicht für einen vermessenen gleichabständigen Radius. Ein reales Einzugsgebiet braucht Pendelwege, Zugangsgerechtigkeit und eine zuständige Finanzierung."),
          ("Wer entscheidet?", "Ein Träger müsste Mandat, Haushalt, Ansprechstelle und Verantwortung für Zahlungen und Daten ausdrücklich übernehmen. Eine öffentliche Webseite oder ein privater Brief ersetzt keinen kommunalen Beschluss.")],
         ("GO NRW 2026", "GG Art. 28", "Konzept im Web"), "Brühl / Region"),
    page("06 / Platzledger", "30 = 4 + 2 + 5 + 2 + 17",
         "Diese Rechnung bindet Plätze als ganze Einheiten. Sie beschreibt Juris gewünschte Orientierung, noch keine rechtswirksame Reservierung.",
         [("Vier", "Juri möchte selbst und mit drei weiteren, von ihm vorgeschlagenen Menschen teilnehmen. Damit wären rechnerisch <b>26 Plätze für andere offen</b>. Die drei Personen werden nur nach eigener Zustimmung benannt; die Sonderrolle und mögliche Interessenkonflikte brauchen eine unabhängige Prüfung."),
          ("Neun besondere Suchpunkte", "Zwei Plätze nennt Juri für erschwerte Übergänge im Alter 18, fünf für die von ihm derzeit hervorgehobene Gruppe 32 bis 35 und zwei für eine von jungen Alleinerziehenden selbst mitgestaltete Route. Für genau diese Zahlen gibt es noch keine örtliche Bedarfsanalyse."),
          ("Siebzehn", "Die verbleibenden Plätze bleiben für andere Alters- und Lebenslagen offen. Eine Person darf mehrere Merkmale haben, wird im Platzledger jedoch genau einmal verbucht. Sonst würde die Summe von 30 nur auf dem Papier stimmen.")],
         ("GG Art. 3", "Zugang und Auswahl", "Rechtslabor"), "seats"),
    page("07 / Gründergruppe", "Juris Wunsch offen verhandeln",
         "Ein Ideengeber darf seinen Beitrag und seine eigene Entwicklungszeit zur Sprache bringen. Daraus folgt noch kein Vorrecht auf knappe öffentliche Plätze.",
         [("Wunsch", "Juri beantragt, dass er und drei weitere Menschen Teil der 30 Personen sein können. Er möchte das System auch selbst unter echten Bedingungen erproben. Die Auswahl der anderen drei darf weder ihre eigene Zustimmung ersetzen noch sie ungefragt öffentlich identifizieren."),
          ("Erste zulässige Route", "Eine gesonderte Co-Design- oder Forschungsrolle kann durch eine freiwillige Vereinbarung mit einem zuständigen Träger geprüft werden. Leistung, Vergütung, Rechte, Abnahme, Auswahl und mögliche Vergabevorschriften wären dann getrennt von allgemeinen Teilnehmerplätzen zu regeln."),
          ("Zweite Route", "Eine begründete Pilotkategorie innerhalb der 30 Plätze wäre nur mit veröffentlichtem Zweck, Zugangskriterien, Budget, Befangenheitskontrolle und Überprüfungsweg denkbar. Ein solcher Vorschlag ist Gegenstand des Gesprächs; er wird nicht als bereits gebilligte Sonderquote ausgegeben.")],
         ("GG Art. 3", "GO NRW 2026", "Rechtslabor"), "law"),
    page("08 / Achtzehn", "Zwei frühe Übergänge sichtbar machen",
         "Juri möchte ausdrücklich zwei 18-jährige Menschen mit erschwertem Start berücksichtigen.",
         [("Warum prüfen?", "Der Beginn des Erwachsenenlebens kann gleichzeitig Ausbildung, Erwerb, Wohnen und eigenständige Behördenkontakte betreffen. Die Informationen des BMAS zu jungen Menschen beschreiben Unterstützungswege und Hindernisse; daraus folgt keine automatische Eignung einer bestimmten Person."),
          ("Wie fragen?", "Ein 18-jähriger Mensch mit Straftatgeschichte kann einen Entwicklungsweg benötigen; Förderung und Strafverfahren bleiben getrennt. Eine reale Ausschreibung darf keine öffentliche Leidensgeschichte verlangen. Freiwillige Angaben zu konkreten Barrieren und einem gewünschten Entwicklungsschritt sind enger als unbestimmte Zuschreibungen wie 'hat es schwer gehabt'. Beratung und barrierefreie Zugänge müssen mitgedacht werden."),
          ("Gegenprobe", "Eine feste Alterszahl von zwei Plätzen braucht einen sachlichen Zweck und eine Prüfung, ob ein altersneutraler Zugang dieselbe Gruppe fairer erreicht. Ohne diese Prüfung ist die Markierung ein Forschungs- und Designvorschlag.")],
         ("BMAS junge Menschen", "GG Art. 3", "AGG § 10")),
    page("09 / Zweiunddreißig bis fünfunddreißig", "Fünf Suchplätze als Hypothese",
         "Die Zahl fünf für die Altersgruppe 32 bis 35 stammt aus Juris aktueller Projektidee, nicht aus einer gemessenen Brühler Bedarfslage.",
         [("Mögliche Übergänge", "Menschen können in diesen Jahren zwischen Familie, Beruf, Sorgearbeit, Ausbildung und Gründung neu sortieren. Diese plausible Beschreibung rechtfertigt für sich allein weder einen Vorrang noch genau fünf Plätze."),
          ("Unterscheidende Prüfung", "Vor einer wirklichen Quote müssten Bewerbungsnachfrage, selbst beschriebene Entwicklungsziele, bestehende Angebote und ein altersneutraler Vergleich erhoben werden. Gerade Menschen mit 31, 36 oder 51 dürfen nicht allein aufgrund einer runden Altersklasse unsichtbar werden."),
          ("Vorläufige Form", "Im PDF bleibt die Fünf als sichtbare Suchhypothese. Ein zuständiger Träger kann sie nach belegter Nachfrage verändern oder verwerfen. Solange das nicht geschehen ist, erhält niemand daraus einen Anspruch oder eine Ablehnung.")],
         ("GG Art. 3", "Altersmodell Code", "Rechtslabor")),
    page("10 / Sorgeverantwortung", "Zwei selbstbestimmte Plätze",
         "Juri möchte jungen alleinerziehenden Müttern eine eigene Stimme in der Gestaltung und Betreuung geben.",
         [("Warum dieses Feld?", "Destatis weist für Menschen in Alleinerziehenden-Haushalten 2025 eine deutlich höhere Armutsgefährdung aus als für die Bevölkerung insgesamt. Das ist ein Gruppenindikator, keine Diagnose einer konkreten Bewerberin und kein Nachweis, dass zwei Plätze die richtige Zahl sind."),
          ("Eigenständige Gestaltung", "Ein unabhängiger, von Betroffenen mitgestalteter Träger könnte Zugang, Begleitung und eine freiwillige jährliche Würdigung von Ideen entwickeln. Weder Juri noch die Webseite verfügt über dessen Entscheidung. Eine künftige Vergabe öffentlicher Plätze kann nicht bloß per 'Ticket' ohne Mandat und Regeln übertragen werden."),
          ("Rechtlicher Zuschnitt", "Wenn ein Programm nach Geschlecht oder Familienform differenziert, müssen Zweck, Sachgrund, Verhältnismäßigkeit und Alternativen gesondert geprüft werden. Eine rechtlich robustere Teilhabespur kann Sorgeverantwortung und konkrete Barrieren offen erfassen, ohne Mütter aus dem Blick zu verlieren.")],
         ("Destatis Alleinerziehende", "GG Art. 3", "DSGVO")),
    page("11 / Offenheit", "Siebzehn Plätze für weitere Wege",
         "Die übrigen 17 Plätze verhindern, dass ein Pilot nur zwei Lebensalter und eine gesellschaftliche Nische sieht.",
         [("Wer mitgemeint ist", "Menschen über 35, über 50 und über 65 bleiben in der Gesamtkonzeption. Erwerbstätige, Erwerbslose, Menschen ohne Hochschulabschluss, Personen mit Behinderung, pflegende Angehörige und Menschen mit verborgenen Ideen benötigen zugängliche Einladungen."),
          ("Was nicht zählt", "Ein fehlendes Studium darf nicht automatisch gegen eine Idee sprechen. Sichtbare 'Karrierepunkte', Karmabegriffe oder Medaillen sind kein tragfähiger Ersatz für nachvollziehbare Ziele, Ressourcenbedarf und öffentlich bekannte Kriterien."),
          ("Wiederbewerbung", "Bei jeder neuen Runde soll eine Person bewusst neu entscheiden können. Eine Absage ist kein dauerhafter Persönlichkeitsstatus. Frühere Unterlagen werden nur im rechtlich zulässigen und transparent erklärten Umfang weiterverwendet.")],
         ("Zugang und Auswahl", "Chancenreise")),
    page("12 / Der Spiegel", "16 Punkte auf der Alterskurve",
         "Der frühere Denkweg gab dem höheren Alter relativ mehr Gewicht. Der neue Entwurf spiegelt die Kurve: 18 erhält 2, 65 erhält 1.",
         [("Berechenbare Definition", "Für ganzzahlige Alter ab 18 gilt <b>w(a) = 2 - (min(a,65) - 18) / 47</b>. Ab 65 bleibt das Gewicht 1. Die 16 gezeichneten Stützpunkte liegen von 18 bis 65; auch jedes Alter dazwischen hat einen definierten Wert."),
          ("Was das Gewicht nicht beweist", "Zwei zu eins an den Endpunkten ist ein Verhältnis von Modellgewichten. Bei 30 Ziehungen ohne Zurücklegen ist die tatsächliche individuelle Inklusionswahrscheinlichkeit nicht einfach doppelt. Alle Altersklassen bleiben berechenbar, aber 30 Menschen können nicht zugleich jedes der 48 einzelnen Alter von 18 bis 65 repräsentieren."),
          ("Status", "Die Kurve ist eine Rechen- und Diskussionsebene. Ob ihr Einsatz eine gerechte Vergabe unterstützen würde, ist offen; Alter ist kein automatischer Ersatz für Bedarf.")],
         ("Altersmodell Code", "Altersmodell Test", "GG Art. 3"), "age"),
    page("13 / Needed", "Bedarf ist eine zweite Achse",
         "Dass eine Altersklasse mehrfach markiert werden kann, ist sinnvoll: Lebenslagen überlagern sich. Das Wort 'needed' braucht dennoch eine überprüfbare Definition.",
         [("Vier mögliche Beobachtungen", "Eine Person kann Zugangshürden, Sorgeverantwortung, fehlende Mittel oder einen konkreten Übergang selbst beschreiben. Ein Träger kann außerdem regionale Angebotslücken prüfen. Diese vier Informationen werden nicht still zu einem Charakter- oder Talentwert zusammengemischt."),
          ("Nicht aus Alter folgern", "Ein 18-jähriger Mensch kann wenig Unterstützung brauchen; eine 54-jährige Person kann einen massiven Übergang erleben. Die Alterskurve und der individuelle Unterstützungsbedarf sind typverschiedene Merkmale."),
          ("Vor einer echten Auswahl", "Kriterien, Datengrundlage, Prüfperson, Korrekturweg und Auswirkung jeder Markierung müssen vor Bewerbung feststehen. Das System darf keine rein automatische Zusage oder Absage mit erheblicher Wirkung erzeugen, ohne die einschlägigen Schutzregeln zu erfüllen.")],
         ("DSGVO", "GG Art. 3", "Zugang und Auswahl")),
    page("14 / Geld", "Wie viel bekommt eine Person?",
         "Der ehrlich konkrete Stand lautet: Die Berechnungsregel ist vorgeschlagen, ein bewilligter Monatsbetrag existiert noch nicht.",
         [("Individuelle Formel", "Die direkte Zahlung im Pilot ist <b>C_Z = Summe aller Z(i,m)</b>: für jede Person i und jeden belegten Monat m wird ein begründeter Betrag Z ermittelt. Hinzu kommen getrennte Kosten für Begleitung, Zugänglichkeit, Sachmittel und Evaluation."),
          ("Beispiele statt Grenzen", "Ein freiwilliger Euro einer vermögenden Person kann als Gedankenexperiment dienen. 1.500 Euro aus einer älteren Beispielrechnung sind ein frei gesetzter Szenariowert. 3.000 Euro sind keine allgemeine Obergrenze. Keine dieser Zahlen begründet einen Anspruch oder passt notwendig zu einem konkreten Haushalt."),
          ("Entscheidungsreife", "Vor einer realen Vergabe braucht es eine transparente Bedarfsmethode, einen Mindestschutz, einen finanzierten Höchstrahmen für das Gesamtprogramm und eine Begründung im Einzelfall. Wünsche, tatsächliche Kosten und gesetzliche Wechselwirkungen bleiben getrennt.")],
         ("Budgetquelle", "SGB II § 11", "SGB II § 11a"), "money"),
    page("15 / Haushalt", "Zahlung ist noch kein Rückfluss",
         "Ein vollständiger Haushalt umfasst mehr als 30 mal sechs Monatsbeträge.",
         [("Kleines Rechenbeispiel", "Bei einem rein illustrativen Betrag von 1.500 Euro je Personenmonat wären 30 mal 6 mal 1.500 Euro = 270.000 Euro direkte Zahlungen für eine Runde. Begleitung, Personal, Räume, Versicherungen, Ersatzzeiten, Verwaltung und Reserve kommen hinzu. Zwei volle Runden im Jahr haben andere Jahreskosten als eine Kohorte über mehrere Jahre."),
          ("Drei Spuren", "Transfer an Menschen, tatsächlich zusätzlich entstandene Wertschöpfung und spätere Steuern oder vermiedene Kosten sind nicht derselbe Geldbetrag. Doppelzählungen würden eine positive Bilanz nur vortäuschen."),
          ("Kommunale Prüfung", "Brühl müsste kommunalen Aufgabenbezug, Zuständigkeit, Wirtschaftlichkeit, Haushalt und mögliche Partnerbeiträge selbst prüfen. Kein Unternehmens- oder Landesbeitrag ist für diesen Vorschlag zugesagt.")],
         ("Budgetquelle", "GO NRW 2026"), "money"),
    page("16 / Zusätzlichkeit", "Nichtanrechnung ist ein Gesetzgebungsziel",
         "Juri will eine Entwicklungsleistung, die bestehende Ansprüche nicht verdrängt. Das ist eine präzise politische Forderung.",
         [("Geltender Ausgangspunkt", "Im Bürgergeld sind Geldzuflüsse grundsätzlich nach SGB II § 11 zu betrachten. § 11a enthält Ausnahmen, unter anderem für bestimmte ausdrücklich zweckgebundene öffentlich-rechtliche Leistungen. Eine neue Bezeichnung 'Extra-Programm' macht eine Zahlung nicht automatisch anrechnungsfrei."),
          ("Weitere Systeme", "Sozialhilfe, Wohngeld, Kinderzuschlag, Steuer und Sozialversicherung haben eigene Regeln. Eine universelle Aussage über 'nichts wird angerechnet' benötigt eine Leistungsmatrix und gegebenenfalls ausdrückliche gesetzliche Änderungen."),
          ("Pilotroute", "Ein örtlicher Pilot kann getrennte Sach- und Bildungszwecke sowie individuelle Folgen prüfen, ohne schon eine bundesweite Nichtanrechnung zu behaupten. Vor jeder Zahlung muss die zuständige Stelle die tatsächliche Behandlung klären.")],
         ("SGB II § 11", "SGB II § 11a", "SGB XII § 83", "WoGG § 14")),
    page("17 / Rechtsleiter", "Drei Rechte weiter - ohne Sprung",
         "Die Prüfung läuft von Grundrechten über gesetzliche Zuständigkeit und Haushalt bis zur einzelnen Entscheidung.",
         [("Verfassung", "Persönliche Entfaltung, Gleichheit, Sozialstaatsprinzip und kommunale Selbstverwaltung sind relevante Maßstäbe. Sie erzeugen hier für sich allein keinen konkreten Zahlungsanspruch."),
          ("Gesetz und Träger", "Bund, Land, Kommune oder freiwilliger Träger können unterschiedliche Teile der Idee gestalten. Eine Kommune kann nur innerhalb ihrer Kompetenz und ihres Haushalts handeln; eine allgemeine Leistung bräuchte den zuständigen Gesetzgeber."),
          ("Einzelfall", "Erst ein geltendes Verfahren bestimmt Voraussetzungen, Höhe, Beginn, Bescheid, Begründung und Rechtsschutz. Die stärkste haltbare Forderung heute ist die Prüfung einer gestaltbaren Route, nicht die Behauptung eines bereits bestehenden Anspruchs.")],
         ("GG Art. 2", "GG Art. 3", "GG Art. 20", "GO NRW 2026"), "law"),
    page("18 / Gegenpositionen", "Wenn die Stadt Nein sagt",
         "Der Entwurf nimmt starke Einwände vorweg und antwortet mit einem kleineren, überprüfbaren nächsten Schritt.",
         [("Kein Rechtsanspruch", "Ein allgemeines Recht auf zwei sechsmonatige Zahlungen ist nicht geregelt. Antwort: politische Gesetzesidee und ein getrennt geprüfter freiwilliger Pilot."),
          ("Keine freie Haushaltsquelle", "Spätere Steuern oder lokale Nachfrage decken Ausgaben heute nicht. Antwort: Vorabkosten, Finanzierungsplan, Reserve und Stop-Kriterien."),
          ("Ungleiche Auswahl", "Gründerwunsch, Alterskurve und Sondergruppen können andere Menschen benachteiligen. Antwort: Variantenvergleich, Beteiligung Betroffener, veröffentlichte Kriterien und eine unabhängige Überprüfung.")],
         ("Rechtslabor", "GG Art. 3", "GO NRW 2026")),
    page("19 / Gegenpositionen", "Wenn ein Gericht streng fragt",
         "Eine schöne Zweckbeschreibung ersetzt weder Belege noch die zuständige Rechtsform.",
         [("Zweckgleiche Zahlungen", "Eine Leistung zum allgemeinen Lebensunterhalt kann mit bestehenden Sozialleistungen denselben Zweck teilen. Antwort: ausdrückliche gesetzliche Klärung der Nichtanrechnung oder enger tatsächlich anderer Zweck."),
          ("Datenschutz und Willkür", "Bewerbungsakten können sensible Lebenslagen offenlegen; ein intransparentes Scoring wäre angreifbar. Antwort: Datensparsamkeit, menschliche Entscheidung, dokumentierte Gründe und wirksamer Schutz der Akten."),
          ("Missbrauch", "Ein Programm kann nicht rechtswidrige Vermögensherkunft in legale Mittel verwandeln. Antwort: Mittelherkunft, Interessenkonflikte, Zahlungsverfolgung und das bestehende Strafrecht bleiben eigene Grenzen.")],
         ("Rechtslabor", "DSGVO", "StGB § 261")),
    page("20 / Daten und Selbstbestimmung", "Keine gläserne Bewerbung",
         "Ein Entwicklungsprojekt braucht Vertrauen. Bewerben, an Forschung teilnehmen und öffentlich sichtbar sein sind drei getrennte Entscheidungen.",
         [("Minimale Bewerbung", "Ein realer Träger erhebt nur Daten, die für ein zuvor definiertes Kriterium erforderlich sind. Der Umfang, die Rechtsgrundlage, Aufbewahrung, Löschung und Betroffenenrechte müssen vor dem Start erklärt werden."),
          ("Eigene Akte", "Eine Person erhält ihre eigene Entscheidung und kann sie überprüfen lassen. Fremde Unterlagen werden nicht als Preis für Transparenz an Mitbewerbende verteilt."),
          ("Öffentlichkeit", "Veröffentlicht werden Regeln, Budgets und aggregierte Ergebnisse. Ein persönlicher Steckbrief oder eine Würdigung ist nur freiwillig und gesondert freigegeben. Die Demo auf GitHub nimmt keine Bewerbungen entgegen.")],
         ("DSGVO", "Zugang und Auswahl", "Chancenreise")),
    page("21 / Wirkung und Gegenfaktum", "Wie ein Pilot ehrlich lernt",
         "Der Prüfmaßstab muss vor dem Start feststehen, damit gute Geschichten und schlechte Zahlen nicht gegeneinander ausgespielt werden.",
         [("Vorzustand", "Zu Beginn werden selbst gesetzte Ziele, vorhandene Möglichkeiten und notwendige Unterstützung freiwillig und datensparsam dokumentiert. Teilhabe ist breiter als Erwerbseinkommen."),
          ("Vergleich", "Bei knappen Plätzen kann ein fairer, rechtlich geprüfter Vergleich mit Wartenden oder einer anderen Gruppe erwogen werden. Ohne vergleichbare Ausgangslage wird ein späterer Unterschied nicht als Programmauswirkung ausgegeben."),
          ("Ergebnis", "Nach sechs Monaten und nach 12 bis 24 Monaten werden Zugangsgerechtigkeit, Erfahrungen, Übergänge, Kosten und unerwünschte Wirkungen berichtet. Unwirksamkeit ist ein Ergebnis, kein Grund, Daten umzudeuten.")],
         ("Budgetquelle", "Zugang und Auswahl")),
    page("22 / Ablauf", "Erst prüfen, dann Menschen einladen",
         "Das hier ist eine vorgeschlagene Reihenfolge, keine amtlich eröffnete Frist.",
         [("0 bis 3 Monate: Machbarkeit", "Stadt und freiwillige Partner klären Träger, kommunalen Zweck, Rechtsform, Finanzierung, Nichtanrechnung, Datenschutz, Evaluation und Befangenheitsregeln. Ergebnis ist eine Entscheidungsvorlage."),
          ("3 bis 6 Monate: gemeinsamer Entwurf", "Betroffene Gruppen gestalten Ziel, Zugang, Unterstützungen und Beschwerdeweg mit. Die 30er-Verteilung und die Alterskurve werden an Recht, realer Nachfrage und einer altersneutralen Alternative geprüft."),
          ("Danach: nur mit Beschluss", "Erst nach einem gedeckten Budget und einer verantwortlichen Stelle könnten Ausschreibung, echte Anträge und sechsmonatige Phasen beginnen. Ein späterer Stopp oder Umbau ist als Möglichkeit einzuplanen.")],
         ("GO NRW 2026", "Chancenreise"), "phases"),
    page("23 / Zehn-Jahre-Hypothese", "Auch ein Euro darf Fragen auslösen",
         "Angenommen, das Programm wird nach Jahren tatsächlich breit angeboten: Eine vermögende Person könnte freiwillig nur einen Euro wählen.",
         [("Mögliche Pointe", "Die Person kann mit eigenem Kapital ein großes Vorhaben starten. Daraus darf man nicht schließen, dass der eine öffentliche Euro das Unternehmen erschaffen hat. Der Vergleich mit einer Welt ohne Programm bleibt entscheidend."),
          ("Schutz des Programms", "Ein symbolisch geringer Betrag spart nicht automatisch Geld, wenn Beratung und Verwaltung trotzdem anfallen. Spenden, Projektmittel, private Investitionen und öffentliche Entwicklungsleistungen sind getrennte Buchungen."),
          ("Klare Grenze", "Ein öffentlicher Kontakt legalisiert kein Geld aus rechtswidriger Tat. Mittelherkunft, Steuern, Beihilfen und Strafrecht werden unabhängig geprüft. Das Gedankenexperiment bleibt eine Zukunftshypothese, keine Prognose.")],
         ("StGB § 261", "Budgetquelle", "Rechtslabor"), "money"),
    page("24 / Entscheidungsvorlage", "Drei Fragen für ein erstes Gespräch",
         "Der Brief bittet um ein Arbeitsgespräch über Machbarkeit. Er verlangt keinen Sofortbescheid über Geld und meldet keine echte Bewerbung an.",
         [("1. Wer könnte zuständig sein?", "Gibt es innerhalb der Stadt eine Stelle, die einen freiwilligen Pilotvorschlag mit Wirtschafts-, Sozial- und Teilhabeperspektive entgegennimmt und mögliche Partner zu einer Vorprüfung einlädt?"),
          ("2. Welche Vorprüfung wäre nötig?", "Bitte benennen Sie die rechtlichen, finanziellen, datenschutzrechtlichen und organisatorischen Mindestbedingungen, bevor die Gruppe von 30 Menschen und eine Bewerbung überhaupt angekündigt werden können."),
          ("3. Wie bleibt der Ursprung sichtbar?", "Juri bittet darum, seine Urheberrolle und den Wunsch nach Teilnahme mit drei weiteren Menschen als gesonderten, transparent zu prüfenden Punkt aufzunehmen. Eine Lösung soll Gleichbehandlung und unabhängige Kontrolle wahren.")],
         ("Konzept im Web", "Rechtslabor", "GO NRW 2026"), "law"),
    page("25 / Hilfe am Rand", "Der freiwillige Anschnallmodus",
         "Bis hierhin gelesen? Es gibt noch eine Sicherheitsidee: Wenn jemand in einer schweren oder auch strafrechtlich riskanten Lage herauswill, darf die sechsmonatige Frist kein Ende erreichbarer Hilfe sein.",
         [("Der mögliche Ausweg", "Die Person kann freiwillig eine unabhängige Stelle ansprechen. Diese klärt mit ihr passende psychosoziale, Sucht-, Schuldner- oder Schutzangebote und bei strafrechtlichem Risiko den Zugang zu selbst gewählter anwaltlicher Beratung. Vertraulichkeit und ihre gesetzlichen Grenzen werden vorab erläutert."),
          ("Juris provokanter Originalton", "'Gib dem kriminell Verdächtigen irgendeine Möglichkeit, mal seinen Rausch auszuleben, wird er reden.' Das Zitat ist Diskussionsmaterial, <b>keine Befragungstechnik</b>. Juris Szene meint zivil gekleidete Polizeikräfte auf einer Technoparty, die eine laut erzählte, für Umstehende hörbare Äußerung wahrnehmen. Sie ist eine Erzählidee, keine Behauptung über wirkliche Einsätze oder einen Partner des Piloten."),
          ("Die Rechtsgrenze", "Ein Projektteam erhält keine Ermittlungsbefugnis. Eine laut hörbare Äußerung ist zunächst eine Wahrnehmung im öffentlichen Raum; eine gezielte behördliche Vernehmung ist ein anderer Vorgang. Freiwilliges Feiern ist keine staatliche Beeinflussung. Bei einer Beschuldigtenvernehmung schützt § 136 StPO Schweigen und Verteidigerzugang; § 136a StPO verbietet Eingriffe in freie Willensentscheidung und Einsicht. Akute Gefahr und gesetzliche Pflichten folgen den zuständigen Verfahren.")],
         ("StGB § 201", "StPO § 136", "StPO § 136a", "DSGVO", "Rechtslabor"), "support"),
    page("26 / Reproduzierbarkeit", "Quellen und offener Quellcode",
         "Jeder wichtige Rechen- und Rechtsanker ist anklickbar. Der Code zeigt ein Modell; seine Existenz beweist weder soziale Wirkung noch eine amtliche Auswahl.",
         [("Öffentliche Webfassung", f'<link href="{SITE}">Projektstart</link>, <link href="{SITE}konzept.html">Konzept</link>, <link href="{SITE}rechtslabor.html">Rechtslabor</link> und <link href="{SITE}chancenreise.html">fiktive Chancenreise</link>. Die Seiten können ohne Antrag und ohne Dateneingabe betrachtet werden.'),
          ("Rechenquelle", f'<link href="{CODE}tools/juri_age_model.mjs">Altersmodell als Quellcode</link>, <link href="{CODE}tests/juri-age-model.test.mjs">Modelltest</link> und <link href="{CODE}forschung/juri-thesis/WIRTSCHAFTSMODELL.md">offene Budgetannahmen</link>. Die 16-Punkte-Grafik folgt exakt dieser Quelle.'),
          ("Rechtsquellen", f'<link href="{SOURCES["GG Art. 3"]}">GG Art. 3</link>, <link href="{SOURCES["SGB II § 11"]}">SGB II § 11</link>, <link href="{SOURCES["SGB II § 11a"]}">§ 11a</link>, <link href="{SOURCES["GO NRW 2026"]}">GO NRW</link> und <link href="{SOURCES["DSGVO"]}">DSGVO</link>. Die Normen müssen vor einer realen Entscheidung in aktueller Fassung und für den konkreten Träger geprüft werden.')],
         ("Konzept im Web", "Altersmodell Code", "Budgetquelle")),
])

def paragraph(c, text, style, x, y, width):
    p = Paragraph(text, style)
    _, height = p.wrap(width, H)
    p.drawOn(c, x, y - height)
    return y - height

def draw_header(c, index):
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(INK)
    c.rect(0, H - 19, W, 19, stroke=0, fill=1)
    c.setFont("Arial-Bold", 8)
    c.setFillColor(GREEN)
    c.drawString(48, H - 53, "JURI-THESIS  /  PILOTBRIEF")
    c.setFillColor(MUTED)
    c.drawRightString(W - 48, H - 53, "13. OKTOBER 2026  /  ENTWURF")
    c.setStrokeColor(colors.HexColor("#c9d9d4"))
    c.line(48, 67, W - 48, 67)
    c.setFont("Arial", 8)
    c.drawString(48, 47, "Konzept Juri Janovski  |  Gesprächsvorlage für die Stadt Brühl")
    c.drawRightString(W - 48, 47, f"{index + 1:02d} / {len(PAGES) + 1:02d}")

def draw_refs(c, refs):
    if not refs:
        return
    c.setFont("Arial-Bold", 7.8)
    c.setFillColor(MUTED)
    c.drawString(48, 104, "DIREKTQUELLEN / WEITERLESEN")
    x, y = 48, 88
    for label in refs:
        url = SOURCES[label]
        text = label
        width = pdfmetrics.stringWidth(text, "Arial", 8)
        if x + width > W - 48:
            x, y = 48, y - 11
        c.setFont("Arial", 8)
        c.setFillColor(GREEN)
        c.drawString(x, y, text)
        c.setStrokeColor(GREEN)
        c.setLineWidth(0.4)
        c.line(x, y - 2, x + width, y - 2)
        c.linkURL(url, (x, y - 2, x + width, y + 9), relative=0)
        x += width + 17

def draw_diagram(c, kind, top):
    x, width, height = 48, W - 96, 122
    c.setFillColor(PALE)
    c.roundRect(x, top - height, width, height, 16, fill=1, stroke=0)
    if kind == "seats":
        groups = [(4, "#d9ad58"), (2, "#77b7a5"), (5, "#70a3c4"), (2, "#b69bc4"), (17, "#326b61")]
        items = [(count, colors.HexColor(color)) for count, color in groups]
        flat = [color for count, color in items for _ in range(count)]
        for i, color in enumerate(flat):
            cx = x + 31 + (i % 15) * 30
            cy = top - 35 - (i // 15) * 40
            c.setFillColor(color)
            c.circle(cx, cy, 10, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont("Arial-Bold", 9)
        c.drawString(x + 24, top - 111, "4 Gründer  +  2 Start  +  5 Übergang  +  2 Sorge  +  17 offen  =  30")
    elif kind == "age":
        pts = AGE_DATA["points"]
        xx = lambda a: x + 36 + (a - 18) * (width - 70) / 47
        yy = lambda w: top - 92 + (w - 1) * 65
        c.setStrokeColor(GREEN); c.setLineWidth(3)
        p = c.beginPath()
        for i, item in enumerate(pts):
            if i == 0: p.moveTo(xx(item["age"]), yy(item["weight"]))
            else: p.lineTo(xx(item["age"]), yy(item["weight"]))
        c.drawPath(p)
        for item in pts:
            c.setFillColor(GOLD); c.circle(xx(item["age"]), yy(item["weight"]), 3.7, stroke=0, fill=1)
        c.setFillColor(INK); c.setFont("Arial-Bold", 9)
        c.drawString(x + 23, top - 110, "18 Jahre: 2,0")
        c.drawRightString(x + width - 23, top - 110, "65+ Jahre: 1,0")
    elif kind == "phases":
        c.setStrokeColor(GREEN); c.setLineWidth(3)
        c.line(x + 43, top - 67, x + width - 43, top - 67)
        for cx, head, tail in [(x + 67, "18+", "erste Phase"), (x + width/2, "30+", "erste weiter offen"), (x + width - 67, "50+", "zweite Phase")]:
            c.setFillColor(GOLD); c.circle(cx, top - 67, 9, fill=1, stroke=0)
            c.setFillColor(INK); c.setFont("Arial-Bold", 10); c.drawCentredString(cx, top - 44, head)
            c.setFont("Arial", 8); c.drawCentredString(cx, top - 91, tail)
    elif kind == "law":
        for i, (head, tail) in enumerate([("1", "Verfassung"), ("2", "Gesetz"), ("3", "Haushalt"), ("4", "Einzelfall")]):
            left = x + 19 + i * 119
            c.setFillColor(colors.HexColor(["#d8e8dd","#bedacb","#99c7b4","#6ca78f"][i]))
            c.roundRect(left, top - 93, 107, 60, 9, fill=1, stroke=0)
            c.setFillColor(INK); c.setFont("Georgia-Bold", 19); c.drawCentredString(left + 53, top - 59, head)
            c.setFont("Arial-Bold", 8); c.drawCentredString(left + 53, top - 78, tail)
    elif kind == "support":
        labels = ["Freiwillig melden", "Unabhängige Hilfe", "Eigene Entscheidung"]
        shades = ["#d8e8dd", "#bedacb", "#99c7b4"]
        for i, (label, shade) in enumerate(zip(labels, shades)):
            left = x + 18 + i * 158
            c.setFillColor(colors.HexColor(shade))
            c.roundRect(left, top - 82, 148, 48, 9, fill=1, stroke=0)
            c.setFillColor(INK); c.setFont("Arial-Bold", 8.5)
            c.drawCentredString(left + 74, top - 62, label)
        c.setFillColor(MUTED); c.setFont("Arial", 8)
        c.drawString(x + 21, top - 106, "Hilfe, Beratung und gesetzliche Zuständigkeit bleiben getrennte Wege.")
    elif kind == "money":
        labels = [("Bisherige Ansprüche", "#70a3c4"), ("Neue Entwicklungsleistung", "#77b7a5"), ("Projektmittel", "#d9ad58")]
        for i, (head, color) in enumerate(labels):
            left = x + 18 + i * 158
            c.setFillColor(colors.HexColor(color))
            c.roundRect(left, top - 85, 148, 49, 9, fill=1, stroke=0)
            c.setFillColor(INK); c.setFont("Arial-Bold", 8.5); c.drawCentredString(left + 74, top - 64, head)
        c.setFillColor(MUTED); c.setFont("Arial", 8); c.drawString(x + 21, top - 107, "Getrennte Spuren. Die gesetzliche Behandlung jeder Zahlung bleibt zu prüfen.")
    else:
        c.setFillColor(INK); c.setFont("Georgia-Bold", 27)
        c.drawCentredString(x + width/2, top - 73, kind)
    return top - height

def draw_cover(c):
    c.setFillColor(INK); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(GOLD); c.setFont("Arial-Bold", 11)
    c.drawString(50, H - 70, "JURI-THESIS / KONZEPT VON JURI JANOVSKI")
    c.setFillColor(WHITE); c.setFont("Georgia-Bold", 48)
    c.drawString(50, H - 160, "30 Menschen.")
    c.drawString(50, H - 220, "6 Monate.")
    c.setFillColor(GOLD); c.drawString(50, H - 280, "Eine Region.")
    c.setFillColor(colors.HexColor("#cde4dc"))
    c.setFont("Arial", 14)
    lines = [
        "Vorschlag für einen freiwilligen Entwicklungszeit-Pilot",
        "in Brühl und Umgebung. Vier Gründerplätze als offen",
        "geprüfter Wunsch; 26 weitere Plätze. Individuelle",
        "Zusatzleistung. Zwei Lebensphasen als größere These."
    ]
    for i, line in enumerate(lines):
        c.drawString(52, H - 339 - i*21, line)
    for i in range(30):
        col, row = i % 10, i // 10
        c.setFillColor([GOLD, colors.HexColor("#75b19f"), colors.HexColor("#76a5c0")][row])
        c.circle(62 + col * 51, 254 - row * 47, 14, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont("Arial", 10)
    c.drawString(50, 73, "Gesprächsvorlage für Stadt Brühl  |  13. Oktober 2026")
    c.drawString(50, 55, "Öffentlicher Entwurf. Kein bewilligtes Programm, keine laufende Bewerbung.")
    c.linkURL(SITE, (50, 48, W - 50, 82), relative=0)

def draw_content(c, item, index):
    draw_header(c, index)
    y = H - 87
    c.setFillColor(GREEN); c.setFont("Arial-Bold", 9)
    c.drawString(48, y, item["label"].upper())
    y -= 16
    y = paragraph(c, item["title"], TITLE, 48, y, W - 96) - 15
    y = paragraph(c, item["lead"], LEAD, 48, y, W - 96) - 17
    if item["diagram"]:
        y = draw_diagram(c, item["diagram"], y) - 19
    for head, text in item["blocks"]:
        y = paragraph(c, head, SUB, 48, y, W - 96) - 4
        y = paragraph(c, text, BODY, 48, y, W - 96) - 14
    if y < 127:
        raise ValueError(f"Page {index+1} overflows into references: {item['title']}: y={y:.1f}")
    draw_refs(c, item["refs"])

def build():
    c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1, invariant=1)
    c.setTitle("JURI-THESIS - 30 Menschen, sechs Monate, eine Region")
    c.setAuthor("Juri Janovski")
    c.setSubject("Oeffentlicher Vorschlag fuer einen freiwilligen Entwicklungszeit-Pilot in Bruehl")
    draw_cover(c); c.showPage()
    for index, item in enumerate(PAGES, 1):
        draw_content(c, item, index)
        c.showPage()
    c.save()
    print(f"{OUT} | {len(PAGES)+1} pages")

if __name__ == "__main__":
    build()
