// Deterministic event tests: real clock, controller and five scene functions,
// with a small DOM/audio boundary double; this is not a browser render test.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const clock=require('../assets/event-clock.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const controller=fs.readFileSync(path.join(__dirname,'../assets/events.js'),'utf8');
const sceneFunctions=['setPhase','celebrate','startPlay','gameTick','scheduleGame'].map(name=>{
  const line=html.split('\n').find(line=>line.startsWith('function '+name+'('));
  assert(line,'Missing scene function '+name);return line;
}).join('\n');
function harness(iso){
  let now=Date.parse(iso),sequence=0;const pending=new Map(),audioStats={created:0,started:0},all=new Map();
  class Node{
    constructor(){this.listeners={};this.dataset={};this.children=[];this.style={setProperty(){}};this.checked=false;this.open=false;this.value='12';this.textContent='';this.attrs={};}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
    dispatchEvent(event){for(const fn of this.listeners[event.type]??[])fn(event);return true;}
    async click(){for(const fn of this.listeners.click??[])await fn({type:'click'});}
    setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}
    replaceChildren(){this.children=[];}append(...nodes){this.children.push(...nodes);}get childElementCount(){return this.children.length;}
    remove(){}matches(){return false;}contains(){return false;}showModal(){this.open=true;}close(){this.open=false;}
  }
  const node=selector=>{if(!all.has(selector))all.set(selector,new Node());return all.get(selector);};
  const document=new Node();document.hidden=false;document.querySelector=node;document.querySelectorAll=()=>[];document.createElement=()=>new Node();document.activeElement=null;
  const scene=node('.scene');scene.dataset={phase:'calm',motion:'running'};node('#play-setting').checked=true;
  class FakeDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  class Audio{
    constructor(){audioStats.created++;this.state='suspended';this.destination={};}
    get currentTime(){return now/1000;}async resume(){this.state='running';}async suspend(){this.state='suspended';}
    createGain(){return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}};}
    createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){audioStats.started++;},stop(){this.onended?.();}};}
  }
  const context=vm.createContext({document,Date:FakeDate,window:{AudioContext:Audio},HalvethEventClock:clock,matchMedia:()=>({matches:false}),console,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},setTimeout:(fn,delay)=>{const id=++sequence;pending.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>pending.delete(id)});
  vm.runInContext("const scene=document.querySelector('.scene'),post=document.querySelector('#halveth-post'),playSetting=document.querySelector('#play-setting'),status=document.querySelector('#status');let phase='calm',phaseDeadline=0,gameTimer=0,hearts=0;const width=1000,height=800,color=()=>{},burst=()=>{};\n"+sceneFunctions+"\nscene.addEventListener('halveth:play',e=>startPlay(e.detail.duration,e.detail.preview===true));document.querySelector('#love').addEventListener('click',()=>celebrate(true));",context);
  vm.runInContext(controller,context);
  function advance(ms){const goal=now+ms;for(let count=0;count<20000;count++){let next=null;for(const [id,value]of pending){if(value.at<=goal&&(!next||value.at<next.value.at))next={id,value};}if(!next){now=goal;return;}now=next.value.at;pending.delete(next.id);next.value.fn();}throw Error('Timer runaway');}
  return {node,scene,document,audioStats,advance};
}
test('Scheduled finale starts on time and resolves without interaction; sound stays off',()=>{
  const h=harness('2026-09-12T12:59:59Z');
  assert.equal(h.node('#event-countdown').textContent,'00:00:01');
  h.advance(1000);assert.equal(h.scene.dataset.phase,'mischief');
  h.advance(22000);assert.equal(h.scene.dataset.phase,'love');
  h.advance(5000);assert.equal(h.scene.dataset.phase,'calm');
  assert.equal(h.audioStats.created,0);assert.equal(h.audioStats.started,0);
});
test('Preview does not re-enable automatic events, and heart cancels while motion is paused',async()=>{
  const h=harness('2026-09-12T12:30:00Z');h.node('#play-setting').checked=false;h.scene.dataset.motion='paused';
  await h.node('#event-preview').click();assert.equal(h.scene.dataset.phase,'mischief');assert.equal(h.node('#play-setting').checked,false);
  await h.node('#love').click();assert.equal(h.scene.dataset.phase,'love');assert.equal(h.scene.dataset.hearts,'1');
  h.advance(5000);assert.equal(h.scene.dataset.phase,'calm');
});
test('Both preview routes consume a scheduled boundary crossed during playback',async()=>{
  for(const selector of ['#event-preview','#try-play']){
    const h=harness('2026-09-12T12:59:55Z');await h.node(selector).click();h.advance(6000);await h.node('#love').click();
    h.advance(6000);assert.equal(h.scene.dataset.phase,'calm',selector+' must not replay');
  }
});
test('Heart during the one-hour countdown soothes that scheduled round',async()=>{
  const h=harness('2026-09-12T12:59:50Z');await h.node('#love').click();h.advance(16000);assert.equal(h.scene.dataset.phase,'calm');
});
test('Sounds require opt-in and stop when the page becomes hidden',async()=>{
  const h=harness('2026-09-12T12:30:00Z');assert.equal(h.audioStats.created,0);await h.node('#sound-toggle').click();
  assert.equal(h.audioStats.created,1);assert(h.audioStats.started>0);const count=h.audioStats.started;
  h.document.hidden=true;h.document.dispatchEvent({type:'visibilitychange'});h.advance(40000);assert.equal(h.audioStats.started,count);
  await h.node('#sound-toggle').click();assert.equal(h.node('#sound-toggle').getAttribute('aria-pressed'),'false');
});
