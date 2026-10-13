import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { checkLinks, htmlFiles, siteURL } from './check_links.mjs';
import { sourceTreeState } from './source_state.mjs';
import { trackedSourceFiles, isTrackedPublicInput } from './public_inputs.mjs';
import { siteTreeReceipt } from './artifact_tree.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, '.site-build');
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== '.site-build') throw new Error('Invalid build destination');
const worldAssets = path.join(root, 'forschung', 'ashbound', 'play', 'assets');
const worldManifestPath = path.join(worldAssets, 'manifest.json');
const worldManifest = JSON.parse(fs.readFileSync(worldManifestPath, 'utf8').replace(/^\uFEFF/, ''));
if (worldManifest.schema !== 'ashbound.world-assets.v1' || !Array.isArray(worldManifest.files)) throw new Error('Invalid world asset manifest');
const approvedWorldFiles = new Set([worldManifestPath]);
const trackedFiles = trackedSourceFiles(root);
for (const record of worldManifest.files) {
  if (typeof record.path !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('Invalid world asset receipt');
  const file = path.resolve(worldAssets, record.path.split('/').join(path.sep));
  const relative = path.relative(worldAssets, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || approvedWorldFiles.has(file)) throw new Error('Unsafe or duplicate world asset path');
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.size !== record.bytes || createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== record.sha256) throw new Error(`World asset differs from receipt: ${record.path}`);
  approvedWorldFiles.add(file);
}
const includeSiteInput = file => {
  if (['__pycache__', '.DS_Store'].includes(path.basename(file))) return false;
  const absolute = path.resolve(file);
  if (!isTrackedPublicInput(absolute, trackedFiles)) return false;
  if (absolute === worldAssets) return true;
  if (absolute.startsWith(worldAssets + path.sep)) {
    if (fs.statSync(absolute).isDirectory()) return [...approvedWorldFiles].some(approved => approved.startsWith(absolute + path.sep));
    return approvedWorldFiles.has(absolute);
  }
  return true;
};
execFileSync(process.execPath, [path.join(root, 'tools/build_profiles.mjs')], { cwd: root, stdio: 'inherit' });
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
const directories = ['languages', 'assets', 'entities', 'news', 'forschung', 'room', 'snapshot', 'collage', 'docs', 'releases'];
const files = ['index.html', 'favicon.ico', '.nojekyll', 'robots.txt', 'README.md', 'CONTRIBUTIONS.md', 'LICENSES.md', 'LICENSE-HALVETH-PIRL-2.0.md', 'HALVETH-RIGHTS.md', 'HALVETH-RIGHTS.json', 'halveth-rights.schema.json'];
for (const name of [...directories, ...files]) {
  const source = path.join(root, name);
  if (!fs.existsSync(source)) throw new Error(`Required public input missing: ${name}`);
  fs.cpSync(source, path.join(output, name), { recursive: true, filter: includeSiteInput });
}
if (!fs.existsSync(path.join(output, 'forschung', 'ashbound', 'index.html'))) throw new Error('ASHBOUND public route missing');
const pages = htmlFiles(output);
// Version shared presentation by the exact copied bytes, not a release label.
const assetDigests=Object.fromEntries([
  'assets/portal-shell.css','assets/portal-shell.js','languages/hub-language.css','assets/mobile.css'
].map(asset=>[asset,createHash('sha256').update(fs.readFileSync(path.join(output,asset))).digest('hex')]));
for (const file of pages) {
  const relative=path.relative(output,file).split(path.sep).join('/');
  const relativeRoot='../'.repeat(relative.split('/').length-1);
  const standalonePage=[
    'forschung/ashbound/index.html',
    'forschung/ashbound/play/index.html',
    'forschung/juri-thesis/index.html',
    'forschung/juri-thesis/chancenreise.html',
  ].includes(relative);
  const prefix=relativeRoot+'languages/';
  const html=fs.readFileSync(file,'utf8').replace(/<!-- HUB_LANGUAGES_START -->[\s\S]*?<!-- HUB_LANGUAGES_END -->/g,'').replace(/<!-- MOBILE_LAYOUT_START -->[\s\S]*?<!-- MOBILE_LAYOUT_END -->/g,'');
  const tags=standalonePage?'':'<!-- HUB_LANGUAGES_START --><link rel="stylesheet" href="'+prefix+'hub-language.css"><script src="'+prefix+'catalog.js" defer></script><script src="'+prefix+'hub-language.js" defer></script><!-- HUB_LANGUAGES_END -->';
  const mobile=standalonePage?'':'<!-- MOBILE_LAYOUT_START --><link rel="stylesheet" href="'+relativeRoot+'assets/mobile.css"><!-- MOBILE_LAYOUT_END -->';
  const built=html.replace(/(<head[^>]*>)/,match=>match+tags).replace(/<\/head>/i,mobile+'</head>');
  fs.writeFileSync(file,built.replace(/\b(src|href)=(["'])([^"']+)\2/g,(match,attribute,quote,url)=>{
    const pathname=url.split(/[?#]/)[0];
    const asset=Object.keys(assetDigests).find(name=>pathname===relativeRoot+name);
    return asset?attribute+'='+quote+pathname+'?v='+assetDigests[asset]+quote:match;
  }));
}
const urls = pages.map(file => siteURL + path.relative(output, file).split(path.sep).join('/').replace(/index\.html$/, ''));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(output, 'sitemap.xml'), sitemap);
const result = checkLinks(output);
if (result.failures.length) throw new Error(JSON.stringify(result, null, 2));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(output, 'build-info.json'), JSON.stringify({ schema: 'halveth.scarlet-build.v2', sourceCommit, sourceTreeState: sourceTreeState(root), builtAt: new Date().toISOString(), htmlPages: pages.length, checkedReferences: result.checkedReferences, ...siteTreeReceipt(output) }, null, 2) + '\n');
console.log(`Build complete: ${pages.length} HTML pages, ${result.checkedReferences} local references; ${output}`);
