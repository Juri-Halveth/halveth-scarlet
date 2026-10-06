/* HALVETH PIRL 2.0. Autonomous local display; no fetch, account, or command execution. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('field'), labels = $('inhabitants'), context = canvas.getContext('2d');
  const params = new URL(location.href).searchParams;
  const language = params.get('lang') === 'en' ? 'en' : 'de';
  const en = language === 'en';
  document.documentElement.lang = language;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ui = { paused: false, hidden: document.hidden, width: 0, height: 0, scale: 1, last: performance.now(), lastPaint: -Infinity, lastClock: -Infinity, lastSummary: -Infinity, hiddenAt: null, displayedFrames: 0 };
  const poses = new Map(), elements = new Map();
  let engine, view;
  const localClock = new Intl.DateTimeFormat(en ? 'en-GB' : 'de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const localDate = new Intl.DateTimeFormat(en ? 'en-GB' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $('clock-label').textContent = en ? 'LOCAL TIME' : 'LOKALE ZEIT';
  $('elapsed-label').textContent = en ? 'UNFOLDING' : 'ENTFALTUNG';
  $('world-title').textContent = en ? 'WORLD SEEDWORK' : 'WELTKEIMWERK';
  $('home').setAttribute('aria-label', en ? 'HALVETH home' : 'HALVETH Startseite');
  $('field').setAttribute('aria-label', en ? 'Automatic cell space: signals enter ports, change cell states, and produce nested cells.' : 'Automatischer Zellraum: Signale erreichen Ports, verändern Zellzustände und erzeugen innere Zellen.');
  function fail(error) {
    ui.paused = true;
    $('error').hidden = false;
    $('error').textContent = en ? 'The cell space could not continue. Reload the page to start again.' : 'Der Zellraum konnte nicht weiterlaufen. Neu laden startet ihn erneut.';
    console.error('GStarLiving', error);
  }
  try {
    if (!context) throw new Error('Canvas 2D unavailable');
    const seedWords = new Uint32Array(1);
    crypto.getRandomValues(seedWords);
    engine = GStarLiving.create(window.HalvethUniverse.entities, { seed: seedWords[0] || 1 });
    view = engine.snapshot();
  } catch (error) { fail(error); return; }
  function resize() {
    ui.width = innerWidth; ui.height = innerHeight; ui.scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(ui.width * ui.scale); canvas.height = Math.round(ui.height * ui.scale);
    context.setTransform(ui.scale, 0, 0, ui.scale, 0, 0);
    poses.clear(); ui.lastPaint = -Infinity;
    if (ui.paused) paint(1000);
  }
  addEventListener('resize', resize); resize();
  function pause() {
    ui.paused = !ui.paused; ui.last = performance.now();
    $('pause').textContent = ui.paused ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-pressed', String(ui.paused));
    $('pause').setAttribute('aria-label', ui.paused ? (en ? 'Continue unfolding' : 'Entfaltung fortsetzen') : (en ? 'Pause unfolding' : 'Entfaltung pausieren'));
    $('inhabitants').dataset.paused = String(ui.paused);
    updateSummary();
  }
  $('pause').setAttribute('aria-label', en ? 'Pause unfolding' : 'Entfaltung pausieren');
  $('pause').addEventListener('click', pause);
  addEventListener('keydown', event => { if (event.code === 'Space' && event.target === document.body) { event.preventDefault(); pause(); } });
  document.addEventListener('visibilitychange', () => {
    const now = performance.now();
    if (document.hidden) ui.hiddenAt = now;
    else if (ui.hiddenAt !== null) { engine.gap(Math.max(0, now - ui.hiddenAt)); ui.hiddenAt = null; }
    ui.hidden = document.hidden; ui.last = now;
  });
  function updatePopulation() {
    const c = view.counts;
    $('population').textContent = c.roots + (en ? ' PROFILES' : ' PROFILE') + ' · ' + c.cells + (en ? ' CELLS' : ' ZELLEN') + (ui.paused ? (en ? ' · PAUSED' : ' · PAUSIERT') : '');
  }
  function updateSummary() {
    updatePopulation();
    const c = view.counts;
    $('summary').textContent = en ? `${c.roots} of ${c.sourceProfiles} source profiles, ${c.cells} cells, ${c.transitions} local state changes. ${ui.paused ? 'Paused.' : 'Running automatically.'}` : `${c.roots} von ${c.sourceProfiles} Ausgangsprofilen, ${c.cells} Zellen, ${c.transitions} lokale Zustandswechsel. ${ui.paused ? 'Pausiert.' : 'Läuft automatisch.'}`;
  }
  function positions(delta) {
    const roots = view.nodes.filter(node => node.depth === 0);
    const count = reduced.matches ? view.counts.sourceProfiles : roots.length;
    const usableW = Math.max(220, ui.width - (ui.width < 600 ? 28 : 170));
    const usableH = Math.max(220, ui.height - 210);
    const rx = usableW / 2, ry = usableH / 2;
    const radius = Math.min(115, Math.sqrt(usableW * usableH / (Math.PI * Math.max(count, 5))) * 0.49);
    const blend = reduced.matches ? 1 : 1 - Math.exp(-delta * 0.004);
    for (const node of roots) {
      const t = node.order * 2.399963229728653 + 0.35;
      const radial = Math.sqrt((node.order + 0.8) / (count + 1)) * 0.87;
      const drift = reduced.matches ? 0 : Math.sin(view.modelMs / 7600 + node.order) * Math.min(4, radius * .06);
      const target = { x: ui.width / 2 + Math.cos(t) * radial * rx + drift, y: ui.height / 2 + Math.sin(t) * radial * ry + drift, r: radius * (0.93 + (node.initialGenome % 15) / 100) };
      let pose = poses.get(node.id);
      if (!pose) { pose = { ...target, r: reduced.matches ? target.r : target.r * 0.1 }; poses.set(node.id, pose); }
      for (const key of ['x', 'y', 'r']) pose[key] += (target[key] - pose[key]) * blend;
    }
    for (const node of view.nodes.filter(node => node.depth > 0)) {
      const parent = poses.get(node.parentId);
      const target = { x: parent.x + parent.r * 0.31, y: parent.y + parent.r * 0.3, r: parent.r * 0.43 };
      let pose = poses.get(node.id);
      if (!pose) { pose = { ...target, r: reduced.matches ? target.r : 0 }; poses.set(node.id, pose); }
      pose.x = target.x; pose.y = target.y; pose.r += (target.r - pose.r) * blend;
    }
  }
  function membrane(pose, node) {
    const { x, y, r } = pose;
    const now = view.modelMs / 1000, pulse = reduced.matches ? 0 : Math.sin(now * 1.3 + node.order) * 0.016;
    const busy = node.phase !== 'REST', core = node.phase === 'CORE';
    const fill = context.createRadialGradient(x - r * .25, y - r * .3, 1, x, y, Math.max(1, r * 1.15));
    fill.addColorStop(0, core ? 'rgba(207,39,28,.22)' : 'rgba(117,28,23,.16)');
    fill.addColorStop(.7, 'rgba(49,9,13,.12)'); fill.addColorStop(1, 'rgba(190,30,29,0)');
    context.fillStyle = fill; context.beginPath(); context.arc(x, y, r * 1.15, 0, Math.PI * 2); context.fill();
    for (let layer = 0; layer < 2; layer++) {
      context.beginPath();
      for (let k = 0; k <= 56; k++) {
        const a = k / 56 * Math.PI * 2;
        const waviness = 0.025 * Math.sin(a * 3 + node.initialGenome % 17 + (reduced.matches ? 0 : now * .27));
        const rr = r * (1 + pulse + waviness - layer * .045);
        const xx = x + Math.cos(a) * rr, yy = y + Math.sin(a) * rr;
        if (!k) context.moveTo(xx, yy); else context.lineTo(xx, yy);
      }
      context.strokeStyle = layer ? 'rgba(231,60,49,.13)' : `rgba(255,${core ? 82 : 57},${core ? 61 : 47},${busy ? .8 : .34})`;
      context.lineWidth = layer ? .65 : (node.depth ? .8 : 1.05); context.stroke();
    }
    const portAngle = (node.initialGenome % 628) / 100;
    for (const offset of [0, Math.PI]) {
      const a = portAngle + offset, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      context.beginPath(); context.arc(px, py, node.depth ? 1.5 : 2.3, 0, Math.PI * 2);
      context.fillStyle = node.phase === 'PORT' ? '#ffdfc5' : '#ed5545'; context.fill();
      if (node.phase === 'PORT' && !reduced.matches) {
        context.beginPath(); context.arc(px, py, 4 + ((view.modelMs - node.phaseAt) / 80), 0, Math.PI * 2);
        context.strokeStyle = '#ed554548'; context.lineWidth = 1; context.stroke();
      }
    }
    // Radial marks are the current software genome, not decorative measurements.
    const bits = node.genome.toString(2).padStart(32, '0');
    context.strokeStyle = core ? '#fb7368a0' : '#d5443b55'; context.lineWidth = node.depth ? .65 : 1.2;
    for (let i = 0; i < 32; i++) if (bits[i] === '1') {
      const a = i / 32 * Math.PI * 2;
      context.beginPath(); context.moveTo(x + Math.cos(a) * r * .76, y + Math.sin(a) * r * .76);
      context.lineTo(x + Math.cos(a) * r * .84, y + Math.sin(a) * r * .84); context.stroke();
    }
    if (node.depth < 2 && r > (node.depth ? 12 : 25)) {
      context.font = `italic ${Math.max(12, r * (node.depth ? .52 : .4))}px Georgia`;
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillStyle = core ? '#ff6754' : node.phase === 'PORT' ? '#f6d4c3' : '#d3877b';
      const glyph = node.phase === 'PORT' ? 'X*' : node.revision ? 'X′' : 'X';
      context.fillText(glyph, x - (node.children.length ? r * .24 : 0), y + (node.depth ? 0 : r * .08));
    }
  }
  function paint(delta) {
    positions(delta);
    const w = ui.width, h = ui.height;
    context.clearRect(0, 0, w, h);
    for (let i = 0; i < 72; i++) {
      const x = ((i * 7919 + 29) % 997) / 997 * w, y = ((i * 4813 + 17) % 991) / 991 * h;
      context.fillStyle = i % 5 ? '#e8735420' : '#dd917339';
      context.fillRect(x, y, i % 5 ? 1 : 1.4, i % 5 ? 1 : 1.4);
    }
    for (const signal of view.signals) {
      const from = poses.get(signal.source), to = poses.get(signal.target);
      if (!from || !to) continue;
      const dx = to.x - from.x, dy = to.y - from.y;
      const internal = signal.kind === 'CONTAINED_SIGNAL';
      const sourceNode = view.nodes.find(node => node.id === signal.source), targetNode = view.nodes.find(node => node.id === signal.target);
      const outgoing = (sourceNode.initialGenome % 628) / 100, incoming = (targetNode.initialGenome % 628) / 100 + Math.PI;
      const sx = from.x + Math.cos(outgoing) * (internal ? from.r * .22 : from.r), sy = from.y + Math.sin(outgoing) * (internal ? from.r * .22 : from.r);
      const ex = to.x + Math.cos(incoming) * to.r, ey = to.y + Math.sin(incoming) * to.r;
      const cx = (sx + ex) / 2 - dy * .17, cy = (sy + ey) / 2 + dx * .17;
      context.beginPath(); context.moveTo(sx, sy); context.quadraticCurveTo(cx, cy, ex, ey);
      context.strokeStyle = internal ? '#fa594650' : '#be383524'; context.lineWidth = .7; context.stroke();
      const t = Math.max(0, Math.min(1, (view.modelMs - signal.sentAt) / (signal.arrivesAt - signal.sentAt)));
      const u = reduced.matches ? .5 : t;
      const x = (1-u)*(1-u)*sx + 2*(1-u)*u*cx + u*u*ex, y = (1-u)*(1-u)*sy + 2*(1-u)*u*cy + u*u*ey;
      const glow = context.createRadialGradient(x,y,0,x,y,internal ? 6 : 13);
      glow.addColorStop(0,'#ffc3a3cc'); glow.addColorStop(.2,'#ff473b9c'); glow.addColorStop(1,'#ff473b00');
      context.fillStyle=glow; context.beginPath(); context.arc(x,y,internal ? 6 : 13,0,Math.PI*2); context.fill();
      context.fillStyle='#ffac89'; context.beginPath(); context.arc(x,y,1.6,0,Math.PI*2); context.fill();
    }
    for (const node of view.nodes) {
      const pose = poses.get(node.id); membrane(pose, node);
      if (node.depth) continue;
      let label = elements.get(node.id);
      if (!label) {
        label = document.createElement('span'); label.className = 'inhabitant'; label.dataset.entityId = node.id;
        label.textContent = node.label; label.title = node.label; labels.append(label); elements.set(node.id, label);
      }
      label.dataset.phase = node.phase;
      label.style.width = `${pose.r * 1.7}px`;
      label.style.fontSize = `${Math.max(ui.width < 600 ? 9 : 10, Math.min(13, pose.r * .165))}px`;
      label.style.transform = `translate(${pose.x - pose.r * .85}px,${pose.y - pose.r * (pose.r < 25 ? .2 : .53)}px)`;
      label.style.opacity = Math.min(1, pose.r / 20);
    }
    ui.displayedFrames++;
  }
  function wallClock(now) {
    const date = new Date();
    $('wall-clock').textContent = localClock.format(date); $('wall-clock').dateTime = date.toISOString();
    $('clock-label').textContent = (en ? 'LOCAL' : 'LOKAL') + ' · ' + localDate.format(date);
    $('wall-clock').setAttribute('aria-label', (en ? 'Local device time ' : 'Lokale Gerätezeit ') + localClock.format(date) + ' ' + zone);
    const seconds = Math.floor(view.modelMs / 1000), hh = Math.floor(seconds / 3600), mm = Math.floor(seconds / 60) % 60, ss = seconds % 60;
    $('elapsed').textContent = [hh, mm, ss].map(value => String(value).padStart(2,'0')).join(':');
    ui.lastClock = now;
  }
  function frame(now) {
    try {
      const delta = Math.max(0, now - ui.last); ui.last = now;
      if (!ui.paused && !ui.hidden) {
        if (delta > 250) engine.gap(delta - 250);
        const previousCells = view.counts.cells;
        engine.advance(Math.min(250, delta)); view = engine.snapshot();
        if (previousCells !== view.counts.cells) updatePopulation();
        if (!reduced.matches || now - ui.lastPaint >= 1000) { paint(Math.min(delta || 16, 100)); ui.lastPaint = now; }
      }
      if (now - ui.lastClock >= 200) wallClock(now);
      if (now - ui.lastSummary >= 3000) { updateSummary(); ui.lastSummary = now; }
      requestAnimationFrame(frame);
    } catch (error) { fail(error); }
  }
  // Inspection is a detached read; the runtime exposes no command or write endpoint.
  window.GStarLiveView = Object.freeze({ snapshot: () => engine.snapshot(), timing: () => ({ paused: ui.paused, hidden: ui.hidden, reducedMotion: reduced.matches, displayedFrames: ui.displayedFrames, localTimeZone: zone, clockCalibration: 'UNKNOWN' }) });
  paint(1000); wallClock(performance.now()); updateSummary();
  requestAnimationFrame(frame);
})();
