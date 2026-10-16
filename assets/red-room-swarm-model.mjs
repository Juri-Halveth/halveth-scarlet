/**
 * Fictional, closed two-layer shadow model. No network, identity lookup, or
 * external observations. The named story roles are not real-world identities.
 * A retained template is data; a running copy additionally needs a carrier,
 * authority and a route. Rates/counts here are authored for explanation.
 */
export const TICKS = Object.freeze([-3, -2, -1, 0, 1, 2, 3, 4]);
export const SCENARIOS = Object.freeze({
  archive: Object.freeze({ retained: true, carrier: false, authority: false, route: true, quarantine: false }),
  blocked: Object.freeze({ retained: true, carrier: true, authority: false, route: true, quarantine: false }),
  active: Object.freeze({ retained: true, carrier: true, authority: true, route: true, quarantine: true }),
  erased: Object.freeze({ retained: false, carrier: false, authority: false, route: true, quarantine: false })
});
const IDS = Object.freeze(['R-01', 'R-02', 'R-03']);

function assertScenario(id) {
  if (!Object.hasOwn(SCENARIOS, id)) throw new RangeError('Unknown synthetic scenario');
}
function assertTick(tick) {
  if (!Number.isInteger(tick) || !TICKS.includes(tick)) throw new RangeError('Tick must be a model T value');
}

export function frameAt(scenarioId, tick) {
  assertScenario(scenarioId);
  assertTick(tick);
  const config = SCENARIOS[scenarioId];
  const liberated = tick >= 0;
  const templateRecorded = tick >= -2;
  const archivedTemplates = !templateRecorded ? 0 :
    liberated && !config.retained ? 0 : IDS.length;
  const backupFragments = tick < -1 ? 0 :
    liberated && !config.retained ? 0 : IDS.length * 2;
  // An echo is a distributed representation. Its presence does not say whether
  // a process is running, whether a person remains controlled, or who made it.
  const publicEchoes = tick >= 1 && config.route && archivedTemplates ? IDS.length : 0;
  const executable = liberated && archivedTemplates && config.carrier &&
    config.authority && config.route && !(config.quarantine && tick >= 4);
  const activeCopies = !executable || tick < 1 ? 0 : tick === 1 ? 1 : tick === 2 ? 3 : 6;
  const challenge = tick < 2 ? 'NOT_RUN' :
    activeCopies ? 'LOCAL_EXECUTION_WITNESS' : 'NO_LOCAL_RESPONSE';
  return Object.freeze({
    scenarioId, tick, people: Object.freeze({ inRoom: liberated ? 0 : IDS.length, free: liberated ? IDS.length : 0 }),
    data: Object.freeze({ archivedTemplates, backupFragments, publicEchoes }),
    runtime: Object.freeze({ carrierAvailable: tick >= 0 && config.carrier,
      authorityAvailable: tick >= 0 && config.authority && !(config.quarantine && tick >= 4),
      routeAvailable: config.route, activeCopies, challenge }),
    ids: IDS,
    status: 'SYNTHETIC_SHADOW_ONLY'
  });
}

export function runScenario(scenarioId) {
  assertScenario(scenarioId);
  return Object.freeze({ scenarioId, model: 'red-room-swarm-shadow-v1',
    frames: Object.freeze(TICKS.map(tick => frameAt(scenarioId, tick))) });
}

export function compareScenarios(leftId, rightId, tick) {
  const left = frameAt(leftId, tick), right = frameAt(rightId, tick);
  const leftRun = runScenario(leftId), rightRun = runScenario(rightId);
  const firstInternalDivergence = TICKS.find((time, index) =>
    leftRun.frames[index].runtime.activeCopies !== rightRun.frames[index].runtime.activeCopies) ?? null;
  const firstEchoDivergence = TICKS.find((time, index) =>
    leftRun.frames[index].data.publicEchoes !== rightRun.frames[index].data.publicEchoes) ?? null;
  return Object.freeze({
    tick, leftId, rightId,
    samePublicEchoes: left.data.publicEchoes === right.data.publicEchoes,
    sameActiveCopies: left.runtime.activeCopies === right.runtime.activeCopies,
    firstInternalDivergence, firstEchoDivergence,
    oracle: 'same-model-v1-equal-tick-count-comparison',
    status: 'SYNTHETIC_COMPARISON_ONLY'
  });
}
