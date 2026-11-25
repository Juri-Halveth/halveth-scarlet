'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile, stat } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const repositoryRoot = path.resolve(__dirname, '../..');
// CI tests the generated, shared-CSS-equipped site that will be published.
const siteRoot = path.resolve(repositoryRoot, process.env.SCARLET_SITE_ROOT || '.site-build');
const artifactRoot = path.join(__dirname, 'artifacts');
const prefix = '/halveth-scarlet/';
const scenePath = 'forschung/singularity-cannon/index.html';
const hiddenSceneCSS = `<style id="qa-hidden-scene">
html body.singularity-cannon-scene canvas#space,
html body.singularity-cannon-scene canvas#fx,
html body.singularity-cannon-scene canvas#capture-flow,
html body.singularity-cannon-scene canvas#capture-fallback {
  display: none !important;
}
</style>`;
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2',
};
let server, browser, origin;

before(async () => {
  assert.ok((await stat(path.join(siteRoot, scenePath))).isFile(),
    'Build the public site first: node tools/build_site.mjs');
  await mkdir(artifactRoot, { recursive: true });
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (!url.pathname.startsWith(prefix)) {
        response.writeHead(404).end(); return;
      }
      let relative = decodeURIComponent(url.pathname.slice(prefix.length));
      if (relative.endsWith('/') || relative === '') relative += 'index.html';
      const file = path.resolve(siteRoot, relative);
      if (!file.startsWith(siteRoot + path.sep)) {
        response.writeHead(403).end(); return;
      }
      let bytes = await readFile(file);
      if (relative === scenePath && url.searchParams.get('qa') === 'hidden-scene') {
        const html = bytes.toString('utf8');
        assert.equal(html.split('</head>').length, 2, 'Counterexample requires exactly one head');
        bytes = Buffer.from(html.replace('</head>', hiddenSceneCSS + '\n</head>'));
      }
      response.writeHead(200, {
        'content-type': contentTypes[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'no-store',
      }).end(bytes);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SCARLET_CHROMIUM_EXECUTABLE ? { executablePath: process.env.SCARLET_CHROMIUM_EXECUTABLE } : {}),
  });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

function assertUsableScene(observation) {
  assert.equal(observation.errors.length, 0, `Runtime errors: ${observation.errors.join('; ')}`);
  assert.equal(observation.canvasVisible, true, 'The interactive scene canvas must be visible');
  assert.ok(observation.paintedSamples > 0, 'The real 2D canvas must contain rendered pixels');
  assert.equal(observation.hitTarget, 'fx', 'The viewport centre must hit the interactive field');
  assert.equal(observation.undoBefore, true, 'Undo starts disabled before the first shot');
  assert.equal(observation.undoAfter, false, 'A real centre click/touch must enable Undo');
}

async function inspectScene(context, { input, hidden, name }) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const response = await page.goto(`${origin}${prefix}forschung/singularity-cannon/${hidden ? '?qa=hidden-scene' : ''}`, { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    // Await actual drawing, rather than substituting Canvas or a renderer stub.
    await page.waitForFunction(() => {
      const canvas = document.getElementById('fx');
      if (!canvas || !canvas.width || !canvas.height) return false;
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < pixels.length; i += 4 * Math.max(1, Math.floor(canvas.width * canvas.height / 4096))) {
        if (pixels[i] > 16) return true;
      }
      return false;
    }, null, { timeout: 15000 });
    const observation = await page.evaluate(() => {
      const canvas = document.getElementById('fx');
      const style = getComputedStyle(canvas);
      const bounds = canvas.getBoundingClientRect();
      let visibleAncestors = true;
      for (let element = canvas; element; element = element.parentElement) {
        const ancestorStyle = getComputedStyle(element);
        if (ancestorStyle.display === 'none' || ancestorStyle.visibility !== 'visible' || Number(ancestorStyle.opacity) === 0) visibleAncestors = false;
      }
      const x = innerWidth / 2, y = innerHeight / 2;
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let paintedSamples = 0;
      const stride = 4 * Math.max(1, Math.floor(canvas.width * canvas.height / 4096));
      for (let i = 3; i < pixels.length; i += stride) if (pixels[i] > 16) paintedSamples++;
      const hit = document.elementFromPoint(x, y);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        centre: { x, y },
        canvasVisible: visibleAncestors && bounds.width > 0 && bounds.height > 0,
        canvasBounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        canvasDisplay: style.display,
        paintedSamples,
        hitTarget: hit?.id || hit?.tagName || null,
        undoBefore: document.getElementById('undo-shot').disabled,
      };
    });
    // Coordinates follow the same path as the user's pointer, without force-click.
    if (input === 'touch') await page.touchscreen.tap(observation.centre.x, observation.centre.y);
    else await page.mouse.click(observation.centre.x, observation.centre.y);
    if (!hidden) {
      await page.waitForFunction(() => !document.getElementById('undo-shot').disabled, null, { timeout: 3000 });
    }
    observation.undoAfter = await page.locator('#undo-shot').isDisabled();
    observation.errors = errors;
    observation.siteRoot = siteRoot;
    observation.browserVersion = browser.version();
    observation.input = input;
    observation.counterexample = hidden;
    await page.screenshot({ path: path.join(artifactRoot, `${name}.png`), fullPage: true });
    await writeFile(path.join(artifactRoot, `${name}.json`), JSON.stringify(observation, null, 2) + '\n');
    return observation;
  } catch (error) {
    await page.screenshot({ path: path.join(artifactRoot, `${name}-failure.png`), fullPage: true }).catch(() => {});
    await writeFile(path.join(artifactRoot, `${name}-failure.json`), JSON.stringify({
      error: error.message, errors, siteRoot, input, counterexample: hidden,
    }, null, 2) + '\n');
    throw error;
  } finally {
    await page.close();
  }
}

for (const variant of [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, input: 'mouse', isMobile: false, hasTouch: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, input: 'touch', isMobile: true, hasTouch: true },
]) {
  for (const hidden of [false, true]) {
    const name = `${variant.name}-${hidden ? 'hidden-counterexample' : 'original'}`;
    test(`${name}: ${hidden ? 'the same browser guard rejects hidden canvases' : 'rendered field receives real input and enables Undo'}`, { timeout: 30000 }, async t => {
      const context = await browser.newContext({ viewport: variant.viewport, isMobile: variant.isMobile, hasTouch: variant.hasTouch, deviceScaleFactor: 1 });
      try {
        const observation = await inspectScene(context, { ...variant, hidden, name });
        t.diagnostic(JSON.stringify(observation));
        if (hidden) {
          assert.equal(observation.errors.length, 0);
          assert.equal(observation.canvasDisplay, 'none', 'The counterexample must actually take effect');
          assert.notEqual(observation.hitTarget, 'fx');
          assert.equal(observation.undoAfter, true, 'Background input must not fire a shot');
          assert.throws(() => assertUsableScene(observation), /scene canvas must be visible/);
        } else {
          assertUsableScene(observation);
        }
      } finally {
        await context.close();
      }
    });
  }
}
