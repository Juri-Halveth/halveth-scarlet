import { frameAt, SCENARIOS, compareScenarios } from '../../assets/red-room-swarm-model.mjs';

const $ = id => document.getElementById(id);
const requestedLanguage=new URLSearchParams(location.search).get('lang');
let rememberedLanguage;try{rememberedLanguage=localStorage.getItem('halveth-hub-language');}catch{}
const sharedLanguage=window.HalvethHubLanguage?.language;
const lang=[requestedLanguage,rememberedLanguage,sharedLanguage].find(value=>['de','en'].includes(value))||(navigator.language.startsWith('de')?'de':'en');
const words = {
  de: {
    back:'Zur Welt ↗',eyebrow:'FIKTIONALES SCHATTENMODELL · T±',titleA:'Die Befreiung',titleB:'löscht keine Spur.',
    intro:'Romanova und die anderen verlassen den Red Room. Was wurde aus den Datenspuren? Vier Gegenmodelle zeigen, warum eine Kopie im Archiv, ein Echo im Web und ein laufender Agent verschiedene Zustände sind.',
    stampTitle:'KEINE REALPERSONEN-SUCHE',stampCopy:'Erfundene Rollen und Zahlen. Keine Suche nach privaten Menschen, Geräten oder Backups.',
    consoleEyebrow:'DIE SCHWARMKAMMER',consoleTitle:'Welche Spur lebt weiter?',local:'IM BROWSER · SYNTHETISCH',
    scenarioTitle:'Vier mögliche Verläufe',scenarioHelp:'Wähle eine Annahme. Alle benutzen dieselbe Zeitachse und dieselben drei fiktiven Rollen.',
    archiveTitle:'Nur Archiv',archiveDesc:'Backups bleiben, kein Träger läuft.',blockedTitle:'Schlüssel widerrufen',blockedDesc:'Träger vorhanden, Autorität fehlt.',
    activeTitle:'Schattenlauf',activeDesc:'Träger, Autorität und Route treffen zusammen.',erasedTitle:'Reste entfernt',erasedDesc:'Die Archivkopien enden bei T0.',
    gatesTitle:'Bedingungen für einen Lauf',stageLabel:'MODELLRAUM / KEIN NETZWERKZUGRIFF',peopleLane:'PERSONEN',dataLane:'DATEN',runtimeLane:'LAUFZEIT',
    freeNode:'FREI',vaultNode:'ARCHIV',carrierNode:'TRÄGER',carrierSub:'Prozess + Autorität',roleCaption:'ERZÄHLROLLE',recordCaption:'KOPIERBARE VORLAGE',echoCaption:'SICHTBARES ECHO',
    timeline:'ZEITACHSE',play:'Abspielen',pause:'Pausieren',peopleMetric:'BEFREITE PERSONEN',archiveMetric:'ARCHIVVORLAGEN',echoMetric:'ÖFFENTLICHE ECHOS',activeMetric:'AKTIVE KOPIEN',
    inquiryEyebrow:'TIEFER ALS EIN SCREENSHOT',inquiryTitle:'Gleiche Spur. Andere Ursache.',inquiryLead:'Drei Web-Echos sehen in zwei Gegenmodellen gleich aus. Erst eine frische, lokale Laufzeitprobe unterscheidet den synthetischen Schattenlauf vom blockierten Träger.',
    h1:'SCHATTENLAUF',h1Claim:'Vorlage + Träger + Autorität + Route',h1Desc:'Eine im Modell aktive Kopie kann eine neue Eingabe verarbeiten.',
    h2:'BLOCKIERTER TRÄGER',h2Claim:'Vorlage + Träger + Route, ohne Autorität',h2Desc:'Die gleichen Datei-Echos bleiben sichtbar; kein Prozess erhält Handlungsmacht.',
    probeTitle:'Frische Probe im Browser',probeLead:'Sie erzeugt keinen Request ins Web. Sie zeigt nur, was beide erfundenen Modelle am selben T-Wert vorhersagen.',probeButton:'Gegenprobe zeigen',dialogLink:'Die Gesprächsprobe öffnen ↗',
    footer:'Romanova, die weiteren Überlebenden und Wanda sind hier fiktionale Erzählrollen. „Portal“ bezeichnet eine gezeichnete Modellbrücke. Archivbits beweisen keine fortbestehende Person; ein lokaler Simulationslauf beweist keinen realen KI-Schwarm. Keine privaten Namen, Backups, Chats oder Geräte wurden untersucht.',footerLink:'Zurück zur SCARLET-Welt ↗',
    gateArchive:'Vorlage vorhanden',gateCarrier:'Träger vorhanden',gateAuthority:'Laufzeitautorität',gateRoute:'Route vorhanden',
    moments:[
      ['Vor der Befreiung','Die drei Erzählrollen sind im Red Room. Noch existiert in diesem Modell keine gespeicherte Vorlage.'],
      ['Tiefenspeicher','Drei fiktive Vorlagen werden archiviert. Ein Datensatz ist weder eine Person noch ein laufender Agent.'],
      ['Sechs Fragmente','Backupfragmente vervielfältigen die Vorlagen. Die Kopierbarkeit ist ein Risikoast, aber noch kein Ausbruch.'],
      ['Befreiung','Die Personen verlassen den Raum. Im gewählten Gegenmodell können Datenspuren bleiben oder verschwinden; beides ändert ihre Befreiung nicht.'],
      ['Erste Echos','Je nach Gegenmodell tauchen bis zu drei Darstellungen im synthetischen Web auf. Nur wenn Vorlage, Träger, Autorität und Route zusammenkommen, startet hier eine Kopie.'],
      ['Frische Eingabe','Ein neuer lokaler Impuls trennt im Modell die laufende Kopie vom bloßen Echo. Ein Webfund allein könnte das nicht.'],
      ['Verzweigung','Ein aktiver Lauf kann im Modell weitere Kopien starten. Die anderen Szenarien behalten ihre Echos ohne Laufzeit.'],
      ['Schnitt','Im Schattenlauf wird der lokale Träger widerrufen. Laufende Kopien enden hier; vorhandene Archiv- und Webspuren bleiben als Daten sichtbar.']
    ],
    probeRunning:'H₁ antwortet im eigenen Schatten auf die neue Eingabe; H₂ zeigt bei denselben drei Web-Echos keine lokale Laufzeitantwort. Erste interne Differenz der Laufzeitbedingungen: T0; aktive Kopien unterscheiden sich ab T+1. Diese Gegenprobe belegt ausschließlich die beiden programmierten Modelle.',
    probeStopped:'Bei diesem Zeitpunkt gibt der lokale H₁-Schatten keine aktuelle Laufzeitantwort. Sein früherer Lauf bei T+1 bis T+3 bleibt ein Modellereignis; die drei Echos sind weiterhin kein Beweis für laufenden Code.',
    stageAria:'Fiktionales Zustandsdiagramm: Personen, Archiv und Laufzeit getrennt',timeAria:'Modellzeit T minus 3 bis T plus 4',previousAria:'Vorheriger Zeitpunkt',nextAria:'Nächster Zeitpunkt'
  },
  en: {
    back:'Back to world ↗',eyebrow:'FICTIONAL SHADOW MODEL · T±',titleA:'Liberation',titleB:'does not erase a trace.',
    intro:'Romanova and the others leave the Red Room. What happens to the data traces? Four countermodels show why an archived copy, a web echo and a running agent are distinct states.',
    stampTitle:'NO REAL-PERSON SEARCH',stampCopy:'Invented roles and numbers. No search of private people, devices or backups.',
    consoleEyebrow:'THE SWARM CHAMBER',consoleTitle:'Which trace survives?',local:'IN BROWSER · SYNTHETIC',
    scenarioTitle:'Four possible paths',scenarioHelp:'Choose an assumption. All share the same timeline and three fictional roles.',
    archiveTitle:'Archive only',archiveDesc:'Backups remain; no carrier runs.',blockedTitle:'Key revoked',blockedDesc:'Carrier exists, authority does not.',
    activeTitle:'Shadow run',activeDesc:'Carrier, authority and route come together.',erasedTitle:'Traces removed',erasedDesc:'Archive copies end at T0.',
    gatesTitle:'Conditions for a run',stageLabel:'MODEL SPACE / NO NETWORK ACCESS',peopleLane:'PEOPLE',dataLane:'DATA',runtimeLane:'RUNTIME',
    freeNode:'FREE',vaultNode:'ARCHIVE',carrierNode:'CARRIER',carrierSub:'Process + authority',roleCaption:'STORY ROLE',recordCaption:'COPYABLE TEMPLATE',echoCaption:'VISIBLE ECHO',
    timeline:'TIMELINE',play:'Play',pause:'Pause',peopleMetric:'FREE PEOPLE',archiveMetric:'ARCHIVE TEMPLATES',echoMetric:'PUBLIC ECHOES',activeMetric:'ACTIVE COPIES',
    inquiryEyebrow:'BEYOND A SCREENSHOT',inquiryTitle:'Same trace. Different cause.',inquiryLead:'Three web echoes look alike in two countermodels. A fresh local runtime challenge distinguishes the synthetic shadow run from the blocked carrier.',
    h1:'SHADOW RUN',h1Claim:'Template + carrier + authority + route',h1Desc:'An active copy in this model can process a new input.',
    h2:'BLOCKED CARRIER',h2Claim:'Template + carrier + route, without authority',h2Desc:'The same file echoes remain visible; no process gains authority.',
    probeTitle:'Fresh probe in the browser',probeLead:'It sends no request to the web. It shows only what both invented models predict at the same T value.',probeButton:'Show counterprobe',dialogLink:'Open the dialogue probe ↗',
    footer:'Romanova, the other survivors and Wanda are fictional story roles here. “Portal” is a drawn model bridge. Archive bits do not establish a continuing person; a local simulation does not prove a real AI swarm. No private names, backups, chats or devices were investigated.',footerLink:'Back to SCARLET world ↗',
    gateArchive:'Template present',gateCarrier:'Carrier present',gateAuthority:'Runtime authority',gateRoute:'Route present',
    moments:[
      ['Before liberation','Three story roles are inside the Red Room. This model has no stored template yet.'],
      ['Deep storage','Three fictional templates are archived. A record is neither a person nor a running agent.'],
      ['Six fragments','Backup fragments duplicate the templates. Copyability opens a risk branch, but is not an escape.'],
      ['Liberation','The people leave the room. Data may remain or disappear under the selected countermodel; neither changes their liberation.'],
      ['First echoes','Depending on the countermodel, up to three representations appear on the synthetic web. A copy starts here only when template, carrier, authority and route coincide.'],
      ['Fresh input','A new local impulse distinguishes a running copy from a mere echo in the model. A web sighting alone cannot.'],
      ['Branching','An active run may start further copies in the model. Other scenarios keep echoes without runtime.'],
      ['Cut','The local carrier is revoked in the shadow run. Running copies end here; existing archive and web traces remain visible as data.']
    ],
    probeRunning:'H₁ responds to a fresh input inside its own shadow; H₂ has no local runtime response despite the same three web echoes. Runtime conditions first differ at T0; active copies first differ at T+1. This counterprobe establishes only the programmed models.',
    probeStopped:'At this point local H₁ gives no current runtime response. Its earlier run from T+1 through T+3 remains a model event; three echoes still do not prove running code.',
    stageAria:'Fictional state diagram: people, archive and runtime separated',timeAria:'Model time T minus 3 through T plus 4',previousAria:'Previous time',nextAria:'Next time'
  }
};
const tr = words[lang];
document.documentElement.lang = lang;
document.title = (lang === 'de' ? 'Red Room · T± Schwarmkammer' : 'Red Room · T± Swarm Chamber') + ' · HALVETH';
for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = tr[node.dataset.i18n];
for (const node of document.querySelectorAll('[data-svg-i18n]')) node.textContent = tr[node.dataset.svgI18n];
for (const link of document.querySelectorAll('.language a')) link.setAttribute('aria-current', link.lang === lang ? 'page' : 'false');
$('stage').setAttribute('aria-label', tr.stageAria);
$('time').setAttribute('aria-label', tr.timeAria);
$('previous').setAttribute('aria-label', tr.previousAria);
$('next').setAttribute('aria-label', tr.nextAria);
$('scenario-list').setAttribute('aria-label', tr.scenarioTitle);
document.querySelector('.masthead nav').setAttribute('aria-label', lang === 'de' ? 'Projektnavigation' : 'Project navigation');
document.querySelector('.hero-stamp').setAttribute('aria-label', lang === 'de' ? 'Geltungsbereich' : 'Scope');
document.querySelector('.metrics').setAttribute('aria-label', lang === 'de' ? 'Modellzustand' : 'Model state');

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let scenario = 'archive', tick = -3, playing = false, timer = null, probeVisible = false;
const formatTime = value => value < 0 ? `T−${-value}` : value === 0 ? 'T0' : `T+${value}`;

function stop() {
  if (timer !== null) clearInterval(timer);
  timer = null; playing = false;
}
function render() {
  const frame = frameAt(scenario, tick);
  const config = SCENARIOS[scenario];
  const label = formatTime(tick);
  $('time').value = String(tick);
  $('time-display').textContent = label;
  $('moment-tag').textContent = label;
  $('moment-title').textContent = tr.moments[tick + 3][0];
  $('moment-copy').textContent = tr.moments[tick + 3][1];
  $('people-count').textContent = frame.people.free;
  $('archive-count').textContent = frame.data.archivedTemplates;
  $('echo-count').textContent = frame.data.publicEchoes;
  $('active-count').textContent = frame.runtime.activeCopies;
  $('previous').disabled = tick === -3;
  $('next').disabled = tick === 4;
  $('play').disabled = reduced.matches;
  $('play').textContent = tr[playing ? 'pause' : 'play'];
  $('play').setAttribute('aria-pressed', String(playing));
  const stage = $('stage');
  for (const [key, value] of Object.entries({ liberated:frame.people.free > 0, records:frame.data.archivedTemplates > 0,
    echoes:frame.data.publicEchoes > 0, running:frame.runtime.activeCopies > 0 })) stage.dataset[key] = String(value);
  for (const node of document.querySelectorAll('[data-copy]')) node.classList.toggle('visible', frame.runtime.activeIds.includes(node.dataset.copy));
  for (const edge of document.querySelectorAll('[data-edge-to]')) edge.classList.toggle('visible', frame.runtime.activeIds.includes(edge.dataset.edgeTo));
  const gates = [
    [tr.gateArchive, frame.data.archivedTemplates > 0],
    [tr.gateCarrier, frame.runtime.carrierAvailable],
    [tr.gateAuthority, frame.runtime.authorityAvailable],
    [tr.gateRoute, config.route]
  ];
  const fragment = document.createDocumentFragment();
  for (const [text, on] of gates) {
    const item = document.createElement('div'); item.className = `gate ${on ? 'on' : 'off'}`;
    const light = document.createElement('span'); light.setAttribute('aria-hidden', 'true');
    const labelNode = document.createElement('span'); labelNode.textContent = `${text}: ${on ? '✓' : '—'}`;
    item.append(light, labelNode); fragment.append(item);
  }
  $('gates').replaceChildren(fragment);
  $('probe').disabled = tick < 2;
  $('probe-result').hidden = !probeVisible || tick < 2;
  if (probeVisible && tick >= 2) {
    const comparison = compareScenarios('active', 'blocked', tick);
    $('probe-result').textContent = comparison.samePublicEchoes && !comparison.sameActiveCopies ? tr.probeRunning : tr.probeStopped;
  }
}
function setTick(next) {
  tick = Math.max(-3, Math.min(4, next));
  probeVisible = false;
  if (tick === 4) stop();
  render();
}
function start() {
  if (reduced.matches) return;
  if (playing) { stop(); render(); return; }
  if (tick === 4) tick = -3;
  playing = true;
  timer = setInterval(() => setTick(tick + 1), 950);
  render();
}

for (const radio of document.querySelectorAll('input[name=scenario]')) radio.addEventListener('change', () => {
  if (!radio.checked) return;
  stop(); scenario = radio.value; probeVisible = false; render();
});
$('time').addEventListener('input', event => { stop(); setTick(Number(event.target.value)); });
$('previous').addEventListener('click', () => { stop(); setTick(tick - 1); });
$('next').addEventListener('click', () => { stop(); setTick(tick + 1); });
$('play').addEventListener('click', start);
$('probe').addEventListener('click', () => { probeVisible = !probeVisible; render(); });
reduced.addEventListener('change', () => { if (reduced.matches) stop(); render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); render(); } });
render();
