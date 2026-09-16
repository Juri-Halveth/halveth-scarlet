import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const siteURL = 'https://juri-halveth.github.io/halveth-scarlet/';
export function htmlFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || ['node_modules', 'tests', 'tools', 'releases'].includes(entry.name)) return [];
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith('.html') ? [file] : [];
  }).sort();
}

export function checkLinks(root) {
  root = path.resolve(root);
  const pages = htmlFiles(root), failures = [];
  let checked = 0;
  for (const file of pages) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/\b(?:href|src|poster)\s*=\s*["']([^"']*)["']/gi)) {
      const raw = match[1].replaceAll('&amp;', '&');
      if (/^(?:data:|mailto:|tel:|javascript:|blob:)/i.test(raw)) continue;
      let url;
      try { url = new URL(raw, siteURL + relative); }
      catch { failures.push({ page: relative, reference: raw, reason: 'invalid URL' }); continue; }
      if (!url.href.startsWith(siteURL)) continue;
      checked++;
      if (!raw || raw === '#') { failures.push({ page: relative, reference: raw, reason: 'empty destination' }); continue; }
      const destination = decodeURIComponent(url.pathname.slice(new URL(siteURL).pathname.length));
      let target = path.resolve(root, destination);
      if (target !== root && !target.startsWith(root + path.sep)) {
        failures.push({ page: relative, reference: raw, reason: 'outside public root' }); continue;
      }
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      if (!fs.existsSync(target)) { failures.push({ page: relative, reference: raw, reason: 'missing file' }); continue; }
      if (url.hash && target.endsWith('.html')) {
        const id = decodeURIComponent(url.hash.slice(1));
        const content = fs.readFileSync(target, 'utf8');
        const ids = [...content.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(item => item[1]);
        // #team is the existing public entry point to the generated directory dialog.
        const dynamicTeam = target === path.join(root, 'index.html') && id === 'team';
        if (!ids.includes(id) && !dynamicTeam) failures.push({ page: relative, reference: raw, reason: 'missing section' });
      }
    }
  }
  return { htmlPages: pages.length, checkedReferences: checked, failures };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkLinks(process.argv[2] || path.resolve(fileURLToPath(new URL('..', import.meta.url))));
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
}
