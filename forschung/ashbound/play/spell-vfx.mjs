// Spell geometry is world-space, tied to the actual mechanics in game-core.
// No overlay image is substituted for a spell or an impact in the 3D scene.
export function createSpellVfx({ T, scene, camera, reducedMotion, playerPosition }) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(.22, 'rgba(255,255,255,.8)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64);
  const spriteMap = new T.CanvasTexture(canvas);
  const active = [];
  const ball = (color, scale, material) => {
    const sprite = new T.Sprite(material);
    sprite.scale.set(scale, scale, scale);
    scene.add(sprite); return sprite;
  };
  const spriteMaterial = color => new T.SpriteMaterial({
    map: spriteMap, color, transparent: true, opacity: 1,
    blending: T.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const ring = (color, inner, outer) => {
    const geometry = new T.RingGeometry(inner, outer, 72);
    const material = new T.MeshBasicMaterial({ color, transparent: true, opacity: .55,
      blending: T.AdditiveBlending, side: T.DoubleSide, depthWrite: false, toneMapped: false });
    const mesh = new T.Mesh(geometry, material); scene.add(mesh);
    return mesh;
  };
  const release = effect => {
    for (const object of effect.objects) scene.remove(object);
    for (const resource of effect.resources) resource.dispose();
    active.splice(active.indexOf(effect), 1);
  };
  function pulse(to, color, now) {
    const direction = camera.getWorldDirection(new T.Vector3());
    const from = camera.position.clone().add(direction.multiplyScalar(.8));
    from.y -= .12;
    const mid = from.clone().lerp(to, .55); mid.y += 1.8;
    const curve = new T.QuadraticBezierCurve3(from, mid, to);
    const material = spriteMaterial(color);
    const core = ball(color, .82, material);
    const trail = Array.from({ length: reducedMotion ? 4 : 18 }, (_, i) => ball(color, .36 * (1 - i / 22), material));
    const light = new T.PointLight(color, 6, 8, 2); scene.add(light);
    const impact = ring(color, .76, .89); impact.visible = false;
    active.push({ kind: 'pulse', at: now, duration: reducedMotion ? 430 : 720,
      curve, core, trail, light, impact,
      objects: [core, ...trail, light, impact],
      resources: [material, impact.geometry, impact.material],
    });
  }
  function echo(position, now) {
    const rings = Array.from({ length: reducedMotion ? 1 : 3 }, (_, i) => {
      const mesh = ring(0x74f5df, .94, 1.03);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(position.x, .085 + i * .015, position.z);
      return mesh;
    });
    active.push({ kind: 'echo', at: now, duration: 1550, rings,
      objects: rings, resources: rings.flatMap(mesh => [mesh.geometry, mesh.material]) });
  }
  function still(position, now, until) {
    const geometry = new T.SphereGeometry(1, 24, 16);
    const material = new T.MeshBasicMaterial({ color: 0x75b6ff, transparent: true,
      opacity: .065, blending: T.AdditiveBlending,
      side: T.BackSide, depthWrite: false, toneMapped: false });
    const dome = new T.Mesh(geometry, material);
    dome.position.set(position.x, 1.7, position.z); scene.add(dome);
    const orbit = [0, 1, 2].map((_, i) => {
      const mesh = ring(0x829fff, 1, 1.035);
      mesh.position.copy(dome.position);
      mesh.rotation.set(i * .8, i * 1.2, i * .48);
      return mesh;
    });
    const light = new T.PointLight(0x7c9fff, 2.8, 14, 2);
    light.position.copy(dome.position); scene.add(light);
    active.push({ kind: 'still', at: now, duration: Math.max(700, until - now), dome, orbit, light,
      objects: [dome, ...orbit, light], resources: [geometry, material, ...orbit.flatMap(mesh => [mesh.geometry, mesh.material])],
    });
  }
  function tick(now) {
    for (const effect of [...active]) {
      const t = Math.min(1, (now - effect.at) / effect.duration);
      if (t >= 1) { release(effect); continue; }
      if (effect.kind === 'pulse') {
        const flight = Math.min(1, t / .73);
        effect.core.position.copy(effect.curve.getPoint(flight));
        effect.core.scale.setScalar(.65 + Math.sin(flight * Math.PI) * .45);
        effect.light.position.copy(effect.core.position);
        effect.light.intensity = flight < 1 ? 5.8 : 0;
        effect.core.visible = flight < 1;
        effect.trail.forEach((particle, i) => {
          const path = Math.max(0, flight - (i + 1) * .025);
          particle.position.copy(effect.curve.getPoint(path));
          particle.position.x += Math.sin(now * .014 + i * 2) * (.035 + i * .012);
          particle.position.y += Math.cos(now * .012 + i * 3) * (.035 + i * .012);
          particle.visible = path > 0 && flight < 1;
        });
        if (flight >= 1) {
          effect.impact.visible = true;
          effect.impact.position.copy(effect.curve.getPoint(1));
          effect.impact.lookAt(camera.position);
          const impactT = (t - .73) / .27;
          effect.impact.scale.setScalar(.4 + impactT * 4.5);
          effect.impact.material.opacity = (1 - impactT) * .72;
        }
      } else if (effect.kind === 'echo') {
        effect.rings.forEach((mesh, i) => {
          const wave = Math.max(0, Math.min(1, (t - i * .14) / (1 - i * .14)));
          mesh.visible = wave > 0;
          mesh.scale.setScalar(.3 + wave * 26);
          mesh.material.opacity = (1 - wave) * .62;
        });
      } else {
        const position = playerPosition();
        effect.dome.position.set(position.x, 1.7, position.z);
        for (const mesh of effect.orbit) mesh.position.copy(effect.dome.position);
        effect.light.position.copy(effect.dome.position);
        const radius = 9 * Math.min(1, t * 8);
        effect.dome.scale.setScalar(radius);
        effect.dome.material.opacity = (1 - t * .6) * .055;
        effect.orbit.forEach((mesh, i) => {
          mesh.scale.setScalar(radius * (.86 + i * .05));
          if (!reducedMotion) mesh.rotation.z += .009 * (i % 2 ? -1 : 1);
          mesh.material.opacity = (1 - t * .8) * .17;
        });
        effect.light.intensity = (1 - t) * 2.8;
      }
    }
  }
  function dispose() { for (const effect of [...active]) release(effect); spriteMap.dispose(); }
  return { pulse, echo, still, tick, dispose };
}
