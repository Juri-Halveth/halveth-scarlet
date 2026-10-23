export const WAVE_INTERVAL=.105, WAVE_ENTRY=.55, WAVE_MOTION=3.2;
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};

export function createWaveState(total,{reducedMotion=false}={}) {
  if(!Number.isInteger(total)||total<1||total>256)throw new TypeError('Invalid wave population');
  return {total,phase:reducedMotion?'LINKED':'FORMING',time:0,formation:reducedMotion?total*WAVE_INTERVAL+WAVE_ENTRY:0,compression:0,from:0,to:0,motion:0};
}
export function waveAction(state,action,{reducedMotion=false}={}) {
  if(action==='REPLAY')return {...createWaveState(state.total,{reducedMotion}),time:state.time};
  if(!['COLLAPSE','UNFOLD'].includes(action))throw new TypeError('Unknown wave action');
  const to=action==='COLLAPSE'?1:0;
  if(state.to===to && (state.phase==='COLLAPSING'||state.phase==='UNFOLDING'))return state;
  if(state.compression===to && state.phase!=='FORMING')return state;
  return {...state,formation:state.total*WAVE_INTERVAL+WAVE_ENTRY,from:state.compression,to,motion:0,
    compression:reducedMotion?to:state.compression,phase:reducedMotion?(to?'PACKED':'LINKED'):(to?'COLLAPSING':'UNFOLDING')};
}
export function advanceWave(state,dt) {
  if(!Number.isFinite(dt)||dt<0)throw new TypeError('Invalid wave duration');
  const next={...state,time:state.time+dt};
  if(state.phase==='FORMING'){
    next.formation+=dt;
    if(next.formation>=(state.total-1)*WAVE_INTERVAL+WAVE_ENTRY)next.phase='LINKED';
  }
  if(state.phase==='COLLAPSING'||state.phase==='UNFOLDING'){
    next.motion+=dt;
    const progress=clamp(next.motion/(WAVE_MOTION*Math.max(.15,Math.abs(state.to-state.from))));
    next.compression=state.from+(state.to-state.from)*smooth(progress);
    if(progress===1){next.compression=state.to;next.phase=state.to?'PACKED':'LINKED';}
  }
  return next;
}
export function wavePose(index,state) {
  if(!Number.isInteger(index)||index<0||index>=state.total)throw new RangeError('Invalid wave index');
  const u=state.total===1?0:index/(state.total-1),turn=u*Math.PI*4.8+.35;
  const radius=8.4-6.3*u,entry=smooth((state.formation-index*WAVE_INTERVAL)/WAVE_ENTRY),open=1-state.compression;
  const angle=turn+state.time*.025+state.compression*4;
  const y=Math.sin(turn*1.4-state.time*.65)*.6+(u-.5)*1.9;
  return {position:[Math.cos(angle)*radius*open,y*open,Math.sin(angle)*radius*.72*open],
    scale:entry*open,entry,rotation:state.time*.18+index*.41,visible:entry>0};
}
export function waveSummary(state){
  const revealed=Math.min(state.total,Math.max(0,Math.ceil(state.formation/WAVE_INTERVAL)));
  return {phase:state.phase,total:state.total,revealed,compression:state.compression};
}
