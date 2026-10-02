import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createStudioServer } from '../tools/live-studio-server.mjs';

// Every request targets a factory-owned ephemeral IPv4 loopback listener.
// Files and event contents are synthetic; teardown also runs after assertions fail.
const options = { timeout: 10000 };
const id = n => `abcdef01-2345-4678-9abc-${n.toString(16).padStart(12, '0')}`;
const base = n => ({ schema: 'halveth.world-event.v1', id: id(n), createdAt: '2026-10-02T12:34:56.789Z', displayName: 'Local viewer', paymentState: 'NOT_A_PAYMENT' });
const gift = (n = 1) => ({ ...base(n), kind: 'GIFT_DEMO', item: 'chocolate', exampleEuroCents: 300 });
const chat = (n = 2) => ({ ...base(n), kind: 'CHAT', text: 'Hello \u{1f4d6}' });

async function start(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'scarlet-studio-test-'));
  const requests = new Set(), sockets = new Set();
  let server;
  t.after(async () => {
    try {
      for (const request of requests) request.destroy();
      if (server?.listening) {
        const closed = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        server.closeAllConnections();
        for (const socket of sockets) socket.destroy();
        await closed;
      }
      assert.equal(server?.listening ?? false, false);
    } finally {
      for (const socket of sockets) socket.destroy();
      await rm(directory, { recursive: true, force: true });
    }
  });
  const root = path.join(directory, 'public');
  await mkdir(path.join(root, 'assets'), { recursive: true });
  await mkdir(path.join(root, '.git'));
  await mkdir(path.join(directory, 'tools'));
  await writeFile(path.join(root, 'index.html'), '<!doctype html><title>Synthetic public page</title>');
  await writeFile(path.join(root, 'assets', 'demo.mjs'), 'export const demo = true;\n');
  await writeFile(path.join(root, '.git', 'config'), 'synthetic-private-marker');
  await writeFile(path.join(root, '.env'), 'synthetic-private-marker');
  await writeFile(path.join(directory, 'tools', 'private.txt'), 'synthetic-private-marker');
  server = createStudioServer({ root });
  server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  const listening = once(server, 'listening');
  server.listen(0, '127.0.0.1');
  await listening;
  assert.equal(server.address().address, '127.0.0.1');
  const origin = `http://127.0.0.1:${server.address().port}`;
  function open(route, requestOptions = {}) {
    const request = http.request({ hostname: '127.0.0.1', port: server.address().port, path: route, agent: false, ...requestOptions });
    requests.add(request); request.once('close', () => requests.delete(request));
    request.setTimeout(2000, () => request.destroy(new Error('Local HTTP request timed out')));
    return request;
  }
  async function request(route, { method = 'GET', body, headers = {}, chunked = false } = {}) {
    const bytes = body === undefined ? null : Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const finalHeaders = { Origin: origin, ...headers };
    if (bytes && !chunked) finalHeaders['Content-Length'] = bytes.length;
    if (chunked) finalHeaders['Transfer-Encoding'] = 'chunked';
    for (const name of Object.keys(finalHeaders)) if (finalHeaders[name] === undefined) delete finalHeaders[name];
    return new Promise((resolve, reject) => {
      const req = open(route, { method, headers: finalHeaders });
      req.on('error', reject);
      req.on('response', res => {
        const chunks = [];
        res.on('error', reject);
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
      });
      if (chunked && bytes) {
        req.write(bytes.subarray(0, Math.min(2048, bytes.length)));
        req.end(bytes.subarray(Math.min(2048, bytes.length)));
      } else req.end(bytes);
    });
  }
  const post = (body, extra = {}) => request('/api/studio/events', {
    ...extra, method: 'POST', body,
    headers: { 'X-Scarlet-Studio': '1', 'Content-Type': 'application/json', ...extra.headers }
  });
  return { server, origin, open, request, post };
}

function json(response, status) {
  assert.equal(response.status, status, response.text);
  assert.match(response.headers['content-type'], /^application\/json\b/);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  return JSON.parse(response.text);
}

async function stream(studio) {
  const req = studio.open('/api/studio/stream', { headers: { Origin: studio.origin } });
  const response = once(req, 'response');
  req.end();
  const [res] = await response;
  req.setTimeout(0);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /^text\/event-stream\b/);
  assert.equal(res.headers['cache-control'], 'no-store');
  let buffer = '', pending = null, failure = null, ended = false;
  const queue = [], history = [];
  const fail = error => {
    failure = error;
    if (pending) { clearTimeout(pending.timer); pending.reject(error); pending = null; }
  };
  const flush = () => {
    if (!pending) return;
    const index = queue.findIndex(message => message.type === pending.type);
    if (index === -1) return;
    const [message] = queue.splice(index, 1);
    clearTimeout(pending.timer); pending.resolve(message.data); pending = null;
  };
  req.on('error', fail); res.on('error', fail);
  res.setEncoding('utf8');
  res.on('data', chunk => {
    buffer += chunk;
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
      const lines = frame.split('\n');
      const type = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
      const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!type || !data) continue;
      try { const message = { type, data: JSON.parse(data) }; queue.push(message); history.push(message); flush(); }
      catch (error) { fail(error); }
    }
  });
  res.on('end', () => { ended = true; fail(new Error('SSE ended')); });
  const closed = new Promise(resolve => res.once('close', () => { fail(new Error('SSE closed')); resolve(); }));
  return {
    history, closed, get ended() { return ended; },
    close() { res.destroy(); req.destroy(); return closed; },
    next(type) {
      assert.equal(pending, null, 'only one pending read per SSE client');
      if (failure) return Promise.reject(failure);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending = null; reject(new Error(`Timed out waiting for SSE ${type}`)); }, 2000);
        pending = { type, resolve, reject, timer }; flush();
      });
    }
  };
}

test('two SSE clients share new and repeated deliveries, and reconnect restores those delivery identities', options, async t => {
  const studio = await start(t);
  const status = json(await studio.request('/api/studio/status'), 200);
  assert.equal(status.mode, 'LOOPBACK_DEMO'); assert.equal(status.sequence, 0); assert.equal(status.retained, 0);
  assert.equal(status.payments, 'NOT_CONNECTED'); assert.equal(status.persistence, 'MEMORY_ONLY');
  assert.match(status.instanceId, /^[0-9a-f-]{36}$/);
  const first = await stream(studio), second = await stream(studio);
  for (const client of [first, second]) assert.deepEqual(await client.next('snapshot'), { instanceId: status.instanceId, sequence: 0, events: [] });
  assert.equal(json(await studio.request('/api/studio/status'), 200).clients, 2);
  const envelopes = [];
  for (const [index, event] of [gift(), chat()].entries()) {
    const receipt = json(await studio.post(event), 201);
    assert.equal(receipt.state, 'RECEIVED_DEMO'); assert.equal(receipt.sequence, index * 2 + 1); assert.equal(receipt.eventId, event.id);
    const [a, b] = await Promise.all([first.next('world-event'), second.next('world-event')]);
    assert.deepEqual(a, b); assert.deepEqual(a.event, event); assert.equal(a.sequence, index * 2 + 1);
    assert.equal(a.deliveryId, receipt.deliveryId);
    assert.equal(new Date(a.receivedAt).toISOString(), a.receivedAt); envelopes.push(a);
    const repeated = json(await studio.post(Object.fromEntries(Object.entries(event).reverse())), 201);
    assert.equal(repeated.state, 'REPEATED_DEMO'); assert.equal(repeated.eventId, event.id);
    assert.notEqual(repeated.deliveryId, receipt.deliveryId);
    const again = await first.next('world-event');
    assert.deepEqual(again, await second.next('world-event')); assert.deepEqual(again.event, event);
    assert.equal(again.deliveryId, repeated.deliveryId); assert.equal(again.sequence, index * 2 + 2);
    envelopes.push(again);
  }
  await second.close();
  const reconnect = await stream(studio);
  assert.deepEqual(await reconnect.next('snapshot'), { instanceId: status.instanceId, sequence: 4, events: envelopes });
  const sentinel = chat(3);
  json(await studio.post(sentinel), 201);
  for (const client of [first, reconnect]) assert.deepEqual((await client.next('world-event')).event, sentinel);
  assert.deepEqual(first.history.filter(message => message.type === 'world-event').map(message => message.data.sequence), [1, 2, 3, 4, 5]);
  assert.deepEqual(second.history.filter(message => message.type === 'world-event').map(message => message.data.sequence), [1, 2, 3, 4]);
  const after = json(await studio.request('/api/studio/status'), 200);
  assert.equal(after.sequence, 5); assert.equal(after.retained, 5);
});

test('conflicting source IDs reject changed content while another original delivery is accepted', options, async t => {
  const studio = await start(t), original = gift();
  json(await studio.post(original), 201);
  assert.deepEqual(json(await studio.post({ ...original, displayName: 'Changed viewer' }), 400), { error: 'INVALID_DEMO_EVENT' });
  const repeated = json(await studio.post(original), 201);
  assert.equal(repeated.state, 'REPEATED_DEMO'); assert.equal(repeated.eventId, original.id);
  const client = await stream(studio), snapshot = await client.next('snapshot');
  assert.equal(snapshot.sequence, 2); assert.equal(snapshot.events.length, 2);
  assert.deepEqual(snapshot.events[0].event, original);
});

test('malformed JSON, payment events, extras and invalid UTF-8 never enter the demo journal', options, async t => {
  const studio = await start(t), client = await stream(studio);
  await client.next('snapshot');
  const encoded = JSON.stringify(chat());
  const badUtf8 = Buffer.concat([Buffer.from(encoded.slice(0, encoded.indexOf('Local viewer'))), Buffer.from([0xff]), Buffer.from(encoded.slice(encoded.indexOf('Local viewer') + 'Local viewer'.length))]);
  for (const body of ['{', 'null', '[]', {}, { ...gift(), kind: 'PAYMENT' }, { ...gift(), paymentState: 'PAID' }, { ...gift(), transactionHash: 'synthetic' }, { ...chat(), text: '\ud800' }, badUtf8]) {
    assert.deepEqual(json(await studio.post(body), 400), { error: 'INVALID_DEMO_EVENT' });
  }
  const status = json(await studio.request('/api/studio/status'), 200);
  assert.equal(status.sequence, 0); assert.equal(status.retained, 0);
  json(await studio.post(chat(9)), 201);
  assert.deepEqual((await client.next('world-event')).event, chat(9));
  assert.equal(client.history.filter(message => message.type === 'world-event').length, 1);
});

test('wrong Origin, Host or browser fetch site is rejected on POST and SSE', options, async t => {
  const studio = await start(t);
  for (const headers of [{ Origin: 'https://example.invalid' }, { Origin: 'null' }, { Origin: `${studio.origin}/` }, { Host: 'localhost' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.deepEqual(json(await studio.post(gift(), { headers }), 403), { error: 'LOCAL_SAME_ORIGIN_ONLY' });
    assert.deepEqual(json(await studio.request('/api/studio/stream', { headers }), 403), { error: 'LOCAL_SAME_ORIGIN_ONLY' });
  }
  const status = json(await studio.request('/api/studio/status'), 200);
  assert.equal(status.sequence, 0); assert.equal(status.clients, 0);
  json(await studio.post(gift(), { headers: { Origin: undefined, 'Sec-Fetch-Site': 'none' } }), 201);
});

test('event POST requires the exact custom header and supported JSON content type', options, async t => {
  const studio = await start(t);
  for (const headers of [
    { 'X-Scarlet-Studio': undefined }, { 'X-Scarlet-Studio': '0' }, { 'X-Scarlet-Studio': '01' },
    { 'Content-Type': undefined }, { 'Content-Type': 'text/plain' }, { 'Content-Type': 'application/jsonx' },
    { 'Content-Type': 'application/json; charset=iso-8859-1' }, { 'Content-Type': 'application/json; extra=1' }
  ]) assert.deepEqual(json(await studio.post(gift(), { headers }), 415), { error: 'JSON_CLIENT_REQUIRED' });
  assert.equal(json(await studio.request('/api/studio/status'), 200).sequence, 0);
  json(await studio.post(gift(), { headers: { 'Content-Type': 'Application/JSON; Charset=UTF-8', 'Sec-Fetch-Site': 'same-origin' } }), 201);
});

for (const chunked of [false, true]) {
  test(`body size is capped at 4096 bytes with ${chunked ? 'chunked transfer' : 'Content-Length'}`, options, async t => {
    const studio = await start(t);
    const exact = Buffer.from(JSON.stringify(chat()).padEnd(4096, ' '));
    assert.equal(exact.length, 4098, 'the supplementary Unicode character occupies extra UTF-8 bytes');
    const atLimit = Buffer.concat([Buffer.from(JSON.stringify(chat())), Buffer.alloc(4096 - Buffer.byteLength(JSON.stringify(chat())), 0x20)]);
    assert.equal(atLimit.length, 4096);
    json(await studio.post(atLimit, { chunked }), 201);
    const overLimit = Buffer.concat([atLimit, Buffer.from(' ')]);
    assert.deepEqual(json(await studio.post(overLimit, { chunked }), 413), { error: 'EVENT_TOO_LARGE' });
    const status = json(await studio.request('/api/studio/status'), 200);
    assert.equal(status.sequence, 1); assert.equal(status.retained, 1);
    json(await studio.post(chat(4)), 201);
  });
}

test('the configured public root serves static files but not private paths', options, async t => {
  const studio = await start(t);
  const page = await studio.request('/');
  assert.equal(page.status, 200); assert.match(page.text, /Synthetic public page/);
  assert.match(page.headers['content-type'], /^text\/html/);
  const asset = await studio.request('/assets/demo.mjs');
  assert.equal(asset.status, 200); assert.match(asset.headers['content-type'], /^text\/javascript/);
  assert.equal(asset.text, 'export const demo = true;\n');
  const head = await studio.request('/assets/demo.mjs', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(head.text, '');
  assert.equal(Number(head.headers['content-length']), Buffer.byteLength(asset.text));
  for (const route of ['/.git/config', '/.env', '/tools/private.txt', '/tools/live-studio-server.mjs', '/tests/live-studio.test.mjs', '/.local-qa/private.txt']) {
    const response = await studio.request(route);
    assert.equal(response.status, 404, route);
    assert.doesNotMatch(response.text, /synthetic-private-marker/, route);
  }
  assert.equal((await studio.request('/', { method: 'POST', body: 'demo' })).status, 405);
});

test('unsupported API routes and methods do not mutate the journal', options, async t => {
  const studio = await start(t);
  for (const [route, method] of [['/api/studio/events', 'GET'], ['/api/studio/status', 'POST'], ['/api/studio/unknown', 'GET'], ['/api/studio/stream', 'DELETE']]) {
    assert.deepEqual(json(await studio.request(route, { method }), 404), { error: 'NOT_FOUND' });
  }
  assert.equal(json(await studio.request('/api/studio/status'), 200).sequence, 0);
});

test('server.close gracefully terminates both SSE streams and releases the listener', options, async t => {
  const studio = await start(t), first = await stream(studio), second = await stream(studio);
  await first.next('snapshot'); await second.next('snapshot');
  await new Promise((resolve, reject) => studio.server.close(error => error ? reject(error) : resolve()));
  await Promise.all([first.closed, second.closed]);
  assert.equal(first.ended, true); assert.equal(second.ended, true);
  assert.equal(studio.server.listening, false); assert.equal(studio.server.address(), null);
  const connections = await new Promise((resolve, reject) => studio.server.getConnections((error, count) => error ? reject(error) : resolve(count)));
  assert.equal(connections, 0);
});
