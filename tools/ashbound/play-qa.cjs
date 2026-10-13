const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const packages = process.env.CODEX_NODE_PACKAGES;
if (!packages) throw new Error('CODEX_NODE_PACKAGES must point to the bundled browser runtime.');
const { chromium } = require(path.join(packages, 'playwright'));
const root = path.resolve(__dirname, '../..');
const site = path.join(root, '.site-build');
const output = path.join(root, '.local-qa', 'ashbound-first-person');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream' };
const server = http.createServer((request, response) => {
  try {
    let file = path.resolve(site, decodeURIComponent(new URL(request.url, 'http://local').pathname).replace(/^\/+/, ''));
    if (!file.startsWith(site + path.sep)) { response.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(response);
  } catch { response.writeHead(400).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.ASHBOUND_CHROME,
    args: process.env.ASHBOUND_QA_GPU ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const url = `http://127.0.0.1:${server.address().port}/forschung/ashbound/play/`;
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, hasTouch: viewport.width < 500, isMobile: viewport.width < 500 });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.dataset.ready === 'true' && window.AshboundGameDiagnostics?.frames > 5, null, { timeout: 20000 });
      await page.waitForFunction(() => document.body.dataset.worldAssets === '3/3', null, { timeout: 90000 });
      await page.waitForFunction(() => document.body.dataset.focusAsset === 'ready', null, { timeout: 90000 });
      assert.equal(await page.locator('#stage canvas').count(), 1);
      assert.equal(await page.locator('#start').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.screenshot({ path: path.join(output, `${viewport.width}-opening.png`) });
      await page.locator('#start-button').click();
      assert.equal(await page.locator('#start').isVisible(), false);
      assert.equal(await page.evaluate(() => AshboundGameDiagnostics.active), true);
      const before = await page.evaluate(() => AshboundGameDiagnostics.position.z);
      await page.keyboard.down('KeyW');
      await page.waitForFunction(start => AshboundGameDiagnostics.position.z < start - .4, before, { timeout: 15000 });
      await page.keyboard.up('KeyW');
      const after = await page.evaluate(() => AshboundGameDiagnostics.position.z);
      assert.ok(after < before - .4, JSON.stringify({ before, after }));
      if (viewport.width > 500) {
        await page.keyboard.press('KeyJ'); await page.keyboard.press('KeyJ'); await page.keyboard.press('KeyI');
        await page.waitForFunction(() => AshboundGameDiagnostics.target === 'ember', null, { timeout: 6000 });
        await page.keyboard.press('Digit1');
        assert.equal(await page.evaluate(() => AshboundGameDiagnostics.state.seals[0]), true, 'the first pylon must respond to aimed Impuls');
      }
      await page.keyboard.press('Digit2');
      assert.equal(await page.evaluate(() => AshboundGameDiagnostics.state.revealed), true);
      await page.keyboard.press('Digit3');
      assert.ok(await page.evaluate(() => AshboundGameDiagnostics.state.wardUntil > performance.now()));
      if (viewport.width < 500) {
        const hud = await page.evaluate(() => {
          const message = document.getElementById('message').getBoundingClientRect();
          const mana = document.getElementById('mana').getBoundingClientRect();
          return { messageBottom: message.bottom, manaTop: mana.top };
        });
        assert.ok(hud.messageBottom + 8 < hud.manaTop, JSON.stringify(hud));
      }
      await page.screenshot({ path: path.join(output, `${viewport.width}-playing.png`) });
      if (viewport.width > 500) { await page.keyboard.press('KeyL'); await page.keyboard.press('KeyL'); }
      await page.keyboard.down('KeyD');
      try {
        await page.waitForFunction(() => AshboundGameDiagnostics.position.x > 3.5, null, { timeout: 15000 });
      } catch (error) {
        console.error('Movement diagnostics:', await page.evaluate(() => ({
          position: AshboundGameDiagnostics.position,
          orientation: AshboundGameDiagnostics.orientation,
          active: AshboundGameDiagnostics.active,
          frames: AshboundGameDiagnostics.frames,
          visibility: document.visibilityState,
          pointerLock: Boolean(document.pointerLockElement),
          focused: document.activeElement?.id || document.activeElement?.tagName,
          pauseVisible: !document.getElementById('pause').hidden,
        })));
        throw error;
      }
      await page.keyboard.up('KeyD');
      await page.keyboard.down('KeyW');
      await page.waitForFunction(() => AshboundGameDiagnostics.position.z < 14.5, null, { timeout: 15000 });
      await page.keyboard.up('KeyW');
      await page.locator('#interact').waitFor({ state: 'visible' });
      if (viewport.width < 500) await page.locator('#interact').click();
      else await page.keyboard.press('KeyE');
      assert.equal(await page.locator('#book').isVisible(), true);
      await page.locator('#book-next').click(); await page.locator('#book-next').click();
      await page.screenshot({ path: path.join(output, `${viewport.width}-book.png`) });
      await page.locator('#book-answers button').last().click();
      assert.equal(await page.evaluate(() => AshboundGameDiagnostics.state.booksSolved[0]), false);
      await page.locator('#book-answers button').first().click();
      assert.equal(await page.evaluate(() => AshboundGameDiagnostics.state.booksSolved[0]), true);
      await page.locator('#book-close').click();
      if (viewport.width < 500) await page.locator('#inventory-button').click();
      else await page.keyboard.press('KeyB');
      assert.match(await page.locator('#inventory-list').textContent(), /600/);
      await page.locator('#inventory-close').click();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.body.dataset.ready === 'true');
      assert.equal(await page.evaluate(() => AshboundGameDiagnostics.state.booksSolved[0]), true);
      assert.deepEqual(errors, [], JSON.stringify({ viewport, errors }));
      await page.close();
    }
    console.log(`ASHBOUND first-person QA passed: desktop and mobile; ${output}`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
