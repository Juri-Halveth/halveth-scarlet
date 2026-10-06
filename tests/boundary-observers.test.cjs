'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const moduleValue = require('../forschung/grenzbeobachter/core.js');
const boundary = moduleValue.HalvethBoundary || moduleValue;

const config = (overrides = {}) => ({seed: 20261006, points: 25, steps: 80, budget: 4, scenario: 'drift', ...overrides});
const copy = value => JSON.parse(JSON.stringify(value));
function run(input, override) {
  const experiment = boundary.createExperiment(input, override);
  for (let tick = 0; tick < input.steps; tick++) {
    assert.equal(experiment.tick, tick);
    const record = experiment.step();
    assert.equal(record.tick, tick);
  }
  assert.equal(experiment.tick, input.steps);
  return experiment;
}
function checkSites(sites, points, budget) {
  assert.ok(Array.isArray(sites));
  assert.equal(sites.length, budget);
  assert.equal(new Set(sites).size, budget);
  for (const site of sites) assert.ok(Number.isInteger(site) && site >= 0 && site < points, `invalid site ${site}`);
}
function emptyWorld(input) {
  return {
    schema:'halveth.boundary-world.v1', modelVersion:'1.0.0',
    seed:input.seed, points:input.points, steps:input.steps, scenario:input.scenario,
    frames:Array.from({length:input.steps},()=>Array(input.points).fill(0)), events:[]
  };
}
function addEvent(world,id,start,end,sitesByTick) {
  world.events.push({id,start,end,sitesByTick:copy(sitesByTick)});
  for(let tick=start;tick<end;tick++)for(const site of sitesByTick[tick-start])world.frames[tick][site]=1;
  return world;
}

test('boundary observers expose the documented local model API', () => {
  assert.equal(typeof boundary.VERSION, 'string');
  for (const name of ['validateConfig', 'generateWorld', 'createExperiment', 'createAdaptivePolicy', 'createRegularPolicy', 'canonical', 'replay']) {
    assert.equal(typeof boundary[name], 'function', name);
  }
});

test('explicit invalid configuration is rejected instead of normalized', () => {
  const invalid = [
    {seed:-1}, {seed:2**32}, {seed:1.5}, {seed:'42'}, {seed:NaN},
    {points:7}, {points:65}, {points:8.5}, {points:'25'},
    {steps:19}, {steps:601}, {steps:20.5}, {steps:Infinity},
    {budget:0}, {budget:26}, {budget:1.5}, {budget:'4'},
    {scenario:'unknown'}, {scenario:null}
  ];
  for (const change of invalid) assert.throws(() => boundary.validateConfig(config(change)), `must reject ${JSON.stringify(change)}`);
});

test('the model accepts finite boundary configurations and leaves input untouched', () => {
  for (const input of [config({seed:0,points:8,steps:20,budget:1}), config({seed:2**32-1,points:64,steps:600,budget:64,scenario:'scatter'})]) {
    const before = copy(input);
    boundary.validateConfig(input);
    assert.deepEqual(input, before);
  }
});

test('world generation is deterministic for each versioned input', () => {
  for (const scenario of ['drift','scatter']) {
    for (const seed of [0,1,20261006,2**32-1]) {
      const input=config({seed,scenario});
      assert.deepEqual(boundary.generateWorld(input),boundary.generateWorld(copy(input)));
    }
  }
});

test('fixed and adaptive sampling spend the same per-tick budget on valid distinct sites', () => {
  for (const input of [config({points:8,steps:20,budget:1}),config(),config({points:8,steps:20,budget:8,scenario:'scatter'})]) {
    const experiment=boundary.createExperiment(input);
    let regular=0,adaptive=0;
    for (let tick=0;tick<input.steps;tick++) {
      const record=experiment.step();
      assert.equal(record.tick,tick);
      for (const name of ['regular','adaptive']) {
        checkSites(record[name].sites,input.points,input.budget);
        assert.equal(record[name].values.length,input.budget);
        assert.ok(record[name].values.every(Number.isFinite));
      }
      regular+=record.regular.sites.length;
      adaptive+=record.adaptive.sites.length;
    }
    assert.equal(regular,input.steps*input.budget);
    assert.equal(adaptive,regular);
  }
});

test('interleaved observation, summaries and exports do not alter later model decisions', () => {
  const input=config();
  const plain=boundary.createExperiment(input);
  const inspected=boundary.createExperiment(copy(input));
  for (let tick=0;tick<input.steps;tick++) {
    assert.deepEqual(inspected.step(),plain.step());
    inspected.summary();
    inspected.snapshot();
    inspected.summary();
  }
  assert.deepEqual(inspected.snapshot(),plain.snapshot());
});

test('policy decisions are repeatable from only the same observed history and own seed', () => {
  for (const policyName of ['createRegularPolicy','createAdaptivePolicy']) {
    const left=boundary[policyName]({points:25,budget:4,seed:19});
    const right=boundary[policyName]({points:25,budget:4,seed:19});
    for (let tick=0;tick<40;tick++) {
      const a=left.choose(tick),b=right.choose(tick);
      assert.deepEqual(a,b);
      checkSites(a,25,4);
      if (typeof left.observe==='function') {
        const values=a.map(site=>(tick%7===0 && site%2===0)?1:0);
        left.observe(tick,a,values);
        right.observe(tick,b,copy(values));
      }
    }
  }
});

test('adaptive policy does not retain mutable aliases to supplied observation arrays', () => {
  const a=boundary.createAdaptivePolicy({points:25,budget:4,seed:919});
  const b=boundary.createAdaptivePolicy({points:25,budget:4,seed:919});
  for(let tick=0;tick<20;tick++) {
    const sitesA=a.choose(tick),sitesB=b.choose(tick);
    assert.deepEqual(sitesA,sitesB);
    const valuesA=sitesA.map((site,index)=>(index+tick)%3===0?1:0);
    a.observe(tick,sitesA,valuesA);
    b.observe(tick,copy(sitesB),copy(valuesA));
    sitesA.fill(0);
    valuesA.fill(999);
  }
});

test('complete exported runs replay from their own records', () => {
  const snapshot=run(config()).snapshot();
  const exported=JSON.parse(JSON.stringify(snapshot));
  const replayed=boundary.replay(exported);
  assert.deepEqual(replayed,snapshot);
  assert.deepEqual(exported,snapshot,'replay must not mutate imported records');
});

test('partial exported runs preserve their actual observed prefix', () => {
  const experiment=boundary.createExperiment(config());
  for(let tick=0;tick<13;tick++)experiment.step();
  const snapshot=experiment.snapshot();
  assert.deepEqual(boundary.replay(copy(snapshot)),snapshot);
  assert.equal(experiment.tick,13);
});

test('snapshot mutation cannot rewrite the live experiment state', () => {
  const experiment=boundary.createExperiment(config());
  experiment.step();
  const before=experiment.snapshot();
  const changed=experiment.snapshot();
  changed.injected=true;
  if(changed.config)changed.config.seed=99;
  if(changed.measurements?.length)changed.measurements[0].tick=999;
  assert.deepEqual(experiment.snapshot(),before);
});

test('canonical serialization rejects non-finite and executable values', () => {
  assert.equal(boundary.canonical({b:2,a:1}),boundary.canonical({a:1,b:2}));
  for(const input of [NaN,Infinity,-Infinity,undefined,()=>1,{nested:NaN}]) {
    assert.throws(()=>boundary.canonical(input));
  }
});

test('changing only the hidden future cannot change earlier adaptive choices', () => {
  const input=config({points:8,steps:30,budget:2});
  const empty=emptyWorld(input);
  const changed=addEvent(emptyWorld(input),'LATER_EVENT',20,23,[[1],[2],[3]]);
  const a=boundary.createExperiment(input,empty),b=boundary.createExperiment(input,changed);
  for(let tick=0;tick<=20;tick++) {
    const x=a.step(),y=b.step();
    assert.deepEqual(x.adaptive.sites,y.adaptive.sites,`choice must not know future at tick ${tick}`);
    assert.deepEqual(x.regular.sites,y.regular.sites);
    if(tick<20)assert.deepEqual(x.adaptive.values,y.adaptive.values);
  }
});

test('empty event sets have undefined recall and latency rather than invented perfect or zero-time results', () => {
  const input=config({points:8,steps:20,budget:1});
  const summary=run(input,emptyWorld(input)).summary();
  assert.equal(summary.ticks,input.steps);
  assert.equal(summary.completed,true);
  assert.equal(summary.occurredEvents,0);
  assert.equal(summary.totalPlannedEvents,0);
  for(const role of ['regular','adaptive']) {
    const metrics=summary[role];
    assert.equal(metrics.detectedEvents,0);
    assert.equal(metrics.missedEndedEvents,0);
    assert.equal(metrics.pendingEvents,0);
    assert.equal(metrics.recall,null);
    assert.equal(metrics.meanLatency,null);
    assert.equal(metrics.samples,input.steps*input.budget);
    assert.equal(metrics.attempts,metrics.samples);
    assert.equal(metrics.successful,metrics.samples);
    assert.equal(metrics.dropped,0);
  }
});

test('one-tick transient missed by both observers remains a real event in the finite model', () => {
  const input=config({points:8,steps:20,budget:1});
  const baseline=boundary.createExperiment(input,emptyWorld(input));
  let frame;
  for(let tick=0;tick<=7;tick++)frame=baseline.step();
  const sampled=new Set([...frame.regular.sites,...frame.adaptive.sites]);
  const hiddenSite=Array.from({length:input.points},(_,i)=>i).find(i=>!sampled.has(i));
  assert.notEqual(hiddenSite,undefined);
  const world=addEvent(emptyWorld(input),'SHORT_HIDDEN',7,8,[[hiddenSite]]);
  const experiment=run(input,world);
  const result=experiment.summary();
  assert.equal(result.occurredEvents,1);
  for(const role of ['regular','adaptive']) {
    assert.equal(result[role].detectedEvents,0,`${role} must not use oracle event membership`);
    assert.equal(result[role].missedEndedEvents,1);
    assert.equal(result[role].recall,0);
    assert.equal(result[role].meanLatency,null);
    assert.ok(result[role].maxBlindTicks>0);
  }
  assert.ok(experiment.snapshot().frames.every(f=>f.regular.values.every(x=>x===0)&&f.adaptive.values.every(x=>x===0)));
});

test('repeated positive samples detect one event once and compute latency in model ticks', () => {
  const input=config({points:8,steps:20,budget:8});
  const world=addEvent(emptyWorld(input),'LONG_ONE',3,10,Array.from({length:7},()=>[4]));
  const result=run(input,world).summary();
  assert.equal(result.occurredEvents,1);
  for(const role of ['regular','adaptive']) {
    assert.equal(result[role].detectedEvents,1);
    assert.equal(result[role].recall,1);
    assert.equal(result[role].meanLatency,0);
    assert.equal(result[role].pendingEvents,0);
  }
});

test('world override is cloned before a caller changes its future trace', () => {
  const input=config({points:8,steps:20,budget:1});
  const external=emptyWorld(input);
  const experiment=boundary.createExperiment(input,external);
  addEvent(external,'CALLER_MUTATION',5,6,[[2]]);
  external.seed=123;
  for(let tick=0;tick<input.steps;tick++)assert.ok(experiment.step().truth.every(x=>x===0));
  assert.equal(experiment.summary().totalPlannedEvents,0);
});

test('malformed overrides and contradictory event footprints are rejected', () => {
  const input=config({points:8,steps:20,budget:1});
  const mutate=[
    w=>{w.frames=[];},
    w=>{w.frames[0]=[0];},
    w=>{w.frames[0][0]=NaN;},
    w=>{w.frames[0][0]=2;},
    w=>{w.frames[0][0]=1;},
    w=>{w.points=9;},
    w=>{w.events=[{id:'A',start:4,end:3,sitesByTick:[]}];},
    w=>{w.events=[{id:'A',start:0,end:1,sitesByTick:[[8]]}];},
    w=>{w.events=[{id:'A',start:0,end:1,sitesByTick:[[0,0]]}];},
    w=>{addEvent(w,'A',0,1,[[0]]);addEvent(w,'A',2,3,[[2]]);},
    w=>{w.events=[{id:'MISSING_FOOTPRINT',start:0,end:1,sitesByTick:[[0]]}];}
  ];
  for(const change of mutate){const world=emptyWorld(input);change(world);assert.throws(()=>boundary.createExperiment(input,world));}
});

test('replay rejects altered samples, truth, decisions, counters, incomplete prefixes and unknown schema', () => {
  const snapshot=run(config()).snapshot();
  const mutations=[
    s=>{s.frames[0].adaptive.values[0]=1-s.frames[0].adaptive.values[0];},
    s=>{s.frames[0].truth[0]=1-s.frames[0].truth[0];},
    s=>{s.frames[0].regular.sites[0]=s.config.points;},
    s=>{s.summary.adaptive.detectedEvents++;},
    s=>{s.frames.splice(3,1);},
    s=>{s.frames[1].tick=s.frames[0].tick;},
    s=>{s.schema='unknown';},
    s=>{s.version='999.0.0';},
    s=>{s.injected=true;},
    s=>{s.config.seed=NaN;}
  ];
  for(const change of mutations){const altered=copy(snapshot);change(altered);assert.throws(()=>boundary.replay(altered));}
});

test('adaptive choice is idempotent until a validated matching observation advances its clock', () => {
  const policy=boundary.createAdaptivePolicy({points:8,budget:2,seed:7});
  const first=policy.choose(0);
  assert.deepEqual(policy.choose(0),first);
  assert.throws(()=>policy.choose(1));
  assert.throws(()=>policy.observe(0,[first[0],first[0]],[0,0]));
  assert.throws(()=>policy.observe(0,first,[0]));
  assert.throws(()=>policy.observe(0,first,[0,2]));
  assert.throws(()=>policy.observe(1,first,[0,0]));
  policy.observe(0,first,[0,0]);
  checkSites(policy.choose(1),8,2);
});

test('sparse observation arrays are invalid explicit inputs, not missing data silently accepted', () => {
  const policy=boundary.createAdaptivePolicy({points:8,budget:2,seed:7});
  const sites=policy.choose(0);
  const sparse=Array(2);sparse[0]=0;
  assert.throws(()=>policy.observe(0,sites,sparse));
});

test('sparse event footprint arrays cannot declare an event with no concrete site', () => {
  const input=config({points:8,steps:20,budget:1});
  const world=emptyWorld(input);
  world.events.push({id:'HOLE',start:0,end:1,sitesByTick:[Array(1)]});
  assert.throws(()=>boundary.createExperiment(input,world));
});

test('canonical JSON excludes sparse arrays rather than emitting non-JSON holes', () => {
  assert.throws(()=>boundary.canonical(Array(2)));
});

test('predeclared seed sweep preserves adaptive losses, ties and gains instead of assuming superiority', () => {
  const comparisons=[];
  for(const scenario of ['drift','scatter'])for(let seed=0;seed<16;seed++) {
    const input=config({seed,scenario,points:25,steps:160,budget:4});
    const summary=run(input).summary();
    for(const role of ['regular','adaptive']) {
      assert.equal(summary[role].attempts,640);
      assert.equal(summary[role].successful,640);
      assert.equal(summary[role].dropped,0);
      assert.equal(summary[role].detectedEvents+summary[role].missedEndedEvents,summary.occurredEvents);
      assert.equal(summary[role].pendingEvents,0);
    }
    comparisons.push({scenario,seed,delta:summary.adaptive.detectedEvents-summary.regular.detectedEvents});
  }
  assert.ok(comparisons.some(row=>row.delta<0),'at least one declared fixture keeps an adaptive loss');
  assert.ok(comparisons.some(row=>row.delta===0),'at least one declared fixture keeps a tie');
  assert.ok(comparisons.some(row=>row.delta>0),'at least one declared fixture keeps an adaptive gain');
});

test('blindness counts unsampled ticks including boundaries, separately from spatial coverage', () => {
  const input=config({points:8,steps:20,budget:1});
  const experiment=boundary.createExperiment(input,emptyWorld(input));
  experiment.step();
  const first=experiment.summary();
  assert.equal(first.regular.maxBlindTicks,1);
  assert.deepEqual(first.regular.siteCoverage,{visited:1,total:8});
  while(experiment.tick<input.steps)experiment.step();
  const finished=experiment.summary();
  assert.equal(finished.regular.maxBlindTicks,7);
  assert.deepEqual(finished.regular.siteCoverage,{visited:8,total:8});
  assert.notEqual(finished.regular.maxBlindTicks,0,'visiting every site does not eliminate temporal blindness');
  const allSites=config({points:8,steps:20,budget:8});
  const fullySampled=run(allSites,emptyWorld(allSites)).summary();
  assert.equal(fullySampled.regular.maxBlindTicks,0);
  assert.equal(fullySampled.adaptive.maxBlindTicks,0);
});

test('completion is a finite model state and rejects extra steps without changing its export', () => {
  const experiment=run(config({steps:20}));
  const before=experiment.snapshot();
  assert.throws(()=>experiment.step(),/FINISHED/);
  assert.deepEqual(experiment.snapshot(),before);
  assert.equal(before.execution.remainingTicks,0);
  assert.equal(before.execution.status,'COMPLETED_FINITE_MODEL_RUN');
  assert.equal(before.contracts.externalActions,0);
  assert.equal(before.contracts.noise,'NOT_MODELLED');
  assert.equal(before.contracts.dropouts,'NOT_MODELLED_ALL_ATTEMPTS_SUCCESSFUL');
  assert.match(before.contracts.eventDetection,/not independent event classification/);
});

test('export distinguishes seed-generated worlds from explicit test traces and binds generator provenance on replay', () => {
  const input=config({points:8,steps:20,budget:2});
  const generated=run(input).snapshot();
  const explicit=run(input,emptyWorld(input)).snapshot();
  assert.equal(generated.worldOrigin,'GENERATED_FROM_SEED');
  assert.equal(explicit.worldOrigin,'EXPLICIT_TRACE');
  assert.deepEqual(boundary.replay(copy(generated)),generated);
  assert.deepEqual(boundary.replay(copy(explicit)),explicit);
  const changed=copy(generated);
  changed.world.seed=(changed.world.seed^1)>>>0;
  assert.throws(()=>boundary.replay(changed));
  const invalid=copy(generated);invalid.worldOrigin='UNKNOWN_ORIGIN';
  assert.throws(()=>boundary.replay(invalid));
});
