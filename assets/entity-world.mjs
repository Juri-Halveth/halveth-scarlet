import * as runtime from './entity-vendor/runtime.mjs';
import { createCharacterWorld } from './entity-world-scene.mjs';
import { orderedEntities, matchingEntities, neighbors, readMoments, appendMoment, TIMELINE_KEY, MOMENT_SCHEMA, MAX_MOMENTS, WORLD_DESTINATIONS } from './entity-world-model.mjs';

const $ = id => document.getElementById(id);
const entities = orderedEntities(window.HalvethUniverse.entities);
const ids = new Set(entities.map(e => e.id));
const lang = () => window.HalvethLanguage?.get() || 'de';
const t = (de, en) => lang() === 'en' ? en : de;
const field = (entity, key) => lang() === 'en' ? entity.en[key] : entity[key];
const icons = Object.fromEntries(Object.entries(runtime).filter(([key]) => !['THREE', 'OrbitControls', 'createIcons'].includes(key)));
runtime.createIcons({ icons, attrs: { width: 18, height: 18, 'stroke-width': 1.7 } });
let selected = ids.has(location.hash.slice(1)) ? location.hash.slice(1) : 'scarlet';
let mode = 'focus', scene;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;
let timeline;
try { timeline = readMoments(localStorage.getItem(TIMELINE_KEY), ids); }
catch { timeline = { moments: [], state: 'STORAGE_UNAVAILABLE' }; }
let moments = timeline.moments;
document.body.classList.add('world-enhanced');
$('profile-directory').hidden = true;
const status = text => { $('world-status').textContent = text; };

function renderSelection() {
  const entity = entities.find(item => item.id === selected);
  $('entity-name').textContent = entity.label;
  $('selection-name').textContent = entity.label;
  $('entity-number').textContent = `${String(entities.indexOf(entity) + 1).padStart(2, '0')} / ${entities.length}`;
  for (const [id, key] of [['entity-role', 'role'], ['entity-kind', 'kind'], ['entity-source', 'sourceLabel'], ['entity-note', 'note']]) $(id).textContent = field(entity, key);
  $('entity-profile').href = `${entity.id}/?lang=${lang()}`;
  const related = neighbors(entities, entity);
  $('entity-neighbors').replaceChildren(...related.map(item => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = item.label;
    button.addEventListener('click', () => select(item.id)); return button;
  }));
  if (!related.length) $('entity-neighbors').textContent = t('Weitere Zuordnungen offen.', 'Further connections are open.');
  document.title = `${entity.label} · ${t('Figurenraum', 'Character world')} · HALVETH`;
}
function select(id, announce = true) {
  if (!ids.has(id)) return;
  selected = id; scene?.select(id);
  const url = new URL(location.href); url.hash = id; history.replaceState(history.state, '', url);
  renderSelection();
  if (announce) status(t('Im Fokus: ', 'In focus: ') + entities.find(e => e.id === id).label);
}
function setMode(next) {
  mode = next; scene?.setMode(next);
  renderMode();
}
function renderMode() {
  $('mode-focus').setAttribute('aria-pressed', String(mode === 'focus'));
  $('mode-all').setAttribute('aria-pressed', String(mode === 'all'));
  $('mode-overview').setAttribute('aria-pressed', String(mode === 'overview'));
  document.body.dataset.worldMode = mode;
}
function updatePause() {
  scene?.pause(paused);
  $('world-pause').setAttribute('aria-pressed', String(paused));
  $('world-pause').setAttribute('aria-label', paused ? t('Bewegung fortsetzen', 'Resume motion') : t('Bewegung pausieren', 'Pause motion'));
  $('world-pause').title = $('world-pause').getAttribute('aria-label');
  $('world-pause').innerHTML = `<i data-lucide="${paused ? 'play' : 'pause'}" aria-hidden="true"></i>`;
  runtime.createIcons({ icons, attrs: { width: 18, height: 18 } });
}
function startScene() {
  scene?.dispose(); $('world-error').hidden = true; $('world-loading').hidden = false;
  try {
    scene = createCharacterWorld($('world-canvas'), entities, {
      paused,
      onSelect(id) { select(id); setMode('focus'); },
      onModeChange(next) { mode = next; renderMode(); },
      onClock(time) {
        const seconds = Math.floor(Math.abs(time));
        $('world-clock').textContent = `${time < 0 ? '-' : ''}${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      },
      onError(reason) { $('world-error').hidden = reason === 'CONTEXT_RESTORED'; }
    });
    scene.select(selected); scene.setMode(mode); $('world-loading').hidden = true;
  } catch (error) {
    console.warn('Character world renderer unavailable:', error.message);
    $('world-loading').hidden = true; $('world-error').hidden = false; $('world-canvas').dataset.state = 'UNAVAILABLE';
  }
}

function renderSearch() {
  const found = matchingEntities(entities, $('entity-search').value);
  $('entity-search-count').textContent = `${found.length} / ${entities.length}`;
  $('entity-search-results').replaceChildren(...found.map(entity => {
    const button = document.createElement('button'); button.type = 'button';
    const label = document.createElement('strong'); label.textContent = entity.label;
    const role = document.createElement('span'); role.textContent = field(entity, 'role');
    button.append(label, role); button.addEventListener('click', () => { select(entity.id); setMode('focus'); $('world-search').close(); });
    return button;
  }));
  if (!found.length) $('entity-search-results').textContent = t('Keine passende Figur.', 'No matching character.');
}
function renderTimeline() {
  $('moment-count').textContent = String(moments.length);
  $('moment-slider').max = String(Math.max(0, moments.length - 1));
  $('moment-slider').disabled = moments.length === 0;
  $('moment-export').disabled = moments.length === 0;
  if (!moments.length) $('moment-time').textContent = t('Noch keine gemerkten Momente.', 'No moments kept yet.');
  else {
    const moment = moments[Number($('moment-slider').value)] || moments.at(-1);
    const name = entities.find(e => e.id === moment.entityId).label;
    $('moment-time').textContent = `${name} · ${new Intl.DateTimeFormat(lang(), { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(moment.recordedAt))}`;
  }
}
function openDirectory(event) {
  event?.preventDefault(); $('profile-directory').hidden = !$('profile-directory').hidden;
  if (!$('profile-directory').hidden) $('profile-directory').scrollIntoView({ behavior: 'instant' });
}
$('world-search-open').addEventListener('click', () => { renderSearch(); $('world-search').showModal(); $('entity-search').focus(); });
$('world-search-close').addEventListener('click', () => $('world-search').close());
$('entity-search').addEventListener('input', renderSearch);
$('mode-focus').addEventListener('click', () => setMode('focus'));
$('mode-all').addEventListener('click', () => setMode('all'));
$('mode-overview').addEventListener('click', () => setMode('overview'));
function showInspector(open) {
  $('entity-inspector').hidden = !open;
  $('entity-info-toggle').setAttribute('aria-expanded', String(open));
}
$('entity-info-toggle').addEventListener('click', () => showInspector($('entity-inspector').hidden));
$('entity-info-close').addEventListener('click', () => showInspector(false));
function renderDestinations() {
  const value = $('world-destination').value;
  $('world-destination').replaceChildren(...WORLD_DESTINATIONS.map(place => {
    const option = document.createElement('option'); option.value = place.id; option.textContent = place[lang()]; return option;
  }));
  $('world-destination').value = value || 'commons';
}
$('world-destination').addEventListener('change', () => scene?.visit($('world-destination').value));
$('scene-back').addEventListener('click', () => scene?.seek(-30));
$('scene-forward').addEventListener('click', () => scene?.seek(30));
$('scene-speed').addEventListener('change', () => scene?.setRate(Number($('scene-speed').value)));
for (const [id, vector] of [['move-forward', [0,0,1]], ['move-back', [0,0,-1]], ['move-left', [-1,0,0]], ['move-right', [1,0,0]], ['move-up', [0,1,0]], ['move-down', [0,-1,0]]]) {
  const button = $(id);
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); scene?.hold(...vector); });
  const release = () => scene?.hold(0,0,0);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
  button.addEventListener('click', event => { if (event.detail === 0) scene?.move(...vector); });
}
$('world-pause').addEventListener('click', () => { paused = !paused; updatePause(); });
reduced.addEventListener('change', event => { paused = event.matches; updatePause(); });
for (const [id, method, value] of [['camera-left','rotate',-1],['camera-right','rotate',1],['camera-in','zoom',1],['camera-out','zoom',-1],['camera-reset','reset',0]]) $(id).addEventListener('click', () => scene?.[method](value));
for (const [id, delta] of [['entity-prev', -1], ['entity-next', 1]]) $(id).addEventListener('click', () => {
  const index = entities.findIndex(e => e.id === selected); select(entities[(index + delta + entities.length) % entities.length].id); setMode('focus');
});
$('directory-open').addEventListener('click', openDirectory);
$('world-fallback').addEventListener('click', () => { $('profile-directory').hidden = false; $('profile-directory').scrollIntoView(); });
$('world-retry').addEventListener('click', startScene);
$('time-toggle').addEventListener('click', () => {
  const open = $('world-timeline').hidden; $('world-timeline').hidden = !open; $('time-toggle').setAttribute('aria-expanded', String(open));
});
$('moment-save').addEventListener('click', () => {
  if (timeline.state === 'INVALID_PRESERVED') { status(t('Vorhandene Zeitspur ist ungültig und bleibt unverändert.', 'Existing timeline is invalid and is preserved unchanged.')); return; }
  moments = appendMoment(moments, selected, new Date().toISOString(), ids);
  let saved = true;
  try { localStorage.setItem(TIMELINE_KEY, JSON.stringify({ schema: MOMENT_SCHEMA, moments })); } catch { saved = false; }
  $('moment-slider').max = String(moments.length - 1); $('moment-slider').value = String(moments.length - 1); renderTimeline();
  status(saved ? t(`Moment lokal gemerkt. Die letzten ${MAX_MOMENTS} bleiben erhalten.`, `Moment kept locally. The most recent ${MAX_MOMENTS} are retained.`) : t('Moment nur für diese Sitzung gemerkt; Gerätespeicher nicht verfügbar.', 'Moment kept for this session only; device storage unavailable.'));
});
$('moment-slider').addEventListener('input', () => { const moment = moments[Number($('moment-slider').value)]; if (moment) { select(moment.entityId, false); renderTimeline(); } });
$('moment-export').addEventListener('click', () => {
  const payload = { schema: MOMENT_SCHEMA, timeSource: 'BROWSER_CLOCK', scope: 'USER_SAVED_BROWSER_SELECTIONS', moments };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'halveth-character-moments.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('halveth:language', () => { renderSelection(); renderTimeline(); renderSearch(); renderDestinations(); updatePause(); });
window.addEventListener('hashchange', () => { if (ids.has(location.hash.slice(1))) select(location.hash.slice(1)); });
renderSelection(); renderTimeline(); renderDestinations(); updatePause(); startScene();
