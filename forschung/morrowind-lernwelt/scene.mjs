import { THREE as T, OrbitControls } from './vendor/runtime.mjs';
import { REGIONS, rng } from './core.mjs';

export function createWorld(host, { onSelect, onError, reducedMotion = false }) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'ASHBOUND 3D / Arrow keys: orbit / +/-: zoom / Home: reset');
  host.append(canvas);
  const scene = new T.Scene(); scene.background = new T.Color('#1a2429');
  scene.fog = new T.FogExp2('#1a2429', 0.006);
  const camera = new T.PerspectiveCamera(42, 1, .1, 250);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false; controls.enablePan = false; controls.minDistance = 38;
  controls.maxDistance = 155; controls.minPolarAngle = .3; controls.maxPolarAngle = Math.PI * .46;
  const materials = [], geometries = [];
  const mat = (color, roughness = .85, metalness = .08) => {
    const material = new T.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
    materials.push(material); return material;
  };
  const rock = mat('#3d494b'), dark = mat('#242c30'), pale = mat('#9fa99d'), gold = mat('#c5b878', .4, .6);
  const coral = mat('#c46868'), green = mat('#426d5e'), glow = mat('#65d8ba', .25, .5);
  glow.emissive.set('#246c55'); glow.emissiveIntensity = .6;
  const make = (geometry, material, parent, x, y, z) => {
    geometries.push(geometry); const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  };
  const box = (w,h,d,m,p,x,y,z) => make(new T.BoxGeometry(w,h,d),m,p,x,y,z);
  const cylinder = (top,bottom,h,n,m,p,x,y,z) => make(new T.CylinderGeometry(top,bottom,h,n),m,p,x,y,z);
  const random = rng(7269), island = new T.Group(); scene.add(island);
  const terrain = new T.CylinderGeometry(28, 18, 6, 80, 4);
  const vertices = terrain.attributes.position;
  for (let i=0;i<vertices.count;i++) {
    const x=vertices.getX(i),z=vertices.getZ(i),y=vertices.getY(i);
    const r=Math.hypot(x,z),wave=Math.sin(x*.31)*Math.cos(z*.29);
    if(r>1)vertices.setXYZ(i,x*(1+.08*Math.sin(z*.41)),y+wave*.65,z*(1+.08*Math.cos(x*.33)));
  }
  terrain.computeVertexNormals(); make(terrain,rock,island,0,-2,0);
  cylinder(18,4,13,9,dark,island,0,-11,0);
  for(let i=0;i<52;i++){
    const a=i/52*Math.PI*2,r=27+random()*3,h=2+random()*8;
    cylinder(.5+random(),.9+random(),h,5,i%3?rock:dark,island,Math.cos(a)*r,-h*.4,Math.sin(a)*r);
  }
  const waterMat = new T.MeshStandardMaterial({color:'#244c51',metalness:.6,roughness:.22,transparent:true,opacity:.9}); materials.push(waterMat);
  const water = make(new T.CircleGeometry(115,96),waterMat,scene,0,-20,0); water.rotation.x=-Math.PI/2;water.castShadow=false;
  for(let i=0;i<11;i++){
    const a=i*2.4,r=48+random()*34,h=8+random()*17;
    cylinder(.1,4+random()*5,h,5,dark,scene,Math.cos(a)*r,-19+h/2,Math.sin(a)*r);
  }
  const ambient=new T.HemisphereLight('#d3e8eb','#343934',2.5);scene.add(ambient);
  const sun=new T.DirectionalLight('#fff0d1',3.7);sun.position.set(-20,48,30);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:120});sun.shadow.normalBias=.12;scene.add(sun);
  const fill=new T.DirectionalLight('#82b9ce',1.8);fill.position.set(25,10,-30);scene.add(fill);
  const sites = new Map(), hits = [];
  for(const region of REGIONS){
    const site=new T.Group();site.position.fromArray(region.position);island.add(site);sites.set(region.id,site);
    cylinder(4.7,5.4,1.5,8,pale,site,0,-1,0);
    cylinder(5.6,5.6,.18,8,gold,site,0,-.15,0);
    const area=new T.Mesh(new T.CylinderGeometry(6,6,13,12),new T.MeshBasicMaterial({visible:false}));
    area.position.y=3;area.userData.region=region.id;site.add(area);hits.push(area);
    if(region.id==='haven'){
      for(let i=0;i<3;i++){
        const x=(i-1)*2.7;
        box(2.2,2.5,3.5,pale,site,x,1.2,0);
        cylinder(0,2,2.2,4,green,site,x,3.3,0).rotation.y=Math.PI/4;
        box(.5,1.4,.12,dark,site,x,.9,1.82);
      }
      box(1,.2,8,gold,site,0,-.1,6);
      for(let i=0;i<6;i++)box(3,.15,.7,pale,site,0,-.05,3+i);
    } else if(region.id==='archive'){
      cylinder(3.2,3.7,2,8,pale,site,0,1,0);
      cylinder(2.2,3.2,2.3,8,pale,site,0,3.1,0);
      cylinder(.2,2.6,3,8,gold,site,0,5.7,0);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;box(.3,3.3,.3,gold,site,Math.cos(a)*3.2,2.4,Math.sin(a)*3.2);
        box(.65,1,.2,dark,site,Math.cos(a)*3.6,.9,Math.sin(a)*3.6).rotation.y=-a+Math.PI/2;
      }
    } else if(region.id==='crater'){
      cylinder(2.4,7.8,10,11,dark,site,0,3.5,0);
      const rim=make(new T.TorusGeometry(2.45,.5,6,18),coral,site,0,8.4,0);rim.rotation.x=Math.PI/2;
      const heart=make(new T.OctahedronGeometry(1.2),coral,site,0,10.4,0);heart.userData.float=true;
      const light=new T.PointLight('#ff6756',90,24);light.position.y=8;site.add(light);
      for(let i=0;i<5;i++)box(.25,5,.2,gold,site,Math.cos(i*1.26)*3.8,3.5,Math.sin(i*1.26)*3.8);
    } else if(region.id==='stasis'){
      for(let i=0;i<4;i++)cylinder(.28,.48,5.8,6,pale,site,(i%2?1:-1)*2.8,2.5,(i<2?1:-1)*2.8);
      const ring=make(new T.TorusGeometry(3.7,.16,8,40),gold,site,0,5.5,0);ring.rotation.x=Math.PI/2;
      const stone=make(new T.IcosahedronGeometry(2),dark,site,0,7.2,0);stone.rotation.set(.3,.6,.2);stone.userData.float=true;
      const line=make(new T.TorusGeometry(2.5,.05,5,48),glow,site,0,7.2,0);line.rotation.x=.6;
    } else if(region.id==='garden'){
      cylinder(3.6,3.6,.3,40,green,site,0,.2,0);
      for(let i=0;i<69;i++){
        const a=i*2.39996,r=.38*Math.sqrt(i),h=.18+(i%5)*.1;
        cylinder(.1,.14,h,5,i%3===0?gold:glow,site,Math.cos(a)*r,.45+h/2,Math.sin(a)*r);
      }
      cylinder(.18,.5,4,6,pale,site,0,2,0);
      for(let i=0;i<7;i++){
        const a=i*.9;const branch=box(.15,2,.15,gold,site,Math.cos(a)*.5,3,Math.sin(a)*.5);branch.rotation.z=Math.sin(a)*.8;
        make(new T.OctahedronGeometry(.85),green,site,Math.cos(a)*1.25,3.8+Math.sin(a),Math.sin(a)*1.25);
      }
    } else {
      box(7,.5,3,pale,site,0,.4,0);box(.9,8,1.3,dark,site,-2.5,4,0);box(.9,8,1.3,dark,site,2.5,4,0);
      box(6.1,.6,1.3,gold,site,0,8,0);
      const gateMat=new T.MeshStandardMaterial({color:'#392d49',emissive:'#5c3057',emissiveIntensity:.6,transparent:true,opacity:.85,side:T.DoubleSide});materials.push(gateMat);
      make(new T.PlaneGeometry(4,6.8),gateMat,site,0,4,0);
      for(let i=0;i<8;i++)box(.18,.35,1.4,coral,site,i%2?-2.5:2.5,1+Math.floor(i/2)*1.7,0);
    }
  }
  // Geometric paths connect places; they make no causal or authority claim.
  const pairs=[['haven','garden'],['garden','archive'],['garden','crater'],['garden','stasis'],['archive','gate']];
  for(const [a,b] of pairs){
    const start=sites.get(a).position,end=sites.get(b).position,d=end.clone().sub(start),count=Math.ceil(d.length()/1.2);
    for(let i=1;i<count;i++){
      const p=start.clone().lerp(end,i/count);const tile=box(.95,.2,.9,pale,island,p.x,Math.max(.7,p.y-1.5),p.z);tile.rotation.y=Math.atan2(d.x,d.z);
    }
  }
  const selector=make(new T.TorusGeometry(5.9,.09,6,64),glow,island,0,0,0);selector.rotation.x=Math.PI/2;
  const ray=new T.Raycaster(),pointer=new T.Vector2(); let down=null;
  canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  canvas.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
    const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(hits)[0];if(hit)onSelect(hit.object.userData.region);
  });
  const reset=()=>{camera.position.set(innerWidth<700?64:53,innerWidth<700?61:44,innerWidth<700?90:64);controls.target.set(innerWidth<700?0:-1,1,0);controls.update();}; reset();
  let enabled=true,motion=!reducedMotion,frames=0,last=0,elapsed=0,invalid=true;
  const resize=()=>{const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();invalid=true;};
  const observer=new ResizeObserver(resize);observer.observe(host);
  controls.addEventListener('change',()=>{invalid=true;});
  const zoom=f=>{camera.position.sub(controls.target).multiplyScalar(f).clampLength(38,155).add(controls.target);controls.update();invalid=true;};
  canvas.addEventListener('keydown',e=>{
    if(e.key==='+'||e.key==='=')zoom(.88);else if(e.key==='-')zoom(1.12);else if(e.key==='Home')reset();
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      const v=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(v);
      s.theta+=e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0;
      s.phi=T.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0),.3,1.44);
      camera.position.copy(new T.Vector3().setFromSpherical(s).add(controls.target));controls.update();
    }else return;e.preventDefault();invalid=true;
  });
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();enabled=false;onError();});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
  const floats=[];scene.traverse(o=>{if(o.userData.float)floats.push({o,y:o.position.y});});
  renderer.setAnimationLoop(now=>{
    if(!enabled||document.hidden||now-last<33)return;
    const dt=Math.min((now-last)/1000,.1);last=now;
    if(motion){elapsed+=dt;for(const {o,y}of floats){o.position.y=y+Math.sin(elapsed*.7)*.22;o.rotation.y+=dt*.08;}invalid=true;}
    if(invalid){renderer.render(scene,camera);frames++;invalid=false;}
  });
  return {
    select(id){const r=REGIONS.find(r=>r.id===id);if(r){selector.position.set(r.position[0],r.position[1]-.1,r.position[2]);invalid=true;}},
    reset,zoom,visible(value){enabled=value;invalid=true;},motion(value){motion=value;invalid=true;},
    quality(value){renderer.setPixelRatio(Math.min(devicePixelRatio,value==='high'?2:1.5));resize();},
    get stats(){return {frames,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width:canvas.width,height:canvas.height,motion};},
    dispose(){renderer.setAnimationLoop(null);observer.disconnect();controls.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();}
  };
}
