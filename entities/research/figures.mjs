// Original HALVETH viewer: HALVETH PIRL 2.0. Quaternius models: CC0-1.0.
import { THREE, OrbitControls } from "../../assets/entity-vendor/runtime.mjs";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { restPose, retargetClip } from "./retarget.mjs";
const $ = (id) => document.getElementById(id);
const allowedFiles = new Set([
  "female-head.glb",
  "female-outfit.glb",
  "male-head.glb",
  "male-outfit.glb",
  "animations.glb",
]);
const digest = async (b) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", b)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
const motionLabels = {
  A_TPose: "Bindepose",
  Crouch_Fwd_Loop: "Geduckt gehen",
  Crouch_Idle_Loop: "Geduckt warten",
  Dance_Loop: "Tanzen",
  Death01: "Zusammenbrechen",
  Driving_Loop: "Fahren",
  Fixing_Kneeling: "Kniend reparieren",
  Hit_Chest: "Treffer am Oberkörper",
  Hit_Head: "Treffer am Kopf",
  Idle_Loop: "Stehen und atmen",
  Idle_Talking_Loop: "Im Stehen sprechen",
  Idle_Torch_Loop: "Fackel halten",
  Interact: "Etwas erreichen",
  Jog_Fwd_Loop: "Locker laufen",
  Jump_Land: "Sprung · landen",
  Jump_Loop: "Sprung · in der Luft",
  Jump_Start: "Sprung · abspringen",
  PickUp_Table: "Etwas vom Tisch nehmen",
  Pistol_Aim_Down: "Pistole · nach unten zielen",
  Pistol_Aim_Neutral: "Pistole · geradeaus zielen",
  Pistol_Aim_Up: "Pistole · nach oben zielen",
  Pistol_Idle_Loop: "Pistole · halten",
  Pistol_Reload: "Pistole · nachladen",
  Pistol_Shoot: "Pistole · schießen",
  Punch_Cross: "Boxen · Schlag über Kreuz",
  Punch_Jab: "Boxen · Gerade",
  Push_Loop: "Schieben",
  Roll: "Rollen",
  Sitting_Enter: "Hinsetzen",
  Sitting_Exit: "Aufstehen",
  Sitting_Idle_Loop: "Sitzen",
  Sitting_Talking_Loop: "Im Sitzen sprechen",
  Spell_Simple_Enter: "Zauber · vorbereiten",
  Spell_Simple_Exit: "Zauber · beenden",
  Spell_Simple_Idle_Loop: "Zauber · halten",
  Spell_Simple_Shoot: "Zauber · auslösen",
  Sprint_Loop: "Sprinten",
  Swim_Fwd_Loop: "Schwimmen",
  Swim_Idle_Loop: "Im Wasser warten",
  Sword_Attack: "Schwert · angreifen",
  Sword_Idle: "Schwert · halten",
  Walk_Formal_Loop: "Förmlich gehen",
  Walk_Loop: "Gehen",
};

function disposeResources(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set(),
    images = new Set();
  root.traverse((n) => {
    if (n.geometry) geometries.add(n.geometry);
    if (n.material)
      for (const m of Array.isArray(n.material) ? n.material : [n.material])
        materials.add(m);
  });
  for (const m of materials)
    for (const value of Object.values(m))
      if (value?.isTexture) {
        textures.add(value);
        if (value.source?.data) images.add(value.source.data);
      }
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  for (const image of images) image.close?.();
  for (const material of materials) material.dispose();
}

export async function createFigureAtelier() {
  const wrap = $("figure-stage"),
    status = $("figure-status");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor("#14232d");
  renderer.domElement.id = "figure-canvas";
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "Drehbare Vorschau einer stilisierten menschlichen Spielfigur",
  );
  wrap.append(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  camera.position.set(2.4, 1.6, 4.1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.92, 0);
  controls.enableDamping = true;
  controls.minDistance = 1.3;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI * 0.52;
  scene.add(new THREE.HemisphereLight(0xd7f6ff, 0x62604d, 2.8));
  const key = new THREE.DirectionalLight(0xffe3b7, 3.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x85cbd7, 1.5);
  rim.position.set(-3, 2, -3);
  scene.add(rim);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 80),
    new THREE.MeshStandardMaterial({ color: 0x243a42, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.012;
  scene.add(ground);
  const grid = new THREE.GridHelper(5, 20, 0x48646b, 0x2b444d);
  grid.position.y = -0.008;
  scene.add(grid);
  const lifetime = new AbortController(),
    ownedScenes = new Set();
  const on = (node, event, handler) =>
    node.addEventListener(event, handler, { signal: lifetime.signal });
  const cleanup = () => {
    lifetime.abort();
    controls.dispose();
    for (const model of ownedScenes) {
      model.removeFromParent();
      disposeResources(model);
    }
    ownedScenes.clear();
    disposeResources(scene);
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
  try {
    const loader = new GLTFLoader(),
      manifest = await fetch(
        new URL("./characters/manifest.json", import.meta.url),
        { signal: AbortSignal.timeout(12000) },
      ).then((r) => {
        if (!r.ok) throw Error("Manifest fehlt");
        return r.json();
      });
    if (
      manifest.schema !== "halveth.character-pilot.v1" ||
      manifest.variants.length !== 2
    )
      throw Error("Unbekannter Figurenvertrag");
    const records = new Map(manifest.files.map((f) => [f.path, f]));
    async function loadFile(name) {
      if (!allowedFiles.has(name) || !records.has(name))
        throw Error("Ungebundene Modelldatei");
      const response = await fetch(
        new URL("./characters/" + name, import.meta.url),
        { signal: AbortSignal.timeout(60000) },
      );
      if (!response.ok) throw Error("Modelldatei fehlt");
      const bytes = await response.arrayBuffer(),
        record = records.get(name);
      if (
        bytes.byteLength !== record.bytes ||
        (await digest(bytes)) !== record.sha256
      )
        throw Error("Modellintegrität weicht ab");
      const parsed = await loader.parseAsync(
        bytes,
        new URL("./characters/", import.meta.url).href,
      );
      ownedScenes.add(parsed.scene);
      return parsed;
    }
    const library = await loadFile(manifest.animationSource),
      sourceRest = restPose(library.scene);
    let parts = [],
      mixers = [],
      actions = [],
      playing = false,
      active = true,
      generation = 0,
      visibleVariant = null,
      clipName = "Idle_Loop",
      last = null,
      time = 0,
      frame = null;
    const clockLabel = () => {
      renderer.domElement.dataset.animationTime = time.toFixed(4);
      renderer.domElement.dataset.animation = clipName;
      renderer.domElement.dataset.variant = visibleVariant ?? "LOADING";
    };
    function setPlaying(value) {
      playing = value;
      last = null;
      $("figure-play").textContent = value ? "Anhalten" : "Bewegung zeigen";
      $("figure-play").setAttribute("aria-pressed", String(value));
    }
    function dispose(partsToDispose) {
      for (const p of partsToDispose) {
        scene.remove(p);
        disposeResources(p);
        ownedScenes.delete(p);
      }
    }
    function setMotion() {
      const original = library.animations.find(
        (c) => c.name === $("figure-motion").value,
      );
      if (!original) throw Error("Unbekannte Bewegung");
      clipName = original.name;
      time = 0;
      actions = [];
      mixers = parts.map((p) => {
        const mixer = new THREE.AnimationMixer(p),
          adapted = retargetClip(original, sourceRest, p.userData.restPose),
          action = mixer.clipAction(adapted);
        action.play();
        mixer.update(0);
        actions.push(action);
        return mixer;
      });
      clockLabel();
      status.textContent =
        (motionLabels[clipName] ?? clipName) +
        " · " +
        manifest.animationNames.length +
        " Bewegungen im Paket. Gehen und Laufen bleiben in dieser Vorschau am Ort.";
    }
    async function setVariant() {
      const mine = ++generation,
        variant = manifest.variants.find(
          (v) => v.id === $("figure-variant").value,
        );
      if (!variant) throw Error("Unbekannte Figur");
      setPlaying(false);
      $("figure-play").disabled = true;
      $("figure-motion").disabled = true;
      $("figure-variant").disabled = true;
      status.textContent =
        variant.label + " wird geladen und per SHA-256 geprüft …";
      const results = await Promise.allSettled(variant.parts.map(loadFile));
      const loaded = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
      const failure = results.find((r) => r.status === "rejected");
      if (failure) {
        dispose(loaded.map((g) => g.scene));
        throw failure.reason;
      }
      if (mine !== generation) {
        dispose(loaded.map((g) => g.scene));
        return;
      }
      const next = loaded.map((g) => {
        const p = g.scene;
        p.userData.restPose = restPose(p);
        p.traverse((n) => {
          if (n.isMesh) n.frustumCulled = false;
        });
        return p;
      });
      // Retarget before replacing the previous visible variant.
      const original = library.animations.find(
        (c) => c.name === $("figure-motion").value,
      );
      try {
        for (const p of next)
          retargetClip(original, sourceRest, p.userData.restPose);
      } catch (e) {
        dispose(next);
        throw e;
      }
      for (const m of mixers) m.stopAllAction();
      dispose(parts);
      parts = next;
      visibleVariant = variant.id;
      for (const p of parts) scene.add(p);
      setMotion();
      $("figure-play").disabled = false;
      $("figure-motion").disabled = false;
      $("figure-variant").disabled = false;
    }
    on($("figure-speed"), "input", () => {
      $("figure-speed-value").textContent =
        Number($("figure-speed").value).toLocaleString("de") + "×";
    });
    const variantSelect = $("figure-variant");
    variantSelect.replaceChildren(
      ...manifest.variants.map((v) => new Option(v.label, v.id)),
    );
    const motion = $("figure-motion");
    motion.replaceChildren(
      ...manifest.animationNames.map(
        (name) => new Option(motionLabels[name] ?? name, name),
      ),
    );
    motion.value = clipName;
    const fail = (e) => {
      setPlaying(false);
      if (visibleVariant) {
        variantSelect.value = visibleVariant;
        variantSelect.disabled = false;
        $("figure-play").disabled = false;
        motion.disabled = false;
      }
      status.textContent =
        "Die Figur konnte nicht geladen werden: " +
        e.message +
        (visibleVariant ? ". Die bisherige Figur bleibt geladen." : "");
    };
    on(variantSelect, "change", () => setVariant().catch(fail));
    on(motion, "change", () => {
      try {
        setMotion();
      } catch (e) {
        fail(e);
      }
    });
    on($("figure-play"), "click", () => setPlaying(!playing));
    on($("figure-reset"), "click", () => {
      controls.reset();
      controls.target.set(0, 0.92, 0);
      camera.position.set(2.4, 1.6, 4.1);
      controls.update();
    });
    function render(now) {
      frame = null;
      if (!active) return;
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      if (playing) {
        const speed = Number($("figure-speed").value);
        time += dt * speed;
        for (const m of mixers) m.update(dt * speed);
        clockLabel();
      }
      const width = Math.max(1, wrap.clientWidth),
        height = Math.max(1, wrap.clientHeight);
      if (
        renderer.domElement.width !==
          Math.round(width * renderer.getPixelRatio()) ||
        renderer.domElement.height !==
          Math.round(height * renderer.getPixelRatio())
      ) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    }
    controls.saveState();
    await setVariant();
    frame = requestAnimationFrame(render);
    return {
      dispose() {
        active = false;
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        cleanup();
      },
      setActive(value) {
        active = value;
        if (!active) {
          setPlaying(false);
          if (frame !== null) cancelAnimationFrame(frame);
          frame = null;
        } else {
          last = null;
          if (frame === null) frame = requestAnimationFrame(render);
        }
      },
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
