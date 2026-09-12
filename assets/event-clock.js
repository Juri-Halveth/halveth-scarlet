/* Europe/Berlin: one elapsed hour before each three-hour wall-clock event. */
(function(root){
  'use strict';
  const HOUR=3600000, FINALE=22000;
  const format=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  let cachedHour=null,boundaries=[];
  function parts(ms){return Object.fromEntries(format.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));}
  function label(ms){const p=parts(ms);return p.hour+':'+p.minute;}
  function countdown(ms){const seconds=Math.max(0,Math.ceil(ms/1000));return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');}
  function at(ms){
    if(!Number.isFinite(ms))throw new TypeError('A finite timestamp is required');
    const hour=Math.floor(ms/HOUR)*HOUR;
    if(cachedHour!==hour){
      cachedHour=hour;boundaries=[];
      // UTC hours also cover the skipped/repeated Berlin daylight-saving hour.
      for(let i=-5;i<=5;i++){
        const time=hour+i*HOUR,p=parts(time);
        if(Number(p.hour)%3===0&&p.minute==='00')boundaries.push({time,id:p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':00[Europe/Berlin]',label:p.hour+':00'});
      }
    }
    const previous=boundaries.filter(b=>b.time<=ms).at(-1),next=boundaries.find(b=>b.time>ms);
    if(!previous||!next)throw new RangeError('No event interval found');
    const until=next.time-ms,active=ms-previous.time<FINALE;
    return {previousId:previous.id,previousAt:previous.time,nextId:next.id,nextAt:next.time,nextLabel:next.label,opensAt:next.time-HOUR,opensLabel:label(next.time-HOUR),until,prelude:until<=HOUR,active,remainingFinale:active?FINALE-(ms-previous.time):0,countdown:countdown(until),zone:'Europe/Berlin'};
  }
  const api=Object.freeze({at,countdown,FINALE,HOUR});
  if(typeof module==='object'&&module.exports)module.exports=api;else root.HalvethEventClock=api;
})(globalThis);
