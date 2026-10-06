/* HALVETH PIRL 2.0. A finite, automatic software ecology. No external actions. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GStarLiving = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.0';
  const LIMITS = Object.freeze({ roots: 128, depth: 2, inbox: 8, signals: 512, events: 256, stepMs: 50 });
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
    const nodes = [], roots = [], events = [], signals = [], index = new Map();
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
        position: parent ? { ...parent.position } : { x: Math.cos(angle) * Math.sqrt(order + 1), y: Math.sin(angle) * Math.sqrt(order + 1) },
        order: parent ? parent.order : order,
        ancestry: parent ? { parentId: parent.id, parentRevision: parent.revision, parentGenome: parent.genome } : null
      };
      nodes.push(node); index.set(id, node);
      if (parent) parent.children.push(id); else roots.push(node);
      record(parent ? 'INNER_BIRTH' : 'PROFILE_ENTER', id, { parentId: node.parentId, genome: initial, depth });
      return node;
    }
    const sourceById = new Map(sources.map(source => [source.id, source]));
    function enterRoot() { if (rootCursor < sources.length) makeNode(sources[rootCursor++]); }
    for (let i = 0; i < Math.min(7, sources.length); i++) enterRoot();
    function send(from, to, internal = false) {
      if (signals.length >= LIMITS.signals) { rejected++; record('SIGNAL_CAPACITY', to.id); return; }
      const now = tick * LIMITS.stepMs;
      const distance = Math.hypot(from.position.x - to.position.x, from.position.y - to.position.y);
      const duration = internal ? 350 : 650 + Math.min(900, distance * 100);
      const signal = {
        id: 'pulse-' + (++signalSequence), source: from.id, target: to.id,
        sourceRevision: from.revision, payload: from.genome, sentAt: now,
        arrivesAt: now + duration, kind: internal ? 'CONTAINED_SIGNAL' : 'LOCAL_SIGNAL'
      };
      signals.push(signal); emitted++;
      record('SIGNAL_EMIT', from.id, { target: to.id, signalId: signal.id, sourceRevision: from.revision });
    }
    function startInput(node, signal) {
      node.processing = signal; node.phase = 'PORT'; node.phaseAt = tick * LIMITS.stepMs;
      node.lastSignal = signal.id;
      record('PORT_RECEIVE', node.id, { signalId: signal.id, source: signal.source });
    }
    function receive(node, signal) {
      if (!node.processing && node.phase === 'REST') startInput(node, signal);
      else if (node.inbox.length < LIMITS.inbox) node.inbox.push(signal);
      else { rejected++; record('INBOX_CAPACITY', node.id, { signalId: signal.id }); }
    }
    function commit(node) {
      const signal = node.processing, previous = node.genome;
      let next = (Math.imul((previous << 5 | previous >>> 27) ^ signal.payload ^ hash(signal.id), 0x45d9f3b) + node.revision + 1) >>> 0;
      if (next === previous) next = (next ^ 1) >>> 0;
      node.genome = next; node.revision++; accepted++;
      node.membrane.permeability = 0.35 + (next % 50) / 100;
      node.membrane.revisions++; node.energy = Math.min(1, node.energy + 0.45);
      node.phase = 'CORE'; node.phaseAt = tick * LIMITS.stepMs;
      node.processing = null;
      record('CORE_TRANSITION', node.id, { signalId: signal.id, source: signal.source, previousGenome: previous, genome: next, revision: node.revision });
      if (!node.children.length && node.depth < LIMITS.depth && node.revision >= (node.depth ? 3 : 2)) makeNode(sourceById.get(node.profileId), node);
      for (const childId of node.children) send(node, index.get(childId), true);
    }
    function step() {
      tick++;
      const now = tick * LIMITS.stepMs;
      if (tick % 20 === 0) enterRoot();
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
          record('MEMBRANE_TRANSFER', node.id, { signalId: node.processing.id });
        } else if (node.phase === 'MEMBRANE' && now - node.phaseAt >= 300 + (1 - node.membrane.permeability) * 400) commit(node);
        else if (node.phase === 'CORE' && now - node.phaseAt >= 750) {
          node.phase = 'REST'; node.phaseAt = now;
          if (node.inbox.length) startInput(node, node.inbox.shift());
        }
        if (node.depth === 0 && now >= node.nextPulse) {
          const neighbours = roots.filter(other => other !== node).sort((a, b) => {
            const d = other => Math.hypot(node.position.x - other.position.x, node.position.y - other.position.y);
            return d(a) - d(b) || a.order - b.order;
          }).slice(0, 4);
          const target = neighbours.length ? neighbours[(node.genome + node.revision) % neighbours.length] : node;
          send(node, target);
          node.nextPulse = now + 3100 + node.genome % 3100;
        }
      }
    }
    return Object.freeze({
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
      snapshot() {
        return copy({ version: VERSION, seed, modelMs: tick * LIMITS.stepMs, tick,
          counts: { sourceProfiles: sources.length, roots: roots.length, cells: nodes.length, transitions: accepted, emitted, rejected },
          nodes, signals, events, timing: { stepMs: LIMITS.stepMs, remainderMs: remainder, displayGapMs: gapMs },
          coverage: { history: 'BOUNDED_RECENT_EVENTS', firstSequence: events[0]?.sequence || 0, lastSequence: sequence, retained: events.length },
          model: 'LOCAL_AUTOMATIC_CELL_GRAMMAR', limits: LIMITS });
      }
    });
  }
  return Object.freeze({ VERSION, LIMITS, create });
});
