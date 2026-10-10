/* HALVETH PIRL 2.0. Local text records and a bounded queue teaching model.
 * No source text is interpreted as code or execution authority.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HalvethWorkshop = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const SCHEMA = 'halveth.transition-workshop.v1';
  const SCOPE = 'LOCAL_TEXT_WORKSHOP';
  const MAX_RECORDS = 128, MAX_IMPORT_BYTES = 262144;
  const MODEL = Object.freeze({id:'bounded-queue.v1', initial:30, threshold:80, capacity:100, unit:'MODEL_ITEMS'});
  function fail(field) { throw new TypeError('INVALID_WORKSHOP_' + field); }
  function shape(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('OBJECT');
    if (Reflect.ownKeys(value).length !== keys.length) fail('FIELDS');
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) fail('FIELDS');
    }
  }
  function text(value, max) {
    if (typeof value !== 'string' || !value.trim() || value.length > max ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) fail('TEXT');
    for (let i=0; i<value.length; i++) {
      const code=value.charCodeAt(i);
      if (code>=0xd800 && code<=0xdbff) {
        const next=value.charCodeAt(++i);
        if (!(next>=0xdc00 && next<=0xdfff)) fail('UNICODE');
      } else if (code>=0xdc00 && code<=0xdfff) fail('UNICODE');
    }
    return value;
  }
  function time(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z(?![\s\S])/.test(value)) fail('TIME');
    const date=new Date(value);
    if (!Number.isFinite(date.getTime()) || date.toISOString()!==value) fail('TIME');
    return value;
  }
  function choice(value, values) { if (!values.includes(value)) fail('CHOICE'); return value; }
  function integer(value) {
    if (!Number.isSafeInteger(value) || Object.is(value,-0) || value<0 || value>100) fail('NUMBER');
    return value;
  }
  // Sorted keys define this schema's canonical JSON; this is not RFC 8785.
  function canonical(value) {
    let nodes=0;
    function visit(item, depth) {
      if (++nodes>20000 || depth>16) fail('LIMIT');
      if (item===null || typeof item==='boolean') return item;
      if (typeof item==='string') { if(item.length) text(item,MAX_IMPORT_BYTES); return item; }
      if (typeof item==='number') {
        if(!Number.isSafeInteger(item)||Object.is(item,-0)) fail('NUMBER');
        return item;
      }
      if (Array.isArray(item)) {
        if(item.length>MAX_RECORDS || Reflect.ownKeys(item).length!==item.length+1) fail('ARRAY');
        return Array.from({length:item.length},(_,i)=>{
          const d=Object.getOwnPropertyDescriptor(item,String(i));
          if(!d||!Object.hasOwn(d,'value')||!d.enumerable)fail('ARRAY');
          return visit(d.value,depth+1);
        });
      }
      if (!item || typeof item!=='object') fail('JSON');
      const keys=Reflect.ownKeys(item);
      if(keys.some(key=>typeof key!=='string')) fail('KEY');
      shape(item,keys);
      const output=Object.create(null);
      for(const key of keys.sort()) {
        if(!/^[A-Za-z][A-Za-z0-9]*(?![\s\S])/.test(key)) fail('KEY');
        output[key]=visit(item[key],depth+1);
      }
      return output;
    }
    const result=JSON.stringify(visit(value,0));
    if(new TextEncoder().encode(result).length>MAX_IMPORT_BYTES) fail('SIZE');
    return result;
  }
  function freeze(value) {
    if (value && typeof value==='object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  async function sha256(value) {
    if(!globalThis.crypto?.subtle) throw new Error('SHA256_UNAVAILABLE');
    const bytes=new TextEncoder().encode(value);
    const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  function inputRecord(input) {
    shape(input,['sourceText','reading','nearText','farText','targetKind','targetAddress']);
    return {
      sourceText:text(input.sourceText,4000),
      reading:choice(input.reading,['UNKNOWN','AFFIRMED','NEGATED','QUOTED_ONLY']),
      nearText:text(input.nearText,1000), farText:text(input.farText,1000),
      targetKind:choice(input.targetKind,['ROOT','LOCAL','GITHUB','EXTERNAL']),
      targetAddress:text(input.targetAddress,300)
    };
  }
  async function endpoint(record) {
    return {kind:'LOCAL',id:record.id,digest:await sha256(canonical(record)),
      semanticAddress:'halveth:workshop/'+record.id,binding:'LOCAL_RECORD_HASHED'};
  }
  async function base(input, recordedAt) {
    const source={id:'source-1',text:input.sourceText,encoding:'UTF-8',
      byteLength:new TextEncoder().encode(input.sourceText).length,sha256:await sha256(input.sourceText),
      eventTime:'UNKNOWN',recordedAt,clock:'VISITOR_DEVICE',provenance:'VISITOR_SUPPLIED_TEXT'};
    const sourceEndpoint=await endpoint(source);
    const candidate={id:'candidate-1',source:sourceEndpoint,
      sourceSpan:{start:0,end:input.sourceText.length,unit:'UTF16'},
      selectedReading:input.reading,readingBasis:'USER_SELECTED_WHOLE_SOURCE',
      contentStatus:'ADDRESSED',executionStatus:'SEALED_NOT_EXECUTABLE',authority:'UNBOUND'};
    const frames=[['a',input.nearText],['b',input.farText]].map(([id,value])=>({
      id:'frame-'+id,observerId:'observer-'+id,position:'USER_DESCRIBED_VIEW_'+id.toUpperCase(),
      text:value,scope:SCOPE,eventIdentity:'UNKNOWN',observedAt:'UNKNOWN',recordedAt,
      clock:'VISITOR_DEVICE',evidence:'SELF_DECLARED',provenanceCluster:'SAME_VISITOR_INPUT'
    }));
    const target={kind:input.targetKind,id:'target-unbound',digest:'UNKNOWN',
      semanticAddress:input.targetAddress,binding:'UNBOUND'};
    function relation(id,left,right,definition,direction) {
      return {id,left,right,relationDefinition:definition,direction,scope:SCOPE,
        time:{eventTime:'UNKNOWN',recordedAt},source:sourceEndpoint,
        evidence:'LOCAL_STRUCTURE_ONLY',authority:'NONE',writeDomain:'RELATIONS_ONLY'};
    }
    return {schema:SCHEMA,version:'1.0.0',input,source,candidate,frames,
      relations:[relation('relation-source',sourceEndpoint,await endpoint(candidate),'SOURCE_FOR_READING','LEFT_TO_RIGHT'),
        relation('relation-views',await endpoint(frames[0]),await endpoint(frames[1]),'COMPARE_DECLARED_VIEWS','UNKNOWN'),
        relation('relation-target',await endpoint(candidate),target,'PROPOSED_CONNECTION','UNKNOWN')],
      claimCeiling:'LOCAL_DRAFT_AND_SYNTHETIC_MODEL',
      simulation:{model:MODEL,load:MODEL.initial,records:[]}};
  }
  async function create(input, recordedAt) {
    // Snapshot validated scalar input before the first asynchronous digest.
    const bound=inputRecord(input); time(recordedAt);
    return freeze(await base(bound,recordedAt));
  }
  async function makeStep(previous, request, recordedAt) {
    shape(request,['kind','incoming','processed']);
    choice(request.kind,['STEP','RESTORE']); integer(request.incoming); integer(request.processed); time(recordedAt);
    if(request.kind==='RESTORE'&&(request.incoming!==0||request.processed!==0)) fail('RESTORE_REQUEST');
    const records=previous.simulation.records;
    if(records.length>=MAX_RECORDS) fail('RECORD_LIMIT');
    const tail=records.at(-1);
    if(recordedAt<(tail?.recordedAt??previous.source.recordedAt)) fail('CLOCK_ORDER');
    const before=previous.simulation.load;
    const projected=request.kind==='RESTORE'?MODEL.initial:Math.max(0,before+request.incoming-request.processed);
    const decision=projected>MODEL.threshold?'HELD':'APPLIED';
    const after=decision==='HELD'?before:projected;
    return {id:'transition-'+(records.length+1),request:{...request},
      before,projected,after,decision,rule:'PROJECTED_LOAD_LTE_80',
      beforeDigest:await sha256(canonical({load:before})),afterDigest:await sha256(canonical({load:after})),
      previousDigest:await sha256(canonical(tail??{model:MODEL,source:previous.source.sha256})),
      recoveryTarget:'INITIAL_MODEL_STATE',restoredFrom:request.kind==='RESTORE'?'MODEL_INITIAL_30':null,
      authority:'LOCAL_MODEL_ONLY',eventTime:'UNKNOWN',recordedAt,clock:'VISITOR_DEVICE'};
  }
  async function verify(record) {
    // Validate JSON representation, then detach so caller mutations cannot race hashing.
    const copy=JSON.parse(canonical(record));
    shape(copy,['schema','version','input','source','candidate','frames','relations','claimCeiling','simulation']);
    shape(copy.simulation,['model','load','records']);
    const expected=await base(inputRecord(copy.input),time(copy.source.recordedAt));
    if(!Array.isArray(copy.simulation.records))fail('RECORDS');
    for(const step of copy.simulation.records) {
      const next=await makeStep(expected,step.request,step.recordedAt);
      if(canonical(next)!==canonical(step))fail('TRANSITION');
      expected.simulation.records.push(next); expected.simulation.load=next.after;
    }
    if(canonical(expected)!==canonical(copy))fail('CONTRACT');
    return freeze(expected);
  }
  async function transition(record, request, recordedAt) {
    // Requests also get a detached snapshot before any await.
    const bound=JSON.parse(canonical(request)); time(recordedAt);
    const verified=await verify(record);
    const next=await makeStep(verified,bound,recordedAt);
    return freeze({...verified,simulation:{model:MODEL,load:next.after,records:[...verified.simulation.records,next]}});
  }
  async function exportRecord(record) {
    const verified=await verify(record),canonicalRecord=canonical(verified);
    return freeze({schema:'halveth.transition-workshop.export.v1',encoding:'UTF-8',
      canonicalRecord,sha256:await sha256(canonicalRecord),claimCeiling:'LOCAL_DRAFT_AND_SYNTHETIC_MODEL'});
  }
  async function importRecord(raw) {
    if(typeof raw!=='string'||raw.length>MAX_IMPORT_BYTES||new TextEncoder().encode(raw).length>MAX_IMPORT_BYTES)fail('SIZE');
    let envelope; try{envelope=JSON.parse(raw);}catch{fail('JSON');}
    shape(envelope,['schema','encoding','canonicalRecord','sha256','claimCeiling']);
    if(envelope.schema!=='halveth.transition-workshop.export.v1'||envelope.encoding!=='UTF-8'||
        envelope.claimCeiling!=='LOCAL_DRAFT_AND_SYNTHETIC_MODEL'||typeof envelope.canonicalRecord!=='string')fail('ENVELOPE');
    if(await sha256(envelope.canonicalRecord)!==envelope.sha256)fail('DIGEST');
    const verified=await verify(JSON.parse(envelope.canonicalRecord));
    if(canonical(verified)!==envelope.canonicalRecord)fail('CANONICAL');
    return verified;
  }
  return Object.freeze({create,verify,transition,exportRecord,importRecord,canonical,sha256,SCHEMA,MODEL,MAX_RECORDS,MAX_IMPORT_BYTES});
});
