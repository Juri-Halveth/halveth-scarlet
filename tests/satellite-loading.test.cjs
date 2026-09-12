// Exercise the production image loader and source selection with a simulated
// Image/clock boundary. No browser, network request or copied loader is used.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const globals=html.split(/\r?\n/).find(line=>line.startsWith('let zoom=1,'));
assert(globals,'Missing production satellite state declaration');
const functions=['setTexture','satelliteSource','requestSatellite'].map(name=>{
  const pattern=name==='setTexture'
    ? /^function setTexture\(image\)\{[^\r\n]*\}/m
    : new RegExp('^function '+name+'\\(\\)\\{[\\s\\S]*?^\\}','m');
  const found=html.match(pattern);
  assert(found,'Missing production function '+name);
  return found[0];
}).join('\n');

const translationScope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/english.js'),'utf8'),translationScope);
function harness(iso='2026-09-12T23:59:58Z',language='de'){
  let now=Date.parse(iso),sequence=0;
  const pending=new Map(),images=[],label={textContent:'',href:''},credit={textContent:'',href:''};
  const scene={dataset:{}},textureImage={name:'embedded-blue-marble'};
  class ClockDate extends Date{static now(){return now;}}
  class ImageBoundary{
    constructor(){this.naturalWidth=2048;this.naturalHeight=1024;images.push(this);}
    set src(value){
      this.url=value;
      // Retain already-queued callbacks to challenge request identity and
      // settlement even after the production code detaches its handlers.
      this.queued={load:this.onload,error:this.onerror};
    }
    get src(){return this.url;}
  }
  const context=vm.createContext({
    L:{t:value=>language==='en'?(translationScope.window.HalvethEnglish[value]??value):value,get:()=>language},
    Date:ClockDate,Image:ImageBoundary,URL,URLSearchParams,scene,textureImage,
    document:{querySelector(selector){
      assert(['#earth-source','#earth-credit'].includes(selector),'Unexpected DOM boundary '+selector);
      return selector==='#earth-source'?label:credit;
    }},
    shift(){},
    setTimeout(fn,delay){const id=++sequence;pending.set(id,{fn,at:now+delay});return id;},
    clearTimeout(id){pending.delete(id);}
  });
  vm.runInContext(globals+'\n'+functions+'\nzoom=2;',context);
  function advance(ms){
    const goal=now+ms;
    for(let count=0;count<100;count++){
      let next=null;
      for(const [id,value] of pending){
        if(value.at<=goal&&(!next||value.at<next.value.at))next={id,value};
      }
      if(!next){now=goal;return;}
      now=next.value.at;pending.delete(next.id);next.value.fn();
    }
    throw Error('Unexpected timer runaway');
  }
  const state=()=>JSON.parse(vm.runInContext('JSON.stringify({key:satelliteKey,state:satelliteState,image:satelliteImage?.src??null,active:activeTexture===textureImage?"blue-marble":activeTexture.src})',context));
  return {images,label,scene,advance,state,request:()=>vm.runInContext('requestSatellite()',context)};
}

function crossMidnight(h){
  h.request();const older=h.images[0];
  h.advance(3000);h.request();const newer=h.images[1];
  assert.equal(new URL(older.src).searchParams.get('TIME'),'2026-09-11');
  assert.equal(new URL(newer.src).searchParams.get('TIME'),'2026-09-12');
  return {older,newer};
}

test('English loading and failure retain the requested date and visible fallback',()=>{
  const h=harness('2026-09-12T23:59:58Z','en');h.request();
  assert.equal(h.label.textContent,'Loading NASA daily imagery · requested image date 2026-09-11 · showing Blue Marble');
  h.advance(15000);
  assert.equal(h.label.textContent,'NASA daily imagery unavailable · requested image date 2026-09-11 · showing Blue Marble');
  assert.equal(h.state().active,'blue-marble');
});

for(const event of ['load','error']){
  test('An old '+event+' across UTC midnight cannot replace the newer image or clear its timeout',()=>{
    const pending=harness(),first=crossMidnight(pending);
    first.older.queued[event]();
    assert.equal(pending.state().state,'loading');
    assert.equal(pending.state().key,'2026-09-12');
    assert.equal(pending.state().active,'blue-marble');
    pending.advance(14999);
    assert.equal(pending.state().state,'loading','The newer request has not timed out early');
    pending.advance(1);
    assert.equal(pending.state().state,'error','The newer request still owns its working timeout');
    assert.match(pending.label.textContent,/nicht verfügbar.*Blue Marble sichtbar/);

    const completed=harness(),second=crossMidnight(completed);
    second.newer.queued.load();
    second.older.queued[event]();
    completed.advance(20000);
    assert.equal(completed.state().state,'ready');
    assert.equal(completed.state().key,'2026-09-12');
    assert.equal(completed.state().image,second.newer.src);
    assert.equal(completed.state().active,second.newer.src);
    assert.equal(completed.scene.dataset.imageSource,'nasa-gibs');
    assert.match(completed.label.textContent,/Bildtag 2026-09-12/);
  });
}

test('A same-day failure can retry after 30 seconds from the attempt, without repeated loading or ready requests',()=>{
  const h=harness('2026-09-12T12:00:00Z');
  h.request();h.request();
  assert.equal(h.images.length,1,'An in-flight request is reused');
  h.advance(1000);h.images[0].queued.error();
  assert.equal(h.state().active,'blue-marble');
  h.request();h.advance(28999);h.request();
  assert.equal(h.images.length,1,'A failed request observes the retry cooldown');
  h.advance(1);h.request();
  assert.equal(h.images.length,2,'Retry becomes available exactly 30 seconds after the attempt');
  assert.equal(h.state().state,'loading');
  h.images[1].queued.load();
  assert.equal(h.state().active,h.images[1].src);
  h.advance(60000);h.request();
  assert.equal(h.images.length,2,'A successful image is reused for the same day');
});

test('Timeout selects Blue Marble and late success cannot revive the timed-out image',()=>{
  const h=harness('2026-09-12T12:00:00Z');h.request();const expired=h.images[0];
  h.advance(15000);
  assert.equal(h.state().state,'error');
  assert.equal(h.state().active,'blue-marble');
  assert.equal(h.scene.dataset.imageSource,'blue-marble');
  assert.match(h.label.textContent,/nicht verfügbar.*Blue Marble sichtbar/);
  assert.equal(expired.onload,null);assert.equal(expired.onerror,null);
  expired.queued.load();
  assert.equal(h.state().state,'error');
  assert.equal(h.state().image,null);
  assert.equal(h.state().active,'blue-marble');
  h.advance(15000);h.request();const retry=h.images[1];
  expired.queued.error();expired.queued.load();
  assert.equal(h.state().state,'loading');
  retry.queued.load();
  assert.equal(h.state().state,'ready');
  assert.equal(h.state().active,retry.src);
});
