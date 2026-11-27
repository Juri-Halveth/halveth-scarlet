/* HALVETH PIRL 2.0. Display geometry only; the renderer never writes model state. */
const TAU = Math.PI * 2;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const ease = x => { const v = clamp(x, 0, 1); return v * v * (3 - 2 * v); };
const noise = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const COLORS = ['164,240,217', '255,180,140', '207,165,255', '255,118,160'];
const FORM = { seed: .14, shell: .48, time: .66, unfold: 1 };

// Every materialized text state gets exactly one body. IDs and parent endpoints
// come from the text ledger; coordinates are an explicitly separate projection.
export function layoutStates(states, width, height, selectedId) {
  if (!Array.isArray(states) || states.length > 48 || !Number.isFinite(width) || width < 200 || !Number.isFinite(height) || height < 200) throw Error('INVALID_VISUAL_INPUT');
  const ids = new Set();
  for (const state of states) {
    if (!state || typeof state.id !== 'string' || ids.has(state.id)) throw Error('INVALID_VISUAL_STATE');
    ids.add(state.id);
  }
  const cx = width * .5, cy = height * .46, radius = Math.min(width * .205, height * .248);
  const bodies = states.map((state, index) => {
    if (!index) return { id: state.id, x: cx, y: cy, radius, depth: 0, index, selected: state.id === selectedId };
    // Fixed bands keep old positions unchanged when another state is appended.
    const band = Math.floor((index - 1) / 12), slot = (index - 1) % 12;
    const angle = -.65 + slot * TAU / 12 + band * .21;
    return { id: state.id, x: cx + Math.cos(angle) * width * (.365 + band * .022),
      y: cy + Math.sin(angle) * height * (.285 - band * .04),
      radius: Math.min(radius * .23, width * .037, height * .043) / (1 + band * .18),
      depth: Math.sin(angle), index, selected: state.id === selectedId };
  });
  const byId = new Map(bodies.map(body => [body.id, body]));
  const links = states.flatMap(state => (state.parents || []).filter(parent => byId.has(parent.id)).map(parent => ({ from: parent.id, to: state.id })));
  return { cx, cy, radius, bodies, links };
}

export function phaseAmount(phase, previous, elapsedMs, instant = false) {
  if (!Object.hasOwn(FORM, phase) || !Number.isFinite(previous) || !Number.isFinite(elapsedMs)) throw Error('INVALID_VISUAL_PHASE');
  return instant ? FORM[phase] : previous + (FORM[phase] - previous) * ease(elapsedMs / 1400);
}

export function membranePoint(u, strand, radius, time, openness) {
  const angle = strand * TAU / 24;
  const envelope = Math.pow(Math.max(0, Math.sin(u * Math.PI)), .72);
  const breath = 1 + Math.sin(time * .56 + strand * .24) * .035;
  const petal = .72 + openness * .48 * Math.pow(Math.sin(u * Math.PI), 2);
  const wave = Math.sin(u * 11 + strand * .78 + time * .38) * .065;
  const opening = openness * openness * .52 * Math.pow(1 - u, 4);
  const r = (envelope * petal + opening) * breath * (1 + wave);
  const a = angle + .36 * Math.sin(u * Math.PI) + Math.sin(time * .14 + strand) * .022;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  const y = (u - .5) * 2.42 - openness * .28 * Math.sin(u * Math.PI * 2);
  const perspective = 3.8 / (3.8 + z);
  return { x: x * radius * perspective, y: y * radius * perspective, z, light: .3 + (z + 1.4) / 2.8 };
}

export function createLightRenderer(canvas) {
  let ctx;
  try { ctx = canvas.getContext('2d', { alpha: false }); } catch { return null; }
  if (!ctx) return null;
  let width = 0, height = 0, background = null, dpr = 1;
  let activePhase = 'seed', phaseStart = 0, previousForm = FORM.seed, currentForm = FORM.seed;
  let runKey = null, births = new Map();
  const textures = COLORS.map(color => {
    const texture = document.createElement('canvas'); texture.width = texture.height = 96;
    const c = texture.getContext('2d'), g = c.createRadialGradient(48, 48, 0, 48, 48, 48);
    g.addColorStop(0, 'rgba(255,248,232,.96)'); g.addColorStop(.055, 'rgba(' + color + ',.9)');
    g.addColorStop(.22, 'rgba(' + color + ',.2)'); g.addColorStop(1, 'rgba(' + color + ',0)');
    c.fillStyle = g; c.fillRect(0, 0, 96, 96); return texture;
  });
  const light = (x, y, r, color = 0, alpha = 1) => {
    ctx.globalAlpha = alpha; ctx.drawImage(textures[color % 4], x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
  };
  function resize(w, h, ratio) {
    width = w; height = h; dpr = Math.min(ratio || 1, 1.75);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    background = document.createElement('canvas'); background.width = canvas.width; background.height = canvas.height;
    const b = background.getContext('2d'); b.scale(dpr, dpr);
    b.fillStyle = '#07090f'; b.fillRect(0, 0, w, h);
    for (const [x, y, r, color] of [[.54,.43,.53,'32,47,60'],[.59,.48,.28,'86,33,55'],[.33,.61,.34,'22,58,57']]) {
      const g = b.createRadialGradient(w*x,h*y,0,w*x,h*y,w*r);
      g.addColorStop(0,'rgba('+color+',.48)'); g.addColorStop(1,'rgba('+color+',0)'); b.fillStyle=g; b.fillRect(0,0,w,h);
    }
    for (let i=0; i<(w<600?105:210); i++) {
      const x=noise(i*3)*w,y=noise(i*3+1)*h,bright=noise(i*3+2);
      b.fillStyle='rgba(208,224,222,'+(.1+bright*.33)+')'; b.beginPath(); b.arc(x,y,bright>.94?1.05:.55,0,TAU);b.fill();
    }
  }
  function body(shape, time, openness, scale = 1) {
    const radius = shape.radius * scale;
    const color = shape.index ? 1 + shape.index % 3 : 0;
    const {x:cx,y:cy}=shape;
    light(cx,cy,radius*2.35,color,.5);
    if (shape.index) {
      // Small bodies keep their own place and a readable bright boundary.
      const fill=ctx.createRadialGradient(cx-radius*.2,cy-radius*.25,0,cx,cy,radius);
      fill.addColorStop(0,'#c1fff82a');fill.addColorStop(.55,'#11252d');fill.addColorStop(1,'#0a101c');
      ctx.fillStyle=fill;ctx.beginPath();ctx.arc(cx,cy,radius,0,TAU);ctx.fill();
      ctx.lineWidth=shape.selected?1.4:.7;ctx.strokeStyle='rgba('+COLORS[color]+','+(shape.selected ? .85 : .42)+')';ctx.stroke();
      light(cx,cy,radius*.62,color,.9);return;
    }
    // Back-to-front ribbons are a perspective drawing, not physical membranes.
    const ribbons=Array.from({length:24},(_,strand)=>({strand,z:Math.sin(strand*TAU/24)})).sort((a,b)=>a.z-b.z);
    for(const {strand,z} of ribbons){
      if(z>-.45){
        ctx.beginPath();
        for(let k=0;k<=40;k++){
          const p=membranePoint(k/40,strand-.23,radius,time,openness);
          if(!k)ctx.moveTo(cx+p.x,cy+p.y);else ctx.lineTo(cx+p.x,cy+p.y);
        }
        for(let k=40;k>=0;k--){const p=membranePoint(k/40,strand+.23,radius,time,openness);ctx.lineTo(cx+p.x,cy+p.y);}
        ctx.closePath();
        const skin=ctx.createLinearGradient(cx-radius,cy-radius,cx+radius,cy+radius);
        skin.addColorStop(0,'rgba(193,255,231,.015)');skin.addColorStop(.45,'rgba(180,235,215,'+(.035+Math.max(0,z)*.02)+')');skin.addColorStop(1,'rgba(255,169,197,.025)');
        ctx.fillStyle=skin;ctx.fill();
      }
      ctx.beginPath();
      for(let k=0;k<=58;k++){
        const p=membranePoint(k/58,strand,radius,time,openness);
        if(!k)ctx.moveTo(cx+p.x,cy+p.y);else ctx.lineTo(cx+p.x,cy+p.y);
      }
      ctx.lineWidth=z>0?1.15:.65;
      ctx.strokeStyle='rgba('+COLORS[strand%6===0?3:strand%4===0?1:0]+','+(z>0?.31:.11)+')';ctx.stroke();
      const p=membranePoint((time*.075+strand/24)%1,strand,radius,time,openness);
      light(cx+p.x,cy+p.y,7+Math.max(0,z)*7,strand%4,.7);
    }
    // Fine branching veins carry a soft pulse away from the visible origin.
    for(let i=0;i<42;i++){
      const angle=i*2.399963,extent=radius*(.36+noise(i+11)*.83),sway=Math.sin(time*.3+i)*.12;
      const ex=cx+Math.cos(angle+sway)*extent,ey=cy+Math.sin(angle)*extent*.92;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.bezierCurveTo(cx+Math.cos(angle+.6)*extent*.3,cy+Math.sin(angle+.6)*extent*.3,cx+Math.cos(angle-.3)*extent*.65,cy+Math.sin(angle-.3)*extent*.65,ex,ey);
      ctx.lineWidth=.45;ctx.strokeStyle='rgba('+COLORS[i%7===0?1:0]+',.15)';ctx.stroke();
      light(ex,ey,5+noise(i)*7,i%4,.45);
    }
    const core=radius*(.24+.015*Math.sin(time*.8));
    light(cx,cy,core*4,1,.6); light(cx,cy,core*2.2,0,.85);
    const pearl=ctx.createRadialGradient(cx-core*.24,cy-core*.32,0,cx,cy,core);
    pearl.addColorStop(0,'#fffbe6');pearl.addColorStop(.11,'#ecffee');pearl.addColorStop(.28,'#87d9c9');pearl.addColorStop(.63,'#274847');pearl.addColorStop(1,'#0d1821');
    ctx.fillStyle=pearl;ctx.beginPath();ctx.arc(cx,cy,core,0,TAU);ctx.fill();
    ctx.strokeStyle='#bfffe1a0';ctx.lineWidth=.7;ctx.stroke();
    light(cx-core*.15,cy-core*.17,core*.5,1,1);
  }
  function render(snapshot, content, {phase='seed', instant=false}={}) {
    if(!width||!height||!background||!content.states.length)return;
    const time=snapshot.modelMs/1000;
    if(runKey!==content.states[0].id){runKey=content.states[0].id;births=new Map();activePhase=phase;previousForm=currentForm=FORM[phase];phaseStart=snapshot.modelMs;}
    if(phase!==activePhase){previousForm=instant?FORM[phase]:currentForm;activePhase=phase;phaseStart=snapshot.modelMs;}
    currentForm=phaseAmount(phase,previousForm,snapshot.modelMs-phaseStart);
    const scene=layoutStates(content.states,width,height,content.selectedId);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.drawImage(background,0,0,width,height);
    // A lit ground and suspended motes give depth without a spinning camera.
    ctx.save();ctx.translate(scene.cx,scene.cy+scene.radius*1.25);ctx.scale(1,.2);light(0,0,scene.radius*2.8,0,.32);ctx.restore();
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<54;i++){
      const a=i*2.399963,r=scene.radius*(1.3+noise(i+201)*1.5),drift=time*(.004+noise(i)*.005);
      light(scene.cx+Math.cos(a+drift)*r*1.5,scene.cy+Math.sin(a+drift)*r*.72,3+noise(i+1)*4,i%4,.2+noise(i)*.25);
    }
    const bodies=new Map(scene.bodies.map(value=>[value.id,value]));
    for(const link of scene.links){
      const a=bodies.get(link.from),b=bodies.get(link.to),bend=(b.index%2?1:-1)*scene.radius*.55;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2-bend,b.x,b.y);
      ctx.strokeStyle='#bcefd950';ctx.lineWidth=.85;ctx.stroke();
      const p=(time*.13+b.index*.17)%1,q=1-p;
      light(q*q*a.x+2*q*p*(a.x+b.x)/2+p*p*b.x,q*q*a.y+2*q*p*((a.y+b.y)/2-bend)+p*p*b.y,10,b.index%4,.8);
    }
    ctx.globalCompositeOperation='source-over';
    for(const shape of [...scene.bodies].sort((a,b)=>a.depth-b.depth)){
      if(!births.has(shape.id))births.set(shape.id,shape.index&&!instant?snapshot.modelMs:snapshot.modelMs-2000);
      const growth=.18+.82*ease((snapshot.modelMs-births.get(shape.id))/1600);
      body(shape,time,currentForm,growth);
    }
    // These lights are the separate ecology's actual nodes and actual signals.
    const scale=Math.min(width/(snapshot.world.width*1.7),height/(snapshot.world.height*1.7));
    const nodes=new Map(snapshot.nodes.map(node=>[node.id,{x:scene.cx+node.position.x*scale*1.3,y:scene.cy+node.position.y*scale,node}]));
    ctx.globalCompositeOperation='lighter';
    for(const signal of snapshot.signals){
      const a=nodes.get(signal.source),b=nodes.get(signal.target);if(!a||!b)continue;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(scene.cx,scene.cy-scene.radius*.4,b.x,b.y);ctx.strokeStyle='#93dacc30';ctx.lineWidth=.6;ctx.stroke();
    }
    for(const {x,y,node} of nodes.values())light(x,y,node.phase==='REST'?9:18,node.phase==='REST'?0:3,node.depth ? .5 : .85);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  }
  return Object.freeze({resize,render});
}
