/*
 * Optional, read-only wallet association. No controller is created on import.
 * UMD: window.HalvethWalletConnection or require('./wallet-connection.js').
 *
 * const wallet = createController({window});
 * wallet.subscribe((state, providers) => renderTextOnly(state, providers));
 * wallet.discover();                // explicit discovery UI; no account RPC
 * wallet.select(providerId);        // explicit choice; no account RPC
 * await wallet.connect();           // ONLY from an explicit connect click
 * wallet.disconnect();              // forget this page's association
 * wallet.destroy();                 // page teardown, removes discovery listener
 *
 * discover/getProviders: frozen [{id,name,rdns,source}] with self-declared
 * metadata. IDs are eip6963:<uuid> or legacy. No icon/provider is exported;
 * render names through textContent, never HTML. Discovery is not authentication.
 * getState: frozen {status,providerId,account,chainId,error}; only the first
 * account is retained. error is a stable code, not a provider error message.
 * subscribe(fn): immediate (state,providers) notification; returns unsubscribe.
 * connect(): resolves to state, or rejects Error with stable .code. Ignore
 * STALE_REQUEST after a disconnect/switch. Repeated in-flight calls reject
 * ALREADY_CONNECTING. UI code owns the explicit-click requirement; a function
 * call or caller boolean would not prove a human gesture or wallet ownership.
 *
 * Only eth_requestAccounts and eth_chainId may be requested, in that order.
 * No storage, balances, signing, transactions, permissions revocation or chain
 * switching. disconnect cannot close a wallet prompt or revoke wallet grants.
 * EIP-6963 discovery stays active until destroy; disconnect only detaches the
 * selected provider's event handlers. Late provider results cannot reassociate.
 *
 * Local validation contract: 20-byte hex addresses; canonical hex quantities
 * up to 256 bits; at most 100 response accounts and 32 discovered providers.
 * Addresses are format-checked, not checksum/ownership authenticated. Events
 * received during a request outrank that request's older result for the same
 * field. This ordering contract does not establish complete wallet history.
 *
 * Standards read 2026-09-12:
 * https://eips.ethereum.org/EIPS/eip-6963
 * https://eips.ethereum.org/EIPS/eip-1193
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HalvethWalletConnection = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?![\s\S])/i;
  const CONTROL = /[\u0000-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
  const ALLOWED_METHODS = new Set(['eth_requestAccounts', 'eth_chainId']);
  const LEGACY_ID = 'legacy';

  class WalletError extends Error {
    constructor(code) { super(code); this.name = 'WalletConnectionError'; this.code = code; }
  }
  function isAddress(value) { return typeof value === 'string' && /^0x[0-9a-fA-F]{40}(?![\s\S])/.test(value); }
  function isChainId(value) { return typeof value === 'string' && /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]{0,63})(?![\s\S])/.test(value); }
  function firstAccount(value) {
    if (!Array.isArray(value)) throw new WalletError('INVALID_ACCOUNTS');
    const length = value.length;
    if (!Number.isInteger(length) || length < 0 || length > 100) throw new WalletError('INVALID_ACCOUNTS');
    let first = null;
    for (let i = 0; i < length; i++) {
      const address = value[i];
      if (!isAddress(address)) throw new WalletError('INVALID_ACCOUNTS');
      if (i === 0) first = address;
    }
    return first;
  }
  function chain(value) {
    if (!isChainId(value)) throw new WalletError('INVALID_CHAIN_ID');
    return value.toLowerCase();
  }
  function safeText(value, max) { return typeof value === 'string' && value.length > 0 && value.length <= max && value.trim().length > 0 && !CONTROL.test(value); }
  function errorCode(error) {
    if (error instanceof WalletError) return error.code;
    try {
      switch (error?.code) {
        case 4001: return 'USER_REJECTED';
        case 4100: return 'UNAUTHORIZED';
        case 4200: return 'UNSUPPORTED_METHOD';
        case 4900: return 'PROVIDER_DISCONNECTED';
        case 4901: return 'CHAIN_DISCONNECTED';
        default: return 'PROVIDER_ERROR';
      }
    } catch { return 'PROVIDER_ERROR'; }
  }
  function providerEntry(provider, info) {
    if (!provider || (typeof provider !== 'object' && typeof provider !== 'function')) return null;
    const request = provider.request, on = provider.on, removeListener = provider.removeListener;
    if ([request, on, removeListener].some(method => typeof method !== 'function')) return null;
    return {provider, request, on, removeListener, info: Object.freeze(info)};
  }

  function createController(options = {}) {
    const host = options.window || (typeof window === 'object' ? window : null);
    if (!host || typeof host.addEventListener !== 'function' || typeof host.removeEventListener !== 'function' || typeof host.dispatchEvent !== 'function') throw new WalletError('INVALID_HOST');
    const providers = new Map(), subscribers = new Set();
    let discoveryStarted = false, destroyed = false, legacy = null, selected = null, active = null, epoch = 0;
    let state = Object.freeze({status: 'idle', providerId: null, account: null, chainId: null, error: null});

    function getState() { return state; }
    function getProviders() {
      return Object.freeze(providers.size ? [...providers.values()].map(entry => entry.info) : legacy ? [legacy.info] : []);
    }
    function notify() {
      const snapshot = state, inventory = getProviders();
      for (const subscriber of [...subscribers]) {
        try { subscriber(snapshot, inventory); } catch { /* A renderer cannot interrupt controller cleanup. */ }
      }
    }
    function publish(status, account = null, chainId = null, error = null) {
      state = Object.freeze({status, providerId: selected?.info.id || null, account, chainId, error});
      notify();
    }
    function invalidate() {
      epoch++;
      const previous = active;
      active = null;
      if (previous) for (const [name, handler] of previous.listeners) {
        try { previous.entry.removeListener.call(previous.entry.provider, name, handler); } catch { /* Epoch checks also invalidate undetachable callbacks. */ }
      }
    }
    function clear(status = 'idle', error = null, forgetSelection = true) {
      invalidate();
      if (forgetSelection) selected = null;
      publish(status, null, null, error);
    }
    function assertLive() { if (destroyed) throw new WalletError('DESTROYED'); }
    function current(attempt) { return !destroyed && active === attempt && epoch === attempt.epoch && selected === attempt.entry; }
    function assertCurrent(attempt) { if (!current(attempt)) throw new WalletError('STALE_REQUEST'); }

    function announce(event) {
      if (destroyed) return;
      try {
        const detail = event.detail, info = detail?.info;
        if (!info) return;
        const uuid = info.uuid, name = info.name, rdns = info.rdns;
        if (typeof uuid !== 'string' || !UUID.test(uuid) || !safeText(name, 120) || !safeText(rdns, 255)) return;
        const id = 'eip6963:' + uuid.toLowerCase();
        // First binding wins; a conflicting announcement never replaces it.
        if (providers.has(id) || providers.size >= 32) return;
        // icon is deliberately neither read nor copied, even for valid metadata.
        const entry = providerEntry(detail.provider, {id, name, rdns, source: 'eip6963'});
        if (!entry) return;
        providers.set(id, entry);
        legacy = null;
        if (selected?.info.id === LEGACY_ID) clear();
        else notify();
      } catch { /* Announcements and their property accessors are untrusted. */ }
    }

    function discover() {
      assertLive();
      if (!discoveryStarted) {
        host.addEventListener('eip6963:announceProvider', announce);
        discoveryStarted = true;
      }
      const EventClass = host.Event || globalThis.Event;
      if (typeof EventClass !== 'function') throw new WalletError('INVALID_HOST');
      host.dispatchEvent(new EventClass('eip6963:requestProvider'));
      if (!providers.size) {
        let candidate = null;
        try { candidate = providerEntry(host.ethereum, {id: LEGACY_ID, name: 'Browser wallet (legacy)', rdns: '', source: 'legacy'}); } catch {}
        if (legacy && legacy.provider !== candidate?.provider && selected === legacy) clear();
        legacy = candidate;
      }
      notify();
      return getProviders();
    }

    function select(id) {
      assertLive();
      const entry = providers.get(id) || (!providers.size && id === LEGACY_ID ? legacy : null);
      if (!entry) throw new WalletError('UNKNOWN_PROVIDER');
      if (entry === selected && (state.status === 'selected' || state.status === 'connected' || state.status === 'connecting')) return state;
      invalidate();
      selected = entry;
      publish('selected');
      return state;
    }

    function attach(attempt) {
      const listen = (name, handler) => {
        assertCurrent(attempt);
        attempt.listeners.push([name, handler]);
        attempt.entry.on.call(attempt.entry.provider, name, handler);
      };
      const guarded = handler => value => {
        if (!current(attempt)) return;
        try { handler(value); }
        catch (error) { if (current(attempt)) clear('error', errorCode(error), false); }
      };
      listen('accountsChanged', guarded(value => {
        const account = firstAccount(value);
        if (!account) { clear(); return; }
        attempt.accountRevision++;
        attempt.account = account;
        if (state.status === 'connected') publish('connected', account, state.chainId);
      }));
      listen('chainChanged', guarded(value => {
        attempt.chainId = chain(value);
        attempt.chainRevision++;
        if (state.status === 'connected') publish('connected', state.account, attempt.chainId);
      }));
      listen('disconnect', guarded(() => clear('error', 'PROVIDER_DISCONNECTED')));
    }

    async function rpc(attempt, method) {
      assertCurrent(attempt);
      if (!ALLOWED_METHODS.has(method)) throw new WalletError('METHOD_NOT_ALLOWED');
      const entry = attempt.entry;
      if (entry.provider.request !== entry.request) throw new WalletError('PROVIDER_CHANGED');
      return entry.request.call(entry.provider, {method});
    }

    async function connect() {
      assertLive();
      if (!selected) throw new WalletError('NO_PROVIDER_SELECTED');
      if (state.status === 'connecting') throw new WalletError('ALREADY_CONNECTING');
      if (state.status === 'connected') return state;
      invalidate();
      const attempt = {entry: selected, epoch, listeners: [], accountRevision: 0, chainRevision: 0, account: null, chainId: null};
      active = attempt;
      publish('connecting');
      try {
        assertCurrent(attempt);
        attach(attempt);
        const accountRevision = attempt.accountRevision;
        const accounts = await rpc(attempt, 'eth_requestAccounts');
        assertCurrent(attempt);
        const account = firstAccount(accounts);
        if (!account) throw new WalletError('NO_ACCOUNTS');
        if (attempt.accountRevision === accountRevision) attempt.account = account;
        const chainRevision = attempt.chainRevision;
        const chainId = await rpc(attempt, 'eth_chainId');
        assertCurrent(attempt);
        const checkedChain = chain(chainId);
        if (attempt.chainRevision === chainRevision) attempt.chainId = checkedChain;
        publish('connected', attempt.account, attempt.chainId);
        return state;
      } catch (error) {
        if (!current(attempt)) throw new WalletError('STALE_REQUEST');
        const code = errorCode(error);
        clear('error', code, false);
        throw new WalletError(code);
      }
    }

    function disconnect() {
      if (!destroyed) clear();
      return state;
    }
    function subscribe(subscriber) {
      assertLive();
      if (typeof subscriber !== 'function') throw new WalletError('INVALID_SUBSCRIBER');
      subscribers.add(subscriber);
      try { subscriber(state, getProviders()); } catch {}
      return () => subscribers.delete(subscriber);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      clear();
      if (discoveryStarted) host.removeEventListener('eip6963:announceProvider', announce);
      subscribers.clear();
      providers.clear();
      legacy = null;
    }

    return Object.freeze({discover, getProviders, select, connect, disconnect, getState, subscribe, destroy});
  }
  return Object.freeze({createController, isAddress, isChainId});
});
