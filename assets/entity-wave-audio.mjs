// Created only by the sound button's user gesture. No audio files or network.
export function createWaveAudio(){
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)throw new Error('Audio unavailable');
  const context=new Audio(),master=context.createGain();master.gain.value=.055;master.connect(context.destination);
  let enabled=false,voices=0;
  return {
    async enable(value){await context.resume();enabled=Boolean(value);master.gain.setTargetAtTime(enabled?.055:0,context.currentTime,.08);return enabled;},
    note(index){if(!enabled||context.state!=='running'||voices>=5)return;
      const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
      const scale=[0,2,3,7,9,12,14];oscillator.type='sine';oscillator.frequency.value=220*2**((scale[index%scale.length]+(Math.floor(index/7)%2)*12)/12);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.28,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+.7);
      oscillator.connect(gain);gain.connect(master);voices++;oscillator.onended=()=>{voices--;oscillator.disconnect();gain.disconnect();};oscillator.start(now);oscillator.stop(now+.75);
    },
    dispose(){enabled=false;return context.close();}
  };
}
