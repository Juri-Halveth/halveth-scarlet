const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../assets/snapshot-core.js');
const input=()=>({
  source:{sha256:'a'.repeat(64),byteLength:3,mediaType:'text/plain',label:'A snapshot ♥'},
  wallet:{account:'0x'+'b'.repeat(40),chainId:'0x1'},
  nonce:'c'.repeat(64),
  createdAt:'2026-09-12T14:00:00.000Z'
});
const digest=record=>crypto.createHash('sha256').update(core.serialize(record),'utf8').digest('hex');

test('snapshot is metadata only, deeply frozen and explicitly unminted',()=>{
  const fields=input(),record=core.prepare(fields);
  assert.equal(record.schema,'halveth.snapshot.v1');
  assert.equal(record.stage,'LOCAL_DRAFT');
  assert.equal(record.status,'LOCAL_SNAPSHOT_NOT_MINTED');
  assert.deepEqual(record.mint,{contract:null,tokenId:null,txHash:null});
  assert.equal(record.declarations.wallet,'CALLER_DECLARED_NOT_AUTHENTICATED');
  assert.equal(record.declarations.time,'CALLER_SUPPLIED_NOT_TRUSTED_TIMESTAMP');
  assert.equal(record.declarations.rights,'NO_AUTHORSHIP_OWNERSHIP_OR_PERMISSION_PROOF');
  for(const object of [record,record.source,record.wallet,record.declarations,record.mint])assert(Object.isFrozen(object));
  fields.source.sha256='d'.repeat(64);fields.wallet.account=null;
  assert.equal(record.source.sha256,'a'.repeat(64));
  assert.equal(record.wallet.account,'0x'+'b'.repeat(40));
  assert(!Object.hasOwn(record.source,'bytes'));
});

test('exact fixed JSON vector and input key order are stable',()=>{
  const record=core.prepare(input());
  const expected='{"schema":"halveth.snapshot.v1","stage":"LOCAL_DRAFT","status":"LOCAL_SNAPSHOT_NOT_MINTED","source":{"sha256":"'+
    'a'.repeat(64)+'","byteLength":3,"mediaType":"text/plain","label":"A snapshot ♥"},"wallet":{"account":"0x'+
    'b'.repeat(40)+'","chainId":"0x1"},"nonce":"'+'c'.repeat(64)+'","createdAt":"2026-09-12T14:00:00.000Z",'+
    '"declarations":{"sourceDigest":"CALLER_SUPPLIED_NOT_RECOMPUTED_BY_CORE","mediaType":"CALLER_DECLARED_NOT_SNIFFED",'+
    '"wallet":"CALLER_DECLARED_NOT_AUTHENTICATED","nonce":"CALLER_SUPPLIED_RANDOMNESS_NOT_VERIFIED",'+
    '"time":"CALLER_SUPPLIED_NOT_TRUSTED_TIMESTAMP","rights":"NO_AUTHORSHIP_OWNERSHIP_OR_PERMISSION_PROOF"},'+
    '"mint":{"contract":null,"tokenId":null,"txHash":null}}';
  assert.equal(core.serialize(record),expected);
  const reordered=Object.fromEntries(Object.entries(JSON.parse(expected)).reverse());
  reordered.source=Object.fromEntries(Object.entries(reordered.source).reverse());
  assert.equal(core.serialize(reordered),expected);
  assert.equal(core.serialize(JSON.parse(core.serialize(record))),expected);
});

test('source, wallet, nonce and caller timestamp each change the record commitment',()=>{
  const base=core.prepare(input()),hash=digest(base);
  const alternatives=[
    {...input(),source:{...input().source,sha256:'d'.repeat(64)}},
    {...input(),source:{...input().source,byteLength:4}},
    {...input(),source:{...input().source,mediaType:'application/octet-stream'}},
    {...input(),source:{...input().source,label:'Another'}},
    {...input(),wallet:{...input().wallet,account:null}},
    {...input(),wallet:{...input().wallet,chainId:'0xa86a'}},
    {...input(),nonce:'d'.repeat(64)},
    {...input(),createdAt:'2026-09-12T14:00:00.001Z'}
  ];
  const hashes=alternatives.map(value=>digest(core.prepare(value)));
  for(const candidate of hashes)assert.notEqual(candidate,hash);
  assert.equal(new Set(hashes).size,hashes.length);
});

test('explicitly unbound wallet fields and omitted optional label have documented shapes',()=>{
  for(const wallet of [{account:null,chainId:null},{account:null,chainId:'0x1'},{account:input().wallet.account,chainId:null}]){
    assert.deepEqual(core.prepare({...input(),wallet}).wallet,wallet);
  }
  const fields=input();delete fields.source.label;
  assert.equal(core.prepare(fields).source.label,null);
  assert.equal(core.prepare({...input(),source:{...input().source,label:null}}).source.label,null);
  assert.equal(core.prepare({...input(),source:{...input().source,label:''}}).source.label,'');
  for(const wallet of [{},{account:null},{chainId:null},{account:undefined,chainId:null}])assert.throws(()=>core.prepare({...input(),wallet}));
});

test('10 MiB is an inclusive bound and numeric coercions are rejected',()=>{
  for(const byteLength of [0,core.MAX_SOURCE_BYTES])assert.equal(core.prepare({...input(),source:{...input().source,byteLength}}).source.byteLength,byteLength);
  for(const byteLength of [-0,-1,0.5,core.MAX_SOURCE_BYTES+1,NaN,Infinity,'3',3n,null,undefined]){
    assert.throws(()=>core.prepare({...input(),source:{...input().source,byteLength}}));
  }
});

test('digests and nonce require exact lowercase 32-byte hex representations',()=>{
  for(const value of ['',null,undefined,123,'A'.repeat(64),'a'.repeat(63),'a'.repeat(65),'g'.repeat(64),' a'.repeat(32)]){
    assert.throws(()=>core.prepare({...input(),nonce:value}));
    assert.throws(()=>core.prepare({...input(),source:{...input().source,sha256:value}}));
  }
  // The core can bind this value; it cannot establish random generation.
  const record=core.prepare({...input(),nonce:'0'.repeat(64)});
  assert.equal(record.declarations.nonce,'CALLER_SUPPLIED_RANDOMNESS_NOT_VERIFIED');
});

test('account and chain encodings reject case changes, padding and number conversion',()=>{
  for(const account of ['','0X'+'a'.repeat(40),'0x'+'A'.repeat(40),'0x'+'a'.repeat(39),'0x'+'a'.repeat(41),1,undefined]){
    assert.throws(()=>core.prepare({...input(),wallet:{account,chainId:'0x1'}}));
  }
  for(const chainId of ['0x0','0x1','0xa86a','0x'+'f'.repeat(64)]){
    assert.equal(core.prepare({...input(),wallet:{account:null,chainId}}).wallet.chainId,chainId);
  }
  for(const chainId of ['','1',1,undefined,'0x','0x01','0x00','0X1','0xA','-0x1','0x1.0','0x'+'f'.repeat(65)]){
    assert.throws(()=>core.prepare({...input(),wallet:{account:null,chainId}}));
  }
});

test('timestamps require exact UTC milliseconds and a real calendar date',()=>{
  for(const createdAt of ['2026-02-30T00:00:00.000Z','2025-02-29T00:00:00.000Z','2026-09-12T24:00:00.000Z',
    '2026-09-12T14:00:00Z','2026-09-12T16:00:00.000+02:00',0,null,undefined]){
    assert.throws(()=>core.prepare({...input(),createdAt}));
  }
  assert.equal(core.prepare({...input(),createdAt:'2024-02-29T00:00:00.000Z'}).createdAt,'2024-02-29T00:00:00.000Z');
});

test('labels retain literal Unicode and spacing; excess, controls and broken surrogates fail',()=>{
  for(const label of ['  literal  ','<b>text only</b>','é','e\u0301','🪐'.repeat(60)]){
    assert.equal(core.prepare({...input(),source:{...input().source,label}}).source.label,label);
  }
  for(const label of ['x'.repeat(121),'🪐'.repeat(61),'line\nbreak','\u0000','\u007f','\ud800','\udc00',12,undefined]){
    assert.throws(()=>core.prepare({...input(),source:{...input().source,label}}));
  }
  assert.notEqual(digest(core.prepare({...input(),source:{...input().source,label:'é'}})),digest(core.prepare({...input(),source:{...input().source,label:'e\u0301'}})));
});

test('media types are bounded caller declarations, not detected content',()=>{
  for(const mediaType of ['text/plain','image/svg+xml','application/octet-stream'])assert.equal(core.prepare({...input(),source:{...input().source,mediaType}}).source.mediaType,mediaType);
  for(const mediaType of ['',null,undefined,7,'Text/Plain',' text/plain','text/plain;charset=utf-8','text/\nplain','a/'+('x'.repeat(126))]){
    assert.throws(()=>core.prepare({...input(),source:{...input().source,mediaType}}));
  }
});

test('canonical fields require actual end-of-input even with final line terminators',()=>{
  for(const suffix of ['\n','\r','\r\n','\u2028','\u2029']){
    assert.throws(()=>core.prepare({...input(),nonce:input().nonce+suffix}));
    assert.throws(()=>core.prepare({...input(),source:{...input().source,sha256:input().source.sha256+suffix}}));
    assert.throws(()=>core.prepare({...input(),source:{...input().source,mediaType:'text/plain'+suffix}}));
    assert.throws(()=>core.prepare({...input(),wallet:{...input().wallet,account:input().wallet.account+suffix}}));
    assert.throws(()=>core.prepare({...input(),wallet:{...input().wallet,chainId:'0x1'+suffix}}));
    assert.throws(()=>core.prepare({...input(),createdAt:input().createdAt+suffix}));
    assert.throws(()=>core.receipt(core.prepare(input()),'a'.repeat(64)+suffix));
  }
});

test('closed plain values reject extra fields, getters, symbols and custom serializers',()=>{
  for(const value of [null,[],new Date(),Object.create(input()),{...input(),extra:null},{...input(),bytes:'raw'}])assert.throws(()=>core.prepare(value));
  assert.throws(()=>core.prepare({...input(),source:{...input().source,bytes:'raw'}}));
  assert.throws(()=>core.prepare({...input(),wallet:{...input().wallet,balances:[]}}));
  const fields=input();fields[Symbol('extra')]=true;assert.throws(()=>core.prepare(fields));
  const getter=input();let called=false;Object.defineProperty(getter.source,'sha256',{enumerable:true,get(){called=true;return 'a'.repeat(64);}});
  assert.throws(()=>core.prepare(getter));assert.equal(called,false);
  const hidden=input();Object.defineProperty(hidden,'nonce',{value:'c'.repeat(64),enumerable:false});assert.throws(()=>core.prepare(hidden));
  assert.throws(()=>core.prepare({...input(),toJSON(){throw new Error('Must not call');}}));
});

test('serialize and receipt revalidate all claims and cannot accept fabricated mint state',()=>{
  const base=()=>JSON.parse(core.serialize(core.prepare(input())));
  const cases=[
    record=>{record.status='MINTED';},
    record=>{record.stage='CONFIRMED';},
    record=>{record.schema='unknown';},
    record=>{record.declarations.wallet='AUTHENTICATED';},
    record=>{record.mint.contract='0x'+'a'.repeat(40);},
    record=>{record.mint.tokenId='1';},
    record=>{record.mint.txHash='0x'+'d'.repeat(64);},
    record=>{delete record.source.label;},
    record=>{record.rawBytes='hidden payload';}
  ];
  for(const mutate of cases){
    const record=base();mutate(record);
    assert.throws(()=>core.serialize(record));assert.throws(()=>core.receipt(record,'a'.repeat(64)));
  }
});

test('export receipt includes source digest and exact caller-hash input, with no source bytes',()=>{
  const record=core.prepare(input()),hash=digest(record),receipt=core.receipt(record,hash);
  assert.equal(receipt.status,'LOCAL_SNAPSHOT_NOT_MINTED');
  assert.equal(receipt.statement,'LOCAL_SNAPSHOT_NOT_MINTED');
  assert.equal(receipt.sourceSha256,record.source.sha256);
  assert.equal(receipt.canonicalRecord,core.serialize(record));
  assert.equal(receipt.recordSha256,crypto.createHash('sha256').update(receipt.canonicalRecord,'utf8').digest('hex'));
  assert.equal(receipt.recordDigestState,'CALLER_SUPPLIED_NOT_VERIFIED_BY_CORE');
  assert(Object.isFrozen(receipt));assert(Object.isFrozen(receipt.record));
  assert(!JSON.stringify(receipt).includes('"bytes"'));
  for(const value of [undefined,null,'A'.repeat(64),'bad',1])assert.throws(()=>core.receipt(record,value));
});

test('browser UMD export needs no DOM, provider, clock reading, random generator or network',()=>{
  const code=fs.readFileSync(require.resolve('../assets/snapshot-core.js'),'utf8');
  const context={};
  vm.runInNewContext(code,context);
  assert.equal(typeof context.HalvethSnapshotCore.prepare,'function');
  const serialized=vm.runInNewContext('HalvethSnapshotCore.serialize(HalvethSnapshotCore.prepare('+JSON.stringify(input())+'))',context);
  assert.equal(serialized,core.serialize(core.prepare(input())));
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\b|\bDate\.now\b|\bMath\.random\b|\.getRandomValues\s*\(|\.request\s*\(/.test(code));
});
