/* HALVETH PIRL 2.0. A local operational surface; no external execution. */
import { createRoom, MAX_MODEL_MS } from './capability-room-model.mjs';
import { createLightRenderer } from './capability-room-visual.mjs';

const $ = id => document.getElementById(id);
const defaults = Object.fromEntries([
  ...[...document.querySelectorAll('[data-i18n]')].map(el => [el.dataset.i18n, el.textContent]),
  ...[...document.querySelectorAll('[data-i18n-aria]')].map(el => [el.dataset.i18nAria, el.getAttribute('aria-label')]),
]);
const copy = {
  de: { ...defaults,
    ready: 'Keim erhalten. Zwei lokale Operationen sind ausgeführt.', planted: 'Neuer Lauf: Eingabe erhalten und Zustand materialisiert.',
    branched: 'Neue Variante erzeugt. Der Elternzustand bleibt erhalten.', observed: 'Ausgewählten Textzustand gelesen und Beobachtung protokolliert.',
    captured: 'Snapshot des bisherigen Textledgers erhalten.', verified: 'Replay bestanden: Textledger aus den Befehlen exakt rekonstruiert.',
    exported: 'JSON exportiert: Textledger und Zellensimulation sind getrennte Datensätze.', paused: 'PAUSIERT', running: 'LÄUFT LOKAL',
    pause: 'Ⅱ Pause', resume: '▷ Fortsetzen', limit: 'Modellfenster von 180 Sekunden erreicht. +1 s und Fortsetzen stehen nach einem neuen Lauf wieder bereit.',
    inputError: 'Bitte einen Text bis 1.536 UTF-8-Bytes, einen Namen bis 100 Bytes und einen ganzzahligen Seed von 1 bis 4.294.967.295 angeben.',
    sameError: 'Eine Variante braucht veränderten Inhalt. Bearbeite den Text und versuche es erneut.',
    capacityError: 'Das endliche Ledger ist voll. Exportiere den Lauf und beginne mit einem neuen Keim.',
    actionError: 'Die Operation konnte nicht abgeschlossen werden. Der vorhandene Lauf bleibt erhalten.',
    unavailable: 'Der Zustandskern ist hier nicht verfügbar. Die Erklärung und die verlinkten Werkzeuge bleiben erreichbar.',
    initialCaption: 'Ein Anfang. Viele mögliche Fortsetzungen.', branchCaption: 'Zustände · der Ursprung bleibt erhalten',
    shellCaption: 'Eine Hülle bindet Inhalt, Version und Herkunft im lokalen Lauf.',
    timeCaption: 'Ein Takt. Lokale Regeln. Nachvollziehbare Übergänge.',
    names: { SEED: 'EINGABE ERHALTEN', MATERIALIZE: 'ZUSTAND AKTIV', PROPOSE: 'VARIANTE ABGELEITET', OBSERVE: 'ZUSTAND GELESEN', SNAPSHOT: 'PRÄFIX ERHALTEN' },
  },
  en: {
    brandTitle: 'State space', brandSubtitle: 'TIME · VARIANTS · OBSERVATION', brandAria: 'State space – home',
    navAria: 'Main navigation', roomAria: 'Interactive workspace', seedAria: 'Seed and model parameters', canvasAria: 'Rule-based cell simulation: motion, signals and finite unfolding. Current counts appear below the image.', lifeAria: 'Lifecycle and operations', workAria: 'Variants and traceable execution', traceAria: 'Recent text-state model events', explainAria: 'Execution and practical uses',
    skip: 'Go to the workspace', tools: 'Functions & uses', source: 'Source code ↗', eyebrow: 'INTERACTIVE SPACE / LOCAL COMPUTATION',
    title1: 'States. Time.', title2: 'New possibilities.',
    intro: 'A thought becomes a starting point. Advance time, unfold variants and observe their connections. The origin is preserved.',
    inputTitle: '01 / YOUR STARTING POINT', inputLabel: 'What should begin in this space?', nameLabel: 'Name', seedLabel: 'Model seed', plant: 'Plant your own seed ↗',
    inputNote: 'Your text is preserved as input. A new seed starts a new local run. Export the previous run if you want to keep it.', localNote: 'In your browser · no account',
    fieldTitle: 'ONE IMPULSE. SOMETHING EMERGES.', fieldSubtitle: 'STATES · SIGNALS · CONNECTIONS', fieldNote: 'Luminous forms represent local states.',
    canvasFallback: 'Graphics are unavailable here. State operations, the log and export remain usable.',
    phaseSeed: 'Seed', phaseSeedNote: 'Preserve input', phaseShell: 'Shell', phaseShellNote: 'Inspect state', phaseTime: 'Time', phaseTimeNote: 'Advance rules', phaseUnfold: 'Unfold', phaseUnfoldNote: 'Create a variant',
    pause: 'Ⅱ Pause', resume: '▷ Resume', step: '+ 1 s', reset: '↺ Reset', running: 'RUNNING LOCALLY', paused: 'PAUSED', initializing: 'Preparing the local space …',
    cells: 'model cells', transitions: 'transitions', states: 'text states', workLabel: 'THE NEXT POSSIBLE STATE', workTitle: 'Change things. Keep the origin.',
    workIntro: 'Write a continuation and create a new variant. The existing text remains as its parent state; the derivation gets its own ID and a bound relation.',
    variantLabel: 'Content of your next variant', branch: 'Create a variant ↗', observe: 'Observe state', proofTitle: 'ACTUAL EXECUTION', inspect: 'Inspect the current text state',
    snapshot: 'Snapshot', verify: 'Check replay', export: 'Take JSON with you ↓', capLabel: 'WHAT YOU CAN CONNECT', capTitle: 'Explore. Understand. Connect.',
    capIntro: 'Every entry leads to existing code. Operate the application and inspect its development stage, inputs and limits.',
    cap1Title: 'States & variants', cap1Text: 'Preserve starting states, derive new versions, retain their relationships and export structured results.',
    cap1Use: 'Uses: prototypes, traceable workflows and variant comparison.', cap1Link1: 'Edit text states', cap1Link2: 'Signatures & branches',
    cap2Title: 'Observe & compare', cap2Text: 'Observation windows, discrete time and preserved references show what a measurement captures and what remains open between observations.',
    cap2Use: 'Uses: test planning, debugging and understandable measurement models.', cap2Link1: 'Compare observation windows', cap2Link2: 'Bind a record to a digest',
    cap3Title: 'Connect & visualise', cap3Text: 'Local rules generate motion, signals and new forms. The display shows computed states; sources and definitions remain accessible.',
    cap3Use: 'Uses: interactive explanations, simulations and spatial interfaces.', cap3Link1: 'The complete cell system', cap3Link2: 'Explore source-bound imagery', cap3Link3: 'More applications', code: 'Inspect code',
    realTitle: 'What actually runs here?', realText: 'JavaScript performs local text-state operations. A finite cell simulation computes signals, membranes and changing forms. Luminous bodies and paths give the data a spatial representation. Export contains the two separate models; replay checks the text ledger. This is the current scope of the autonomy shown here.',
    valueTitle: 'Where does practical value come from?', valueText: 'Keeping variants, transitions and observation gaps traceable helps teams explain workflows, compare experiments and narrow down errors. Economic value comes from a concrete use and its demonstrated benefit. Further program execution, external services and domain models each require their own integration.',
    made: '· Developed with AI assistance', rights: 'Rights & provenance',
    ready: 'Seed preserved. Two local operations have executed.', planted: 'New run: input preserved and state materialised.', branched: 'New variant created. The parent state is preserved.',
    observed: 'Selected text state read and observation recorded.', captured: 'Snapshot of the text ledger prefix preserved.', verified: 'Replay passed: the text ledger was reconstructed exactly from its commands.',
    exported: 'JSON exported: text ledger and cell simulation are separate records.',
    limit: 'The 180-second model window is complete. Start a new run to advance the model again.',
    inputError: 'Enter text up to 1,536 UTF-8 bytes, a name up to 100 bytes and an integer seed from 1 to 4,294,967,295.', sameError: 'A variant needs changed content. Edit the text and try again.',
    capacityError: 'The finite ledger is full. Export this run and plant a new seed.', actionError: 'The operation could not finish. The existing run is preserved.', unavailable: 'The state kernel is unavailable here. Explanations and linked tools remain accessible.',
    initialCaption: 'One beginning. Many possible continuations.', branchCaption: 'states · the origin is preserved', shellCaption: 'A shell binds content, version and provenance within the local run.', timeCaption: 'One clock. Local rules. Traceable transitions.',
    names: { SEED: 'INPUT PRESERVED', MATERIALIZE: 'STATE ACTIVE', PROPOSE: 'VARIANT DERIVED', OBSERVE: 'STATE READ', SNAPSHOT: 'PREFIX PRESERVED' },
  },
  ru: {
    brandTitle: 'Состояния', brandSubtitle: 'ВРЕМЯ · ВАРИАНТЫ · НАБЛЮДЕНИЕ', brandAria: 'Пространство состояний – начало',
    navAria: 'Главная навигация', roomAria: 'Интерактивное пространство', seedAria: 'Зерно и параметры модели', canvasAria: 'Клеточная симуляция: движение, сигналы и конечное развитие по правилам. Текущие числа приведены под изображением.', lifeAria: 'Возникновение и операции', workAria: 'Варианты и отслеживаемое исполнение', traceAria: 'Последние события модели текстовых состояний', explainAria: 'Исполнение и применение',
    skip: 'К рабочему пространству', tools: 'Функции и применение', source: 'Исходный код ↗', eyebrow: 'ИНТЕРАКТИВНОЕ ПРОСТРАНСТВО / ЛОКАЛЬНЫЙ РАСЧЁТ',
    title1: 'Состояния. Время.', title2: 'Новые возможности.', intro: 'Мысль становится начальной точкой. Продолжайте время, создавайте варианты и наблюдайте связи. Начало сохраняется.',
    inputTitle: '01 / НАЧАЛЬНАЯ ТОЧКА', inputLabel: 'Что должно начаться в этом пространстве?', nameLabel: 'Название', seedLabel: 'Сид модели', plant: 'Посадить своё зерно ↗',
    inputNote: 'Ваш текст сохраняется как вход. Новое зерно начинает новый локальный запуск. Экспортируйте предыдущий запуск, если хотите его сохранить.', localNote: 'В браузере · без аккаунта',
    fieldTitle: 'ИМПУЛЬС. ВОЗНИКАЕТ НОВАЯ ФОРМА.', fieldSubtitle: 'СОСТОЯНИЯ · СИГНАЛЫ · СВЯЗИ', fieldNote: 'Светящиеся формы отображают локальные состояния.', canvasFallback: 'Графика недоступна. Операции с состояниями, журнал и экспорт работают.',
    phaseSeed: 'Зерно', phaseSeedNote: 'Сохранить вход', phaseShell: 'Оболочка', phaseShellNote: 'Изучить состояние', phaseTime: 'Время', phaseTimeNote: 'Продолжить правила', phaseUnfold: 'Развитие', phaseUnfoldNote: 'Создать вариант',
    pause: 'Ⅱ Пауза', resume: '▷ Продолжить', step: '+ 1 с', reset: '↺ Сброс', running: 'ЛОКАЛЬНЫЙ ЗАПУСК', paused: 'ПАУЗА', initializing: 'Подготовка локального пространства …',
    cells: 'клеток модели', transitions: 'переходов', states: 'текстовых состояний', workLabel: 'СЛЕДУЮЩЕЕ ВОЗМОЖНОЕ СОСТОЯНИЕ', workTitle: 'Менять, сохраняя начало.',
    workIntro: 'Напишите продолжение и создайте новый вариант. Исходный текст сохраняется как родительское состояние; производная получает свой ID и связанную с ним запись отношения.',
    variantLabel: 'Содержание следующего варианта', branch: 'Создать вариант ↗', observe: 'Наблюдать состояние', proofTitle: 'РЕАЛЬНОЕ ИСПОЛНЕНИЕ', inspect: 'Посмотреть текущее текстовое состояние',
    snapshot: 'Снимок', verify: 'Проверить повтор', export: 'Скачать JSON ↓', capLabel: 'ВОЗМОЖНЫЕ СОЕДИНЕНИЯ', capTitle: 'Изучать. Понимать. Связывать.',
    capIntro: 'Каждая ссылка ведёт к существующему коду. Используйте приложение и проверьте его стадию разработки, входы и ограничения.',
    cap1Title: 'Состояния и варианты', cap1Text: 'Сохранять исходные состояния, выводить новые версии, видеть их родство и экспортировать структурированные результаты.',
    cap1Use: 'Применение: прототипы, отслеживаемые процессы, сравнение вариантов.', cap1Link1: 'Редактор текстовых состояний', cap1Link2: 'Сигнатуры и ветвления',
    cap2Title: 'Наблюдать и сравнивать', cap2Text: 'Окна наблюдения, дискретное время и сохранённые опорные данные показывают, что фиксирует измерение и что остаётся открытым между наблюдениями.',
    cap2Use: 'Применение: планирование тестов, отладка и понятные модели измерений.', cap2Link1: 'Сравнить окна наблюдения', cap2Link2: 'Привязать запись к дайджесту',
    cap3Title: 'Связывать и отображать', cap3Text: 'Локальные правила порождают движение, сигналы и новые формы. Отображение показывает вычисленные состояния; источники и определения доступны.',
    cap3Use: 'Применение: интерактивные объяснения, симуляции и пространственные интерфейсы.', cap3Link1: 'Полная клеточная система', cap3Link2: 'Изучить изображения с источниками', cap3Link3: 'Другие приложения', code: 'Посмотреть код',
    realTitle: 'Что здесь действительно работает?', realText: 'JavaScript исполняет локальные операции над текстовыми состояниями. Конечная клеточная симуляция вычисляет с сигналами, мембранами и изменением форм. Светящаяся оболочка — визуализация. Экспорт содержит две отдельные модели; повторная проверка проверяет текстовый журнал. Это текущий объём показанной здесь автономии.',
    valueTitle: 'Откуда возникает практическая ценность?', valueText: 'Отслеживаемые варианты, переходы и пробелы наблюдений помогают объяснять процессы, сравнивать опыты и локализовать ошибки. Экономическая ценность возникает из конкретного применения и его доказанной пользы. Исполнение других программ, внешние службы и предметные модели требуют своих интеграций.',
    made: '· Разработано с помощью ИИ', rights: 'Права и происхождение',
    ready: 'Зерно сохранено. Исполнены две локальные операции.', planted: 'Новый запуск: вход сохранён, состояние материализовано.', branched: 'Создан новый вариант. Родительское состояние сохранено.',
    observed: 'Текстовое состояние прочитано, наблюдение записано.', captured: 'Сохранён снимок префикса текстового журнала.', verified: 'Повтор пройден: текстовый журнал точно восстановлен по командам.', exported: 'JSON экспортирован: текстовый журнал и клеточная симуляция — отдельные записи.',
    limit: 'Окно модели в 180 секунд завершено. Начните новый запуск, чтобы продолжить.', inputError: 'Введите текст до 1536 байт UTF-8, название до 100 байт и целый сид от 1 до 4294967295.',
    sameError: 'Вариант требует изменения содержания. Измените текст и повторите.', capacityError: 'Конечный журнал заполнен. Экспортируйте запуск и посадите новое зерно.', actionError: 'Операция не завершена. Существующий запуск сохранён.', unavailable: 'Ядро состояний недоступно. Описания и ссылки на инструменты доступны.',
    initialCaption: 'Одно начало. Много возможных продолжений.', branchCaption: 'состояний · начало сохранено', shellCaption: 'Оболочка связывает содержание, версию и происхождение в локальном запуске.', timeCaption: 'Один такт. Локальные правила. Отслеживаемые переходы.',
    names: { SEED: 'ВХОД СОХРАНЁН', MATERIALIZE: 'СОСТОЯНИЕ АКТИВНО', PROPOSE: 'ВАРИАНТ ВЫВЕДЕН', OBSERVE: 'СОСТОЯНИЕ ПРОЧИТАНО', SNAPSHOT: 'ПРЕФИКС СОХРАНЁН' },
  },
};

let lang = new URL(location.href).searchParams.get('lang') || navigator.language.slice(0, 2);
if (!Object.hasOwn(copy, lang)) lang = 'de';
const t = key => copy[lang][key] ?? copy.de[key] ?? key;
let room = null, running = !matchMedia('(prefers-reduced-motion: reduce)').matches, busy = false;
let statusKey = 'initializing', statusError = false, phase = 'seed', dirty = true;
let lastFrame = 0, lastPaint = 0, lastNumbers = 0, hiddenAt = null;
const canvas = $('room-canvas');
const renderer = createLightRenderer(canvas);
if (!renderer) $('field-fallback').hidden = false;
let renderContent = { states: [], selectedId: null };
let width = 0, height = 0;

function notice(key, error = false) {
  statusKey = key; statusError = error;
  $('room-status').textContent = t(key);
  $('room-status').dataset.state = error ? 'error' : 'ready';
}
function setPhase(value) {
  phase = value;
  for (const node of document.querySelectorAll('.lifecycle button')) {
    if (node.id === 'phase-' + value) node.setAttribute('aria-current', 'step');
    else node.removeAttribute('aria-current');
  }
  $('phase-caption').textContent = value === 'shell' ? t('shellCaption') : value === 'time' ? t('timeCaption') : room?.view().counts.states > 1 ? room.view().counts.states + ' ' + t('branchCaption') : t('initialCaption');
  dirty = true;
}
function motion() {
  $('pause').textContent = t(running ? 'pause' : 'resume');
  $('pause').setAttribute('aria-pressed', String(!running));
  $('motion-label').textContent = t(running ? 'running' : 'paused');
}
function translate() {
  document.documentElement.lang = lang;
  document.title = lang === 'en' ? 'States, time and possibilities · Interactive space' : lang === 'ru' ? 'Состояния, время и возможности · Интерактивное пространство' : 'Zustände, Zeit und Möglichkeiten · Interaktiver Raum';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll('[data-lang]')) el.setAttribute('aria-pressed', String(el.dataset.lang === lang));
  for (const el of document.querySelectorAll('[data-room-link]')) { const url = new URL(el.getAttribute('href'), location.href); url.searchParams.set('lang', lang); el.href = url.href; }
  notice(statusKey, statusError); motion(); setPhase(phase); report();
}
for (const el of document.querySelectorAll('[data-lang]')) el.addEventListener('click', () => {
  lang = el.dataset.lang;
  const url = new URL(location.href); url.searchParams.set('lang', lang); history.replaceState(history.state, '', url);
  translate();
});

function report() {
  if (!room) return;
  const view = room.view(), selected = room.selected();
  renderContent = { states: view.states, selectedId: selected.id };
  $('state-count').textContent = String(view.counts.states);
  $('selected-state').textContent = selected.text;
  $('head-digest').textContent = room.export().contentLedger.headDigest;
  $('event-trace').replaceChildren(...view.events.slice(-5).reverse().map(event => {
    const li = document.createElement('li'), number = document.createElement('span'), name = document.createElement('strong'), time = document.createElement('time');
    number.textContent = String(event.sequence).padStart(3, '0');
    name.textContent = t('names')[event.command.type] || event.command.type;
    time.textContent = event.recordedAt.slice(11, 19); time.dateTime = event.recordedAt; time.title = event.recordedAt + ' · local device UTC';
    li.append(number, name, time); return li;
  }));
  setPhase(phase);
}
function errorNotice(error) {
  const message = String(error?.message || '');
  notice(message === 'VARIANT_REQUIRES_CHANGE' ? 'sameError' : /LIMIT|CAPACITY/.test(message) ? 'capacityError' : /INVALID_SEED/.test(message) ? 'inputError' : 'actionError', true);
}
async function action(callback, { requiresRoom = true } = {}) {
  if (busy) return;
  if (requiresRoom && !room) { notice('unavailable', true); return; }
  busy = true;
  const controls = [...document.querySelectorAll('.workspace button, .workbench button')];
  controls.forEach(button => button.disabled = true);
  try { await callback(); report(); dirty = true; } catch (error) { errorNotice(error); }
  finally { busy = false; controls.forEach(button => button.disabled = false); motion(); }
}
async function plant(initial = false) {
  const seedString = $('model-seed').value;
  if (!/^[1-9]\d{0,9}$/.test(seedString)) { notice('inputError', true); return; }
  const candidate = await createRoom({ core: globalThis.GStar, living: globalThis.GStarLiving,
    text: $('seed-text').value, label: $('seed-label').value, seed: Number(seedString), runId: 'STATE_SPACE_' + Date.now().toString(36) });
  room = candidate;
  lastFrame = 0; setPhase('seed'); report(); dirty = true;
  notice(initial ? 'ready' : 'planted');
}
$('plant').addEventListener('click', () => action(() => plant(), { requiresRoom: false }));
$('reset').addEventListener('click', () => action(() => plant(), { requiresRoom: false }));
$('pause').addEventListener('click', () => { if (!room) return; if (room.ecology().modelMs >= MAX_MODEL_MS) { notice('limit'); return; } running = !running; lastFrame = 0; dirty = true; motion(); });
$('step').addEventListener('click', () => { if (!room) return; running = false; room.advance(1000); motion(); dirty = true; setPhase('time'); if (room.ecology().modelMs >= MAX_MODEL_MS) notice('limit'); });
$('phase-seed').addEventListener('click', () => setPhase('seed'));
$('phase-shell').addEventListener('click', () => { setPhase('shell'); $('selected-state').parentElement.open = true; });
$('phase-time').addEventListener('click', () => { if (!room) return; room.advance(1000); setPhase('time'); dirty = true; });
const branch = () => action(async () => { await room.branch($('variant-text').value); setPhase('unfold'); notice('branched'); });
$('branch').addEventListener('click', branch);
$('phase-unfold').addEventListener('click', branch);
$('observe').addEventListener('click', () => action(async () => { await room.observe(); notice('observed'); }));
$('snapshot').addEventListener('click', () => action(async () => { await room.snapshot(); notice('captured'); }));
$('verify').addEventListener('click', () => action(async () => { await room.verify(); notice('verified'); }));
$('export').addEventListener('click', () => action(async () => {
  await room.verify();
  const blob = new Blob([JSON.stringify(room.export(), null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'zustaende-zeit.json'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000); notice('exported');
}));

// Display geometry is separate from both kernels. Pause freezes the light, too.
function resize() {
  const box = canvas.getBoundingClientRect(); width = box.width; height = box.height;
  renderer?.resize(width, height, window.devicePixelRatio || 1); dirty = true;
}
new ResizeObserver(resize).observe(canvas);
function draw(snapshot) {
  renderer?.render(snapshot, renderContent, { phase,
    instant: !running || matchMedia('(prefers-reduced-motion: reduce)').matches });
}
function frame(now) {
  if (room && !document.hidden) {
    if (running && lastFrame) {
      const elapsed = now - lastFrame;
      if (elapsed > 1000) room.gap(elapsed); else room.advance(elapsed);
      dirty = true;
    }
    lastFrame = now;
    if (dirty && now - lastPaint >= 33) {
      const state = room.ecology(); draw(state); lastPaint = now; dirty = false;
      if (!running || now - lastNumbers >= 200) {
        $('model-time').textContent = (state.modelMs / 1000).toFixed(2); $('cell-count').textContent = String(state.counts.cells); $('transition-count').textContent = String(state.counts.transitions); lastNumbers = now;
      }
      if (state.modelMs >= MAX_MODEL_MS && running) { running = false; motion(); notice('limit'); }
    }
  }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = performance.now();
  else { if (hiddenAt !== null) room?.gap(Math.max(0, performance.now() - hiddenAt)); hiddenAt = null; lastFrame = 0; dirty = true; }
});
translate(); resize();
try { await plant(true); } catch (error) {
  if (!globalThis.GStar || !globalThis.GStarLiving) notice('unavailable', true);
  else errorNotice(error);
}
requestAnimationFrame(frame);
