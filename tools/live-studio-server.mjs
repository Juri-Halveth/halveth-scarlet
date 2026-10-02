import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createEventJournal, validateWorldEvent } from '../assets/world-events.mjs';
import { servePublicFile } from './public-site-handler.mjs';

export function createStudioServer({ root = fileURLToPath(new URL('../.site-build/', import.meta.url)) } = {}) {
  root = path.resolve(root);
  const journal = createEventJournal(100), clients = new Set(), envelopes = [];
  const instanceId = randomUUID();
  let sequence = 0, tokens = 30, replenishedAt = Date.now();
  const json = (res, code, value) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); };
  const send = (res, type, value) => {
    if (res.writableLength > 65536) { res.destroy(); return; }
    res.write(`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`);
  };
  const server = http.createServer(async (req, res) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (req.headers.host !== new URL(origin).host || req.headers.origin && req.headers.origin !== origin || req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) {
      json(res, 403, { error: 'LOCAL_SAME_ORIGIN_ONLY' }); return;
    }
    let url;
    try { url = new URL(req.url, origin); } catch { json(res, 400, { error: 'INVALID_URL' }); return; }
    if (!url.pathname.startsWith('/api/studio/')) { servePublicFile(root, req, res); return; }
    if (req.method === 'GET' && url.pathname === '/api/studio/status') {
      json(res, 200, { mode: 'LOOPBACK_DEMO', instanceId, clients: clients.size, sequence, retained: envelopes.length, payments: 'NOT_CONNECTED', persistence: 'MEMORY_ONLY' }); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/studio/stream') {
      if (clients.size >= 16) { json(res, 503, { error: 'ROOM_FULL' }); return; }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Connection: 'keep-alive' });
      clients.add(res); send(res, 'snapshot', { instanceId, sequence, events: envelopes });
      const heartbeat = setInterval(() => send(res, 'presence', { clients: clients.size }), 5000); heartbeat.unref();
      res.on('close', () => { clients.delete(res); clearInterval(heartbeat); }); return;
    }
    if (req.method !== 'POST' || url.pathname !== '/api/studio/events') { json(res, 404, { error: 'NOT_FOUND' }); return; }
    if (req.headers['x-scarlet-studio'] !== '1' || !/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '')) {
      json(res, 415, { error: 'JSON_CLIENT_REQUIRED' }); return;
    }
    const now = Date.now(); tokens = Math.min(30, tokens + (now - replenishedAt) / 1000); replenishedAt = now;
    if (tokens < 1) { json(res, 429, { error: 'TRY_LATER' }); return; } tokens--;
    if (Number(req.headers['content-length']) > 4096) { json(res, 413, { error: 'EVENT_TOO_LARGE' }); return; }
    try {
      let length = 0; const chunks = [];
      for await (const chunk of req) { length += chunk.length; if (length > 4096) { json(res, 413, { error: 'EVENT_TOO_LARGE' }); return; } chunks.push(chunk); }
      const event = validateWorldEvent(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))));
      const firstReceipt = journal.append(event);
      const envelope = { sequence: ++sequence, deliveryId: randomUUID(), receivedAt: new Date().toISOString(), event };
      envelopes.push(envelope); if (envelopes.length > 100) envelopes.shift();
      for (const client of clients) send(client, 'world-event', envelope);
      json(res, 201, { state: firstReceipt ? 'RECEIVED_DEMO' : 'REPEATED_DEMO', sequence, eventId: event.id, deliveryId: envelope.deliveryId });
    } catch { if (!res.headersSent) json(res, 400, { error: 'INVALID_DEMO_EVENT' }); }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  const close = server.close.bind(server);
  server.close = callback => { for (const client of clients) client.end(); server.closeIdleConnections(); return close(callback); };
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.argv[2] || 8842);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || !fs.existsSync(fileURLToPath(new URL('../.site-build/', import.meta.url)))) throw new Error('Build first; supply a valid local port.');
  const server = createStudioServer();
  server.on('error', error => { console.error(error.code); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Scarlet local studio: http://127.0.0.1:${port}/entities/?lang=de&studio=relay#scarlet\nMode: LOOPBACK_DEMO. No payment, no public listener, memory-only session.`));
}
