// Original ASHBOUND lore. The clue is part of the text; the reward is earned by reading it.
export const BOOKS = [
  {
    id: 'ilyra-embers', title: 'Ilyras Buch vom ersten Feuer', author: 'Ilyra · Hüterin der Glut', x: 5, z: 13,
    pages: [
      'Die erste Flamme wurde nicht gestohlen. Jemand teilte sie, und beide Hände blieben warm. Seitdem nennen die Alten Macht nicht Besitz, sondern die Fähigkeit, einen Weg zu öffnen, ohne den Menschen dahinter zu verlieren.',
      'Wer Impuls spricht, gibt der Glut eine Richtung. Wer Resonanz spricht, lässt die leise Schrift der Steine hörbar werden. Wer Stille spricht, verschafft der Welt einen Atemzug. Keine dieser Kräfte braucht ein Opfer.',
      'Meine geheime Formel lautet: Das erste Feuer bleibt, wenn es geteilt wird. Sprich sie dem Buch zurück. Dann trägt dein Inneres sechs statt einer Schalen Mana. Suche nicht nach einer Zahl im Stein; lies, was die Flamme getan hat.'
    ],
    question: 'Was tat die erste Flamme?',
    answers: ['Sie wurde geteilt und blieb erhalten.', 'Sie wurde vom Tor verschlungen.', 'Sie verbrannte den Weg.']
  },
  {
    id: 'neral-path', title: 'Nerals Atlas ohne Pfeile', author: 'Neral · Kartograf der Zwischenräume', x: -11, z: 7,
    pages: [
      'Ein Weg ist mehr als die Linie, die ein Kartograf auf Papier zieht. Der Schritt verändert den Ort, und der Ort verändert den nächsten Schritt. Darum ist eine Karte wahrheitsgemäß, wenn sie ihre Lücken zeigt.',
      'Ich maß die Halle dreimal. Einmal mit offenen Augen, einmal im Glimmen und einmal in Stille. Die Säulen standen jedes Mal am selben Ort; nur meine Richtung war eine andere. Der schnellste Pfad war kein geheimer Durchgang.',
      'Wer die Lücken lesen kann, trägt den Weg in den Füßen. Das Wort dafür steht nicht links und nicht rechts. Es liegt zwischen Beobachtung und Bewegung: erst sehen, dann gehen. Merke dir diese Reihenfolge.'
    ],
    question: 'Was kommt nach dem Beobachten?',
    answers: ['Warten, bis die Karte fertig ist.', 'Gehen und den nächsten Schritt neu sehen.', 'Die Säulen versetzen.']
  },
  {
    id: 'kael-hours', title: 'Kaels Uhrschrift', author: 'Kael · Schmied der Zeitringe', x: 11, z: -12,
    pages: [
      'Ein Ring hält den Augenblick nicht fest. Er lässt seine Bewegung für einen Moment schweigen. Die Stille ist begrenzt, damit das Morgen nicht im Gestern gefangen bleibt.',
      'Ich legte eine Zeitscherbe in die Halle. Ihr Licht schlägt nicht wie die anderen Siegel nach oben. Es ruht am Boden, beim Nordstein hinter der dritten Säule. Ein neugieriger Blick findet mehr als eine Questmarkierung.',
      'Die Scherbe verlängert die Stille, sobald sie getragen wird. Suche sie nicht am Tor und nicht in der ersten Glut. Folge der dritten Säule weiter nach Norden, bis der Stein in der Wand schweigt.'
    ],
    question: 'Wo ruht die Zeitscherbe?',
    answers: ['Im ersten Feuer.', 'Direkt am Aschentor.', 'Beim Nordstein hinter der dritten Säule.']
  }
];
