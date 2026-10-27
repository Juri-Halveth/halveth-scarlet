// Original HALVETH adapter: HALVETH PIRL 2.0. Three.js objects use MIT.
import { THREE } from "../../assets/entity-vendor/runtime.mjs";

export function restPose(scene) {
  const result = new Map();
  scene.traverse((n) => {
    if (n.isBone) {
      if (result.has(n.name)) throw Error("Duplicate joint");
      result.set(n.name, {
        position: n.position.clone(),
        quaternion: n.quaternion.clone(),
        scale: n.scale.clone(),
        parent: n.parent?.isBone ? n.parent.name : null,
      });
    }
  });
  return result;
}

export function retargetClip(clip, sourceRest, targetRest) {
  if (sourceRest.size !== targetRest.size) throw Error("Joint count differs");
  for (const [name, s] of sourceRest) {
    const t = targetRest.get(name);
    if (!t || s.parent !== t.parent)
      throw Error("Joint topology differs: " + name);
  }
  const tracks = clip.tracks.map((track) => {
    const dot = track.name.lastIndexOf("."),
      name = track.name.slice(0, dot),
      property = track.name.slice(dot + 1);
    const s = sourceRest.get(name),
      t = targetRest.get(name);
    if (!s || !t) throw Error("Unbound animation joint: " + name);
    const values = new Float32Array(track.values.length);
    if (property === "quaternion") {
      const correction = t.quaternion
          .clone()
          .multiply(s.quaternion.clone().invert()),
        q = new THREE.Quaternion();
      for (let i = 0; i < values.length; i += 4) {
        q.fromArray(track.values, i)
          .premultiply(correction)
          .normalize()
          .toArray(values, i);
      }
    } else if (property === "position") {
      const ratio =
        s.position.length() > 1e-6
          ? t.position.length() / s.position.length()
          : 1;
      for (let i = 0; i < values.length; i += 3)
        for (let a = 0; a < 3; a++)
          values[i + a] =
            t.position.getComponent(a) +
            (track.values[i + a] - s.position.getComponent(a)) * ratio;
    } else if (property === "scale") {
      for (let i = 0; i < values.length; i += 3)
        for (let a = 0; a < 3; a++) {
          const d = s.scale.getComponent(a);
          if (Math.abs(d) < 1e-8) throw Error("Singular bind scale");
          values[i + a] = (t.scale.getComponent(a) * track.values[i + a]) / d;
        }
    } else throw Error("Unsupported track property: " + property);
    const copy = track.clone();
    copy.values = values;
    return copy;
  });
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
