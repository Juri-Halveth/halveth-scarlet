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
  const ui = { paused: false, hidden: document.hidden, width: 0, height: 0, scale: 1, unit: 1, centerY: 0, last: performance.now(), lastPaint: -Infinity, lastClock: -Infinity, lastSummary: -Infinity, hiddenAt: null, displayedFrames: 0 };
  const poses = new Map(), elements = new Map();
  let engine, view, painter;
  let remainderMs=0,lastLabels=-Infinity;
  const performanceState={frames:0,drawMs:0,updateMs:0,snapshotMs:0,skippedPaints:0,lastDrawMs:0,quality:1,projectedWaves:0};
  const localClock = new Intl.DateTimeFormat(en ? 'en-GB' : 'de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const localDate = new Intl.DateTimeFormat(en ? 'en-GB' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $('clock-label').textContent = en ? 'LOCAL TIME' : 'LOKALE ZEIT';
  $('elapsed-label').textContent = en ? 'UNFOLDING' : 'ENTFALTUNG';
  $('world-title').textContent = en ? 'WORLD SEEDWORK' : 'WELTKEIMWERK';
  $('home').setAttribute('aria-label', en ? 'HALVETH home' : 'HALVETH Startseite');
  $('field').setAttribute('aria-label', en ? 'Freely moving cells change shape, build temporary formations and leave spatial traces that influence later movement. Every profile can exchange signals with every other profile.' : 'Frei bewegte Zellen verändern ihre Form, bilden zeitweilige Formationen und hinterlassen Raumspuren, die spätere Bewegung beeinflussen. Jedes Profil kann mit jedem anderen Signale austauschen.');
  function fail(error) {
    ui.paused = true;
    $('error').hidden = false;
    $('error').textContent = en ? 'The cell space could not continue. Reload the page to start again.' : 'Der Zellraum konnte nicht weiterlaufen. Neu laden startet ihn erneut.';
    console.error('GStarLiving', error);
  }
  try {
    if (!context) throw new Error('Canvas 2D unavailable');
    painter = GStarShapes.createPainter(context);
    const seedWords = new Uint32Array(1);
    crypto.getRandomValues(seedWords);
    engine = GStarLiving.create(window.HalvethUniverse.entities, { seed: seedWords[0] || 1 });
    view = engine.snapshot('render');
  } catch (error) { fail(error); return; }
  function resize() {
    ui.width = innerWidth; ui.height = innerHeight; ui.scale = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(3200000 / (ui.width * ui.height)));
    canvas.width = Math.round(ui.width * ui.scale); canvas.height = Math.round(ui.height * ui.scale);
    context.setTransform(ui.scale, 0, 0, ui.scale, 0, 0);
    const usableW = Math.max(180, ui.width - (ui.width < 600 ? 36 : 110));
    const usableH = Math.max(180, ui.height - 190);
    engine.reshape(Math.max(.25, Math.min(4, usableW / usableH)));
    view = engine.snapshot('render');
    ui.unit = Math.min(usableW / view.world.width, usableH / view.world.height);
    ui.centerY = ui.height / 2 + 8;
    poses.clear(); ui.lastPaint = -Infinity; lastLabels=-Infinity; remainderMs=view.timing.remainderMs;
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
    $('summary').textContent = en ? `${c.roots} of ${c.sourceProfiles} source profiles, ${c.cells} cells, ${c.contacts} membrane contacts, ${view.assemblies.length} formations, ${c.waveReceipts} wave encounters, ${c.transitions} local state changes. ${ui.paused ? 'Paused.' : 'Running automatically.'}` : `${c.roots} von ${c.sourceProfiles} Ausgangsprofilen, ${c.cells} Zellen, ${c.contacts} Membrankontakte, ${view.assemblies.length} Formationen, ${c.waveReceipts} Wellenbegegnungen, ${c.transitions} lokale Zustandswechsel. ${ui.paused ? 'Pausiert.' : 'Läuft automatisch.'}`;
  }
  function positions(delta) {
    const fraction = reduced.matches ? 1 : remainderMs / view.timing.stepMs;
    for (const node of view.nodes) {
      const p = node.previousPosition, q = node.position;
      poses.set(node.id, { x: ui.width / 2 + (p.x + (q.x - p.x) * fraction) * ui.unit,
        y: ui.centerY + (p.y + (q.y - p.y) * fraction) * ui.unit,
        r: node.body.radius * ui.unit });
    }
  }
  function membrane(pose,node,activePorts=[]) { painter.cell(pose,node,activePorts,view.modelMs+remainderMs,reduced.matches); }
  function habitatField() {
    const h=view.habitat,cw=view.world.width*ui.unit/h.columns,ch=view.world.height*ui.unit/h.rows;
    const left=ui.width/2-view.world.width*ui.unit/2,top=ui.centerY-view.world.height*ui.unit/2;
    for(let i=0;i<h.values.length;i++)if(h.values[i]>.025){
      context.fillStyle=`rgba(170,62,73,${Math.min(.18,h.values[i]*.20)})`;
      context.fillRect(left+(i%h.columns)*cw+1,top+Math.floor(i/h.columns)*ch+1,Math.max(1,cw-2),Math.max(1,ch-2));
    }
    for(const bond of view.bonds){
      const a=poses.get(bond.source),b=poses.get(bond.target);if(!a||!b)continue;
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
      context.strokeStyle=bond.mode==='ARCH'?'#e9896850':'#f3758860';context.lineWidth=.8;
      context.beginPath();context.moveTo(a.x+nx*a.r*.5,a.y+ny*a.r*.5);context.lineTo(b.x-nx*b.r*.5,b.y-ny*b.r*.5);context.stroke();
      if(bond.mode==='LATTICE'&&d<ui.unit*2.5){
        const t=Math.min(a.r,b.r)*.33;context.fillStyle='#ad42500c';context.beginPath();context.moveTo(a.x-ny*t,a.y+nx*t);context.lineTo(b.x-ny*t,b.y+nx*t);context.lineTo(b.x+ny*t,b.y-nx*t);context.lineTo(a.x+ny*t,a.y-nx*t);context.closePath();context.fill();
      }
    }
  }
  function paint(delta) {
    positions(delta);
    const w = ui.width, h = ui.height;
    context.clearRect(0, 0, w, h);
    const heat = context.createLinearGradient(0,ui.centerY - view.world.height * ui.unit / 2,0,ui.centerY + view.world.height * ui.unit / 2);
    heat.addColorStop(0,'#29112012'); heat.addColorStop(.6,'#a3261800'); heat.addColorStop(1,'#ab321919');
    context.fillStyle=heat; context.fillRect(0,0,w,h);
    for (let i = 0; i < 72; i++) {
      const x = ((i * 7919 + 29) % 997) / 997 * w, y = ((i * 4813 + 17) % 991) / 991 * h;
      context.fillStyle = i % 5 ? '#e8735420' : '#dd917339';
      context.fillRect(x, y, i % 5 ? 1 : 1.4, i % 5 ? 1 : 1.4);
    }
    habitatField();
    const waveView=view.waves.slice(-24); performanceState.projectedWaves=waveView.length;
    if (!reduced.matches) for (const wave of waveView) {
      const life = (view.modelMs - wave.bornAt) / (wave.expiresAt - wave.bornAt);
      const x = w / 2 + wave.x * ui.unit, y = ui.centerY + wave.y * ui.unit;
      context.beginPath(); context.arc(x,y,Math.max(.1,wave.radius * ui.unit),0,Math.PI*2);
      context.strokeStyle=`rgba(255,104,79,${(1-life)*.24})`; context.lineWidth=1.1; context.stroke();

    }
    const activePorts = new Map();
    for (const signal of view.signals) {
      const from = poses.get(signal.source), to = poses.get(signal.target);
      if (!from || !to) continue;
      const dx = to.x - from.x, dy = to.y - from.y;
      const internal = signal.kind === 'CONTAINED_SIGNAL';
      const outgoing = Math.atan2(dy,dx), incoming = outgoing + Math.PI;
      for (const [id,angle] of [[signal.source,outgoing],[signal.target,incoming]]) {
        if (!activePorts.has(id)) activePorts.set(id,[]);
        activePorts.get(id).push(angle);
      }
      const sx = from.x + Math.cos(outgoing) * (internal ? from.r * .22 : from.r), sy = from.y + Math.sin(outgoing) * (internal ? from.r * .22 : from.r);
      const ex = to.x + Math.cos(incoming) * to.r, ey = to.y + Math.sin(incoming) * to.r;
      const cx = (sx + ex) / 2 - dy * .17, cy = (sy + ey) / 2 + dx * .17;
      context.beginPath(); context.moveTo(sx, sy); context.quadraticCurveTo(cx, cy, ex, ey);
      context.strokeStyle = internal ? '#fa594650' : '#be383524'; context.lineWidth = .7; context.stroke();
      const t = Math.max(0, Math.min(1, (view.modelMs - signal.sentAt) / (signal.arrivesAt - signal.sentAt)));
      const u = reduced.matches ? .5 : t;
      const x = (1-u)*(1-u)*sx + 2*(1-u)*u*cx + u*u*ex, y = (1-u)*(1-u)*sy + 2*(1-u)*u*cy + u*u*ey;
      const glowRadius=internal?5:10;
      context.drawImage(painter.glow,x-glowRadius,y-glowRadius,glowRadius*2,glowRadius*2);
      context.fillStyle='#ffac89'; context.beginPath(); context.arc(x,y,1.6,0,Math.PI*2); context.fill();
    }
    const updateLabels=performance.now()-lastLabels>=65;
    if(updateLabels)lastLabels=performance.now();
    for (const node of view.nodes) {
      const pose = poses.get(node.id); membrane(pose, node, activePorts.get(node.id));
      if (node.depth || !updateLabels) continue;
      let label = elements.get(node.id);
      if (!label) {
        label = document.createElement('span'); label.className = 'inhabitant'; label.dataset.entityId = node.id;
        label.textContent = node.label; label.title = node.label; labels.append(label); elements.set(node.id, label);
      }
      if(label.dataset.phase!==node.phase)label.dataset.phase = node.phase;
      const labelWidth=Math.round(pose.r*1.7);
      if(label.dataset.width!==String(labelWidth)){label.dataset.width=String(labelWidth);label.style.width=`${labelWidth}px`;}
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
        const updateStart=performance.now();
        const time=engine.advance(Math.min(250,delta));remainderMs=time.remainderMs;
        performanceState.updateMs+=performance.now()-updateStart;
        if(time.tick!==view.tick){
          const snapshotStart=performance.now(),previousCells=view.counts.cells;
          view=engine.snapshot('render');performanceState.snapshotMs+=performance.now()-snapshotStart;
          if(previousCells!==view.counts.cells)updatePopulation();
        }
        const targetInterval=reduced.matches?1000:performanceState.quality===1?1000/60:1000/30;
        if(now-ui.lastPaint>=targetInterval-.5){
          const drawStart=performance.now();paint(Math.min(delta||16,100));ui.lastPaint=now;
          const cost=performance.now()-drawStart;performanceState.lastDrawMs=cost;performanceState.drawMs+=cost;performanceState.frames++;
          // Hysteresis follows measured drawing cost; it never changes model time or data.
          performanceState.drawEMA=performanceState.drawEMA===undefined?cost:performanceState.drawEMA*.97+cost*.03;
          if(performanceState.drawEMA>15)performanceState.quality=.5;
          else if(performanceState.drawEMA<8)performanceState.quality=1;
        }else performanceState.skippedPaints++;

      }
      if (now - ui.lastClock >= 200) wallClock(now);
      if (now - ui.lastSummary >= 3000) { updateSummary(); ui.lastSummary = now; }
      requestAnimationFrame(frame);
    } catch (error) { fail(error); }
  }
  // Inspection is a detached read; the runtime exposes no command or write endpoint.
  window.GStarLiveView = Object.freeze({ snapshot: () => engine.snapshot(), timing: () => ({ paused: ui.paused, hidden: ui.hidden, reducedMotion: reduced.matches, displayedFrames: ui.displayedFrames, localTimeZone: zone, clockCalibration: 'UNKNOWN', performance: {...performanceState}, pathCacheSize:painter.pathCacheSize() }) });
  paint(1000); wallClock(performance.now()); updateSummary();
  requestAnimationFrame(frame);
})();
