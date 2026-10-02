import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../.site-build/', import.meta.url)));
const port = Number(process.argv[2] || 8841);
if (!Number.isInteger(port) || port < 1024 || port > 65535 || !fs.existsSync(root)) throw new Error('Build the site first; supply a port from 1024 to 65535.');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.split(/[\\/]/).some(part => part.startsWith('.') || part.includes(':'))) throw new Error('Invalid path');
    let file = path.resolve(root, '.' + decoded);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Outside public build');
    if (fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(308, { Location: url.pathname + '/' + url.search }); res.end(); return; }
      file = path.join(file, 'index.html');
    }
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Scarlet preview: http://127.0.0.1:${port}/entities/?lang=de#scarlet`));
