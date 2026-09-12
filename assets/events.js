(()=>{'use strict';
const clock=HalvethEventClock,scene=document.querySelector('.scene'),play=document.querySelector('#play-setting'),post=document.querySelector('#halveth-post'),sources=document.querySelector('#sources-dialog'),soundButton=document.querySelector('#sound-toggle'),soundLevel=document.querySelector('#sound-level'),soundStatus=document.querySelector('#sound-status'),stones=document.querySelector('.soul-drops');
const eventTime=document.querySelector('#event-countdown'),eventLabel=document.querySelector('#event-label'),eventNote=document.querySelector('#event-note'),newsTitle=document.querySelector('#news-title'),newsMeta=document.querySelector('#news-meta');
const stories=[...document.querySelectorAll('.source-story[data-publisher]')].map(e=>({title:e.querySelector('a').textContent,url:e.querySelector('a').href,publisher:e.dataset.publisher,date:e.querySelector('time').dateTime}));
const words=['LIEBE BLEIBT','FRAG DIE QUELLE','ZUHÖREN IST MUT','NOCH EIN BLICK','VERTRAUEN WÄCHST','HUMOR HILFT','WISSEN TEILEN'],tones=['#f6a5d9','#b8a7ff','#9dffe1','#ffd99a'];
const handled=new Set(),soothed=new Set();let timer=0,newsIndex=-1,preview=false,lastDrop=0,started=0,storyStep=-1,lastCue=-1,lastSound=-Infinity,soundEnabled=false,audio=null,master=null,voices=new Set();
function mark(set,id){set.add(id);while(set.size>32)set.delete(set.values().next().value);}
function paintSound(){soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.textContent=soundEnabled?'♫ Ton an':'♫ Ton aus';soundStatus.textContent=soundEnabled?'Leise Spielklänge sind eingeschaltet.':'Ton startet erst nach deinem Klick.';}
function stopVoices(){for(const node of voices){try{node.stop();}catch{}}voices.clear();}
async function toggleSound(){
  if(soundEnabled){soundEnabled=false;stopVoices();if(audio)await audio.suspend().catch(()=>{});paintSound();return;}
  try{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=Number(soundLevel.value)/100;master.connect(audio.destination);}await audio.resume();soundEnabled=audio.state==='running';paintSound();if(soundEnabled)cue('love');}
  catch{soundEnabled=false;paintSound();soundStatus.textContent='Ton ist in diesem Browser nicht verfügbar.';}
}
function note(frequency,when,duration,kind='sine'){
  if(!soundEnabled||!audio||audio.state!=='running'||document.hidden||voices.size>=24)return;
  const osc=audio.createOscillator(),gain=audio.createGain();osc.type=kind;osc.frequency.setValueAtTime(frequency,when);gain.gain.setValueAtTime(.001,when);gain.gain.exponentialRampToValueAtTime(.26,when+.025);gain.gain.exponentialRampToValueAtTime(.001,when+duration);osc.connect(gain);gain.connect(master);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(when);osc.stop(when+duration+.01);
}
function cue(kind){if(!soundEnabled||!audio||document.hidden)return;const now=audio.currentTime;if(now-lastSound<.2)return;lastSound=now;const melody=kind==='love'?[261.63,329.63,392,523.25]:kind==='arrival'?[220,164.81,146.83,293.66]:[196,246.94];melody.forEach((f,i)=>note(f,now+i*.13,.38,kind==='arrival'?'triangle':'sine'));}
function drop(){if(document.hidden||scene.dataset.motion==='paused'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(stones.childElementCount>=8)return;const stone=document.createElement('div');stone.className='soul-drop';stone.style.setProperty('--x',(22+Math.random()*55)+'%');stone.style.setProperty('--stone',tones[Math.floor(Math.random()*tones.length)]);const gem=document.createElement('b'),word=document.createElement('span');gem.textContent='◆';word.textContent=words[Math.floor(Math.random()*words.length)];stone.append(gem,word);stones.append(stone);stone.addEventListener('animationend',()=>stone.remove(),{once:true});}
function renderNews(now){if(!stories.length)return;const wire=document.querySelector('.newswire');if(wire.matches(':hover')||wire.contains(document.activeElement))return;const index=Math.floor(now/14000)%stories.length;if(index===newsIndex)return;newsIndex=index;const item=stories[index];newsTitle.textContent=item.title;newsTitle.href=item.url;newsMeta.textContent=item.publisher+' · '+item.date+' · Quellenstand 12.09.2026';}
function trigger(duration=clock.FINALE,isPreview=false,id=null){preview=isPreview;if(id)mark(handled,id);const state=clock.at(Date.now());if(isPreview&&state.active)mark(handled,state.previousId);scene.dispatchEvent(new CustomEvent('halveth:play',{detail:{duration,preview:isPreview}}));}
function tick(){
  clearTimeout(timer);timer=0;if(document.hidden)return;
  const now=Date.now(),state=clock.at(now),muted=soothed.has(state.nextId);renderNews(now);
  const prelude=play.checked&&state.prelude&&!muted;scene.dataset.prelude=String(prelude);eventTime.dateTime=new Date(state.nextAt).toISOString();
  if(prelude){eventLabel.textContent='1-STUNDEN-SPIELCOUNTDOWN';eventTime.textContent=state.countdown;eventNote.textContent='Finale um '+state.nextLabel+' · Berlin';}
  else{eventLabel.textContent=muted?'FÜR DIESE RUNDE ALLES GRÜN':'NÄCHSTES SPIELEVENT';eventTime.textContent=state.nextLabel;eventNote.textContent=play.checked?'Eine Stunde vorher, ab '+state.opensLabel+' · Berlin':'Automatische Spielevents ausgeschaltet';}
  if(state.active&&preview&&scene.dataset.phase!=='calm')mark(handled,state.previousId);
  if(state.active&&play.checked&&scene.dataset.motion!=='paused'&&!post.open&&!sources.open&&scene.dataset.phase==='calm'&&!handled.has(state.previousId)&&!soothed.has(state.previousId)){trigger(state.remainingFinale,false,state.previousId);}
  if(scene.dataset.phase==='mischief'){
    const age=now-started,step=Math.min(3,Math.floor(age/5500));
    if(step!==storyStep){storyStep=step;document.querySelector('#moment-line').textContent=['AHAA… DA SIND NEWS.','BÖSE NEWS? ERST MAL LESEN.','EIN STEIN. EINE NEUE SICHT.','HEHEHE… EIN HERZ FEHLT NOCH.'][step];document.querySelector('#moment-label').textContent=preview?'SPIELVORSCHAU · SCARLET':'SPIELFINALE · SCARLET';document.querySelector('#moment-note').textContent='Fang die Stimmung mit einem Herz auf.';}
    if(now-lastDrop>850){lastDrop=now;drop();}
    const second=Math.floor(age/1000);if(second!==lastCue){lastCue=second;if(second>=17&&second<22)note(220+(second-17)*44,audio?audio.currentTime:0,.1);}
  }
  timer=setTimeout(tick,scene.dataset.phase==='mischief'?250:1000);
}
scene.addEventListener('halveth:phase',e=>{if(e.detail.phase==='mischief'){started=Date.now();lastDrop=0;storyStep=-1;lastCue=-1;cue('arrival');}if(e.detail.phase==='love'){stones.replaceChildren();stopVoices();cue('love');}if(e.detail.phase==='calm')preview=false;});
document.querySelector('#love').addEventListener('click',()=>{const state=clock.at(Date.now());if(state.active)mark(soothed,state.previousId);else if(state.prelude&&!preview)mark(soothed,state.nextId);preview=false;tick();});
document.querySelector('#try-play').addEventListener('click',()=>{post.close();trigger(clock.FINALE,true);tick();});
document.querySelector('#event-preview').addEventListener('click',()=>{trigger(clock.FINALE,true);tick();});
soundButton.addEventListener('click',toggleSound);soundLevel.addEventListener('input',()=>{if(master)master.gain.setTargetAtTime(Number(soundLevel.value)/100,audio.currentTime,.05);});
for(const button of document.querySelectorAll('.sources-open'))button.addEventListener('click',()=>sources.showModal());document.querySelector('#sources-close').addEventListener('click',()=>sources.close());
play.addEventListener('change',tick);document.addEventListener('visibilitychange',()=>{clearTimeout(timer);timer=0;stones.replaceChildren();stopVoices();if(document.hidden){if(audio)audio.suspend().catch(()=>{});}else{if(soundEnabled&&audio)audio.resume().catch(()=>{});tick();}});
paintSound();tick();
})();
