// HALVETH PIRL 2.0. Counterexamples for declared models and dataset bindings.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  pulsarState,
  projectPoint,
  growthState,
  vortexState,
  waveValue,
  waveIntensity,
  filteredNodes,
  neighbors,
  nextModelTime,
  appendObservation,
} from "../entities/research/model.mjs";
import { validateGraph, canonical } from "../entities/research/contract.mjs";
const root = new URL("../", import.meta.url);
test("notes preserve unknown event time and reject malformed Unicode and unbound clocks", () => {
  const note = {
    nodeId: "research-pulsar",
    text: "Frühere Beobachtung",
    eventTime: "UNKNOWN",
  };
  const result = appendObservation([], note, "2026-10-27T14:00:00Z");
  assert.equal(result[0].eventTime, "UNKNOWN");
  assert.throws(() =>
    appendObservation([], { ...note, text: "\ud800" }, "2026-10-27T14:00:00Z"),
  );
  assert.throws(() => appendObservation([], note, "10/27/2026"));
  assert.throws(() => appendObservation([], note, "2026-02-31T14:00:00Z"));
  assert.throws(() =>
    appendObservation(
      [],
      { ...note, eventTime: "2026-10-28T14:00:00Z" },
      "2026-10-27T14:00:00Z",
    ),
  );
});
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, root), "utf8"));
const catalog = read("entities/research/catalog.json"),
  relations = read("entities/relations.json"),
  sources = read("entities/research/sources.json"),
  inventory = read("entities/INVENTORY_20261027.json");

test("the bound dataset resolves every endpoint, definition, source and inventory member", async () => {
  const r = await validateGraph(catalog, relations, sources, inventory);
  assert.equal(r.profiles, 68);
  assert.equal(catalog.branches.length, 26);
  assert.equal(catalog.satellites.length, 18);
});
test("changing an endpoint after recording a relation fails the digest binding", async () => {
  const c = structuredClone(catalog);
  c.branches[0].question += " changed";
  await assert.rejects(
    () => validateGraph(c, relations, sources, inventory),
    /Relationsendpunkt/,
  );
});
test("a renamed relation cannot silently become causal", async () => {
  const r = structuredClone(relations);
  r.definitions[0].causal = true;
  await assert.rejects(
    () => validateGraph(catalog, r, sources, inventory),
    /Relationsdefinition|Relationssemantik/,
  );
});

test("relation labels and semantic dimensions cannot drift from their declared definition", async () => {
  const mislabeled = structuredClone(relations);
  mislabeled.relations[0].relationType = "CAUSE";
  await assert.rejects(
    () => validateGraph(catalog, mislabeled, sources, inventory),
    /Relationssemantik/,
  );
  const wrongDimension = structuredClone(relations);
  wrongDimension.relations[0].leftEndpoint.semanticAddress.dimension =
    "PHYSICAL_DISTANCE";
  await assert.rejects(
    () => validateGraph(catalog, wrongDimension, sources, inventory),
    /Relationsendpunkt/,
  );
});
test("missing sources, colliding write domains and false totals are rejected", async () => {
  const s = structuredClone(sources);
  s.sources = s.sources.filter((x) => x.id !== "source-wood");
  await assert.rejects(
    () => validateGraph(catalog, relations, s, inventory),
    /Forschungskarte/,
  );
  const r = structuredClone(relations);
  r.relations[1].writeDomainId = r.relations[0].writeDomainId;
  await assert.rejects(
    () => validateGraph(catalog, r, sources, inventory),
    /Schreibadresse/,
  );
  const c = structuredClone(catalog);
  c.coverage.mainBranches = 27;
  await assert.rejects(
    () => validateGraph(c, relations, sources, inventory),
    /Bestandsangabe/,
  );
});
test("pulsar viewing geometry produces visibility and a missed beam with the same source", () => {
  assert.equal(pulsarState(0, 55).visible, true);
  assert.equal(pulsarState(0.25, 55).visible, false);
  assert.equal(pulsarState(0, 0).visible, false);
  assert.deepEqual(pulsarState(0, 55).beam, pulsarState(0, 0).beam);
  assert.ok(Math.abs(pulsarState(0, 55).dot - pulsarState(1, 55).dot) < 1e-12);
});
test("four projections preserve coordinates according to their declared operators", () => {
  const p = { x: 2, y: 3, z: 5 };
  assert.deepEqual(projectPoint(p, "front"), { x: 2, y: -5 });
  assert.deepEqual(projectPoint(p, "top"), { x: 2, y: 3 });
  assert.deepEqual(projectPoint(p, "side"), { x: 3, y: -5 });
  assert.deepEqual(projectPoint(p, "axonometric"), {
    x: 0.84 * 2 - 0.54 * 3,
    y: 0.32 * 2 + 0.5 * 3 - 0.78 * 5,
  });
  assert.throws(() => projectPoint(p, "unknown"));
  assert.throws(() => projectPoint({ x: 1, y: NaN, z: 0 }));
});
test("growth retains deposited coordinates while adding contours", () => {
  const a = growthState(0.3),
    b = growthState(0.9);
  assert.ok(b.length > a.length);
  for (let i = 0; i < a.length; i++) assert.deepEqual(a[i], b[i]);
  assert.equal(growthState(0).length, 1);
  assert.equal(growthState(1).length, 12);
});
test("vortex marker identity and radius survive motion, while positions change", () => {
  const a = vortexState(0),
    b = vortexState(0.5);
  assert.deepEqual(
    a.map((x) => x.id),
    b.map((x) => x.id),
  );
  for (let i = 0; i < a.length; i++) {
    assert.ok(
      Math.abs(Math.hypot(a[i].x, a[i].y) - Math.hypot(b[i].x, b[i].y)) < 1e-12,
    );
  }
  assert.notDeepEqual(a[0], b[0]);
});
test("coherent wave phases change the expected signal at a known location", () => {
  assert.equal(waveValue(0, 0, 0, 0), 1);
  assert.equal(waveValue(0, 0, 0, 180), 0.5);
  assert.equal(waveIntensity(0, 0, 0), 1);
  assert.equal(waveIntensity(0, 0, 180), 0.25);
  assert.ok(Math.abs(waveValue(0, 0, 0.5, 0) + 1) < 1e-12);
});
test("model domains reject invalid explicit values", () => {
  for (const n of [NaN, Infinity, -0.1, 1.1]) {
    assert.throws(() => growthState(n));
    assert.throws(() => vortexState(n));
    assert.throws(() => pulsarState(n));
  }
  assert.throws(() => pulsarState(0.5, -1));
  assert.throws(() => waveValue(0, 0, 0.5, 361));
  assert.throws(() => nextModelTime(0, -0.01));
});
test("time advances, clamps at its end and never drifts negative", () => {
  assert.equal(nextModelTime(0, 0.12), 0.01);
  assert.equal(nextModelTime(0.999, 0.2), 1);
  assert.equal(nextModelTime(1, 0), 1);
});
test("filters have honest empty and complete populations", () => {
  const nodes = [...catalog.branches, ...catalog.satellites];
  assert.equal(filteredNodes(nodes).length, 44);
  assert.equal(filteredNodes(nodes, { query: "zzzz-no-such-seed" }).length, 0);
  assert.ok(
    filteredNodes(nodes, { stream: "cosmos" }).every(
      (n) => n.stream === "cosmos",
    ),
  );
  assert.ok(
    filteredNodes(nodes, { query: "WIRBEL" }).some((n) => n.id === "branch-w"),
  );
});
test("neighbor traversal does not close a non-transitive relation", () => {
  const r = [
    { leftEndpoint: { id: "a" }, rightEndpoint: { id: "b" } },
    { leftEndpoint: { id: "b" }, rightEndpoint: { id: "c" } },
  ];
  assert.deepEqual(neighbors("a", r), ["b"]);
  assert.deepEqual(neighbors("c", r), ["b"]);
});
test("local notes append without mutating the predecessor or altering the text", () => {
  const first = appendObservation(
    [],
    {
      nodeId: "branch-w",
      text: "  Form\nund Spur  ",
      eventTime: "2026-10-27T14:00:00Z",
    },
    "2026-10-27T14:00:01Z",
  );
  const second = appendObservation(
    first,
    {
      nodeId: "research-pulsar",
      text: "Blick?",
      eventTime: "2026-10-27T14:00:02Z",
    },
    "2026-10-27T14:00:03Z",
  );
  assert.equal(first.length, 1);
  assert.deepEqual(second.slice(0, 1), first);
  assert.equal(first[0].text, "  Form\nund Spur  ");
  assert.throws(() =>
    appendObservation(
      first,
      { nodeId: "branch-w", text: "x", eventTime: "2026-10-27T14:00:02Z" },
      "2026-10-27T14:00:00Z",
    ),
  );
  assert.throws(() =>
    appendObservation(
      [],
      {
        nodeId: "branch-w",
        text: "x".repeat(4001),
        eventTime: "2026-10-27T14:00:00Z",
      },
      "2026-10-27T14:00:01Z",
    ),
  );
});
test("every inventory digest matches the actual source bytes", () => {
  for (const p of inventory.profiles)
    for (const b of [
      ...p.sourceBindings,
      ...p.sharedCodeBindings,
      ...p.testReferences,
    ]) {
      const bytes = fs.readFileSync(new URL(b.path, root));
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        b.sha256,
        b.path,
      );
    }
  assert.equal(
    new Set(inventory.profiles.map((p) => p.id)).size,
    inventory.profiles.length,
  );
});
test("contracts retain hypothesis scope and never turn missing times into measurements", () => {
  const contracts = read("entities/research/contracts.json").entities;
  assert.equal(contracts.length, catalog.research.length);
  for (const c of contracts) {
    assert.equal(c.raw_seed.originalUserWording, "NOT_ASSERTED");
    assert.ok(c.falsifier && c.sources.length && c.next_seed);
    assert.equal(c.meaning.state, "EDITORIAL_NOT_USER_CONFIRMED");
  }
  for (const p of catalog.phases) assert.equal(p.eventTime, "UNKNOWN");
  assert.equal(JSON.parse(canonical({ b: 1, a: 2 })).a, 2);
});
