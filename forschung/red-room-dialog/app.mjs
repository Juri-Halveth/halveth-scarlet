import { dialogueAt } from '../../assets/red-room-dialog-model.mjs';
import { frameAt } from '../../assets/red-room-swarm-model.mjs';

const $ = id => document.getElementById(id);
const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'de';
const words = {
  de: { top:'FIKTIVE GESPRÄCHSPROBE · IM BROWSER',titleA:'Die Spur bleibt.',titleB:'Wer hört wem zu?',intro:'Zwei erfundene Perspektiven betrachten denselben T±-Stand. Der Zuhörer trennt ihre Aussagen vom Modellbefund; der Brückenbauer hält freiwillige nächste Schritte offen.',model:'MODELLSTAND',blocked:'Träger blockiert',active:'Schattenlauf',time:'ZEITPUNKT',people:'FREIE PERSONEN',echoes:'WEB-ECHOS',copies:'AKTIVE KOPIEN',perspectiveA:'PERSPEKTIVE A',perspectiveB:'PERSPEKTIVE B',basis:'AUSSAGEGRUNDLAGE',listener:'ZERO / ZUHÖRER',sideBySide:'Was steht nebeneinander?',common:'Gemeinsamer Boden',distinction:'Entscheidende Trennung',observation:'Modellbeobachtung',open:'Offen',expression:'Ausdruck & Umgebung',bridge:'BRÜCKENBAUER',three:'Drei freiwillige Kanten',note:'Optionen sind keine Einigung. Keine Stimme wird stellvertretend als Zustimmung gewertet.',footer:'Alle Aussagen und Zahlen sind eigens geschriebene Fiktion. Diese Seite nimmt weder Ton noch Bild auf, analysiert keine echten Personen und sendet keine Daten. Der historische Schlichter-Entwurf ist hier eine Rollenreferenz; sein Programm wurde nicht integriert.',back:'← Zur T±-Schwarmkammer' },
  en: { top:'FICTIONAL DIALOGUE PROBE · IN BROWSER',titleA:'The trace remains.',titleB:'Who hears whom?',intro:'Two invented perspectives look at the same T± state. The listener separates their statements from model observations; the bridge builder keeps voluntary next steps open.',model:'MODEL STATE',blocked:'Carrier blocked',active:'Shadow run',time:'TIME',people:'FREE PEOPLE',echoes:'WEB ECHOES',copies:'ACTIVE COPIES',perspectiveA:'PERSPECTIVE A',perspectiveB:'PERSPECTIVE B',basis:'BASIS OF STATEMENT',listener:'ZERO / LISTENER',sideBySide:'What stands side by side?',common:'Common ground',distinction:'Decisive distinction',observation:'Model observation',open:'Open',expression:'Expression & surroundings',bridge:'BRIDGE BUILDER',three:'Three voluntary paths',note:'Options are not an agreement. No voice is treated as consent on another person’s behalf.',footer:'Every statement and number is authored fiction. This page records neither audio nor video, analyzes no real person and sends no data. The earlier Schlichter design is a role reference here; its software is not integrated.',back:'← Back to the T± swarm chamber' }
};
document.documentElement.lang = lang;
document.title = (lang === 'de' ? 'Red Room · Gesprächsprobe' : 'Red Room · Dialogue probe') + ' · HALVETH';
for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = words[lang][node.dataset.i18n];
document.querySelector('.language').setAttribute('aria-label', lang === 'de' ? 'Sprache' : 'Language');
$('dialogue-workspace').setAttribute('aria-label', lang === 'de' ? 'Fiktiver Gesprächsraum' : 'Fictional dialogue space');
$('scenario-group').setAttribute('aria-label', lang === 'de' ? 'Szenario' : 'Scenario');
for (const link of document.querySelectorAll('.language a')) link.setAttribute('aria-current', link.lang === lang ? 'page' : 'false');
for (const link of document.querySelectorAll('a[href="../red-room-swarm/"]')) link.href = `../red-room-swarm/?lang=${lang}`;
const buttons = [...document.querySelectorAll('[data-scenario]')];
let scenario = 'blocked';

function render() {
  const tick = Number($('tick').value);
  const dialogue = dialogueAt(scenario, tick, lang);
  const frame = frameAt(scenario, tick);
  $('tick-output').textContent = tick ? `T+${tick}` : 'T0';
  $('people').textContent = frame.people.free;
  $('echoes').textContent = frame.data.publicEchoes;
  $('copies').textContent = frame.runtime.activeCopies;
  for (const speaker of dialogue.speakers) {
    const suffix = speaker.id.toLowerCase();
    $(`role-${suffix}`).textContent = speaker.role;
    $(`statement-${suffix}`).textContent = `„${speaker.statement}“`;
    $(`evidence-${suffix}`).textContent = speaker.evidence;
  }
  for (const key of ['common', 'distinction', 'unresolved', 'expression']) $(key).textContent = dialogue.zero[key];
  $('observation').textContent = dialogue.zero.modelObservation;
  const list = $('bridges');
  list.replaceChildren(...dialogue.bridges.map(value => {
    const li = document.createElement('li');
    li.textContent = value;
    return li;
  }));
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.scenario === scenario));
}

for (const button of buttons) button.addEventListener('click', () => { scenario = button.dataset.scenario; render(); });
$('tick').addEventListener('input', render);
render();
