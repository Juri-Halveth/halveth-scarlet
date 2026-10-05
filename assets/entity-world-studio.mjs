import { ITEMS, SUPPORT_RECIPIENT, makeWorldEvent, validateWorldEvent, createEventJournal } from './world-events.mjs';
import { createAppearanceLog } from './world-appearances.mjs';
const $ = id => document.getElementById(id);
const language = () => window.HalvethLanguage?.get() || 'de';
const t = (de, en) => language() === 'en' ? en : de;
const itemLabel = item => language() === 'ru' ? (window.HalvethHubLanguage?.t(item.de) || item.de) : item[language()];
const journal = createEventJournal(100), appearances = createAppearanceLog(), requestedFocus = new Set();
const localHost = location.protocol === 'http:' && location.hostname === '127.0.0.1';
let relay = null, connected = false, rendererCanvas, renderedCount = 0, lastGift, toastTimer, wallet, walletUnsubscribe;
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
  $('studio-repeat').disabled = !lastGift || pending || Boolean(relay && !connected);
  $('studio-chat-form').querySelector('button').disabled = pending || Boolean(relay && !connected);
}
function renderItems() {
  const selected = $('studio-item').value;
  $('studio-item').replaceChildren(...ITEMS.map(item => {
    const option = document.createElement('option'); option.value = item.id; option.textContent = itemLabel(item); return option;
  }));
  $('studio-item').value = selected || 'chocolate'; renderValue();
}
function renderValue() {
  const item = ITEMS.find(item => item.id === $('studio-item').value);
  $('studio-value').textContent = new Intl.NumberFormat(language(), { style: 'currency', currency: 'EUR' }).format(item.exampleEuroCents / 100);
}
function row(event, appearance) {
  const li = document.createElement('li'), title = document.createElement('strong'), body = document.createElement('p'), time = document.createElement('time');
  title.textContent = event.displayName;
  body.textContent = event.kind === 'CHAT' ? event.text : `${itemLabel(ITEMS.find(item => item.id === event.item))} · ${t('Testimpuls', 'Test impulse')}`;
  if (appearance?.occurrence > 1) body.textContent += ` · ${t('Wiederholung', 'Repeat')} ${appearance.occurrence - 1}`;
  time.dateTime = appearance?.observedAt || event.createdAt;
  time.textContent = new Intl.DateTimeFormat(language(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(time.dateTime));
  li.append(title, body, time); return li;
}
function renderFeed() {
  const values = journal.values();
  $('studio-events').replaceChildren(...appearances.tail(12).reverse().map(a => row(a.event, a)));
  $('studio-messages').replaceChildren(...values.filter(e => e.kind === 'CHAT').slice(-40).map(e => row(e)));
  $('studio-messages').scrollTop = $('studio-messages').scrollHeight;
  $('studio-export').disabled = values.length === 0;
}
function flushGifts() {
  const host = $('world-canvas'), canvas = host.querySelector('canvas');
  if (host.dataset.state !== 'READY' || !canvas) return;
  if (rendererCanvas !== canvas) { rendererCanvas = canvas; renderedCount = Math.max(0, appearances.length - 24); }
  for (const appearance of appearances.since(renderedCount)) {
    window.dispatchEvent(new CustomEvent('halveth:world-gift', { detail: { event: appearance.event, appearanceId: appearance.id, focus: requestedFocus.has(appearance.id) } }));
    requestedFocus.delete(appearance.id); renderedCount++;
  }
}
function receive(raw, focus = false, notify = false, delivery) {
  const event = validateWorldEvent(raw);
  const origin = relay ? 'LOOPBACK_DEMO' : 'BROWSER_PREVIEW';
  let deliveryId;
  if (event.kind === 'GIFT_DEMO') {
    deliveryId = delivery?.deliveryId === undefined ? crypto.randomUUID() : delivery.deliveryId;
    validateWorldEvent({ ...event, id: deliveryId });
  }
  const added = journal.append(event);
  if (event.kind === 'GIFT_DEMO') {
    const appearance = appearances.append(event, deliveryId, new Date().toISOString(), origin);
    if (!appearance) return;
    lastGift = event;
    if (focus) requestedFocus.add(appearance.id);
  } else if (!added) return;
  renderFeed(); flushGifts(); renderMode();
  if (notify && event.kind === 'GIFT_DEMO') {
    $('studio-toast').textContent = `${event.displayName} · ${itemLabel(ITEMS.find(item => item.id === event.item))} · ${t('Testimpuls', 'Test impulse')}`;
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
      data.events.forEach(envelope => { validateWorldEvent(envelope.event); if (envelope.deliveryId !== undefined) validateWorldEvent({ ...envelope.event, id: envelope.deliveryId }); });
      data.events.forEach(envelope => receive(envelope.event, false, false, envelope)); connected = true; renderMode(); status(t('Lokaler Raum verbunden.', 'Local room connected.'));
    } catch { connected = false; relay.close(); relay = null; renderMode(); status(t('Ungültiger Raumstand; Verbindung beendet.', 'Invalid room state; connection closed.')); }
  });
  relay.addEventListener('world-event', message => {
    try { const delivery = parseMessage(message); receive(delivery.event, true, true, delivery); }
    catch { status(t('Ungültiges Ereignis nicht übernommen.', 'Invalid event was not imported.')); }
  });
  relay.onerror = () => { connected = false; renderMode(); };
}
async function submit(kind, repeatedEvent) {
  if (pending || relay && !connected) return;
  let event;
  try {
    event = repeatedEvent || makeWorldEvent({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), displayName: $('studio-name').value, kind, item: $('studio-item').value, message: $('studio-message').value });
    pending = true; renderMode();
    if (relay) {
      const response = await fetch('/api/studio/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Scarlet-Studio': '1' }, body: JSON.stringify(event), signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('RELAY_REJECTED');
      const result = await response.json();
      if (!['RECEIVED_DEMO', 'REPEATED_DEMO', 'ALREADY_RECEIVED'].includes(result.state) || result.eventId !== event.id) throw new Error('INVALID_RECEIPT');
      // New relays correlate the receipt with its streamed appearance. Older
      // relays still supply appearances through SSE, without this correlation.
      if (result.deliveryId) receive(event, true, true, result);
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
$('studio-repeat').addEventListener('click', () => { if (lastGift) return submit('GIFT_DEMO', lastGift); });
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
  const data = { schema: 'halveth.studio-session.v2', mode: relay ? 'LOOPBACK_DEMO' : 'BROWSER_PREVIEW', exportedAt: new Date().toISOString(), paymentState: 'NOT_A_PAYMENT', events: journal.values(), appearances: appearances.values() };
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
