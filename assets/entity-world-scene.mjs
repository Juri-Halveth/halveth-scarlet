import { THREE as T, OrbitControls } from './entity-vendor/runtime.mjs';
import { createEntityFigure } from './entity-figures.mjs';
import { createRoamingPaths, sampleRoamingPath } from './entity-world-motion.mjs';
import { WORLD_DESTINATIONS } from './entity-world-model.mjs';
import { createWorldEnvironment } from './entity-world-environment.mjs';
import { createWorldGifts } from './entity-world-gifts.mjs';
import { validateWorldEvent } from './world-events.mjs';

export function createCharacterWorld(host, entities, { onSelect, onError, onModeChange = () => {}, onClock = () => {}, paused = false }) {
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D world');
  canvas.title = 'WASD / arrows: move; Q / E: down / up; Shift: faster';
  host.append(canvas);
  const scene = new T.Scene();
  scene.background = new T.Color('#243133');
  scene.fog = new T.Fog('#243133', 100, 285);
  const camera = new T.PerspectiveCamera(48, 1, .08, 650);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.minDistance = .6;
  controls.maxDistance = Infinity;
  controls.minPolarAngle = .01;
  controls.maxPolarAngle = Math.PI - .01;
  const environment = createWorldEnvironment(T);
  scene.add(environment.group);
  const gifts = createWorldGifts(T);
  scene.add(gifts.group);
  controls.autoRotateSpeed = .4;
  scene.add(new T.HemisphereLight('#f4ffee', '#54505b', 2.5));
  const key = new T.DirectionalLight('#ffefd4', 3.1); key.position.set(18, 32, 21); scene.add(key);
  const rim = new T.DirectionalLight('#91d8e1', 1.4); rim.position.set(-24, 14, -30); scene.add(rim);
  const fill = new T.DirectionalLight('#ebbfca', 1.1); fill.position.set(18, 8, -8); scene.add(fill);
  const shadowGeometry = new T.CircleGeometry(.64, 24);
  const shadowMaterial = new T.MeshBasicMaterial({ color: '#172c27', transparent: true, opacity: .22, depthWrite: false });
  const markGeometry = new T.RingGeometry(.8, .86, 40);
  const markMaterial = new T.MeshBasicMaterial({ color: '#ebedb7', side: T.DoubleSide, transparent: true, opacity: .8 });
  const focusMark = new T.Mesh(markGeometry, markMaterial); focusMark.rotation.x = -Math.PI / 2; scene.add(focusMark);
  const routes = createRoamingPaths(entities);
  const entries = entities.map((entity, index) => {
    const figure = createEntityFigure(T, entity, index);
    figure.group.userData.entityId = entity.id;
    scene.add(figure.group);
    const contact = new T.Mesh(shadowGeometry, shadowMaterial); contact.rotation.x = -Math.PI / 2; contact.scale.y = .6; scene.add(contact);
    return { entity, figure, contact, route: routes[index], position: new T.Vector3(), tangent: new T.Vector3() };
  });
  let selected = entities[0].id, mode = 'focus', dirty = true, disposed = false, lost = false, frames = 0;
  let clock = 0, previous = performance.now(), request, lastTelemetry = -Infinity;
  let rate = 1, userPointer = false, multiPointer = false;
  const keys = new Set(), pointers = new Map();
  const held = new T.Vector3(), forward = new T.Vector3(), right = new T.Vector3(), movement = new T.Vector3();
  const lastFollow = new T.Vector3(), followPoint = new T.Vector3(), delta = new T.Vector3();
  const raycaster = new T.Raycaster(), pointer = new T.Vector2();
  const active = () => entries.find(entry => entry.entity.id === selected);

  function switchMode(next, notify = true) {
    mode = ['focus', 'overview'].includes(next) ? next : 'all';
    host.dataset.mode = mode;
    if (notify) onModeChange(mode);
    dirty = true;
  }
  function sample() {
    for (const entry of entries) {
      const pose = sampleRoamingPath(entry.route, clock, entry.position, entry.tangent);
      entry.figure.group.position.copy(entry.position);
      entry.figure.group.rotation.y = pose.heading;
      entry.contact.position.copy(entry.position); entry.contact.position.y += .012;
      entry.figure.animate(clock, entry.entity.id === selected, false, pose);
    }
    const entry = active();
    focusMark.position.copy(entry.position); focusMark.position.y += .025;
    followPoint.copy(entry.position).y += 1.3;
    if (mode === 'focus') {
      delta.copy(followPoint).sub(lastFollow);
      camera.position.add(delta); controls.target.add(delta); controls.update();
    }
    lastFollow.copy(followPoint);
    host.dataset.selectedPosition = entry.position.toArray().map(n => n.toFixed(3)).join(',');
    host.dataset.worldTime = clock.toFixed(3);
  }
  function resetCamera() {
    const mobile = host.clientWidth < 760;
    if (mode === 'overview') {
      controls.target.set(0, 0, 0);
      camera.position.set(0, mobile ? 79 : 52, mobile ? 86 : 66);
    } else if (mode === 'focus') {
      const entry = active();
      controls.target.copy(entry.position); controls.target.y += 1.3;
      camera.position.copy(controls.target).add(new T.Vector3(mobile ? 5.4 : 6.8, 3.5, mobile ? 8.4 : 10));
      lastFollow.copy(controls.target);
    } else {
      controls.target.set(0, 1.3, 0); camera.position.set(12, 11, 24);
    }
    controls.update(); dirty = true;
  }
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height;
    camera.updateProjectionMatrix(); dirty = true;
  }
  function travel(x, y, z, seconds = 1, speed = 12) {
    if (!x && !y && !z) return;
    if (mode !== 'all') switchMode('all');
    camera.getWorldDirection(forward); forward.y = 0;
    if (forward.lengthSq() < .0001) forward.set(0, 0, -1); else forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    movement.copy(right).multiplyScalar(x).addScaledVector(forward, z); movement.y = y;
    if (movement.lengthSq() > 1) movement.normalize();
    movement.multiplyScalar(seconds * speed);
    camera.position.add(movement); controls.target.add(movement); controls.update(); dirty = true;
  }
  const navigationKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const onKeyDown = event => {
    if (document.activeElement !== canvas || event.ctrlKey || event.metaKey || event.altKey) return;
    if (navigationKeys.has(event.code) || event.code.startsWith('Shift')) { keys.add(event.code); event.preventDefault(); }
  };
  const onKeyUp = event => keys.delete(event.code);
  const clearInput = () => { keys.clear(); held.set(0, 0, 0); pointers.clear(); userPointer = false; multiPointer = false; };
  const onDown = event => {
    canvas.focus({ preventScroll: true });
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
    if (pointers.size > 1) multiPointer = true;
    userPointer = true;
    if (event.button === 2 || event.ctrlKey || event.metaKey || event.shiftKey || multiPointer) switchMode('all');
  };
  const onUp = event => {
    const down = pointers.get(event.pointerId); pointers.delete(event.pointerId);
    const wasMulti = multiPointer;
    if (!pointers.size) { userPointer = false; multiPointer = false; }
    if (!down || down.button !== 0 || wasMulti || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(entries.map(entry => entry.figure.group), true)[0];
    if (!hit) return;
    let object = hit.object;
    while (object && !object.userData.entityId) object = object.parent;
    if (object) onSelect(object.userData.entityId);
  };
  const changed = () => {
    if (userPointer && mode === 'focus' && controls.target.distanceTo(lastFollow) > .15) switchMode('all');
    dirty = true;
  };
  const visibility = () => { previous = performance.now(); clearInput(); dirty = true; };
  const onLost = event => { event.preventDefault(); lost = true; clearInput(); onError('CONTEXT_LOST'); };
  const onRestored = () => { lost = false; onError('CONTEXT_RESTORED'); dirty = true; };
  controls.addEventListener('change', changed);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', clearInput);
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('blur', clearInput);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', visibility);
  const ro = new ResizeObserver(resize); ro.observe(host);
  const has = (...codes) => codes.some(code => keys.has(code)) ? 1 : 0;
  function tick(now) {
    if (disposed) return;
    request = requestAnimationFrame(tick);
    if (document.hidden || lost) { previous = now; return; }
    const dt = Math.max(0, Math.min((now - previous) / 1000, .05)); previous = now;
    travel(held.x + has('KeyD', 'ArrowRight') - has('KeyA', 'ArrowLeft'), held.y + has('KeyE') - has('KeyQ'), held.z + has('KeyW', 'ArrowUp') - has('KeyS', 'ArrowDown'), dt, has('ShiftLeft', 'ShiftRight') ? 32 : 12);
    if (!paused) clock += dt * rate;
    if (!paused || dirty) {
      sample(); environment.update(camera.position, clock); gifts.update(clock, paused);
      if (controls.autoRotate && !paused) controls.update(dt);
      renderer.render(scene, camera); frames++; host.dataset.frames = String(frames); dirty = false;
      host.dataset.cameraPosition = camera.position.toArray().map(n => n.toFixed(2)).join(',');
      host.dataset.activeChunks = String(environment.chunkCount);
      if (now - lastTelemetry > 250) {
        host.dataset.actorPositions = JSON.stringify(entries.map(entry => [entry.entity.id, ...entry.position.toArray().map(n => Number(n.toFixed(3)))]));
        onClock(clock);
        lastTelemetry = now;
      }
    }
  }
  sample(); resize(); resetCamera(); tick(performance.now());
  host.dataset.entityCount = String(entries.length); host.dataset.visibleEntities = String(entries.length);
  host.dataset.selected = selected; host.dataset.mode = mode; host.dataset.state = 'READY';
  return {
    materialize(raw, focus = false) {
      let event;
      try { event = validateWorldEvent(raw); } catch { return; }
      if (event.kind !== 'GIFT_DEMO') return;
      const result = gifts.add(event, clock);
      if (!result) return;
      host.dataset.giftCount = String(gifts.count);
      host.dataset.lastGift = event.item; host.dataset.lastGiftId = event.id;
      if (focus) {
        switchMode('all'); controls.target.copy(result.position); controls.target.y += .6;
        camera.position.copy(controls.target).add(new T.Vector3(3.2, 3.1, 4.4)); controls.update();
      }
      dirty = true;
    },
    broadcast(value) { controls.autoRotate = Boolean(value); dirty = true; },
    select(id) {
      if (!entries.some(e => e.entity.id === id)) return;
      selected = id; host.dataset.selected = selected;
      lastFollow.copy(active().position); lastFollow.y += 1.3;
      if (mode === 'focus') resetCamera(); dirty = true;
    },
    setMode(next) { switchMode(next, false); if (mode !== 'all') resetCamera(); dirty = true; },
    pause(value) { paused = Boolean(value); dirty = true; },
    hold(x, y, z) { held.set(x, y, z); },
    move(x, y, z) { travel(x, y, z, .25); },
    visit(id) {
      const destination = WORLD_DESTINATIONS.find(d => d.id === id);
      if (!destination) return;
      switchMode('all'); controls.target.fromArray(destination.position);
      camera.position.copy(controls.target).add(new T.Vector3(14, 9, 23)); controls.update(); dirty = true;
      host.dataset.destination = id;
    },
    seek(seconds) { if (!Number.isFinite(seconds)) return; clock += seconds; dirty = true; },
    setRate(value) { if ([.5, 1, 2].includes(value)) rate = value; },
    rotate(direction) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new T.Vector3(0, 1, 0), direction * .28);
      camera.position.copy(controls.target).add(offset); controls.update(); dirty = true;
    },
    zoom(direction) {
      const offset = camera.position.clone().sub(controls.target);
      camera.position.copy(controls.target).add(offset.setLength(Math.max(.6, offset.length() * (direction > 0 ? .8 : 1.25))));
      controls.update(); dirty = true;
    },
    reset: resetCamera,
    dispose() {
      disposed = true; cancelAnimationFrame(request); ro.disconnect(); controls.dispose(); clearInput();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', clearInput);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', clearInput); canvas.removeEventListener('keydown', onKeyDown); canvas.removeEventListener('blur', clearInput);
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
      entries.forEach(entry => entry.figure.dispose()); environment.dispose(); gifts.dispose();
      shadowGeometry.dispose(); shadowMaterial.dispose(); markGeometry.dispose(); markMaterial.dispose();
      renderer.dispose(); canvas.remove();
    }
  };
}
