import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the shipped inline runtime with a small Canvas/DOM stand-in. This
// checks state transitions, not a substitute for GPU/browser visual review.
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function runtime(width=1280,height=720,devicePixelRatio=1){
  const viewport={width,height},calls=[],listeners={};let arc;
  const context=new Proxy({
    createRadialGradient:()=>({addColorStop(){}}),
    arc:(...args)=>{arc=args;},
    fill(){calls.push({kind:'fill',color:context.fillStyle,alpha:context.globalAlpha,arc});},
  },{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
  class Element{
    constructor(id){this.id=id;this.value=id==='force'?'115':id==='quality'?'auto':'';this.checked=true;this.style={setProperty(){}};this.events={};this.hidden=true;}
    addEventListener(type,fn){this.events[type]=fn;}
    setAttribute(){}
    getBoundingClientRect(){return {left:0,top:0,...viewport};}
    getContext(type){return type==='webgl'?null:context;}
    closest(){return null;}
    click(){this.events.click?.({target:this});}
  }
  const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
  const document={getElementById:id=>elements.get(id),querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn};
  const window={devicePixelRatio,matchMedia:()=>({matches:false}),addEventListener:(type,fn)=>listeners[type]=fn};
  const scope={document,window,HTMLElement:Element,structuredClone,console,performance:{now:()=>100},requestAnimationFrame(){},setTimeout:()=>1,clearTimeout(){}};
  vm.runInNewContext(script.replace(/\}\)\(\);\s*$/,`globalThis.runtime={fire,undoShot,reset,update,draw,resize,frame,read:()=>structuredClone({objects,dust,sparks,beams,holes,pendingShots,shotsFired,elapsed,eaten,paused,aim,frameCount})};})();`),scope);
  return {api:scope.runtime,elements,viewport,calls};
}
const plain=value=>JSON.parse(JSON.stringify(value));

test('undo restores the pre-shot objects, clocks, fields and queued shots together',()=>{
  const {api,elements}=runtime();
  for(let i=0;i<4;i++)api.fire();
  api.update(.15);
  const before=plain(api.read());
  api.fire();
  assert.equal(api.read().pendingShots.length,1);
  api.update(.2);
  api.undoShot();
  assert.deepEqual(plain(api.read()),before);
  assert.equal(elements.get('rangeStat').textContent,'4 / 4');
});

test('undo is bounded, handles an empty history and reset clears it',()=>{
  const {api,elements}=runtime();
  assert.doesNotThrow(()=>api.undoShot());
  for(let i=0;i<12;i++)api.fire();
  for(let i=0;i<9;i++)api.undoShot();
  assert.equal(api.read().shotsFired,4);
  assert.equal(elements.get('undo-shot').disabled,true);
  api.fire();api.reset();api.undoShot();
  assert.equal(api.read().shotsFired,0);
  assert.equal(api.read().holes.length,0);
  assert.equal(api.read().pendingShots.length,0);
});

test('4K high-DPI viewports respect the shader and foreground pixel budgets',()=>{
  const {api,elements}=runtime(3840,2160,2);
  const background=elements.get('space'),foreground=elements.get('fx');
  assert.ok(background.width*background.height<=1600000);
  assert.ok(foreground.width*foreground.height<=3610000);
  elements.get('quality').value='detail';api.resize();
  assert.ok(background.width*background.height<=4000000);
  assert.ok(background.width*background.height>1600000);
});

test('undo after resizing scales restored positions, queued targets and velocities',()=>{
  const {api,viewport}=runtime();
  api.fire();api.update(.2);
  const before=api.read();api.fire();
  viewport.width*=.5;viewport.height*=.5;api.resize();api.undoShot();
  const after=api.read();
  assert.equal(after.holes[0].x,before.holes[0].x*.5);
  assert.equal(after.holes[0].targetY,before.holes[0].targetY*.5);
  assert.equal(after.objects[0].vx,before.objects[0].vx*.5);
});

test('the solid black core is painted after foreground tracers and effects',()=>{
  const {api,calls}=runtime();
  api.fire();api.update(.3);api.draw();
  const lastFill=calls.at(-1);
  assert.equal(lastFill.color,'#000000');
  assert.equal(lastFill.alpha,1);
  assert.ok(lastFill.arc[2]>20);
});

test('each new field keeps a finite, stable orientation across update steps',()=>{
  const {api}=runtime();api.fire();
  const before=api.read().holes[0];api.update(.2);
  const after=api.read().holes[0];
  assert.ok(before.diskTilt>=.23&&before.diskTilt<=.52);
  assert.ok(Number.isFinite(before.diskAngle));
  assert.equal(after.diskAngle,before.diskAngle);
  assert.equal(after.seed,before.seed);
});

test('pause avoids unchanged redraws but adding objects still redraws the paused scene',()=>{
  const {api,elements,calls}=runtime();
  api.frame(116);elements.get('pause').click();
  const before=calls.length;api.frame(132);
  assert.equal(calls.length,before);
  elements.get('spawn').click();api.frame(148);
  assert.ok(calls.length>before);
});
