import { signaturePoint, validateSignature, FAMILIES } from './entity-signatures.mjs';

export function createSignatureSculpture(T) {
  const group=new T.Group(), form=new T.Group();group.add(form);group.position.y=1.4;
  const owned=[];let current, paused=false, companion;
  function own(value){owned.push(value);return value;}
  function release(){form.clear();for(const item of owned)item.dispose();owned.length=0;}
  function build(raw, offset, scale, color) {
    const s=validateSignature(raw), node=new T.Group();node.position.x=offset;node.scale.setScalar(scale);
    const material=own(new T.LineBasicMaterial({color,transparent:true,opacity:.9}));
    const thin=own(new T.LineBasicMaterial({color,transparent:true,opacity:.19}));
    for(let strand=0;strand<3;strand++) {
      const points=Array.from({length:193},(_,i)=>new T.Vector3(...signaturePoint(s,i/192,strand)));
      const curve=new T.CatmullRomCurve3(points,false,'centripetal');
      const tube=own(new T.TubeGeometry(curve,192,.012+s.values.coherence*.012,5,false));
      const glow=own(new T.MeshBasicMaterial({color,transparent:true,opacity:.8}));
      node.add(new T.Mesh(tube,glow));
      const halo=own(new T.BufferGeometry().setFromPoints(points.map(p=>p.clone().multiplyScalar(1.09))));
      node.add(new T.Line(halo,thin));
      const dots=own(new T.BufferGeometry().setFromPoints(points.filter((_,i)=>i%12===0)));
      node.add(new T.Points(dots,own(new T.PointsMaterial({color:'#fff0e7',size:.045,sizeAttenuation:true}))));
    }
    const core=own(new T.IcosahedronGeometry(.29+s.values.memory*.18,1));
    node.add(new T.Mesh(core,own(new T.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.65}))));
    // The meridian is a coordinate reference, not an orbit or a physical field.
    const meridian=own(new T.BufferGeometry().setFromPoints(Array.from({length:129},(_,i)=>{
      const a=i/128*Math.PI*2;return new T.Vector3(Math.cos(a)*2.35,-1.7,Math.sin(a)*2.35);
    })));
    node.add(new T.Line(meridian,material));form.add(node);return node;
  }
  function rebuild(){release();if(!current)return;const paired=Boolean(companion);build(current,paired?-1.35:0,paired?.64:1,FAMILIES[current.family].color);if(companion)build(companion,1.35,.64,FAMILIES[companion.family].color);}
  return {group,
    set(signature,other=null){current=validateSignature(signature);companion=other?validateSignature(other):null;rebuild();},
    animate(time,isPaused=false){paused=isPaused;if(!current)return;form.rotation.y=paused?form.rotation.y:Math.sin(time*.08)*.25+time*.06*current.values.motion;form.rotation.z=Math.sin(time*.13)*.035;},
    dispose(){release();group.removeFromParent();}
  };
}
