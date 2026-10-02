import { ITEMS, SUPPORT_RECIPIENT, makeWorldEvent, validateWorldEvent, createEventJournal } from './world-events.mjs';
const $ = id => document.getElementById(id);
const language = () => window.HalvethLanguage?.get() || 'de';
const t = (de, en) => language() === 'en' ? en : de;
const journal = createEventJournal(100), requestedFocus = new Set();
const localHost = location.protocol === 'http:' && location.hostname === '127.0.0.1';
let relay = null, connected = false, rendererCanvas, rendered = new Set(), toastTimer, wallet, walletUnsubscribe;
let pending = false, stage = false;
const status = value => { $('studio-status').textContent = value; };
function open(value) {
  $('world-studio').hidden = !value;
  document.body.classList.toggle('studio-open', value);
  $('studio-toggle').setAttribute('aria-expanded', String(value));
  if (value) {
    $('entity-inspector').hidden = true; $('entity-info-toggle').setAttribute('aria-expanded', 'false');
  }
}
function changeTab(name) {
  for (const id of ['impulse', 'chat', 'support']) {
    $("studio-" + id).hidden = id !== name;
    $('studio-tab-' + id).setAttribute('aria-selected', String(id === name));
    $('studio-tab-' + id).tabIndex = id === name ? 0 : -1;
  }
}
function renderMode() {
  $('studio-mode').textContent = relay ? connected ? t('LOKALER RAUM', 'LOCAL ROOM') : t('VERBINDUNG OFFEN', 'CONNECTION PENDING') : t('GERÄTE-VORSCHAU', 'DEVICE PREVIEW');
  $('studio-chat-scope').textContent = relay ? connected ? t('Gemeinsam auf diesem PC · Sitzungsspeicher', 'Shared on this PC · session memory') : t('Verbindung unterbrochen', 'Connection interrupted') : t('Vorschau auf diesem Gerät', 'Preview on this device');
  $('studio-relay').hidden = !localHost || Boolean(relay);
  $('studio-create').disabled = pending || Boolean(relay && !connected);
  $('studio-chat-form').querySelector('button').disabled = pending || Boolean(relay && !connected);
}
function renderItems() {
  const selected = $('studio-item').value;
  $('studio-item').replaceChildren(...ITEMS.map(item => {
    const option = document.createElement('option'); option.value = item.id; option.textContent = item[language()]; return option;
  }));
  $('studio-item').value = selected || 'chocolate'; renderValue();
}
function renderValue() {
  const item = ITEMS.find(item => item.id === $('studio-item').value);
  $('studio-value').textContent = new Intl.NumberFormat(language(), { style: 'currency', currency: 'EUR' }).format(item.exampleEuroCents / 100);
}
function row(event) {
  const li = document.createElement('li'), title = document.createElement('strong'), body = document.createElement('p'), time = document.createElement('time');
  title.textContent = event.displayName;
  body.textContent = event.kind === 'CHAT' ? event.text : `${ITEMS.find(item => item.id === event.item)[language()]} · ${t('Testimpuls', 'Test impulse')}`;
  time.dateTime = event.createdAt;
  time.textContent = new Intl.DateTimeFormat(language(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(event.createdAt));
  li.append(title, body, time); return li;
}
function renderFeed() {
  const values = journal.values();
  $('studio-events').replaceChildren(...values.filter(e => e.kind === 'GIFT_DEMO').slice(-12).reverse().map(row));
  $('studio-messages').replaceChildren(...values.filter(e => e.kind === 'CHAT').slice(-40).map(row));
  $('studio-messages').scrollTop = $('studio-messages').scrollHeight;
  $('studio-export').disabled = values.length === 0;
}
function flushGifts() {
  const host = $('world-canvas'), canvas = host.querySelector('canvas');
  if (host.dataset.state !== 'READY' || !canvas) return;
  if (rendererCanvas !== canvas) { rendererCanvas = canvas; rendered = new Set(); }
  for (const event of journal.values()) {
    if (event.kind !== 'GIFT_DEMO' || rendered.has(event.id)) continue;
    rendered.add(event.id);
    window.dispatchEvent(new CustomEvent('halveth:world-gift', { detail: { event, focus: requestedFocus.has(event.id) } }));
    requestedFocus.delete(event.id);
  }
}
function receive(raw, focus = false, notify = false) {
  const event = validateWorldEvent(raw);
  if (!journal.append(event)) return;
  if (focus && event.kind === 'GIFT_DEMO') requestedFocus.add(event.id);
  renderFeed(); flushGifts();
  if (notify && event.kind === 'GIFT_DEMO') {
    $('studio-toast').textContent = `${event.displayName} · ${ITEMS.find(item => item.id === event.item)[language()]} · ${t('Testimpuls', 'Test impulse')}`;
    $('studio-toast').hidden = false; clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('studio-toast').hidden = true; }, 4500);
  }
}
function parseMessage(message) {
  if (message.data.length > 100000) throw new Error('MESSAGE_TOO_LARGE');
  return JSON.parse(message.data);
}
function connectRelay() {
  if (!localHost || relay) return;
  relay = new EventSource('/api/studio/stream'); renderMode();
  relay.addEventListener('snapshot', message => {
    try {
      const data = parseMessage(message);
      if (!Array.isArray(data.events) || data.events.length > 100) throw new Error('INVALID_SNAPSHOT');
      const events = data.events.map(envelope => validateWorldEvent(envelope.event));
      events.forEach(event => receive(event)); connected = true; renderMode(); status(t('Lokaler Raum verbunden.', 'Local room connected.'));
    } catch { connected = false; relay.close(); relay = null; renderMode(); status(t('Ungültiger Raumstand; Verbindung beendet.', 'Invalid room state; connection closed.')); }
  });
  relay.addEventListener('world-event', message => {
    try { receive(parseMessage(message).event, true, true); }
    catch { status(t('Ungültiges Ereignis nicht übernommen.', 'Invalid event was not imported.')); }
  });
  relay.onerror = () => { connected = false; renderMode(); };
}
async function submit(kind) {
  if (pending || relay && !connected) return;
  let event;
  try {
    event = makeWorldEvent({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), displayName: $('studio-name').value, kind, item: $('studio-item').value, message: $('studio-message').value });
    pending = true; renderMode();
    if (relay) {
      const response = await fetch('/api/studio/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Scarlet-Studio': '1' }, body: JSON.stringify(event), signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('RELAY_REJECTED');
      const result = await response.json();
      if (!['RECEIVED_DEMO', 'ALREADY_RECEIVED'].includes(result.state) || result.eventId !== event.id) throw new Error('INVALID_RECEIPT');
      receive(event, true, true);
    } else receive(event, true, true);
    if (kind === 'CHAT') $('studio-message').value = '';
    else if (window.matchMedia('(max-width: 760px)').matches) open(false);
    status(kind === 'CHAT' ? t('Nachricht in der Sitzung.', 'Message in this session.') : t('Digitaler Gegenstand erstellt · keine Zahlung.', 'Digital object created · no payment.'));
  } catch { status(t('Nicht abgeschlossen. Eingabe oder Verbindung prüfen; der Verlauf zeigt bereits eingegangene Ereignisse.', 'Not completed. Check input or connection; the feed shows events already received.')); }
  finally { pending = false; renderMode(); }
}
function setStage(value) {
  stage = value; document.body.classList.toggle('world-broadcast', value);
  $('studio-stage-exit').hidden = !value;
  if (value) open(false);
  window.dispatchEvent(new CustomEvent('halveth:world-stage', { detail: value }));
}
function renderWallet(state, providers) {
  const previous = $('studio-wallet-provider').value;
  $('studio-wallet-provider').replaceChildren(...providers.map(provider => {
    const option = document.createElement('option'); option.value = provider.id; option.textContent = provider.name; return option;
  }));
  if (providers.some(provider => provider.id === previous)) $('studio-wallet-provider').value = previous;
  $('studio-wallet-connect').disabled = providers.length === 0 || state.status === 'connecting';
  $('studio-wallet-disconnect').hidden = !state.account;
  $('studio-wallet-account').textContent = state.account ? `${state.account} · Chain ${state.chainId}` : '';
  $('studio-wallet-state').textContent = state.account ? t('Konto angezeigt · keine Zahlungsfreigabe', 'Account displayed · no payment approval') : providers.length ? t('Nur Konto und Chain anzeigen.', 'Display account and chain only.') : t('Keine Browser-Wallet gefunden.', 'No browser wallet found.');
}
$('studio-toggle').addEventListener('click', () => open($('world-studio').hidden));
$('studio-close').addEventListener('click', () => open(false));
$('entity-info-toggle').addEventListener('click', () => open(false));
$('studio-item').addEventListener('change', renderValue);
$('studio-create').addEventListener('click', () => submit('GIFT_DEMO'));
$('studio-chat-form').addEventListener('submit', event => { event.preventDefault(); submit('CHAT'); });
$('studio-relay').addEventListener('click', connectRelay);
$('studio-stage').addEventListener('click', () => setStage(true));
$('studio-stage-exit').addEventListener('click', () => { setStage(false); open(true); });
window.addEventListener('keydown', event => { if (event.key === 'Escape') { if (stage) setStage(false); else open(false); } });
const tabNames = ['impulse', 'chat', 'support'];
for (const [index, name] of tabNames.entries()) {
  $('studio-tab-' + name).addEventListener('click', () => changeTab(name));
  $('studio-tab-' + name).addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); const next = tabNames[(index + (event.key === 'ArrowRight' ? 1 : 2)) % 3]; changeTab(next); $('studio-tab-' + next).focus();
  });
}
$('studio-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(SUPPORT_RECIPIENT); status(t('Empfängeradresse kopiert. Chain und Token sind noch offen.', 'Recipient address copied. Chain and token are still pending.')); }
  catch { status(t('Adresse ist oben zum Markieren sichtbar.', 'The address above can be selected.')); }
});
$('studio-wallet-details').addEventListener('toggle', () => {
  if (!$('studio-wallet-details').open || wallet) return;
  if (!window.HalvethWalletConnection) { status(t('Wallet-Modul nicht verfügbar.', 'Wallet module unavailable.')); return; }
  wallet = window.HalvethWalletConnection.createController({ window });
  walletUnsubscribe = wallet.subscribe(renderWallet); wallet.discover();
});
$('studio-wallet-connect').addEventListener('click', async () => {
  if (!wallet || !$('studio-wallet-provider').value) return;
  try { wallet.select($('studio-wallet-provider').value); await wallet.connect(); }
  catch { status(t('Wallet-Verbindung nicht abgeschlossen.', 'Wallet connection not completed.')); }
});
$('studio-wallet-disconnect').addEventListener('click', () => wallet?.disconnect());
$('studio-export').addEventListener('click', () => {
  const data = { schema: 'halveth.studio-session.v1', mode: relay ? 'LOOPBACK_DEMO' : 'BROWSER_PREVIEW', exportedAt: new Date().toISOString(), paymentState: 'NOT_A_PAYMENT', events: journal.values() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'scarlet-studio-session.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const observer = new MutationObserver(flushGifts);
observer.observe($('world-canvas'), { childList: true, attributes: true, attributeFilter: ['data-state'] });
window.addEventListener('halveth:language', () => { renderItems(); renderFeed(); renderMode(); if (wallet) renderWallet(wallet.getState(), wallet.getProviders()); });
window.addEventListener('pagehide', () => { relay?.close(); connected = false; walletUnsubscribe?.(); wallet?.destroy(); wallet = null; observer.disconnect(); clearTimeout(toastTimer); });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
$('studio-recipient').textContent = SUPPORT_RECIPIENT;
changeTab('impulse'); renderItems(); renderFeed(); renderMode();
if (localHost && new URL(location.href).searchParams.get('studio') === 'relay') { open(true); connectRelay(); }
