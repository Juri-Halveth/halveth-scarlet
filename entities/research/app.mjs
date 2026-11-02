// Original HALVETH software and explanatory design: HALVETH PIRL 2.0.
import {
  pulsarState,
  projectPoint,
  growthState,
  vortexState,
  waveValue,
  filteredNodes,
  neighbors,
  nextModelTime,
  appendObservation,
  MODEL_VERSION,
} from "./model.mjs";
import { validateGraph, digest } from "./contract.mjs";
const $ = (id) => document.getElementById(id);
const svgNS = "http://www.w3.org/2000/svg";
const state = {
  view: "discover",
  researchId: "research-pulsar",
  graphId: "branch-w",
  time: 0,
  observer: 60,
  phase: 0,
  projection: "axonometric",
  playing: false,
  history: [],
};
let data,
  relations,
  sources,
  inventory,
  allNodes,
  lastFrame = null,
  frameId = null,
  exporting = false,
  figureAtelier,
  figureLoading;
const labelStates = {
  GEOMETRIC_MODEL: "Ein geometrischer Prüfweg",
  SOURCE_BOUND_EXPLANATION: "Ein Blick in die Quellen",
  MODEL_AND_OBSERVATION_SEPARATED: "Beobachtung und Modell",
  SOURCE_BOUND_RESEARCH_QUESTION: "Eine offene Forschungsfrage",
  PUBLISHED_HYPOTHETICAL_MODEL: "Ein veröffentlichtes Gedankenmodell",
  AUTHORED_COMPARISON_MODEL: "Eine Form, zwei Vorgänge",
  EXECUTABLE_EXTERNAL_PROJECT: "Ein ausführbarer Anschluss",
  DECLARED_LINEAR_WAVE_MODEL: "Ein lineares Wellenmodell",
  OBSERVATION_WITH_MODEL_INTERPRETATION: "Beobachtung und Erklärung",
  COMPETING_PUBLISHED_MODELS: "Zwei Erklärungswege",
};
const make = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
};
const button = (label, action) => {
  const b = make("button", label);
  b.type = "button";
  b.addEventListener("click", action);
  return b;
};
function safeLink(url, label) {
  const u = new URL(url, location.href);
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
    throw Error("Unzulässiger Verweis");
  const a = make("a", label);
  a.href = u.href;
  if (u.origin !== location.origin) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}
function chooseView(view) {
  if (
    !["discover", "map", "inventory", "notebook", "figures"].includes(view) ||
    !$("view-" + view)
  )
    throw Error("Unbekannter Bereich");
  if (view !== "discover") pause();
  state.view = view;
  for (const el of document.querySelectorAll(".view"))
    el.hidden = el.id !== "view-" + view;
  for (const b of document.querySelectorAll("[data-view]")) {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
  if (view === "map") renderMap();
  if (view === "notebook") renderNotebook();
  figureAtelier?.setActive(view === "figures" && !document.hidden);
  if (view === "figures") loadFigures();
}
function loadFigures() {
  if (figureAtelier || figureLoading) return figureLoading;
  $("figure-retry").hidden = true;
  $("figure-status").textContent = "Die Figurenansicht wird geladen …";
  figureLoading = import("./figures.mjs")
    .then((m) => m.createFigureAtelier())
    .then((a) => {
      figureAtelier = a;
      a.setActive(state.view === "figures" && !document.hidden);
      $("figure-variant").disabled = false;
    })
    .catch((e) => {
      $("figure-status").textContent =
        "Die Figurenansicht konnte nicht geöffnet werden: " + e.message;
      $("figure-retry").hidden = false;
      for (const id of ["figure-play", "figure-variant", "figure-motion"])
        $(id).disabled = true;
    })
    .finally(() => {
      figureLoading = null;
    });
  return figureLoading;
}
$("figure-retry").addEventListener("click", loadFigures);
for (const b of document.querySelectorAll("[data-view]"))
  b.addEventListener("click", () => chooseView(b.dataset.view));
function selectResearch(id) {
  const r = data.research.find((x) => x.id === id);
  if (!r) throw Error("Unbekannte Forschungskarte");
  pause();
  state.researchId = id;
  state.time = 0;
  renderResearch();
}
function openBranch(id) {
  state.graphId = id;
  chooseView("map");
  $("map-search").value = "";
  $("map-stream").value = "all";
  renderMap();
}
function renderResearch() {
  const r = data.research.find((x) => x.id === state.researchId);
  $("topic-list").replaceChildren(
    ...data.research.map((topic) => {
      const b = button(topic.title, () => selectResearch(topic.id));
      b.setAttribute("aria-pressed", String(topic.id === r.id));
      return b;
    }),
  );
  $("research-kind").textContent = labelStates[r.state] ?? r.state;
  $("research-title").textContent = r.subtitle;
  $("research-meaning").textContent = r.meaning;
  $("research-question").textContent = r.question;
  $("research-falsifier").textContent = r.falsifier;
  $("research-scope").textContent = r.scope;
  $("research-branch-links").replaceChildren(
    ...r.branchIds.map((id) => {
      const n = data.branches.find((x) => x.id === id);
      return button(n.letter + " · " + n.title, () => openBranch(id));
    }),
  );
  $("source-list").replaceChildren(
    ...r.sourceIds.map((id) => {
      const s = sources.sources.find((x) => x.id === id),
        li = make("li");
      li.append(safeLink(s.url, s.title), make("small", s.note));
      return li;
    }),
  );
  $("lab-controls").hidden = !r.experiment;
  $("pulsar-options").hidden = r.experiment !== "pulsar";
  $("waves-options").hidden = r.experiment !== "waves";
  $("experiment-title").textContent =
    {
      pulsar: "Ein Strahl trifft eine Blickrichtung",
      growth: "Spur und Bewegung nebeneinander",
      waves: "Vier Wellen begegnen sich",
    }[r.experiment] ?? "Der nächste unterscheidende Schritt";
  $("model-description").textContent = r.scope;
  draw();
}
function pause() {
  state.playing = false;
  lastFrame = null;
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null;
  $("play").textContent = "Ablauf zeigen";
  $("play").setAttribute("aria-pressed", "false");
}
function animate(now) {
  if (!state.playing) return;
  const elapsed =
    lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, 0.2);
  lastFrame = now;
  state.time = nextModelTime(state.time, elapsed);
  draw();
  if (state.time === 1) {
    pause();
    return;
  }
  frameId = requestAnimationFrame(animate);
}
$("play").addEventListener("click", () => {
  if (state.playing) {
    pause();
    return;
  }
  if (state.time === 1) state.time = 0;
  state.playing = true;
  lastFrame = null;
  $("play").textContent = "Anhalten";
  $("play").setAttribute("aria-pressed", "true");
  frameId = requestAnimationFrame(animate);
});
$("model-time").addEventListener("input", (e) => {
  pause();
  state.time = Number(e.target.value);
  draw();
});
$("reset-time").addEventListener("click", () => {
  pause();
  state.time = 0;
  draw();
});
$("observer-angle").addEventListener("input", (e) => {
  state.observer = Number(e.target.value);
  $("observer-value").textContent = state.observer + "°";
  draw();
});
$("projection").addEventListener("change", (e) => {
  state.projection = e.target.value;
  draw();
});
$("wave-phase").addEventListener("input", (e) => {
  state.phase = Number(e.target.value);
  $("phase-value").textContent = state.phase + "°";
  draw();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
  figureAtelier?.setActive(!document.hidden && state.view === "figures");
});
const canvas = $("lab-canvas"),
  ctx = canvas.getContext("2d");
function line(points, color, width = 2, close = false) {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close) ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function dot(x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function text(str, x, y, color = "#c7d6e1", size = 20) {
  ctx.fillStyle = color;
  ctx.font = `${Math.round(size * (canvas.clientWidth < 600 ? 1.5 : 1))}px system-ui`;
  ctx.fillText(str, x, y);
}
function background() {
  ctx.fillStyle = "#101d2c";
  ctx.fillRect(0, 0, 960, canvas.height);
  for (let i = 0; i < 55; i++) {
    const x = (i * 137.51) % 960,
      y = (i * i * 71.9) % canvas.height;
    dot(x, y, 0.9, "#3b4b5d");
  }
}
function drawPulsar() {
  const p = pulsarState(state.time, state.observer),
    project = (v) => {
      const q = projectPoint(v, state.projection);
      return { x: 480 + q.x * 130, y: 250 + q.y * 130 };
    };
  const origin = project({ x: 0, y: 0, z: 0 });
  for (const [axis, color] of [
    ["x", "#546478"],
    ["y", "#546478"],
    ["z", "#546478"],
  ]) {
    const end = project({
      x: axis === "x" ? 1.5 : 0,
      y: axis === "y" ? 1.5 : 0,
      z: axis === "z" ? 1.5 : 0,
    });
    line([origin, end], color, 1);
    text(axis, end.x + 7, end.y - 5, "#8fa4b5", 16);
  }
  const circle = Array.from({ length: 101 }, (_, i) =>
    project({
      x: 1.1 * Math.cos((i / 100) * Math.PI * 2),
      y: 1.1 * Math.sin((i / 100) * Math.PI * 2),
      z: 0,
    }),
  );
  line(circle, "#374e65", 1);
  for (const sign of [-1, 1]) {
    const b = project({
      x: p.beam.x * 2 * sign,
      y: p.beam.y * 2 * sign,
      z: p.beam.z * 2 * sign,
    });
    line([origin, b], p.visible ? "#f7c477" : "#6fcdbc", 9);
    dot(b.x, b.y, 5, p.visible ? "#f7c477" : "#6fcdbc");
  }
  const observer = project({
    x: p.observer.x * 2.35,
    y: 0,
    z: p.observer.z * 2.35,
  });
  line([origin, observer], "#d5dfe8", 1.5);
  dot(observer.x, observer.y, 8, "#f3e8d4");
  text(
    "Beobachter",
    Math.max(15, Math.min(780, observer.x + 13)),
    Math.max(25, observer.y - 10),
    "#f3e8d4",
    18,
  );
  dot(origin.x, origin.y, 28, "#afd9e9");
  dot(origin.x - 7, origin.y - 7, 12, "#d8eef5");
  text("Sichtbarkeit über eine Umdrehung", 75, 492, "#c7d6e1", 18);
  line(
    [
      { x: 75, y: 578 },
      { x: 885, y: 578 },
    ],
    "#52657a",
    1,
  );
  const curve = Array.from({ length: 241 }, (_, i) => ({
    x: 75 + (i / 240) * 810,
    y: pulsarState(i / 240, state.observer).visible ? 525 : 577,
  }));
  line(curve, "#6fcdbc", 3);
  const px = 75 + state.time * 810;
  line(
    [
      { x: px, y: 510 },
      { x: px, y: 590 },
    ],
    "#f7c477",
    2,
  );
  text("0", 75, 613, "#9cafbd", 15);
  text("1 Umdrehung", 770, 613, "#9cafbd", 15);
  return p.visible
    ? "Der Beobachter liegt jetzt im Strahlungskegel."
    : "Der Strahlungskegel zeigt jetzt am Beobachter vorbei.";
}
function drawGrowth() {
  const contours = growthState(state.time),
    tracers = vortexState(state.time);
  if (canvas.classList.contains("stacked")) {
    const to = (p, y) => ({ x: 480 + p.x * 270, y: y + p.y * 270 });
    text("Wachstum legt Konturen ab", 60, 65, "#e0e8ed", 28);
    text("Strömung bewegt Marker", 60, 735, "#e0e8ed", 28);
    for (const c of contours)
      line(
        c.map((p) => to(p, 320)),
        "#d5aa71",
        3,
        true,
      );
    const marked = to(contours[0][24], 320);
    dot(marked.x, marked.y, 9, "#e5f5e4");
    for (const p of tracers) {
      const q = to(p, 975);
      dot(
        q.x,
        q.y,
        p.id === "tracer-0" ? 11 : 5,
        p.id === "tracer-0" ? "#f7c477" : "#6fcdbc",
      );
    }
    text("Vorhandener Punkt bleibt am Ort", 60, 600, "#d5aa71", 25);
    text(
      contours.length +
        " abgelegte " +
        (contours.length === 1 ? "Kontur" : "Konturen"),
      60,
      646,
      "#a9bdca",
      23,
    );
    text("Derselbe Marker bewegt sich", 60, 1250, "#6fcdbc", 25);
    text("60 verfolgte Marker", 60, 1300, "#a9bdca", 23);
    return `${contours.length} ${contours.length === 1 ? "Kontur ist" : "Konturen sind"} im Wachstumsmodell vorhanden. Im Wirbelmodell bleiben dieselben 60 Marker verfolgbar.`;
  }
  const to = (p, cx) => ({ x: cx + p.x * 210, y: 320 + p.y * 210 });
  text("Wachstum legt Konturen ab", 45, 65, "#e0e8ed", 22);
  text("Strömung bewegt Marker", 510, 65, "#e0e8ed", 22);
  for (const c of contours)
    line(
      c.map((p) => to(p, 245)),
      "#d5aa71",
      2,
      true,
    );
  const marker = contours[0][24];
  dot(to(marker, 245).x, to(marker, 245).y, 7, "#e5f5e4");
  for (let j = 0; j < 3; j++) {
    const trail = Array.from({ length: 150 }, (_, i) => {
      const a = (i / 149) * Math.PI * 5,
        r = 0.08 + (i / 149) * 0.72;
      return {
        x: 725 + r * 210 * Math.cos(a + (j * Math.PI * 2) / 3),
        y: 320 + r * 210 * Math.sin(a + (j * Math.PI * 2) / 3),
      };
    });
    line(trail, "#2b5260", 1.5);
  }
  for (const p of tracers) {
    const q = to(p, 725);
    dot(
      q.x,
      q.y,
      p.id === "tracer-0" ? 7 : 3,
      p.id === "tracer-0" ? "#f7c477" : "#6fcdbc",
    );
  }
  text("Vorhandener Punkt bleibt am Ort", 40, 574, "#d5aa71", 17);
  text("Derselbe Marker bewegt sich", 510, 574, "#6fcdbc", 17);
  text(contours.length + " abgelegte Konturen", 40, 610, "#a9bdca", 17);
  text("60 verfolgte Marker", 510, 610, "#a9bdca", 17);
  return `${contours.length} ${contours.length === 1 ? "Kontur ist" : "Konturen sind"} im Wachstumsmodell vorhanden. Im Wirbelmodell bleiben dieselben 60 Marker verfolgbar.`;
}
function drawWaves() {
  const cols = 100,
    rows = 54,
    x0 = 35,
    y0 = 75,
    w = 890,
    h = 475;
  for (let iy = 0; iy < rows; iy++)
    for (let ix = 0; ix < cols; ix++) {
      const v = waveValue(
        (ix / (cols - 1)) * 3 - 1.5,
        (iy / (rows - 1)) * 2 - 1,
        state.time,
        state.phase,
      );
      const a = Math.abs(v);
      ctx.fillStyle =
        v >= 0
          ? `rgb(${Math.round(24 + a * 98)},${Math.round(48 + a * 160)},${Math.round(66 + a * 130)})`
          : `rgb(${Math.round(38 + a * 190)},${Math.round(40 + a * 102)},${Math.round(67 + a * 76)})`;
      ctx.fillRect(
        x0 + (ix * w) / cols,
        y0 + (iy * h) / rows,
        w / cols + 1,
        h / rows + 1,
      );
    }
  text(
    "Momentane Amplitude · normierte Ortskoordinaten",
    35,
    44,
    "#dce7ed",
    20,
  );
  text("−1", 35, 595, "#f2b3a2", 17);
  text("0", 470, 595, "#b7c7d5", 17);
  text("+1", 880, 595, "#8ce0ce", 17);
  const v = waveValue(0, 0, state.time, state.phase);
  return `Am Ort (0, 0) beträgt die berechnete Amplitude ${v.toLocaleString("de", { maximumFractionDigits: 3 })}. Die relative Phase ist ${state.phase}°.`;
}
function drawSourceCard(r) {
  text("Ein neuer Prüfweg beginnt mit einer Frage.", 60, 125, "#e1e8ed", 25);
  const words = r.question.split(" ");
  let row = "",
    y = 210;
  ctx.font = "29px Georgia";
  ctx.fillStyle = "#8bd1bf";
  for (const word of words) {
    if (ctx.measureText(row + word).width > 800) {
      ctx.fillText(row, 60, y);
      row = "";
      y += 44;
    }
    row += word + " ";
  }
  ctx.fillText(row, 60, y);
  text(r.sourceIds.length + " verbundene Quellen", 60, 535, "#adbdc9", 19);
  text(
    "Quellen und Gegenprobe stehen neben der Ansicht.",
    60,
    576,
    "#adbdc9",
    18,
  );
  return "Die Karte erschließt Quellen und einen nächsten Prüfweg. Wähle Pulsar, Wachstum und Wirbel oder Vier Wellen für ein ausführbares Modell.";
}
function draw() {
  if (!data) return;
  const r = data.research.find((x) => x.id === state.researchId),
    stacked = r.experiment === "growth" && canvas.clientWidth < 600;
  canvas.classList.toggle("stacked", stacked);
  const height = stacked ? 1340 : 650;
  if (canvas.height !== height) canvas.height = height;
  background();
  const observation =
    r.experiment === "pulsar"
      ? drawPulsar()
      : r.experiment === "growth"
        ? drawGrowth()
        : r.experiment === "waves"
          ? drawWaves()
          : drawSourceCard(r);
  $("lab-observation").textContent = observation;
  $("canvas-alternative").textContent = observation;
  canvas.setAttribute("aria-label", observation);
  $("model-time").value = String(state.time);
  $("model-time-value").textContent = state.time.toLocaleString("de", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  canvas.dataset.modelTime = String(state.time);
  canvas.dataset.experiment = r.experiment ?? "source";
}
new ResizeObserver(() => {
  if (state.view === "discover") draw();
}).observe(canvas.parentElement);
function svg(tag, attrs = {}) {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function renderMap() {
  if (!data) return;
  const visible = filteredNodes(allNodes, {
    stream: $("map-stream").value,
    query: $("map-search").value,
  });
  const visibleIds = new Set(visible.map((n) => n.id));
  $("map-count").textContent =
    `${visible.length} / ${allNodes.length} Gedanken`;
  const root = $("relation-map");
  root.replaceChildren();
  const title = svg("title", { id: "map-title" });
  title.textContent = "Karte der Forschungsfragen";
  const description = svg("desc", { id: "map-desc" });
  description.textContent =
    "Haupt- und Nebenäste mit redaktionell begründeten Suchverbindungen. Alle Gedanken sind zusätzlich als beschriftete Schaltflächen erreichbar.";
  root.append(title, description);
  const selected = visibleIds.has(state.graphId) ? state.graphId : null,
    adjacent = new Set(
      selected ? neighbors(selected, relations.relations) : [],
    );
  const positions = new Map();
  data.streams.forEach((s, i) => {
    const angle = (i / data.streams.length) * Math.PI * 2 - Math.PI / 2,
      cx = 460 + Math.cos(angle) * 290,
      cy = 325 + Math.sin(angle) * 225;
    const group = visible.filter((n) => n.stream === s.id);
    group.forEach((n, j) => {
      const a = (j / Math.max(1, group.length)) * Math.PI * 2;
      positions.set(n.id, {
        x: cx + Math.cos(a) * Math.min(75, 27 + group.length * 5),
        y: cy + Math.sin(a) * Math.min(64, 27 + group.length * 4),
      });
    });
    const l = svg("text", { x: cx, y: cy - 88, class: "stream-label" });
    l.textContent = s.title;
    root.append(l);
  });
  for (const r of relations.relations) {
    const a = positions.get(r.leftEndpoint.id),
      b = positions.get(r.rightEndpoint.id);
    if (!a || !b) continue;
    root.append(
      svg("line", {
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        class:
          "map-edge" +
          (r.leftEndpoint.id === selected || r.rightEndpoint.id === selected
            ? " active"
            : ""),
      }),
    );
  }
  for (const n of visible) {
    const p = positions.get(n.id),
      g = svg("g", {
        transform: `translate(${p.x} ${p.y})`,
        class: "map-node" + (n.id === selected ? " selected" : ""),
        role: "button",
        tabindex: "0",
        "aria-label": n.title,
        "aria-pressed": String(n.id === selected),
      });
    g.append(svg("circle", { r: n.letter ? 18 : 12 }));
    const l = svg("text");
    l.textContent = n.letter ?? "·";
    g.append(l);
    const t = svg("title");
    t.textContent = n.title;
    g.append(t);
    const select = () => {
      state.graphId = n.id;
      renderMap();
    };
    g.addEventListener("click", select);
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select();
      }
    });
    root.append(g);
  }
  $("node-list").replaceChildren(
    ...visible.map((n) => {
      const b = button((n.letter ? n.letter + " · " : "") + n.title, () => {
        state.graphId = n.id;
        renderMap();
      });
      b.setAttribute("aria-pressed", String(n.id === selected));
      return b;
    }),
  );
  if (!visible.length)
    $("node-list").append(
      make(
        "p",
        "Für diese Auswahl ist kein Gedanke verzeichnet. Ändere Suchtext oder Arbeitsstrom.",
        "empty",
      ),
    );
  const detail = $("map-detail");
  detail.replaceChildren();
  if (!selected) {
    detail.append(
      make(
        "p",
        "Wähle einen sichtbaren Gedanken. Die Auswahl bleibt über die Liste auch mit der Tastatur erreichbar.",
        "muted",
      ),
    );
    return;
  }
  const n = allNodes.find((x) => x.id === selected);
  detail.append(
    make("p", data.streams.find((s) => s.id === n.stream)?.title, "eyebrow"),
    make("h3", n.title),
    make("p", n.question, "question"),
    make("p", n.next ?? n.scope),
  );
  const rs = relations.relations.filter(
    (r) => r.leftEndpoint.id === selected || r.rightEndpoint.id === selected,
  );
  for (const r of rs) {
    const id =
        r.leftEndpoint.id === selected ? r.rightEndpoint.id : r.leftEndpoint.id,
      neighbor = [...allNodes, ...data.research].find((x) => x.id === id);
    const div = make("div", undefined, "connection");
    div.append(
      button(neighbor.title, () => {
        if (id.startsWith("research-")) {
          selectResearch(id);
          chooseView("discover");
        } else {
          state.graphId = id;
          $("map-stream").value = "all";
          $("map-search").value = "";
          renderMap();
        }
      }),
      make("small", r.reason),
    );
    detail.append(div);
  }
}
function renderInventory() {
  const q = $("profile-search").value.toLocaleLowerCase("de"),
    f = $("profile-filter").value;
  const list = inventory.profiles.filter(
    (p) =>
      [p.label, p.role, p.kind].join(" ").toLocaleLowerCase("de").includes(q) &&
      (f === "all" ||
        (f === "connected") === Boolean(p.researchBranchIds.length)),
  );
  $("profile-count").textContent =
    `${list.length} / ${inventory.profiles.length} Profile`;
  $("profile-list").replaceChildren(
    ...list.map((p) => {
      const row = make("article", undefined, "profile-row"),
        name = make("div"),
        description = make("div"),
        links = make("div", undefined, "branch-links");
      const h = make("h3");
      h.append(safeLink("../../" + p.profilePath, p.label));
      name.append(h, make("small", p.kind));
      description.append(
        make("p", p.role),
        make(
          "small",
          `${p.referenceCount} deklarierte Quellenverweise · gemeinsamer Darstellungs- und Verlaufskern`,
        ),
      );
      for (const id of p.researchBranchIds) {
        const b = data.branches.find((n) => n.id === id);
        links.append(button(b.letter + " · " + b.title, () => openBranch(id)));
      }
      if (!p.researchBranchIds.length)
        links.append(make("small", "Forschungsanschluss noch offen"));
      row.append(name, description, links);
      return row;
    }),
  );
  if (!list.length)
    $("profile-list").append(
      make("p", "Für diese Auswahl ist kein Profil verzeichnet.", "empty"),
    );
}
function renderNotebook() {
  $("note-count").textContent = String(state.history.length);
  const previous = $("note-node").value;
  $("note-node").replaceChildren(
    ...[...data.research, ...allNodes].map((n) => {
      const o = make("option", n.title);
      o.value = n.id;
      return o;
    }),
  );
  if (previous) $("note-node").value = previous;
  $("note-history").replaceChildren(
    ...state.history.map((n) => {
      const li = make("li"),
        target = [...data.research, ...allNodes].find((x) => x.id === n.nodeId);
      li.append(
        make("strong", target?.title ?? n.nodeId),
        make("p", n.text),
        make(
          "small",
          new Date(n.recordedAt).toLocaleString("de") + " · Sitzungsnotiz",
        ),
      );
      return li;
    }),
  );
  if (!state.history.length)
    $("note-history").append(
      make("li", "Dein Faden beginnt mit der ersten Beobachtung.", "muted"),
    );
}
$("take-note").addEventListener("click", () => {
  chooseView("notebook");
  $("note-node").value = state.researchId;
  $("note-text").focus();
});
$("save-note").addEventListener("click", () => {
  try {
    const now = new Date().toISOString();
    state.history = appendObservation(
      state.history,
      {
        nodeId: $("note-node").value,
        text: $("note-text").value,
        eventTime: "UNKNOWN",
      },
      now,
    );
    $("note-text").value = "";
    renderNotebook();
    $("note-status").textContent =
      "Die Beobachtung ist an den Faden angehängt. Der Download erhält den aktuellen Stand.";
  } catch (err) {
    $("note-status").textContent =
      err instanceof RangeError
        ? "Der Faden enthält bereits 100 Einträge. Lade diesen Stand herunter."
        : "Bitte gib eine Beobachtung mit höchstens 4.000 UTF-8-Bytes ein.";
  }
});
$("export-notebook").addEventListener("click", async () => {
  if (exporting) return;
  exporting = true;
  $("export-notebook").disabled = true;
  try {
    // Capture every mutable value before the asynchronous digest operation.
    const packet = {
      schema: "halveth.nova-research-notebook.v1",
      classification: "LOCAL_USER_NOTES_WITH_PUBLIC_REFERENCE_DATA",
      createdAt: new Date().toISOString(),
      modelVersion: MODEL_VERSION,
      catalogBaseCommit: data.baseCommit,
      selectedResearchId: state.researchId,
      modelState: {
        time: state.time,
        observerDegrees: state.observer,
        phaseDegrees: state.phase,
        projection: state.projection,
      },
      observations: structuredClone(state.history),
      nextSeed:
        $("note-text").value ||
        data.research.find((r) => r.id === state.researchId).nextSeed,
    };
    const payload = JSON.stringify(packet, null, 2) + "\n",
      sha256 = await digest(payload),
      envelope =
        JSON.stringify(
          {
            schema: "halveth.nova-research-export.v1",
            integrityScope: "SHA256_OF_UTF8_PAYLOAD_SELF_CONSISTENCY",
            payload,
            sha256,
          },
          null,
          2,
        ) + "\n";
    const url = URL.createObjectURL(
        new Blob([envelope], { type: "application/json;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `NOVA-Faden-${packet.observations.length}-${packet.selectedResearchId}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    $("note-status").textContent =
      "Der Download enthält den beim Klick aufgenommenen Faden, den Modellzustand und eine SHA-256-Prüfsumme.";
  } catch {
    $("note-status").textContent =
      "Der Download konnte nicht erstellt werden. Deine Sitzungsnotizen sind weiter sichtbar.";
  } finally {
    exporting = false;
    $("export-notebook").disabled = false;
  }
});
for (const id of ["map-search", "map-stream"])
  $(id).addEventListener(id === "map-search" ? "input" : "change", renderMap);
for (const id of ["profile-search", "profile-filter"])
  $(id).addEventListener(
    id === "profile-search" ? "input" : "change",
    renderInventory,
  );
async function load(relative) {
  const response = await fetch(relative, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw Error(relative + " ist nicht erreichbar (" + response.status + ")");
  return response.json();
}
try {
  [data, relations, sources, inventory] = await Promise.all([
    load("catalog.json"),
    load("../relations.json"),
    load("sources.json"),
    load("../INVENTORY_20261027.json"),
  ]);
  await validateGraph(data, relations, sources, inventory);
  allNodes = [...data.branches, ...data.satellites];
  for (const s of data.streams) {
    const o = make("option", s.title);
    o.value = s.id;
    $("map-stream").append(o);
  }
  $("phase-list").replaceChildren(
    ...data.phases.map((p) => {
      const li = make("li", p.title);
      for (const id of p.branchIds) {
        const n = data.branches.find((x) => x.id === id);
        li.append(
          button(n.letter, () => {
            state.graphId = id;
            $("map-search").value = "";
            $("map-stream").value = "all";
            renderMap();
          }),
        );
      }
      return li;
    }),
  );
  $("inventory-basis").textContent =
    "Inventur ab Scarlet " +
    inventory.baseCommit +
    ". Die Einzeldateien und gemeinsamen Codeverweise tragen eigene SHA-256-Digests.";
  $("active-correction").textContent = data.currentCorrections
    .map((c) => c.current)
    .join(" ");
  $("load-status").hidden = true;
  renderResearch();
  renderInventory();
  renderNotebook();
  chooseView("discover");
} catch (err) {
  $("load-status").textContent =
    "Der Forschungsstand ist gerade unvollständig: " +
    err.message +
    ". Die Originaldateien bleiben über die Repository-Ansicht erreichbar.";
  $("load-status").className = "empty";
  for (const b of document.querySelectorAll("[data-view]")) b.disabled = true;
}
