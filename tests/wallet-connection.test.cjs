// All providers, addresses, host events and RPC results below are local fixtures.
// No browser wallet, network, account lookup, signature or transaction is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createController, isAddress, isChainId} = require('../assets/wallet-connection.js');
const A = '0x' + '1'.repeat(40), B = '0x' + '2'.repeat(40), C = '0x' + '3'.repeat(40);
const UUID_A = '350670db-19fa-4704-a166-e52e178b59d2';
const UUID_B = '450670db-19fa-4704-a166-e52e178b59d2';

class Host extends EventTarget {
  constructor() { super(); this.Event = Event; this.discoveryRequests = 0; this.announceListeners = 0; }
  addEventListener(type, listener, options) {
    if (type === 'eip6963:announceProvider') this.announceListeners++;
    super.addEventListener(type, listener, options);
  }
  removeEventListener(type, listener, options) {
    if (type === 'eip6963:announceProvider') this.announceListeners--;
    super.removeEventListener(type, listener, options);
  }
  dispatchEvent(event) {
    if (event.type === 'eip6963:requestProvider') this.discoveryRequests++;
    return super.dispatchEvent(event);
  }
}
class Provider extends EventEmitter {
  constructor(respond = method => method === 'eth_requestAccounts' ? [A] : '0x1') {
    super(); this.calls = []; this.respond = respond;
  }
  request(args) {
    this.calls.push(args);
    assert.deepEqual(Object.keys(args), ['method']);
    assert(['eth_requestAccounts', 'eth_chainId'].includes(args.method), 'No other RPC method is permitted');
    return this.respond(args.method);
  }
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return {promise, resolve, reject};
}
function announce(host, provider, changes = {}) {
  const event = new Event('eip6963:announceProvider');
  event.detail = {provider, info: {uuid: UUID_A, name: 'Synthetic Wallet', rdns: 'test.example.wallet', ...changes}};
  host.dispatchEvent(event);
}
function setup(provider = new Provider()) {
  const host = new Host(), wallet = createController({window: host});
  wallet.discover(); announce(host, provider); wallet.select('eip6963:' + UUID_A);
  return {host, wallet, provider};
}
function listenerCount(provider) {
  return ['accountsChanged', 'chainChanged', 'disconnect'].reduce((n, name) => n + provider.listenerCount(name), 0);
}
function code(expected) { return error => error.code === expected && error.message === expected; }
async function tick() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }

test('Browser import and controller construction do not discover or access a wallet', () => {
  const host = new Host();
  Object.defineProperty(host, 'ethereum', {get() { throw Error('Unexpected provider access'); }});
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/wallet-connection.js'), 'utf8'), {window: host});
  const wallet = host.HalvethWalletConnection.createController({window: host});
  assert.equal(wallet.getState().status, 'idle');
  assert.equal(wallet.getProviders().length, 0);
  assert.equal(host.discoveryRequests, 0);
  assert.equal(host.announceListeners, 0);
});

test('Discovery listens before requesting, retains late announcements, and performs no RPC', () => {
  const host = new Host(), first = new Provider(), second = new Provider();
  host.addEventListener('eip6963:requestProvider', () => announce(host, first));
  const wallet = createController({window: host});
  const initial = wallet.discover();
  assert.equal(initial.length, 1);
  announce(host, second, {uuid: UUID_B, name: 'Second Wallet'});
  assert.equal(wallet.getProviders().length, 2);
  wallet.discover();
  assert.equal(host.announceListeners, 1);
  assert.equal(wallet.getProviders().length, 2, 'Re-announcements are idempotent');
  assert.deepEqual(first.calls, []);
  assert.deepEqual(second.calls, []);
});

test('Metadata is bounded text, read once, immutable, and contains no icon or provider handle', () => {
  const host = new Host(), wallet = createController({window: host}), provider = new Provider();
  wallet.discover();
  let reads = 0;
  const info = {uuid: UUID_A, rdns: 'test.example.wallet'};
  Object.defineProperty(info, 'name', {get() { reads++; return reads === 1 ? '<Local fixture>' : {bad: true}; }});
  Object.defineProperty(info, 'icon', {get() { throw Error('Icon must not be read'); }});
  const event = new Event('eip6963:announceProvider'); event.detail = {info, provider}; host.dispatchEvent(event);
  const inventory = wallet.getProviders();
  assert.equal(reads, 1);
  assert.equal(inventory[0].name, '<Local fixture>');
  assert.deepEqual(Object.keys(inventory[0]), ['id', 'name', 'rdns', 'source']);
  assert(Object.isFrozen(inventory) && Object.isFrozen(inventory[0]));
});

test('Malformed announcements and UUID collisions cannot replace a provider', async () => {
  const {host, wallet, provider} = setup(), other = new Provider();
  for (const changes of [{uuid: 'bad'}, {uuid: UUID_B, name: ''}, {uuid: UUID_B, name: 'x'.repeat(121)}, {uuid: UUID_B, rdns: null}, {uuid: UUID_B, name: 'bad\nname'}]) announce(host, other, changes);
  announce(host, other, {name: 'Replacement'});
  assert.equal(wallet.getProviders().length, 1);
  assert.equal(wallet.getProviders()[0].name, 'Synthetic Wallet');
  await wallet.connect();
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(other.calls, []);
});

test('Legacy injection is a fallback only and late EIP-6963 discovery cancels its pending association', async () => {
  const host = new Host(), pending = deferred(), legacy = new Provider(() => pending.promise);
  host.ethereum = legacy;
  const wallet = createController({window: host});
  assert.deepEqual(wallet.discover().map(x => x.id), ['legacy']);
  wallet.select('legacy');
  const connecting = wallet.connect();
  announce(host, new Provider());
  assert.deepEqual(wallet.getProviders().map(x => x.id), ['eip6963:' + UUID_A]);
  assert.equal(wallet.getState().status, 'idle');
  assert.equal(listenerCount(legacy), 0);
  pending.resolve([A]);
  await assert.rejects(connecting, code('STALE_REQUEST'));
  assert.deepEqual(legacy.calls.map(x => x.method), ['eth_requestAccounts']);
  assert.throws(() => wallet.select('legacy'), code('UNKNOWN_PROVIDER'));
});

test('Selection is explicit and connection only requests accounts followed by chain ID', async () => {
  const host = new Host(), provider = new Provider(method => method === 'eth_requestAccounts' ? [A, B] : '0xAB');
  const wallet = createController({window: host}); wallet.discover(); announce(host, provider);
  await assert.rejects(wallet.connect(), code('NO_PROVIDER_SELECTED'));
  assert.throws(() => wallet.select('unknown'), code('UNKNOWN_PROVIDER'));
  wallet.select('eip6963:' + UUID_A);
  assert.deepEqual(provider.calls, []);
  const result = await wallet.connect();
  assert.deepEqual(provider.calls.map(x => x.method), ['eth_requestAccounts', 'eth_chainId']);
  assert.deepEqual(result, {status: 'connected', providerId: 'eip6963:' + UUID_A, account: A, chainId: '0xab', error: null});
  assert(Object.isFrozen(result));
  await wallet.connect();
  assert.equal(provider.calls.length, 2, 'An existing association does not prompt again');
});

test('Repeated in-flight connect is rejected without opening a second request', async () => {
  const pending = deferred();
  const {wallet, provider} = setup(new Provider(method => method === 'eth_requestAccounts' ? pending.promise : '0x1'));
  const first = wallet.connect();
  await assert.rejects(wallet.connect(), code('ALREADY_CONNECTING'));
  assert.equal(provider.calls.length, 1);
  pending.resolve([A]); await first;
});

test('Disconnect before account completion invalidates the request and never asks for a chain', async () => {
  const pending = deferred(), {wallet, provider} = setup(new Provider(() => pending.promise));
  const result = wallet.connect();
  const oldHandler = provider.listeners('accountsChanged')[0];
  wallet.disconnect();
  assert.equal(listenerCount(provider), 0);
  oldHandler([B]);
  pending.resolve([A]);
  await assert.rejects(result, code('STALE_REQUEST'));
  assert.equal(wallet.getState().status, 'idle');
  assert.equal(wallet.getState().account, null);
  assert.deepEqual(provider.calls.map(x => x.method), ['eth_requestAccounts']);
});

test('Disconnect during chain lookup also prevents stale completion', async () => {
  const pending = deferred(), {wallet, provider} = setup(new Provider(method => method === 'eth_requestAccounts' ? [A] : pending.promise));
  const result = wallet.connect(); await tick();
  assert.equal(provider.calls.length, 2);
  wallet.disconnect(); pending.resolve('0x1');
  await assert.rejects(result, code('STALE_REQUEST'));
  assert.deepEqual(wallet.getState(), {status: 'idle', providerId: null, account: null, chainId: null, error: null});
});

test('Switching providers prevents old results and captured callbacks from changing the new association', async () => {
  const pending = deferred(), {host, wallet, provider} = setup(new Provider(() => pending.promise));
  const old = wallet.connect(), oldChainHandler = provider.listeners('chainChanged')[0];
  const second = new Provider(method => method === 'eth_requestAccounts' ? [B] : '0x2');
  announce(host, second, {uuid: UUID_B}); wallet.select('eip6963:' + UUID_B);
  await wallet.connect();
  oldChainHandler('0x3'); pending.resolve([A]);
  await assert.rejects(old, code('STALE_REQUEST'));
  assert.equal(wallet.getState().providerId, 'eip6963:' + UUID_B);
  assert.equal(wallet.getState().account, B);
  assert.equal(wallet.getState().chainId, '0x2');
  assert.equal(listenerCount(provider), 0);
});

test('Account and chain events update only the associated first account without extra RPC', async () => {
  const {wallet, provider} = setup(); await wallet.connect();
  provider.emit('accountsChanged', [B, C]); provider.emit('chainChanged', '0xA');
  assert.equal(wallet.getState().account, B);
  assert.equal(wallet.getState().chainId, '0xa');
  assert.equal(provider.calls.length, 2);
  assert(!('accounts' in wallet.getState()), 'The full account list is not exposed');
});

test('Events during pending requests outrank older account and chain response values', async () => {
  const accounts = deferred(), chain = deferred();
  const {wallet, provider} = setup(new Provider(method => method === 'eth_requestAccounts' ? accounts.promise : chain.promise));
  const connecting = wallet.connect();
  provider.emit('accountsChanged', [B]); accounts.resolve([A]); await tick();
  provider.emit('accountsChanged', [C]); provider.emit('chainChanged', '0x2'); chain.resolve('0x1');
  const result = await connecting;
  assert.equal(result.account, C);
  assert.equal(result.chainId, '0x2');
});

for (const event of ['empty accounts', 'provider disconnect']) {
  test(event + ' clears association and does not reconnect from later wallet events', async () => {
    const {wallet, provider} = setup(); await wallet.connect();
    if (event === 'empty accounts') provider.emit('accountsChanged', []);
    else provider.emit('disconnect', {code: 4900});
    assert.equal(wallet.getState().providerId, null);
    assert.equal(wallet.getState().account, null);
    assert.equal(wallet.getState().chainId, null);
    assert.equal(listenerCount(provider), 0);
    provider.emit('accountsChanged', [B]); provider.emit('chainChanged', '0x2'); provider.emit('connect', {chainId: '0x2'});
    assert.equal(wallet.getState().account, null);
    assert.equal(provider.calls.length, 2);
  });
}

test('Malformed or oversized account responses fail closed before chain lookup', async () => {
  for (const accounts of [null, A, {}, ['0x1'], [A, 'bad'], [A, null], new Array(1), Array(101).fill(A)]) {
    const {wallet, provider} = setup(new Provider(() => accounts));
    await assert.rejects(wallet.connect(), code('INVALID_ACCOUNTS'));
    assert.equal(wallet.getState().account, null);
    assert.equal(wallet.getState().error, 'INVALID_ACCOUNTS');
    assert.equal(listenerCount(provider), 0);
    assert.deepEqual(provider.calls.map(x => x.method), ['eth_requestAccounts']);
  }
  const {wallet} = setup(new Provider(() => []));
  await assert.rejects(wallet.connect(), code('NO_ACCOUNTS'));
});

test('Account response elements are read once so the stored value is the validated value', async () => {
  let reads = 0;
  const accounts = [A];
  Object.defineProperty(accounts, '0', {get() { return ++reads === 1 ? A : 'changed after validation'; }});
  const {wallet} = setup(new Provider(method => method === 'eth_requestAccounts' ? accounts : '0x1'));
  await wallet.connect();
  assert.equal(reads, 1);
  assert.equal(wallet.getState().account, A);
});

test('Malformed chain responses cannot become an associated chain', async () => {
  for (const chainId of [1, null, {}, '', '1', '0x', '0x01', '0x-1', '0X1', '0xg', '0x' + 'f'.repeat(65)]) {
    const {wallet, provider} = setup(new Provider(method => method === 'eth_requestAccounts' ? [A] : chainId));
    await assert.rejects(wallet.connect(), code('INVALID_CHAIN_ID'));
    assert.equal(wallet.getState().account, null);
    assert.equal(wallet.getState().chainId, null);
    assert.equal(listenerCount(provider), 0);
  }
  assert(isChainId('0x0') && isChainId('0x' + 'f'.repeat(64)));
  assert(isAddress(A)); assert(!isAddress('0X' + '1'.repeat(40)));
});

test('Address, chain ID and provider UUID require the actual end of input', async () => {
  for (const ending of ['\n', '\r', '\r\n', '\u2028', '\u2029', ' ']) {
    assert.equal(isAddress(A + ending), false);
    assert.equal(isChainId('0x1' + ending), false);
    const addressCase = setup(new Provider(() => [A + ending]));
    await assert.rejects(addressCase.wallet.connect(), code('INVALID_ACCOUNTS'));
    const chainCase = setup(new Provider(method => method === 'eth_requestAccounts' ? [A] : '0x1' + ending));
    await assert.rejects(chainCase.wallet.connect(), code('INVALID_CHAIN_ID'));
    const host = new Host(), wallet = createController({window: host}); wallet.discover();
    announce(host, new Provider(), {uuid: UUID_A + ending});
    assert.deepEqual(wallet.getProviders(), []);
  }
});

test('Malformed live events clear exposed values and detach listeners', async () => {
  for (const [event, value, expected] of [['accountsChanged', ['bad'], 'INVALID_ACCOUNTS'], ['chainChanged', 'wrong', 'INVALID_CHAIN_ID']]) {
    const {wallet, provider} = setup(); await wallet.connect(); provider.emit(event, value);
    assert.equal(wallet.getState().status, 'error');
    assert.equal(wallet.getState().error, expected);
    assert.equal(wallet.getState().account, null);
    assert.equal(wallet.getState().chainId, null);
    assert.equal(listenerCount(provider), 0);
  }
});

test('Provider rejections expose only stable codes and never error text or prototype properties', async () => {
  for (const [providerCode, expected] of [[4001, 'USER_REJECTED'], [4100, 'UNAUTHORIZED'], [4200, 'UNSUPPORTED_METHOD'], [4900, 'PROVIDER_DISCONNECTED'], [4901, 'CHAIN_DISCONNECTED'], ['__proto__', 'PROVIDER_ERROR']]) {
    const {wallet, provider} = setup(new Provider(() => Promise.reject({code: providerCode, message: 'Private fixture diagnostic'})));
    await assert.rejects(wallet.connect(), code(expected));
    assert.equal(wallet.getState().error, expected);
    assert.equal(listenerCount(provider), 0);
    assert.equal(provider.calls.length, 1);
  }
});

test('Destroy invalidates pending results and removes discovery and provider listeners', async () => {
  const pending = deferred(), {host, wallet, provider} = setup(new Provider(() => pending.promise));
  const connecting = wallet.connect(); wallet.destroy(); wallet.destroy();
  assert.equal(listenerCount(provider), 0);
  assert.equal(host.announceListeners, 0);
  assert.equal(wallet.getProviders().length, 0);
  pending.resolve([A]); await assert.rejects(connecting, code('STALE_REQUEST'));
  announce(host, new Provider(), {uuid: UUID_B});
  assert.equal(wallet.getProviders().length, 0);
  assert.throws(() => wallet.discover(), code('DESTROYED'));
  await assert.rejects(wallet.connect(), code('DESTROYED'));
});

test('Partial event attachment failure removes already attached listeners', async () => {
  const provider = new Provider();
  provider.on = function (name, handler) { if (name === 'chainChanged') throw Error('Fixture attach failure'); return EventEmitter.prototype.on.call(this, name, handler); };
  const {wallet} = setup(provider);
  await assert.rejects(wallet.connect(), code('PROVIDER_ERROR'));
  assert.equal(listenerCount(provider), 0);
  assert.deepEqual(provider.calls, []);
});

test('A synchronous account-clear event during attachment cannot leak later listeners', async () => {
  const provider = new Provider();
  provider.on = function (name, handler) { EventEmitter.prototype.on.call(this, name, handler); if (name === 'accountsChanged') handler([]); return this; };
  const {wallet} = setup(provider);
  await assert.rejects(wallet.connect(), code('STALE_REQUEST'));
  assert.equal(listenerCount(provider), 0);
  assert.deepEqual(provider.calls, []);
});

test('Changing a provider request method between lookups stops the second RPC', async () => {
  const pending = deferred(), {wallet, provider} = setup(new Provider(() => pending.promise));
  const connecting = wallet.connect();
  let replacedCalls = 0;
  provider.request = () => { replacedCalls++; return '0x2'; };
  pending.resolve([A]);
  await assert.rejects(connecting, code('PROVIDER_CHANGED'));
  assert.equal(replacedCalls, 0);
  assert.equal(wallet.getState().account, null);
  assert.equal(listenerCount(provider), 0);
});

test('Disconnect keeps stale callbacks inert even when a provider refuses to remove listeners', async () => {
  const provider = new Provider(); provider.removeListener = () => { throw Error('Fixture removal failure'); };
  const {wallet} = setup(provider); await wallet.connect(); wallet.disconnect();
  provider.emit('accountsChanged', [B]); provider.emit('chainChanged', '0x2');
  assert.equal(wallet.getState().status, 'idle');
  assert.equal(wallet.getState().account, null);
  assert.equal(wallet.getState().chainId, null);
});

test('Subscriptions receive immutable states and can unsubscribe without affecting association', async () => {
  const {wallet, provider} = setup(); const seen = [];
  const unsubscribe = wallet.subscribe((state, providers) => { assert(Object.isFrozen(state)); assert(Object.isFrozen(providers)); seen.push(state.status); });
  await wallet.connect(); assert.deepEqual(seen, ['selected', 'connecting', 'connected']);
  unsubscribe(); provider.emit('accountsChanged', [B]);
  assert.deepEqual(seen, ['selected', 'connecting', 'connected']);
  assert.equal(wallet.getState().account, B);
});
