// HALVETH PIRL 2.0. Deterministic, source-bound inventory and relation compiler.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  BASE,
  branches,
  satellitesList,
  streams,
  phases,
  research,
  sourceNotes,
  relationDefinitions,
  bridgePairs,
  CATALOG_VERSION,
} from "../entities/research/catalog.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
if (args.some((a) => a !== "--check"))
  throw Error("Usage: node tools/build_entity_research.mjs [--check]");
const check = args.includes("--check");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
      .join(",") +
    "}"
  );
}
const digest = (v) => hash(canonical(v));
const read = (relative) => fs.readFileSync(path.join(root, relative));
const registryBytes = read("assets/universe-data.js");
const assignment = /^window\.HalvethUniverse\s*=\s*([\s\S]+);\s*$/.exec(
  registryBytes.toString("utf8"),
);
if (!assignment) throw Error("Unexpected registry source format");
// The registry is JSON data. Its JavaScript wrapper is never evaluated here.
const registry = JSON.parse(assignment[1]);
const ids = new Set();
const sourceId = "source-master-summary";
const inventoryLinks = {
  lucinet: ["H", "K", "W"],
  rachel: ["P", "K"],
  pflanze: ["F", "W"],
  scarlet: ["Z", "G"],
  jarvis: ["L", "O"],
  ultron: ["O", "Z"],
  ironman: ["G", "J"],
  thor: ["V"],
  strange: ["R", "X"],
  loki: ["D", "X"],
  ego: ["Y"],
  schwarm: ["F", "Q"],
  celsius: ["V", "S"],
  zuendkerze: ["S", "P"],
  "context-prism": ["E", "H"],
  "pi-treffpunkte": ["H", "R"],
  verachel: ["P", "A"],
};
const testPaths = [
  "tests/entity-signatures.test.mjs",
  "tests/entity-signature-ui.test.mjs",
  "tests/entity-profiles.test.cjs",
];
const sharedCode = [
  "assets/entity-signatures.mjs",
  "assets/entity-signature-ui.mjs",
  "assets/entity-world-model.mjs",
];
const boundFile = (p) => ({ path: p, sha256: hash(read(p)) });
const inventory = registry.entities.map((e) => {
  if (ids.has(e.id)) throw Error("Duplicate profile ID");
  ids.add(e.id);
  const dossier = `docs/entities/${e.id}.md`,
    profile = e.profilePath + "index.html";
  const text = read(dossier).toString("utf8");
  return {
    id: e.id,
    label: e.label,
    kind: e.kind,
    role: e.role,
    profilePath: e.profilePath,
    sourceState: "SOURCE_FILES_OBSERVED",
    baseCommit: BASE,
    sourceBindings: [boundFile(dossier), boundFile(profile)],
    declaredReferences: e.sourceRefs,
    referenceCount: e.sourceRefs.length,
    dossierCharacters: text.length,
    capabilities: [
      {
        name: "Profil und Quellen lesen",
        scope: "STATIC_PROFILE",
        route: e.profilePath,
      },
      {
        name: "Gestalt und Verlauf erkunden",
        scope: "SHARED_DESIGN_RUNTIME",
        codePaths: sharedCode,
      },
    ],
    sharedCodeBindings: sharedCode.map(boundFile),
    testReferences: testPaths.map((p) => ({
      ...boundFile(p),
      coverage:
        "SHARED_RUNTIME_OR_PROFILE_GENERATION_NOT_ENTITY_SPECIFIC_RESULT",
    })),
    domainMechanismReview: "NOT_ASSESSED_BY_STATIC_INVENTORY",
    autonomousWorker: "NOT_BOUND_BY_THIS_PROFILE",
    researchBranchIds: (inventoryLinks[e.id] ?? []).map(
      (l) => "branch-" + l.toLowerCase(),
    ),
    researchLinkBasis: "EDITORIAL_NAVIGATION_NOT_NATURAL_IDENTITY",
    nextAction: inventoryLinks[e.id]
      ? "Einen Forschungsanschluss mit Quelle und Gegenprobe erkunden."
      : "Einen konkreten Arbeitsbeitrag und eine passende Gegenprobe auswählen.",
  };
});
const sourceSummary = {
  id: sourceId,
  title: "Bereitgestellte Tages-Mindmap",
  url: null,
  kind: "SUPPLIED_CONVERSATION_SUMMARY",
  note: "Der Atlas enthält redaktionelle Ableitungen. Die bereitgestellten Originaldateien bleiben im lokalen Arbeitsarchiv.",
  inspection: "LOCAL_BYTES_READ",
  eventTime: "UNKNOWN",
  recordedAt: "2026-10-27T13:55:55Z",
  sourceFamily: "provided-daily-summary",
  coverage:
    "26 Hauptäste, 18 Nebenäste und 14 vom Dokument angegebene Phasen; keine Vollständigkeitsbehauptung über alle Gespräche.",
};
const sources = [sourceSummary, ...sourceNotes];
const nodes = [...branches, ...satellitesList, ...research];
const byId = new Map(nodes.map((n) => [n.id, n]));
if (byId.size !== nodes.length) throw Error("Duplicate node ID");
const definitions = relationDefinitions.map((d) => ({
  ...d,
  definitionDigest: digest(d),
}));
const endpoint = (id) => {
  const n = byId.get(id);
  if (!n) throw Error("Unknown endpoint");
  return {
    kind: "CONTENT",
    id,
    digest: digest(n),
    semanticAddress: {
      field: "question",
      referent: id,
      dimension: "RESEARCH_QUESTION",
      scope: "MASTER_ATLAS_20261027",
    },
  };
};
const relations = [];
function relate(left, right, definitionId, reason) {
  const d = definitions.find((x) => x.id === definitionId);
  const relationId =
    "relation-" + String(relations.length + 1).padStart(3, "0");
  relations.push({
    id: relationId,
    relationDefinitionId: definitionId,
    definitionDigest: d.definitionDigest,
    relationType: d.label,
    direction: d.direction,
    leftEndpoint: endpoint(left),
    rightEndpoint: endpoint(right),
    reason,
    scope: "MASTER_ATLAS_20261027",
    eventTime: "UNKNOWN",
    recordedAt: "2026-10-27T13:55:55Z",
    clock: {
      id: "authoring-utc",
      precision: "SECOND",
      basis: "COORDINATOR_CLOCK_TOOL_READING_NOT_INDEPENDENT_ATTESTATION",
    },
    sourceRefs: [sourceId],
    evidenceState: "EDITORIALLY_ASSERTED",
    authorityEffect: "NONE",
    writeDomainId: "write-" + relationId,
  });
}
for (const [a, b, reason] of bridgePairs)
  relate(
    "branch-" + a.toLowerCase(),
    "branch-" + b.toLowerCase(),
    "editorial-bridge-v1",
    reason,
  );
for (const n of satellitesList)
  relate(
    n.id,
    n.parent,
    "satellite-context-v1",
    "Zusätzlicher Gesichtspunkt zur benannten Hauptfrage.",
  );
for (const r of research)
  for (const id of r.branchIds)
    relate(r.id, id, "research-connection-v1", r.question);
const dataset = {
  schema: CATALOG_VERSION,
  baseCommit: BASE,
  recordedAt: "2026-10-27T13:55:55Z",
  classification: "PUBLIC_EDITORIAL_DERIVATION",
  coverage: {
    mainBranches: branches.length,
    satellites: satellitesList.length,
    researchCards: research.length,
    profiles: inventory.length,
    chronology: "DOCUMENT_ASSERTED_ORDER_WITH_UNKNOWN_EVENT_TIMES",
  },
  streams,
  branches,
  satellites: satellitesList,
  phases,
  research,
  sourceIds: sources.map((s) => s.id),
  currentCorrections: [
    {
      id: "molecular-pr11-merged",
      sourceId: "source-molecular-code",
      previous: "Die bereitgestellte Mindmap bezeichnet PR 11 als Draft.",
      current:
        "GitHub meldet PR 11 als am 27.10.2026 gemergt; Quellstand 0b90b5a967e2dde300345ac3485018053a35e0ee.",
      operation: "APPENDED_ACTIVE_CORRECTION_ORIGINAL_RETAINED",
    },
  ],
};
const contracts = research.map((r) => ({
  schema: "halveth.entity-research.v2",
  id: r.id,
  raw_seed: {
    state: "DERIVED_FROM_SUPPLIED_SUMMARY",
    sourceId,
    originalRetention: "LOCAL_ORIGINAL_ARCHIVE",
    originalUserWording: "NOT_ASSERTED",
  },
  meaning: { text: r.meaning, state: "EDITORIAL_NOT_USER_CONFIRMED" },
  status: r.state,
  capabilities: [
    {
      kind: r.experiment ? "LOCAL_EXECUTABLE_MODEL" : "SOURCE_NAVIGATION",
      codePath: r.experiment ? "entities/research/model.mjs" : null,
      experiment: r.experiment,
      output: r.experiment
        ? "Darstellung aus dem gebundenen Modellzustand."
        : "Quellen, Erklärung und unterscheidende Forschungsfrage.",
    },
  ],
  state: {
    modelVersion: r.experiment ? "halveth.research-model.v1" : null,
    scope: r.scope,
  },
  relations: relations
    .filter((x) => x.leftEndpoint.id === r.id)
    .map((x) => x.id),
  sources: r.sourceIds,
  artifacts: r.experiment ? ["entities/research/model.mjs"] : [],
  tests: r.experiment ? ["tests/entity-research.test.mjs"] : [],
  output: r.meaning,
  falsifier: r.falsifier,
  next_seed: r.nextSeed,
}));
const outputs = {
  "entities/research/catalog.json": dataset,
  "entities/research/sources.json": {
    schema: "halveth.research-sources.v1",
    sources,
  },
  "entities/INVENTORY_20261027.json": {
    schema: "halveth.entity-inventory.v1",
    baseCommit: BASE,
    recordedAt: dataset.recordedAt,
    registrySha256: hash(registryBytes),
    method:
      "Static inventory of all registry members; shared code/test references do not establish individual autonomous execution or scientific validity.",
    profiles: inventory,
  },
  "entities/relations.json": {
    schema: "halveth.research-relations.v1",
    definitions,
    relations,
  },
  "entities/research/contracts.json": {
    schema: "halveth.entity-research-contracts.v2",
    entities: contracts,
  },
};
for (const [relative, value] of Object.entries(outputs)) {
  const bytes = JSON.stringify(value, null, 2) + "\n",
    p = path.join(root, relative);
  if (check) {
    if (!fs.existsSync(p) || fs.readFileSync(p, "utf8") !== bytes)
      throw Error("Generated research data differs: " + relative);
  } else fs.writeFileSync(p, bytes);
}
console.log(
  JSON.stringify({
    mode: check ? "CHECK" : "BUILD",
    profiles: inventory.length,
    mainBranches: branches.length,
    satellites: satellitesList.length,
    researchCards: research.length,
    relations: relations.length,
    sources: sources.length,
  }),
);
