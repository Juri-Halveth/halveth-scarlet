export const WAVE_INTERVAL=.105, WAVE_ENTRY=.55, LIGHT_DURATION=.16;
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};

export function createWaveState(total,{reducedMotion=false}={}) {
  if(!Number.isInteger(total)||total<1||total>256)throw new TypeError('Invalid wave population');
  return {total,phase:reducedMotion?'LINKED':'FORMING',time:0,formation:reducedMotion?total*WAVE_INTERVAL+WAVE_ENTRY:0,captureSequence:0,captureTime:null,pulseAge:LIGHT_DURATION};
}
export function waveAction(state,action,{reducedMotion=false}={}) {
  if(action==='REPLAY')return {...createWaveState(state.total,{reducedMotion}),time:state.time,captureSequence:state.captureSequence};
  if(action==='CAPTURE'){
    if(state.captureTime!==null)return state;
    return {...state,formation:state.total*WAVE_INTERVAL+WAVE_ENTRY,captureSequence:state.captureSequence+1,captureTime:state.time,pulseAge:reducedMotion?LIGHT_DURATION:0,phase:reducedMotion?'CAPTURED':'CAPTURING'};
  }
  if(action==='RESUME')return state.captureTime===null?state:{...state,captureTime:null,pulseAge:LIGHT_DURATION,phase:'LINKED'};
  throw new TypeError('Unknown wave action');
}
export function advanceWave(state,dt,{paused=false}={}) {
  if(!Number.isFinite(dt)||dt<0)throw new TypeError('Invalid wave duration');
  if(state.captureTime!==null){
    const pulseAge=Math.min(LIGHT_DURATION,state.pulseAge+dt);
    return {...state,pulseAge,phase:pulseAge===LIGHT_DURATION?'CAPTURED':'CAPTURING'};
  }
  if(paused)return state;
  const next={...state,time:state.time+dt};
  if(state.phase==='FORMING'){
    next.formation+=dt;
    if(next.formation>=(state.total-1)*WAVE_INTERVAL+WAVE_ENTRY)next.phase='LINKED';
  }
  return next;
}
export function wavePose(index,state) {
  if(!Number.isInteger(index)||index<0||index>=state.total)throw new RangeError('Invalid wave index');
  const u=state.total===1?0:index/(state.total-1),turn=u*Math.PI*4.8+.35;
  const radius=8.4-6.3*u,entry=smooth((state.formation-index*WAVE_INTERVAL)/WAVE_ENTRY);
  const angle=turn+state.time*.025;
  const y=Math.sin(turn*1.4-state.time*.65)*.6+(u-.5)*1.9;
  return {position:[Math.cos(angle)*radius,y,Math.sin(angle)*radius*.72],scale:entry,entry,rotation:state.time*.18+index*.41,visible:entry>0};
}
export function waveSummary(state){
  const revealed=Math.min(state.total,Math.max(0,Math.ceil(state.formation/WAVE_INTERVAL)));
  return {phase:state.phase,total:state.total,revealed,modelTime:state.time,captureId:state.captureTime===null?null:`snapshot-${state.captureSequence}`,captureTime:state.captureTime,pulse:state.captureTime===null?0:1-state.pulseAge/LIGHT_DURATION};
}
