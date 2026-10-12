const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, net, protocol, session, shell } = require('electron');

const SCHEME = 'ashbound';
const HOST = 'game';
const ENTRY = `${SCHEME}://${HOST}/forschung/ashbound/`;
const CONTENT_ROOT = path.resolve(__dirname, 'site');
const SMOKE = process.argv.includes('--smoke');
const EXTERNAL_HOSTS = new Set(['github.com', 'doi.org', 'home.cern', 'threejs.org', 'lucide.dev']);

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
}]);

if (SMOKE) {
  app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'ashbound-smoke-')));
}
app.setName('ASHBOUND');

function localFile(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return null;
  const url = new URL(request.url);
  if (url.protocol !== `${SCHEME}:` || url.hostname !== HOST) return null;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (pathname.includes('\\') || pathname.includes('\0')) return null;
  const relative = pathname.replace(/^\/+/, '') + (pathname.endsWith('/') ? 'index.html' : '');
  const file = path.resolve(CONTENT_ROOT, relative);
  const within = path.relative(CONTENT_ROOT, file);
  if (!within || within.startsWith('..') || path.isAbsolute(within)) return null;
  return file;
}

function openExternal(url) {
  try {
    const target = new URL(url);
    if (target.protocol === 'https:' && EXTERNAL_HOSTS.has(target.hostname)) {
      void shell.openExternal(target.href);
    }
  } catch { /* An invalid URL stays closed. */ }
}

async function smokeCheck(window) {
  try {
    const result = await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve => setTimeout(resolve, 2500));
      const response = await fetch('story.de.json');
      const key = 'ashbound-desktop-smoke';
      localStorage.setItem(key, 'ok');
      const stored = localStorage.getItem(key) === 'ok';
      localStorage.removeItem(key);
      const canvas = document.querySelector('#scene canvas');
      return { title: document.title, storyStatus: response.status,
        canvas: Boolean(canvas), webgl: Boolean(canvas?.getContext('webgl2')),
        localStorage: stored, location: location.origin };
    })()`);
    result.ok = result.title.includes('ASHBOUND') && result.storyStatus === 200 &&
      result.canvas && result.webgl && result.localStorage && result.location === `${SCHEME}://${HOST}`;
    const output = process.env.ASHBOUND_SMOKE_OUTPUT;
    if (output) fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    const screenshot = process.env.ASHBOUND_SCREENSHOT_OUTPUT;
    if (screenshot) fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
    console.log(JSON.stringify(result));
    app.exit(result.ok ? 0 : 2);
  } catch (error) {
    console.error(error);
    app.exit(2);
  }
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, request => {
    const file = localFile(request);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(file).href);
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    title: 'ASHBOUND',
    backgroundColor: '#111415',
    autoHideMenuBar: true,
    show: !SMOKE,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${SCHEME}://${HOST}/`)) return;
    event.preventDefault();
    openExternal(url);
  });
  window.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11') { event.preventDefault(); window.setFullScreen(!window.isFullScreen()); }
    if (input.key === 'Escape' && window.isFullScreen()) { event.preventDefault(); window.setFullScreen(false); }
  });
  window.webContents.once('did-finish-load', () => { if (SMOKE) void smokeCheck(window); });
  void window.loadURL(ENTRY);
});

app.on('window-all-closed', () => app.quit());
