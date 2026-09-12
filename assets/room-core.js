(function(root){
  'use strict';
  const roles=new Set(['human','ai','program','collective','unspecified']);
  const gestures=new Set(['heart','star','leaf','skip']);
  const issueUrl='https://github.com/Juri-Halveth/halveth-scarlet/issues/1';
  const project='https://github.com/Juri-Halveth/halveth-scarlet';
  function validTime(value){
    if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value))return false;
    const date=new Date(value);
    return Number.isFinite(date.getTime())&&date.toISOString()===(value.includes('.')?value:value.replace('Z','.000Z'));
  }
  function bounded(value,max,required=false){
    if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw Error('INVALID_TEXT');
    const result=value.trim();
    if(required&&!result)throw Error('REQUIRED_TEXT');
    return result;
  }
  function sourceUrl(value){
    const text=bounded(value,400);
    if(!text)return '';
    let url;try{url=new URL(text);}catch{throw Error('INVALID_SOURCE');}
    if(url.protocol!=='https:'||url.username||url.password)throw Error('INVALID_SOURCE');
    return text;
  }
  function prepare(input,createdAt){
    if(!input||!roles.has(input.role)||!gestures.has(input.gesture))throw Error('INVALID_CHOICE');
    if(!validTime(createdAt))throw Error('INVALID_TIME');
    return Object.freeze({schema:'halveth.room-stamp.v1',project,role:input.role,
      entity:bounded(input.entity,64),source:sourceUrl(input.source),
      intendedUse:bounded(input.intent,500,true),thanks:bounded(input.thanks,500),
      gesture:input.gesture,createdAt,clock:'VISITOR_DEVICE',status:'SELF_DECLARED_DRAFT'});
  }
  function format(record,digest){
    if(!/^[a-f0-9]{64}$/.test(digest))throw Error('INVALID_DIGEST');
    return 'HALVETH ROOM STAMP · v1\n\n'+
      'Role (self-declared): '+record.role+'\n'+
      'Perspective: '+(record.entity||'—')+'\n'+
      'Source: '+(record.source||record.project)+'\n'+
      'Intended use (self-declared):\n'+record.intendedUse+'\n\n'+
      'Thanks:\n'+(record.thanks||'—')+'\n\n'+
      'Gesture: '+record.gesture+'\n'+
      'Prepared at (visitor device time): '+record.createdAt+'\n\n'+
      'Record for comparison (UTF-8; SHA-256 below):\n```json\n'+JSON.stringify(record)+'\n```\n'+
      'SHA-256: '+digest+'\n\n'+
      'This is a voluntary declaration, not proof of identity, observed use or an immutable timestamp.';
  }
  function comments(data){
    if(!Array.isArray(data)||data.length>100)throw Error('INVALID_RESPONSE');
    return data.map(c=>{
      if(!c||!Number.isSafeInteger(c.id)||c.id<=0||typeof c.body!=='string'||
        !c.user||typeof c.user.login!=='string'||!c.user.login||!validTime(c.created_at)||
        (c.updated_at!==undefined&&!validTime(c.updated_at)))throw Error('INVALID_RESPONSE');
      const expected=issueUrl+'#issuecomment-'+c.id;
      if(c.html_url!==expected)throw Error('INVALID_SOURCE_LINK');
      return Object.freeze({id:c.id,author:c.user.login.slice(0,100),body:c.body.slice(0,5000),
        shortened:c.body.length>5000,url:expected,createdAt:c.created_at,
        updatedAt:c.updated_at||c.created_at});
    });
  }
  const api=Object.freeze({prepare,format,comments,issueUrl,project});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HalvethRoomCore=api;
})(typeof window==='object'?window:globalThis);
