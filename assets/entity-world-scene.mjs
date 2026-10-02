import { THREE as T, OrbitControls } from './entity-vendor/runtime.mjs';
import { createEntityFigure } from './entity-figures.mjs';
import { galleryPosition } from './entity-world-model.mjs';

export function createCharacterWorld(host, entities, { onSelect, onError, paused = false }) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D character world');
  host.append(canvas);
  const scene = new T.Scene();
  scene.background = new T.Color('#172022');
  scene.fog = new T.Fog('#172022', 26, 78);
  const camera = new T.PerspectiveCamera(38, 1, .1, 130);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minPolarAngle = .3;
  controls.maxPolarAngle = Math.PI * .49;
  controls.minDistance = 4.5;
  controls.maxDistance = 66;
  const materials = [], geometries = [];
  const mat = (color, metalness = .1) => {
    const m = new T.MeshStandardMaterial({ color, roughness: .65, metalness });
    materials.push(m); return m;
  };
  const floor = mat('#56615c'), edge = mat('#202b2d'), pale = mat('#a5b2a6'), brass = mat('#c2a36a', .6);
  function mesh(geometry, material, x, y, z) {
    geometries.push(geometry);
    const m = new T.Mesh(geometry, material); m.position.set(x, y, z); scene.add(m); return m;
  }
  const ground = mesh(new T.CircleGeometry(54, 96), floor, 0, -.04, 0);
  ground.rotation.x = -Math.PI / 2;
  const pedestalBase = mesh(new T.CylinderGeometry(2.15, 2.35, .18, 64), edge, 0, -.01, 0);
  const pedestalTop = mesh(new T.CircleGeometry(2.13, 64), pale, 0, .09, 0);
  pedestalTop.rotation.x = -Math.PI / 2;
  const focusMark = mesh(new T.RingGeometry(2.15, 2.2, 72), brass, 0, .1, 0);
  focusMark.rotation.x = -Math.PI / 2;
  const lines = new T.GridHelper(100, 40, '#5d7676', '#63706a');
  lines.position.y = -.02; lines.material.transparent = true; lines.material.opacity = .25; scene.add(lines);
  const architecture = new T.Group(); scene.add(architecture);
  for (let i = 0; i < 16; i++) {
    const angle = Math.PI + i / 15 * Math.PI, r = 27;
    const h = 7 + 3 * Math.sin(i * 1.8);
    const p = mesh(new T.BoxGeometry(1.1, h, 1.1), i % 3 ? edge : brass, Math.cos(angle) * r, h / 2, Math.sin(angle) * r);
    architecture.attach(p);
    const cap = mesh(new T.BoxGeometry(2.1, .2, 2.1), pale, p.position.x, h + .1, p.position.z);
    architecture.attach(cap);
  }
  scene.add(new T.HemisphereLight('#e9fff5', '#4d4840', 2.5));
  const key = new T.DirectionalLight('#fff0d6', 3.5); key.position.set(6, 12, 9); scene.add(key);
  const rim = new T.DirectionalLight('#93ede2', 2.4); rim.position.set(-8, 5, -4); scene.add(rim);
  const fill = new T.DirectionalLight('#f2bcc5', 1.5); fill.position.set(8, 3, -8); scene.add(fill);
  const contactGeometry = new T.CircleGeometry(.65, 32); geometries.push(contactGeometry);
  const contactMaterial = new T.MeshBasicMaterial({ color: '#17211b', transparent: true, opacity: .22, depthWrite: false }); materials.push(contactMaterial);
  const entries = entities.map((entity, index) => {
    const figure = createEntityFigure(T, entity, index);
    figure.group.userData.entityId = entity.id;
    scene.add(figure.group);
    const contact = new T.Mesh(contactGeometry, contactMaterial); contact.rotation.x = -Math.PI / 2; contact.scale.y = .6; scene.add(contact);
    return { entity, figure, contact, position: new T.Vector3() };
  });
  let selected = entities[0].id, mode = 'focus', dirty = true, disposed = false, lost = false, frames = 0;
  let clock = 0, previous = performance.now(), request;
  const target = new T.Vector3();
  const raycaster = new T.Raycaster(), pointer = new T.Vector2();
  let down;
  const onDown = event => { down = { x: event.clientX, y: event.clientY }; };
  const onUp = event => {
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
    down = null;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(entries.filter(e => e.figure.group.visible).map(e => e.figure.group), true);
    if (!hits.length) return;
    let object = hits[0].object;
    while (object && !object.userData.entityId) object = object.parent;
    if (object) onSelect(object.userData.entityId);
  };
  function arrange() {
    scene.fog.near = mode === 'all' ? 65 : 26;
    scene.fog.far = mode === 'all' ? 115 : 78;
    const activeIndex = entities.findIndex(entity => entity.id === selected);
    const around = entries.filter(entry => entry.entity.id !== selected);
    entries.forEach((entry, index) => {
      const group = entry.figure.group;
      group.visible = mode === 'all' || entry.entity.id === selected || around.indexOf(entry) < 6;
      if (mode === 'all') entry.position.fromArray(galleryPosition(index, entities.length));
      else if (index === activeIndex) entry.position.set(0, .1, 0);
      else {
        const n = around.indexOf(entry), a = .28 + n / 5 * (Math.PI - .56);
        entry.position.set(Math.cos(a) * 6.4, 0, -3.4 - Math.sin(a) * 3);
      }
      group.position.copy(entry.position);
      entry.contact.position.copy(entry.position); entry.contact.position.y += .012; entry.contact.visible = group.visible;
      group.rotation.y = mode === 'all' ? 0 : entry.entity.id === selected ? .1 : 0;
    });
    pedestalBase.visible = mode === 'focus'; pedestalTop.visible = mode === 'focus';
    focusMark.position.set(0, .1, 0); focusMark.scale.setScalar(1);
    if (mode === 'all') { focusMark.position.fromArray(galleryPosition(activeIndex, entities.length)); focusMark.position.y = .02; focusMark.scale.setScalar(.6); }
    host.dataset.visibleEntities = String(entries.filter(e => e.figure.group.visible).length);
    host.dataset.selected = selected;
    host.dataset.mode = mode;
    dirty = true;
  }
  function resetCamera() {
    const mobile = host.clientWidth < 760;
    target.set(mode === 'all' ? 0 : mobile ? 0 : .25, mode === 'all' ? 0 : 1.3, 0);
    controls.target.copy(target);
    if (mode === 'all') camera.position.set(0, mobile ? 46 : 32, mobile ? 46 : 38);
    else camera.position.set(mobile ? 3.6 : 3.8, 3.25, mobile ? 8.6 : 8.6);
    controls.update(); dirty = true;
  }
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.clearViewOffset();
    if (width > 1000 && mode === 'focus') camera.setViewOffset(width, height, 125, 0, width, height);
    camera.updateProjectionMatrix(); dirty = true;
  }
  const change = () => { dirty = true; };
  const visibility = () => { previous = performance.now(); dirty = true; };
  const onLost = event => { event.preventDefault(); lost = true; onError('CONTEXT_LOST'); };
  const onRestored = () => { lost = false; onError('CONTEXT_RESTORED'); dirty = true; };
  controls.addEventListener('change', change);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  document.addEventListener('visibilitychange', visibility);
  const ro = new ResizeObserver(resize); ro.observe(host);
  function tick(now) {
    if (disposed) return;
    request = requestAnimationFrame(tick);
    if (document.hidden || lost) { previous = now; return; }
    const dt = Math.min((now - previous) / 1000, .05); previous = now;
    if (!paused) clock += dt;
    if (!paused || dirty) {
      for (const entry of entries) if (entry.figure.group.visible) entry.figure.animate(clock, entry.entity.id === selected, paused);
      renderer.render(scene, camera); frames++; host.dataset.frames = String(frames); dirty = false;
    }
  }
  arrange(); resize(); resetCamera(); tick(performance.now());
  host.dataset.entityCount = String(entries.length); host.dataset.state = 'READY';
  return {
    select(id) { if (!entries.some(e => e.entity.id === id)) return; selected = id; arrange(); },
    setMode(next) { mode = next === 'all' ? 'all' : 'focus'; arrange(); resize(); resetCamera(); },
    pause(value) { paused = Boolean(value); dirty = true; },
    rotate(direction) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new T.Vector3(0, 1, 0), direction * .28);
      camera.position.copy(controls.target).add(offset); controls.update(); dirty = true;
    },
    zoom(direction) {
      const offset = camera.position.clone().sub(controls.target);
      const distance = T.MathUtils.clamp(offset.length() * (direction > 0 ? .85 : 1.15), controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(distance)); controls.update(); dirty = true;
    },
    reset: resetCamera,
    dispose() {
      disposed = true; cancelAnimationFrame(request); ro.disconnect(); controls.dispose();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
      entries.forEach(entry => entry.figure.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      lines.geometry.dispose(); lines.material.dispose(); renderer.dispose(); canvas.remove();
    }
  };
}
