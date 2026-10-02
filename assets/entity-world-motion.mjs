import { THREE as T } from './entity-vendor/runtime.mjs';

function seedOf(id) {
  let seed = 2166136261;
  for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return seed;
}

// Reversible choreography: each sample is derived from ID and scene time, not an agent decision.
export function createRoamingPaths(entities) {
  const stable = [...entities].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  return entities.map(entity => {
    const index = stable.indexOf(entity), seed = seedOf(entity.id);
    const phase = seed / 4294967296 * Math.PI * 2;
    const angle = index * 2.399963229728653;
    const radius = entity.id === 'scarlet' ? 0 : 6 + Math.sqrt((index + 1) / entities.length) * 27;
    const home = new T.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    const points = Array.from({ length: 9 }, (_, i) => {
      const a = i / 9 * Math.PI * 2;
      const r = 3.2 + (seed % 500) / 140 + Math.sin(a * 3 + phase) * .8;
      return new T.Vector3(home.x + Math.cos(a) * r, 0, home.z + Math.sin(a) * r * .8);
    });
    const curve = new T.CatmullRomCurve3(points, true, 'centripetal');
    curve.arcLengthDivisions = 240;
    const speed = .8 + (seed % 400) / 650;
    return { id: entity.id, curve, length: curve.getLength(), speed, phase, offset: entity.id === 'scarlet' ? 0 : seed % 20 };
  });
}

export function sampleRoamingPath(route, time, position = new T.Vector3(), tangent = new T.Vector3()) {
  if (!Number.isFinite(time)) throw new Error('Scene time must be finite');
  const shifted = time + route.offset;
  const cycle = Math.floor(shifted / 25), within = shifted - cycle * 25;
  const walking = within < 22;
  const distance = (cycle * 22 + Math.min(within, 22)) * route.speed;
  const progress = T.MathUtils.euclideanModulo(distance / route.length, 1);
  route.curve.getPointAt(progress, position);
  route.curve.getTangentAt(progress, tangent);
  return { position, heading: Math.atan2(tangent.x, tangent.z), walking, speed: route.speed, phase: distance * 5.3 };
}
