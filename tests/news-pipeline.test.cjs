'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {berlinTime,makeDigest,deliverDigest,buildDraft}=require('../tools/news-digest.cjs');
const {sourceState,snapshotState}=require('../assets/news-core.js');
const NOW=new Date('2026-09-16T16:17:00Z');
function source(){return {id:'nasa',status:'fresh',lastSuccessAt:NOW.toISOString()};}
function data(count=7){return {schemaVersion:1,sources:[source()],items:Array.from({length:count},(_,i)=>({id:'item'+i,sourceId:'nasa',publisher:'NASA',title:'Headline '+i,titleLanguage:'en',url:'https://www.nasa.gov/example/'+i,sourcePublishedAt:new Date(+NOW-3600000-i*60000).toISOString(),fetchedAt:NOW.toISOString(),firstFetchedAt:NOW.toISOString()}))};}
function temporary(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'halveth-news-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
test('Berlin schedule handles summer and winter without early digest',()=>{
  assert.equal(berlinTime(NOW).minutes,18*60+17);
  assert.equal(berlinTime(new Date('2026-12-01T17:17:00Z')).minutes,18*60+17);
  assert.equal(makeDigest(data(),[],new Date('2026-09-16T16:16:59Z')),null);
  const digest=makeDigest(data(),[],NOW);
  assert.equal(digest.items.length,5);
  assert.equal(digest.target.name,'Halveth');
  assert.match(digest.body,/Originaltitel \(EN\)/);
  assert.match(digest.body,/Noch nicht auf Reddit veröffentlicht/);
  assert.equal(makeDigest(data(),[digest],NOW),null);
});
test('only unseen recent items from fresh successful sources enter a digest',()=>{
  const first=makeDigest(data(),[],NOW);
  const next=new Date('2026-09-17T16:17:00Z'),fresh=data();fresh.sources[0].lastSuccessAt=next.toISOString();
  const second=makeDigest(fresh,[first],next);
  assert.equal(second.items.length,2);
  fresh.sources[0].status='failed';assert.equal(makeDigest(fresh,[first],next),null);
  const old=data();old.items.forEach(item=>item.sourcePublishedAt='2020-01-01T00:00:00Z');assert.equal(makeDigest(old,[],NOW),null);
});
test('failed source and delayed last-good snapshot remain visibly stale',()=>{
  assert.equal(sourceState(source(),+NOW),'fresh');
  assert.equal(sourceState(source(),+NOW+181*60000),'stale');
  assert.equal(sourceState({...source(),status:'failed'},+NOW),'unavailable');
  assert.equal(snapshotState(data(),+NOW+181*60000).stale,true);
});
test('fake publisher success creates durable receipt; repeat does not publish twice',async t=>{
  const dir=temporary(t),file=path.join(dir,'receipt.json'),digest=makeDigest(data(),[],NOW);let calls=0;
  const adapter={id:'fake',publish:async()=>{calls++;return {postId:'t3_fixture'};}};
  await deliverDigest(digest,file,adapter,NOW);await deliverDigest(digest,file,adapter,NOW);
  const persisted=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(calls,1);assert.equal(persisted.state,'PUBLISHED');assert.equal(persisted.postId,'t3_fixture');
});
test('fake interruption after remote effect reconciles without duplicate on retry',async t=>{
  const file=path.join(temporary(t),'receipt.json'),digest=makeDigest(data(),[],NOW);let calls=0,stored=null;
  const adapter={id:'fake',publish:async()=>{calls++;stored={postId:'t3_already_created'};throw new Error('interrupted');},findByKey:async()=>stored};
  await assert.rejects(deliverDigest(digest,file,adapter,NOW),/interrupted/);
  assert.equal(JSON.parse(fs.readFileSync(file)).state,'UNCERTAIN');
  const receipt=await deliverDigest(digest,file,adapter,NOW);
  assert.equal(receipt.state,'PUBLISHED');assert.equal(calls,1);assert.equal(receipt.postId,'t3_already_created');
});
test('uncertain attempt without reconciliation stops; proven pre-send failure can retry',async t=>{
  const dir=temporary(t),digest=makeDigest(data(),[],NOW),uncertain=path.join(dir,'unknown.json');
  const broken={id:'fake',publish:async()=>{throw new Error('uncertain');}};
  await assert.rejects(deliverDigest(digest,uncertain,broken,NOW));
  await assert.rejects(deliverDigest(digest,uncertain,broken,NOW),/RECONCILIATION_REQUIRED/);
  const file=path.join(dir,'retry.json');let calls=0;
  const retry={id:'fake',publish:async()=>{if(++calls===1){const e=new Error('before-send');e.retrySafe=true;throw e;}return {postId:'t3_retry'};}};
  await assert.rejects(deliverDigest(digest,file,retry,NOW));
  const receipt=await deliverDigest(digest,file,retry,NOW);assert.equal(receipt.attempts,2);assert.equal(calls,2);
});
test('default runtime writes one draft and receipt and never fabricates a public post',async t=>{
  const dir=temporary(t);fs.mkdirSync(path.join(dir,'assets'));fs.writeFileSync(path.join(dir,'assets','news-data.json'),JSON.stringify(data()));
  const first=await buildDraft(dir,NOW),second=await buildDraft(dir,NOW);
  assert.equal(first.state,'DRAFT_ONLY');assert.equal(second.state,'DRAFT_ONLY');
  const file=path.join(dir,'news','receipts','2026-09-16.json');
  const receipt=JSON.parse(fs.readFileSync(file));assert.equal(receipt.attempts,1);assert.equal(receipt.postId,undefined);
  assert.equal(fs.readdirSync(path.join(dir,'news','drafts')).filter(f=>f.endsWith('.md')).length,1);
  const index=JSON.parse(fs.readFileSync(path.join(dir,'news','drafts','index.json')));assert.equal(index.drafts.length,1);
});
test('RSS parser verifies bounded sources, deduplicates and retains last good on failure',()=>{
  const script=String.raw`
import importlib.util, pathlib, datetime, json
p=pathlib.Path('tools/news-refresh.py')
spec=importlib.util.spec_from_file_location('news', p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
now=datetime.datetime(2026,9,16,16,17,tzinfo=datetime.timezone.utc)
def fixture(source):
 host='www.nasa.gov' if source['id']=='nasa' else 'github.blog'
 item=f'<item><title><![CDATA[Hello &amp; Source]]></title><link>https://{host}/story/</link><pubDate>Wed, 16 Sep 2026 10:00:00 +0000</pubDate><description><![CDATA[Example: <!DOCTYPE html>]]></description></item>'
 return ('<rss version="2.0"><channel>'+item+item+'</channel></rss>').encode()
first=m.refresh({},now,fixture)
assert len(first['items'])==2
assert all(s['status']=='fresh' for s in first['sources'])
def failure(source): raise OSError('private response must never enter public data')
second=m.refresh(first,now+datetime.timedelta(hours=1),failure)
assert second['items']==first['items']
assert all(s['status']=='failed' for s in second['sources'])
assert 'private response' not in json.dumps(second)
for bad in [b'<!DOCTYPE rss [<!ENTITY x "test">]><rss/>',b'<rss><channel/>',b'<rss><channel></channel></rss>']:
 try: m.parse_feed(bad,m.SOURCES[0],m.iso(now))
 except (ValueError,m.ET.ParseError): pass
 else: raise AssertionError('invalid feed accepted')
for link in ['http://www.nasa.gov/story','https://example.net/story','https://www.nasa.gov@evil.example/story','javascript:alert(1)']:
 try:m.safe_link(link,m.SOURCES[0])
 except ValueError:pass
 else:raise AssertionError('untrusted link accepted')
print('RSS fixtures passed')
`;
  const result=spawnSync('python',['-c',script],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
  assert.equal(result.status,0,result.stdout+result.stderr);
});
