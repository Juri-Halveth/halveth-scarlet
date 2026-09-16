(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HalvethNews=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  function sourceState(source,now=Date.now(),minutes=180){
    const at=Date.parse(source.lastSuccessAt);
    if(source.status!=='fresh'||!Number.isFinite(at))return 'unavailable';
    return now-at>minutes*60000||at>now?'stale':'fresh';
  }
  function snapshotState(data,now=Date.now()){
    if(!data||data.schemaVersion!==1||!Array.isArray(data.sources)||!Array.isArray(data.items))throw new Error('INVALID_NEWS_SNAPSHOT');
    const sources=data.sources.map(source=>({...source,currentStatus:sourceState(source,now,data.staleAfterMinutes||180)}));
    return {...data,sources,stale:sources.some(s=>s.currentStatus!=='fresh')};
  }
  return Object.freeze({sourceState,snapshotState});
});
