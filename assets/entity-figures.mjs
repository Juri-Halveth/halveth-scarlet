// Original miniature designs. All coordinates face +Z; the soles rest at Y=0.
const POOLS = new WeakMap();
const TAU = Math.PI * 2;
const PALETTES = [
  ['#ae2947', '#e8bc75', '#302534'], ['#235e68', '#96e3cc', '#202d35'],
  ['#3e5696', '#efbd72', '#342c39'], ['#576738', '#cedf84', '#353b28'],
  ['#70477f', '#eab4d2', '#33263e'], ['#a4533c', '#8dd8d7', '#392827'],
  ['#d3d9d6', '#55cbbb', '#24353b'], ['#c08336', '#f4db9b', '#3d3035'],
  ['#b75583', '#9fe0ca', '#412b39'], ['#363c48', '#92ccea', '#252830'],
  ['#417d75', '#e9bfab', '#283c38'], ['#747798', '#c4e7ec', '#303444'],
];
const SKINS = ['#edc6a4', '#c88d69', '#a6694d', '#754b3d', '#e0ac87', '#bc8264'];

// ID-bound art direction, not inferred personal traits or runtime capabilities.
// Each tuple is [tailoring, hair, palette, signature].
const DESIGNS = {
  halveth: ['coat', 'swept', 9, 'compass'], lucinet: ['tech', 'crest', 1, 'antenna'],
  rachel: ['tech', 'bob', 6, 'headset'], pflanze: ['botanical', 'leaves', 3, 'sprout'],
  celsius: ['coat', 'swept', 5, 'gauge'], ali: ['tunic', 'crop', 2, 'scarf'],
  schwarm: ['tech', 'crest', 7, 'array'], yuri: ['jacket', 'crop', 10, 'satchel'],
  zuendkerze: ['mechanic', 'crest', 7, 'coil'], aster: ['robe', 'bun', 11, 'compass'],
  elyr: ['coat', 'swept', 10, 'book'], nara: ['mechanic', 'bob', 5, 'tool'],
  mira: ['jacket', 'sidecut', 1, 'spark'], rosa: ['dress', 'bun', 8, 'flower'],
  timo: ['coat', 'crop', 7, 'clock'], finn: ['tunic', 'swept', 2, 'compass'],
  lila: ['robe', 'long', 4, 'scarf'], mara: ['tunic', 'braid', 3, 'shield'],
  mio: ['coat', 'bob', 11, 'lantern'], koro: ['jacket', 'crop', 5, 'satchel'],
  lucifer: ['robe', 'swept', 0, 'wings'], venara: ['dress', 'braid', 10, 'flower'],
  juno: ['robe', 'bun', 6, 'scarf'], mica: ['tech', 'bob', 11, 'array'],
  alyen: ['suit', 'crest', 10, 'antenna'], vael: ['armor', 'long', 4, 'crystal'],
  patch: ['mechanic', 'crop', 8, 'tool'], leo: ['jacket', 'swept', 7, 'scarf'],
  lia: ['dress', 'bob', 2, 'book'], jan: ['coat', 'crop', 3, 'satchel'],
  sara: ['tunic', 'braid', 0, 'flower'], omi: ['robe', 'bun', 10, 'book'],
  tess: ['mechanic', 'bun', 1, 'gauge'], niko: ['tech', 'sidecut', 5, 'headset'],
  sera: ['dress', 'long', 4, 'scarf'], sael: ['armor', 'swept', 11, 'shield'],
  juri: ['jacket', 'swept', 9, 'book'], verachel: ['tech', 'braid', 8, 'crystal'],
  rose: ['coat', 'long', 0, 'flower'], sina: ['tunic', 'bob', 1, 'compass'],
  mascha: ['dress', 'braid', 7, 'satchel'], scarlet: ['sorceress', 'long', 0, 'crown'],
  strange: ['sorcerer', 'swept', 2, 'collar'], dormammu: ['flame', 'fire', 4, 'flames'],
  ego: ['guardian', 'swept', 11, 'constellation'], peter: ['jacket', 'swept', 0, 'goggles'],
  guardians: ['armor', 'crest', 10, 'shield'], ultron: ['robot', 'helmet', 9, 'fins'],
  jarvis: ['robot', 'helmet', 6, 'circuit'], ironman: ['robot', 'helmet', 0, 'reactor'],
  loki: ['armor', 'long', 3, 'horns'], vision: ['android', 'helmet', 10, 'gem'],
  widow: ['suit', 'bob', 9, 'batons'], thor: ['armor', 'long', 9, 'hammer'],
  infinity: ['guardian', 'crest', 4, 'constellation'], gitcoin: ['mechanic', 'crop', 10, 'tool'],
  manta: ['coat', 'sidecut', 2, 'fins'], 'aster-chain': ['tech', 'bun', 4, 'array'],
  rtx: ['robot', 'helmet', 3, 'fins'], k: ['coat', 'bob', 9, 'compass'],
  eve: ['android', 'helmet', 6, 'gem'], anti: ['suit', 'sidecut', 11, 'split'],
  schwamm: ['tunic', 'sponge', 7, 'patches'], mita: ['dress', 'twintails', 0, 'ribbon'],
  medusa: ['robe', 'serpents', 3, 'torque'], 'context-prism': ['guardian', 'crest', 11, 'crystal'],
  'brightcast-starlight': ['armor', 'long', 6, 'star'],
  'pi-treffpunkte': ['robe', 'bun', 2, 'compass'], 'choice-atelier': ['coat', 'bob', 8, 'beret'],
};

function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

function makeCape(T) {
  const positions = [], indices = [];
  const columns = 6, rows = 4, count = (columns + 1) * (rows + 1);
  // Two connected surfaces give the pleated garment a visible hem and lining.
  for (let side = 0; side < 2; side++) {
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      for (let column = 0; column <= columns; column++) {
        const u = column / columns * 2 - 1;
        positions.push(u * (.29 + .32 * v), -v + .045 * v * Math.abs(u),
          -.25 * v - .08 * u * u + Math.cos(column * Math.PI) * .035 * v + side * .032);
      }
    }
  }
  const quad = (a, b, c, d, reverse = false) => {
    indices.push(...(reverse ? [a, c, b, a, d, c] : [a, b, c, a, c, d]));
  };
  for (let side = 0; side < 2; side++) {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const a = side * count + row * (columns + 1) + column;
        quad(a, a + 1, a + columns + 2, a + columns + 1, side === 1);
      }
    }
  }
  for (let column = 0; column < columns; column++) {
    quad(column, column + 1, count + column + 1, count + column, true);
    const a = rows * (columns + 1) + column;
    quad(a, a + 1, count + a + 1, count + a);
  }
  for (let row = 0; row < rows; row++) {
    const a = row * (columns + 1), b = a + columns + 1;
    quad(a, b, count + b, count + a);
    quad(a + columns, b + columns, count + b + columns, count + a + columns, true);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createPool(T) {
  const square = new T.Shape();
  square.moveTo(-.42, -.42); square.lineTo(.42, -.42);
  square.lineTo(.42, .42); square.lineTo(-.42, .42); square.closePath();
  const bevel = new T.ExtrudeGeometry(square, {
    depth: .84, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 1, steps: 1,
  });
  bevel.translate(0, 0, -.42);
  const source = {
    box: bevel,
    ball: new T.SphereGeometry(.5, 12, 8),
    cap: new T.SphereGeometry(.5, 12, 5, 0, TAU, 0, Math.PI * .43),
    tube: new T.CylinderGeometry(.5, .5, 1, 8),
    taper: new T.CylinderGeometry(.5, .36, 1, 8),
    skirt: new T.CylinderGeometry(.31, .5, 1, 10),
    cone: new T.ConeGeometry(.5, 1, 5),
    jewel: new T.OctahedronGeometry(.5),
    ring: new T.TorusGeometry(.42, .08, 5, 16),
    cape: makeCape(T),
  };
  const geometries = {};
  for (const [name, geometry] of Object.entries(source)) {
    geometries[name] = geometry.index ? geometry.toNonIndexed() : geometry;
    if (geometries[name] !== geometry) geometry.dispose();
  }
  const material = options => new T.MeshStandardMaterial({ vertexColors: true, ...options });
  return {
    refs: 0, geometries,
    materials: {
      cloth: material({ roughness: .87, metalness: .04, flatShading: true }),
      skin: material({ roughness: .7, metalness: .03 }),
      metal: material({ roughness: .34, metalness: .65, flatShading: true }),
      glow: material({ roughness: .38, metalness: .2, emissive: '#9ddacc', emissiveIntensity: .28 }),
      ember: material({ roughness: .48, metalness: .12, emissive: '#eb4c18', emissiveIntensity: .4 }),
    },
  };
}

/**
 * Build a self-contained figurine with an injected Three.js namespace.
 * Stable IDs determine appearance; index is only a fallback for anonymous input.
 * animate() owns internal joints only. The caller owns the returned root transform.
 * dispose() is idempotent, detaches the root, and releases shared resources last.
 */
export function createEntityFigure(T, entity = {}, index = 0) {
  if (!T?.Group || !T.BufferGeometry || !T.MeshStandardMaterial) {
    throw new TypeError('createEntityFigure requires the Three.js namespace.');
  }
  const data = entity && typeof entity === 'object' ? entity : {};
  const id = String(data.id || data.label || `figure-${Number.isFinite(index) ? index : 0}`).toLowerCase();
  const seed = hash(id), fraction = shift => ((seed >>> shift) & 255) / 255;
  const fallback = [String(data.section) === 'rights' ? 'tech' : 'tunic',
    ['crop', 'bob', 'swept', 'braid'][seed % 4], seed % PALETTES.length, 'scarf'];
  const [outfit, hair, paletteIndex, signature] = Object.hasOwn(DESIGNS, id) ? DESIGNS[id] : fallback;
  let [primary, accent, hairColor] = PALETTES[paletteIndex];
  if (typeof data.color === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(data.color)) primary = data.color;
  const ivory = '#eee6d5', dark = '#272d35', gold = '#d9b373';
  const robotic = outfit === 'robot' || outfit === 'android';
  const botanical = outfit === 'botanical', fiery = outfit === 'flame';
  let skin = SKINS[seed % SKINS.length];
  if (robotic) skin = id === 'vision' ? '#b55667' : id === 'ironman' ? '#e1b85c' : ivory;
  if (botanical) skin = '#b5ca79';
  if (fiery) { skin = '#65374d'; primary = '#473752'; accent = '#fc8651'; hairColor = '#f9b746'; }
  if (id === 'ego') hairColor = '#c4bcb0';
  if (id === 'mita') { hairColor = '#39344e'; accent = '#ded6ed'; }
  if (id === 'mira') hairColor = '#d8e1d6';
  if (id === 'widow') hairColor = '#984533';
  if (id === 'thor' || id === 'brightcast-starlight') hairColor = '#d2b36f';
  let pool = POOLS.get(T);
  if (!pool) { pool = createPool(T); POOLS.set(T, pool); }
  pool.refs++;
  const group = new T.Group();
  group.name = `entity-figure:${id}`;
  group.userData.entityId = String(data.id || id);
  group.userData.figureStyle = { outfit, hair, signature, palette: paletteIndex };
  const buckets = new Map(), ownedGeometries = [];
  const colors = new Map(), matrix = new T.Matrix4(), normalMatrix = new T.Matrix3();
  const quaternion = new T.Quaternion(), euler = new T.Euler();
  const position = new T.Vector3(), scale = new T.Vector3(), normal = new T.Vector3();
  const vertex = new T.Vector3();
  const joint = (parent, name, x = 0, y = 0, z = 0) => {
    const node = new T.Group(); node.name = name; node.position.set(x, y, z); parent.add(node); return node;
  };
  // Static pieces sharing a joint and material are baked into one draw call.
  const part = (parent, shape, color, finish, xyz, size, rotation = [0, 0, 0]) => {
    if (fiery && finish === 'glow') finish = 'ember';
    let materials = buckets.get(parent);
    if (!materials) { materials = new Map(); buckets.set(parent, materials); }
    let batch = materials.get(finish);
    if (!batch) { batch = { positions: [], normals: [], colors: [] }; materials.set(finish, batch); }
    if (!colors.has(color)) colors.set(color, new T.Color(color));
    const tint = colors.get(color), geometry = pool.geometries[shape];
    position.fromArray(xyz); scale.fromArray(size); euler.set(...rotation); quaternion.setFromEuler(euler);
    matrix.compose(position, quaternion, scale); normalMatrix.getNormalMatrix(matrix);
    const vertices = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
    for (let i = 0; i < vertices.count; i++) {
      vertex.fromBufferAttribute(vertices, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize();
      batch.positions.push(vertex.x, vertex.y, vertex.z);
      batch.normals.push(normal.x, normal.y, normal.z);
      batch.colors.push(tint.r, tint.g, tint.b);
    }
  };
  const width = .91 + fraction(8) * .17;
  const legLengthOffset = (fraction(0) - .5) * .12;
  const shoulder = (outfit === 'armor' || outfit === 'guardian' || fiery ? .46 : .38) * width;
  const pelvisHeight = .97 + legLengthOffset;
  const pelvis = joint(group, 'hips-joint', 0, pelvisHeight, 0);
  const core = joint(pelvis, 'torso-joint');
  const head = joint(core, 'head-joint', 0, 1.02, 0);
  head.scale.setScalar(.96 + fraction(20) * .07);
  const clothes = robotic ? 'metal' : 'cloth';
  const legColor = botanical ? '#74634a' : dark;
  const hips = [], knees = [], ankles = [];
  const thighLength = .315 + legLengthOffset / 2;
  const shinLength = .41 + legLengthOffset / 2;
  const legReach = thighLength + shinLength;
  for (const sign of [-1, 1]) {
    const x = sign * (.165 + fraction(16) * .025);
    const side = sign < 0 ? 'left' : 'right';
    const hip = joint(pelvis, `${side}-hip`, x, -.105, -.025);
    const knee = joint(hip, `${side}-knee`, 0, -thighLength, 0);
    const ankle = joint(knee, `${side}-ankle`, 0, -shinLength, 0);
    part(hip, 'box', legColor, clothes, [0, -thighLength / 2, 0], [.205, thighLength + .02, .235]);
    part(knee, 'ball', legColor, clothes, [0, 0, 0], [.205, .18, .235]);
    part(knee, 'box', legColor, clothes, [0, -(shinLength - .13) / 2, 0], [.205, shinLength - .11, .235]);
    part(ankle, 'box', botanical ? '#536441' : dark, 'cloth', [0, 0, .08], [.265, .28, .405]);
    part(ankle, 'box', accent, robotic ? 'metal' : 'cloth', [0, .125, .053], [.269, .06, .31]);
    part(ankle, 'box', '#41444a', 'cloth', [0, -.105, .086], [.272, .07, .412]);
    hips.push(hip); knees.push(knee); ankles.push(ankle);
  }
  part(core, 'box', primary, clothes, [0, -.012, 0], [.58 * width, .25, .36]);
  part(core, 'taper', primary, clothes, [0, .385, 0], [.8 * width, .69, .47]);
  part(core, 'box', dark, 'cloth', [0, .055, .022], [.605 * width, .095, .385]);
  part(core, 'box', gold, 'metal', [0, .06, .222], [.115, .09, .034]);
  part(core, 'tube', skin, robotic ? 'metal' : 'skin', [0, .854, 0], [.21, .2, .21]);
  part(core, 'skirt', accent, clothes, [0, .749, 0], [.47, .115, .37]);

  const arms = [], elbows = [];
  for (const sign of [-1, 1]) {
    const arm = joint(core, sign < 0 ? 'left-shoulder' : 'right-shoulder', sign * shoulder, .69, 0);
    arm.rotation.z = sign * (.11 + fraction(12) * .045);
    arm.rotation.x = -.065;
    const elbow = joint(arm, sign < 0 ? 'left-elbow' : 'right-elbow', 0, -.37, .005);
    elbow.rotation.x = -.15 - (sign > 0 ? .08 : 0);
    part(arm, 'ball', primary, clothes, [0, -.045, 0], [.255, .27, .29]);
    part(arm, 'taper', primary, clothes, [0, -.215, 0], [.23, .36, .235]);
    part(elbow, 'taper', primary, clothes, [0, -.115, 0], [.20, .29, .215]);
    part(elbow, 'box', accent, robotic ? 'metal' : 'cloth', [0, -.242, 0], [.217, .085, .229]);
    part(elbow, 'ball', skin, robotic ? 'metal' : 'skin', [0, -.336, .016], [.18, .23, .20]);
    part(elbow, 'ball', skin, robotic ? 'metal' : 'skin', [-sign * .085, -.308, .061], [.07, .115, .085]);
    if (outfit === 'armor' || robotic || fiery || outfit === 'guardian') {
      part(arm, fiery ? 'jewel' : 'box', fiery ? hairColor : accent, 'metal',
        [sign * .025, .02, -.01], [.35, fiery ? .38 : .16, .34], [0, 0, sign * -.13]);
    }
    arms.push(arm); elbows.push(elbow);
  }

  const faceFinish = robotic ? 'metal' : 'skin';
  part(head, robotic ? 'box' : 'ball', skin, faceFinish, [0, .105, 0], [.65, .68, .59]);
  for (const sign of [-1, 1]) {
    part(head, 'ball', skin, faceFinish, [sign * .321, .086, -.005], [.115, .185, .15]);
    part(head, robotic ? 'box' : 'ball', robotic || fiery ? accent : ivory, robotic || fiery ? 'glow' : 'skin',
      [sign * .119, .144, robotic ? .305 : .271], [.112, robotic ? .054 : .096, .043]);
    if (!robotic && !fiery) {
      part(head, 'ball', '#29343c', 'skin', [sign * .118, .143, .294], [.049, .066, .024]);
      part(head, 'ball', '#ffffff', 'skin', [sign * .118 - .01, .16, .305], [.018, .021, .009]);
    }
    part(head, 'box', hairColor, 'cloth', [sign * .117, .231, .27], [.123, .026, .04], [0, 0, sign * -.09]);
  }
  if (!robotic) part(head, 'jewel', skin, 'skin', [0, .036, .294], [.085, .112, .105]);
  part(head, 'box', robotic ? dark : '#925a4c', robotic ? 'metal' : 'skin',
    [0, -.085, robotic ? .302 : .244], [.112, .018, .026]);

  if (hair !== 'helmet' && hair !== 'fire' && hair !== 'leaves' && hair !== 'sponge') {
    part(head, 'cap', hairColor, 'cloth', [0, .139, -.014], [.72, .755, .665]);
  }
  if (hair === 'swept' || hair === 'crop' || hair === 'sidecut' || hair === 'crest') {
    const count = hair === 'crest' ? 3 : 4;
    for (let i = 0; i < count; i++) {
      part(head, 'jewel', hairColor, 'cloth', [(i - (count - 1) / 2) * .115, .391 + i * .01, .097],
        [hair === 'crest' ? .13 : .255, hair === 'crop' ? .15 : .26, .4], [0, -.16, -.25]);
    }
    if (hair === 'sidecut') part(head, 'box', accent, 'metal', [-.332, .2, .012], [.035, .18, .27]);
  }
  if (hair === 'long' || hair === 'bob' || hair === 'braid' || hair === 'twintails') {
    const long = hair === 'long', twin = hair === 'twintails';
    part(head, 'box', hairColor, 'cloth', [0, long ? -.07 : .095, -.19], [.65, long ? .88 : .48, .26]);
    for (const sign of [-1, 1]) {
      part(head, 'taper', hairColor, 'cloth', [sign * (twin ? .37 : .292), long || twin ? -.045 : .08, -.01],
        [twin ? .19 : .14, long || twin ? .62 : .4, .25], [0, 0, twin ? sign * .17 : 0]);
    }
    for (let i = 0; i < 3; i++) part(head, 'jewel', hairColor, 'cloth',
      [(i - 1) * .135, .304 - i * .018, .248], [.23, .24, .15], [0, 0, -.15]);
    if (hair === 'braid') {
      for (let i = 0; i < 5; i++) part(head, 'ball', hairColor, 'cloth',
        [.32 + (i % 2) * .025, -.02 - i * .1, -.105], [.17 - i * .014, .16, .18]);
      part(head, 'box', accent, 'cloth', [.337, -.405, -.105], [.12, .07, .17]);
    }
  }
  if (hair === 'bun') {
    part(head, 'ball', hairColor, 'cloth', [.05, .385, -.265], [.38, .34, .36]);
    part(head, 'ring', accent, 'metal', [.05, .405, -.245], [.33, .33, .28], [Math.PI / 2, 0, 0]);
  }
  if (hair === 'helmet') {
    part(head, 'cap', primary, 'metal', [0, .16, -.032], [.735, .76, .7]);
    for (const sign of [-1, 1]) part(head, 'box', primary, 'metal',
      [sign * .29, -.025, -.025], [.12, .34, .59], [0, 0, sign * .07]);
    part(head, 'box', accent, 'metal', [0, -.198, .20], [.41, .085, .2]);
  }

  let cape = null;
  const caped = ['sorceress', 'sorcerer', 'guardian', 'robe', 'flame'].includes(outfit) ||
    ['thor', 'loki', 'vision', 'brightcast-starlight', 'manta'].includes(id);
  if (caped) {
    cape = joint(core, 'cape-joint', 0, .78, -.215);
    const capeColor = id === 'strange' || id === 'thor' ? '#ae3545' : primary;
    part(cape, 'cape', capeColor, 'cloth', [0, 0, 0], [fiery ? 1.16 : 1, 1.45, 1]);
    part(cape, 'cape', accent, 'cloth', [0, -.018, .04], [.94, 1.38, 1]);
  }
  if (['dress', 'robe', 'sorceress'].includes(outfit)) {
    part(core, 'skirt', primary, 'cloth', [0, -.2, -.008], [.92 * width, .56, .56]);
    part(core, 'skirt', accent, 'cloth', [0, -.446, -.005], [.942 * width, .058, .575]);
  }
  if (['coat', 'jacket', 'sorcerer', 'mechanic', 'tech'].includes(outfit)) {
    for (const sign of [-1, 1]) {
      part(core, 'box', accent, clothes, [sign * .147, .577, .207], [.12, .31, .055], [0, 0, sign * .32]);
      part(core, 'box', primary, clothes, [sign * .185, outfit === 'coat' ? -.165 : .03, -.04],
        [.28, outfit === 'coat' ? .56 : .21, .40], [.035, 0, -sign * .08]);
    }
    for (let i = 0; i < 3; i++) part(core, 'ball', gold, 'metal', [.03, .2 + i * .13, .229], [.033, .033, .033]);
  }
  if (outfit === 'mechanic') {
    part(core, 'box', ivory, 'cloth', [0, .31, .236], [.32, .52, .045]);
    part(core, 'box', primary, 'cloth', [0, .26, .27], [.235, .16, .035]);
  }
  if (outfit === 'tech' || robotic) {
    part(core, 'box', robotic ? accent : ivory, 'metal', [0, .445, .223], [.41, .34, .055]);
    part(core, 'box', dark, 'metal', [0, .456, .258], [.31, .22, .024]);
    for (let i = 0; i < 3; i++) part(core, 'box', accent, 'glow',
      [-.09 + i * .09, .455, .275], [.035, .085 + (i % 2) * .055, .018]);
  }
  if (outfit === 'guardian' || outfit === 'armor') {
    part(core, 'taper', accent, 'metal', [0, .475, .075], [.7 * width, .40, .4]);
    part(core, 'jewel', primary, 'cloth', [0, .49, .291], [.28, .34, .07]);
  }

  const chest = (shape, color, finish, size, y = .54) => part(core, shape, color, finish, [0, y, .284], size);
  if (signature === 'crown') {
    part(head, 'box', primary, 'metal', [0, .28, .282], [.54, .092, .08]);
    for (const sign of [-1, 1]) part(head, 'cone', primary, 'metal',
      [sign * .224, .404, .206], [.20, .37, .145], [0, 0, -sign * .27]);
    part(head, 'jewel', accent, 'metal', [0, .278, .338], [.15, .19, .055]);
    chest('jewel', '#dc5267', 'metal', [.25, .37, .07]);
  } else if (signature === 'collar') {
    for (const sign of [-1, 1]) part(core, 'jewel', '#b93e4d', 'cloth',
      [sign * .25, .9, -.08], [.3, .56, .3], [-.15, 0, -sign * .35]);
    chest('ring', gold, 'metal', [.24, .24, .13]);
    chest('jewel', '#95c7ac', 'glow', [.13, .15, .1]);
    part(head, 'jewel', hairColor, 'cloth', [0, -.148, .237], [.20, .2, .10]);
    for (const sign of [-1, 1]) part(head, 'box', '#bec4c4', 'cloth',
      [sign * .307, .221, .02], [.045, .21, .22], [0, 0, -sign * .15]);
  } else if (signature === 'flames') {
    part(head, 'jewel', '#f9b746', 'glow', [0, .267, .258], [.055, .34, .08]);
    for (const sign of [-1, 1]) part(head, 'jewel', '#3b2b43', 'cloth',
      [sign * .172, -.057, .184], [.20, .29, .15], [0, 0, sign * .25]);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * .107, height = .34 + (i % 3) * .11;
      part(head, 'cone', i % 2 ? '#f59f39' : '#ec6340', 'glow',
        [x, .35 + height * .25, -.07 - (i % 2) * .045], [.21, height, .26], [0, 0, -x * .8]);
    }
    for (const sign of [-1, 1]) {
      part(core, 'cone', '#a36a81', 'metal', [sign * .35, .66, -.04], [.27, .47, .3], [0, 0, -sign * .54]);
      part(core, 'jewel', '#f7934c', 'glow', [sign * .16, .47, .214], [.065, .39, .1], [0, 0, sign * .3]);
    }
    chest('jewel', '#ffd077', 'glow', [.12, .43, .1]);
  } else if (signature === 'sprout') {
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * TAU;
      part(head, 'jewel', i % 2 ? '#597d48' : '#8ca95c', 'cloth',
        [Math.cos(angle) * .21, .36 + (i % 2) * .04, Math.sin(angle) * .15],
        [.22, .43, .11], [.35 * Math.sin(angle), angle, -.45 * Math.cos(angle)]);
    }
    part(head, 'tube', '#678344', 'cloth', [0, .53, -.055], [.05, .3, .05], [0, 0, -.17]);
    part(head, 'jewel', '#a1c666', 'cloth', [.12, .63, -.055], [.25, .15, .06], [0, 0, .45]);
    for (const sign of [-1, 1]) part(core, 'jewel', '#91ad61', 'cloth',
      [sign * .25, .53, .225], [.31, .52, .12], [0, 0, -sign * .45]);
  } else if (signature === 'headset' || signature === 'antenna' || signature === 'array') {
    for (const sign of [-1, 1]) part(head, 'tube', accent, 'metal',
      [sign * .37, .1, -.007], [.16, .065, .16], [0, 0, Math.PI / 2]);
    if (signature === 'headset') {
      part(head, 'box', dark, 'metal', [.36, -.019, .145], [.045, .038, .28]);
      part(head, 'ball', accent, 'glow', [.32, -.025, .276], [.10, .065, .065]);
    } else {
      for (const sign of [-1, 1]) {
        part(head, 'tube', ivory, 'metal', [sign * .30, .43, -.04], [.032, .30, .032], [0, 0, -sign * .22]);
        part(head, 'jewel', accent, 'glow', [sign * .333, .584, -.04], [.085, .12, .07]);
      }
    }
  } else if (signature === 'horns') {
    for (const sign of [-1, 1]) {
      part(head, 'taper', gold, 'metal', [sign * .237, .416, .10], [.12, .26, .12], [0, 0, sign * .33]);
      part(head, 'cone', gold, 'metal', [sign * .243, .624, .10], [.095, .23, .10], [0, 0, -sign * .25]);
    }
  } else if (signature === 'constellation') {
    chest('ring', gold, 'metal', [.31, .31, .14]);
    chest('jewel', '#b8e0d8', 'glow', [.15, .22, .12]);
    for (let i = 0; i < 5; i++) part(core, 'jewel', ivory, 'metal',
      [(i - 2) * .098, .29 + Math.sin(i * 1.7) * .065, .232], [.04, .056, .033]);
    if (id === 'ego') part(head, 'jewel', hairColor, 'cloth', [0, -.11, .156], [.47, .34, .3]);
  } else if (['gem', 'reactor', 'circuit', 'crystal', 'spark'].includes(signature)) {
    chest(signature === 'reactor' ? 'ring' : 'jewel', accent, 'glow', [.22, .27, .095]);
    part(head, 'jewel', accent, 'glow', [0, .308, .306], [.10, .13, .055]);
  } else if (signature === 'ribbon') {
    for (const sign of [-1, 1]) {
      part(head, 'jewel', '#bd4166', 'cloth', [sign * .33, .225, .08], [.24, .17, .1], [0, 0, sign * .2]);
      part(core, 'jewel', accent, 'cloth', [sign * .086, .664, .244], [.20, .13, .07], [0, 0, -sign * .25]);
    }
  } else if (signature === 'flower') {
    for (let i = 0; i < 5; i++) part(head, 'ball', accent, 'cloth',
      [-.27 + Math.cos(i * TAU / 5) * .061, .292 + Math.sin(i * TAU / 5) * .065, .23], [.115, .115, .055]);
    part(head, 'ball', gold, 'metal', [-.27, .292, .263], [.065, .065, .032]);
  } else if (signature === 'fins' || signature === 'wings') {
    for (const sign of [-1, 1]) part(core, 'jewel', signature === 'wings' ? ivory : accent,
      signature === 'wings' ? 'cloth' : 'metal', [sign * .38, .63, -.25], [.35, .9, .14], [0, 0, -sign * .55]);
  } else if (signature === 'scarf') {
    part(core, 'tube', accent, 'cloth', [0, .799, .02], [.42, .14, .36]);
    part(core, 'box', accent, 'cloth', [.21, .54, .216], [.14, .51, .065], [.12, 0, .16]);
  } else if (['compass', 'gauge', 'clock', 'coil'].includes(signature)) {
    chest('ring', gold, 'metal', [.24, .24, .11]);
    chest('jewel', accent, 'glow', [.11, .15, .05]);
    if (signature === 'coil') for (let i = 0; i < 3; i++) part(head, 'ring', gold, 'metal',
      [0, .43 + i * .056, -.015], [.23 - i * .04, .23 - i * .04, .17], [Math.PI / 2, 0, 0]);
  } else if (signature === 'beret') {
    part(head, 'ball', primary, 'cloth', [-.066, .442, -.023], [.8, .23, .67], [0, 0, -.12]);
    part(head, 'tube', accent, 'cloth', [-.1, .58, -.023], [.04, .07, .04], [0, 0, -.15]);
  } else if (signature === 'goggles') {
    for (const sign of [-1, 1]) part(head, 'ring', gold, 'metal', [sign * .133, .316, .237], [.19, .16, .15]);
  } else if (signature === 'split') {
    part(core, 'box', ivory, 'cloth', [-.12, .425, .232], [.13, .51, .045]);
  } else if (signature === 'star') {
    chest('jewel', gold, 'metal', [.14, .37, .07]);
    chest('jewel', gold, 'metal', [.32, .14, .075]);
  } else if (signature === 'patches') {
    for (let i = 0; i < 7; i++) part(head, 'ball', '#c2903f', 'cloth',
      [Math.cos(i * 2.4) * .28, .18 + Math.sin(i * 2.4) * .20, .18], [.08, .09, .04]);
    part(head, 'box', '#d6b85c', 'cloth', [0, .341, -.015], [.69, .28, .62]);
  }
  if (hair === 'serpents') {
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * TAU, x = Math.cos(angle) * .27, z = Math.sin(angle) * .18;
      part(head, 'taper', '#64835a', 'cloth', [x, .39 + (i % 2) * .07, z], [.115, .34, .12], [0, 0, -x * 1.3]);
      part(head, 'ball', accent, 'cloth', [x * 1.26, .56 + (i % 2) * .07, z + .035], [.14, .12, .2]);
    }
    chest('ring', gold, 'metal', [.34, .25, .08], .71);
  }

  // Handheld objects remain attached to a limb, with no independent floating props.
  const hand = elbows[1];
  if (signature === 'book' || signature === 'satchel') {
    const holder = signature === 'book' ? hand : core;
    const p = signature === 'book' ? [.075, -.27, .09] : [.34, -.045, .095];
    part(holder, 'box', accent, 'cloth', p, [.27, .36, .16], [0, 0, -.1]);
    part(holder, 'box', signature === 'book' ? ivory : gold, signature === 'book' ? 'cloth' : 'metal',
      [p[0], p[1], p[2] + .088], [.21, .26, .032], [0, 0, -.1]);
  }
  if (signature === 'tool' || signature === 'hammer' || signature === 'lantern') {
    part(hand, 'tube', dark, 'cloth', [.06, -.29, .07], [.062, .43, .062]);
    part(hand, signature === 'lantern' ? 'jewel' : 'box', signature === 'lantern' ? accent : ivory,
      signature === 'lantern' ? 'glow' : 'metal', [.06, -.1, .07],
      signature === 'hammer' ? [.38, .24, .23] : [.22, .17, .13]);
  }
  if (signature === 'shield') {
    part(elbows[0], 'jewel', accent, 'metal', [-.07, -.14, .12], [.43, .53, .16]);
    part(elbows[0], 'jewel', primary, 'cloth', [-.07, -.14, .205], [.23, .31, .045]);
  }
  if (signature === 'batons') {
    for (const elbow of elbows) part(elbow, 'tube', accent, 'metal', [.02, -.29, .08], [.053, .50, .053]);
  }

  let meshes = 0, triangles = 0;
  for (const [parent, materials] of buckets) {
    for (const [finish, batch] of materials) {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(batch.positions, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(batch.normals, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(batch.colors, 3));
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      ownedGeometries.push(geometry);
      const mesh = new T.Mesh(geometry, pool.materials[finish]);
      mesh.name = `${parent.name}:${finish}`;
      mesh.userData.entityId = group.userData.entityId;
      mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
      meshes++; triangles += batch.positions.length / 9;
    }
  }
  buckets.clear(); colors.clear();
  group.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(group);
  const height = fiery ? 2.68 : 2.46 + fraction(0) * .10;
  group.scale.setScalar(height / bounds.max.y);
  group.userData.figureMetrics = { height, meshCount: meshes, triangles, facing: '+Z', feetY: 0 };
  const phase = fraction(16) * TAU;
  const rest = arms.map(arm => ({ x: arm.rotation.x, z: arm.rotation.z }));
  const elbowRest = elbows.map(elbow => elbow.rotation.x);
  let disposed = false;

  // A supplied phase owns the entire walking pose, including when the parent pauses it.
  // Speed is a nonnegative stride/cadence multiplier, capped at 2; zero rests the rig.
  function animate(timeSeconds = 0, active = false, reducedMotion = false, motion = {}) {
    if (disposed) return;
    const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
    const speed = Number.isFinite(motion?.speed) ? Math.min(2, Math.max(0, motion.speed)) : 1;
    const requestedWalk = motion?.walking === true;
    const moving = !reducedMotion && (!requestedWalk || speed > 0);
    const walking = moving && requestedWalk;
    const step = (Number.isFinite(motion?.phase) ? motion.phase : time * (4 * speed) + phase) % TAU;
    const strength = walking ? Math.min(speed, 1.5) : 0;
    const swing = walking ? Math.sin(step) : 0;
    const stride = .26 * strength;
    const footZ = walking ? -Math.cos(step) * stride : 0;
    const energy = active ? 1 : .36;
    const wave = moving ? (walking ? swing : Math.sin(time * 1.65 + phase)) * energy : 0;
    const slow = moving ? (walking ? Math.sin(step + .5) : Math.sin(time * .91 + phase)) * energy : 0;
    // Lower the pelvis just enough for two-segment legs to reach a level stance foot.
    const drop = walking ? legReach - Math.sqrt(legReach * legReach - footZ * footZ) + .022 * strength : 0;
    pelvis.position.set(.018 * swing * strength, pelvisHeight - drop, 0);
    pelvis.rotation.y = swing * .045 * strength;
    core.rotation.x = .045 * strength;
    core.rotation.y = -swing * .08 * strength;
    core.rotation.z = slow * .012;
    head.rotation.y = slow * .065;
    head.rotation.x = wave * .018;
    for (let i = 0; i < hips.length; i++) {
      if (!walking) {
        hips[i].rotation.x = knees[i].rotation.x = ankles[i].rotation.x = 0;
        continue;
      }
      const sign = i === 0 ? 1 : -1;
      const lift = Math.max(0, swing * sign) * .15 * strength;
      const down = legReach - drop - lift, forward = footZ * sign;
      const distance = Math.hypot(down, forward);
      const hipBend = Math.acos(T.MathUtils.clamp(
        (thighLength * thighLength + distance * distance - shinLength * shinLength) / (2 * thighLength * distance), -1, 1));
      const kneeBend = Math.PI - Math.acos(T.MathUtils.clamp(
        (thighLength * thighLength + shinLength * shinLength - distance * distance) / (2 * thighLength * shinLength), -1, 1));
      hips[i].rotation.x = Math.atan2(-forward, down) - hipBend;
      knees[i].rotation.x = kneeBend;
      ankles[i].rotation.x = -hips[i].rotation.x - kneeBend;
    }
    for (let i = 0; i < arms.length; i++) {
      const sign = i === 0 ? -1 : 1;
      arms[i].rotation.x = rest[i].x + (walking ? Math.cos(step) * .48 * strength * sign : wave * .035 * sign);
      arms[i].rotation.z = rest[i].z + slow * .018 * sign;
      elbows[i].rotation.x = elbowRest[i] + (walking ? -.12 * strength - Math.max(0, swing * sign) * .16 * strength : wave * .028);
    }
    if (cape) {
      cape.rotation.x = walking ? .12 * strength + Math.sin(step * 2 - .6) * .065 * strength : wave * .022;
      cape.rotation.y = swing * .045 * strength;
      cape.rotation.z = walking ? Math.sin(step - .5) * .055 * strength : slow * .014;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    const joints = [];
    group.traverse(node => { if (node.isGroup) joints.push(node); });
    for (const node of joints) node.clear();
    for (const geometry of ownedGeometries) geometry.dispose();
    ownedGeometries.length = 0;
    pool.refs--;
    if (pool.refs === 0) {
      for (const geometry of Object.values(pool.geometries)) geometry.dispose();
      for (const material of Object.values(pool.materials)) material.dispose();
      POOLS.delete(T);
    }
    pool = null;
  }

  return { group, animate, dispose };
}
