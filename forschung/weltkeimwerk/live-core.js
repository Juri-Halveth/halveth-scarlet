/* HALVETH PIRL 2.0. A finite, automatic software ecology. No external actions. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GStarLiving = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const VERSION = '2.0.0';
  const LIMITS = Object.freeze({ roots: 128, depth: 2, inbox: 8, signals: 512, events: 256, waves: 64, stepMs: 50, speed: 1.1 });
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const copy = value => JSON.parse(JSON.stringify(value));
  function hash(text) {
    let h = 2166136261;
    for (const scalar of text) { h ^= scalar.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function scalarText(value, label, max) {
    if (typeof value !== 'string' || !value.length || value.length > max || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) throw new TypeError(label);
    return value;
  }
  function create(profiles, options = {}) {
    if (!Array.isArray(profiles) || !profiles.length || profiles.length > LIMITS.roots) throw new TypeError('1..128 profiles required');
    const seed = options.seed === undefined ? 1 : options.seed;
    if (!Number.isSafeInteger(seed) || seed < 1 || seed > 0xffffffff) throw new TypeError('seed must be a uint32 greater than zero');
    const seen = new Set();
    const sources = Array.from(profiles, profile => {
      if (!profile || typeof profile !== 'object') throw new TypeError('profile required');
      const id = scalarText(profile.id, 'profile id', 80);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || seen.has(id)) throw new TypeError('unique ASCII profile id required');
      seen.add(id);
      return { id, label: scalarText(profile.label, 'profile label', 120), role: scalarText(profile.role, 'profile role', 2048), enRole: scalarText(profile.en?.role === undefined ? profile.role : profile.en.role, 'English role', 2048) };
    });
    const priority = ['halveth', 'lucinet', 'rachel', 'scarlet', 'aster', 'verachel', 'juri'];
    sources.sort((a, b) => {
      const ai = priority.indexOf(a.id), bi = priority.indexOf(b.id);
      return (ai < 0 ? 1000 : ai) - (bi < 0 ? 1000 : bi);
    });
    let tick = 0, remainder = 0, sequence = 0, signalSequence = 0, rootCursor = 0;
    let accepted = 0, emitted = 0, rejected = 0, gapMs = 0;
    let contacts = 0, waveSequence = 0, waveReceipts = 0, waveCapacityDrops = 0, environmentInputs = 0;
    const channelTransitions = { SIGNAL: 0, CONTACT: 0, WAVE: 0, ENVIRONMENT: 0, CONTAINED: 0 };
    const area = Math.max(24, sources.length * 2.7);
    const world = { width: Math.sqrt(area * 1.6), height: Math.sqrt(area / 1.6), area,
      units: 'MODEL_UNITS', field: 'LAVA_STYLE_CONVECTION_V1', boundary: 'REFLECTING_MEMBRANE', physicsSubsteps: 2 };
    const nodes = [], roots = [], events = [], signals = [], waves = [], index = new Map(), lastContacts = new Map();
    function record(type, subject, data = {}) {
      events.push({ sequence: ++sequence, tick, modelMs: tick * LIMITS.stepMs, type, subject, ...data });
      if (events.length > LIMITS.events) events.shift();
    }
    function makeNode(source, parent = null) {
      const depth = parent ? parent.depth + 1 : 0;
      const id = parent ? parent.id + '.inner' : source.id;
      const initial = parent ? (parent.genome ^ hash(id)) >>> 0 : hash(source.id + '\n' + source.role + '\n' + seed);
      const order = roots.length, angle = order * 2.399963229728653;
      const node = {
        id, profileId: source.id, label: source.label, role: source.role, enRole: source.enRole,
        parentId: parent?.id || null, depth, bornAt: tick * LIMITS.stepMs,
        initialGenome: initial, genome: initial, revision: 0,
        membrane: { permeability: 0.35 + (initial % 50) / 100, revisions: 0 },
        phase: 'REST', phaseAt: tick * LIMITS.stepMs, inbox: [], processing: null,
        nextPulse: tick * LIMITS.stepMs + 1000 + initial % 4200,
        lastSignal: null, children: [], energy: 0.35,
        position: parent ? { ...parent.position } : {
          x: Math.cos(angle) * Math.sqrt((order + 0.5) / sources.length) * (world.width / 2 - .7),
          y: Math.sin(angle) * Math.sqrt((order + 0.5) / sources.length) * (world.height / 2 - .7)
        },
        previousPosition: null, velocity: { x: 0, y: 0 },
        body: { radius: parent ? parent.body.radius * .42 : .47 + (initial % 12) / 100 },
        sensors: { temperature: .5, density: 0, boundaryDistance: 0, flowX: 0, flowY: 0, wavePressure: 0, observedAt: tick * LIMITS.stepMs },
        memory: { contacts: 0, waves: 0, avoidance: .12, meanImpulse: 0, temperature: .25 + (initial % 50) / 100, peers: {} },
        nextSense: tick * LIMITS.stepMs + 5000 + initial % 9000, nextWaveInput: 0,
        lastTouch: null,
        order: parent ? parent.order : order,
        ancestry: parent ? { parentId: parent.id, parentRevision: parent.revision, parentGenome: parent.genome } : null
      };
      node.previousPosition = { ...node.position };
      nodes.push(node); index.set(id, node);
      if (parent) parent.children.push(id); else roots.push(node);
      record(parent ? 'INNER_BIRTH' : 'PROFILE_ENTER', id, { parentId: node.parentId, genome: initial, depth });
      return node;
    }
    const sourceById = new Map(sources.map(source => [source.id, source]));
    function enterRoot() { if (rootCursor < sources.length) makeNode(sources[rootCursor++]); }
    for (let i = 0; i < Math.min(7, sources.length); i++) enterRoot();
    function peer(node, id) {
      return node.memory.peers[id] || (node.memory.peers[id] = { sent: 0, received: 0, contacts: 0, lastSentAt: null, lastReceivedAt: null });
    }
    function send(from, to, internal = false) {
      if (signals.length >= LIMITS.signals) { rejected++; record('SIGNAL_CAPACITY', to.id); return; }
      const now = tick * LIMITS.stepMs;
      const distance = Math.hypot(from.position.x - to.position.x, from.position.y - to.position.y);
      const duration = internal ? 350 : 650 + Math.min(900, distance * 100);
      const signal = {
        id: 'pulse-' + (++signalSequence), source: from.id, target: to.id,
        sourceRevision: from.revision, payload: from.genome, sentAt: now,
        arrivesAt: now + duration, kind: internal ? 'CONTAINED_SIGNAL' : 'LOCAL_SIGNAL', channel: internal ? 'CONTAINED' : 'SIGNAL'
      };
      signals.push(signal); emitted++;
      const relation = peer(from, to.id); relation.sent++; relation.lastSentAt = now;
      record('SIGNAL_EMIT', from.id, { target: to.id, signalId: signal.id, sourceRevision: from.revision, channel: signal.channel });
    }
    function startInput(node, signal) {
      node.processing = signal; node.phase = 'PORT'; node.phaseAt = tick * LIMITS.stepMs;
      node.lastSignal = signal.id;
      const relation = peer(node, signal.source); relation.received++; relation.lastReceivedAt = tick * LIMITS.stepMs;
      record('PORT_RECEIVE', node.id, { signalId: signal.id, source: signal.source, channel: signal.channel });
    }
    function receive(node, signal) {
      if (!node.processing && node.phase === 'REST') startInput(node, signal);
      else if (node.inbox.length < LIMITS.inbox) node.inbox.push(signal);
      else { rejected++; record('INBOX_CAPACITY', node.id, { signalId: signal.id, channel: signal.channel }); return false; }
      return true;
    }
    function stimulus(from, to, channel, payload, witnessId) {
      const now = tick * LIMITS.stepMs;
      return receive(to, { id: 'input-' + (++signalSequence), source: from, target: to.id,
        payload: payload >>> 0, sentAt: now, arrivesAt: now, channel, kind: channel + '_SIGNAL', witnessId });
    }
    function commit(node) {
      const signal = node.processing, previous = node.genome;
      let next = (Math.imul((previous << 5 | previous >>> 27) ^ signal.payload ^ hash(signal.id), 0x45d9f3b) + node.revision + 1) >>> 0;
      if (next === previous) next = (next ^ 1) >>> 0;
      node.genome = next; node.revision++; accepted++; channelTransitions[signal.channel]++;
      node.membrane.permeability = 0.35 + (next % 50) / 100;
      node.membrane.revisions++; node.energy = Math.min(1, node.energy + 0.45);
      node.phase = 'CORE'; node.phaseAt = tick * LIMITS.stepMs;
      node.processing = null;
      record('CORE_TRANSITION', node.id, { signalId: signal.id, source: signal.source, channel: signal.channel,
        witnessId: signal.witnessId || null, previousGenome: previous, genome: next, revision: node.revision });
      if (!node.children.length && node.depth < LIMITS.depth && node.revision >= (node.depth ? 3 : 2)) makeNode(sourceById.get(node.profileId), node);
      for (const childId of node.children) send(node, index.get(childId), true);
    }
    function environmentAt(position, now) {
      const nx = (position.x + world.width / 2) / world.width, ny = (position.y + world.height / 2) / world.height;
      const phase = nx * Math.PI * 3 + now / 33000;
      return { temperature: clamp(.5 + (ny - .5) * 1.25, .02, .98),
        flowX: Math.sin(phase) * Math.cos(ny * Math.PI) * .34,
        flowY: -Math.cos(phase) * Math.sin(ny * Math.PI) * .23,
        boundaryDistance: Math.max(0, Math.min(world.width / 2 - Math.abs(position.x), world.height / 2 - Math.abs(position.y))) };
    }
    function contain(node) {
      for (const axis of ['x', 'y']) {
        const edge = (axis === 'x' ? world.width : world.height) / 2 - node.body.radius;
        if (node.position[axis] > edge) { node.position[axis] = edge; node.velocity[axis] = -Math.abs(node.velocity[axis]) * .7; }
        if (node.position[axis] < -edge) { node.position[axis] = -edge; node.velocity[axis] = Math.abs(node.velocity[axis]) * .7; }
      }
      const speed = Math.hypot(node.velocity.x, node.velocity.y);
      if (speed > LIMITS.speed) { node.velocity.x *= LIMITS.speed / speed; node.velocity.y *= LIMITS.speed / speed; }
    }
    function touch(a, b, nx, ny, distance, impulse, beforeA, beforeB, positionsBefore) {
      const now = tick * LIMITS.stepMs, key = a.order + ':' + b.order;
      if (now - (lastContacts.get(key) ?? -Infinity) < 2200) return;
      lastContacts.set(key, now); contacts++;
      const id = 'contact-' + contacts, aPayload = a.genome, bPayload = b.genome;
      const previousAvoidance = [a.memory.avoidance, b.memory.avoidance];
      for (const [node, other, dx, dy] of [[a,b,nx,ny],[b,a,-nx,-ny]]) {
        node.memory.contacts++;
        node.memory.meanImpulse += (impulse - node.memory.meanImpulse) / Math.min(node.memory.contacts, 16);
        node.memory.avoidance = Math.min(1.4, node.memory.avoidance + .025 + impulse * .08);
        peer(node, other.id).contacts++;
        node.lastTouch = { id, at: now, partner: other.id, nx: dx, ny: dy, impulse };
        node.energy = Math.min(1, node.energy + .15);
      }
      record('CONTACT_EVENT', a.id, { id, target: b.id, sourcePosition: positionsBefore[0], targetPosition: positionsBefore[1],
        geometryPhase: 'PRE_CORRECTION_CONTACT', correctedPositions: [{ ...a.position },{ ...b.position }],
        distance, radii: a.body.radius + b.body.radius, normal: { x: nx, y: ny }, impulse,
        velocitiesBefore: [beforeA, beforeB], velocitiesAfter: [{ ...a.velocity }, { ...b.velocity }],
        avoidanceBefore: previousAvoidance, avoidanceAfter: [a.memory.avoidance,b.memory.avoidance] });
      stimulus(a.id, b, 'CONTACT', aPayload, id); stimulus(b.id, a, 'CONTACT', bPayload, id);
      if (waves.length < LIMITS.waves) {
        waves.push({ id: 'wave-' + (++waveSequence), source: a.id, partner: b.id,
          x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2,
          bornAt: now, expiresAt: now + 3600, radius: 0, previousRadius: 0, speed: 1.35,
          payload: (aPayload ^ bPayload) >>> 0, strength: .35 + Math.min(.65, impulse), hits: [a.id,b.id], witnessId: id });
      } else waveCapacityDrops++;
    }
    function move() {
      const now = tick * LIMITS.stepMs, dt = LIMITS.stepMs / 1000 / world.physicsSubsteps;
      for (const node of roots) { node.previousPosition = { ...node.position }; node.sensors.density = 0; node.sensors.wavePressure *= .95; }
      for (let sub = 0; sub < world.physicsSubsteps; sub++) {
        for (const node of roots) {
          const field = environmentAt(node.position, now);
          Object.assign(node.sensors, field, { observedAt: now });
          const edge = Math.abs(node.position.y) / (world.height / 2);
          node.memory.temperature += (field.temperature - node.memory.temperature) * dt * (edge > .55 ? .55 : .035);
          const wander = now / 7900 + node.initialGenome % 100;
          const desiredX = field.flowX + Math.sin(wander) * .13;
          const desiredY = field.flowY + (.5 - node.memory.temperature) * 1.45 + Math.cos(wander * .77) * .08;
          node.velocity.x += (desiredX - node.velocity.x) * dt * .9;
          node.velocity.y += (desiredY - node.velocity.y) * dt * .9;
          node.position.x += node.velocity.x * dt; node.position.y += node.velocity.y * dt;
          contain(node);
        }
        for (let i = 0; i < roots.length; i++) for (let j = i + 1; j < roots.length; j++) {
          const a = roots[i], b = roots[j];
          let dx = b.position.x - a.position.x, dy = b.position.y - a.position.y, distance = Math.hypot(dx,dy);
          if (distance < .000001) { dx = .000001; dy = 0; distance = .000001; }
          const nx = dx / distance, ny = dy / distance, radii = a.body.radius + b.body.radius;
          const avoidance = (a.memory.avoidance + b.memory.avoidance) / 2;
          // Contact experience increases the sensed spacing and its steering force.
          const reach = radii * (1.12 + avoidance * .2);
          if (distance < radii * 2 && sub === 0) { a.sensors.density++; b.sensors.density++; }
          if (distance < reach) {
            const force = (reach - distance) * (.06 + avoidance * .16) * dt;
            a.velocity.x -= nx * force; a.velocity.y -= ny * force;
            b.velocity.x += nx * force; b.velocity.y += ny * force;
          }
          if (distance <= radii) {
            const beforeA = { ...a.velocity }, beforeB = { ...b.velocity };
            const positionsBefore = [{ ...a.position },{ ...b.position }];
            const closing = (b.velocity.x - a.velocity.x) * nx + (b.velocity.y - a.velocity.y) * ny;
            const impulse = Math.max(0, -closing) * .7 + Math.min(.07, (radii - distance) * .5);
            a.velocity.x -= nx * impulse; a.velocity.y -= ny * impulse;
            b.velocity.x += nx * impulse; b.velocity.y += ny * impulse;
            const correction = (radii - distance) * .5 + .00001;
            a.position.x -= nx * correction; a.position.y -= ny * correction;
            b.position.x += nx * correction; b.position.y += ny * correction;
            touch(a,b,nx,ny,distance,impulse,beforeA,beforeB,positionsBefore);
          }
        }
        for (const node of roots) contain(node);
      }
      // Bind exported field observations to the final, collision-corrected position.
      for (const node of roots) Object.assign(node.sensors, environmentAt(node.position,now), { observedAt: now });
      placeChildren(now);
    }
    function placeChildren(now, resetHistory = false) {
      for (const node of nodes) if (node.depth) {
        const parent = index.get(node.parentId), angle = now / 23000 + node.initialGenome % 628 / 100;
        node.previousPosition = { ...node.position };
        node.position.x = parent.position.x + Math.cos(angle) * parent.body.radius * .32;
        node.position.y = parent.position.y + Math.sin(angle) * parent.body.radius * .32;
        node.velocity = { ...parent.velocity };
        Object.assign(node.sensors, environmentAt(node.position, now), { observedAt: now });
        if (resetHistory) node.previousPosition = { ...node.position };
      }
    }
    function propagateWaves() {
      const now = tick * LIMITS.stepMs;
      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        if (now >= wave.expiresAt) { waves.splice(i,1); continue; }
        wave.previousRadius = wave.radius; wave.radius = (now - wave.bornAt) / 1000 * wave.speed;
        for (const node of roots) {
          if (wave.hits.includes(node.id)) continue;
          const dx = node.position.x - wave.x, dy = node.position.y - wave.y, distance = Math.hypot(dx,dy);
          if (distance > wave.radius + node.body.radius || distance < wave.previousRadius - node.body.radius) continue;
          wave.hits.push(node.id); node.memory.waves++; waveReceipts++;
          const strength = wave.strength / (1 + distance * distance);
          node.sensors.wavePressure += strength;
          if (distance > .000001) { node.velocity.x += dx / distance * strength * .07; node.velocity.y += dy / distance * strength * .07; contain(node); }
          let inputQueued = false;
          if (now >= node.nextWaveInput) {
            inputQueued = stimulus(wave.source, node, 'WAVE', wave.payload, wave.id);
            node.nextWaveInput = now + 6000;
          }
          record('WAVE_RECEIVE', node.id, { waveId: wave.id, source: wave.source, distance, radius: wave.radius,
            previousRadius: wave.previousRadius, bodyRadius: node.body.radius, strength, inputQueued });
        }
      }
    }
    function step() {
      tick++;
      const now = tick * LIMITS.stepMs;
      if (tick % 20 === 0) enterRoot();
      move(); propagateWaves();
      for (let i = signals.length - 1; i >= 0; i--) {
        if (signals[i].arrivesAt <= now) {
          const signal = signals.splice(i, 1)[0]; receive(index.get(signal.target), signal);
        }
      }
      // A birth joins the following tick; iteration never recursively expands in one tick.
      for (const node of nodes.slice()) {
        node.energy = Math.max(0.15, node.energy - 0.0025);
        if (node.phase === 'PORT' && now - node.phaseAt >= 400) {
          node.phase = 'MEMBRANE'; node.phaseAt = now;
          record('MEMBRANE_TRANSFER', node.id, { signalId: node.processing.id, channel: node.processing.channel });
        } else if (node.phase === 'MEMBRANE' && now - node.phaseAt >= 300 + (1 - node.membrane.permeability) * 400) commit(node);
        else if (node.phase === 'CORE' && now - node.phaseAt >= 750) {
          node.phase = 'REST'; node.phaseAt = now;
          if (node.inbox.length) startInput(node, node.inbox.shift());
        }
        if (node.depth === 0 && now >= node.nextPulse) {
          // Every profile is eligible. Least-sent first prevents a permanent local clique;
          // current distance only breaks ties, so movement also changes encounters.
          const candidates = roots.filter(other => other !== node).sort((a, b) => {
            const pa = node.memory.peers[a.id], pb = node.memory.peers[b.id];
            const d = other => Math.hypot(node.position.x - other.position.x, node.position.y - other.position.y);
            return (pa?.sent || 0) - (pb?.sent || 0) || d(a) - d(b) || a.order - b.order;
          });
          const target = candidates[0] || node;
          send(node, target);
          node.nextPulse = now + 4200 + node.genome % 1800;
        }
        if (node.depth === 0 && now >= node.nextSense) {
          const id = 'field-' + (++environmentInputs);
          const payload = hash([node.sensors.temperature.toFixed(3),node.sensors.density,node.sensors.boundaryDistance.toFixed(3),node.sensors.flowX.toFixed(3),node.sensors.flowY.toFixed(3)].join(':'));
          record('ENVIRONMENT_SAMPLE', node.id, { id, position: { ...node.position }, sensors: { ...node.sensors }, field: world.field });
          stimulus('environment', node, 'ENVIRONMENT', payload, id);
          node.nextSense = now + 12000 + node.initialGenome % 5000;
        }
      }
    }
    return Object.freeze({
      reshape(aspect) {
        if (!Number.isFinite(aspect) || aspect < .25 || aspect > 4) throw new RangeError('aspect must be within .25..4');
        const width = Math.sqrt(world.area * aspect), height = Math.sqrt(world.area / aspect);
        if (Math.abs(width - world.width) < 1e-10) return;
        const sx = width / world.width, sy = height / world.height;
        world.width = width; world.height = height;
        for (const node of nodes) {
          node.position.x *= sx; node.position.y *= sy;
          node.previousPosition = { ...node.position };
          node.velocity.x *= sx; node.velocity.y *= sy;
          if (!node.depth) {
            contain(node);
            node.previousPosition = { ...node.position };
            Object.assign(node.sensors, environmentAt(node.position, tick * LIMITS.stepMs), { observedAt: tick * LIMITS.stepMs });
          }
        }
        placeChildren(tick * LIMITS.stepMs, true);
        // A new view geometry starts new local wavefront observations.
        waves.length = 0;
        record('WORLD_RESHAPE', 'world', { aspect, width, height, area: world.area, endedWavefronts: true });
      },
      advance(deltaMs) {
        if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 60000) throw new RangeError('deltaMs must be within 0..60000');
        remainder += deltaMs;
        while (remainder + 1e-8 >= LIMITS.stepMs) { remainder -= LIMITS.stepMs; step(); }
        if (remainder < 0) remainder = 0;
      },
      gap(durationMs) {
        if (!Number.isFinite(durationMs) || durationMs < 0) throw new RangeError('invalid gap');
        gapMs += durationMs;
        record('DISPLAY_GAP', 'clock', { durationMs });
      },
      snapshot(projection = 'full') {
        if (projection !== 'full' && projection !== 'render') throw new TypeError('unknown snapshot projection');
        const render = projection === 'render';
        return copy({ version: VERSION, seed, modelMs: tick * LIMITS.stepMs, tick,
          counts: { sourceProfiles: sources.length, roots: roots.length, cells: nodes.length, transitions: accepted, emitted, rejected,
            contacts, wavesEmitted: waveSequence, waveReceipts, waveCapacityDrops, environmentInputs, channelTransitions },
          nodes: render ? nodes.map(node => ({ id: node.id, label: node.label, depth: node.depth, order: node.order,
            parentId: node.parentId, initialGenome: node.initialGenome, genome: node.genome, revision: node.revision,
            phase: node.phase, phaseAt: node.phaseAt, bornAt: node.bornAt, children: node.children,
            position: node.position, previousPosition: node.previousPosition, velocity: node.velocity, body: node.body,
            lastTouch: node.lastTouch, temperature: node.memory.temperature, sensors: node.sensors })) : nodes,
          signals, waves, world, events: render ? [] : events, routing: { policy: 'ALL_PROFILES_LEAST_SENT_THEN_CURRENT_DISTANCE', eligiblePairs: roots.length * Math.max(0,roots.length - 1) },
          timing: { stepMs: LIMITS.stepMs, remainderMs: remainder, displayGapMs: gapMs },
          coverage: { history: render ? 'OMITTED_FROM_RENDER_PROJECTION' : 'BOUNDED_RECENT_EVENTS', firstSequence: events[0]?.sequence || 0, lastSequence: sequence, retained: events.length, projection },
          model: 'LOCAL_MOVING_CELL_ECOLOGY', limits: LIMITS });
      }
    });
  }
  return Object.freeze({ VERSION, LIMITS, create });
});
