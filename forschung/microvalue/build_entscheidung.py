"""Build the public, source-bound MICROVALUE decision dossier.

All monetary outcomes below are scenario arithmetic. None is inferred from an
unobserved balance, and the source tables remain separate from the proposal.
"""
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, PageBreak, PageTemplate, Paragraph, Spacer,
    Table, TableStyle,
)

HERE = Path(__file__).resolve().parent
OUT = HERE / "MICROVALUE-ENTSCHEIDUNG-15-SEITEN.pdf"
FONTS = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("MV", str(FONTS / "arial.ttf")))
pdfmetrics.registerFont(TTFont("MV-Bold", str(FONTS / "arialbd.ttf")))
pdfmetrics.registerFontFamily("MV", normal="MV", bold="MV-Bold")
NAVY = colors.HexColor("#102D42")
TEAL = colors.HexColor("#087A83")
PALE = colors.HexColor("#EAF5F3")
GOLD = colors.HexColor("#F8E8BD")
GRAY = colors.HexColor("#4B6271")
LINE = colors.HexColor("#C8DADC")
WHITE = colors.white

S = {
    "eyebrow": ParagraphStyle("eyebrow", fontName="MV-Bold", fontSize=9, leading=12, textColor=TEAL, spaceAfter=12),
    "title": ParagraphStyle("title", fontName="MV-Bold", fontSize=27, leading=32, textColor=NAVY, spaceAfter=17),
    "h": ParagraphStyle("h", fontName="MV-Bold", fontSize=14, leading=19, textColor=TEAL, spaceBefore=18, spaceAfter=8),
    "lead": ParagraphStyle("lead", fontName="MV", fontSize=13.1, leading=20.5, textColor=NAVY, spaceAfter=17),
    "body": ParagraphStyle("body", fontName="MV", fontSize=10.8, leading=16.7, textColor=NAVY, spaceAfter=11),
    "small": ParagraphStyle("small", fontName="MV", fontSize=9.1, leading=13.6, textColor=GRAY, spaceAfter=7),
    "cell": ParagraphStyle("cell", fontName="MV", fontSize=9.4, leading=14, textColor=NAVY),
    "head": ParagraphStyle("head", fontName="MV-Bold", fontSize=9.1, leading=13, textColor=WHITE),
}

URLS = {
    "vr-volume": "https://www.vr-payment.de/unternehmen-pressekontakt",
    "vr-faq": "https://www.vr-payment.de/faq/",
    "tips": "https://www.ecb.europa.eu/paym/target/tips/html/index.en.html",
    "target": "https://www.ecb.europa.eu/paym/target/coco/html/index.de.html",
    "deposits": "https://www.bundesbank.de/de/aufgaben/finanzaufsicht/einzelaspekte/einlagensicherung-597886",
    "contracts": "https://www.gesetze-im-internet.de/bgb/__311.html",
    "copyright": "https://www.gesetze-im-internet.de/urhg/__31.html",
    "ideas": "https://www.dpma.de/service/schutzrechte_kurz_erklaert/urheberrecht/",
}


def p(value, style="body"):
    return Paragraph(value, S[style])


def callout(value, fill=PALE):
    t = Table([[p(value, "body")]], colWidths=[489])
    t.spaceAfter = 16
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), .6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, -1), 13),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def table(rows, widths=None):
    widths = widths or [245, 122, 122]
    t = Table([[p(str(x), "head" if i == 0 else "cell") for x in row] for i, row in enumerate(rows)], colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE]),
        ("INNERGRID", (0, 0), (-1, -1), .4, LINE),
        ("BOX", (0, 0), (-1, -1), .6, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return t


def source(label, key):
    url = escape(URLS[key], {'"': '&quot;'})
    return p(f'Quelle: <link href="{url}" color="#087A83"><u>{escape(label)}</u></link>', "small")


def page(n, title, lead, *body):
    return [p(f"{n:02d} / 15 · HALVETH MICROVALUE", "eyebrow"), p(title, "title"), p(lead, "lead"), *body]


class Visual(Flowable):
    """Compact vector figures: labels are part of the PDF, not screenshots."""

    def __init__(self, kind):
        super().__init__()
        self.kind = kind
        self.width = 489
        self.height = 145 if kind in {"split", "month", "year", "sensitivity"} else 115
        self.spaceAfter = 16

    def draw(self):
        c = self.canv
        c.setFillColor(colors.HexColor("#F4FAF9"))
        c.roundRect(0, 0, self.width, self.height, 13, fill=1, stroke=0)

        def label(x, y, value, size=9, bold=False, color=NAVY):
            c.setFillColor(color)
            c.setFont("MV-Bold" if bold else "MV", size)
            c.drawString(x, y, value)

        def center(x, y, value, size=9, bold=False, color=NAVY):
            c.setFillColor(color)
            c.setFont("MV-Bold" if bold else "MV", size)
            c.drawCentredString(x, y, value)

        def box(x, y, w, h, title, sub, fill=PALE):
            c.setFillColor(fill)
            c.roundRect(x, y, w, h, 9, fill=1, stroke=0)
            center(x+w/2, y+h/2+7, title, 10, True)
            center(x+w/2, y+h/2-10, sub, 8)

        def arrow(x1, y, x2):
            c.setStrokeColor(TEAL)
            c.setFillColor(TEAL)
            c.setLineWidth(2)
            c.line(x1, y, x2-7, y)
            path = c.beginPath()
            path.moveTo(x2, y)
            path.lineTo(x2-8, y+5)
            path.lineTo(x2-8, y-5)
            path.close()
            c.drawPath(path, fill=1, stroke=0)

        if self.kind == "journey":
            items = [("Vorgang", "klar zählen"), ("Geldquelle", "Vertrag"),
                     ("Ein Cent", "5 Anteile"), ("Wirkung", "messen")]
            for i, (title, sub) in enumerate(items):
                x = 11 + i*122
                box(x, 31, 106, 60, title, sub, GOLD if i == 2 else PALE)
                if i < 3:
                    arrow(x+108, 61, x+121)
            label(12, 101, "VOM VORGANG ZUM PRÜFBAREN NUTZEN", 8, True, TEAL)
        elif self.kind == "split":
            label(12, 118, "1 CENT = 0,0100 EURO = 100 %", 12, True)
            x = 12
            for i, percent in enumerate([24, 24, 24, 24, 4]):
                w = 460*percent/100
                c.setFillColor(GOLD if i == 4 else TEAL)
                c.roundRect(x, 67, w-3, 29, 5, fill=1, stroke=0)
                if i < 4:
                    center(x+(w-3)/2, 75, "24 %", 9, True, WHITE)
                x += w
            for i in range(4):
                center(12+460*(i+.5)*.24, 46, "0,0024 €", 8, True)
            center(12+460*.98, 46, "4 %", 7, True)
            label(12, 17, "Kleine Rechenanteile werden erst durch vereinbarte Bündelung zahlbar.", 9)
        elif self.kind == "rounding":
            label(12, 91, "DOKUMENTIERTES ABRECHNUNGSBEISPIEL", 8, True, TEAL)
            box(12, 24, 190, 52, "0,0049951 €", "Zwischenrechnung")
            arrow(209, 50, 275)
            box(276, 24, 198, 52, "0,00 €", "nach Rundung: keine Gebühr", GOLD)
            label(12, 10, "Dieser Bruchteil ist keine nachgewiesene auszahlbare Reserve.", 8)
        elif self.kind == "funding":
            label(12, 91, "DREI MÖGLICHE FINANZIERUNGSWEGE", 8, True, TEAL)
            for i, (a, b) in enumerate([("Servicepreis", "frei vereinbart"),
                                        ("Einsparung", "erst messen"),
                                        ("Auftrag", "fester Preis")]):
                box(11+i*162, 29, 151, 50, a, b, GOLD if i == 1 else PALE)
            label(12, 11, "Jeder Weg braucht einen benannten Zahler und eine eigene Buchungsregel.", 8)
        elif self.kind == "month":
            label(12, 118, "MONAT 1 · ZWEI VERSCHIEDENE RECHNUNGEN", 9, True, TEAL)
            box(10, 56, 140, 48, "+1.800 €", "ersparte Arbeit")
            center(166, 78, "−", 20, True, TEAL)
            box(183, 56, 135, 48, "1.000 €", "Cent-Pool")
            center(333, 78, "=", 20, True, TEAL)
            box(350, 56, 128, 48, "+800 €", "laufender Saldo", GOLD)
            c.setStrokeColor(TEAL)
            c.line(412, 53, 412, 43)
            label(13, 20, "Nur falls 3.000 € Aufbau hinzukommen:", 9)
            label(319, 20, "+800 − 3.000 = −2.200 €", 9, True)
        elif self.kind in {"year", "sensitivity"}:
            left, right, bottom, top = 45, 471, 30, 105
            c.setStrokeColor(LINE)
            c.line(left, bottom, right, bottom)
            c.line(left, bottom, left, top)
            for y, t in [(bottom, "≈−8k"), (bottom+33, "0"), (top, "≈+10k")]:
                c.setStrokeColor(LINE)
                c.line(left, y, right, y)
                label(9, y-3, t, 7)
            def plot(points, color):
                c.setStrokeColor(color)
                c.setLineWidth(3)
                for i in range(len(points)-1):
                    c.line(*points[i], *points[i+1])
                c.setFillColor(color)
                for x, y in points:
                    c.circle(x, y, 2.3, stroke=0, fill=1)
            if self.kind == "year":
                label(46, 126, "●  laufend: +9.600 €", 8, True, TEAL)
                label(230, 126, "●  mit optionalem Aufbau: +6.600 €", 8, True, colors.HexColor("#B87625"))
                for month in [1, 4, 8, 12]:
                    label(left+(right-left)*(month-1)/11-3, 11, str(month), 7)
                def yval(v): return bottom+33+v*0.0043
                plot([(left+(right-left)*m/11, yval((m+1)*800)) for m in range(12)], TEAL)
                plot([(left+(right-left)*m/11, yval((m+1)*800-3000)) for m in range(12)], colors.HexColor("#B87625"))
            else:
                label(46, 126, "●  ohne Aufbau", 8, True, TEAL)
                label(230, 126, "●  mit optionalem Aufbau", 8, True, colors.HexColor("#B87625"))
                def yval(v): return bottom+33+v*0.0043
                xs = [left+34, right-35]
                plot([(xs[0], yval(9600)), (xs[1], yval(-1200))], TEAL)
                plot([(xs[0], yval(6600)), (xs[1], yval(-4200))], colors.HexColor("#B87625"))
                label(left+23, 11, "0,4 pp weniger Fälle", 8)
                label(right-120, 11, "0,2 pp weniger Fälle", 8)


def visual(kind):
    return Visual(kind)


pages = []
pages.append(page(1, "Ein Cent ist eine Frage an ein System.",
    "Was geschieht, wenn ein klar definierter Zahlungsdienst einen Cent pro Vorgang wert ist – und mehrere Beteiligte diesen Cent fair, nachvollziehbar und nützlich aufteilen?",
    visual("journey"),
    p("MICROVALUE ist ein <b>Vorschlag für einen neuen Vertrag und eine messbare Dienstleistung</b>. Die Idee verbindet transparente Kleinbeträge mit einem Test: Werden Fehler, Rückfragen oder Bearbeitungszeiten geringer? Wer zahlt den Cent? Wer erhält welchen Anteil? Was bleibt für Händler und Bürger besser als vorher?"),
    callout("<b>Die Entscheidung in einem Satz:</b> Einen begrenzten Pilot mit festgelegtem Preis, fünf Anteilen und Vorher/Nachher-Messung prüfen. Danach erst über Umfang, Fortführung und eine persönliche Einmalvergütung entscheiden."),
    p("Dieses Dossier führt Beobachtung, Modell und Angebot getrennt. Die veröffentlichten Abrechnungsbeispiele zeigen, dass unter einem Cent gerechnet oder bepreist werden kann. Sie zeigen noch keinen freien Geldbestand für diese Idee."),
    p("Juri Janovski · Gesprächsfassung · 17. Oktober 2026", "small")))

pages.append(page(2, "Von null bis hundert Prozent.",
    "Ein Euro hat 100 Cent. Ein Cent ist 0,01 €. In einer Rechnung kann ein Cent nochmals in kleinere Anteile zerlegt werden.",
    visual("split"),
    table([
        ["Anteil am einen Cent", "Prozent", "Betrag"],
        ["Erster Teil", "24 %", "0,0024 €"],
        ["Zweiter Teil", "24 %", "0,0024 €"],
        ["Dritter Teil", "24 %", "0,0024 €"],
        ["Vierter Teil", "24 %", "0,0024 €"],
        ["Letzter Teil", "4 %", "0,0004 €"],
        ["Zusammen", "100 %", "0,0100 €"],
    ]), Spacer(1, 15),
    p("Die vier Stellen nach dem Komma sind hier eine <b>Recheneinheit</b>. Für eine tatsächliche Euro-Zahlung müssen Vertrag, Sammelperiode, Rundung und Buchung feststehen. 0,0024 € je Vorgang werden beispielsweise nach 1.000 wirksam erfassten Vorgängen zu 2,40 €."),
    callout("<b>Juris Wahl:</b> ein 24-%-Anteil des vereinbarten Ein-Cent-Pools; falls dieser Platz anderweitig vergeben wird, der 4-%-Anteil. Beide Zahlen beziehen sich auf denselben erst zu vereinbarenden Cent.")))

pages.append(page(3, "Die echte Abrechnung: Eine Spur, kein Schatz.",
    "VR Payment rechnet in seiner FAQ eine girocard-Gebühr zunächst auf mehr als zwei Euro-Nachkommastellen aus.",
    visual("rounding"),
    callout("239 € Umsatz × 0,00209 % = 0,0049951 € rechnerischer Zwischenwert → nach Rundung 0,00 € Abrechnungsbetrag.", GOLD),
    Spacer(1, 14),
    p("Laut FAQ wird in diesem Beispiel bei einem gerundeten Ergebnis unter 0,01 € <b>keine Scheme Manager Fee erhoben</b>. Der Zwischenwert ist deshalb gerade kein Nachweis, dass sich die fehlenden Bruchteile irgendwo als auszahlbare Bankreserve sammeln."),
    p("Die wichtige Entdeckung ist ein <b>Gestaltungsraum</b>: Eine Regel kann bestimmen, ob sie vor oder nach Aggregation rundet, welcher Umsatz zählt und wie sie ihren Betrag ausweist. Ein neues Angebot braucht seine eigene Finanzierungs- und Abrechnungsregel."),
    source("VR Payment, FAQ zur Scheme Manager Fee, Fragen 5 bis 7", "vr-faq")))

pages.append(page(4, "Unter einem Cent ist real – aber nicht neu allein.",
    "Das Eurosystem bepreist TIPS-Instant-Zahlungen mit 0,002 € pro Auftrag. Die Gebühr wird je zur Hälfte auf sendenden und empfangenden Teilnehmer verteilt.",
    p("Das ist ein starkes Beispiel für den Mechanismus: Ein Preis unter einem Cent kann als vertraglich definierte Transaktionsgebühr existieren. Der relevante Unterschied für MICROVALUE wäre nicht die vierte Dezimalstelle selbst, sondern eine <b>neue Leistung, Verteilungsregel oder bessere Prüfbarkeit</b>."),
    table([
        ["System", "Was belegt ist", "Offene MICROVALUE-Frage"],
        ["VR Payment FAQ", "Subcent-Rechnung, Rundung", "Welche neue Leistung?"],
        ["TIPS", "0,002 € Entgelt je Auftrag", "Welche eigene Regel?"],
        ["MICROVALUE", "1 Cent als Modellpool", "Wer finanziert und spart?"],
    ]), Spacer(1, 15),
    p("TIPS, girocard-Händlerabrechnung und Juris Pilot sind verschiedene Produkte mit unterschiedlichen Beteiligten. Ein Preisbeispiel des einen Systems wird nicht automatisch zum Ertrag des anderen."),
    source("Europäische Zentralbank, What is TIPS?", "tips"),
    source("VR Payment, FAQ zur Scheme Manager Fee", "vr-faq")))

pages.append(page(5, "Woher käme der Cent überhaupt?",
    "Bevor irgendjemand einen Anteil erhält, muss der Vertrag die Geldquelle festlegen.",
    visual("funding"),
    p("<b>Weg A – neuer Servicepreis:</b> Ein Händler oder Geschäftspartner bezahlt für einen klaren zusätzlichen Dienst. Dann muss sein Nutzen höher sein als der zusätzliche Preis. Die Gebühr darf nicht als unsichtbarer Rest einer anderen Abrechnung ausgegeben werden."),
    p("<b>Weg B – Einsparung:</b> Ein Anbieter spart durch weniger Rückfragen, Buchungsfehler oder manuelle Korrekturen. Er kann einen Teil dieser nachgewiesenen Einsparung für das Projekt bereitstellen. Dazu braucht es eine belastbare Baseline."),
    p("<b>Weg C – Auftrag:</b> Ein Partner bezahlt Forschung, Software oder einen Audit-Prototyp direkt als feste Leistung. Das benötigt keinen Ein-Cent-Pool pro Zahlungsvorgang."),
    callout("<b>Der Buchungspfad muss sichtbar sein:</b> Zahler → Vertragsgrund → Abrechnungsperiode → Pool → 24/24/24/24/4-Verteilung → centgenaue Auszahlung. Jeder Pfeil benötigt eine definierte Regel.")))

pages.append(page(6, "Wieso sollte jemand mitmachen?",
    "Vier mögliche Gewinnseiten, vier Prüfgrößen. Keine davon wird durch die Formel allein erzeugt.",
    table([
        ["Beteiligter", "Möglicher Nutzen", "Zu messen"],
        ["Zahlungsanbieter", "Weniger Klärarbeit", "Fälle und Minuten"],
        ["Bank/Partner", "Gemeinsamer Dienst", "Nettoerlös und Risiko"],
        ["Händler", "Weniger Reibung", "Kosten und Ausfälle"],
        ["Bürger", "Zuverlässiger Ablauf", "Fehler und Beschwerden"],
    ]), Spacer(1, 16),
    p("Wenn die neue Gebühr an Händler weitergegeben wird, ist sie für Händler eine Belastung, bis ein größerer Vorteil belegt ist. Wenn Fehler nur zwischen Teams verschoben werden, ist der Systemgewinn null. Die Messung zählt deshalb <b>alle betroffenen Seiten</b>."),
    p("Ein guter Pilot liefert neben einem positiven Szenario auch den Punkt, an dem der Vorschlag für einen Partner teurer wird als der bisherige Prozess.")))

pages.append(page(7, "Ein Monat: woher kommt das Minus?",
    "Offen deklarierte Beispielwerte: 100.000 passende Vorgänge, ein Cent Pool je Vorgang, 0,4 Prozentpunkte weniger Klärfälle, sechs Minuten je vermiedenem Fall und 45 € Vollkosten pro Stunde.",
    visual("month"),
    table([
        ["Monatsrechnung", "Formel", "Ergebnis"],
        ["Vermiedene Fälle", "100.000 × 0,004", "400"],
        ["Zeitersparnis", "400 × 6 Minuten", "40 Stunden"],
        ["Kostenersparnis", "40 × 45 €", "1.800 €"],
        ["Ein-Cent-Pool", "100.000 × 0,01 €", "1.000 €"],
        ["Laufender Saldo", "1.800 − 1.000", "+800 €"],
        ["Optionaler Pilotaufbau", "Zusatzannahme, einmalig", "−3.000 €"],
        ["Nur mit diesem Aufbau", "+800 − 3.000", "−2.200 €"],
    ]), Spacer(1, 15),
    callout("<b>Juris 24 % in diesem Monat:</b> 240 € aus dem 1.000-€-Pool. Seine 4-%-Alternative: 40 €. Das ist Teil der Poolkosten, nicht zusätzliches neues Geld."),
    p("Das Minus entsteht ausschließlich, wenn zusätzlich 3.000 € für den Pilotaufbau anfallen. Ohne diesen Posten liegt der erste Monat im Beispiel bei +800 €. Sämtliche Eingabewerte sind Modellannahmen, keine gemessenen Unternehmensdaten.", "small")))

pages.append(page(8, "Ein Jahr: ab wann dreht es ins Plus?",
    "Nach Finanzierung des Cent-Pools bleiben im Beispiel +800 € pro Monat. Nur falls zusätzlich 3.000 € Aufbau anfallen, wird dieser Posten im vierten Monat aufgeholt.",
    visual("year"),
    table([
        ["Zeitpunkt", "Ohne Aufbauposten", "Mit optionalem 3.000-€-Aufbau"],
        ["Nach Monat 1", "+800 €", "−2.200 €"],
        ["Nach Monat 3", "+2.400 €", "−600 €"],
        ["Nach Monat 4", "+3.200 €", "+200 €"],
        ["Nach Monat 6", "+4.800 €", "+1.800 €"],
        ["Nach Monat 12", "+9.600 €", "+6.600 €"],
    ]), Spacer(1, 17),
    p("Die Jahresrechnung lautet zunächst <b>21.600 € vermiedene Arbeit − 12.000 € für 1,2 Millionen Ein-Cent-Pools = +9.600 €</b>. Nur mit der zusätzlichen Aufbauannahme bleiben +6.600 €. Der 12.000-€-Pool enthält 2.880 € für einen 24-%-Anteil oder 480 € für den 4-%-Anteil."),
    callout("<b>Der wirtschaftliche Hebel ist die vermiedene Arbeit.</b> Ohne sie würde die Teilung des Cents nur Geld zwischen Beteiligten umverteilen.")))

pages.append(page(9, "Der Gegentest: Was, wenn es kaum hilft?",
    "Halbiert sich der angenommene Effekt auf 0,2 Prozentpunkte weniger Klärfälle, spart das Beispiel nur 900 € im Monat.",
    visual("sensitivity"),
    table([
        ["Szenario, 12 Monate", "0,4 Prozentpunkte", "0,2 Prozentpunkte"],
        ["Vermiedene Kosten", "21.600 €", "10.800 €"],
        ["Cent-Pool", "12.000 €", "12.000 €"],
        ["Saldo ohne Aufbau", "+9.600 €", "−1.200 €"],
        ["Optionaler Aufbau", "−3.000 €", "−3.000 €"],
        ["Saldo mit Aufbau", "+6.600 €", "−4.200 €"],
    ]), Spacer(1, 15),
    p("Bei den gewählten 100.000 Vorgängen monatlich, sechs Minuten je Fall und 45 € je Stunde müsste die Fallquote über zwölf Monate um rund <b>0,278 Prozentpunkte</b> sinken, damit Pool und der optionale einmalige Aufbau gedeckt sind. Ohne Aufbau liegt die Schwelle bei rund 0,222 Prozentpunkten."),
    p("Wenn höhere Bearbeitungsqualität zusätzliche Kosten erzeugt, kommen sie ebenfalls in die Rechnung. Eine ehrliche Negativseite macht das Angebot für einen Entscheider prüfbar.")))

pages.append(page(10, "Was skaliert – und was nur groß aussieht.",
    "VR Payment nennt 1,27 Milliarden abgewickelte Transaktionen für 2025. Diese veröffentlichte Gesamtzahl ist eine Größenreferenz, kein zugesagter MICROVALUE-Scope.",
    table([
        ["Erfasster Anteil der Zahl", "Ein-Cent-Pool/Jahr", "24 % / 4 %"],
        ["1 % = 12,7 Mio. Vorgänge", "127.000 €", "30.480 € / 5.080 €"],
        ["100 % = 1,27 Mrd. Vorgänge", "12.700.000 €", "3.048.000 € / 508.000 €"],
    ]), Spacer(1, 17),
    p("100 % zeigen nur die rechnerische Oberkante auf dieser Zahl. Kartentypen, Vertragsbeziehungen, technische Zuständigkeit und beteiligte Institute können den tatsächlich geeigneten Bereich stark verkleinern. Die 2025er Zahl ist außerdem keine Prognose für spätere Jahre."),
    callout("<b>Die Größenfrage an VR Payment:</b> Welche abgegrenzte Vorgangsklasse könnte den Dienst überhaupt nutzen, wie viele Vorgänge wären das und welchen belegten Vorteil erzeugte jeder davon?"),
    source("VR Payment, Unternehmensangaben zum Jahr 2025", "vr-volume")))

pages.append(page(11, "Mein Anteil: 24 Prozent. Sonst vier.",
    "Ich biete einen konkret vereinbarten Forschungs-, Produkt-, Audit- oder Softwarebeitrag an. Im Ein-Cent-Modell bevorzuge ich einen der vier 24-%-Anteile; der 4-%-Rest ist meine zweite Verhandlungsoption.",
    p("Für einen klar abgegrenzten Vertrag können wir statt einer laufenden Mikroabrechnung auch <b>einen einmaligen Festbetrag</b> vereinbaren. Dann sind Leistungsgegenstand, Nutzungsrechte, Preis, Zahlungstermin und Fortführung für beide Seiten planbar."),
    p("Eine nominale Rechnung bis zum 67. Geburtstag kann als Preisanker dienen. Unter der extremen Annahme von 1,27 Milliarden erfassten Vorgängen in jedem ganzen Jahr, 0 % Wachstum, 100 % vertraglicher Erfassung und 35 vollen Jahren plus 107 Tagen ergäben 0,0024 € etwa <b>107,57 Millionen €</b>, 0,0004 € etwa <b>17,93 Millionen €</b>. Diese Rechnung beschreibt die Wirkung der Annahmen, nicht eine bereits eingerichtete Transaktionsquelle."),
    callout("<b>Die verhandelbare Frage:</b> Welche genau benannte Leistung ist dem Partner welchen einmaligen Preis wert – mit welchem Umfang, welchen Rechten und welcher Fälligkeit?"),
    source("VR Payment, 2025er Vorgangsvolumen als Rechenbasis", "vr-volume")))

pages.append(page(12, "Mehrere Parteien: Wer darf was?",
    "Ein Verbund kann den Dienst gemeinsam einkaufen oder betreiben. Das funktioniert nur, wenn Beiträge, Nutzen, Entscheidung und Risiko je Partei benannt sind.",
    p("Ein Zahlungsanbieter könnte die technische Abrechnung führen. Eine Bank könnte einen passenden Dienst beauftragen. Ein Händler könnte freiwillig einen Preis zahlen, wenn seine Gesamtkosten fallen. Ein Technologiepartner könnte den Audit-Trail entwickeln. Die vier 24-%-Plätze sind <b>noch keine Zuweisung an bestimmte Organisationen</b>; ihre Rollen und Leistungen wären verhandelbar."),
    p("Für jede Partei braucht der Vertrag mindestens: <b>Beitrag, Zahlung, Datenzugang, Nutzungsrecht, Haftung, Kündigung und Ausstieg</b>. Ein Partner kann auch nur die Pilotkosten tragen und auf eine Beteiligung am Cent verzichten."),
    callout("<b>Kooperation statt Zahlentrick:</b> Der Pool erzeugt keinen zusätzlichen Euro. Zusätzlicher Wert entsteht, wenn die gemeinsame Leistung nachweisbar Kosten vermeidet oder einen bewusst bezahlten Service liefert.")))

pages.append(page(13, "Liquidität schützen ist ein anderer Auftrag.",
    "Wenn einer Bank kurzfristig Liquidität fehlt, benötigt sie verfügbares Geld, rechtmäßige Finanzierung und Risikosteuerung – nicht nur eine neue Verteilungsformel.",
    p("Das Eurosystem bietet in TARGET bereits ein <b>zentrales Liquiditätsmanagement</b> über die Dienste. Die Bundesbank beschreibt außerdem eigene Systeme zum Schutz von Einlagen. MICROVALUE kann solche Strukturen nicht ersetzen. Es könnte höchstens einen eigenen, überprüfbaren Dienst für Abgleich, Fehlererkennung oder eine separat finanzierte Kooperation vorschlagen."),
    p("Der 4-%-Anteil wären im Beispiel mit 100.000 Vorgängen <b>40 € im Monat</b>; bei hypothetischer Erfassung aller 1,27 Milliarden VR-Payment-Vorgänge <b>508.000 € im Jahr</b>. Daran sieht man sofort, welche Größenordnung ein Cent-Modell leisten kann und welche es nicht leistet."),
    callout("<b>Prüfbare Fortsetzung:</b> Mit einem autorisierten Bankpartner einen konkreten Engpass auswählen, benötigte Liquidität beziffern und prüfen, ob eine bessere Daten- oder Abstimmungsleistung tatsächlich hilft."),
    source("EZB, gemeinsame TARGET-Funktionen und Liquiditätsmanagement", "target"),
    source("Deutsche Bundesbank, Einlagensicherung", "deposits")))

pages.append(page(14, "Der kleinste Test, der etwas entscheidet.",
    "Ein Pilot braucht echte Verantwortliche und einen engen Scope. Er soll nicht nur schöne Zahlen erzeugen, sondern zwischen Nutzen und bloßer Umverteilung unterscheiden.",
    table([
        ["Vor dem Pilot", "Im Pilot", "Nach dem Pilot"],
        ["Vorgangsklasse und Preisquelle", "Parallel zum bisherigen Weg", "Kosten je Vorgang"],
        ["Ausgangswert Klärfälle", "Fehler und Minuten erfassen", "Kontrollgruppe vergleichen"],
        ["Rechte und Datenzugang", "Rundung und Buchung prüfen", "Gewinn und Schaden zeigen"],
    ]), Spacer(1, 15),
    p("Ein synthetisches Rechenbeispiel kann zunächst die Pool-Regeln testen, ohne Kundendaten oder produktive Zahlungen anzufassen. Erst ein autorisierter Fachpartner kann mit geeigneten Daten beurteilen, ob der Dienst im realen Ablauf Wirkung hat."),
    callout("<b>Abbruchsignal:</b> keine definierte Geldquelle, schlechtere Händler- oder Bürgerwirkung, unklare Buchung oder ein negativer Nettoeffekt. <b>Fortsetzungssignal:</b> reproduzierbarer Vorteil bei benanntem Scope.")))

pages.append(page(15, "Die Bitte: eine Entscheidung über einen Test.",
    "Ich bitte nicht um Glauben an eine magische Nachkommastelle. Ich bitte um einen Termin, an dem wir einen Cent, einen Vorgang und einen wirtschaftlichen Nutzen präzise festlegen.",
    p("<b>VR Payment oder ein Zahlungsanbieter:</b> eine passende Vorgangsklasse, die heutige Abrechnungsregel und einen Produkt- oder Budgetkontakt benennen. <b>Eine Bank oder ein Verbund:</b> sagen, ob ein gemeinsamer Dienst mit klarer Kostenteilung interessant ist. <b>Fach- und Förderstellen:</b> den passenden technischen Prüf- oder Beauftragungsweg nennen."),
    p("Ich bringe die Modellfrage, die Rechenstruktur und einen prüfbaren Entwurf ein. Ein Partner bringt die Zuständigkeit und gegebenenfalls eine finanzierte Erprobung ein. Wir vereinbaren schriftlich, was getestet wird, wer was erhält und wie eine spätere Einmalvergütung gestaltet werden kann."),
    callout("<b>Eine Frage für das erste Gespräch:</b> Welcher konkrete Vorgang verursacht heute Kosten oder Reibung, die wir gemeinsam messbar verringern könnten?"),
    p("Öffentliches Modell: https://juri-halveth.github.io/halveth-scarlet/forschung/microvalue/", "small"),
    source("§ 311 BGB: Vertrag als rechtsgeschäftliches Schuldverhältnis", "contracts"),
    source("§ 31 UrhG: Nutzungsrechte an geschützten Werken", "copyright"),
    source("DPMA: Werk und bloße Idee unterscheiden", "ideas")))


def decorate(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 48, w, 48, fill=1, stroke=0)
    canvas.setFont("MV-Bold", 9)
    canvas.setFillColor(WHITE)
    canvas.drawString(45, h - 30, "HALVETH / MICROVALUE")
    canvas.setStrokeColor(LINE)
    canvas.line(45, 48, w - 45, 48)
    canvas.setFont("MV", 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(45, 33, "Juri Janovski  |  17.10.2026  |  Entscheidungsmodell")
    canvas.drawRightString(w - 45, 33, f"{doc.page} / 15")
    canvas.restoreState()


def main():
    doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=45, rightMargin=45,
                          topMargin=80, bottomMargin=66, title="HALVETH MICROVALUE – Ein Cent, fünf Anteile, ein prüfbarer Nutzen",
                          author="Juri Janovski")
    frame = Frame(45, 66, A4[0] - 90, A4[1] - 146, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates(PageTemplate(id="page", frames=[frame], onPage=decorate))
    story = []
    for i, content in enumerate(pages):
        if i:
            story.append(PageBreak())
        story.extend(content)
    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    main()
