import { GLTFLoader } from '../vendor/runtime.mjs';

// The central route stays level for the existing movement rules. Relief and
// photogrammetry replace the old rectangular arena around that route.
export function createEnvironment({ T, scene, renderer, touchDevice, random, put, material, geo, mats, torches }) {
  const textureLoader = new T.TextureLoader();
  const assetUrl = path => new URL(`./assets/${path}`, import.meta.url).href;
  const surface = (id, repeatX, repeatY) => {
    const get = kind => {
      const texture = textureLoader.load(assetUrl(`surfaces/${id}_${kind}${touchDevice ? '_mobile' : ''}.jpg`));
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    };
    const map = get('diffuse'); map.colorSpace = T.SRGBColorSpace;
    return material(0xffffff, { map, normalMap: get('nor_gl'), roughnessMap: get('rough'), roughness: 1 });
  };
  const groundMat = surface('rocky_terrain_03', 11, 18);
  const masonry = surface('old_stone_wall_02', 1, 1);
  const pathStone = material(0x5e5a54, { map: masonry.map, normalMap: masonry.normalMap,
    roughnessMap: masonry.roughnessMap, roughness: 1 });
  const weatheredMetal = material(0x695d50, { metalness: .52, roughness: .54 });
  const nightStone = material(0x364047, { roughness: .94 });
  const bronze = material(0xa9784e, { metalness: .65, roughness: .35 });
  const amber = material(0xffb778, { emissive: 0xf06931, emissiveIntensity: 2.8 });

  const relief = (x, z) => {
    const away = Math.max(0, Math.abs(x) - 16);
    const cliff = Math.pow(away / 8, 1.42) * 2.4;
    const swell = (Math.sin(z * .16 + x * .23) + Math.cos(z * .087 - x * .31)) * Math.min(1, away / 9) * 1.1;
    const far = Math.max(0, -z - 91) * .075;
    return Math.max(0, cliff + swell + far) - .08;
  };
  const terrainGeometry = new T.PlaneGeometry(130, 200, 104, 160);
  terrainGeometry.rotateX(-Math.PI / 2);
  const position = terrainGeometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i) - 35;
    position.setY(i, relief(x, z));
  }
  position.needsUpdate = true;
  terrainGeometry.computeVertexNormals();
  const terrain = put(terrainGeometry, groundMat, 0, 0, -35);
  terrain.castShadow = false;

  // A broken, asymmetric sanctuary is recognizable as architecture without
  // enclosing the player in repetitive box walls.
  const column = (x, z, height, tilt = 0) => {
    const group = new T.Group(); group.position.set(x, .05, z); group.rotation.z = tilt; scene.add(group);
    put(new T.CylinderGeometry(.75, 1.1, height, 12), masonry, 0, height / 2, 0, group);
    put(new T.CylinderGeometry(1.18, 1.28, .26, 12), masonry, 0, .13, 0, group);
    put(new T.CylinderGeometry(1.04, 1, .28, 12), masonry, 0, height - .1, 0, group);
    put(new T.TorusGeometry(.98, .045, 6, 24), bronze, 0, height - .37, 0, group).rotation.x = Math.PI / 2;
    return group;
  };
  const gateLeft = column(-4.8, -28, 8.4, -.035);
  const gateRight = column(4.8, -28, 8.4, .045);
  const lintel = put(new T.BoxGeometry(10.8, 1.25, 2.2), masonry, 0, 8.25, -28);
  lintel.rotation.z = -.018;
  for (const [x, z, h, tilt] of [
    [-12.8, 17, 5.2, .07], [13.7, 12, 6.6, -.09], [-14.1, -3, 4.3, -.14],
    [13.2, -10, 3.8, .12], [-13.5, -24, 6.3, -.06], [12.9, -26, 5.4, .1],
    [-11.7, -47, 4.1, .12], [11.9, -62, 5.8, -.08],
  ]) column(x, z, h, tilt);
  for (let i = 0; i < 25; i++) {
    const x = (random() - .5) * 13, z = 23 - i * 4.6;
    const radius = .65 + random() * 1.1;
    const slab = put(new T.CylinderGeometry(radius, radius * 1.05, .055, 5 + Math.floor(random() * 3)), pathStone,
      x, -.015, z);
    slab.rotation.y = (random() - .5) * .6;
    slab.castShadow = false;
  }

  const modelLoader = new GLTFLoader();
  const modelPlacements = {
    boulder_01: Array.from({ length: touchDevice ? 9 : 18 }, (_, i) => ({
      x: (i % 2 ? 1 : -1) * (18 + random() * 19), z: 29 - random() * 132,
      height: 2.3 + random() * 6.1, yaw: random() * Math.PI * 2,
    })),
    dead_tree_trunk: Array.from({ length: touchDevice ? 5 : 11 }, (_, i) => ({
      x: (i % 2 ? 1 : -1) * (19 + random() * 19), z: 30 - random() * 125,
      height: 4 + random() * 5, yaw: random() * Math.PI * 2,
    })),
    gothic_statue: [
      { x: -8.3, z: -26, height: 5.4, yaw: .35 },
      { x: 8.3, z: -26, height: 5.4, yaw: -.35 },
      { x: -9, z: -5, height: 4.5, yaw: 0 },
      { x: 0, z: -15, height: 4.5, yaw: 0 },
      { x: 9, z: -5, height: 4.5, yaw: 0 },
    ],
  };
  let modelsReady = 0;
  for (const [id, placements] of Object.entries(modelPlacements)) {
    modelLoader.load(assetUrl(`models/${id}/${id}_1k.gltf`), ({ scene: source }) => {
      // Poly Haven's dead trunk is authored along X. Stand it on end before
      // normalising its height, otherwise its tiny Y extent makes a giant slab.
      const oriented = source.clone(true);
      if (id === 'dead_tree_trunk') oriented.rotation.z = Math.PI / 2;
      const bounds = new T.Box3().setFromObject(oriented);
      const size = bounds.getSize(new T.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) return;
      for (const placement of placements) {
        const root = new T.Group();
        const copy = oriented.clone(true);
        copy.position.set(-bounds.min.x - size.x / 2, -bounds.min.y, -bounds.min.z - size.z / 2);
        copy.traverse(node => {
          if (node.isMesh) { node.castShadow = !touchDevice && id === 'gothic_statue'; node.receiveShadow = true; }
        });
        root.add(copy);
        root.position.set(placement.x, relief(placement.x, placement.z), placement.z);
        root.scale.setScalar(placement.height / size.y);
        root.rotation.y = placement.yaw;
        scene.add(root);
      }
      modelsReady++;
      document.body.dataset.worldAssets = `${modelsReady}/3`;
    }, undefined, error => { console.warn(`ASHBOUND world asset ${id} unavailable`, error); });
  }

  scene.background = new T.Color(0x081522);
  scene.fog = new T.FogExp2(0x172837, .0075);
  const sky = put(new T.SphereGeometry(350, 32, 20), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vWorld; void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vWorld; void main(){float h=clamp(vWorld.y/350.,-1.,1.);vec3 zenith=vec3(.018,.045,.075);vec3 horizon=vec3(.24,.25,.27);vec3 ash=vec3(.09,.10,.13);vec3 c=mix(horizon,zenith,smoothstep(-.1,.72,h));c=mix(ash,c,smoothstep(-.8,.03,h));gl_FragColor=vec4(c,1.);}',
  }), 0, 0, -35);
  mats.push(sky.material);
  sky.castShadow = false; sky.receiveShadow = false;
  const moonOrb = put(new T.SphereGeometry(10, 32, 20), material(0xbdd3e0, {
    emissive: 0x94b8cf, emissiveIntensity: .75, roughness: 1,
  }), -85, 65, -220);
  moonOrb.castShadow = false;
  scene.add(new T.HemisphereLight(0xaac9dd, 0x282027, 1.5));
  const moon = new T.DirectionalLight(0xc6dbeb, 3.5);
  moon.position.set(-28, 54, -47); moon.castShadow = true;
  moon.shadow.mapSize.set(touchDevice ? 1024 : 2048, touchDevice ? 1024 : 2048);
  Object.assign(moon.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 135 });
  moon.shadow.normalBias = .025; scene.add(moon);

  for (const [x, z] of [[-11.5, 21], [12, 17], [-13, 3], [12, -4], [-11.7, -16], [11.8, -20]]) {
    put(new T.CylinderGeometry(.38, .55, 1.7, 10), weatheredMetal, x, .86, z);
    put(new T.CylinderGeometry(.72, .44, .26, 10), bronze, x, 1.77, z);
    put(new T.SphereGeometry(.32, 10, 8), amber, x, 1.98, z);
    const light = new T.PointLight(0xffac6d, touchDevice ? 2.5 : 4.2, 12, 2);
    light.position.set(x, 2.1, z); scene.add(light); torches.push(light);
  }
  const beaconStone = material(0x525c61, { roughness: .9 });
  const beacon = put(new T.CylinderGeometry(.7, 1.5, 11, 12), beaconStone, 0, 5.5, -75);
  beacon.castShadow = true;
  put(new T.CylinderGeometry(1.6, 1, .85, 12), bronze, 0, 11.2, -75);
  const beaconCore = put(new T.IcosahedronGeometry(1.15, 2), amber, 0, 12.6, -75);
  const beaconLight = new T.PointLight(0xff9c63, 15, 42, 2);
  beaconLight.position.set(0, 12.4, -75); scene.add(beaconLight);

  const rubbleGeometry = new T.DodecahedronGeometry(.42, 1); geo.push(rubbleGeometry);
  const rubble = new T.InstancedMesh(rubbleGeometry, masonry, touchDevice ? 75 : 170);
  rubble.castShadow = !touchDevice; rubble.receiveShadow = true;
  const dummy = new T.Object3D();
  for (let i = 0; i < rubble.count; i++) {
    const x = (i % 2 ? 1 : -1) * (12 + random() * 11), z = 29 - random() * 131;
    dummy.position.set(x, relief(x, z) + .16, z);
    dummy.rotation.set(random() * 3, random() * 6, random() * 3);
    dummy.scale.setScalar(.35 + random() * 2.1); dummy.updateMatrix();
    rubble.setMatrixAt(i, dummy.matrix);
  }
  scene.add(rubble);
  const motes = new Float32Array((touchDevice ? 100 : 240) * 3);
  for (let i = 0; i < motes.length / 3; i++) {
    motes[i * 3] = (random() - .5) * 65;
    motes[i * 3 + 1] = .5 + random() * 12;
    motes[i * 3 + 2] = 32 - random() * 145;
  }
  const moteGeometry = new T.BufferGeometry(); moteGeometry.setAttribute('position', new T.BufferAttribute(motes, 3)); geo.push(moteGeometry);
  const moteMaterial = new T.PointsMaterial({ color: 0xf4c390, size: .10, transparent: true, opacity: .72, depthWrite: false }); mats.push(moteMaterial);
  const moteField = new T.Points(moteGeometry, moteMaterial); scene.add(moteField);

  return { terrain, groundMat, masonry, beaconCore, moteField, gateLeft, gateRight };
}
