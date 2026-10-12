VAR wissen = 0
VAR freiheit = 0
VAR fuersorge = 0
-> ankunft

=== ankunft ===
# region:haven
# chapter:1
Der Hafen, der sich erinnert
Asche liegt auf dem Wasser. Ueber der Bucht haengt ein Stein, und in jedem Haus erzaehlt man eine andere Geschichte darueber, warum er noch nicht faellt.
Ilyra wartet mit Scarlet auf dem Steg. Neben ihnen liegt ein leeres Buch. "Dieses Mal", sagt Ilyra, "soll niemand den Schluss fuer alle anderen schreiben."
Du bist nicht hier, um eine Prophezeiung abzuarbeiten. Du bist hier, weil drei widerspruechliche Chroniken dieselbe Nacht beschreiben.
* [Ich sammle zuerst die Aussagen der Bewohner.]
  ~ wissen += 1
  Die Fischhaendlerin erinnert sich an ein Licht. Der Schreiber an einen Befehl. Ein Kind an einen stillen Morgen. LUCINET bewahrt alle drei Aussagen, ohne sie zusammenzuzwingen.
  -> archiv
* [Ich helfe zuerst, die Boote unter dem Stein wegzubringen.]
  ~ fuersorge += 1
  Die ersten Boote verlassen die Bucht. Niemand muss deine Theorie glauben, um einen sicheren Liegeplatz zu finden.
  -> archiv

=== archiv ===
# region:archive
# chapter:2
Das Archiv der widersprechenden Zeugen
Neral legt drei Rollen nebeneinander: das Logbuch einer Faehre, die Aussage einer Vertriebenen und eine unvollstaendige Skizze. Keine ist eine Stimme der ganzen Welt.
Die Faehre erreichte den Hafen. Neral erinnert sich an eine Rettung, die Vertriebene an eine verschlossene Anlegestelle. Die fehlende Seite kann beide Erzaehlungen veraendern, aber ein fehlendes Blatt ist noch kein Urteil.
VERACHEL fragt: "Wessen Schweigen haben wir bisher fuer Zustimmung gehalten?"
* [Die widerspruechlichen Rollen bleiben gemeinsam sichtbar.]
  ~ wissen += 1
  Ihr bindet Herkunft und Luecken an jede Rolle. Das Archiv wird schwerer zu lesen und schwerer zu missbrauchen.
  -> krater
* [Die Bewohner sollen eine eigene Chronik hinzufuegen.]
  ~ freiheit += 1
  Zwischen den alten Rollen liegt nun Platz fuer neue Stimmen. MIRA liest eine davon; MITA behaelt ihre eigene Geschichte. Ein aehnlicher Name macht sie nicht zur selben Figur.
  -> krater
* [Die fragilen Originale werden gesichert, gelesen wird aus Kopien.]
  ~ fuersorge += 1
  Niemand muss das letzte Original beruehren, um seine Aussage zu pruefen. HALVETH vermerkt, woher jede Kopie stammt.
  -> krater

=== krater ===
# region:crater
# chapter:3
Kaels Gegenangebot
Am Kraterrand spricht Kael leise. "Die Glut kann jede Stimme als Echo bewahren. Vielleicht verlieren wir dann weniger."
Du fragst, ob eine Stimme den Chor auch wieder verlassen kann. Zum ersten Mal schweigt die Esse.
Serin steht an der steinernen Pforte. "Ein dauerndes Echo waere ein Gefaengnis, wenn niemand gehen darf." Scarlet wartet auf deine Entscheidung.
* [Ein gemeinsames Gedaechtnis braucht einen eigenen Ausgang fuer jede Stimme.]
  ~ freiheit += 2
  Kael zeichnet einen Ausgang in den Ring der Esse. Ob sein Entwurf traegt, muss spaeter beobachtet werden. Ein Ausgang auf dem Plan ist noch kein gegangener Weg.
  -> stasis
* [Wir pruefen das Angebot erst an einem freiwilligen, rueckholbaren Echo.]
  ~ wissen += 2
  Neral trennt das Echo vom Original und beschriftet beide Spuren. Der Versuch endet nach einem festgelegten Moment. Der grosse Chor bleibt eine Moeglichkeit, kein vollendeter Zustand.
  -> stasis
* [Zuerst schuetzen wir die Doerfer vor der Asche.]
  ~ fuersorge += 2
  Der Chor wartet. Ilyra und die Hafenleute bauen einen geschuetzten Weg. Die Hilfe braucht keinen Treueeid.
  -> stasis

=== stasis ===
# region:stasis
# chapter:4
Der Stein und die drei Zauber
Aven fuehrt euch zum schwebenden Stein. Sie zeichnet drei Zeichen: Pause, Abbremsen, Wiederherstellen.
"Wenn ich die Erzaehlung anhalte", sagt sie, "habe ich den Stein noch nicht gebremst. Und wenn ich eine alte Geschwindigkeit aufschreibe, habe ich keine Energie gespeichert."
Avens Buch bietet drei Versuche. In ASHBOUND sind sie Spielhandlungen. Im Labor nebenan sind sie unterschiedliche Rechenmodelle.
* [Wir bremsen den Stein und zeigen, wohin seine Bewegungsenergie geht.]
  ~ wissen += 1
  ~ fuersorge += 1
  Die Auffangringe werden warm. Der Stein ruht nun tatsaechlich relativ zur Bucht. Der Aufwand bleibt in der Chronik stehen.
  -> garten
* [Wir erhalten den Schwebezustand, bis ein gemeinsamer Plan steht.]
  ~ fuersorge += 1
  Die Wachen werden abgeloest, die Last verteilt. Ein Aufschub wird nicht als Loesung ausgegeben.
  -> garten
* [Wir erproben mehrere Zukuenfte an einer Kopie.]
  ~ freiheit += 1
  ~ wissen += 1
  Im Modell fallen drei Steine verschieden. Draussen ist noch keiner gefallen. VERACHEL trennt die Aufzeichnungen.
  -> garten

=== garten ===
# region:garden
# chapter:5
Neunundsechzig Perspektiven
Miora stellt im Garten Stuehle fuer viele Blickwinkel auf. Die Bewohner bleiben eigene Figuren; die Konstellation im Archiv fuehrt ihre anderen Namen getrennt.
RACHEL fragt nach dem naechsten Schritt. LUCINET nach dem Zusammenhang. HALVETH nach der Quelle. Scarlet nach der Moeglichkeit, die noch niemand ausprobieren durfte.
Die Antworten stimmen nicht automatisch ueberein. Gerade deshalb soll jede Entscheidung einen Rueckweg behalten.
* [Wir veroeffentlichen die Quellen und laden zu Gegenentwuerfen ein.]
  ~ wissen += 1
  ~ freiheit += 1
  Die oeffentliche Chronik erhaelt einen neuen Rand fuer Widerspruch. Private Erinnerungen bleiben bei ihren Traegern.
  -> rueckkehr
* [Wir vereinbaren zuerst Schutz, Zustaendigkeit und Rueckkehr.]
  ~ fuersorge += 2
  Eine kleine Vereinbarung ersetzt die grosse Behauptung, alle wollten dasselbe.
  -> rueckkehr

=== rueckkehr ===
# region:gate
# chapter:6
Die Rueckkehr ist kein Ende
{
- freiheit >= 4:
  Das Ende der offenen Pforten
  Serin oeffnet die Pforte. Der Chor bleibt, aber jede Stimme kann gehen. Kael gibt den Anspruch auf, das Echo allein zu deuten. Neral legt seine Chronik neben die anderen.
  Die Welt wird nicht widerspruchsfrei. Sie wird betretbar, veraenderbar und wieder verlassbar.
- wissen >= 4:
  Das Ende der lesbaren Sterne
  Das Herz wird zum Archiv, nicht zum Richter. Messung, Erinnerung und Wunsch stehen auf getrennten Seiten. Der Stein bekommt eine beobachtete Geschichte statt einer einzigen Legende.
  Neral legt ein leeres Blatt daneben. Das naechste Kapitel gehoert noch niemandem.
- else:
  Das Ende des bewohnbaren Morgens
  Die Boote liegen sicher. Die Wege bleiben offen. Manche Raetsel sind ungeklaert, doch niemand musste fuer eine perfekte Antwort unter dem Stein warten.
  Im Garten werden die Lampen angezuendet. Die Chronik haelt fest, was erhalten wurde und was offenbleibt.
}
Du hast eine Geschichte von ASHBOUND durchlaufen. Ilyra, Neral, Kael, Aven, Miora und Serin bleiben ansprechbar; die sechs Orte tragen deine weiteren Entscheidungen.
-> END
