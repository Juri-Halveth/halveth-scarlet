const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const core=require('../assets/room-core.js');
const fields={role:'human',entity:'RACHEL',source:'https://github.com/Juri-Halveth/halveth-scarlet/blob/main/README.md',intent:'Build an accessible visitor room.',thanks:'Danke ❤️',gesture:'heart'};
const at='2026-09-12T14:00:00.000Z';
test('A voluntary record binds only entered fields and the declared device timestamp',()=>{
 const r=core.prepare(fields,at);assert.equal(r.status,'SELF_DECLARED_DRAFT');assert.equal(r.clock,'VISITOR_DEVICE');
 assert.deepEqual(Object.keys(r),['schema','project','role','entity','source','intendedUse','thanks','gesture','createdAt','clock','status']);
 const serialized=JSON.stringify(r),hash=crypto.createHash('sha256').update(serialized,'utf8').digest('hex');
 const draft=core.format(r,hash);assert(draft.includes(serialized));assert(draft.includes('SHA-256: '+hash));assert(draft.includes('not proof of identity'));
});
test('Invalid choices and excessive or empty entries fail instead of silently changing declarations',()=>{
 for(const override of [{role:'verified-human'},{gesture:'tracking'},{entity:'x'.repeat(65)},{intent:' '},{thanks:'x'.repeat(501)}])assert.throws(()=>core.prepare({...fields,...override},at));
});
test('Source addresses cannot carry executable schemes or embedded credentials',()=>{
 for(const source of ['javascript:alert(1)','data:text/html,hello','http://example.com/','https://name:secret@example.com/'])assert.throws(()=>core.prepare({...fields,source},at));
 assert.equal(core.prepare({...fields,source:''},at).source,'');
});
test('Public comments retain literal text, bound source and explicit preview coverage',()=>{
 const c={id:123,body:'<script>alert(1)</script>',user:{login:'visitor'},created_at:at,html_url:core.issueUrl+'#issuecomment-123'};
 assert.equal(core.comments([c])[0].body,c.body);
 assert.throws(()=>core.comments([{...c,html_url:'https://example.com/trap'}]));
 assert.throws(()=>core.comments({message:'rate limited'}));
 const long=core.comments([{...c,body:'x'.repeat(6000)}])[0];assert.equal(long.body.length,5000);assert.equal(long.shortened,true);
});
test('Empty thanks stays empty and skipped gestures remain skipped',()=>{
 const r=core.prepare({...fields,thanks:'',gesture:'skip'},at);
 const hash=crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex');
 assert.equal(r.thanks,'');assert(core.format(r,hash).includes('Thanks:\n—'));assert(!core.format(r,hash).includes('❤️'));
});
test('Impossible or ambiguous dates cannot become GitHub publication times',()=>{
 for(const time of [0,'12','2026-02-30T12:00:00.000Z','2026-09-12T25:00:00.000Z']){
  assert.throws(()=>core.prepare(fields,time));
  const c={id:123,body:'Hi',user:{login:'visitor'},created_at:time,html_url:core.issueUrl+'#issuecomment-123'};
  assert.throws(()=>core.comments([c]));
  assert.throws(()=>core.comments([{...c,created_at:at,updated_at:time}]));
 }
 assert.equal(core.comments([{id:123,body:'Hi',user:{login:'visitor'},created_at:'2026-09-12T12:00:00Z',html_url:core.issueUrl+'#issuecomment-123'}]).length,1);
});
