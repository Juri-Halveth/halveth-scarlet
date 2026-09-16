const test=require('node:test');
const assert=require('node:assert/strict');
const {latest}=require('../assets/home-news.js');
const now=Date.parse('2026-09-16T16:00:00Z');
const source={id:'primary',status:'fresh',lastSuccessAt:'2026-09-16T15:30:00Z'};
const item={id:'a',sourceId:'primary',publisher:'Publisher',title:'Current source item',url:'https://example.com/news',sourcePublishedAt:'2026-09-16T14:00:00Z'};
const data=(items=[item],sources=[source])=>({schemaVersion:1,items,sources});
test('homepage chooses the newest dated source item and exposes stale or failed refresh',()=>{
  const older={...item,id:'b',sourcePublishedAt:'2026-09-15T14:00:00Z'};
  assert.equal(latest(data([older,item]),now).item.id,'a');
  assert.equal(latest(data(),now).stale,false);
  assert.equal(latest(data(),now+4*3600000).stale,true);
  assert.equal(latest(data([item],[{...source,status:'error'}]),now).stale,true);
});
test('unknown sources, undated/future headlines and non-HTTPS destinations do not enter ticker',()=>{
  for(const change of [{sourceId:'missing'},{sourcePublishedAt:'invalid'},{sourcePublishedAt:'2027-01-01T00:00:00Z'},{url:'javascript:alert(1)'},{title:''}])assert.equal(latest(data([{...item,...change}]),now),null);
  assert.equal(latest({items:[item],sources:[source]},now),null);
});
