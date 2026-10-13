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
assert AGE_DATA["schema"] == "juri-thesis.age-discussion.v2"
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
    "GG Art. 1": "https://www.gesetze-im-internet.de/gg/art_1.html",
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
    "StGB § 46a": "https://www.gesetze-im-internet.de/stgb/__46a.html",
    "StGB § 56": "https://www.gesetze-im-internet.de/stgb/__56.html",
    "StPO § 136": "https://www.gesetze-im-internet.de/stpo/__136.html",
    "StPO § 136a": "https://www.gesetze-im-internet.de/stpo/__136a.html",
    "Justiz NRW Übergang": "https://www.justiz.nrw.de/sites/default/files/imported/files/2024-03/Flyer-zum-strukturierten-Uebergangsmanagement-in-NRW.pdf",
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
    page("01 / Ein Morgen", "Der Herd fällt aus. Die Idee bleibt.",
         "Ein Morgen in Brühl, drei verschiedene Anfänge: In einer vorgeschlagenen Pilotrunde hätten 30 Menschen je sechs Monate für ihren nächsten Schritt.",
         [("Der erste Weg", "Der Herd streikt, während eine Ausbildung beginnt. Ein persönlich vereinbarter Rahmen könnte den Ersatz als konkretes Alltagsanliegen aufnehmen."),
          ("Der zweite Weg", "Kinderbetreuung, Arbeit und Lernen liegen weit auseinander. Eine andere Person braucht verlässliche Mobilität und beschreibt, was ihr den Weg wirklich öffnet."),
          ("Der dritte Weg", "<b>Gebt mir einmalig zwei Millionen Euro für mein Vorhaben. Danach möchte ich keine frei abrufbaren Zusatzwünsche aus diesem Programm.</b> Auch dieser große Wunsch darf als Antrag auf den Tisch. Ob und in welcher Höhe er finanziert wird, ist eine eigene Entscheidung.")],
         (), "doors"),
    page("02 / Die Wahl", "Nicht jeder braucht dasselbe",
         "Die Person selbst eröffnet die Quest: Welcher nächste Schritt wird mit Zeit, Geld, Dingen, Menschen oder einem großen Vorhaben möglich?",
         [("Weg A: Begleitung und Alltag", "Eine regelmäßige Entwicklungszahlung kann Zeit freimachen. Ein Herd, Lernmittel, Kinderbetreuung oder passende Mobilität kommen als eigene, begründete Anliegen hinzu. Ein vorab vereinbarter Rahmen macht einfache Fälle schnell bearbeitbar."),
          ("Weg B: ein eigener großer Wurf", "Jemand kann stattdessen eine einmalige Summe für einen selbst gesteuerten Plan beantragen - auch zwei Millionen Euro als bewusst großes Beispiel. Wird ein solcher Plan finanziert und genehmigt, ersetzt seine vereinbarte Projektsumme spätere frei abrufbare Zusatzwünsche aus derselben Programmlinie."),
          ("Die Person bleibt am Steuer", "Ein Team hilft beim Klären und prüft nachvollziehbar, ob der gewählte Weg zum persönlichen Plan passt. Die Geschichte verlangt kein Studium und keinen vorher bewiesenen wirtschaftlichen Erfolg. Eine Person darf ihren Weg auch ändern und Gründe dafür nennen.")],
         (), "choices"),
    page("03 / Das System hinter der Geschichte", "Schnell helfen, Menschen beteiligt lassen",
         "Eine gute Idee darf nicht an jedem einzelnen Formular hängen bleiben. Die Regeln sollen alltägliche Anliegen tragen und große Entscheidungen sichtbar machen.",
         [("Der persönliche Rahmen", "Vor Beginn werden Zeit, regelmäßige Zahlung, Sachleistungen, Projektmittel und eine mögliche Einmalzahlung getrennt vereinbart. Der Rahmen nennt Zweck, Betrag, zuständige Stelle und Änderungsweg. Er wird nicht aus einer einzigen allgemeinen Eurogrenze abgeleitet."),
          ("Wenn der Herd ausfällt", "Eine Anfrage innerhalb eines bereits finanzierten und bewilligten Rahmens kann nach veröffentlichten Regeln zügig durchlaufen. Menschen prüfen Stichproben, Fehler und Ausnahmen; die Person sieht den Stand und kann eine Entscheidung überprüfen lassen."),
          ("Wenn es um Millionen geht", "Eine große Einmalzahlung wird vorab von verantwortlichen Menschen mit Finanzierungs- und Zweckprüfung entschieden. Erst danach kann der vereinbarte Abruf technisch einfach sein. Die Vision lautet: möglichst wenig Reibung innerhalb klarer, persönlicher Grenzen.")],
         (), "flow"),
    page("04 / Lebensmodell", "Erste Phase ab 18, zweite ab 50",
         "Erste Phase ab 18, zweite ab 50: So sieht das vorgeschlagene Lebensmodell aus.",
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
    page("06 / Platzledger", "30 = 4 + 2 + 5 + 2 + 2 + 15",
         "Vier Plätze bilden den gesonderten 1+3-Kontinuitätswunsch; 26 bleiben für weitere Menschen. Die Rechnung ist ein Entwurf, keine Vergabe.",
         [("1 + 3", "Ein Ankerplatz für den Ideengeber, zwei noch unbesetzte Plätze für seine spätere Wahl und ein mögliches Vorschlagsrecht für eine öffentlich ungenannte Mitgestalterin. Sie wurde noch nicht gefragt. Jede Person entscheidet selbst über Teilnahme. Die vier sind Teil der 30 und benötigen unabhängige Prüfung."),
          ("Elf besondere Suchpunkte", "Zwei Suchplätze betreffen erschwerte Übergänge im Alter 18, fünf die Gruppe 32 bis 35, zwei eine von jungen Alleinerziehenden selbst mitgestaltete Route und zwei Menschen nach Haftentlassung. Für genau diese Zahlen gibt es noch keine örtliche Bedarfsanalyse."),
          ("Fünfzehn", "Die verbleibenden Plätze bleiben für andere Alters- und Lebenslagen offen. Eine Person darf mehrere Merkmale haben, wird im Platzledger jedoch genau einmal verbucht. Sonst würde die Summe von 30 nur auf dem Papier stimmen.")],
         ("GG Art. 3", "Zugang und Auswahl", "Rechtslabor"), "seats"),
    page("07 / Der Anker und die offenen Sitze", "Ein Name. Drei freie Entscheidungen.",
         "Juri bittet hier um einen fortlaufenden Ankerplatz, solange er die Idee entwickelt und diese Zeit braucht. Zwei Wahlplätze und eine Einladung an eine weitere Mitnominierende bleiben offen.",
         [("Zwei Schattenplätze", "Zwei Menschen könnten jährlich neu oder erneut vorgeschlagen werden; die erste Einladung soll nach dem Wunsch des Initiators einer Frau eine gleichberechtigte Stimme eröffnen. Heute sind weder Personen noch Beträge bestimmt. Zustimmung und eine rechtmäßige Auswahl erfolgen vor einer Belegung."),
          ("Das dritte Vorschlagsrecht", "Eine weitere, öffentlich ungenannte Person könnte selbst eine Nominierung übernehmen. Sie wurde noch nicht gefragt und hat keine Rolle angenommen. Auch die von ihr später vorgeschlagene Person würde frei über eine Teilnahme entscheiden."),
          ("Noch eine Runde?", "Der Wunsch nach Fortsetzung ist ein Antrag auf Kontinuität, keine automatisch gültige Dauerkarte. Er ginge über die allgemeinen zwei Sechsmonatsphasen hinaus. Eine neue Runde braucht eine eigene Regel, verantwortliche Entscheidung und Finanzierung. Wiederwahl ersetzt eine frühere Belegung; die Summe bleibt 30. Co-Design-Rolle außerhalb der Plätze und begründete Pilotkategorie innerhalb der 30 sind getrennt zu prüfen.")],
         ("GG Art. 3", "GO NRW 2026", "Rechtslabor"), "seats_open"),
    page("08 / Achtzehn", "Zwei frühe Übergänge sichtbar machen",
         "Zwei Suchplätze sind für 18-jährige Menschen mit erschwertem Start vorgeschlagen.",
         [("Warum prüfen?", "Der Beginn des Erwachsenenlebens kann gleichzeitig Ausbildung, Erwerb, Wohnen und eigenständige Behördenkontakte betreffen. Die Informationen des BMAS zu jungen Menschen beschreiben Unterstützungswege und Hindernisse; daraus folgt keine automatische Eignung einer bestimmten Person."),
          ("Wie fragen?", "Ein 18-jähriger Mensch mit Straftatgeschichte kann einen Entwicklungsweg benötigen; Förderung und Strafverfahren bleiben getrennt. Eine reale Ausschreibung darf keine öffentliche Leidensgeschichte verlangen. Freiwillige Angaben zu konkreten Barrieren und einem gewünschten Entwicklungsschritt sind enger als unbestimmte Zuschreibungen wie 'hat es schwer gehabt'. Beratung und barrierefreie Zugänge müssen mitgedacht werden."),
          ("Gegenprobe", "Eine feste Alterszahl von zwei Plätzen braucht einen sachlichen Zweck und eine Prüfung, ob ein altersneutraler Zugang dieselbe Gruppe fairer erreicht. Ohne diese Prüfung ist die Markierung ein Forschungs- und Designvorschlag.")],
         ("BMAS junge Menschen", "GG Art. 3", "AGG § 10")),
    page("09 / Zweiunddreißig bis fünfunddreißig", "Fünf Suchplätze als Hypothese",
         "Fünf Suchplätze für 32- bis 35-Jährige sind ein Vorschlag, noch kein gemessener Brühler Bedarf.",
         [("Mögliche Übergänge", "Menschen können in diesen Jahren zwischen Familie, Beruf, Sorgearbeit, Ausbildung und Gründung neu sortieren. Diese plausible Beschreibung rechtfertigt für sich allein weder einen Vorrang noch genau fünf Plätze."),
          ("Unterscheidende Prüfung", "Vor einer wirklichen Quote müssten Bewerbungsnachfrage, selbst beschriebene Entwicklungsziele, bestehende Angebote und ein altersneutraler Vergleich erhoben werden. Gerade Menschen mit 31, 36 oder 51 dürfen nicht allein aufgrund einer runden Altersklasse unsichtbar werden."),
          ("Vorläufige Form", "Im PDF bleibt die Fünf als sichtbare Suchhypothese. Ein zuständiger Träger kann sie nach belegter Nachfrage verändern oder verwerfen. Solange das nicht geschehen ist, erhält niemand daraus einen Anspruch oder eine Ablehnung.")],
         ("GG Art. 3", "Altersmodell Code", "Rechtslabor")),
    page("10 / Sorgeverantwortung", "Zwei selbstbestimmte Plätze",
         "Junge alleinerziehende Mütter sollen eine eigene Stimme in Gestaltung und Begleitung bekommen.",
         [("Warum dieses Feld?", "Destatis weist für Menschen in Alleinerziehenden-Haushalten 2025 eine deutlich höhere Armutsgefährdung aus als für die Bevölkerung insgesamt. Das ist ein Gruppenindikator, keine Diagnose einer konkreten Bewerberin und kein Nachweis, dass zwei Plätze die richtige Zahl sind."),
          ("Eigenständige Gestaltung", "Ein unabhängiger, von Betroffenen mitgestalteter Träger könnte Zugang, Begleitung und eine freiwillige jährliche Würdigung von Ideen entwickeln. Die Entscheidung läge bei diesem Träger, nicht beim Initiator oder der Webseite. Eine künftige Vergabe öffentlicher Plätze kann nicht bloß per 'Ticket' ohne Mandat und Regeln übertragen werden."),
          ("Rechtlicher Zuschnitt", "Wenn ein Programm nach Geschlecht oder Familienform differenziert, müssen Zweck, Sachgrund, Verhältnismäßigkeit und Alternativen gesondert geprüft werden. Eine rechtlich robustere Teilhabespur kann Sorgeverantwortung und konkrete Barrieren offen erfassen, ohne Mütter aus dem Blick zu verlieren.")],
         ("Destatis Alleinerziehende", "GG Art. 3", "DSGVO")),
    page("11 / Offenheit", "Fünfzehn Plätze für weitere Wege",
         "Die übrigen 15 Plätze verhindern, dass ein Pilot nur zwei Lebensalter und einzelne gesellschaftliche Nischen sieht.",
         [("Wer mitgemeint ist", "Menschen über 35, über 50 und über 65 bleiben in der Gesamtkonzeption. Erwerbstätige, Erwerbslose, Menschen ohne Hochschulabschluss, Personen mit Behinderung, pflegende Angehörige und Menschen mit verborgenen Ideen benötigen zugängliche Einladungen."),
          ("Was nicht zählt", "Ein fehlendes Studium darf nicht automatisch gegen eine Idee sprechen. Sichtbare 'Karrierepunkte', Karmabegriffe oder Medaillen sind kein tragfähiger Ersatz für nachvollziehbare Ziele, Ressourcenbedarf und öffentlich bekannte Kriterien."),
          ("Wiederbewerbung", "Bei jeder neuen Runde soll eine Person bewusst neu entscheiden können. Eine Absage ist kein dauerhafter Persönlichkeitsstatus. Frühere Unterlagen werden nur im rechtlich zulässigen und transparent erklärten Umfang weiterverwendet.")],
         ("Zugang und Auswahl", "Chancenreise")),
    page("12 / Neue Kurve", "16 Punkte auf der Alterskurve",
         "Der neue Diskussionsentwurf gewichtet jüngere Erwachsene stärker: Die Kurve fällt zuerst deutlicher und läuft zum höheren Alter hin flacher aus. 18 erhält 2, 65 erhält 1.",
         [("Berechenbare Definition", "Für ganzzahlige Alter ab 18 gilt <b>w(a) = 1 + ((65 - min(a,65)) / 47)²</b>. Ab 65 bleibt das Gewicht 1. Die 16 gezeichneten Stützpunkte liegen von 18 bis 65; auch jedes Alter dazwischen hat einen definierten Wert."),
          ("Was das Gewicht nicht beweist", "Zwei zu eins an den Endpunkten ist ein Verhältnis von Modellgewichten. Bei 30 Ziehungen ohne Zurücklegen ist die tatsächliche individuelle Inklusionswahrscheinlichkeit nicht einfach doppelt. Alle Altersklassen bleiben berechenbar, aber 30 Menschen können nicht zugleich jedes der 48 einzelnen Alter von 18 bis 65 repräsentieren."),
          ("Status", "Die Kurve ist eine Rechen- und Diskussionsebene. Ob ihr Einsatz eine gerechte Vergabe unterstützen würde, ist offen; Alter ist kein automatischer Ersatz für Bedarf.")],
         ("Altersmodell Code", "Altersmodell Test", "GG Art. 3"), "age"),
    page("13 / Needed", "Bedarf ist eine zweite Achse",
         "Dass eine Altersklasse mehrfach markiert werden kann, ist sinnvoll: Lebenslagen überlagern sich. Das Wort 'needed' braucht dennoch eine überprüfbare Definition.",
         [("Vier mögliche Beobachtungen", "Eine Person kann Zugangshürden, Sorgeverantwortung, fehlende Mittel oder einen konkreten Übergang selbst beschreiben. Ein Träger kann außerdem regionale Angebotslücken prüfen. Diese vier Informationen werden nicht still zu einem Charakter- oder Talentwert zusammengemischt."),
          ("Nicht aus Alter folgern", "Ein 18-jähriger Mensch kann wenig Unterstützung brauchen; eine 54-jährige Person kann einen massiven Übergang erleben. Die Alterskurve und der individuelle Unterstützungsbedarf sind typverschiedene Merkmale."),
          ("Vor einer echten Auswahl", "Kriterien, Datengrundlage, Prüfperson, Korrekturweg und Auswirkung jeder Markierung müssen vor Bewerbung feststehen. Das System darf keine rein automatische Zusage oder Absage mit erheblicher Wirkung erzeugen, ohne die einschlägigen Schutzregeln zu erfüllen.")],
         ("DSGVO", "GG Art. 3", "Zugang und Auswahl")),
    page("14 / Geld", "Wie wird aus einem Wunsch ein Plan?",
         "Die Person benennt ihren Weg. Die künftige Stelle vereinbart mit ihr einen finanzierten, überprüfbaren persönlichen Rahmen.",
         [("Zwei Wege im selben Pilot", "Laufende Entwicklungszahlungen Z(i,m) und gesonderte Anliegen können einen Weg tragen. Alternativ kann eine Person eine große Einmalzahlung E(i) für ein eigenes Vorhaben beantragen; zwei Millionen Euro sind ein bewusst extremes Beispiel, keine allgemeine Obergrenze. Wird E(i) genehmigt, ersetzt sie nur die vereinbarten künftigen Zusatzabrufe derselben Programmlinie."),
          ("So wird schnell entschieden", "Innerhalb eines bereits genehmigten Rahmens können einfache Anliegen anhand veröffentlichter Kriterien zügig bearbeitet werden. Beteiligte Menschen überwachen, korrigieren und entscheiden Ausnahmen. Aufnahme, Ablehnung, Rahmenänderung und Millionenbeträge verlangen eine eigenständige menschliche Entscheidung und einen verständlichen Überprüfungsweg."),
          ("Erst finanzieren, dann auszahlen", "Der Gesamtbedarf umfasst Z, E, Sach- und Projektmittel sowie Personal. 30 Einmalzahlungen zu je zwei Millionen Euro wären allein 60 Millionen Euro. Ein solcher Pfad braucht vorab gesicherte Mittel, Zuständigkeit und rechtliche Prüfung. Heute ist kein individueller Betrag bewilligt.")],
         ("Budgetquelle", "SGB II § 11", "SGB II § 11a"), "money"),
    page("15 / Haushalt", "Zahlung ist noch kein Rückfluss",
         "Ein vollständiger Haushalt umfasst mehr als 30 mal sechs Monatsbeträge.",
         [("Kleines Rechenbeispiel", "Bei einem rein illustrativen Betrag von 1.500 Euro je Personenmonat wären 30 mal 6 mal 1.500 Euro = 270.000 Euro direkte Monatszahlungen für eine Runde. Große Einmalzahlungen und zusätzliche Anschaffungen sind darin nicht enthalten. Begleitung, Personal, Räume, Versicherungen, Verwaltung und Reserve kommen hinzu."),
          ("Drei Spuren", "Transfer an Menschen, tatsächlich zusätzlich entstandene Wertschöpfung und spätere Steuern oder vermiedene Kosten sind nicht derselbe Geldbetrag. Doppelzählungen würden eine positive Bilanz nur vortäuschen."),
          ("Kommunale Prüfung", "Brühl müsste kommunalen Aufgabenbezug, Zuständigkeit, Wirtschaftlichkeit, Haushalt und mögliche Partnerbeiträge selbst prüfen. Kein Unternehmens- oder Landesbeitrag ist für diesen Vorschlag zugesagt.")],
         ("Budgetquelle", "GO NRW 2026"), "money"),
    page("16 / Zusätzlichkeit", "Nichtanrechnung ist ein Gesetzgebungsziel",
         "Die zusätzliche Entwicklungsleistung soll bestehende Ansprüche nicht verdrängen. Das ist eine politische Forderung.",
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
    page("23 / Drei Wege in zehn Jahren", "Was wird aus einer echten Chance?",
         "Man nehme an, drei Menschen nutzen denselben Platz auf ganz verschiedene Weise.",
         [("Ein Aufbruch", "Ein Mensch erhält beispielhaft 5.000 € im Monat für sechs Monate. Er entwickelt eine App, schreibt ein Buch, reist zum Lernen oder findet erst einmal Unterstützung bei einer Depression und einen tragfähigen Alltag. Keine Person muss alles zugleich schaffen; der Betrag ist eine Einzelannahme, keine allgemeine Zahlung."),
          ("Die Ein-Euro-Challenge", "Chantal fragt, weshalb ein Mensch mit Vermögen einen Platz bekommen soll. Vermögen schafft keinen Vorrang. Wird die Person nach denselben Regeln ausgewählt, kann sie für die gesamte Phase nur einen öffentlichen Euro nehmen und mit belegten, rechtmäßig verfügbaren eigenen Mitteln Neues aufbauen. Öffentlicher Euro, eigene Mittel und zusätzlicher Wert werden getrennt dokumentiert."),
          ("Ein anderer Bedarf", "Eine dritte Person braucht womöglich mehr für Wohnen, Kinderbetreuung, Barrierefreiheit oder ein Vorhaben. Ihr Bedarf wird individuell begründet und finanziert. Faire Auswahl und die Prüfung von Mittelherkunft und Interessenkonflikten schützen alle drei Wege.")],
         ("Konzept im Web", "Budgetquelle", "Rechtslabor"), "money"),
    page("24 / Entscheidungsvorlage", "Drei Fragen für ein erstes Gespräch",
         "Der Brief bittet um ein Arbeitsgespräch über Machbarkeit. Er verlangt keinen Sofortbescheid über Geld und meldet keine echte Bewerbung an.",
         [("1. Wer könnte zuständig sein?", "Gibt es innerhalb der Stadt eine Stelle, die einen freiwilligen Pilotvorschlag mit Wirtschafts-, Sozial- und Teilhabeperspektive entgegennimmt und mögliche Partner zu einer Vorprüfung einlädt?"),
          ("2. Welche Vorprüfung wäre nötig?", "Bitte benennen Sie die rechtlichen, finanziellen, datenschutzrechtlichen und organisatorischen Mindestbedingungen, bevor die Gruppe von 30 Menschen und eine Bewerbung überhaupt angekündigt werden können."),
          ("3. Wie bleibt der Ursprung sichtbar?", "Der 1+3-Kontinuitätswunsch und die 26 anderen Wege bleiben getrennt sichtbar. Eine Lösung soll jährliche Neubewertung, Gleichbehandlung, Zustimmung jeder Person und unabhängige Kontrolle verbinden.")],
         ("Konzept im Web", "Rechtslabor", "GO NRW 2026"), "law"),
    page("25 / Hilfe am Rand", "Der freiwillige Anschnallmodus",
         "Bis hierhin gelesen? Es gibt noch eine Sicherheitsidee: Wenn jemand in einer schweren oder auch strafrechtlich riskanten Lage herauswill, darf die sechsmonatige Frist kein Ende erreichbarer Hilfe sein.",
         [("Der mögliche Ausweg", "Der zugespitzte Ausdruck 'sechs Monate Narrenfreiheit' meint: ehrlich sprechen und nach Fehlern neu anfangen, nicht straffrei handeln. Eine unabhängige Stelle klärt psychosoziale, Sucht-, Schuldner- oder Schutzangebote und bei strafrechtlichem Risiko den Zugang zu selbst gewählter anwaltlicher Beratung. Vertraulichkeit und ihre gesetzlichen Grenzen werden vorab erläutert."),
          ("Korrigierte Beobachtung", "Die zugrunde liegende Schilderung beschreibt sinngemäß eine Situation im Nachtleben: Eine Person besorgt sich Kokain selbst und könnte sich im Gespräch auf ihre Weise öffnen. Das ist keine sichere Vorhersage, keine Befragungsmethode und kein Bestandteil des Piloten. Eine frühere direkte Zuschreibung wurde auf Korrektur hin entfernt."),
          ("Die Rechtsgrenze", "Ein Projektteam erhält keine Ermittlungsbefugnis. Eine laut hörbare Äußerung ist zunächst eine Wahrnehmung im öffentlichen Raum; eine gezielte behördliche Vernehmung ist ein anderer Vorgang. Freiwilliges Feiern ist keine staatliche Beeinflussung. Bei einer Beschuldigtenvernehmung schützt § 136 StPO Schweigen und Verteidigerzugang; § 136a StPO verbietet Eingriffe in freie Willensentscheidung und Einsicht. Akute Gefahr und gesetzliche Pflichten folgen den zuständigen Verfahren.")],
         ("StGB § 201", "StPO § 136", "StPO § 136a", "DSGVO", "Rechtslabor"), "support"),
    page("26 / Teilhabe nach Haft", "Zwei Plätze für einen neuen Anfang",
         "Zwei Suchplätze nach Haftentlassung gehen von den zuvor 17 offenen Plätzen ab; 15 bleiben offen. Die Summe der ersten Runde bleibt 30.",
         [("Eine fachliche Anknüpfung", "Das strukturierte Übergangsmanagement der Justiz NRW beschreibt, warum Hilfen vor und nach der Entlassung zusammenpassen müssen. Das ist eine zitierte Quelle, keine Projektpartnerschaft. Der Pilot müsste mit geeigneten Stellen und den Betroffenen erst einen freiwilligen Weg entwerfen."),
          ("Ehrlichkeit ohne falsches Versprechen", "Ein Mensch darf eigene Fehler benennen und um Hilfe bitten. Das Team muss vorher sagen, was vertraulich bleiben kann und was nicht. Es kann weder Straflosigkeit noch eine Bewährungsentscheidung zusagen. Bei möglicher eigener Straftat muss selbst gewählte rechtliche Beratung erreichbar sein."),
          ("Schutz der Person", "Eine frühere Verurteilung ist keine öffentliche Bewerbungsmarke. Daten über Straftaten und Verurteilungen verlangen nach Art. 10 DSGVO eine eigene Zulässigkeitsprüfung. Bei Schaden oder Abbruch wird nach übersehenen Hilfen und Barrieren gefragt, ohne die Person auf ein moralisches Etikett zu reduzieren.")],
         ("Justiz NRW Übergang", "StGB § 46a", "StGB § 56", "DSGVO"), "support"),
    page("27 / Rechengedanke", "13 von 26: die Gegenprobe",
         "Gedankenversuch: 13 von 26 offen aufgenommenen Menschen erzeugen einen messbaren Rückfluss; bei den anderen wird auch ein ungünstiger Verlauf geprüft. Beides sind frei gesetzte Hypothesen.",
         [("Variablen binden", "C sind die vollständigen Kosten pro sechsmonatigem Platz; R ist der zusätzlich belegte Nutzen je einem der 13 Plätze; F ist die getrennt belegte Zusatzwirkung der vier gewünschten Gründerplätze. H sind zusätzlich belegte, in derselben Rechnung bewertbare Schäden oder Folgekosten. Für denselben Zeitraum gilt: S = 13 x R + F - 30 x C - H."),
          ("Zwei und fünf", "Bei R = 2C und F = 0 folgt S = -4C - H; für Ausgleich müsste F mindestens 4C + H betragen. Bei R = 5C und F = 0 folgt S = 35C - H. Nutzen und Schäden sind nicht gemessen; Verletzungen von Menschen lassen sich damit nicht aufrechnen."),
          ("80-Prozent-Stressprobe", "80 Prozent von 30 sind 24. Mehr als 80 Prozent ohne gemessenen Rückfluss wären mindestens 25; höchstens fünf Plätze blieben in diesem Maßstab mit Rückfluss. Bei F = 0 bräuchten sie im Mittel mindestens (30C + H) / 5. Fehlender Rückfluss sagt nichts über Menschenwert oder Kriminalität.")],
         ("Budgetquelle", "Konzept im Web", "Rechtslabor")),
    page("28 / Reproduzierbarkeit", "Quellen und offener Quellcode",
         "Jeder wichtige Rechen- und Rechtsanker ist anklickbar. Der Code zeigt ein Modell; seine Existenz beweist weder soziale Wirkung noch eine amtliche Auswahl.",
         [("Öffentliche Webfassung", f'<link href="{SITE}">Projektstart</link>, <link href="{SITE}konzept.html">Konzept</link>, <link href="{SITE}rechtslabor.html">Rechtslabor</link> und <link href="{SITE}chancenreise.html">fiktive Chancenreise</link>. Die Seiten können ohne Antrag und ohne Dateneingabe betrachtet werden.'),
          ("Rechenquelle", f'<link href="{CODE}tools/juri_age_model.mjs">Altersmodell als Quellcode</link>, <link href="{CODE}tests/juri-age-model.test.mjs">Modelltest</link> und <link href="{CODE}forschung/juri-thesis/WIRTSCHAFTSMODELL.md">offene Budgetannahmen</link>. Die 16-Punkte-Grafik folgt exakt dieser Quelle.'),
          ("Rechtsquellen", f'<link href="{SOURCES["GG Art. 3"]}">GG Art. 3</link>, <link href="{SOURCES["SGB II § 11"]}">SGB II § 11</link>, <link href="{SOURCES["SGB II § 11a"]}">§ 11a</link>, <link href="{SOURCES["GO NRW 2026"]}">GO NRW</link> und <link href="{SOURCES["DSGVO"]}">DSGVO</link>. Die Normen müssen vor einer realen Entscheidung in aktueller Fassung und für den konkreten Träger geprüft werden.')],
         ("Konzept im Web", "Altersmodell Code", "Budgetquelle")),
    page("29 / Fünf Gegenkarten", "Wer wagt die nächste Frage?",
         "Fünf kurze Fragen für ein ernstes Gespräch. Jede Karte lässt dem Gegenüber einen echten Einwand und einen konstruktiven Gegenzug.",
         [("1 / Was ist ein Geburtstag wert?", "Ein Mensch erhält durch seine Geburt keinen berechenbaren Euro- oder Leistungswert. Art. 1 GG schützt seine Würde. Die Kostenfrage betrifft den vorgeschlagenen Weg und seine Finanzierung, nicht den Wert eines Lebens."),
          ("2 / Wer darf sitzen bleiben?", "Der Ankerplatz ist als fortlaufender Wunsch formuliert. Ein Gegenüber kann fragen, warum gerade dieser Platz weiterlaufen soll. Die Antwort braucht einen öffentlichen Zweck, einen verantwortlichen Träger und eine überprüfbare Jahresentscheidung."),
          ("3 / Wem gehören die Schattenplätze?", "Zwei freie Plätze können erst nach freiwilliger Wahl, eigener Zustimmung der Vorgeschlagenen und einer unabhängigen Entscheidung Namen tragen. Die dritte Mitnominierende hat noch nichts angenommen. Kein Platz wächst dadurch über 30 hinaus."),
          ("4 / Was kostet ein unbekannter Mensch?", "Der Mensch hat keinen Preis. Für seinen gewünschten Sechsmonatsweg ist x zunächst offen: laufende Mittel, Anschaffungen, Projektmittel und Begleitung werden getrennt geplant. Ein Beispielbetrag für eine Person wird nicht zum Anspruch aller."),
          ("5 / Wer hält die Gegenseite offen?", "Die 26 anderen Wege brauchen vorab veröffentlichte Kriterien, einen Beschwerdeweg und faire Finanzierung. Wer 1 + 3 vorschlägt, muss diese Prüfung zulassen; ein guter Einwand verbessert das Modell, statt einen Gegner zum Verstummen zu bringen.")],
         ("GG Art. 1", "GG Art. 3", "GO NRW 2026", "Rechtslabor")),
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
    c.drawRightString(W - 48, H - 53, "14. OKTOBER 2026  /  ENTWURF")
    c.setStrokeColor(colors.HexColor("#c9d9d4"))
    c.line(48, 67, W - 48, 67)
    c.setFont("Arial", 8)
    c.drawString(48, 47, "JURI-THESIS  |  Gesprächsvorlage für die Stadt Brühl")
    c.drawRightString(W - 48, 47, f"{index + 1:02d} / {len(PAGES) + 1:02d}")

def draw_refs(c, refs):
    if not refs:
        return
    c.setFont("Arial-Bold", 7.8)
    c.setFillColor(MUTED)
    c.drawString(48, 104, "QUELLEN ZU DIESEM KAPITEL")
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
    if kind == "doors":
        for i in range(30):
            cx = x + 31 + (i % 15) * 30
            cy = top - 35 - (i // 15) * 40
            c.setFillColor([GOLD, colors.HexColor("#75b19f"), colors.HexColor("#76a5c0")][i % 3])
            c.circle(cx, cy, 10, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont("Arial-Bold", 9)
        c.drawString(x + 18, top - 111, "Dreißig Menschen. Dreißig verschiedene Anfänge.")
    elif kind == "choices":
        for i, (head, color) in enumerate([("Alltag", "#d9ad58"), ("Mobilität", "#77b7a5"), ("Großes Vorhaben", "#70a3c4")]):
            left = x + 18 + i * 158
            c.setFillColor(colors.HexColor(color))
            c.roundRect(left, top - 82, 148, 49, 9, fill=1, stroke=0)
            c.setFillColor(INK); c.setFont("Arial-Bold", 9)
            c.drawCentredString(left + 74, top - 62, head)
        c.setFillColor(MUTED); c.setFont("Arial", 8)
        c.drawString(x + 21, top - 107, "Die Person beschreibt ihren Weg und den dafür nötigen Rahmen.")
    elif kind == "flow":
        labels = ["Anliegen", "Persönlicher Rahmen", "Prüfung", "Freigabe"]
        for i, head in enumerate(labels):
            left = x + 17 + i * 120
            c.setFillColor(colors.HexColor(["#e7d8ad", "#c6dfd1", "#a9d0cc", "#85bab4"][i]))
            c.roundRect(left, top - 82, 108, 48, 9, fill=1, stroke=0)
            c.setFillColor(INK); c.setFont("Arial-Bold", 8)
            c.drawCentredString(left + 54, top - 62, head)
        c.setFillColor(MUTED); c.setFont("Arial", 8)
        c.drawString(x + 21, top - 107, "Einfaches zügig erledigen, große Entscheidungen gemeinsam prüfen.")
    elif kind == "seats":
        groups = [(4, "#d9ad58"), (2, "#77b7a5"), (5, "#70a3c4"), (2, "#b69bc4"), (2, "#c79377"), (15, "#326b61")]
        items = [(count, colors.HexColor(color)) for count, color in groups]
        flat = [color for count, color in items for _ in range(count)]
        for i, color in enumerate(flat):
            cx = x + 31 + (i % 15) * 30
            cy = top - 35 - (i // 15) * 40
            c.setFillColor(color)
            c.circle(cx, cy, 10, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont("Arial-Bold", 9)
        c.drawString(x + 18, top - 111, "1+3 Anker/Wahl + 2 Start + 5 Übergang + 2 Sorge + 2 nach Haft + 15 offen = 30")
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
    elif kind == "seats_open":
        seats = [("1", "Anker", "beantragt"), ("2", "Wahl A", "Person offen"),
                 ("3", "Wahl B", "Person offen"), ("4", "Mitwahl", "Einladung offen")]
        for i, (number, label, status) in enumerate(seats):
            left = x + 19 + i * 119
            c.setFillColor(colors.HexColor(["#c5dacc", "#dcebcf", "#dcebcf", "#e8dcb9"][i]))
            c.roundRect(left, top - 97, 107, 69, 9, fill=1, stroke=0)
            c.setFillColor(INK); c.setFont("Georgia-Bold", 17)
            c.drawCentredString(left + 53, top - 55, number)
            c.setFont("Arial-Bold", 8); c.drawCentredString(left + 53, top - 72, label)
            c.setFont("Arial", 6.6); c.drawCentredString(left + 53, top - 85, status)
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
    c.drawString(50, H - 70, "JURI-THESIS / PILOTVORSCHLAG FÜR BRÜHL")
    c.setFillColor(WHITE); c.setFont("Georgia-Bold", 48)
    c.drawString(50, H - 160, "30 Menschen.")
    c.drawString(50, H - 220, "6 Monate.")
    c.setFillColor(GOLD); c.drawString(50, H - 280, "30 neue Wege.")
    c.setFillColor(colors.HexColor("#cde4dc"))
    c.setFont("Arial", 14)
    lines = [
        "Ein Herd geht kaputt, als die Ausbildung beginnt.",
        "Ein zweiter Weg braucht verlässliche Mobilität.",
        "Ein dritter Mensch bringt einen großen Projektplan mit.",
        "30 Plätze, je sechs Monate: ein Vorschlag für Brühl."
    ]
    for i, line in enumerate(lines):
        c.drawString(52, H - 339 - i*21, line)
    for i in range(30):
        col, row = i % 10, i // 10
        c.setFillColor([GOLD, colors.HexColor("#75b19f"), colors.HexColor("#76a5c0")][row])
        c.circle(62 + col * 51, 254 - row * 47, 14, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont("Arial", 10)
    c.drawString(50, 73, "JURI-THESIS  |  Gesprächsvorlage für Stadt Brühl  |  14. Oktober 2026")
    c.drawString(50, 55, "Die Geschichte beginnt hier. Das Modell und seine Prüfung folgen.")
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
    c.setAuthor("JURI-THESIS / HALVETH")
    c.setSubject("Oeffentlicher Vorschlag fuer einen freiwilligen Entwicklungszeit-Pilot in Bruehl")
    draw_cover(c); c.showPage()
    for index, item in enumerate(PAGES, 1):
        draw_content(c, item, index)
        c.showPage()
    c.save()
    print(f"{OUT} | {len(PAGES)+1} pages")

if __name__ == "__main__":
    build()
