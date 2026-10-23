import {signatureFor,signaturePoint,validateSignature,FAMILIES} from './entity-signatures.mjs';
import {createWaveState,waveAction,advanceWave,wavePose,waveSummary,WAVE_INTERVAL,WAVE_ENTRY} from './entity-wave-model.mjs';

// One shared line buffer and instanced membranes keep all registry identities visible.
export function createEntityWave(T,entities,{reducedMotion=false}={}){
  const group=new T.Group();group.position.y=1.4;
  const slices=36,vertices=slices*3*2,owned=[],remember=value=>{owned.push(value);return value;};
  let state=createWaveState(entities.length,{reducedMotion}),history=[],lastSample=-Infinity;
  const signatures=entities.map(signatureFor),local=[];
  const positions=new Float32Array(entities.length*vertices*3),colors=new Float32Array(positions.length);
  const geometry=remember(new T.BufferGeometry());geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const lines=new T.LineSegments(geometry,remember(new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.92})));lines.frustumCulled=false;group.add(lines);
  const spinePositions=new Float32Array(Math.max(0,entities.length-1)*6);
  const spineGeometry=remember(new T.BufferGeometry());spineGeometry.setAttribute('position',new T.BufferAttribute(spinePositions,3).setUsage(T.DynamicDrawUsage));
  const spine=new T.LineSegments(spineGeometry,remember(new T.LineBasicMaterial({color:'#e3bbd8',transparent:true,opacity:.4})));spine.frustumCulled=false;group.add(spine);
  const trailPositions=new Float32Array(entities.length*10*6),trailGeometry=remember(new T.BufferGeometry());trailGeometry.setAttribute('position',new T.BufferAttribute(trailPositions,3).setUsage(T.DynamicDrawUsage));
  const trailMaterial=remember(new T.LineBasicMaterial({color:'#79bbb9',transparent:true,opacity:.2}));
  const trails=new T.LineSegments(trailGeometry,trailMaterial);trails.frustumCulled=false;group.add(trails);
  const membraneMaterial=remember(new T.MeshBasicMaterial({color:'#111326',transparent:true,opacity:.82,side:T.DoubleSide,depthWrite:false}));
  const rimMaterial=remember(new T.MeshBasicMaterial({color:'#d0bbef',transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}));
  const echoMaterial=remember(new T.MeshBasicMaterial({color:'#9ce5df',wireframe:true,transparent:true,opacity:.7,depthWrite:false}));
  const membranes=new T.InstancedMesh(remember(new T.CircleGeometry(.23,20)),membraneMaterial,entities.length);
  const rims=new T.InstancedMesh(remember(new T.RingGeometry(.226,.244,24)),rimMaterial,entities.length);
  const echoes=new T.InstancedMesh(remember(new T.IcosahedronGeometry(.105,0)),echoMaterial,entities.length);
  for(const mesh of [membranes,rims,echoes]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(mesh);}
  const center=new T.Group();group.add(center);
  center.add(new T.Mesh(remember(new T.CircleGeometry(1.05,64)),remember(new T.MeshBasicMaterial({color:'#03030a',side:T.DoubleSide}))));
  const haloMaterial=remember(new T.MeshBasicMaterial({color:'#f4c3e6',transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));
  center.add(new T.Mesh(remember(new T.RingGeometry(1.06,1.09,96)),haloMaterial));
  const outer=new T.Mesh(remember(new T.RingGeometry(1.35,1.36,96)),remember(new T.MeshBasicMaterial({color:'#86e3d6',transparent:true,opacity:.3,side:T.DoubleSide})));center.add(outer);
  const dummy=new T.Object3D(),quaternion=new T.Quaternion(),echoRotation=new T.Quaternion(),euler=new T.Euler();

  function compile(index){
    const signature=signatures[index],points=[];
    for(let strand=0;strand<3;strand++)for(let step=0;step<slices;step++){
      points.push(...signaturePoint(signature,step/slices,strand),...signaturePoint(signature,(step+1)/slices,strand));
    }
    local[index]=points;const color=new T.Color(FAMILIES[signature.family].color);
    for(let vertex=0;vertex<vertices;vertex++){const p=(index*vertices+vertex)*3;colors[p]=color.r;colors[p+1]=color.g;colors[p+2]=color.b;}
    geometry.attributes.color.needsUpdate=true;
  }
  signatures.forEach((_,i)=>compile(i));
  function animate(dt,camera,{paused=false}={}){
    if(!paused)state=advanceWave(state,dt);
    const poses=entities.map((_,i)=>wavePose(i,state));
    if(!paused && state.time-lastSample>=.14){history.push({time:state.time,poses});if(history.length>12)history.shift();lastSample=state.time;}
    // Echoes use an actually retained older frame, never a future prediction.
    const past=history.find(frame=>state.time-frame.time>=.75)||history[0];
    quaternion.copy(camera.quaternion);center.quaternion.copy(quaternion);center.scale.setScalar(1+state.compression*.32);haloMaterial.opacity=.45+state.compression*.4;
    let segment=0;
    for(let i=0;i<entities.length;i++){
      const pose=poses[i],s=.19*pose.scale,cos=Math.cos(pose.rotation),sin=Math.sin(pose.rotation),src=local[i];
      for(let p=0;p<src.length;p+=3){const out=i*vertices*3+p;positions[out]=pose.position[0]+(src[p]*cos+src[p+2]*sin)*s;positions[out+1]=pose.position[1]+src[p+1]*s;positions[out+2]=pose.position[2]+(-src[p]*sin+src[p+2]*cos)*s;}
      if(i){const before=poses[i-1],connected=pose.entry*before.entry>0;
        for(const point of [connected?before.position:pose.position,pose.position])for(const value of point)spinePositions[segment++]=value;
      }
      dummy.position.fromArray(pose.position);dummy.position.y+=.42*pose.scale;dummy.position.z+=.22*pose.scale;dummy.quaternion.copy(quaternion);dummy.scale.setScalar(pose.scale);dummy.updateMatrix();membranes.setMatrixAt(i,dummy.matrix);rims.setMatrixAt(i,dummy.matrix);
      const old=past?.poses[i];dummy.scale.setScalar(old?.visible?pose.scale:0);euler.set(0,0,old?.rotation||0);echoRotation.setFromEuler(euler);dummy.quaternion.copy(quaternion).multiply(echoRotation);dummy.updateMatrix();echoes.setMatrixAt(i,dummy.matrix);
      for(let j=0;j<10;j++){
        const a=history[j]?.poses[i],b=history[j+1]?.poses[i],out=(i*10+j)*6;
        const valid=a?.visible&&b?.visible&&pose.visible;
        const p=valid?a.position:pose.position,q=valid?b.position:pose.position;
        trailPositions.set(p,out);trailPositions.set(q,out+3);
      }
    }
    trailMaterial.opacity=.21*(1-state.compression);
    for(const g of [geometry,spineGeometry,trailGeometry])g.attributes.position.needsUpdate=true;
    for(const mesh of [membranes,rims,echoes])mesh.instanceMatrix.needsUpdate=true;
    return {...waveSummary(state),historySamples:history.length};
  }
  return {group,animate,
    action(action){state=waveAction(state,action,{reducedMotion});if(action==='REPLAY'){history=[];lastSample=-Infinity;}return waveSummary(state);},
    setSignature(raw){const s=validateSignature(raw),index=entities.findIndex(e=>e.id===s.entityId);if(index>=0&&JSON.stringify(s)!==JSON.stringify(signatures[index])){signatures[index]=s;compile(index);}},
    setReducedMotion(value){reducedMotion=Boolean(value);if(reducedMotion)state={...state,formation:state.total*WAVE_INTERVAL+WAVE_ENTRY,compression:state.to,phase:state.to?'PACKED':'LINKED'};},
    summary:()=>waveSummary(state),
    dispose(){for(const value of owned)value.dispose();group.clear();group.removeFromParent();history=[];}
  };
}
