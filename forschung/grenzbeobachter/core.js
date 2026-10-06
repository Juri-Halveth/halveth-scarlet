/* HALVETH Boundary observers 1.0.0. LicenseRef-HALVETH-PIRL-2.0.
 * Synthetic local data only. See README.md and the repository license map.
 */
(function (root) {
  'use strict';
  const VERSION = '1.0.0';
  const defaults = {seed:271828, points:25, steps:160, budget:4, scenario:'drift'};
  const clone = x => JSON.parse(JSON.stringify(x));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const plain = x => x !== null && Object.getPrototypeOf(x) === Object.prototype;
  const dense = x => Array.isArray(x) && Object.keys(x).length===x.length && Array.from({length:x.length},(_,i)=>Object.hasOwn(x,i)).every(Boolean);
  function canonical(x) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
    if (typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
    if (Array.isArray(x)) { assert(dense(x),'NON_DENSE_JSON_ARRAY'); return '['+x.map(canonical).join(',')+']'; }
    if (plain(x)) return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
    throw new Error('NON_JSON_VALUE');
  }
  function freeze(x) {
    if (x && typeof x==='object' && !Object.isFrozen(x)) { Object.values(x).forEach(freeze); Object.freeze(x); }
    return x;
  }
  function validateConfig(input = {}) {
    assert(plain(input),'INVALID_CONFIG');
    assert(Object.keys(input).every(k=>Object.hasOwn(defaults,k)),'UNKNOWN_CONFIG_FIELD');
    const c={...defaults,...input};
    for(const k of ['seed','points','steps','budget']) assert(Number.isInteger(c[k]),'INVALID_'+k.toUpperCase());
    assert(c.seed>=0 && c.seed<=0xffffffff,'INVALID_SEED');
    assert(c.points>=8 && c.points<=64,'INVALID_POINTS');
    assert(c.steps>=20 && c.steps<=600,'INVALID_STEPS');
    assert(c.budget>=1 && c.budget<=c.points,'INVALID_BUDGET');
    assert(c.scenario==='drift'||c.scenario==='scatter','INVALID_SCENARIO');
    return c;
  }
  function rng(seed) {
    let a=seed>>>0;
    return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  }
  function streams(seed) {
    const r=rng(seed^0x9e3779b9);
    return {world:Math.floor(r()*4294967296),adaptive:Math.floor(r()*4294967296),regular:Math.floor(r()*4294967296)};
  }
  const wrap=(v,n)=>((v%n)+n)%n;
  function generateWorld(input={}) {
    const c=validateConfig(input), seed=streams(c.seed).world, random=rng(seed);
    const frames=Array.from({length:c.steps},()=>Array(c.points).fill(0));
    const events=[];
    let start=Math.floor(random()*4);
    while(start<c.steps) {
      const duration=c.scenario==='drift'?18+Math.floor(random()*15):1+Math.floor(random()*4);
      const end=Math.min(start+duration,c.steps), center=Math.floor(random()*c.points), direction=random()<0.5?-1:1;
      const event={id:'MODEL_EVENT_'+String(events.length+1).padStart(4,'0'),start,end,sitesByTick:[]};
      for(let tick=start;tick<end;tick++) {
        const at=c.scenario==='drift'?wrap(center+direction*Math.floor((tick-start)/5),c.points):center;
        const sites=c.scenario==='drift'?[wrap(at-1,c.points),at,wrap(at+1,c.points)]:[at];
        event.sitesByTick.push(sites);
        sites.forEach(site=>{frames[tick][site]=1;});
      }
      events.push(event);
      start=end+(c.scenario==='drift'?4+Math.floor(random()*7):1+Math.floor(random()*4));
    }
    return freeze({schema:'halveth.boundary-world.v1',modelVersion:VERSION,seed,points:c.points,steps:c.steps,scenario:c.scenario,frames,events});
  }
  function validateWorld(world,c) {
    assert(plain(world),'INVALID_WORLD');
    const keys=['schema','modelVersion','seed','points','steps','scenario','frames','events'];
    assert(Object.keys(world).length===keys.length && Object.keys(world).every(k=>keys.includes(k)),'INVALID_WORLD_FIELDS');
    assert(world.schema==='halveth.boundary-world.v1' && world.modelVersion===VERSION,'INVALID_WORLD_VERSION');
    assert(Number.isInteger(world.seed)&&world.seed>=0&&world.seed<=0xffffffff,'INVALID_WORLD_SEED');
    assert(world.points===c.points&&world.steps===c.steps&&world.scenario===c.scenario,'WORLD_CONFIG_MISMATCH');
    assert(dense(world.frames)&&world.frames.length===c.steps,'INVALID_TRACE_LENGTH');
    assert(world.frames.every(f=>dense(f)&&f.length===c.points&&f.every(v=>v===0||v===1)),'INVALID_TRACE_VALUES');
    assert(dense(world.events)&&world.events.length<=c.steps*c.points,'INVALID_EVENTS');
    const ids=new Set(),expected=Array.from({length:c.steps},()=>Array(c.points).fill(0));
    for(const e of world.events) {
      assert(plain(e)&&Object.keys(e).length===4&&['id','start','end','sitesByTick'].every(k=>Object.hasOwn(e,k)),'INVALID_EVENT_FIELDS');
      assert(typeof e.id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(e.id)&&!ids.has(e.id),'INVALID_EVENT_ID');ids.add(e.id);
      assert(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=0&&e.end>e.start&&e.end<=c.steps,'INVALID_EVENT_TIME');
      assert(dense(e.sitesByTick)&&e.sitesByTick.length===e.end-e.start,'INVALID_EVENT_TRACK');
      e.sitesByTick.forEach((sites,i)=>{
        assert(dense(sites)&&sites.length>0&&sites.length<=c.points&&new Set(sites).size===sites.length,'INVALID_EVENT_SITES');
        sites.forEach(s=>{assert(Number.isInteger(s)&&s>=0&&s<c.points,'INVALID_SITE');expected[e.start+i][s]=1;});
      });
    }
    assert(canonical(expected)===canonical(world.frames),'EVENT_TRACE_MISMATCH');
    return freeze(clone(world));
  }
  function policyConfig(input) {
    assert(plain(input)&&Object.keys(input).every(k=>['points','budget','seed'].includes(k)),'INVALID_POLICY_CONFIG');
    const c={seed:0,...input};
    assert(Number.isInteger(c.points)&&c.points>=8&&c.points<=64,'INVALID_POINTS');
    assert(Number.isInteger(c.budget)&&c.budget>=1&&c.budget<=c.points,'INVALID_BUDGET');
    assert(Number.isInteger(c.seed)&&c.seed>=0&&c.seed<=0xffffffff,'INVALID_SEED');
    return c;
  }
  function createRegularPolicy(input) {
    const c=policyConfig(input),offset=c.seed%c.points;
    return {choose(tick){assert(Number.isInteger(tick)&&tick>=0,'INVALID_TICK');return Array.from({length:c.budget},(_,i)=>(offset+tick*c.budget+i)%c.points);}};
  }
  function createAdaptivePolicy(input) {
    const c=policyConfig(input), random=rng(c.seed);
    const seen=Array(c.points).fill(null), values=Array(c.points).fill(0);
    let expectedTick=0,pending=null;
    return {
      choose(tick) {
        assert(tick===expectedTick,'INVALID_POLICY_TICK');
        if(pending) return [...pending];
        const selected=[];
        // Reserve half the budget for random exploration. All scores use past readings only.
        const explore=Math.max(1,Math.ceil(c.budget/2));
        const available=Array.from({length:c.points},(_,i)=>i);
        for(let i=0;i<explore;i++){const pick=Math.floor(random()*available.length);selected.push(available.splice(pick,1)[0]);}
        const score=site=>{
          let activity=0;
          for(const [other,weight] of [[site,1],[wrap(site-1,c.points),0.8],[wrap(site+1,c.points),0.8]]) {
            if(seen[other]!==null&&values[other]===1) activity+=weight*Math.exp(-(tick-seen[other])/7);
          }
          const age=seen[site]===null?c.points:tick-seen[site];
          return activity*3+Math.min(age/c.points,1)*0.35;
        };
        const scored=available.map(site=>({site,score:score(site),tie:random()}));
        scored.sort((a,b)=>b.score-a.score||a.tie-b.tie||a.site-b.site);
        selected.push(...scored.slice(0,c.budget-explore).map(x=>x.site));
        pending=selected;return [...selected];
      },
      observe(tick,sites,readings) {
        assert(tick===expectedTick&&pending!==null,'INVALID_OBSERVATION_TICK');
        assert(Array.isArray(sites)&&canonical(sites)===canonical(pending),'OBSERVATION_SITES_MISMATCH');
        assert(dense(readings)&&readings.length===sites.length&&readings.every(v=>v===0||v===1),'INVALID_OBSERVATION_VALUES');
        sites.forEach((site,i)=>{seen[site]=tick;values[site]=readings[i];});
        pending=null;expectedTick++;
      }
    };
  }
  function evaluate(world,frames,policy,points) {
    const count=frames.length, events=world.events.filter(e=>e.start<count);
    const detections=[],last=Array(points).fill(-1),coverage=new Set();
    let maxBlind=0;
    for(const f of frames) for(const site of f[policy].sites){maxBlind=Math.max(maxBlind,f.tick-last[site]-1);last[site]=f.tick;coverage.add(site);}
    for(const t of last)maxBlind=Math.max(maxBlind,count-t-1);
    for(const e of events) {
      let hit=null;
      for(let tick=e.start;tick<Math.min(e.end,count);tick++) {
        if(frames[tick][policy].sites.some(site=>e.sitesByTick[tick-e.start].includes(site))){hit=tick;break;}
      }
      if(hit!==null) detections.push({eventId:e.id,tick:hit,latency:hit-e.start});
    }
    const hitIds=new Set(detections.map(d=>d.eventId));
    const samples=frames.reduce((s,f)=>s+f[policy].sites.length,0);
    return {samples,attempts:samples,successful:samples,dropped:0,detectedEvents:detections.length,
      missedEndedEvents:events.filter(e=>e.end<=count&&!hitIds.has(e.id)).length,
      pendingEvents:events.filter(e=>e.end>count&&!hitIds.has(e.id)).length,
      recall:events.length?detections.length/events.length:null,
      meanLatency:detections.length?detections.reduce((n,d)=>n+d.latency,0)/detections.length:null,
      maxBlindTicks:maxBlind,siteCoverage:{visited:coverage.size,total:points},detections};
  }
  function createExperiment(input={},worldOverride) {
    const config=freeze(validateConfig(input)),seeds=freeze(streams(config.seed));
    const world=worldOverride===undefined?generateWorld(config):validateWorld(worldOverride,config);
    const regular=createRegularPolicy({points:config.points,budget:config.budget,seed:seeds.regular});
    const adaptive=createAdaptivePolicy({points:config.points,budget:config.budget,seed:seeds.adaptive});
    const frames=[];
    function summary() {
      return {ticks:frames.length,completed:frames.length===config.steps,
        occurredEvents:world.events.filter(e=>e.start<frames.length).length,totalPlannedEvents:world.events.length,
        regular:evaluate(world,frames,'regular',config.points),adaptive:evaluate(world,frames,'adaptive',config.points)};
    }
    return {
      get tick(){return frames.length;},
      get config(){return clone(config);},
      step() {
        assert(frames.length<config.steps,'EXPERIMENT_FINISHED');
        const tick=frames.length;
        // Both decisions occur before either policy receives this tick's observation.
        const regularSites=regular.choose(tick),adaptiveSites=adaptive.choose(tick);
        const regularValues=regularSites.map(site=>world.frames[tick][site]);
        const adaptiveValues=adaptiveSites.map(site=>world.frames[tick][site]);
        adaptive.observe(tick,adaptiveSites,adaptiveValues);
        const frame=freeze({tick,truth:[...world.frames[tick]],regular:{sites:regularSites,values:regularValues},adaptive:{sites:adaptiveSites,values:adaptiveValues}});
        frames.push(frame);return clone(frame);
      },
      view(){return {tick:frames.length,config:clone(config),truth:frames.length?[...frames.at(-1).truth]:Array(config.points).fill(0),last:frames.length?clone(frames.at(-1)):null};},
      summary,
      snapshot(){return clone({schema:'halveth.boundary-experiment.v1',version:VERSION,config,streamSeeds:seeds,worldOrigin:worldOverride===undefined?'GENERATED_FROM_SEED':'EXPLICIT_TRACE',world,frames,summary:summary(),
        contracts:{worldGenerator:'ring-events-1.0.0',regularPolicy:'cyclic-1.0.0',adaptivePolicy:'past-only-neighbor-exploration-1.0.0',prng:'mulberry32-separated-streams-1',budgetUnit:'ONE_SITE_READ_PER_ATTEMPT',budgetPerTick:config.budget,clock:'DISCRETE_MODEL_TICKS',physicalUnits:'NONE',noise:'NOT_MODELLED',dropouts:'NOT_MODELLED_ALL_ATTEMPTS_SUCCESSFUL',oracleAccess:'EVALUATOR_AND_DISPLAY_ONLY',eventDetection:'Oracle footprint intersects at least one sampled site while event active; not independent event classification',recallDenominator:'Events whose start is before completed tick count; pending misses remain separately counted',meanLatencyPopulation:'Detected events only; null when none',maxBlindTicks:'Largest consecutive unsampled model-tick count at any site, including start/end boundaries within completed prefix',externalActions:0},
        execution:{completedTicks:frames.length,remainingTicks:config.steps-frames.length,status:frames.length===config.steps?'COMPLETED_FINITE_MODEL_RUN':'PARTIAL_MODEL_RUN'}});}
    };
  }
  function replay(snapshot) {
    assert(plain(snapshot)&&snapshot.schema==='halveth.boundary-experiment.v1'&&snapshot.version===VERSION,'INVALID_SNAPSHOT');
    assert(Array.isArray(snapshot.frames),'INVALID_SNAPSHOT_FRAMES');
    const c=validateConfig(snapshot.config);
    assert(snapshot.frames.length<=c.steps,'TOO_MANY_FRAMES');
    assert(snapshot.worldOrigin==='GENERATED_FROM_SEED'||snapshot.worldOrigin==='EXPLICIT_TRACE','INVALID_WORLD_ORIGIN');
    const experiment=snapshot.worldOrigin==='GENERATED_FROM_SEED'?createExperiment(c):createExperiment(c,snapshot.world);
    assert(canonical(experiment.snapshot().world)===canonical(snapshot.world),'WORLD_ORIGIN_MISMATCH');
    for(let i=0;i<snapshot.frames.length;i++) {
      assert(canonical(experiment.step())===canonical(snapshot.frames[i]),'REPLAY_FRAME_MISMATCH_'+i);
    }
    const result=experiment.snapshot();
    assert(canonical(result)===canonical(snapshot),'REPLAY_CONTRACT_OR_SUMMARY_MISMATCH');
    return result;
  }
  const api={VERSION,canonical,validateConfig,generateWorld,createRegularPolicy,createAdaptivePolicy,createExperiment,replay};
  root.HalvethBoundary=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(globalThis);
