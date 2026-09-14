(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ChoiceAtelierCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const PRESETS=new Set(['portal','grid','ribbon']);
  const LANES=['mine','ask','no'];

  function clamp(value,min,max){
    const number=Number(value);
    if(!Number.isFinite(number))return min;
    return Math.min(max,Math.max(min,number));
  }

  function coverCrop(sourceWidth,sourceHeight,targetWidth,targetHeight){
    const sw=clamp(sourceWidth,1,1e7);
    const sh=clamp(sourceHeight,1,1e7);
    const tw=clamp(targetWidth,1,1e7);
    const th=clamp(targetHeight,1,1e7);
    const sourceRatio=sw/sh;
    const targetRatio=tw/th;
    if(sourceRatio>targetRatio){
      const width=sh*targetRatio;
      return {sx:(sw-width)/2,sy:0,sw:width,sh};
    }
    const height=sw/targetRatio;
    return {sx:0,sy:(sh-height)/2,sw,sh:height};
  }

  function gridFrames(count,width,height){
    const columns=Math.max(1,Math.ceil(Math.sqrt(count*width/height)));
    const rows=Math.ceil(count/columns);
    const gap=Math.max(12,Math.round(Math.min(width,height)*0.025));
    const cellWidth=(width-gap*(columns+1))/columns;
    const cellHeight=(height-gap*(rows+1))/rows;
    return Array.from({length:count},(_,index)=>({
      x:gap+(index%columns)*(cellWidth+gap),
      y:gap+Math.floor(index/columns)*(cellHeight+gap),
      width:cellWidth,
      height:cellHeight,
      rotation:0
    }));
  }

  function portalFrames(count,width,height){
    if(count===1)return [{x:width*.06,y:height*.07,width:width*.88,height:height*.86,rotation:0}];
    const frames=[];
    const side=Math.max(1,count-1);
    frames.push({x:width*.055,y:height*.065,width:width*.58,height:height*.87,rotation:-1.8});
    for(let index=0;index<side;index+=1){
      const available=height*.76;
      const cardHeight=Math.min(height*.52,available/side+height*.09);
      const y=height*.12+index*(available/side);
      frames.push({x:width*.57,y,width:width*.375,height:cardHeight,rotation:index%2?2.2:-1.2});
    }
    return frames;
  }

  function ribbonFrames(count,width,height){
    const gap=Math.max(8,Math.round(width*.012));
    const cardWidth=(width-gap*(count+1))/count;
    return Array.from({length:count},(_,index)=>({
      x:gap+index*(cardWidth+gap),
      y:index%2?height*.11:height*.055,
      width:cardWidth,
      height:index%2?height*.81:height*.88,
      rotation:index%2?1.4:-1.4
    }));
  }

  function layoutFrames(count,preset,width,height){
    const n=Math.floor(clamp(count,0,8));
    if(!n)return [];
    const w=clamp(width,100,5000);
    const h=clamp(height,100,5000);
    const selected=PRESETS.has(preset)?preset:'portal';
    if(selected==='grid')return gridFrames(n,w,h);
    if(selected==='ribbon')return ribbonFrames(n,w,h);
    return portalFrames(n,w,h);
  }

  function normalizeCaption(value,maxLength=48){
    return String(value??'').replace(/\s+/g,' ').trim().slice(0,clamp(maxLength,1,160));
  }

  function cycleLane(current){
    const index=LANES.indexOf(current);
    return LANES[(index+1+LANES.length)%LANES.length];
  }

  function fileAllowed(file,maxBytes=15*1024*1024){
    if(!file||typeof file!=='object')return false;
    return /^(image\/png|image\/jpeg|image\/webp)$/i.test(String(file.type||''))&&
      Number.isFinite(Number(file.size))&&Number(file.size)>0&&Number(file.size)<=maxBytes;
  }

  return Object.freeze({PRESETS:Object.freeze([...PRESETS]),LANES:Object.freeze([...LANES]),clamp,coverCrop,layoutFrames,normalizeCaption,cycleLane,fileAllowed});
});
