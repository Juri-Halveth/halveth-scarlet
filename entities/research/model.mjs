// HALVETH PIRL 2.0. Declared explanatory models; units are normalized unless stated.
export const MODEL_VERSION = "halveth.research-model.v1";
const TAU = Math.PI * 2;
function finite(x, lo, hi, name) {
  if (!Number.isFinite(x) || x < lo || x > hi) throw new RangeError(name);
  return x;
}
export function pulsarState(
  phase,
  observerDegrees = 60,
  tiltDegrees = 55,
  beamDegrees = 12,
) {
  finite(phase, 0, 1, "phase");
  finite(observerDegrees, 0, 180, "observer");
  finite(tiltDegrees, 0, 180, "tilt");
  finite(beamDegrees, 0, 90, "beam");
  const i = (observerDegrees * Math.PI) / 180,
    a = (tiltDegrees * Math.PI) / 180,
    p = phase * TAU;
  const beam = {
    x: Math.sin(a) * Math.cos(p),
    y: Math.sin(a) * Math.sin(p),
    z: Math.cos(a),
  };
  const observer = { x: Math.sin(i), y: 0, z: Math.cos(i) };
  const dot = beam.x * observer.x + beam.z * observer.z;
  return {
    beam,
    observer,
    dot,
    visible: Math.abs(dot) >= Math.cos((beamDegrees * Math.PI) / 180),
    angleDegrees:
      (Math.acos(Math.min(1, Math.max(-1, Math.abs(dot)))) * 180) / Math.PI,
  };
}
export function projectPoint(p, view = "axonometric") {
  if (!p || ["x", "y", "z"].some((k) => !Number.isFinite(p[k])))
    throw new TypeError("point");
  if (view === "front") return { x: p.x, y: -p.z };
  if (view === "top") return { x: p.x, y: p.y };
  if (view === "side") return { x: p.y, y: -p.z };
  if (view !== "axonometric") throw new TypeError("view");
  return { x: 0.84 * p.x - 0.54 * p.y, y: 0.32 * p.x + 0.5 * p.y - 0.78 * p.z };
}
export function growthContour(index, samples = 100) {
  finite(index, 0, 11, "ring");
  if (!Number.isSafeInteger(index)) throw new RangeError("ring");
  if (!Number.isSafeInteger(samples) || samples < 8 || samples > 500)
    throw new RangeError("samples");
  const r = 0.12 + index * 0.065;
  return Array.from({ length: samples }, (_, n) => {
    const a = (n / samples) * TAU;
    const bump =
      0.19 *
      Math.exp(-Math.pow((a - 0.9) / 0.34, 2)) *
      Math.exp(-Math.pow((index - 5) / 5, 2));
    return {
      id: `ring-${index}-point-${n}`,
      x: (r + bump) * Math.cos(a),
      y: (r + bump) * Math.sin(a),
    };
  });
}
export function growthState(time) {
  finite(time, 0, 1, "time");
  return Array.from({ length: 1 + Math.floor(time * 11) }, (_, i) =>
    growthContour(i),
  );
}
export function vortexState(time, count = 60) {
  finite(time, 0, 1, "time");
  if (!Number.isSafeInteger(count) || count < 1 || count > 500)
    throw new RangeError("count");
  return Array.from({ length: count }, (_, i) => {
    const r = 0.15 + 0.65 * Math.sqrt((i + 0.5) / count),
      a = i * 2.399963229728653 + time * TAU * (1.4 - r);
    return { id: "tracer-" + i, x: r * Math.cos(a), y: r * Math.sin(a), r };
  });
}
export function waveValue(x, y, time, phaseDegrees = 0) {
  finite(x, -10, 10, "x");
  finite(y, -10, 10, "y");
  finite(time, 0, 1, "time");
  finite(phaseDegrees, 0, 360, "phase");
  const phase = (phaseDegrees * Math.PI) / 180;
  return (
    (Math.cos(TAU * (x - time)) +
      Math.cos(TAU * (y - time)) +
      Math.cos(TAU * (-x - time) + phase) +
      Math.cos(TAU * (-y - time))) /
    4
  );
}
export function waveIntensity(x, y, phaseDegrees = 0) {
  finite(x, -10, 10, "x");
  finite(y, -10, 10, "y");
  finite(phaseDegrees, 0, 360, "phase");
  const angles = [
    TAU * x,
    TAU * y,
    -TAU * x + (phaseDegrees * Math.PI) / 180,
    -TAU * y,
  ];
  const re = angles.reduce((s, a) => s + Math.cos(a), 0),
    im = angles.reduce((s, a) => s + Math.sin(a), 0);
  return (re * re + im * im) / 16;
}
export function filteredNodes(nodes, { stream = "all", query = "" } = {}) {
  if (
    !Array.isArray(nodes) ||
    typeof query !== "string" ||
    typeof stream !== "string"
  )
    throw new TypeError("filter");
  const q = query.toLocaleLowerCase("de");
  return nodes.filter(
    (n) =>
      (stream === "all" || n.stream === stream) &&
      [n.title, n.question, n.scope, n.letter ?? ""]
        .join(" ")
        .toLocaleLowerCase("de")
        .includes(q),
  );
}
export function neighbors(id, relations) {
  return [
    ...new Set(
      relations.flatMap((r) =>
        r.leftEndpoint.id === id
          ? [r.rightEndpoint.id]
          : r.rightEndpoint.id === id
            ? [r.leftEndpoint.id]
            : [],
      ),
    ),
  ];
}
export function nextModelTime(time, elapsedSeconds) {
  finite(time, 0, 1, "time");
  finite(elapsedSeconds, 0, 1, "elapsed");
  return Math.min(1, time + elapsedSeconds / 12);
}
export function appendObservation(
  history,
  { nodeId, text, eventTime },
  recordedAt,
) {
  if (!Array.isArray(history) || history.length >= 100)
    throw new RangeError("history");
  if (
    !/^((branch-[a-z])|(sat-[a-z-]+)|(research-[a-z0-9-]+))$/.test(nodeId) ||
    typeof text !== "string" ||
    !text.trim() ||
    !text.isWellFormed() ||
    new TextEncoder().encode(text).length > 4000
  )
    throw new TypeError("observation");
  const utc = (s) => {
    if (
      typeof s !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s) ||
      !Number.isFinite(Date.parse(s))
    )
      return false;
    const canonical = new Date(s).toISOString();
    return s === canonical || s === canonical.replace(".000Z", "Z");
  };
  if (!utc(recordedAt) || (eventTime !== "UNKNOWN" && !utc(eventTime)))
    throw new TypeError("time");
  const a = eventTime === "UNKNOWN" ? null : Date.parse(eventTime),
    b = Date.parse(recordedAt);
  if (a !== null && b < a) throw new TypeError("time");
  if (history.length && b < Date.parse(history.at(-1).recordedAt))
    throw new TypeError("recording order");
  return [
    ...history,
    {
      id: "observation-" + String(history.length + 1).padStart(3, "0"),
      nodeId,
      text,
      eventTime,
      recordedAt,
      kind: "USER_AUTHORED_LOCAL_NOTE",
    },
  ];
}
