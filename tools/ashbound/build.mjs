import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Compiler } from 'inkjs/compiler/Compiler';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '../../forschung/morrowind-lernwelt');
await build({ entryPoints: [path.join(here, 'vendor-entry.mjs')], outfile: path.join(output, 'vendor/runtime.mjs'),
  bundle: true, minify: true, format: 'esm', target: 'es2022', legalComments: 'eof' });
for (const lang of ['de', 'en']) {
  const source = fs.readFileSync(path.join(output, `story.${lang}.ink`), 'utf8');
  const errors = [];
  const compiler = new Compiler(source, { errorHandler: (message, type) => errors.push({ message, type }) });
  let story;
  try { story = compiler.Compile(); } catch { throw new Error(JSON.stringify(errors)); }
  if (errors.length) throw new Error(JSON.stringify(errors));
  fs.writeFileSync(path.join(output, `story.${lang}.json`), story.ToJson() + '\n');
}
for (const name of ['three', 'inkjs', 'lucide', 'lucide-static']) {
  const source = path.join(here, 'node_modules', name, name === 'inkjs' ? 'LICENSE.md' : 'LICENSE');
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(output, 'vendor', `${name}.LICENSE.txt`));
}
console.log('ASHBOUND: pinned renderer, icons and two Ink stories built.');
