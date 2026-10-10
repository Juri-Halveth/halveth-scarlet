import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {connectBitcoinObserver,loadBitcoinOverview,validateFees,validateTip} from '../assets/bitcoin-observer.mjs';
const hash='a'.repeat(64);
test('live chain payload accepts a current block record and bounds explorer identity',()=>{
  const tip=validateTip([{id:hash,height:900001,timestamp:1791636122}]);
  assert.deepEqual(tip,{id:hash,height:900001,timestamp:1791636122});
  assert.throws(()=>validateTip([{id:'https://attacker.invalid',height:1,timestamp:1}]));
  assert.throws(()=>validateTip([{id:hash,height:-1,timestamp:1}]));
});
test('fee payload accepts numeric estimates and rejects malformed values',()=>{
  assert.deepEqual(validateFees({fastestFee:12,hourFee:3}),{fastest:12,hour:3});
  assert.throws(()=>validateFees({fastestFee:'12',hourFee:3}));
});
test('observer uses only fixed read-only mempool endpoints and retains partial results',async()=>{
  const urls=[];
  const fetchImpl=async(url,options)=>{
    urls.push([url,options]);
    if(url.endsWith('/blocks/tip'))return {ok:true,json:async()=>[{id:hash,height:900001,timestamp:1791636122}]};
    if(url.endsWith('/v1/fees/recommended'))return {ok:false,status:503};
    throw new Error('unexpected URL');
  };
  const result=await loadBitcoinOverview(fetchImpl);
  assert.equal(result.tip.height,900001);assert.equal(result.tipAvailable,true);assert.equal(result.feesAvailable,false);
  assert.deepEqual(urls.map(([url])=>new URL(url).host),['mempool.space','mempool.space']);
  for(const [,options] of urls){assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.mode,'cors');}
});

test('live observer waits for the user to open it and builds a fixed explorer URL',async()=>{
  const nodes=new Map(),listeners=new Map();
  const details={open:false,addEventListener:(name,fn)=>listeners.set('details:'+name,fn)};
  const refresh={disabled:false,addEventListener:(name,fn)=>listeners.set('refresh:'+name,fn)};
  for(const id of ['btc-observer','btc-live-refresh','btc-live-status','btc-live-height','btc-live-hash','btc-live-time','btc-live-fees','btc-live-link'])nodes.set(id,id==='btc-observer'?details:id==='btc-live-refresh'?refresh:{textContent:'',href:''});
  const root={documentElement:{lang:'de'},getElementById:id=>nodes.get(id)};
  const calls=[];const fetchImpl=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.endsWith('/blocks/tip')?[{id:hash,height:900001,timestamp:1791636122}]:{fastestFee:12,hourFee:3}};};
  connectBitcoinObserver(root,fetchImpl);assert.equal(calls.length,0);
  details.open=true;listeners.get('details:toggle')();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(calls.length,2);assert.equal(nodes.get('btc-live-height').textContent,'900.001');
  assert.equal(nodes.get('btc-live-link').href,'https://mempool.space/block/'+hash);
  assert.match(nodes.get('btc-live-status').textContent,/mempool\.space/);
});
test('failed refresh clears old chain data and never leaves a stale block link',async()=>{
  const nodes=new Map(),listeners=new Map();
  const details={open:false,addEventListener:(name,fn)=>listeners.set('details:'+name,fn)};
  const refresh={disabled:false,addEventListener:(name,fn)=>listeners.set('refresh:'+name,fn)};
  for(const id of ['btc-observer','btc-live-refresh','btc-live-status','btc-live-height','btc-live-hash','btc-live-time','btc-live-fees','btc-live-link'])nodes.set(id,id==='btc-observer'?details:id==='btc-live-refresh'?refresh:{textContent:'',href:''});
  const root={documentElement:{lang:'de'},getElementById:id=>nodes.get(id)};
  let fail=false;
  const fetchImpl=async url=>{
    if(fail)throw new Error('temporary outage');
    return {ok:true,json:async()=>url.endsWith('/blocks/tip')?[{id:hash,height:900001,timestamp:1791636122}]:{fastestFee:12,hourFee:3}};
  };
  connectBitcoinObserver(root,fetchImpl);details.open=true;listeners.get('details:toggle')();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(nodes.get('btc-live-height').textContent,'900.001');
  fail=true;listeners.get('refresh:click')();
  assert.equal(nodes.get('btc-live-height').textContent,'—');
  assert.equal(nodes.get('btc-live-hash').textContent,'—');
  assert.equal(nodes.get('btc-live-time').textContent,'—');
  assert.equal(nodes.get('btc-live-fees').textContent,'—');
  assert.equal(nodes.get('btc-live-link').href,'https://mempool.space/');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(nodes.get('btc-live-status').textContent,/nicht verfügbar/);
  assert.equal(nodes.get('btc-live-link').href,'https://mempool.space/');
});
test('active root shows only GTC and BTC references while the garden ASTER record stays separate',()=>{
  const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../assets/universe-data.js',import.meta.url),'utf8'),context);
  const entities=context.window.HalvethUniverse.entities,html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const figures=fs.readFileSync(new URL('../assets/entity-figures.mjs',import.meta.url),'utf8');
  const sitemap=fs.readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8');
  const rights=fs.readFileSync(new URL('../forschung/figuren-und-perspektiven/index.html',import.meta.url),'utf8');
  assert.deepEqual([...html.matchAll(/data-chain="([^"]+)"/g)].map(match=>match[1]),['gitcoin']);
  assert.ok(entities.some(entity=>entity.id==='gitcoin'));assert.ok(entities.some(entity=>entity.id==='aster'));
  for(const id of ['manta','aster-chain','rtx'])assert.ok(!entities.some(entity=>entity.id===id),id);
  assert.doesNotMatch(figures,/manta|aster-chain|\brtx\b/i);
  assert.doesNotMatch(sitemap,/\/entities\/(?:manta|aster-chain|rtx)\//);
  assert.doesNotMatch(rights,/GTC, Manta|GTC, Aster|RTX/);
  assert.match(html,/GTC ×3/);assert.match(html,/https:\/\/mempool\.space/);
  assert.match(html,/connect-src 'self' https:\/\/mempool\.space/);
});
