import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '../../assets/entity-vendor');
fs.mkdirSync(output, { recursive: true });
await build({ entryPoints: [path.join(here, 'entity-runtime-entry.mjs')], outfile: path.join(output, 'runtime.mjs'),
  bundle: true, minify: true, format: 'esm', target: 'es2022', legalComments: 'eof' });
for (const name of ['three', 'lucide', 'lucide-static']) {
  const source = path.join(here, 'node_modules', name, 'LICENSE');
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(output, `${name}.LICENSE.txt`));
}
console.log('Entity world runtime built from the existing pinned Three.js and Lucide dependencies.');
