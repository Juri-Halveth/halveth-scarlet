// A deliberately local, fictional walkthrough. No personal input, storage or requests.
const labels = ['Start', 'Richtung', 'Vorlauf', 'Team', 'Ausgang', 'Einsicht', 'Nächste Runde'];
const paths = {
  lernen: { icon: '✦', title: 'Lernen & Wechsel', detail: 'Man kann neue Fähigkeiten erwerben oder einen anderen Beruf erkunden.', short: 'Lernweg' },
  gruenden: { icon: '◈', title: 'Idee & Gründung', detail: 'Man kann ein eigenes Vorhaben prüfen, ohne schon Erfolg versprechen zu müssen.', short: 'Vorhaben' },
  sorgen: { icon: '♡', title: 'Sorge & Neuorientierung', detail: 'Man braucht einen selbstbestimmten Abschnitt, um Arbeit, Sorge und Ziele neu zu ordnen.', short: 'Neuorientierung' }
};
const outcomes = {
  platz: { title: 'Ein Platz wird angeboten', text: 'Die fiktive Person erhält ein persönliches Angebot für eine sechsmonatige Phase. Vor einem echten Start müssten Finanzierung, Vertrag, Begleitung und Rückkehr konkret geklärt werden.' },
  warten: { title: 'Auf der Warteliste', text: 'Die fiktive Person erfüllt die veröffentlichten Kriterien. Die 30 Plätze dieser Runde sind bereits vergeben. Das Team erläutert den Stand und einen verlässlichen nächsten Termin.' },
  diesmal: { title: 'Diesmal kein Platz', text: 'Die fiktive Person bekommt eine eigene, nachvollziehbare Begründung bezogen auf die vorab veröffentlichten Kriterien. Die Entscheidung bewertet weder den Wert des Menschen noch seine künftigen Möglichkeiten.' }
};

const state = { step: 0, round: 1, path: null, outcome: null, publicExcerpt: false };
const byId = id => document.getElementById(id);
const stage = byId('stage');
const progress = byId('progress');
const back = byId('back');
const next = byId('next');

function pathButtons() {
  return Object.entries(paths).map(([id, path]) => `<button class="choice" type="button" data-path="${id}" aria-pressed="${state.path === id}"><span class="choice-icon" aria-hidden="true">${path.icon}</span><strong>${path.title}</strong><small>${path.detail}</small></button>`).join('');
}

function outcomeButtons() {
  return Object.entries(outcomes).map(([id, outcome]) => `<button class="choice" type="button" data-outcome="${id}" aria-pressed="${state.outcome === id}"><span class="choice-icon" aria-hidden="true">${id === 'platz' ? '✓' : id === 'warten' ? '◷' : '↗'}</span><strong>${outcome.title}</strong><small>Dieses Szenario selbst wählen und ansehen.</small></button>`).join('');
}

function content() {
  switch (state.step) {
    case 0: return `<span class="stage-label">01 / Ein Gedankenexperiment</span><h3>Man steht am Anfang einer möglichen Runde.</h3><p class="lead-text">Man nehme an, eine Stadt testet einen finanzierten Entwicklungszeit-Pilot. Es gibt 30 Plätze für diese Runde. Zwei Phasen à sechs Monate bleiben das größere Lebensmodell – diese Demo zeigt zunächst eine einzelne Bewerbung.</p><div class="fact-row"><span class="fact">freiwillig</span><span class="fact">sechs Monate Vorlauf</span><span class="fact">menschengeprüft</span><span class="fact">erneut bewerben möglich</span></div><p class="note">Alles hier ist fiktiv. Die Seite nimmt keine Bewerbung entgegen und prüft keine echte Eignung.</p>`;
    case 1: return `<span class="stage-label">02 / Eine Richtung</span><h3>Was kann man in dieser Zeit erkunden?</h3><p class="lead-text">Man wählt eine fiktive Richtung. Sie ist kein Persönlichkeitsurteil und kein Ranking. Eine reale Ausschreibung müsste Zielgruppe und Anforderungen zuvor festlegen.</p><div class="stage-grid">${pathButtons()}</div><p class="note">Alle drei Wege sollen auf Zugänglichkeit geprüft werden. Sorgearbeit oder ein Umweg im Lebenslauf dürfen nicht still als geringerer Menschenwert zählen.</p>`;
    case 2: return `<span class="stage-label">03 / Sechs Monate vorher</span><h3>Eine Bewerbung braucht Zeit und klare Regeln.</h3><p class="lead-text">Der gewählte ${paths[state.path].short} wird nur als Beispiel gezeigt. In einem echten Pilot wären Fristen, Ansprechstelle, barrierefreie Wege, erforderliche Angaben und Löschregeln vor dem Start bekannt.</p><div class="timeline"><div><b>−6 Monate</b><span>Runde und Kriterien bekanntgeben</span></div><div><b>−5 Monate</b><span>Bewerbung auf Wunsch einreichen</span></div><div><b>−3 Monate</b><span>Rückfragen &amp; menschliche Prüfung</span></div><div><b>Start</b><span>Angebot und Vertrag, falls ausgewählt</span></div></div><p class="note">Es gibt keine echten Fristen oder ein Bewerbungsformular auf dieser Seite. Eine neue Runde beginnt im Modell alle sechs Monate.</p>`;
    case 3: return `<span class="stage-label">04 / Das Prüfungsteam</span><h3>Talent sehen – ohne Menschen festzuschreiben.</h3><p class="lead-text">Ein vorgeschlagenes, bezahltes Team aus fachlicher Begleitung, Teilhabe- und Datenschutzkompetenz sowie unabhängiger Auswertung betrachtet die Bewerbung anhand veröffentlichter Kriterien. „Genie-Team“ ist hier eine Idee für gute Fragen, keine Behörde und keine verdeckte Ermittlung.</p><ul class="team-list"><li>Welche Entwicklung möchte die Person?</li><li>Welche Unterstützung wäre erforderlich?</li><li>Sind Zugang und Kriterien für alle gleich?</li><li>Gibt es Interessenkonflikte?</li><li>Was ist belegbar, was bleibt offen?</li><li>Wie wird eine Entscheidung erklärt?</li></ul><p class="note">Wenn Plätze knapp sind, braucht die zuständige Stelle vorab eine rechtlich geprüfte, transparente Auswahlregel. Die Demo berechnet weder Punktwerte noch einen Gewinner.</p>`;
    case 4: return `<span class="stage-label">05 / Drei mögliche Ausgänge</span><h3>Wie könnte die Rückmeldung aussehen?</h3><p class="lead-text">Man wählt ein Szenario und verändert damit nur die Erzählung dieser Demo – keine reale Auswahl.</p><div class="stage-grid">${outcomeButtons()}</div>${state.outcome ? `<div class="result-card"><h4>${outcomes[state.outcome].title}</h4><p>${outcomes[state.outcome].text}</p></div>` : ''}<p class="note">Die individuelle Rückmeldung geht an die betreffende Person. Die Öffentlichkeit erfährt nicht automatisch, wer sich beworben hat oder warum jemand nicht ausgewählt wurde.</p>`;
    case 5: return `<span class="stage-label">06 / Wer sieht was?</span><h3>Transparenz ohne gläserne Bewerber.</h3><p class="lead-text">Alle dürfen die Regeln und aggregierte Ergebnisse sehen. Eine Person bekommt ihre eigene Ausfertigung. Auf Anfrage könnte sie ein selbst redigiertes Portfolio gesondert freigeben. Die Demo zeigt nur einen kurzen fiktiven Auszug; niemand erhält pauschal alle fremden Akten.</p><div class="share-grid"><div class="share-card"><strong>Nur die Person</strong><small>Eigene Bewerbung, eigene Begründung und eigene Unterlagen.</small></div><div class="share-card public"><strong>Für alle</strong><small>Kriterien, Zahl der Bewerbungen und Plätze, aggregierte Auswertung.</small></div><div class="share-card"><strong>Nur mit gesonderter Freigabe</strong><small>Ein selbst gewählter Steckbrief oder ein geprüftes, redigiertes Portfolio.</small></div></div><button class="choice" type="button" data-share="toggle" aria-pressed="${state.publicExcerpt}"><strong>${state.publicExcerpt ? '✓ Freigabe im Beispiel gewählt' : 'Optionalen Beispiel-Steckbrief freigeben'}</strong><small>Das ist nur ein fiktiver Schalter. Er speichert oder veröffentlicht nichts.</small></button>${state.publicExcerpt ? `<blockquote class="quote"><small>Öffentliche Beispielansicht</small>„Ich möchte einen neuen Lernweg erkunden.“<br><small>Fiktiver, minimierter Selbstauszug · keine echte Person</small></blockquote>` : `<p class="note">Ohne Freigabe erscheint kein individueller Steckbrief. Auch bei ausgewählten Personen ist eine Veröffentlichung nicht automatisch erforderlich.</p>`}`;
    case 6: return `<span class="stage-label">07 / Die nächste Chance</span><h3>Eine Runde endet. Der Weg bleibt offen.</h3><p class="lead-text">Mit der nächsten Halbjahresrunde kann ein neuer Anlauf beginnen. Wer erneut mitmachen möchte, bewirbt sich bewusst neu. Eine frühere Absage ist kein Makel; Daten werden nicht still unbegrenzt übernommen.</p><div class="result-card"><h4>Runde ${state.round}: ${outcomes[state.outcome].title}</h4><p>Gewählte fiktive Richtung: ${paths[state.path].title}. Nächste Runde: erneut prüfen, ob das Angebot passt, und auf Wunsch neu bewerben. ${state.outcome === 'platz' ? 'Eine spätere zweite sechsmonatige Phase gehört zur langfristigen 2×6-These; der Pilot müsste Rückkehrende gesondert einplanen.' : 'Die erste persönliche Sechsmonatsphase ist in diesem Szenario noch nicht genutzt. Eine erneute Bewerbung ist deshalb kein zweiter Abschnitt.'}</p></div><button class="button solid" type="button" data-new-round>Neue Runde durchspielen ↗</button><p class="note">30 Plätze je Runde sind eine begrenzte Pilotannahme, kein Versprechen an alle Bewerbenden. Ein echter Start setzt Träger, Geld, Verfahren und zuständige Entscheidungen voraus.</p>`;
    default: return '';
  }
}

function render(focus = false) {
  progress.innerHTML = labels.map((label, i) => `<li class="${i === state.step ? 'active' : i < state.step ? 'done' : ''}" data-number="${i + 1}" ${i === state.step ? 'aria-current="step"' : ''}>${label}</li>`).join('');
  stage.innerHTML = content();
  byId('round-label').textContent = `Runde ${state.round} / Konzeptmodell`;
  byId('step-label').textContent = `${String(state.step + 1).padStart(2, '0')} / 07`;
  back.disabled = state.step === 0;
  next.hidden = state.step === 6;
  next.disabled = (state.step === 1 && !state.path) || (state.step === 4 && !state.outcome);
  if (focus) {
    const heading = stage.querySelector('h3');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}

stage.addEventListener('click', event => {
  const path = event.target.closest('[data-path]');
  const outcome = event.target.closest('[data-outcome]');
  const share = event.target.closest('[data-share]');
  const newRound = event.target.closest('[data-new-round]');
  if (path) { if (state.path !== path.dataset.path) { state.outcome = null; state.publicExcerpt = false; } state.path = path.dataset.path; render(); stage.querySelector(`[data-path="${state.path}"]`).focus({ preventScroll: true }); }
  if (outcome) { state.outcome = outcome.dataset.outcome; render(); stage.querySelector(`[data-outcome="${state.outcome}"]`).focus({ preventScroll: true }); }
  if (share) { state.publicExcerpt = !state.publicExcerpt; render(); stage.querySelector('[data-share]').focus({ preventScroll: true }); }
  if (newRound) { state.round += 1; state.step = 1; state.path = null; state.outcome = null; state.publicExcerpt = false; render(true); }
});
back.addEventListener('click', () => { if (state.step > 0) { state.step -= 1; render(true); } });
next.addEventListener('click', () => { if (!next.disabled && state.step < 6) { state.step += 1; render(true); } });
render();
