// HALVETH PIRL 2.0. Structural checks bind this declared dataset, not external truth.
export function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
      .join(",") +
    "}"
  );
}
export async function digest(value) {
  const bytes = new TextEncoder().encode(
    typeof value === "string" ? value : canonical(value),
  );
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function validateGraph(
  catalog,
  relationPacket,
  sourcePacket,
  inventory,
) {
  if (
    catalog?.schema !== "halveth.research-catalog.v1" ||
    relationPacket?.schema !== "halveth.research-relations.v1" ||
    sourcePacket?.schema !== "halveth.research-sources.v1" ||
    inventory?.schema !== "halveth.entity-inventory.v1"
  )
    throw Error("Unbekannte Datenfassung");
  const arrays = [
    catalog.branches,
    catalog.satellites,
    catalog.research,
    relationPacket.definitions,
    relationPacket.relations,
    sourcePacket.sources,
    inventory.profiles,
  ];
  if (arrays.some((a) => !Array.isArray(a) || !a.length))
    throw Error("Ein erforderlicher Datenbereich fehlt");
  for (const a of arrays)
    if (new Set(a.map((x) => x.id)).size !== a.length)
      throw Error("Eine Adresse kommt mehrfach vor");
  const nodes = [
      ...catalog.branches,
      ...catalog.satellites,
      ...catalog.research,
    ],
    nodeMap = new Map(nodes.map((n) => [n.id, n]));
  if (nodeMap.size !== nodes.length)
    throw Error("Kollidierende Knotenadressen");
  const definitions = new Map(relationPacket.definitions.map((d) => [d.id, d]));
  const sources = new Set(sourcePacket.sources.map((s) => s.id));
  const nodeDigests = new Map(
    await Promise.all(nodes.map(async (n) => [n.id, await digest(n)])),
  );
  const writeDomains = new Set();
  for (const d of definitions.values()) {
    const { definitionDigest, ...body } = d;
    if (definitionDigest !== (await digest(body)))
      throw Error("Geänderte Relationsdefinition");
    if (
      d.direction !== "UNDIRECTED" ||
      d.causal !== false ||
      d.transitive !== false
    )
      throw Error("Nicht unterstützte Relationssemantik");
  }
  for (const r of relationPacket.relations) {
    const d = definitions.get(r.relationDefinitionId);
    if (
      !d ||
      r.relationType !== d.label ||
      r.definitionDigest !== d.definitionDigest ||
      r.direction !== d.direction ||
      r.authorityEffect !== "NONE" ||
      r.evidenceState !== "EDITORIALLY_ASSERTED" ||
      r.scope !== "MASTER_ATLAS_20261027"
    )
      throw Error("Ungebundene Relationssemantik");
    if (
      writeDomains.has(r.writeDomainId) ||
      typeof r.writeDomainId !== "string"
    )
      throw Error("Kollidierende Schreibadresse");
    writeDomains.add(r.writeDomainId);
    if (
      !Array.isArray(r.sourceRefs) ||
      !r.sourceRefs.length ||
      r.sourceRefs.some((id) => !sources.has(id))
    )
      throw Error("Fehlende Relationsquelle");
    for (const e of [r.leftEndpoint, r.rightEndpoint])
      if (
        !e ||
        !nodeMap.has(e.id) ||
        e.digest !== nodeDigests.get(e.id) ||
        e.kind !== "CONTENT" ||
        e.semanticAddress?.field !== "question" ||
        e.semanticAddress?.dimension !== "RESEARCH_QUESTION" ||
        e.semanticAddress?.referent !== e.id ||
        e.semanticAddress?.scope !== r.scope
      )
        throw Error("Geänderter oder fehlender Relationsendpunkt");
    if (r.leftEndpoint.id === r.rightEndpoint.id)
      throw Error("Selbstverbindung");
  }
  for (const r of catalog.research)
    if (
      !Array.isArray(r.sourceIds) ||
      !r.sourceIds.length ||
      r.sourceIds.some((id) => !sources.has(id)) ||
      !r.question ||
      !r.falsifier ||
      !r.scope
    )
      throw Error("Ungebundene Forschungskarte");
  if (
    catalog.coverage.mainBranches !== catalog.branches.length ||
    catalog.coverage.satellites !== catalog.satellites.length ||
    catalog.coverage.profiles !== inventory.profiles.length ||
    catalog.coverage.researchCards !== catalog.research.length
  )
    throw Error("Abweichende Bestandsangabe");
  if (
    catalog.phases.some(
      (p) =>
        p.eventTime !== "UNKNOWN" || p.branchIds.some((id) => !nodeMap.has(id)),
    )
  )
    throw Error("Ungebundene Verlaufsphase");
  return {
    nodes: nodeMap.size,
    relations: relationPacket.relations.length,
    profiles: inventory.profiles.length,
    scope: "DECLARED_GRAPH_STRUCTURE_AND_SELF_CONSISTENCY",
  };
}
