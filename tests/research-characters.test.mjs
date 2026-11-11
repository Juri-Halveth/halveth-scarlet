// HALVETH PIRL 2.0. Tests use authored miniature rigs and CC0 asset manifests.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { THREE } from "../assets/entity-vendor/runtime.mjs";
import { restPose, retargetClip } from "../entities/research/retarget.mjs";
const root = new URL("../entities/research/characters/", import.meta.url);
const manifest = JSON.parse(
  fs.readFileSync(new URL("manifest.json", root), "utf8"),
);
const hash = (b) => createHash("sha256").update(b).digest("hex");
function glb(b) {
  assert.equal(b.readUInt32LE(0), 0x46546c67);
  assert.equal(b.readUInt32LE(4), 2);
  assert.equal(b.readUInt32LE(8), b.length);
  const jsonLength = b.readUInt32LE(12);
  assert.equal(b.readUInt32LE(16), 0x4e4f534a);
  const d = JSON.parse(b.subarray(20, 20 + jsonLength));
  const binLength = b.readUInt32LE(20 + jsonLength);
  assert.equal(b.readUInt32LE(24 + jsonLength), 0x004e4942);
  assert.equal(b.length, 28 + jsonLength + binLength);
  assert.ok(d.buffers[0].byteLength <= binLength);
  return d;
}
function topology(d) {
  const ids = new Set(d.skins.flatMap((s) => s.joints));
  return Object.fromEntries(
    [...ids].map((i) => [
      d.nodes[i].name,
      (d.nodes[i].children ?? [])
        .filter((n) => ids.has(n))
        .map((n) => d.nodes[n].name)
        .sort(),
    ]),
  );
}

test("the five compiled assets match their manifest and contain embedded resources only", () => {
  assert.equal(manifest.license, "CC0-1.0");
  assert.equal(manifest.variants.length, 2);
  assert.equal(manifest.animationNames.length, 43);
  assert.equal(new Set(manifest.animationNames).size, 43);
  const files = new Map();
  for (const r of manifest.files) {
    assert.match(r.path, /^[a-z-]+\.glb$/);
    const b = fs.readFileSync(new URL(r.path, root));
    assert.equal(b.length, r.bytes);
    assert.equal(hash(b), r.sha256);
    const d = glb(b);
    for (const image of d.images ?? []) {
      assert.equal(image.uri, undefined);
      assert.equal(image.mimeType, "image/png");
      assert.ok(Number.isInteger(image.bufferView));
    }
    for (const buffer of d.buffers) assert.equal(buffer.uri, undefined);
    files.set(r.path, d);
  }
  const animation = files.get("animations.glb");
  assert.deepEqual(
    animation.animations.map((a) => a.name),
    manifest.animationNames,
  );
  for (const variant of manifest.variants)
    for (const part of variant.parts) {
      assert.deepEqual(topology(files.get(part)), topology(animation));
      assert.equal(Object.keys(topology(files.get(part))).length, 65);
    }
});

test("derived heads record a nonempty strict triangle subset and omitted material channels", () => {
  for (const r of manifest.files.filter((f) => f.path.endsWith("-head.glb"))) {
    assert.equal(
      r.transformation.kind,
      "DERIVED_HEAD_BY_DECLARED_POSITION_FILTER",
    );
    for (const d of r.transformation.details) {
      assert.ok(d.retainedTriangles > 0);
      assert.ok(d.retainedTriangles < d.originalTriangles);
    }
    assert.equal(
      r.transformation.materialPreview.retainedImageEncoding,
      "EXACT_SOURCE_BYTES",
    );
    assert.ok(r.transformation.materialPreview.omittedChannels.length);
  }
});

function rig(position, rotation) {
  const g = new THREE.Group(),
    bone = new THREE.Bone();
  bone.name = "joint";
  bone.position.copy(position);
  bone.quaternion.copy(rotation);
  g.add(bone);
  return g;
}
test("retargeting maps the source bind pose to the target bind pose without changing source tracks", () => {
  const sp = new THREE.Vector3(0, 1, 0),
    tp = new THREE.Vector3(0, 2, 0),
    sq = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      0.4,
    ),
    tq = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      0.7,
    );
  const original = new THREE.AnimationClip("bind", 1, [
    new THREE.QuaternionKeyframeTrack(
      "joint.quaternion",
      [0, 1],
      [...sq.toArray(), ...sq.toArray()],
    ),
    new THREE.VectorKeyframeTrack(
      "joint.position",
      [0, 1],
      [0, 1, 0, 0, 1.5, 0],
    ),
  ]);
  const before = original.tracks.map((t) => [...t.values]);
  const result = retargetClip(
    original,
    restPose(rig(sp, sq)),
    restPose(rig(tp, tq)),
  );
  assert.ok(
    new THREE.Quaternion().fromArray(result.tracks[0].values).angleTo(tq) <
      1e-6,
  );
  assert.deepEqual([...result.tracks[1].values], [0, 2, 0, 0, 3, 0]);
  assert.deepEqual(
    original.tracks.map((t) => [...t.values]),
    before,
  );
});

test("unbound animation joints and changed skeleton topology fail explicitly", () => {
  const a = restPose(rig(new THREE.Vector3(), new THREE.Quaternion())),
    b = new Map(a);
  b.set("joint", { ...a.get("joint"), parent: "another" });
  const clip = new THREE.AnimationClip("bad", 1, [
    new THREE.VectorKeyframeTrack("missing.position", [0], [0, 0, 0]),
  ]);
  assert.throws(() => retargetClip(clip, a, b), /topology/);
  assert.throws(() => retargetClip(clip, a, a), /Unbound/);
});

test("vendored loader imports and license receipts bind the adapted code", () => {
  const base = new URL("../entities/research/vendor/", import.meta.url),
    notice = JSON.parse(fs.readFileSync(new URL("NOTICE.json", base), "utf8"));
  assert.ok(
    fs
      .readFileSync(new URL("three.LICENSE.txt", base), "utf8")
      .includes("MIT License"),
  );
  assert.ok(
    fs
      .readFileSync(new URL("GLTFLoader.js", base), "utf8")
      .includes("../../../assets/entity-vendor/runtime.mjs"),
  );
  assert.equal(notice.version, "three-0.186.0");
  for (const r of notice.files) {
    assert.equal(hash(fs.readFileSync(new URL(r.file, base))), r.derivedSha256);
    assert.match(r.upstream, /^https:\/\/unpkg\.com\/three@0\.186\.0\//);
  }
});
