// Five by five 96-unit sectors; scene lighting, camera, fog and navigation belong to the host.
// Suggested fog: near 75, far 175. Destinations: forum (0,0,0), garden (64,0,-60),
// observatory (-72,0,-40). Geometry is recycled; no history of visited sectors is retained.
export function createWorldEnvironment(T) {
  const SIZE = 96, RADIUS = 2, SLOT_COUNT = 25;
  const group = new T.Group();
  group.name = 'scarlet-continuous-environment';
  const geometries = new Set(), materials = new Set(), batches = new Map();
  const ownGeometry = geometry => { geometries.add(geometry); return geometry; };
  const material = (color, extra = {}) => {
    const result = new T.MeshStandardMaterial({ color, roughness: .78, metalness: .08, ...extra });
    materials.add(result);
    return result;
  };
  const palette = {
    stone: material('#e1e3de'),
    path: material('#bbc4bf', { roughness: .92 }),
    dark: material('#303738', { roughness: .65, metalness: .3 }),
    metal: material('#737e7b', { roughness: .4, metalness: .68 }),
    crimson: material('#a53649', { roughness: .53 }),
    teal: material('#2b807b', { roughness: .5 }),
    amber: material('#ba8546', { roughness: .48, metalness: .35 }),
    light: material('#f2d8a4', { emissive: '#efb75e', emissiveIntensity: .65 }),
    water: material('#264e4b', { roughness: .24, metalness: .58 }),
    bark: material('#62685b'),
    leaf: material('#668069', { side: T.DoubleSide }),
    silverLeaf: material('#96a793', { side: T.DoubleSide }),
    soil: material('#424942', { roughness: 1 })
  };
  const box = ownGeometry(new T.BoxGeometry(1, 1, 1));
  const cylinder = ownGeometry(new T.CylinderGeometry(1, 1, 1, 12));
  const disk = ownGeometry(new T.CylinderGeometry(1, 1, 1, 48));
  const torus = ownGeometry(new T.TorusGeometry(1, .055, 6, 64));
  const archProfile = new T.Shape();
  archProfile.moveTo(-7.2, 0);
  archProfile.lineTo(-7.2, 6);
  archProfile.absarc(0, 6, 7.2, Math.PI, 0, true);
  archProfile.lineTo(7.2, 0);
  archProfile.lineTo(5.9, 0);
  archProfile.lineTo(5.9, 6);
  archProfile.absarc(0, 6, 5.9, 0, Math.PI, false);
  archProfile.lineTo(-5.9, 0);
  archProfile.closePath();
  const arch = ownGeometry(new T.ExtrudeGeometry(archProfile, {
    depth: 1.15, bevelEnabled: true, bevelSegments: 1,
    steps: 1, bevelSize: .1, bevelThickness: .1, curveSegments: 18
  }));
  arch.translate(0, 0, -.575);
  const leaf = ownGeometry(new T.BufferGeometry());
  // A folded, recurved blade, rather than a spherical foliage proxy.
  leaf.setAttribute('position', new T.Float32BufferAttribute([
    0, 0, 0, -.24, .38, .06, 0, .43, .19,
    0, 0, 0, 0, .43, .19, .24, .38, .06,
    -.24, .38, .06, -.16, .78, .27, 0, .43, .19,
    .24, .38, .06, 0, .43, .19, .16, .78, .27,
    -.16, .78, .27, 0, 1, .58, 0, .43, .19,
    .16, .78, .27, 0, .43, .19, 0, 1, .58
  ], 3));
  leaf.computeVertexNormals();
  const specifications = [
    ['stone', box, palette.stone, 220], ['path', box, palette.path, 190],
    ['dark', box, palette.dark, 180], ['metal', box, palette.metal, 100],
    ['crimson', box, palette.crimson, 45], ['teal', box, palette.teal, 45],
    ['amber', box, palette.amber, 45], ['light', box, palette.light, 120],
    ['water', box, palette.water, 18], ['soil', box, palette.soil, 30],
    ['arch', arch, palette.stone, 18], ['darkArch', arch, palette.dark, 10],
    ['bark', cylinder, palette.bark, 45], ['leaf', leaf, palette.leaf, 220],
    ['silverLeaf', leaf, palette.silverLeaf, 160], ['pad', disk, palette.stone, 8]
  ];
  for (const [name, geometry, mat, perSlot] of specifications) {
    const mesh = new T.InstancedMesh(geometry, mat, perSlot * SLOT_COUNT);
    mesh.name = `environment-${name}`;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.count = 0;
    mesh.receiveShadow = true;
    mesh.castShadow = !['path', 'water', 'light', 'pad'].includes(name);
    group.add(mesh);
    batches.set(name, { mesh, perSlot });
  }
  const horizon = new T.Mesh(ownGeometry(new T.PlaneGeometry(1, 1)), palette.stone);
  horizon.name = 'continuous-ground';
  horizon.rotation.x = -Math.PI / 2;
  horizon.position.y = -.03;
  horizon.receiveShadow = true;
  group.add(horizon);
  const scratch = new T.Object3D();
  const direction = new T.Vector3(), zAxis = new T.Vector3(0, 0, 1);
  const slots = Array.from({ length: SLOT_COUNT }, () => ({
    key: null, x: 0, z: 0, data: new Map(specifications.map(([name]) => [name, []]))
  }));
  const active = new Map();
  let disposed = false, centerX = NaN, centerZ = NaN;

  function randomFor(x, z) {
    let state = (Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ 0x79a36e21) >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let value = Math.imul(state ^ state >>> 15, 1 | state);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  function add(slot, kind, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    scratch.position.set(x, y, z);
    scratch.rotation.set(rx, ry, rz);
    scratch.scale.set(sx, sy, sz);
    scratch.updateMatrix();
    slot.data.get(kind).push(...scratch.matrix.elements);
  }
  function beam(slot, kind, a, b, width, thickness) {
    direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const length = direction.length();
    scratch.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    scratch.quaternion.setFromUnitVectors(zAxis, direction.multiplyScalar(1 / length));
    scratch.scale.set(width, thickness, length);
    scratch.updateMatrix();
    slot.data.get(kind).push(...scratch.matrix.elements);
  }
  function planter(slot, x, z, width, depth, accent = 'teal') {
    add(slot, 'stone', x, .36, z, width, .72, depth);
    add(slot, 'soil', x, .73, z, width - .6, .06, depth - .6);
    add(slot, accent, x, .38, z + depth / 2 + .012, width - .7, .12, .045);
  }
  function plant(slot, x, z, scale, phase, tall = false) {
    const base = .77, height = tall ? 4.2 * scale : 0;
    if (tall) {
      add(slot, 'bark', x, base + height / 2, z, .16 * scale, height, .16 * scale, 0, phase, -.065);
      add(slot, 'bark', x + .25 * scale, base + height * .7, z, .095 * scale, height * .55, .095 * scale, 0, phase, -.42);
    }
    const count = tall ? 9 : 7;
    for (let i = 0; i < count; i++) {
      const angle = phase + i * Math.PI * 2 / count;
      add(slot, i % 3 ? 'leaf' : 'silverLeaf', x, base + height, z,
        scale * (tall ? 3.7 : 2), scale * (tall ? 4.5 : 2.1), scale * (tall ? 3.8 : 2),
        (tall ? .84 : .3) + i % 2 * .18, angle, 0);
    }
  }
  function ramp(slot, x, z, length, height, width, angle) {
    const sin = Math.sin(angle), cos = Math.cos(angle);
    const endX = x + sin * length, endZ = z + cos * length;
    beam(slot, 'stone', [x, -.14, z], [endX, height - .14, endZ], width, .28);
    for (const side of [-1, 1]) {
      const dx = cos * side * (width / 2 - .12), dz = -sin * side * (width / 2 - .12);
      beam(slot, 'metal', [x + dx, 1.05, z + dz], [endX + dx, height + 1.05, endZ + dz], .08, .08);
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        add(slot, 'metal', x + (endX - x) * t + dx, height * t + .5, z + (endZ - z) * t + dz, .075, 1, .075);
      }
    }
  }
  function arcade(slot, x, z, angle, accent, count = 3, scale = 1) {
    const sin = Math.sin(angle), cos = Math.cos(angle);
    const point = (px, pz) => [x + px * cos + pz * sin, z - px * sin + pz * cos];
    for (let i = 0; i < count; i++) {
      const [px, pz] = point(0, (i - (count - 1) / 2) * 8 * scale);
      add(slot, 'arch', px, 0, pz, scale, scale, scale, 0, angle);
      add(slot, 'darkArch', px - sin * .65 * scale, 0, pz - cos * .65 * scale,
        scale * 1.035, scale * 1.015, scale, 0, angle);
      for (const side of [-1, 1]) {
        const [fx, fz] = point(side * 6.54 * scale, (i - (count - 1) / 2) * 8 * scale);
        add(slot, 'dark', fx, .16 * scale, fz, 1.65 * scale, .32 * scale, 2.1 * scale, 0, angle);
        add(slot, accent, fx, 2.2 * scale, fz, .2 * scale, 3.9 * scale, 1.42 * scale, 0, angle);
      }
    }
    for (const side of [-1, 1]) {
      const [px, pz] = point(side * 6.55 * scale, 0);
      add(slot, 'dark', px, 6.2 * scale, pz, 1.3 * scale, .35 * scale, (count - 1) * 8 * scale + 3, 0, angle);
      add(slot, 'light', px, 6.01 * scale, pz, .1 * scale, .055, (count - 1) * 8 * scale + 2, 0, angle);
    }
  }
  function street(slot) {
    const worldX = slot.x * SIZE, worldZ = slot.z * SIZE;
    // Boundary samples use world coordinates, so adjacent sectors meet exactly.
    const curve = x => 17 * Math.sin(x / 103 + slot.z * 1.7) + 7 * Math.sin(x / 49 + slot.z);
    for (let i = 0; i < 12; i++) {
      const x0 = -48 + i * 8, x1 = x0 + 8;
      const z0 = curve(worldX + x0), z1 = curve(worldX + x1);
      beam(slot, 'path', [x0, -.025, z0], [x1, -.025, z1], 10, .075);
      beam(slot, 'stone', [x0, -.02, z0 + 5.1], [x1, -.02, z1 + 5.1], .32, .06);
      if (i % 3 === 0) beam(slot, 'metal', [x0, .014, z0 - 4.6], [x0 + 3, .014, z0 - 4.6], .07, .025);
    }
    // A second, less frequent meander makes junctions without a visible square grid.
    if (slot.x % 2 === 0) {
      const branch = z => 19 * Math.sin(z / 137 + slot.x * .81);
      for (let i = 0; i < 12; i++) {
        const z0 = -48 + i * 8, z1 = z0 + 8;
        beam(slot, 'path', [branch(worldZ + z0), -.035, z0], [branch(worldZ + z1), -.035, z1], 7, .075);
      }
    }
  }
  const reserved = (x, z, margin = 0) => Math.hypot(x, z) < 57 + margin ||
    Math.hypot(x - 64, z + 60) < 30 + margin || Math.hypot(x + 72, z + 40) < 30 + margin;

  function forum(slot) {
    // Almost all of the radius-45 floor is open; the arcade occupies its north edge.
    arcade(slot, -24, -38, Math.PI / 2, 'crimson', 3, .85);
    arcade(slot, 22, -42, Math.PI / 2, 'crimson', 3, .85);
    for (const x of [-37, 37]) {
      planter(slot, x, -24, 4.5, 13, 'crimson');
      plant(slot, x, -28, 1.05, .3, true);
      plant(slot, x, -20, .9, 2.1);
      add(slot, 'stone', x, .43, -11, 3.5, .86, 8);
      add(slot, 'dark', x, .9, -11, 3.2, .1, 7.8);
    }
    for (const x of [-5.5, 5.5]) {
      add(slot, 'metal', x, .012, 0, .06, .02, 45);
      for (let z = -18; z <= 18; z += 9) add(slot, 'light', x, .027, z, .12, .025, 1.1);
    }
    add(slot, 'crimson', 0, .015, -31, 9, .02, .32);
    add(slot, 'stone', 0, 13, -49, 25, 1, 4);
    for (const x of [-10, 10]) add(slot, 'dark', x, 6.5, -49, 1.6, 13, 2);
    for (let x = -10; x <= 10; x += 5) add(slot, 'crimson', x, 10.6, -46.9, 1.5, 4.5, .13);
  }
  function garden(slot, x, z) {
    arcade(slot, x, z, -.18, 'teal', 3, .95);
    for (const side of [-1, 1]) {
      planter(slot, x + side * 11, z, 5, 28);
      for (let i = -1; i <= 1; i++) plant(slot, x + side * 11, z + i * 9, 1.15, i * .8 + side, i !== 0);
      add(slot, 'water', x + side * 16, .02, z + 1, 2.5, .04, 22);
      add(slot, 'stone', x + side * 18, .42, z + 2, 1.25, .84, 15);
    }
    add(slot, 'stone', x, 7.45, z - 14, 32, .5, 5);
    for (const side of [-1, 1]) {
      add(slot, 'dark', x + side * 15, 3.6, z - 14, 1.1, 7.2, 3.7);
      add(slot, 'metal', x - (side === 1 ? 2 : 0), 8.65, z - 14 + side * 2.25,
        side === 1 ? 28 : 32, .09, .09);
      for (let i = -15; i <= (side === 1 ? 10 : 15); i += 5) {
        add(slot, 'metal', x + i, 8.1, z - 14 + side * 2.25, .08, 1.1, .08);
      }
    }
    ramp(slot, x + 14, z + 16, 27.5, 7.7, 4, Math.PI);
    for (let i = -6; i <= 6; i++) add(slot, 'teal', x + i * 2.2, 11.6, z - 14, .28, .35, 7.8);
    for (const dx of [-14, 14]) add(slot, 'dark', x + dx, 9.6, z - 14, .3, 4, .3);
  }
  function observatory(slot, x, z) {
    add(slot, 'pad', x, -.1, z, 17, .2, 17);
    arcade(slot, x - 12, z, Math.PI / 2, 'amber', 2, .9);
    add(slot, 'stone', x + 4, 7.1, z - 7, 20, .6, 12);
    for (const dx of [-4, 12]) {
      add(slot, 'dark', x + dx, 3.4, z - 7, 1.2, 6.8, 8);
      add(slot, 'amber', x + dx, 3.2, z - 2.95, .18, 5.6, .12);
    }
    ramp(slot, x + 12, z + 23, 24, 7.4, 4.5, Math.PI);
    for (const side of [-1, 1]) {
      add(slot, 'metal', x + (side === 1 ? 1.75 : 4), 8.45, z - 7 + side * 5.8,
        side === 1 ? 15.5 : 20, .08, .08);
      for (let i = -5; i < (side === 1 ? 10 : 15); i += 4) {
        add(slot, 'metal', x + i, 7.9, z - 7 + side * 5.8, .07, 1.1, .07);
      }
    }
    for (let i = 0; i < 3; i++) {
      add(slot, 'dark', x - 15 - i * 2.2, 10 + i * 2.5, z - 16, 1.2, 20 + i * 5, 3);
      add(slot, 'amber', x - 15 - i * 2.2, 16 + i * 2.8, z - 14.46, .15, 5, .08);
    }
    planter(slot, x - 12, z + 16, 10, 4, 'amber');
    for (const dx of [-3, 0, 3]) plant(slot, x - 12 + dx, z + 16, .95, dx);
  }
  function fillSlot(slot, cx, cz) {
    slot.x = cx; slot.z = cz; slot.key = `${cx},${cz}`;
    for (const data of slot.data.values()) data.length = 0;
    const random = randomFor(cx, cz), ox = cx * SIZE, oz = cz * SIZE;
    add(slot, 'stone', 0, -.25, 0, SIZE, .5, SIZE);
    street(slot);
    if (cx === 0 && cz === 0) forum(slot);
    if (cx === 1 && cz === -1) garden(slot, 64 - ox, -60 - oz);
    if (cx === -1 && cz === 0) observatory(slot, -72 - ox, -40 - oz);
    const x = (random() - .5) * 20, z = (random() < .5 ? -1 : 1) * (27 + random() * 6);
    const angle = (random() - .5) * 1.1;
    const accent = ['crimson', 'teal', 'amber'][(Math.abs(cx + cz) % 3)];
    if (!reserved(ox + x, oz + z, 19)) {
      const count = random() > .35 ? 3 : 2;
      arcade(slot, x, z, angle, accent, count, .7 + random() * .28);
      const sx = x + 19, sz = z - 3;
      add(slot, 'dark', sx, 4.7, sz, 3, 9.4, 9);
      add(slot, 'stone', sx, 9.6, sz, 5, .4, 12);
      add(slot, accent, sx - 1.55, 5.7, sz, .1, 5, 3);
      add(slot, 'light', sx - 1.62, 3.2, sz, .07, .08, 5);
    }
    for (let i = 0; i < 3; i++) {
      const px = (random() - .5) * 78, pz = (random() - .5) * 76;
      if (reserved(ox + px, oz + pz, 7)) continue;
      const pathZ = 17 * Math.sin((ox + px) / 103 + cz * 1.7) + 7 * Math.sin((ox + px) / 49 + cz);
      const pathX = 19 * Math.sin((oz + pz) / 137 + cx * .81);
      if (Math.abs(pz - pathZ) < 12 || cx % 2 === 0 && Math.abs(px - pathX) < 10) continue;
      planter(slot, px, pz, 5, 6, accent);
      plant(slot, px, pz, .85 + random() * .5, random() * 6.28, random() > .35);
    }
  }

  // A recognisable, gently tracking instrument on the observatory's upper deck.
  const instrument = new T.Group();
  instrument.name = 'observatory-instrument';
  group.add(instrument);
  function instrumentMesh(geometry, mat, x, y, z, sx, sy, sz, parent = instrument) {
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  instrumentMesh(disk, palette.dark, 0, .25, 0, 3.2, .5, 3.2);
  instrumentMesh(cylinder, palette.metal, 0, 1.6, 0, .65, 2.7, .65);
  const gimbal = new T.Group();
  gimbal.position.y = 3.8;
  instrument.add(gimbal);
  const barrel = new T.Group();
  barrel.rotation.x = -Math.PI / 2 + .52;
  gimbal.add(barrel);
  instrumentMesh(cylinder, palette.stone, 0, 0, 0, 1.4, 6.2, 1.4, barrel);
  instrumentMesh(cylinder, palette.dark, 0, 2.4, 0, 1.48, 1.1, 1.48, barrel);
  instrumentMesh(disk, palette.water, 0, 3.11, 0, 1.19, .035, 1.19, barrel);
  instrumentMesh(cylinder, palette.amber, 0, -.4, 0, 1.46, .25, 1.46, barrel);
  instrumentMesh(box, palette.dark, 0, -2.8, 0, .7, 1.6, .7, barrel);
  const sight = instrumentMesh(torus, palette.metal, 0, 0, 0, 4, 4, 4, gimbal);
  sight.rotation.y = Math.PI / 2;
  instrumentMesh(box, palette.amber, 0, 4, 0, .5, .28, .35, gimbal);

  function upload() {
    for (const [kind, { mesh, perSlot }] of batches) {
      let offset = 0;
      for (const slot of slots) {
        const source = slot.data.get(kind);
        if (source.length / 16 > perSlot) throw new RangeError(`Environment ${kind} capacity exceeded`);
        const dx = (slot.x - centerX) * SIZE, dz = (slot.z - centerZ) * SIZE;
        mesh.instanceMatrix.array.set(source, offset);
        for (let i = offset; i < offset + source.length; i += 16) {
          mesh.instanceMatrix.array[i + 12] += dx;
          mesh.instanceMatrix.array[i + 14] += dz;
        }
        offset += source.length;
      }
      mesh.count = offset / 16;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    }
  }
  function update(position, time) {
    if (disposed) return;
    if (!position || ![position.x, position.y, position.z, time].every(Number.isFinite)) {
      throw new TypeError('Environment update requires a finite position and time in seconds');
    }
    const cx = Math.floor((position.x + SIZE / 2) / SIZE);
    const cz = Math.floor((position.z + SIZE / 2) / SIZE);
    if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz) ||
      Math.abs(cx) > Number.MAX_SAFE_INTEGER - RADIUS || Math.abs(cz) > Number.MAX_SAFE_INTEGER - RADIUS ||
      !Number.isFinite(Math.abs(position.y) * 8)) {
      throw new RangeError('Environment position exceeds coordinate precision');
    }
    if (cx !== centerX || cz !== centerZ) {
      centerX = cx; centerZ = cz;
      group.position.set(cx * SIZE, 0, cz * SIZE);
      for (const [key, slot] of active) {
        if (Math.abs(slot.x - cx) > RADIUS || Math.abs(slot.z - cz) > RADIUS) {
          active.delete(key); slot.key = null;
        }
      }
      const available = slots.filter(slot => slot.key === null);
      for (let z = cz - RADIUS; z <= cz + RADIUS; z++) {
        for (let x = cx - RADIUS; x <= cx + RADIUS; x++) {
          const key = `${x},${z}`;
          if (!active.has(key)) {
            const slot = available.pop();
            fillSlot(slot, x, z);
            active.set(key, slot);
          }
        }
      }
      upload();
    }
    horizon.scale.setScalar(Math.max(8192, Math.abs(position.y) * 8));
    instrument.visible = active.has('-1,0');
    instrument.position.set(-68 - cx * SIZE, 7.4, -47 - cz * SIZE);
    gimbal.rotation.y = -.5 + Math.sin(time * .085) * .23;
    palette.light.emissiveIntensity = .58 + Math.sin(time * .6) * .08;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    for (const { mesh } of batches.values()) mesh.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const mat of materials) mat.dispose();
    group.clear();
    active.clear();
    for (const slot of slots) for (const data of slot.data.values()) data.length = 0;
    batches.clear(); geometries.clear(); materials.clear();
  }
  update(new T.Vector3(), 0);
  return { group, update, dispose, get chunkCount() { return active.size; } };
}
