import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servePublicFile } from './public-site-handler.mjs';

const root = path.resolve(fileURLToPath(new URL('../.site-build/', import.meta.url)));
const port = Number(process.argv[2] || 8841);
if (!Number.isInteger(port) || port < 1024 || port > 65535 || !fs.existsSync(root)) throw new Error('Build the site first; supply a port from 1024 to 65535.');
const server = http.createServer((req, res) => servePublicFile(root, req, res));
server.listen(port, '127.0.0.1', () => console.log(`Scarlet preview: http://127.0.0.1:${port}/entities/?lang=de#scarlet`));
