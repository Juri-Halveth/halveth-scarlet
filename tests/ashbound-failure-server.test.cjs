const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { createFailureQaServer } = require('../tools/ashbound/failure-qa.cjs');

async function fixture(t) {
  const parent = path.resolve(process.env.SCARLET_TEST_TEMP_ROOT || os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent, 'scarlet-failure-server-'));
  fs.mkdirSync(path.join(directory, 'empty'));
  fs.mkdirSync(path.join(directory, 'forschung/ashbound'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'forschung/ashbound/index.html'), '<!doctype html><title>Synthetic QA fixture</title>');
  fs.writeFileSync(path.join(directory, 'forschung/ashbound/story.de.json'), '{"fixture":true}');
  fs.writeFileSync(path.join(directory, 'forschung/ashbound/demo.mjs'), 'export const fixture=true;\n');
  const server = await createFailureQaServer(directory);
  t.after(async () => {
    const closed = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    server.closeAllConnections();
    await closed;
    assert.equal(server.listening, false);
    assert.equal(path.dirname(directory), parent);
    assert.ok(path.basename(directory).startsWith('scarlet-failure-server-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const listening = once(server, 'listening');
  server.listen(0, '127.0.0.1');
  await listening;
  assert.equal(server.address().address, '127.0.0.1');
  function request(route, method = 'GET') {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: route, method, agent: false }, res => {
        const chunks = [];
        res.on('error', reject);
        res.on('aborted', () => reject(new Error('Response aborted')));
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
      });
      req.on('error', reject);
      req.setTimeout(2000, () => req.destroy(new Error('Local fixture request timed out')));
      req.end();
    });
  }
  return { directory, request };
}

test('failure QA server returns 404 for a directory without index and serves the next request', { timeout: 10000 }, async t => {
  const { request } = await fixture(t);
  assert.equal((await request('/empty/')).status, 404);
  const page = await request('/forschung/ashbound/?lang=de');
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'], /^text\/html/);
  assert.match(page.body, /Synthetic QA fixture/);
  const story = await request('/forschung/ashbound/story.de.json');
  assert.equal(story.status, 200);
  assert.equal(story.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(story.body), { fixture: true });
  const module = await request('/forschung/ashbound/demo.mjs');
  assert.match(module.headers['content-type'], /^text\/javascript/);
  const head = await request('/forschung/ashbound/story.de.json', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
});

test('failure QA server handles an asynchronous open failure and remains available', { timeout: 10000 }, async t => {
  const { directory, request } = await fixture(t);
  const original = fs.createReadStream;
  const target = path.join(directory, 'forschung/ashbound/story.de.json');
  fs.createReadStream = function (file, ...args) {
    return original.call(this, file === target ? path.join(directory, 'missing-after-stat') : file, ...args);
  };
  t.after(() => { fs.createReadStream = original; });
  await assert.rejects(request('/forschung/ashbound/story.de.json'));
  fs.createReadStream = original;
  assert.equal((await request('/forschung/ashbound/story.de.json')).status, 200);
  assert.equal((await request('/forschung/ashbound/')).status, 200);
});
