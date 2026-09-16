import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node tools/build_profiles.mjs [--check]');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/universe-data.js'), 'utf8'), context);
const data = context.window.HalvethUniverse;
const github = 'https://github.com/Juri-Halveth/halveth-scarlet/blob/main/';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const siteURL = value => new URL(value, data.site).href;
const localURL = value => /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : '../../' + value;
const safeURL = value => {
  const parsed = new URL(value, data.site);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Invalid source URL');
  return value;
};
const inline = text => text.split(/(\[[^\]]+\]\([^)]+\))/g).map(part => {
  const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
  return link ? `<a href="${escape(safeURL(link[2]))}">${escape(link[1])}</a>` : escape(part);
}).join('');
const markdown = text => text.trim().split(/\n\s*\n/).map(block => {
  const heading = /^(#{3,4}) (.+)$/.exec(block);
  if (heading) return `<h${heading[1].length - 1}>${inline(heading[2])}</h${heading[1].length - 1}>`;
  if (/^[-*] /m.test(block)) return `<ul>${block.split('\n').map(line => `<li>${inline(line.replace(/^[-*] /, ''))}</li>`).join('')}</ul>`;
  return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
}).join('\n');
// Dossiers retain their reading lists on GitHub; profiles collect those links in one source panel.
const profileBody = text => markdown(text.replace(/^### (?:Weiterlesen|Read more|Further reading)\r?\n[\s\S]*$/m, ''));
const languageButtons = '<div class="profile-languages" aria-label="Sprache / Language"><button type="button" data-set-lang="de">DE</button><button type="button" data-set-lang="en">EN</button></div>';

function head(title, description, route, prefix) {
  const canonical = siteURL(route);
  return `<!doctype html>\n<html lang="de" data-language-in-place><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#07141e"><meta name="description" content="${escape(description)}"><meta name="author" content="HALVETH"><meta name="rights" content="New original HALVETH contributions: Source Available under HALVETH PIRL 2.0. Prior grants and third-party rights remain applicable; see LICENSES.md."><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(title)}</title><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="de" href="${canonical}?lang=de"><link rel="alternate" hreflang="en" href="${canonical}?lang=en"><link rel="alternate" hreflang="x-default" href="${canonical}"><link rel="icon" href="${prefix}assets/portal-mark.svg" type="image/svg+xml"><meta name="twitter:card" content="summary_large_image"><meta property="og:image:alt" content="HALVETH portal artwork"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="article"><meta property="og:image" content="${siteURL('assets/portal-nexus.webp')}"><link rel="stylesheet" href="${prefix}assets/entity-profile.css"><link rel="stylesheet" href="${prefix}assets/portal-shell.css"><link rel="license" href="${prefix}LICENSES.md"><script src="${prefix}assets/language.js"></script></head>`;
}
function footer(prefix) {
  return `<footer class="profile-footer"><p><span data-lang="de">HALVETH · Projektperspektiven und eigenständige Faninterpretationen. Figuren und externe Quellen behalten ihre Herkunft und Rechte.</span><span data-lang="en">HALVETH · Project perspectives and independent fan interpretations. Characters and external sources retain their origins and rights.</span></p><a href="${prefix}LICENSES.md"><span data-lang="de">Rechte &amp; Quellen</span><span data-lang="en">Rights &amp; sources</span></a> · <a href="https://www.reddit.com/user/Halveth/">Reddit · u/Halveth</a></footer><script src="${prefix}assets/portal-shell.js" defer></script></body></html>\n`;
}
function nameField() {
  const field = data.verachelNameField;
  const languages = key => ['de','en'].map(lang => `<span data-lang="${lang}">${escape(field[lang][key])}</span>`).join('');
  return `<details class="profile-names" id="name-field"><summary>${languages('doorLabel')}</summary><p class="eyebrow">${languages('eyebrow')}</p><h2>${languages('title')}</h2><p>${languages('description')}</p><label for="name-search"><span data-lang="de">Namen im Feld filtern</span><span data-lang="en">Filter names in the field</span></label><input id="name-search" type="search" autocomplete="off"><div class="profile-signals">${field.highlights.map(item => `<${item.source ? 'a href="'+escape(safeURL(item.source))+'"' : 'span'} class="profile-signal" data-name="${escape(item.label)}"><strong>${escape(item.label)}</strong><small>${escape(item.code)}</small></${item.source ? 'a' : 'span'}>`).join('')}</div><p>${languages('microLabel')}</p><ul class="profile-name-list">${field.microNames.map(name => `<li data-name="${escape(name)}">${escape(name)}</li>`).join('')}</ul><p class="muted">${languages('sourceNote')}</p><p id="name-results" role="status" aria-live="polite"></p></details>`;
}

const expected = new Map();
const ids = new Set();
for (const entity of data.entities) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity.id) || ids.has(entity.id)) throw new Error('Invalid or duplicate entity ID');
  ids.add(entity.id);
  if (entity.profilePath !== `entities/${entity.id}/`) throw new Error(`Invalid profilePath for ${entity.id}`);
  if (!Array.isArray(entity.sourceRefs) || !entity.sourceRefs.length) throw new Error(`Missing sourceRefs for ${entity.id}`);
  const sourcePath = `docs/entities/${entity.id}.md`;
  const document = fs.readFileSync(path.join(root, sourcePath), 'utf8').replace(/\r\n?/g, '\n');
  const sections = /^# [^\n]+\n+[\s\S]*?^## Deutsch\n([\s\S]+?)^## English\n([\s\S]+)$/m.exec(document);
  if (!sections) throw new Error(`Missing bilingual sections: ${sourcePath}`);
  const sources = entity.sourceRefs.map(ref => `<li><a href="${escape(safeURL(localURL(ref.url)))}">${escape(ref.label)}</a></li>`).join('');
  const companion = entity.url || `forschung/figuren-und-perspektiven/#${entity.section || 'garden'}`;
  const html = `${head(`${entity.label} · HALVETH`, entity.role, entity.profilePath, '../../')}<body data-entity-id="${escape(entity.id)}"><main class="profile-main"><nav class="profile-top"><a href="../"><span data-lang="de">← Alle Perspektiven</span><span data-lang="en">← All perspectives</span></a>${languageButtons}</nav><header class="profile-hero"><p class="eyebrow"><span data-lang="de">${escape(entity.kind)}</span><span data-lang="en">${escape(entity.en.kind)}</span></p><h1>${escape(entity.label)}</h1><p class="profile-lead"><span data-lang="de">${escape(entity.role)}</span><span data-lang="en">${escape(entity.en.role)}</span></p><div class="profile-actions"><a class="primary" href="${github}${sourcePath}"><span data-lang="de">Dossier auf GitHub ↗</span><span data-lang="en">Dossier on GitHub ↗</span></a><a href="${escape(localURL(companion))}"><span data-lang="de">Vertiefung öffnen ↗</span><span data-lang="en">Explore the source ↗</span></a></div></header><article class="profile-content"><div data-lang="de" lang="de">${profileBody(sections[1])}</div><div data-lang="en" lang="en">${profileBody(sections[2])}</div></article>${entity.id === 'verachel' ? nameField() : ''}<aside class="profile-sources"><h2><span data-lang="de">Quellen &amp; Verbindungen</span><span data-lang="en">Sources &amp; connections</span></h2><ul>${sources}</ul><p class="muted"><span data-lang="de">${escape(entity.sourceLabel)}</span><span data-lang="en">${escape(entity.en.sourceLabel)}</span></p></aside><nav class="profile-bottom"><a href="../../#team"><span data-lang="de">Zur Konstellation auf der Erde</span><span data-lang="en">Back to the Earth constellation</span></a><a href="../"><span data-lang="de">Alle ${data.entities.length} Profile</span><span data-lang="en">All ${data.entities.length} profiles</span></a></nav></main>${entity.id === 'verachel' ? '<script src="../../assets/entity-profile.js" defer></script>' : ''}${footer('../../')}`;
  expected.set(`${entity.profilePath}index.html`, html);
}

const cards = data.entities.map(entity => `<li data-search="${escape([entity.label, entity.role, entity.en.role, entity.kind, entity.en.kind].join(' ').toLowerCase())}"><a href="${escape(entity.id)}/"><h2>${escape(entity.label)}</h2><p><span data-lang="de">${escape(entity.role)}</span><span data-lang="en">${escape(entity.en.role)}</span></p><small><span data-lang="de">${escape(entity.kind)}</span><span data-lang="en">${escape(entity.en.kind)}</span></small></a></li>`).join('\n');
expected.set('entities/index.html', `${head('Die Konstellation · HALVETH', `${data.entities.length} Profile mit Rollen, Geschichten, Thesen und Quellen.`, 'entities/', '../')}<body><main class="profile-main"><nav class="profile-top"><a href="../"><span data-lang="de">← Zur Erde</span><span data-lang="en">← Back to Earth</span></a>${languageButtons}</nav><header class="profile-hero"><p class="eyebrow">HALVETH / LUCINET</p><h1><span data-lang="de">Die Konstellation.</span><span data-lang="en">The constellation.</span></h1><p class="profile-lead"><span data-lang="de">${data.entities.length} eigenständige Profile. Eine gemeinsame Quelle für Rollen, Geschichten und weiterführende Gedanken.</span><span data-lang="en">${data.entities.length} distinct profiles. A shared home for roles, stories and ideas to explore.</span></p></header><label for="profile-search"><span data-lang="de">Name, Rolle oder Thema</span><span data-lang="en">Name, role or subject</span></label><input id="profile-search" type="search" autocomplete="off"><p id="profile-results" role="status" aria-live="polite"></p><ul class="profile-grid">${cards}</ul></main><script src="../assets/entity-profile.js" defer></script>${footer('../')}`);

for (const [file, content] of expected) {
  const destination = path.join(root, file);
  if (check) {
    if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error(`Generated profile is missing or stale: ${file}`);
  } else {
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, content);
  }
}
console.log(`${check ? 'Verified' : 'Built'} ${data.entities.length} bilingual entity profiles and their directory.`);
