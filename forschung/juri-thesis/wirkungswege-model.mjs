// Model amounts are illustrative assumptions, never awards, invoices or measured effects.
export const cases = {
  initiator: {
    number: '01', title: 'Ein großer Plan',
    hook: 'Man nehme an: Für einen Initiator werden einmalig zwei Millionen Euro bewilligt. Er will in Brühl bleiben, lernen, Software entwickeln und mit anderen Arbeit schaffen.',
    before: 'Die Idee ist da. Wohnung, Mobilität, Lernzeit und Menschen für die Umsetzung fehlen. Jeder nächste Schritt kostet Kraft, bevor überhaupt etwas gebaut ist.',
    action: 'Ein bewilligter großer Rahmen schafft Planbarkeit. Der Initiator kann eine Wohnung suchen, Aufträge vergeben, ein Team bezahlen und Zeit zum Studieren und Entwickeln freimachen. Im Rechenbeispiel gehen genau eine Million Euro an Brühler Zahlungsempfänger.',
    open: 'Ein Arbeitsraum entsteht. Zwei Menschen arbeiten bezahlt an einem Prototyp, eine Renovierung beschäftigt Betriebe vor Ort. Der Initiator lebt weiter in Brühl und kann sein Vorhaben nach sechs Monaten vorführen. Das wäre ein möglicher Verlauf, kein bereits erzieltes Ergebnis.',
    friction: 'Eine Wohnung wird teuer oder nicht verfügbar, ein Prototyp scheitert, Aufträge verzögern sich. Die Person behält eine echte Lernchance; die nicht eingesetzten Mittel bleiben sichtbar. Ausgaben allein wären noch kein Projekterfolg.',
    human: 'Sicherheit beim Wohnen, freie Lernzeit und verlässliche Zusammenarbeit können den Alltag verändern. Für Familie und Team zählt auch, ob Verpflichtungen tragbar bleiben und Menschen fair bezahlt werden.',
    measure: 'Bewilligung und Auszahlungsplan; echte Rechnungen mit Ort des Leistungserbringers; bezahlte Arbeitsstunden; Prototyp und Nutzung; Lernnachweise; Vergleich mit dem Weg ohne Förderung. Den Kaufpreis eines bestehenden Hauses gesondert erfassen.',
    budget: 2000000,
    budgetNote: 'Vom Initiator vorgeschlagene Größenordnung; keine bewilligte Leistung.',
    lines: [
      {label:'Bestehende Wohnung / Kaufpreis in Brühl', amount:450000, local:true},
      {label:'Renovierung durch Brühler Betriebe', amount:150000, local:true},
      {label:'Auto / Mobilität bei Brühler Anbieter', amount:100000, local:true},
      {label:'Bezahltes Team / Dienste in Brühl', amount:200000, local:true},
      {label:'Lernen und Alltag in Brühl', amount:100000, local:true},
      {label:'Weitere Verwendung noch offen', amount:1000000, local:false, allocated:false}
    ],
    ledgerNote: 'Die ersten fünf Posten summieren sich auf 1 Mio. € Brühler Zahlungen. Wo zusätzliche lokale Wertschöpfung entsteht, muss separat ermittelt werden.'
  },
  mother: {
    number:'02', title:'Eine Mutter',
    hook:'Man nehme an: Eine alleinerziehende Mutter möchte eine Qualifizierung abschließen. Ihr Tag scheitert bisher an Betreuung, Miete und dem Weg dorthin.',
    before:'Morgens ist das Kind krank, die Betreuung fällt aus, und eine einzige verpasste Schicht gefährdet das Einkommen. Die Mutter plant nicht nur für sich, sondern für zwei Leben zugleich.',
    action:'Ein sechsmonatiger Modellrahmen bezahlt verlässliche Betreuung, eine stabile Wohnung, Fahrten und Lernmittel. Die Mutter entscheidet mit einer zuständigen Begleitung, welche Hilfe tatsächlich passt.',
    open:'Sie besucht die Qualifizierung regelmäßig. Das Kind hat verlässliche Bezugspersonen. Zu Hause wird ein Abend nicht mehr von der Frage beherrscht, wie morgen alles gleichzeitig gehen soll.',
    friction:'Eine Betreuungskraft fällt aus oder Arbeitszeiten passen nicht. Dann braucht die Familie eine echte Ersatzlösung statt einer Schuldzuweisung. Der Verlauf wird angepasst und der nicht genutzte Betrag bleibt nachvollziehbar.',
    human:'Mehr Zeit mit dem Kind kann gerade daraus entstehen, dass die Mutter nicht jede Stunde um das Überleben des Haushalts organisieren muss. Ihre eigene Zukunft bleibt dabei ein gleichwertiges Ziel.',
    measure:'Freiwillig berichtete Belastung; tatsächlich gesicherte Betreuungsstunden; Anwesenheit und Abschluss der Qualifizierung; stabile Wohnsituation; Arbeitsweg und Einkommen nach sechs Monaten.',
    budget:36000,budgetNote:'Fiktives Sechs-Monats-Budget für diese Modellperson.',
    lines:[{label:'Kinderbetreuung',amount:12000},{label:'Wohnen und Stabilität',amount:12000},{label:'Mobilität',amount:4000},{label:'Lernmittel / Qualifizierung',amount:4000},{label:'Flexibler Ersatz bei Ausfällen',amount:4000}],
    ledgerNote:'Die Beträge sind nur Bausteine der Simulation. Sie müssen für eine reale Familie bedarfsgerecht festgelegt werden.'
  },
  young: {
    number:'03', title:'Ein junger Mensch',
    hook:'Man nehme an: Ein 18-Jähriger ist wiederholt mit Regeln und Strafrecht in Konflikt geraten. Geld allein schreibt seine Geschichte nicht um. Ein anderer Alltag könnte es.',
    before:'Er wird oft zuerst über seine Akte gesehen. Zu Hause gibt es wenig Ruhe; Termine brechen ab, Freunde ziehen ihn in alte Routinen zurück. Seine Familie rechnet täglich mit dem nächsten Anruf.',
    action:'Ein sicherer Wohn- und Lernort, freiwillige Begleitung, bezahlte praktische Aufgaben und eine erreichbare Vertrauensperson geben ihm andere Entscheidungen im Alltag. Verbindliche Regeln und Unterstützung gelten zugleich.',
    open:'Er erscheint regelmäßig beim Projekt, übernimmt eine Aufgabe und kann Konflikte anders lösen. Seine Familie erlebt Wochen ohne neue Eskalation. Das ist eine denkbare Entwicklung, keine Behauptung über alle jungen Menschen mit Vorstrafen.',
    friction:'Er bricht Termine ab oder ein neuer Vorfall geschieht. Dann wird Unterstützung nicht einfach abgeschaltet: Schutz für Betroffene, rechtliche Folgen und eine neue, freiwillige Hilfeplanung werden getrennt bearbeitet.',
    human:'Jemand wird angesprochen, bevor die Akte für ihn spricht. Vertrauen entsteht über verlässliche Tage und echte Verantwortung; seine Familie wird nicht zum Beweisstück des Programms.',
    measure:'Einverständnis und Teilnahme; stabile Wohn- und Lernzeiten; selbst gewählte Ziele; dokumentierte Konfliktlösung; Schule, Ausbildung oder Arbeit nach sechs Monaten. Neue Vorfälle werden sachlich erfasst, ohne aus Einzelfällen eine Kriminalitätsquote zu erfinden.',
    budget:30000,budgetNote:'Fiktives Sechs-Monats-Budget für diese Modellperson.',
    lines:[{label:'Sicheres Wohnen',amount:9000},{label:'Lernen und praktische Aufgaben',amount:9000},{label:'Vertrauensperson / Begleitung',amount:6000},{label:'Mobilität',amount:3000},{label:'Freiwillige Familienarbeit',amount:3000}],
    ledgerNote:'Die Teilnahme ersetzt weder Rechte Betroffener noch das geltende Strafverfahren. Sie schafft einen zusätzlichen Weg.'
  },
  older: {
    number:'04', title:'Ein Mensch ab 50',
    hook:'Man nehme an: Nach Verlusten und falschen Entscheidungen fühlt sich eine Person mit 54 innerlich am Ende. Sie hat noch Wünsche, aber kaum noch einen Weg zu ihnen.',
    before:'Wohnung und Arbeit sind unsicher geworden. An manchen Tagen wirkt der nächste Monat unvorstellbar. Freunde melden sich seltener, Bewerbungen fühlen sich wie Urteile über das ganze Leben an.',
    action:'Ein verlässlicher Wohnrahmen, erreichbare professionelle Hilfe, Zeit für Gesundheit und eine selbst gewählte Weiterbildung werden gemeinsam geplant. Wenn akute Suizidgedanken auftreten, hat unmittelbare fachliche Unterstützung Vorrang; das Entwicklungsprogramm kann diese Hilfe begleiten.',
    open:'Die Person hat wieder einen Wochenrhythmus, trifft Menschen und probiert eine Tätigkeit aus. Nicht jeder Tag ist leicht. Aber sie kann wieder sagen, was sie im nächsten halben Jahr selbst versuchen möchte.',
    friction:'Eine Weiterbildung passt nicht oder Beschwerden bleiben. Der Plan wird neu verhandelt: andere Arbeit, mehr Behandlung oder erst stabile Tage. Ein verfehltes Lernziel ist kein verlorener Mensch.',
    human:'Für Angehörige kann ein verlässlicher Kontakt wichtiger sein als ein Zertifikat. Würde und Lebenszeit zählen auch dann, wenn aus dem Pilot kein neues Unternehmen entsteht.',
    measure:'Sicheres Wohnen; Zugang zu gewünschter fachlicher Versorgung; selbst gesetzte Ziele; Teilnahme und soziale Kontakte; Belastung aus Sicht der Person; konkrete Schritte nach sechs Monaten. Medizinische Verbesserungen nur mit passender fachlicher Messung behaupten.',
    budget:42000,budgetNote:'Fiktives Sechs-Monats-Budget für diese Modellperson.',
    lines:[{label:'Wohnen und Stabilität',amount:12000},{label:'Weiterbildung / Erprobung',amount:9000},{label:'Gesundheit und Begleitung',amount:9000},{label:'Schulden- und Alltagsberatung',amount:3000},{label:'Lebensunterhalt / soziale Teilhabe',amount:9000}],
    ledgerNote:'Ein Geldbetrag heilt keine Depression. Die Kombination aus Sicherheit, Zeit und gewählter Hilfe ist die zu prüfende Möglichkeit.'
  }
};

export function summarizeBudget(entry) {
  const allocatedLines = entry.lines.filter(line => line.allocated !== false);
  const allocated = allocatedLines.reduce((sum, line) => sum + line.amount, 0);
  const localPayments = allocatedLines.reduce((sum, line) => sum + (line.local ? line.amount : 0), 0);
  return {allocated, localPayments, unallocated: entry.budget - allocated};
}
