import { THREE as T, GLTFLoader } from '../vendor/runtime.mjs';
import { GAME_SAVE_KEY, SEALS, freshGame, loadGame, cast, progress, canCross, cross,
  maxMana, moveFactor, studyBook, findRelic } from './game-core.mjs';
import { BOOKS } from './books.mjs';
import { createEnvironment } from './environment.mjs';
import { createSpellVfx } from './spell-vfx.mjs';

const $ = id => document.getElementById(id);
const stage = $('stage'), overlay = $('start'), pause = $('pause'), ending = $('ending');
const touchDevice = matchMedia('(pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = new T.Clock();
let game = freshGame(), active = false, started = false, endingShown = false;
try { const raw = localStorage.getItem(GAME_SAVE_KEY); if (raw) game = loadGame(JSON.parse(raw)); } catch { /* A bad save leaves a fresh game playable. */ }

let renderer;
try {
  renderer = new T.WebGLRenderer({ antialias: !touchDevice, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, touchDevice ? 1.2 : 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.62;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.append(renderer.domElement);
} catch { $('fatal').hidden = false; throw new Error('ASHBOUND needs WebGL'); }

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(73, 1, 0.08, 600);
camera.rotation.order = 'YXZ';
scene.add(camera);
const eyeHeight = 1.73;
const player = { x: game.x, z: game.z, height: 0, velocityY: 0, bob: 0, yaw: 0, pitch: 0 };
const keys = new Set(), torches = [], seals = [];
const geo = [], mats = [];
const material = (color, extra = {}) => { const m = new T.MeshStandardMaterial({ color, roughness: .85, metalness: .05, ...extra }); mats.push(m); return m; };
const basalt = material(0x252f39), slate = material(0x39434c), edgeStone = material(0x5b6264);
const metal = material(0x796955, { metalness: .7, roughness: .3 });
const gold = material(0xe6b878, { metalness: .6, roughness: .25, emissive: 0x765016, emissiveIntensity: .25 });
const ember = material(0xd56f51, { emissive: 0x8f3824, emissiveIntensity: .85, roughness: .3 });
const cyan = material(0x72b9ad, { emissive: 0x247d70, emissiveIntensity: .9, roughness: .3 });
const blue = material(0x829bcf, { emissive: 0x3d5293, emissiveIntensity: .85, roughness: .3 });
const darkCore = material(0x34434d, { emissive: 0x10313a, emissiveIntensity: .35, metalness: .55, roughness: .22 });
const leather = material(0x765139, { roughness: .91 });
const parchment = material(0xd7c39a, { roughness: 1 });
const glove = material(0x25262e, { metalness: .28, roughness: .65 });
const focusMat = material(0x91e3d3, { emissive: 0x47c5ab, emissiveIntensity: 2.4, roughness: .15 });
const crystalMats = [ember, cyan, blue];
function put(g, m, x, y, z, parent = scene) {
  geo.push(g); const mesh = new T.Mesh(g, m); mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function box(w, h, d, m, x, y, z, parent) { return put(new T.BoxGeometry(w, h, d), m, x, y, z, parent); }
function cylinder(r1, r2, h, n, m, x, y, z, parent) { return put(new T.CylinderGeometry(r1, r2, h, n), m, x, y, z, parent); }
function orb(r, m, x, y, z, parent) { return put(new T.IcosahedronGeometry(r, 1), m, x, y, z, parent); }
// A small first-person spell focus gives each cast a visible origin in the world.
const focusRig = new T.Group(); focusRig.position.set(.73, -.66, -1.18); focusRig.scale.setScalar(.56); camera.add(focusRig);
const placeholderFocus = new T.Group(); focusRig.add(placeholderFocus);
const forearm = cylinder(.14, .19, .58, 9, glove, .16, -.24, .22, placeholderFocus); forearm.rotation.x = Math.PI * .32;
const cuff = cylinder(.2, .22, .13, 10, metal, .16, -.05, .03, placeholderFocus); cuff.rotation.x = Math.PI * .32;
orb(.21, glove, .07, .06, -.13, placeholderFocus);
for (let i = 0; i < 4; i++) {
  const finger = cylinder(.034, .052, .3, 6, glove, -.1 + i * .085, .035, -.32, placeholderFocus);
  finger.rotation.x = Math.PI * .39;
}
const focusCore = orb(.14, focusMat, .04, .12, -.42, focusRig);
const focusRing = put(new T.TorusGeometry(.24, .024, 7, 36), gold, .04, .12, -.42, focusRig);
focusRing.rotation.y = .35;
const handGlow = new T.PointLight(0x91e3d3, .6, 2.5, 2); handGlow.position.set(.04, .12, -.4); focusRig.add(handGlow);
new GLTFLoader().load(new URL('./assets/models/ornate_medieval_dagger/ornate_medieval_dagger_1k.gltf', import.meta.url).href,
  ({ scene: blade }) => {
    const bounds = new T.Box3().setFromObject(blade), size = bounds.getSize(new T.Vector3());
    if (size.y <= 0) return;
    const mount = new T.Group();
    blade.position.set(-(bounds.min.x + size.x / 2), -bounds.min.y, -(bounds.min.z + size.z / 2));
    blade.traverse(node => { if (node.isMesh) { node.castShadow = false; node.receiveShadow = true; } });
    mount.add(blade); mount.scale.setScalar(1.65 / size.y);
    mount.position.set(.05, -.62, -.2); mount.rotation.set(-.28, -.18, -.31);
    focusRig.add(mount); placeholderFocus.visible = false;
    document.body.dataset.focusAsset = 'ready';
  }, undefined, error => { console.warn('ASHBOUND spellblade unavailable', error); });
let handKick = 0;
function seeded() { let v = 0x41f1287; return () => ((v = Math.imul(v ^ v >>> 15, 2246822519) >>> 0) / 4294967296); }
const random = seeded();

const world = createEnvironment({ T, scene, renderer, touchDevice, random, put, material, geo, mats, torches });
const floorMat = world.groundMat;
const spellVfx = createSpellVfx({ T, scene, camera, reducedMotion });
const doorMat = new T.MeshBasicMaterial({ color: 0x83d7dd, transparent: true, opacity: .62, depthWrite: false, side: T.DoubleSide });
mats.push(doorMat);
const gate = put(new T.PlaneGeometry(5.4, 7), doorMat, 0, 3.5, -27.95);
const gateRing = put(new T.TorusGeometry(3.7, .14, 8, 64), gold, 0, 3.55, -27.9);
gateRing.scale.y = 1.06;
const gateLight = new T.PointLight(0x9de7e5, 12, 20, 2); gateLight.position.set(0, 4, -26); scene.add(gateLight);

function makeSeal(def, index) {
  const root = new T.Group(); root.position.set(def.x, 0, def.z); scene.add(root);
  cylinder(1.42, 1.66, .42, 16, world.masonry, 0, .2, 0, root);
  const crystal = put(new T.IcosahedronGeometry(.52, 2), darkCore, 0, 5.24, 0, root);
  crystal.rotation.z = .4;
  const halo = put(new T.TorusGeometry(.82, .035, 8, 64), crystalMats[index], 0, 5.24, 0, root);
  const glyph = put(new T.RingGeometry(1.45, 1.55, 48), crystalMats[index], 0, .08, 0, root);
  glyph.rotation.x = -Math.PI / 2; glyph.castShadow = false;
  const light = new T.PointLight(def.color, 2.8, 10, 2); light.position.set(0, 5.5, 0); root.add(light);
  const ward = index === 2 ? put(new T.TorusGeometry(1.45, .15, 10, 46), blue, 0, 5.22, 0, root) : null;
  if (ward) ward.rotation.x = .3;
  const info = { root, crystal, halo, glyph, light, ward, index };
  seals.push(info); return info;
}
SEALS.forEach(makeSeal);
const bookDisplays = BOOKS.map((book, index) => {
  const stand = new T.Group(); stand.position.set(book.x, 0, book.z); scene.add(stand);
  cylinder(.8, 1.1, 1.25, 6, basalt, 0, .6, 0, stand);
  const cover = box(1.04, .12, .78, leather, 0, 1.35, 0, stand); cover.rotation.y = index * .25 - .2;
  const pages = box(.9, .08, .66, parchment, 0, 1.43, 0, stand); pages.rotation.y = cover.rotation.y;
  box(.08, .13, .74, gold, -.48, 1.4, 0, stand).rotation.y = cover.rotation.y;
  const glow = new T.PointLight(0xf0c991, 1.4, 4, 2); glow.position.set(0, 1.8, 0); stand.add(glow);
  return { stand, glow };
});
const relicGroup = new T.Group(); relicGroup.position.set(11, 0, -20); scene.add(relicGroup);
cylinder(.7, .82, .7, 7, slate, 0, .35, 0, relicGroup);
const relicMesh = orb(.34, cyan, 0, 1.15, 0, relicGroup);
const relicHalo = put(new T.TorusGeometry(.55, .035, 7, 32), gold, 0, 1.15, 0, relicGroup);
const relicLight = new T.PointLight(0x9bfae3, 3, 6, 2); relicLight.position.set(0, 1.2, 0); relicGroup.add(relicLight);
relicGroup.visible = game.booksSolved[2] && !game.relicFound;

// A visible destination exists beyond the gate, so winning is a spatial crossing.
const beaconCore = world.beaconCore;
const moteField = world.moteField;

let aimed = null, lastMessage = 0, lastSave = 0, frames = 0, lastFrame = 0;
function aim() {
  const forward = camera.getWorldDirection(new T.Vector3());
  let best = null, bestAngle = Infinity;
  const candidates = [...SEALS.map(seal => ({ id: seal.id, x: seal.x, y: 5.2, z: seal.z })),
    { id: 'gate', x: 0, y: 3.5, z: -28 },
    ...BOOKS.map((book, index) => ({ id: `book-${index}`, x: book.x, y: 1.4, z: book.z })),
    ...(relicGroup.visible ? [{ id: 'relic', x: 11, y: 1.2, z: -20 }] : [])];
  for (const target of candidates) {
    const toward = new T.Vector3(target.x - camera.position.x, target.y - camera.position.y, target.z - camera.position.z);
    const distance = toward.length();
    if (distance > (target.id.startsWith('book-') || target.id === 'relic' ? 5 : 25) || distance < .5) continue;
    const angle = forward.angleTo(toward);
    if (angle < Math.max(.12, Math.atan2(2.2, distance)) && angle < bestAngle) { best = target.id; bestAngle = angle; }
  }
  return best;
}
function notice(message, keep = 4500) {
  $('message').textContent = message; $('message').classList.remove('quiet'); lastMessage = performance.now() + keep;
}
function persist() {
  game.x = +player.x.toFixed(2); game.z = +player.z.toFixed(2);
  try { localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(game)); } catch { /* Gameplay continues without storage. */ }
}
function updateHUD() {
  const count = progress(game); $('counter').textContent = `${count} / 3`;
  $('objective').textContent = game.completed ? 'Erkunde den Aschenpfad' : canCross(game) ? 'Durchquere das Aschentor' : 'Erwecke die drei Siegel';
  for (const info of seals) {
    const done = game.seals[info.index];
    info.crystal.material = done ? crystalMats[info.index] : darkCore;
    info.light.intensity = done ? 8 : info.index === 1 && !game.revealed ? .2 : 2.8;
    info.crystal.visible = info.index !== 1 || game.revealed;
    info.halo.visible = done || info.index !== 1 || game.revealed;
    info.glyph.visible = info.index !== 1 || game.revealed;
  }
  gate.visible = !canCross(game); gateLight.intensity = canCross(game) ? 4 : 12;
  relicGroup.visible = game.booksSolved[2] && !game.relicFound;
  updateManaUI();
  document.body.dataset.progress = String(count);
}
function updateManaUI() {
  const maximum = maxMana(game);
  $('mana-number').textContent = `${Math.floor(game.mana)} / ${maximum}`;
  $('mana-fill').style.width = `${Math.max(0, Math.min(100, game.mana / maximum * 100))}%`;
}
updateHUD();
function sound(frequency, length = .22) {
  try {
    const context = sound.context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state !== 'running') void context.resume();
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .53, context.currentTime + length);
    gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(.06, context.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + length);
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + length + .01);
  } catch { /* Sound is optional. */ }
}
function burst(target, color) {
  const point = target ? SEALS.find(seal => seal.id === target) : null;
  const to = point ? new T.Vector3(point.x, 5.2, point.z) : camera.position.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(10));
  spellVfx.pulse(to, color, performance.now());
}
function spell(kind) {
  if (!active) return;
  handKick = 1;
  const target = aim(); const outcome = cast(game, kind, target, performance.now());
  game = outcome.state; notice(outcome.message); updateHUD(); persist();
  sound(kind === 'pulse' ? outcome.ok ? 440 : 140 : kind === 'echo' ? 620 : 280, .3);
  if (kind === 'pulse') burst(target, outcome.ok ? 0xffa86a : 0xb5c9d2);
  if (kind === 'echo') {
    if (outcome.ok) spellVfx.echo(camera.position, performance.now());
    for (const info of seals) info.halo.scale.setScalar(1.5);
  }
  if (kind === 'still' && outcome.ok) spellVfx.still(camera.position, performance.now(), game.wardUntil);
  if (outcome.ok && canCross(game)) notice('Ilyra: Das Tor antwortet. Geh hindurch.', 7000);
}
let openBookIndex = -1, bookPage = 0;
function showBookPage() {
  const book = BOOKS[openBookIndex];
  $('book-title').textContent = book.title;
  $('book-author').textContent = book.author;
  $('book-number').textContent = `SEITE 0${bookPage + 1} / 03`;
  $('book-text').textContent = book.pages[bookPage] + (bookPage === 2 && game.booksSolved[openBookIndex] ? '\n\n✦ Diese Erkenntnis gehört jetzt zu dir.' : '');
  $('book-prev').disabled = bookPage === 0;
  $('book-next').disabled = bookPage === 2;
  $('book-question').hidden = bookPage !== 2 || game.booksSolved[openBookIndex];
  $('book-prompt').textContent = book.question;
  $('book-answers').replaceChildren();
  if (bookPage === 2 && !game.booksSolved[openBookIndex]) book.answers.forEach((answer, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = answer;
    button.addEventListener('click', () => {
      const result = studyBook(game, openBookIndex, index);
      if (result.ok) { game = result.state; persist(); updateHUD(); showBookPage(); sound(720, .55); }
      else $('book-prompt').textContent = result.message;
      notice(result.message, 6000);
    });
    $('book-answers').append(button);
  });
  if (!reducedMotion) document.querySelector('.book-page').animate([
    { opacity: .75, transform: 'rotateY(-3deg) translateX(9px)' },
    { opacity: 1, transform: 'rotateY(0deg) translateX(0)' },
  ], { duration: 240, easing: 'ease-out' });
}
function openBook(index) {
  if (!active) return;
  openBookIndex = index; bookPage = 0; active = false;
  $('book').hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
  showBookPage();
}
function resumeFromPanel() {
  $('book').hidden = true; $('inventory').hidden = true; openBookIndex = -1;
  if (!started || endingShown) return;
  active = true;
  if (!touchDevice) renderer.domElement.requestPointerLock?.().catch(() => {});
}
$('book-prev').addEventListener('click', () => { if (bookPage > 0) { bookPage--; showBookPage(); sound(320, .1); } });
$('book-next').addEventListener('click', () => { if (bookPage < 2) { bookPage++; showBookPage(); sound(370, .1); } });
$('book-close').addEventListener('click', resumeFromPanel);
function showInventory() {
  if (!started || endingShown) return;
  active = false; $('inventory').hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
  const lines = [
    ['Manareserve', `${maxMana(game)} · ${game.booksSolved[0] ? 'Ilyras Feuer +500 %' : 'ursprüngliche Kraft'}`],
    ['Bewegung', `${Math.round(moveFactor(game) * 100)} % · ${game.booksSolved[1] ? 'Nerals Wegzeichen' : 'ursprünglicher Schritt'}`],
    ['Zeitscherbe', game.relicFound ? 'getragen · Stille 12 Sekunden' : game.booksSolved[2] ? 'in der Halle verborgen' : 'noch nicht entdeckt'],
    ['Gelesene Schriften', `${game.booksSolved.filter(Boolean).length} / ${BOOKS.length}`],
  ];
  $('inventory-list').replaceChildren(...lines.map(([name, value]) => {
    const row = document.createElement('article'), label = document.createElement('strong'), detail = document.createElement('span');
    label.textContent = name; detail.textContent = value; row.append(label, detail); return row;
  }));
}
$('inventory-button').addEventListener('click', showInventory);
$('inventory-close').addEventListener('click', resumeFromPanel);
function nearbyInteraction() {
  if (relicGroup.visible && Math.hypot(player.x - 11, player.z + 20) < 2.8) return { kind: 'relic' };
  const index = BOOKS.findIndex(book => Math.hypot(player.x - book.x, player.z - book.z) < 3.4);
  if (index >= 0) return { kind: 'book', index };
  if (Math.hypot(player.x, player.z + 28) < 6.5) return { kind: 'gate' };
  return null;
}
function interact() {
  if (!active) return;
  const item = nearbyInteraction();
  if (item?.kind === 'book') { openBook(item.index); return; }
  if (item?.kind === 'relic') {
    const result = findRelic(game); game = result.state; updateHUD(); persist();
    notice(result.message, 6000); sound(820, .6); return;
  }
  if (item?.kind === 'gate') notice(canCross(game) ? 'Der Weg ist offen. Geh durch das Tor.' : 'Die Pforte wartet auf drei Siegel.');
}
$('interact').addEventListener('click', interact);
function enterWorld() {
  started = true; active = true; overlay.hidden = true; pause.hidden = true; ending.hidden = true;
  if (!touchDevice) renderer.domElement.requestPointerLock?.().catch(() => {});
  sound(240, .5);
}
function pauseWorld() {
  if (!started || endingShown) return;
  active = false; pause.hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
  persist();
}
$('start-button').addEventListener('click', enterWorld);
$('resume-button').addEventListener('click', enterWorld);
$('menu-button').addEventListener('click', pauseWorld);
$('reset-button').addEventListener('click', () => {
  game = freshGame(); Object.assign(player, { x: 0, z: 17, height: 0, velocityY: 0, yaw: 0, pitch: 0 });
  endingShown = false; updateHUD(); persist(); enterWorld(); notice('Ilyra: Die Asche erinnert sich. Folge dem Licht.');
});
$('continue-button').addEventListener('click', () => { ending.hidden = true; endingShown = false; active = true; if (!touchDevice) renderer.domElement.requestPointerLock?.().catch(() => {}); });
document.querySelectorAll('[data-spell]').forEach(button => button.addEventListener('click', () => spell(button.dataset.spell)));
document.addEventListener('pointerlockchange', () => { if (!touchDevice && !document.pointerLockElement && active) pauseWorld(); });
document.addEventListener('mousemove', event => {
  if (!active || document.pointerLockElement !== renderer.domElement) return;
  player.yaw -= event.movementX * .0022;
  player.pitch = T.MathUtils.clamp(player.pitch - event.movementY * .0022, -1.3, 1.3);
});
document.addEventListener('keydown', event => {
  if (['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'Escape') {
    if (!$('book').hidden || !$('inventory').hidden) resumeFromPanel();
    else if (active) pauseWorld();
    else if (started && !endingShown) enterWorld();
  }
  if (event.code === 'Digit1') spell('pulse');
  if (event.code === 'Digit2') spell('echo');
  if (event.code === 'Digit3') spell('still');
  if (event.code === 'Tab') { if (active) showInventory(); else if (!$('inventory').hidden) resumeFromPanel(); }
  if (event.code === 'KeyJ') player.yaw += .16;
  if (event.code === 'KeyL') player.yaw -= .16;
  if (event.code === 'KeyI') player.pitch = T.MathUtils.clamp(player.pitch + .12, -1.3, 1.3);
  if (event.code === 'KeyK') player.pitch = T.MathUtils.clamp(player.pitch - .12, -1.3, 1.3);
  if (event.code === 'KeyE') interact();
});
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); if (active) pauseWorld(); });
renderer.domElement.addEventListener('click', () => { if (active && !touchDevice) spell('pulse'); });
let lookTouch = null, stickTouch = null, stickX = 0, stickY = 0;
if (touchDevice) {
  $('touch').hidden = false;
  const stick = $('stick'), knob = stick.firstElementChild;
  stick.addEventListener('pointerdown', event => { stickTouch = event.pointerId; stick.setPointerCapture(event.pointerId); event.preventDefault(); });
  stick.addEventListener('pointermove', event => {
    if (event.pointerId !== stickTouch) return;
    const rect = stick.getBoundingClientRect();
    stickX = T.MathUtils.clamp((event.clientX - rect.left - rect.width / 2) / (rect.width / 2), -1, 1);
    stickY = T.MathUtils.clamp((event.clientY - rect.top - rect.height / 2) / (rect.height / 2), -1, 1);
    knob.style.transform = `translate(${stickX * 29}px,${stickY * 29}px)`;
  });
  const resetStick = event => { if (event.pointerId === stickTouch) { stickTouch = null; stickX = stickY = 0; knob.style.transform = ''; } };
  stick.addEventListener('pointerup', resetStick); stick.addEventListener('pointercancel', resetStick);
  renderer.domElement.addEventListener('pointerdown', event => { lookTouch = { id: event.pointerId, x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture(event.pointerId); });
  renderer.domElement.addEventListener('pointermove', event => {
    if (!active || !lookTouch || event.pointerId !== lookTouch.id) return;
    player.yaw -= (event.clientX - lookTouch.x) * .005;
    player.pitch = T.MathUtils.clamp(player.pitch - (event.clientY - lookTouch.y) * .005, -1.3, 1.3);
    lookTouch.x = event.clientX; lookTouch.y = event.clientY;
  });
  renderer.domElement.addEventListener('pointerup', event => { if (lookTouch?.id === event.pointerId) lookTouch = null; });
  renderer.domElement.addEventListener('pointercancel', event => { if (lookTouch?.id === event.pointerId) lookTouch = null; });
}
function resize() {
  const width = stage.clientWidth, height = stage.clientHeight;
  camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
}
new ResizeObserver(resize).observe(stage); resize();
function collide(x, z) {
  const radius = .48;
  x = T.MathUtils.clamp(x, z < -29 ? -10.4 : -15.8, z < -29 ? 10.4 : 15.8);
  z = T.MathUtils.clamp(z, -98, 29.8);
  if (z < -26.8 && z > -29.4 && (!canCross(game) || Math.abs(x) > 2.7)) z = player.z > -28 ? -26.8 : -29.4;
  for (const seal of SEALS) {
    const dx = x - seal.x, dz = z - seal.z, distance = Math.hypot(dx, dz);
    if (distance < 1.95 + radius) {
      const angle = Math.atan2(dz || .0001, dx || .0001);
      x = seal.x + Math.cos(angle) * (1.95 + radius);
      z = seal.z + Math.sin(angle) * (1.95 + radius);
    }
  }
  return { x, z };
}
function tick(time) {
  requestAnimationFrame(tick); frames++;
  const dt = Math.min(.05, (time - (lastFrame || time)) / 1000); lastFrame = time;
  const worldTime = clock.getElapsedTime();
  handKick = Math.max(0, handKick - dt * 3.2);
  focusRig.position.y = -.66 + handKick * .08 + (reducedMotion ? 0 : Math.sin(worldTime * 1.5) * .006);
  focusRig.rotation.x = handKick * .32;
  focusCore.rotation.y += reducedMotion ? 0 : dt * .8;
  focusRing.rotation.z += reducedMotion ? 0 : dt * .32;
  handGlow.intensity = .6 + handKick * 2;
  for (const info of seals) {
    if (!reducedMotion) {
      info.crystal.rotation.y += dt * .33;
      info.crystal.position.y = 5.24 + Math.sin(worldTime * 1.8 + info.index * 2) * .11;
      if (info.ward && game.wardUntil <= time) info.ward.rotation.y += dt * 2.2;
    }
    if (info.halo.scale.x > 1) info.halo.scale.multiplyScalar(Math.max(.9, 1 - dt * 1.8));
  }
  gate.material.opacity = canCross(game) ? 0 : .52 + Math.sin(worldTime * 2) * .1;
  gateRing.rotation.z = Math.sin(worldTime * .27) * .06;
  beaconCore.rotation.y += reducedMotion ? 0 : dt * .2;
  moteField.position.y = reducedMotion || game.wardUntil > time ? 0 : Math.sin(worldTime * .3) * .5;
  spellVfx.tick(time);
  if (active) {
    let forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - stickY;
    let strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + stickX;
    const length = Math.max(1, Math.hypot(forward, strafe)); forward /= length; strafe /= length;
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 9.5 : 5.2) * moveFactor(game);
    const nx = player.x + (-Math.sin(player.yaw) * forward + Math.cos(player.yaw) * strafe) * speed * dt;
    const nz = player.z + (-Math.cos(player.yaw) * forward - Math.sin(player.yaw) * strafe) * speed * dt;
    const moved = collide(nx, nz); player.x = moved.x; player.z = moved.z;
    if (keys.has('Space') && player.height <= .01) player.velocityY = 5.5;
    player.velocityY -= 13 * dt; player.height = Math.max(0, player.height + player.velocityY * dt);
    if (player.height === 0) player.velocityY = 0;
    if (Math.hypot(forward, strafe) > .1) player.bob += dt * (speed > 7 ? 11 : 8);
    if (player.z < -31 && canCross(game) && !game.completed) {
      game = cross(game).state; persist(); updateHUD();
      endingShown = true; active = false; ending.hidden = false;
      if (document.pointerLockElement) document.exitPointerLock();
      sound(540, .8);
    }
    game.mana = Math.min(maxMana(game), game.mana + dt * 18);
    game.lastManaAt = time;
    if (time - lastSave > 3000) { persist(); lastSave = time; }
  }
  const walking = active && (keys.has('KeyW') || keys.has('KeyS') || keys.has('KeyA') || keys.has('KeyD') || Math.hypot(stickX, stickY) > .1);
  camera.position.set(player.x, eyeHeight + player.height + (walking && !reducedMotion ? Math.sin(player.bob) * .035 : 0), player.z);
  camera.rotation.y = player.yaw; camera.rotation.x = player.pitch;
  camera.updateMatrixWorld(true);
  const current = aim();
  if (current !== aimed) {
    aimed = current; $('crosshair').classList.toggle('active', Boolean(current));
    const seal = SEALS.find(item => item.id === current);
    const bookIndex = current?.startsWith('book-') ? Number(current.slice(5)) : -1;
    $('target').textContent = seal ? `${seal.name} · 1 IMPULS` : current === 'gate' ? 'ASCHENTOR' :
      bookIndex >= 0 ? BOOKS[bookIndex].title : current === 'relic' ? 'ZEITSCHERBE' : '';
  }
  const nearby = active ? nearbyInteraction() : null;
  $('interact').hidden = !nearby || nearby.kind === 'gate';
  if (nearby) $('interact').firstChild.textContent = nearby.kind === 'relic' ? 'AUFHEBEN ' : nearby.kind === 'book' ? 'LESEN ' : '';
  if (frames % 8 === 0) updateManaUI();
  if (lastMessage && time > lastMessage) { $('message').classList.add('quiet'); lastMessage = 0; }
  renderer.render(scene, camera);
}
document.body.dataset.ready = 'true';
window.AshboundGameDiagnostics = Object.freeze({ get frames() { return frames; }, get state() { return { ...game, seals: [...game.seals] }; }, get position() { return { x: player.x, z: player.z }; }, get orientation() { return { yaw: player.yaw, pitch: player.pitch }; }, get target() { return aimed; }, get active() { return active; } });
requestAnimationFrame(tick);
window.addEventListener('beforeunload', () => {
  persist(); spellVfx.dispose();
  for (const texture of [floorMat.map, floorMat.normalMap, floorMat.roughnessMap,
    world.masonry.map, world.masonry.normalMap, world.masonry.roughnessMap]) texture.dispose();
  for (const g of geo) g.dispose(); for (const m of mats) m.dispose(); renderer.dispose();
});
