import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the shipped inline runtime with a small Canvas/DOM stand-in. This
// checks state transitions, not a substitute for GPU/browser visual review.
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function runtime(width=1280,height=720,devicePixelRatio=1,reducedMotion=false){
  const viewport={width,height},calls=[],listeners={};let arc,reloads=0;
  const context=new Proxy({
    createRadialGradient:()=>({addColorStop(){}}),
    arc:(...args)=>{arc=args;},
    fill(){calls.push({kind:'fill',color:context.fillStyle,alpha:context.globalAlpha,arc});},
  },{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
  class Element{
    constructor(id){this.id=id;this.value=id==='force'?'115':id==='quality'?'auto':'';this.checked=true;const values=new Map();this.style={setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k),getPropertyValue:k=>values.get(k)||''};this.events={};this.hidden=true;this.dataset={};this.inert=false;const classes=new Set();this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)};}
    addEventListener(type,fn){this.events[type]=fn;}
    setAttribute(){}
    get clientWidth(){return viewport.width;}
    get clientHeight(){return viewport.height;}
    getBoundingClientRect(){const scale=this.id==='stage'&&elements.get('world-layer')?.classList.contains('void-pull-target')?Number(document.body.style.getPropertyValue('--capture-scale')||1):1;return {left:0,top:0,width:viewport.width*scale,height:viewport.height*scale};}
    getContext(type){return type==='webgl'?null:context;}
    closest(){return null;}
    click(){this.events.click?.({target:this});}
    focus(){document.activeElement=this;}
    contains(el){return el===this;}
  }
  const elements=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
  const document={body:new Element('body'),getElementById:id=>elements.get(id),querySelectorAll:()=>[],createElement:tag=>new Element(tag),addEventListener:(type,fn)=>listeners[type]=fn};
  const window={devicePixelRatio,location:{reload:()=>{reloads++;}},matchMedia:()=>({matches:reducedMotion}),addEventListener:(type,fn)=>listeners[type]=fn};
  const scope={document,window,HTMLElement:Element,structuredClone,console,performance:{now:()=>100},requestAnimationFrame(){},setTimeout:()=>1,clearTimeout(){}};
  vm.runInNewContext(script.replace(/\}\)\(\);\s*$/,`globalThis.runtime={fluidPoint,CAPTURE_SECONDS,readFlow:()=>captureRender?({vertices:captureRender.data.length/5,indices:captureRender.order.length,width:captureRender.output.width,height:captureRender.output.height,last:captureRender.last}):null,fire,undoShot,reset,update,draw,resize,frame,updateCapture,readCapture:()=>({...capture}),read:()=>structuredClone({objects,dust,sparks,beams,holes,pendingShots,shotsFired,elapsed,eaten,paused,aim,frameCount})};})();`),scope);
  return {api:scope.runtime,elements,viewport,calls,listeners,document,reloadCount:()=>reloads,point:(x,y)=>elements.get('fx').events.pointerdown({clientX:x,clientY:y})};
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

test('ordinary outgoing shots never self-capture just because they start at the emitter',()=>{
  const {api,elements}=runtime();
  api.fire();api.update(.4);
  assert.equal(api.readCapture().phase,'idle');
  assert.equal(elements.get('world-layer').inert,false);
});

test('an armed emitter destination drains for 3.6 seconds, blubs, and opens the staged error',()=>{
  const {api,point,elements,reloadCount}=runtime();
  point(1280*.115,720*.51);api.update(.2);
  assert.equal(api.readCapture().phase,'idle');
  api.update(.2);
  assert.equal(api.readCapture().phase,'pull');
  assert.equal(elements.get('world-layer').inert,true);
  assert.equal(elements.get('capture-overlay').hidden,false);
  const count=api.read().shotsFired;api.fire();assert.equal(api.read().shotsFired,count);
  api.updateCapture(3.61);
  assert.equal(api.readCapture().phase,'blub');
  api.updateCapture(.7);
  assert.equal(api.readCapture().phase,'void');
  assert.equal(elements.get('capture-panel').hidden,false);
  assert.equal(reloadCount(),0,'the cinematic never reloads the page automatically');
  elements.get('capture-reload').click();assert.equal(reloadCount(),1);
});

test('undo and reset both release the flow renderer and restore page input',()=>{
  const {api,point,elements,document}=runtime();
  for(const recover of [()=>api.undoShot(),()=>api.reset()]){
    point(1280*.115,720*.51);api.update(.4);api.updateCapture(4);api.updateCapture(1);
    assert.equal(api.readCapture().phase,'void');
    recover();
    assert.equal(api.readCapture().phase,'idle');
    assert.equal(elements.get('capture-overlay').hidden,true);
    assert.equal(elements.get('world-layer').inert,false);
    assert.equal(document.body.classList.contains('self-capture'),false);
    assert.equal(elements.get('world-layer').classList.contains('void-pull-target'),false);
    assert.equal(api.read().shotsFired,0);
    assert.equal(api.readFlow(),null);
    assert.equal(elements.get('capture-fallback').hidden,true);
  }
});

test('Escape recovers the staged error even when its reload button has focus',()=>{
  const {api,point,elements,listeners}=runtime();
  point(1280*.115,720*.51);api.update(.4);api.updateCapture(4);api.updateCapture(1);
  let prevented=false;
  listeners.keydown({code:'Escape',target:elements.get('capture-reload'),preventDefault:()=>{prevented=true;}});
  assert.equal(prevented,true);assert.equal(api.readCapture().phase,'idle');
  assert.equal(api.read().shotsFired,0);
});

test('a queued self-hit arms only after launch and cannot replay after recovery',()=>{
  const {api,point}=runtime();
  for(let i=0;i<4;i++)api.fire();
  point(1280*.115,720*.51);point(900,300);
  api.update(.4);assert.equal(api.readCapture().phase,'idle');
  api.update(7);api.update(.4);assert.equal(api.readCapture().phase,'pull');
  api.undoShot();assert.equal(api.readCapture().phase,'idle');
  assert.equal(api.read().pendingShots[0].selfCaptureSpent,true);
  api.update(8);api.update(.4);assert.equal(api.readCapture().phase,'idle');
});

test('reduced motion uses the short fade route and the recovery remains available',()=>{
  const {api,point,elements}=runtime(390,844,1,true);
  point(390*.115,844*.51);api.update(.4);
  api.updateCapture(.29);assert.equal(api.readCapture().phase,'blub');
  api.updateCapture(.21);assert.equal(api.readCapture().phase,'void');
  elements.get('capture-undo').click();
  assert.equal(api.readCapture().phase,'idle');assert.equal(elements.get('world-layer').inert,false);
});

test('resize during the drain keeps the actual DOM fixed and resizes only its flow renderer',()=>{
  const {api,point,elements,viewport}=runtime();
  point(1280*.115,720*.51);api.update(.4);api.updateCapture(1);
  assert.equal(elements.get('stage').getBoundingClientRect().width,1280);
  assert.equal(elements.get('world-layer').style.getPropertyValue('transform'),'');
  assert.ok(api.readFlow().width*api.readFlow().height<=800000);
  api.resize();
  assert.ok(Math.abs(parseFloat(elements.get('capture-overlay').style.getPropertyValue('--capture-x'))-147.2)<1e-9);
  assert.equal(elements.get('fx').width,1280);
  viewport.width=900;api.resize();
  assert.equal(elements.get('capture-overlay').style.getPropertyValue('--capture-x'),'103.5px');
  assert.equal(elements.get('fx').width,900);
});


test('the drain consumes near material first while distant source points remain',()=>{
  const {api}=runtime(),cx=1280*.115,cy=720*.51;
  const near=api.fluidPoint(cx+90,cy,.2),far=api.fluidPoint(cx+900,cy,.2);
  assert.equal(near[2],0,'near source material has entered the core');
  assert.equal(far[2],1,'far material remains visible');
  assert.ok(Math.hypot(far[0]-cx,far[1]-cy)<900);
  assert.ok(Math.hypot(far[0]-cx,far[1]-cy)>850);
});

test('the field is a spatial deformation, not one rigid scale and rotation',()=>{
  const {api}=runtime(),cx=1280*.115,cy=720*.51;
  const close=api.fluidPoint(cx+500,cy,.4),distant=api.fluidPoint(cx+900,cy,.4);
  const closeScale=Math.hypot(close[0]-cx,close[1]-cy)/500;
  const distantScale=Math.hypot(distant[0]-cx,distant[1]-cy)/900;
  assert.ok(distantScale-closeScale>.1);
  const closeTurn=Math.atan2(close[1]-cy,close[0]-cx),farTurn=Math.atan2(distant[1]-cy,distant[0]-cx);
  assert.ok(closeTurn-farTurn>.1,'near material winds faster');
});

test('flow points remain finite and arrive continuously, including corners and the core',()=>{
  const {api}=runtime();
  for(const [width,height] of [[1280,720],[390,844],[3840,2160]]){
    for(const [x,y] of [[0,0],[width,0],[width,height],[width*.115,height*.51]]){
      let previous=Infinity;
      for(let i=0;i<=100;i++){
        const p=api.fluidPoint(x,y,i/100,width,height);
        assert.ok(p.every(Number.isFinite));assert.ok(p[2]>=0&&p[2]<=1);
        const radius=Math.hypot(p[0]-width*.115,p[1]-height*.51);
        assert.ok(radius<=previous+1e-6);previous=radius;
        if(i===100)assert.equal(p[2],0);
      }
    }
  }
});

test('normal capture keeps its full 3.6-second perception window and releases bounded buffers',()=>{
  const {api,point,elements}=runtime(3840,2160,2);
  point(3840*.115,2160*.51);api.update(.4);
  assert.equal(api.CAPTURE_SECONDS,3.6);
  assert.ok(api.readFlow().vertices<=27*19);
  assert.ok(api.readFlow().width*api.readFlow().height<=800000);
  api.updateCapture(3.59);assert.equal(api.readCapture().phase,'pull');
  api.updateCapture(.02);assert.equal(api.readCapture().phase,'blub');
  assert.equal(elements.get('capture-fallback').hidden,true);
  api.undoShot();assert.equal(api.readFlow(),null);
});


test('slow animation callbacks do not stretch the drain beyond its perception window',()=>{
  const {api,point}=runtime();
  point(1280*.115,720*.51);api.update(.4);
  api.frame(1900);api.frame(3700);
  assert.equal(api.readCapture().phase,'blub');
});
