const MAX_PROPS = 24;
const APPEAR_SECONDS = .8;
const PULSE_SECONDS = 1.1;
const TAU = Math.PI * 2;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ITEMS = new Set(['chocolate', 'book', 'beacon']);

function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  return (value ^ value >>> 16) >>> 0;
}

function createArt(T) {
  const geometries = new Set(), materials = new Set();
  const material = (name, color, options = {}) => {
    const value = new T.MeshStandardMaterial({ color, roughness: .72, metalness: .04, ...options });
    value.name = `gift-${name}`;
    materials.add(value);
    return value;
  };
  const palette = {
    ivory: material('ivory', '#e1e3de'),
    teal: material('teal', '#2b807b', { roughness: .56 }),
    crimson: material('crimson', '#a53649', { roughness: .6 }),
    cocoa: material('cocoa', '#4c2923', { roughness: .53 }),
    chocolate: material('chocolate', '#774735', { roughness: .46 }),
    foil: material('foil', '#cad4d2', { roughness: .32, metalness: .72, side: T.DoubleSide }),
    pages: material('pages', '#eee6d5', { roughness: .93 }),
    pageEdge: material('page-edge', '#b9b7a6', { roughness: .96 }),
    metal: material('metal', '#505f5c', { roughness: .4, metalness: .65 }),
    light: material('light', '#b9e5d8', { emissive: '#72cdb8', emissiveIntensity: .65 })
  };
  const profile = new T.Shape();
  profile.moveTo(-.46, -.46); profile.lineTo(.46, -.46);
  profile.lineTo(.46, .46); profile.lineTo(-.46, .46); profile.closePath();
  const bevel = new T.ExtrudeGeometry(profile, {
    depth: .92, bevelEnabled: true, bevelSize: .04, bevelThickness: .04,
    bevelSegments: 1, steps: 1
  });
  bevel.translate(0, 0, -.46);
  const box = new T.BoxGeometry(1, 1, 1);
  const roof = new T.CylinderGeometry(.12, .5, 1, 4);
  roof.rotateY(Math.PI / 4);
  const fold = new T.BufferGeometry();
  // An irregular creased sheet folds back from the open end of the wrapper.
  fold.setAttribute('position', new T.Float32BufferAttribute([
    -.56, .38, .22, 0, .43, .17, -.6, .57, .37,
    0, .43, .17, .56, .38, .22, .62, .54, .4,
    0, .43, .17, .62, .54, .4, -.6, .57, .37,
    -.6, .57, .37, .62, .54, .4, .52, .39, .56,
    -.6, .57, .37, .52, .39, .56, -.53, .4, .53
  ], 3));
  fold.computeVertexNormals();
  const sources = { box, bevel, roof, fold };
  const templates = new Map();
  const matrix = new T.Matrix4(), normalMatrix = new T.Matrix3();
  const vertex = new T.Vector3(), normal = new T.Vector3(), transform = new T.Object3D();

  function build(item, assemble) {
    const batches = new Map();
    const part = (shape, finish, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
      let batch = batches.get(finish);
      if (!batch) { batch = { positions: [], normals: [] }; batches.set(finish, batch); }
      transform.position.set(x, y, z); transform.scale.set(sx, sy, sz);
      transform.rotation.set(rx, ry, rz); transform.updateMatrix();
      matrix.copy(transform.matrix); normalMatrix.getNormalMatrix(matrix);
      const geometry = sources[shape], positions = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal'), index = geometry.index;
      for (let i = 0, count = index ? index.count : positions.count; i < count; i++) {
        const at = index ? index.getX(i) : i;
        vertex.fromBufferAttribute(positions, at).applyMatrix4(matrix);
        normal.fromBufferAttribute(normals, at).applyNormalMatrix(normalMatrix);
        batch.positions.push(vertex.x, vertex.y, vertex.z);
        batch.normals.push(normal.x, normal.y, normal.z);
      }
    };
    assemble(part);
    const template = new T.Group(); template.name = `gift-${item}`;
    // Bake static details once per finish; every instance shares the resulting GPU resources.
    for (const [finish, batch] of batches) {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(batch.positions, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(batch.normals, 3));
      geometry.computeBoundingBox(); geometry.computeBoundingSphere(); geometries.add(geometry);
      const mesh = new T.Mesh(geometry, palette[finish]);
      mesh.name = `${item}-${finish}`; mesh.castShadow = true; mesh.receiveShadow = true;
      template.add(mesh);
    }
    templates.set(item, template);
  }

  build('chocolate', part => {
    part('box', 'foil', 0, .012, .025, 1.12, .024, 1.9);
    part('bevel', 'cocoa', 0, .12, -.04, 1.02, .19, 1.74);
    for (let row = 0; row < 5; row++) {
      for (let column = 0; column < 3; column++) {
        const x = (column - 1) * .325, z = -.69 + row * .325;
        part('bevel', 'chocolate', x, .257, z, .294, .16, .295);
        part('bevel', 'cocoa', x, .339, z, .14, .008, .14);
      }
    }
    part('bevel', 'crimson', 0, .2, .595, 1.13, .365, .77);
    part('fold', 'foil', 0, 0, 0, 1, 1, 1);
    part('box', 'foil', -.575, .22, .31, .045, .34, .26, 0, 0, -.18);
    part('box', 'foil', .575, .21, .3, .045, .32, .24, 0, 0, .18);
    part('box', 'ivory', 0, .386, .76, .7, .009, .025);
    part('box', 'ivory', 0, .386, .84, .45, .009, .025);
    part('bevel', 'ivory', 0, .388, .64, .13, .014, .13, 0, Math.PI / 4);
  });

  build('book', part => {
    part('bevel', 'teal', 0, .04, 0, 1.45, .08, 1.84);
    part('box', 'pages', .04, .235, 0, 1.28, .31, 1.69);
    for (let i = 0; i < 6; i++) {
      const y = .11 + i * .048;
      part('box', 'pageEdge', .684, y, 0, .007, .009, 1.65);
      part('box', 'pageEdge', .04, y, .849, 1.26, .009, .008);
      part('box', 'pageEdge', .04, y, -.849, 1.26, .009, .008);
    }
    part('bevel', 'teal', 0, .43, 0, 1.45, .08, 1.84);
    part('bevel', 'teal', -.683, .235, 0, .13, .4, 1.84);
    for (const z of [-.62, .62]) part('bevel', 'ivory', -.713, .235, z, .03, .3, .07);
    part('box', 'ivory', .04, .474, -.38, .72, .008, .035);
    part('box', 'ivory', .04, .474, -.26, .49, .008, .023);
    part('bevel', 'ivory', -.1, .478, .16, .16, .014, .27, 0, -.2);
    part('bevel', 'ivory', .1, .478, .16, .16, .014, .27, 0, .2);
    part('box', 'crimson', .37, .398, .96, .12, .012, .35);
    part('box', 'crimson', .37, .345, 1.12, .12, .11, .012);
  });

  build('beacon', part => {
    part('bevel', 'ivory', 0, .075, 0, .94, .15, .94);
    part('bevel', 'metal', 0, .185, 0, .72, .07, .72);
    part('bevel', 'ivory', 0, .65, 0, .49, .87, .49);
    for (const sign of [-1, 1]) {
      part('box', 'teal', 0, .68, sign * .248, .16, .66, .012);
      part('box', 'teal', sign * .248, .68, 0, .012, .66, .16);
    }
    part('bevel', 'crimson', 0, 1.075, 0, .59, .09, .59);
    part('bevel', 'metal', 0, 1.15, 0, .77, .09, .77);
    part('bevel', 'light', 0, 1.435, 0, .32, .44, .32);
    for (const x of [-.285, .285]) {
      for (const z of [-.285, .285]) part('bevel', 'metal', x, 1.45, z, .07, .54, .07);
    }
    part('bevel', 'metal', 0, 1.735, 0, .8, .08, .8);
    part('roof', 'teal', 0, 1.9, 0, 1.2, .27, 1.2);
    part('bevel', 'ivory', 0, 2.055, 0, .21, .06, .21);
  });
  for (const geometry of Object.values(sources)) geometry.dispose();
  const ring = new T.RingGeometry(.965, 1, 64); geometries.add(ring);
  return { templates, geometries, materials, ring };
}

/**
 * Times are absolute world-clock seconds, including during pause and seek.
 * Returns null for duplicates, rejected input or calls after disposal.
 * Returned positions are independent ground anchors in the group's local space.
 */
export function createWorldGifts(T) {
  if (!T?.Group || !T.Vector3 || !T.MeshStandardMaterial || !T.ExtrudeGeometry) {
    throw new TypeError('createWorldGifts requires the Three.js namespace.');
  }
  const group = new T.Group(); group.name = 'scarlet-world-gifts';
  const art = createArt(T), entries = [], seen = new Set();
  let disposed = false, motionReduced = false;

  function sample(entry, time, reducedMotion) {
    const elapsed = time - entry.born;
    entry.root.visible = elapsed >= 0;
    const t = reducedMotion ? 1 : Math.max(0, Math.min(1, elapsed / APPEAR_SECONDS));
    const growth = 1 - (1 - t) ** 3;
    entry.prop.scale.setScalar(Math.max(.001, growth));
    entry.prop.position.y = t === 1 ? 0 : .2 * Math.sin(Math.PI * t) * (1 - t);
    const pulse = Math.max(0, Math.min(1, elapsed / PULSE_SECONDS));
    entry.ring.visible = !reducedMotion && elapsed >= 0 && pulse < 1;
    entry.ring.scale.setScalar(.35 + 1.15 * (1 - (1 - pulse) ** 2));
    entry.ring.material.opacity = reducedMotion ? 0 : .5 * (1 - pulse) ** 2;
  }

  function remove(entry) {
    entry.root.removeFromParent();
    entry.root.clear(); entry.prop.clear();
    entry.ring.material.dispose();
  }

  function add(event, time) {
    if (disposed || !Number.isFinite(time) || !event || typeof event !== 'object' || Array.isArray(event)) return null;
    const { kind, id, item } = event;
    if (kind !== 'GIFT_DEMO' || typeof id !== 'string' || id.length !== 36 || !UUID.test(id) || !ITEMS.has(item)) return null;
    const key = id.toLowerCase();
    if (seen.has(key)) return null;
    const angle = hash(key) / 4294967296 * TAU;
    const radius = Math.sqrt(16 + hash(`radius:${key}`) / 4294967296 * 128);
    const position = new T.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    const root = new T.Group(); root.name = `world-gift:${key}`;
    root.position.copy(position); root.userData.giftId = key; root.userData.item = item;
    const prop = art.templates.get(item).clone();
    prop.rotation.y = hash(`heading:${key}`) / 4294967296 * TAU;
    const ringMaterial = new T.MeshBasicMaterial({
      color: '#85cfc2', side: T.DoubleSide, transparent: true, opacity: .5,
      depthWrite: false, toneMapped: false
    });
    const ring = new T.Mesh(art.ring, ringMaterial); ring.name = 'gift-spawn-pulse';
    ring.rotation.x = -Math.PI / 2; ring.position.y = .045;
    root.add(prop, ring);
    const entry = { root, prop, ring, born: time };
    sample(entry, time, motionReduced);
    if (entries.length === MAX_PROPS) remove(entries.shift());
    entries.push(entry); group.add(root);
    // Keep ID tombstones for this instance's lifetime, including evicted gifts.
    seen.add(key);
    return { position };
  }

  function update(time, reducedMotion = false) {
    if (disposed || !Number.isFinite(time)) return;
    motionReduced = Boolean(reducedMotion);
    for (const entry of entries) sample(entry, time, motionReduced);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const entry of entries) remove(entry);
    entries.length = 0; seen.clear();
    group.removeFromParent(); group.clear();
    for (const template of art.templates.values()) template.clear();
    art.templates.clear();
    for (const geometry of art.geometries) geometry.dispose();
    for (const material of art.materials) material.dispose();
    art.geometries.clear(); art.materials.clear();
  }

  return { group, add, update, dispose, get count() { return entries.length; } };
}
