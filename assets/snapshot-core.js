/* Pure local metadata records. No source bytes, wallet access, hashing or minting.
 * Callers supply SHA-256, a cryptographic nonce and their device timestamp.
 * Validation checks their representation, never their truth or authority.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HalvethSnapshotCore=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const SCHEMA='halveth.snapshot.v1';
  const STATEMENT='LOCAL_SNAPSHOT_NOT_MINTED';
  const MAX_SOURCE_BYTES=10*1024*1024;
  const MAX_LABEL_LENGTH=120,MAX_MEDIA_TYPE_LENGTH=127;
  // The negative lookahead requires actual end-of-input; $ permits a final newline.
  const HEX64=/^[0-9a-f]{64}(?![\s\S])/;
  const ACCOUNT=/^0x[0-9a-f]{40}(?![\s\S])/;
  const CHAIN=/^0x(?:0|[1-9a-f][0-9a-f]{0,63})(?![\s\S])/;
  const MEDIA=/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*(?![\s\S])/;
  const DECLARATIONS=Object.freeze({
    sourceDigest:'CALLER_SUPPLIED_NOT_RECOMPUTED_BY_CORE',
    mediaType:'CALLER_DECLARED_NOT_SNIFFED',
    wallet:'CALLER_DECLARED_NOT_AUTHENTICATED',
    nonce:'CALLER_SUPPLIED_RANDOMNESS_NOT_VERIFIED',
    time:'CALLER_SUPPLIED_NOT_TRUSTED_TIMESTAMP',
    rights:'NO_AUTHORSHIP_OWNERSHIP_OR_PERMISSION_PROOF'
  });
  function invalid(field){throw new TypeError('INVALID_SNAPSHOT_'+field);}
  function plain(value,required,optional=[]){
    if(value===null||typeof value!=='object'||Array.isArray(value))invalid('OBJECT');
    const prototype=Object.getPrototypeOf(value);
    if(prototype!==Object.prototype&&prototype!==null)invalid('OBJECT');
    const keys=Reflect.ownKeys(value),allowed=new Set(required.concat(optional));
    for(const key of keys){
      if(typeof key!=='string'||!allowed.has(key))invalid('FIELD');
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)invalid('FIELD');
    }
    for(const key of required)if(!Object.hasOwn(value,key))invalid('MISSING_FIELD');
    return value;
  }
  function hex64(value,field){
    if(typeof value!=='string'||!HEX64.test(value))invalid(field);
    return value;
  }
  function validUnicode(value){
    for(let i=0;i<value.length;i++){
      const code=value.charCodeAt(i);
      if(code>=0xd800&&code<=0xdbff){
        const next=value.charCodeAt(++i);
        if(!(next>=0xdc00&&next<=0xdfff))return false;
      }else if(code>=0xdc00&&code<=0xdfff)return false;
    }
    return true;
  }
  function source(value){
    plain(value,['sha256','byteLength','mediaType'],['label']);
    const sha256=hex64(value.sha256,'SOURCE_DIGEST'),byteLength=value.byteLength;
    if(typeof byteLength!=='number'||!Number.isSafeInteger(byteLength)||
      Object.is(byteLength,-0)||byteLength<0||byteLength>MAX_SOURCE_BYTES)invalid('SOURCE_SIZE');
    const mediaType=value.mediaType;
    if(typeof mediaType!=='string'||mediaType.length>MAX_MEDIA_TYPE_LENGTH||!MEDIA.test(mediaType))invalid('MEDIA_TYPE');
    // Omission of the optional label is the only constructor default.
    const label=Object.hasOwn(value,'label')?value.label:null;
    if(label!==null&&(typeof label!=='string'||label.length>MAX_LABEL_LENGTH||
      !validUnicode(label)||/[\u0000-\u001f\u007f]/.test(label)))invalid('LABEL');
    return Object.freeze({sha256,byteLength,mediaType,label});
  }
  function wallet(value){
    plain(value,['account','chainId']);
    const account=value.account,chainId=value.chainId;
    if(account!==null&&(typeof account!=='string'||!ACCOUNT.test(account)))invalid('ACCOUNT');
    if(chainId!==null&&(typeof chainId!=='string'||!CHAIN.test(chainId)))invalid('CHAIN');
    return Object.freeze({account,chainId});
  }
  function timestamp(value){
    if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z(?![\s\S])/.test(value))invalid('TIME');
    const parsed=new Date(value);
    if(!Number.isFinite(parsed.getTime())||parsed.toISOString()!==value)invalid('TIME');
    return value;
  }
  function prepare(input){
    plain(input,['source','wallet','nonce','createdAt']);
    return Object.freeze({
      schema:SCHEMA,
      stage:'LOCAL_DRAFT',
      status:STATEMENT,
      source:source(input.source),
      wallet:wallet(input.wallet),
      nonce:hex64(input.nonce,'NONCE'),
      createdAt:timestamp(input.createdAt),
      declarations:DECLARATIONS,
      mint:Object.freeze({contract:null,tokenId:null,txHash:null})
    });
  }
  function canonicalRecord(record){
    plain(record,['schema','stage','status','source','wallet','nonce','createdAt','declarations','mint']);
    if(record.schema!==SCHEMA||record.stage!=='LOCAL_DRAFT'||record.status!==STATEMENT)invalid('STATE');
    // Serialized records must contain the complete source shape, including null label.
    plain(record.source,['sha256','byteLength','mediaType','label']);
    plain(record.declarations,Object.keys(DECLARATIONS));
    for(const key of Object.keys(DECLARATIONS))if(record.declarations[key]!==DECLARATIONS[key])invalid('DECLARATION');
    plain(record.mint,['contract','tokenId','txHash']);
    if(record.mint.contract!==null||record.mint.tokenId!==null||record.mint.txHash!==null)invalid('MINT_STATE');
    return prepare({source:record.source,wallet:record.wallet,nonce:record.nonce,createdAt:record.createdAt});
  }
  function serialize(record){
    // A schema-specific fixed order, not a claim to implement general RFC 8785.
    return JSON.stringify(canonicalRecord(record));
  }
  function receipt(record,recordSha256){
    const canonical=canonicalRecord(record);
    hex64(recordSha256,'RECORD_DIGEST');
    return Object.freeze({
      schema:'halveth.snapshot.receipt.v1',
      status:STATEMENT,
      statement:STATEMENT,
      sourceSha256:canonical.source.sha256,
      recordSha256,
      recordHashAlgorithm:'SHA-256',
      recordEncoding:'UTF-8',
      recordDigestState:'CALLER_SUPPLIED_NOT_VERIFIED_BY_CORE',
      canonicalRecord:JSON.stringify(canonical),
      record:canonical
    });
  }
  return Object.freeze({prepare,serialize,receipt,SCHEMA,STATEMENT,
    MAX_SOURCE_BYTES,MAX_LABEL_LENGTH,MAX_MEDIA_TYPE_LENGTH});
});
