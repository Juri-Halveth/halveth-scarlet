import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {connectGtcObserver,validateGtcTransfer} from '../assets/gtc-chain-observer.mjs';

const contract='0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F',hash='0x'+'a'.repeat(64),timestamp='2026-10-10T14:03:23.000000Z';
const payload={items:[{block_number:26162506,timestamp,transaction_hash:hash,token:{address_hash:contract,symbol:'GTC'},total:{decimals:'18',value:'173374255433516194732'}}],next_page_params:null};

test('GTC observer binds the latest transfer to the fixed official token contract',()=>{
  assert.deepEqual(validateGtcTransfer(payload),{block:26162506,timestamp:new Date(timestamp).toISOString(),hash});
  assert.throws(()=>validateGtcTransfer({items:[{...payload.items[0],transaction_hash:'https://attacker.invalid'}]}));
  assert.throws(()=>validateGtcTransfer({items:[{...payload.items[0],token:{address_hash:'0x'+'b'.repeat(40),symbol:'GTC'}}]}));
  assert.throws(()=>validateGtcTransfer({items:[{...payload.items[0],block_number:1.5}]}));
});

test('GTC observer waits for opening and makes one read-only request to a fixed explorer API',async()=>{
  const nodes=new Map(),listeners=new Map(),details={open:false,addEventListener:(name,fn)=>listeners.set('details:'+name,fn)},refresh={disabled:false,addEventListener:(name,fn)=>listeners.set('refresh:'+name,fn)};
  for(const id of ['gtc-observer','gtc-live-refresh','gtc-live-status','gtc-live-block','gtc-live-time','gtc-live-tx','gtc-live-link'])nodes.set(id,id==='gtc-observer'?details:id==='gtc-live-refresh'?refresh:{textContent:'',href:''});
  const root={documentElement:{lang:'de'},getElementById:id=>nodes.get(id)},calls=[];
  const fetchImpl=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>payload};};
  connectGtcObserver(root,fetchImpl);assert.equal(calls.length,0);
  details.open=true;listeners.get('details:toggle')();await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://eth.blockscout.com/api/v2/tokens/'+contract+'/transfers');
  assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.referrerPolicy,'no-referrer');
  assert.equal(nodes.get('gtc-live-block').textContent,'26.162.506');
  assert.equal(nodes.get('gtc-live-link').href,'https://eth.blockscout.com/tx/'+hash);
  assert.match(nodes.get('gtc-live-status').textContent,/Indexierung kann nachlaufen/);
});

test('failed GTC refresh clears the prior transfer and block link',async()=>{
  const nodes=new Map(),listeners=new Map(),details={open:false,addEventListener:(name,fn)=>listeners.set('details:'+name,fn)},refresh={disabled:false,addEventListener:(name,fn)=>listeners.set('refresh:'+name,fn)};
  for(const id of ['gtc-observer','gtc-live-refresh','gtc-live-status','gtc-live-block','gtc-live-time','gtc-live-tx','gtc-live-link'])nodes.set(id,id==='gtc-observer'?details:id==='gtc-live-refresh'?refresh:{textContent:'',href:''});
  const root={documentElement:{lang:'en'},getElementById:id=>nodes.get(id)};let fail=false;
  const fetchImpl=async()=>{if(fail)throw new Error('outage');return {ok:true,json:async()=>payload};};
  connectGtcObserver(root,fetchImpl);details.open=true;listeners.get('details:toggle')();await new Promise(resolve=>setTimeout(resolve,0));
  fail=true;listeners.get('refresh:click')();assert.equal(nodes.get('gtc-live-block').textContent,'—');assert.equal(nodes.get('gtc-live-time').textContent,'—');assert.equal(nodes.get('gtc-live-tx').textContent,'—');
  assert.equal(nodes.get('gtc-live-link').href,'https://eth.blockscout.com/');
  await new Promise(resolve=>setTimeout(resolve,0));assert.match(nodes.get('gtc-live-status').textContent,/currently unavailable/);
});

test('published GTC observer is read-only and connected to GTC and BTC sources',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),context={window:{}};
  vm.runInNewContext(fs.readFileSync(new URL('../assets/universe-data.js',import.meta.url),'utf8'),context);
  const gitcoin=context.window.HalvethUniverse.entities.find(entity=>entity.id==='gitcoin');
  assert.match(html,/connect-src 'self' https:\/\/mempool\.space https:\/\/eth\.blockscout\.com/);
  assert.match(html,/assets\/gtc-chain-observer\.mjs/);
  assert.match(html,/id="gtc-observer"/);
  assert.ok(gitcoin.sourceRefs.some(ref=>ref.url==='https://gov.gitcoin.co/'));
  assert.ok(gitcoin.sourceRefs.some(ref=>ref.url==='https://gtc.gitcoin.co/'));
  assert.ok(gitcoin.sourceRefs.some(ref=>ref.url==='https://github.com/gitcoinco/governance-docs'));
  assert.match(html,/Blockscout/);
  assert.match(html,/No wallet, signature, transaction, price feed or background polling/);
});
