/* HALVETH PIRL 2.0. Finite geometric projection; no physical radiation claim. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GStarShapes=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const TAU=Math.PI*2;
  function contour(corners=0,petal=false,segments=32){
    if(!Number.isFinite(corners)||corners<0||corners>1||typeof petal!=='boolean'||!Number.isInteger(segments)||segments<12||segments>64)throw new TypeError('invalid contour');
    const points=[];
    for(let k=0;k<segments;k++){
      const a=k/segments*TAU,c=Math.cos(a),s=Math.sin(a),box=Math.SQRT1_2/Math.max(Math.abs(c),Math.abs(s));
      const r=((1-corners)+corners*box)*(petal?(.9+.1*Math.cos(a*5)):1);
      points.push([c*r,s*r]);
    }
    return points;
  }
  function createPainter(context){
    const paths=new Map(),bits=new Map();
    function path(m){
      const corner=Math.round(m.corners*12)/12,petal=m.form==='PETAL',key=corner+':'+petal;
      if(!paths.has(key)){
        const p=new Path2D(),points=contour(corner,petal);
        points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();paths.set(key,p);
      }
      return paths.get(key);
    }
    function sprite(inner,outer,size=96){
      const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');
      const g=ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
      g.addColorStop(0,inner);g.addColorStop(.28,outer);g.addColorStop(1,'rgba(255,58,45,0)');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);return c;
    }
    const glow=sprite('#ffe0bcdc','#ff493753'),bodyGlow=sprite('#ab382225','#d8321a0d');
    function cell(pose,node,ports,modelMs,reduced){
      const {x,y,r}=pose,m=node.morphology||{angle:0,elongation:1,corners:0,form:'SEED',symbol:'X'};
      const core=node.phase==='CORE',outer=!node.depth,age=node.lastTouch?modelMs-node.lastTouch.at:Infinity;
      const touched=!reduced&&age<800;
      if(outer)context.drawImage(bodyGlow,x-r*1.2,y-r*1.2,r*2.4,r*2.4);
      context.save();context.translate(x,y);context.rotate(m.angle);context.scale(r,r*m.elongation);
      context.fillStyle=core?'#a22b2924':m.form==='TILE'?'#4b23282b':'#3a0d1520';
      context.fill(path(m));context.strokeStyle=touched?'#ffa884bd':core?'#ff685dbf':'#e7484d83';
      context.lineWidth=(outer?1.05:.7)/Math.max(r,1);context.stroke(path(m));context.restore();
      if(r<7)return;
      if(outer){
        if(!bits.has(node.genome)){
          const p=new Path2D();for(let i=0;i<16;i++)if(node.genome&(1<<i)){const a=i/16*TAU;p.moveTo(Math.cos(a)*.66,Math.sin(a)*.66);p.lineTo(Math.cos(a)*.77,Math.sin(a)*.77);}
          if(bits.size>300)bits.clear();bits.set(node.genome,p);
        }
        context.save();context.translate(x,y);context.rotate(m.angle);context.scale(r,r*m.elongation);context.strokeStyle='#df655f55';context.lineWidth=1/Math.max(r,1);context.stroke(bits.get(node.genome));context.restore();
      }
      if(outer&&r>10){
        context.font=`italic ${Math.max(11,r*.43)}px Georgia`;context.textAlign='center';context.textBaseline='middle';context.fillStyle=core?'#ffa48f':'#e0aba0';
        context.fillText(m.symbol,x-r*.12,y+r*.12);
      }
      if(node.phase==='PORT'&&outer){
        for(const a of (ports?.length?ports.slice(0,4):[m.angle,m.angle+Math.PI])){
          const local=a-m.angle,rr=r/Math.sqrt(Math.cos(local)**2+Math.sin(local)**2/(m.elongation*m.elongation));
          context.fillStyle='#ffd0ab';context.beginPath();context.arc(x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.8,0,TAU);context.fill();
        }
      }
      if(touched&&outer){context.strokeStyle=`rgba(255,139,91,${(1-age/800)*.38})`;context.lineWidth=.8;context.beginPath();context.arc(x,y,r*(1+age/900),node.morphology.angle-.7,node.morphology.angle+.7);context.stroke();}
    }
    return {cell,glow,pathCacheSize:()=>paths.size};
  }
  return Object.freeze({contour,createPainter});
});
