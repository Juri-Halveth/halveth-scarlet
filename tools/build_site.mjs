import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkLinks, htmlFiles, siteURL } from './check_links.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, '.site-build');
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== '.site-build') throw new Error('Invalid build destination');
execFileSync(process.execPath, [path.join(root, 'tools/build_profiles.mjs')], { cwd: root, stdio: 'inherit' });
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
const directories = ['assets', 'entities', 'news', 'forschung', 'room', 'snapshot', 'collage', 'docs', 'releases'];
const files = ['index.html', 'favicon.ico', '.nojekyll', 'robots.txt', 'README.md', 'CONTRIBUTIONS.md', 'LICENSES.md', 'LICENSE-HALVETH-PIRL-2.0.md', 'HALVETH-RIGHTS.md', 'HALVETH-RIGHTS.json', 'halveth-rights.schema.json'];
for (const name of [...directories, ...files]) {
  const source = path.join(root, name);
  if (!fs.existsSync(source)) throw new Error(`Required public input missing: ${name}`);
  fs.cpSync(source, path.join(output, name), { recursive: true, filter: file => !['__pycache__', '.DS_Store'].includes(path.basename(file)) });
}
const pages = htmlFiles(output);
const urls = pages.map(file => siteURL + path.relative(output, file).split(path.sep).join('/').replace(/index\.html$/, ''));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(output, 'sitemap.xml'), sitemap);
const result = checkLinks(output);
if (result.failures.length) throw new Error(JSON.stringify(result, null, 2));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(output, 'build-info.json'), JSON.stringify({ schema: 'halveth.scarlet-build.v1', sourceCommit, builtAt: new Date().toISOString(), htmlPages: pages.length, checkedReferences: result.checkedReferences }, null, 2) + '\n');
console.log(`Build complete: ${pages.length} HTML pages, ${result.checkedReferences} local references; ${output}`);
